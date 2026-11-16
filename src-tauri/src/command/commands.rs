use tauri::State;
use uuid::Uuid;

use crate::{
    models::{BoardState, Column, HistoryState, List, Task, TaskStatus},
    state::AppState,
};

// 현재 보드 및 히스토리 조회
#[tauri::command]
pub fn get_board(
    state: State<'_, AppState>,
) -> Result<HistoryState, String> {
    let history = state.history.lock()
        .map_err(|e| e.to_string())?;

    Ok(history.clone())
}

// 보드 전체 업데이트
#[tauri::command]
pub fn update_board(
    state: State<'_, AppState>,
    board: BoardState,
) -> Result<HistoryState, String> {
    mutate(&state, |history| {
        history.update(board);
    })
}

#[tauri::command]
pub fn add_list(
    state: State<'_, AppState>,
    title: String,
) -> Result<HistoryState, String> {
    let title = title.trim().to_string();

    if title.is_empty() {
        return Err("List title cannot be empty".into());
    }

    mutate(&state, |history| {
        let mut board = history.present.clone();
        let list_id = Uuid::new_v4().to_string();

        board.lists.push(List {
            id: list_id.clone(),
            title,
        });

        for (status, name, color) in [
            (TaskStatus::Todo, "할 일", "#E3F2FD"),
            (TaskStatus::Doing, "진행 중", "#FFF3CD"),
            (TaskStatus::Done, "완료", "#D1E7DD"),
        ] {
            board.columns.push(Column {
                list_id: list_id.clone(),
                status,
                title: name.into(),
                color: color.into(),
            });
        }

        history.update(board);
    })
}

#[tauri::command]
pub fn delete_list(
    state: State<'_, AppState>,
    list_id: String,
) -> Result<HistoryState, String> {
    mutate(&state, |history| {
        let mut board = history.present.clone();

        board.lists.retain(|list| list.id != list_id);

        board.columns.retain(|column| {
            column.list_id != list_id
        });

        board.tasks.retain(|task| {
            task.list_id != list_id
        });

        history.update(board);
    })
}

#[tauri::command]
pub fn add_task(
    state: State<'_, AppState>,
    title: String,
    status: TaskStatus,
    list_id: String,
) -> Result<HistoryState, String> {
    let title = title.trim().to_string();

    if title.is_empty() {
        return Err("Task title cannot be empty".into());
    }

    {
        let history = state.history.lock()
            .map_err(|e| e.to_string())?;

        let exists = history.present.columns.iter().any(|col| {
            col.list_id == list_id && col.status == status
        });

        if !exists {
            return Err("Target column does not exist".into());
        }
    }

    mutate(&state, |history| {
        let mut board = history.present.clone();

        board.tasks.push(Task {
            id: Uuid::new_v4().to_string(),
            title,
            status,
            list_id,
        });

        history.update(board);
    })
}

// Task 삭제
#[tauri::command]
pub fn delete_task(
    state: State<'_, AppState>,
    task_id: String,
) -> Result<HistoryState, String> {
    mutate(&state, |history| {
        let mut board = history.present.clone();

        board.tasks.retain(|task| task.id != task_id);

        history.update(board);
    })
}

// Undo
#[tauri::command]
pub fn undo(
    state: State<'_, AppState>,
) -> Result<HistoryState, String> {
    mutate(&state, |history| {
        history.undo();
    })
}

// Redo
#[tauri::command]
pub fn redo(
    state: State<'_, AppState>,
) -> Result<HistoryState, String> {
    mutate(&state, |history| {
        history.redo();
    })
}

// 공통 변경 + 저장 처리
fn mutate<F>(
    state: &AppState,
    action: F,
) -> Result<HistoryState, String>
where
    F: FnOnce(&mut HistoryState),
{
    let mut history = state.history.lock()
        .map_err(|e| e.to_string())?;

    let mut next = history.clone();

    action(&mut next);

    // 저장에 실패하면 메모리 상태도 변경하지 않음
    state.save(&next)?;

    *history = next.clone();

    Ok(next)
}
