use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct List { pub id: String, pub title: String }

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum TaskStatus { Todo, Doing, Done }

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct Task {
    pub id: String,
    pub title: String,
    pub status: TaskStatus,
    pub list_id: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct Column {
    pub status: TaskStatus,
    pub title: String,
    pub color: String,
    pub list_id: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct BoardState {
    pub lists: Vec<List>,
    pub tasks: Vec<Task>,
    pub columns: Vec<Column>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HistoryState {
    pub past: Vec<BoardState>,
    pub present: BoardState,
    pub future: Vec<BoardState>,
}

impl Default for BoardState {
    fn default() -> Self {
        let list_id = "default".to_string();
        Self {
            lists: vec![List { id: list_id.clone(), title: "기본 List".into() }],
            tasks: [
                ("1", "Task 1", TaskStatus::Todo),
                ("2", "Task 2", TaskStatus::Doing),
                ("3", "Task 3", TaskStatus::Done),
            ].into_iter().map(|(id, title, status)| Task {
                id: id.into(), title: title.into(), status, list_id: list_id.clone(),
            }).collect(),
            columns: [
                (TaskStatus::Todo, "할 일", "#E3F2FD"),
                (TaskStatus::Doing, "진행 중", "#FFF3CD"),
                (TaskStatus::Done, "완료", "#D1E7DD"),
            ].into_iter().map(|(status, title, color)| Column {
                status, title: title.into(), color: color.into(), list_id: list_id.clone(),
            }).collect(),
        }
    }
}

impl Default for HistoryState {
    fn default() -> Self {
        Self { past: Vec::new(), present: BoardState::default(), future: Vec::new() }
    }
}
