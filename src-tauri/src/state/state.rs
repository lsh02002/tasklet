use std::{collections::HashSet, fs, path::PathBuf, sync::Mutex};
use rusqlite::{params, Connection, OptionalExtension, Transaction};
use serde_json::{json, Value};
use crate::models::{BoardState, Column, HistoryState, List, Task, TaskStatus};

pub struct AppState {
    pub history: Mutex<HistoryState>,
    pub db_path: PathBuf,
}

fn err<E: std::fmt::Display>(e: E) -> String { e.to_string() }
fn status_str(s: &TaskStatus) -> &'static str {
    match s { TaskStatus::Todo => "todo", TaskStatus::Doing => "doing", TaskStatus::Done => "done" }
}
fn parse_status(s: &str) -> rusqlite::Result<TaskStatus> {
    match s {
        "todo" => Ok(TaskStatus::Todo),
        "doing" => Ok(TaskStatus::Doing),
        "done" => Ok(TaskStatus::Done),
        _ => Err(rusqlite::Error::InvalidParameterName(format!("invalid status: {s}"))),
    }
}
fn table_exists(conn: &Connection, name: &str) -> Result<bool, String> {
    conn.query_row("SELECT EXISTS(SELECT 1 FROM sqlite_master WHERE type='table' AND name=?1)",
        params![name], |r| r.get(0)).map_err(err)
}
fn has_column(conn: &Connection, table: &str, column: &str) -> Result<bool, String> {
    let mut stmt = conn.prepare(&format!("PRAGMA table_info({table})")).map_err(err)?;
    let names = stmt.query_map([], |r| r.get::<_, String>(1)).map_err(err)?;
    for name in names { if name.map_err(err)? == column { return Ok(true); } }
    Ok(false)
}

// Accept old JSON snapshots that have no lists/listId, including past/future.
fn normalize_board(board: &mut Value) -> Result<(), String> {
    let obj = board.as_object_mut().ok_or("Invalid board JSON")?;
    if !obj.contains_key("lists") {
        obj.insert("lists".into(), json!([{"id":"default","title":"기본 List"}]));
    }
    for key in ["tasks", "columns"] {
        if let Some(items) = obj.get_mut(key).and_then(Value::as_array_mut) {
            for item in items {
                let entry = item.as_object_mut().ok_or("Invalid task/column JSON")?;
                if !entry.contains_key("listId") {
                    let id = entry.remove("list_id").unwrap_or(json!("default"));
                    entry.insert("listId".into(), id);
                }
            }
        }
    }
    Ok(())
}
fn decode_history(raw: &str) -> Result<HistoryState, String> {
    let mut value: Value = serde_json::from_str(raw).map_err(err)?;
    let obj = value.as_object_mut().ok_or("Invalid history JSON")?;
    for key in ["past", "future"] {
        if let Some(boards) = obj.get_mut(key).and_then(Value::as_array_mut) {
            for board in boards { normalize_board(board)?; }
        }
    }
    if let Some(board) = obj.get_mut("present") { normalize_board(board)?; }
    serde_json::from_value(value).map_err(err)
}
fn decode_boards(raw: &str) -> Result<Vec<BoardState>, String> {
    let mut value: Value = serde_json::from_str(raw).map_err(err)?;
    let boards = value.as_array_mut().ok_or("Invalid history array")?;
    for board in boards { normalize_board(board)?; }
    serde_json::from_value(value).map_err(err)
}
fn create_schema(conn: &Connection) -> Result<(), String> {
    conn.execute_batch("\
        CREATE TABLE IF NOT EXISTS lists (\
          id TEXT PRIMARY KEY, title TEXT NOT NULL, position INTEGER NOT NULL\
        );\
        CREATE TABLE IF NOT EXISTS columns (\
          list_id TEXT NOT NULL REFERENCES lists(id),\
          status TEXT NOT NULL CHECK(status IN ('todo','doing','done')),\
          title TEXT NOT NULL, color TEXT NOT NULL, position INTEGER NOT NULL,\
          PRIMARY KEY(list_id,status)\
        );\
        CREATE TABLE IF NOT EXISTS tasks (\
          id TEXT PRIMARY KEY, list_id TEXT NOT NULL, title TEXT NOT NULL,\
          status TEXT NOT NULL, position INTEGER NOT NULL,\
          FOREIGN KEY(list_id,status) REFERENCES columns(list_id,status)\
        );\
        CREATE TABLE IF NOT EXISTS history (\
          id INTEGER PRIMARY KEY CHECK(id=1), past TEXT NOT NULL, future TEXT NOT NULL\
        );").map_err(err)
}

fn read_board(conn: &Connection) -> Result<BoardState, String> {
    let lists = {
        let mut stmt = conn.prepare("SELECT id,title FROM lists ORDER BY position,rowid").map_err(err)?;
        let rows = stmt.query_map([], |r| Ok(List { id:r.get(0)?, title:r.get(1)? })).map_err(err)?;
        rows.collect::<rusqlite::Result<Vec<_>>>().map_err(err)?
    };
    let columns = {
        let mut stmt = conn.prepare("SELECT list_id,status,title,color FROM columns ORDER BY position,rowid").map_err(err)?;
        let rows = stmt.query_map([], |r| {
            let status: String = r.get(1)?;
            Ok(Column { list_id:r.get(0)?, status:parse_status(&status)?, title:r.get(2)?, color:r.get(3)? })
        }).map_err(err)?;
        rows.collect::<rusqlite::Result<Vec<_>>>().map_err(err)?
    };
    let tasks = {
        let mut stmt = conn.prepare("SELECT id,list_id,title,status FROM tasks ORDER BY position,rowid").map_err(err)?;
        let rows = stmt.query_map([], |r| {
            let status: String = r.get(3)?;
            Ok(Task { id:r.get(0)?, list_id:r.get(1)?, title:r.get(2)?, status:parse_status(&status)? })
        }).map_err(err)?;
        rows.collect::<rusqlite::Result<Vec<_>>>().map_err(err)?
    };
    Ok(BoardState { lists, columns, tasks })
}

fn validate(board: &BoardState) -> Result<(), String> {
    let mut lists = HashSet::new();
    for list in &board.lists {
        if !lists.insert(list.id.as_str()) { return Err("Duplicate list ID".into()); }
    }
    let mut columns = HashSet::new();
    for col in &board.columns {
        if !lists.contains(col.list_id.as_str()) { return Err("Column references missing list".into()); }
        if !columns.insert((col.list_id.as_str(), status_str(&col.status))) {
            return Err("Duplicate column in list".into());
        }
    }
    let mut tasks = HashSet::new();
    for task in &board.tasks {
        if !tasks.insert(task.id.as_str()) { return Err("Duplicate task ID".into()); }
        if !columns.contains(&(task.list_id.as_str(), status_str(&task.status))) {
            return Err("Task references missing list/column".into());
        }
    }
    Ok(())
}

fn write_snapshot(tx: &Transaction<'_>, history: &HistoryState) -> Result<(), String> {
    validate(&history.present)?;
    tx.execute("DELETE FROM tasks", []).map_err(err)?;
    tx.execute("DELETE FROM columns", []).map_err(err)?;
    tx.execute("DELETE FROM lists", []).map_err(err)?;
    for (position, list) in history.present.lists.iter().enumerate() {
        tx.execute("INSERT INTO lists(id,title,position) VALUES (?1,?2,?3)",
            params![&list.id,&list.title,position as i64]).map_err(err)?;
    }
    for (position, col) in history.present.columns.iter().enumerate() {
        tx.execute("INSERT INTO columns(list_id,status,title,color,position) VALUES (?1,?2,?3,?4,?5)",
            params![&col.list_id,status_str(&col.status),&col.title,&col.color,position as i64]).map_err(err)?;
    }
    for (position, task) in history.present.tasks.iter().enumerate() {
        tx.execute("INSERT INTO tasks(id,list_id,title,status,position) VALUES (?1,?2,?3,?4,?5)",
            params![&task.id,&task.list_id,&task.title,status_str(&task.status),position as i64]).map_err(err)?;
    }
    let past = serde_json::to_string(&history.past).map_err(err)?;
    let future = serde_json::to_string(&history.future).map_err(err)?;
    tx.execute("INSERT INTO history(id,past,future) VALUES (1,?1,?2) \
                ON CONFLICT(id) DO UPDATE SET past=excluded.past,future=excluded.future",
        params![past,future]).map_err(err)?;
    Ok(())
}

impl AppState {
    pub fn load(db_path: PathBuf) -> Result<Self, String> {
        if let Some(parent) = db_path.parent() { fs::create_dir_all(parent).map_err(err)?; }
        let mut conn = Connection::open(&db_path).map_err(err)?;
        conn.execute_batch("PRAGMA foreign_keys=ON;").map_err(err)?;
        let legacy = table_exists(&conn, "columns")? && !has_column(&conn, "columns", "list_id")?;
        let history = if legacy {
            // Capture the old rows and old undo/redo before changing the schema.
            let old_columns = {
                let mut stmt = conn.prepare("SELECT status,title,color FROM columns ORDER BY position,rowid").map_err(err)?;
                let rows = stmt.query_map([], |r| {
                    let status: String = r.get(0)?;
                    Ok(Column { list_id:"default".into(), status:parse_status(&status)?, title:r.get(1)?, color:r.get(2)? })
                }).map_err(err)?;
                rows.collect::<rusqlite::Result<Vec<_>>>().map_err(err)?
            };
            let old_tasks = {
                let mut stmt = conn.prepare("SELECT id,title,status FROM tasks ORDER BY position,rowid").map_err(err)?;
                let rows = stmt.query_map([], |r| {
                    let status: String = r.get(2)?;
                    Ok(Task { id:r.get(0)?, list_id:"default".into(), title:r.get(1)?, status:parse_status(&status)? })
                }).map_err(err)?;
                rows.collect::<rusqlite::Result<Vec<_>>>().map_err(err)?
            };
            let stored: Option<(String,String)> = if table_exists(&conn,"history")? {
                conn.query_row("SELECT past,future FROM history WHERE id=1", [],
                    |r| Ok((r.get(0)?,r.get(1)?))).optional().map_err(err)?
            } else { None };
            let (past,future) = match stored {
                Some((p,f)) => (decode_boards(&p)?,decode_boards(&f)?),
                None => (vec![],vec![]),
            };
            let initial = HistoryState {
                past, future,
                present: BoardState {
                    lists:vec![List { id:"default".into(),title:"기본 List".into() }],
                    columns:old_columns,tasks:old_tasks,
                },
            };
            validate(&initial.present)?;
            let tx = conn.transaction().map_err(err)?;
            tx.execute_batch("DROP TABLE tasks; DROP TABLE columns; DROP TABLE IF EXISTS lists;").map_err(err)?;
            create_schema(&tx)?;
            write_snapshot(&tx,&initial)?;
            tx.commit().map_err(err)?;
            initial
        } else {
            create_schema(&conn)?;
            let stored: Option<(String,String)> = conn.query_row(
                "SELECT past,future FROM history WHERE id=1", [],
                |r| Ok((r.get(0)?,r.get(1)?)),
            ).optional().map_err(err)?;
            if let Some((past,future)) = stored {
                HistoryState {
                    past:decode_boards(&past)?,
                    present:read_board(&conn)?,
                    future:decode_boards(&future)?,
                }
            } else {
                // Support the older board_history table and board.json import path.
                let old_json: Option<String> = if table_exists(&conn,"board_history")? {
                    conn.query_row("SELECT data FROM board_history WHERE id=1", [],
                        |r| r.get(0)).optional().map_err(err)?
                } else { None };
                let initial = if let Some(raw) = old_json {
                    decode_history(&raw)?
                } else {
                    let json_path = db_path.with_file_name("board.json");
                    if json_path.exists() {
                        decode_history(&fs::read_to_string(json_path).map_err(err)?)?
                    } else { HistoryState::default() }
                };
                let tx = conn.transaction().map_err(err)?;
                write_snapshot(&tx,&initial)?;
                tx.commit().map_err(err)?;
                initial
            }
        };
        Ok(Self { history:Mutex::new(history), db_path })
    }

    pub fn save(&self, history: &HistoryState) -> Result<(), String> {
        let mut conn = Connection::open(&self.db_path).map_err(err)?;
        conn.execute_batch("PRAGMA foreign_keys=ON;").map_err(err)?;
        let tx = conn.transaction().map_err(err)?;
        // Full snapshot ensures FK-safe deletes and Undo/Redo restoration.
        write_snapshot(&tx,history)?;
        tx.commit().map_err(err)?;
        Ok(())
    }
}

impl HistoryState {
    pub fn update(&mut self, board: BoardState) {
        if self.present == board { return; }
        self.past.push(self.present.clone());
        self.present = board;
        self.future.clear();
    }
    pub fn undo(&mut self) {
        if let Some(previous) = self.past.pop() {
            self.future.insert(0,self.present.clone());
            self.present = previous;
        }
    }
    pub fn redo(&mut self) {
        if !self.future.is_empty() {
            let next = self.future.remove(0);
            self.past.push(self.present.clone());
            self.present = next;
        }
    }
}
