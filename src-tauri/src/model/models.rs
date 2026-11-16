use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum TaskStatus {
    Todo,
    Doing,
    Done,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct Task {
    pub id: String,
    pub title: String,
    pub status: TaskStatus,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct Column {
    pub status: TaskStatus,
    pub title: String,
    pub color: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct BoardState {
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
        Self {
            tasks: vec![
                Task {
                    id: "1".into(),
                    title: "Task 1".into(),
                    status: TaskStatus::Todo,
                },
                Task {
                    id: "2".into(),
                    title: "Task 2".into(),
                    status: TaskStatus::Doing,
                },
                Task {
                    id: "3".into(),
                    title: "Task 3".into(),
                    status: TaskStatus::Done,
                },
            ],
            columns: vec![
                Column {
                    status: TaskStatus::Todo,
                    title: "할 일".into(),
                    color: "#E3F2FD".into(),
                },
                Column {
                    status: TaskStatus::Doing,
                    title: "진행 중".into(),
                    color: "#FFF3CD".into(),
                },
                Column {
                    status: TaskStatus::Done,
                    title: "완료".into(),
                    color: "#D1E7DD".into(),
                },
            ],
        }
    }
}

impl Default for HistoryState {
    fn default() -> Self {
        Self {
            past: Vec::new(),
            present: BoardState::default(),
            future: Vec::new(),
        }
    }
}
