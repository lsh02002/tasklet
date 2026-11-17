use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct List { pub id: String, pub title: String, pub created_at: Option<String> }

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum TaskStatus { Todo, Doing, Done }

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub enum TaskType { Story, Task, Bug, Epic }

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub enum TaskPriority { Low, Medium, High, Urgent }

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct Task {
    pub id: String,
    pub list_id: String,
    pub title: String,
    pub status: TaskStatus,
    pub task_type: TaskType,
    pub priority: TaskPriority,
    pub started_at: Option<String>,
    pub ended_at: Option<String>,
    pub created_at: Option<String>,
    pub updated_at: Option<String>,    
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct Column {
    pub status: TaskStatus,
    pub title: String,
    pub color: String,
    pub created_at: Option<String>,
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
            lists: vec![List { id: list_id.clone(), title: "기본 List".into(), created_at: None }],
            tasks: [
                ("1", "Task 1", TaskStatus::Todo),
                ("2", "Task 2", TaskStatus::Doing),
                ("3", "Task 3", TaskStatus::Done),
            ].into_iter().map(|(id, title, status)| Task {
                id: id.into(), title: title.into(), status, task_type: TaskType::Task, priority: TaskPriority::Medium, started_at: None, ended_at: None, created_at: None, updated_at: None, list_id: list_id.clone(),
            }).collect(),
            columns: [
                (TaskStatus::Todo, "할 일", "#E3F2FD"),
                (TaskStatus::Doing, "진행 중", "#FFF3CD"),
                (TaskStatus::Done, "완료", "#D1E7DD"),
            ].into_iter().map(|(status, title, color)| Column {
                status, title: title.into(), color: color.into(), created_at: None, list_id: list_id.clone(),
            }).collect(),
        }
    }
}

impl Default for HistoryState {
    fn default() -> Self {
        Self { past: Vec::new(), present: BoardState::default(), future: Vec::new() }
    }
}
