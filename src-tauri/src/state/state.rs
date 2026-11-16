use std::{fs, path::PathBuf, sync::Mutex};
use rusqlite::{params, Connection, OptionalExtension, Transaction};
use crate::models::{BoardState, Column, HistoryState, Task, TaskStatus};

pub struct AppState {
    pub history: Mutex<HistoryState>,
    pub db_path: PathBuf,
}

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
fn err<E: std::fmt::Display>(e: E) -> String { e.to_string() }

fn write_snapshot(tx: &Transaction<'_>, history: &HistoryState) -> Result<(), String> {
    tx.execute("DELETE FROM tasks", []).map_err(err)?;
    tx.execute("DELETE FROM columns", []).map_err(err)?;
    for (position, col) in history.present.columns.iter().enumerate() {
        tx.execute(
            "INSERT INTO columns(status,title,color,position) VALUES (?1,?2,?3,?4)",
            params![status_str(&col.status), &col.title, &col.color, position as i64],
        ).map_err(err)?;
    }
    for (position, task) in history.present.tasks.iter().enumerate() {
        tx.execute(
            "INSERT INTO tasks(id,title,status,position) VALUES (?1,?2,?3,?4)",
            params![&task.id, &task.title, status_str(&task.status), position as i64],
        ).map_err(err)?;
    }
    let past = serde_json::to_string(&history.past).map_err(err)?;
    let future = serde_json::to_string(&history.future).map_err(err)?;
    tx.execute(
        "INSERT INTO history(id,past,future) VALUES (1,?1,?2)
         ON CONFLICT(id) DO UPDATE SET past=excluded.past, future=excluded.future",
        params![past, future],
    ).map_err(err)?;
    Ok(())
}

// Compare persisted rows against the next board and touch only changed rows.
fn write_changes(tx: &Transaction<'_>, history: &HistoryState) -> Result<(), String> {
    use std::collections::{HashMap, HashSet};

    let existing_columns: HashMap<String, (String, String, i64)> = {
        let mut stmt = tx.prepare("SELECT status, title, color, position FROM columns").map_err(err)?;
        let rows = stmt.query_map([], |row| {
            Ok((row.get::<_, String>(0)?, (row.get(1)?, row.get(2)?, row.get(3)?)))
        }).map_err(err)?;
        rows.collect::<rusqlite::Result<_>>().map_err(err)?
    };
    let existing_tasks: HashMap<String, (String, String, i64)> = {
        let mut stmt = tx.prepare("SELECT id, title, status, position FROM tasks").map_err(err)?;
        let rows = stmt.query_map([], |row| {
            Ok((row.get::<_, String>(0)?, (row.get(1)?, row.get(2)?, row.get(3)?)))
        }).map_err(err)?;
        rows.collect::<rusqlite::Result<_>>().map_err(err)?
    };

    let next_column_ids: HashSet<&str> = history.present.columns.iter()
        .map(|c| status_str(&c.status)).collect();
    let next_task_ids: HashSet<&str> = history.present.tasks.iter()
        .map(|t| t.id.as_str()).collect();

    if next_column_ids.len() != history.present.columns.len()
        || next_task_ids.len() != history.present.tasks.len() {
        return Err("Duplicate column status or task ID".into());
    }
    if history.present.tasks.iter().any(|t| !next_column_ids.contains(status_str(&t.status))) {
        return Err("Task references a missing column".into());
    }

    // Remove deleted tasks first, so removing a column cannot violate its FK.
    for id in existing_tasks.keys() {
        if !next_task_ids.contains(id.as_str()) {
            tx.execute("DELETE FROM tasks WHERE id = ?1", params![id]).map_err(err)?;
        }
    }
    for status in existing_columns.keys() {
        if !next_column_ids.contains(status.as_str()) {
            tx.execute("DELETE FROM columns WHERE status = ?1", params![status]).map_err(err)?;
        }
    }

    // Columns must exist before tasks can reference them.
    for (index, col) in history.present.columns.iter().enumerate() {
        let status = status_str(&col.status);
        let position = index as i64;
        match existing_columns.get(status) {
            None => {
                tx.execute(
                    "INSERT INTO columns(status, title, color, position) VALUES (?1, ?2, ?3, ?4)",
                    params![status, &col.title, &col.color, position],
                ).map_err(err)?;
            }
            Some((title, color, old_position))
                if title != &col.title || color != &col.color || *old_position != position => {
                tx.execute(
                    "UPDATE columns SET title = ?2, color = ?3, position = ?4 WHERE status = ?1",
                    params![status, &col.title, &col.color, position],
                ).map_err(err)?;
            }
            _ => {}
        }
    }

    for (index, task) in history.present.tasks.iter().enumerate() {
        let status = status_str(&task.status);
        let position = index as i64;
        match existing_tasks.get(&task.id) {
            None => {
                tx.execute(
                    "INSERT INTO tasks(id, title, status, position) VALUES (?1, ?2, ?3, ?4)",
                    params![&task.id, &task.title, status, position],
                ).map_err(err)?;
            }
            Some((title, old_status, old_position))
                if title != &task.title || old_status != status || *old_position != position => {
                tx.execute(
                    "UPDATE tasks SET title = ?2, status = ?3, position = ?4 WHERE id = ?1",
                    params![&task.id, &task.title, status, position],
                ).map_err(err)?;
            }
            _ => {}
        }
    }

    let past = serde_json::to_string(&history.past).map_err(err)?;
    let future = serde_json::to_string(&history.future).map_err(err)?;
    tx.execute(
        "INSERT INTO history(id, past, future) VALUES (1, ?1, ?2)
         ON CONFLICT(id) DO UPDATE SET past = excluded.past, future = excluded.future
         WHERE history.past <> excluded.past OR history.future <> excluded.future",
        params![past, future],
    ).map_err(err)?;
    Ok(())
}

impl AppState {
    pub fn load(db_path: PathBuf) -> Result<Self, String> {
        if let Some(parent) = db_path.parent() {
            fs::create_dir_all(parent).map_err(err)?;
        }
        let mut conn = Connection::open(&db_path).map_err(err)?;
        conn.execute_batch(
            "PRAGMA foreign_keys = ON;
             CREATE TABLE IF NOT EXISTS columns (
               status TEXT PRIMARY KEY CHECK(status IN ('todo','doing','done')),
               title TEXT NOT NULL,
               color TEXT NOT NULL,
               position INTEGER NOT NULL
             );
             CREATE TABLE IF NOT EXISTS tasks (
               id TEXT PRIMARY KEY,
               title TEXT NOT NULL,
               status TEXT NOT NULL REFERENCES columns(status),
               position INTEGER NOT NULL
             );
             CREATE TABLE IF NOT EXISTS history (
               id INTEGER PRIMARY KEY CHECK(id=1),
               past TEXT NOT NULL,
               future TEXT NOT NULL
             );"
        ).map_err(err)?;

        // New schema's history row is the initialization marker, even for an empty board.
        let stored: Option<(String, String)> = conn.query_row(
            "SELECT past,future FROM history WHERE id=1", [],
            |row| Ok((row.get(0)?, row.get(1)?)),
        ).optional().map_err(err)?;

        let history = if let Some((past_json, future_json)) = stored {
            let columns = {
                let mut stmt = conn.prepare("SELECT status,title,color FROM columns ORDER BY position, rowid").map_err(err)?;
                let rows = stmt.query_map([], |row| {
                    let status: String = row.get(0)?;
                    Ok(Column { status: parse_status(&status)?, title: row.get(1)?, color: row.get(2)? })
                }).map_err(err)?;
                rows.collect::<rusqlite::Result<Vec<_>>>().map_err(err)?
            };
            let tasks = {
                let mut stmt = conn.prepare("SELECT id,title,status FROM tasks ORDER BY position, rowid").map_err(err)?;
                let rows = stmt.query_map([], |row| {
                    let status: String = row.get(2)?;
                    Ok(Task { id: row.get(0)?, title: row.get(1)?, status: parse_status(&status)? })
                }).map_err(err)?;
                rows.collect::<rusqlite::Result<Vec<_>>>().map_err(err)?
            };
            HistoryState {
                past: serde_json::from_str(&past_json).map_err(err)?,
                present: BoardState { tasks, columns },
                future: serde_json::from_str(&future_json).map_err(err)?,
            }
        } else {
            // Migration priority: old SQLite snapshot, then board.json, then defaults.
            let old_table: bool = conn.query_row(
                "SELECT EXISTS(SELECT 1 FROM sqlite_master WHERE type='table' AND name='board_history')",
                [], |row| row.get(0),
            ).map_err(err)?;
            let old_json: Option<String> = if old_table {
                conn.query_row("SELECT data FROM board_history WHERE id=1", [], |row| row.get(0))
                    .optional().map_err(err)?
            } else { None };
            let initial = if let Some(json) = old_json {
                serde_json::from_str::<HistoryState>(&json).map_err(err)?
            } else {
                let json_path = db_path.with_file_name("board.json");
                if json_path.exists() {
                    serde_json::from_str::<HistoryState>(&fs::read_to_string(json_path).map_err(err)?)
                        .map_err(err)?
                } else { HistoryState::default() }
            };
            let tx = conn.transaction().map_err(err)?;
            write_snapshot(&tx, &initial)?;
            tx.commit().map_err(err)?;
            initial
        };
        Ok(Self { history: Mutex::new(history), db_path })
    }

    pub fn save(&self, history: &HistoryState) -> Result<(), String> {
        let mut conn = Connection::open(&self.db_path).map_err(err)?;
        conn.execute_batch("PRAGMA foreign_keys = ON;").map_err(err)?;
        let tx = conn.transaction().map_err(err)?;
        write_changes(&tx, history)?;
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
            self.future.insert(0, self.present.clone());
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
