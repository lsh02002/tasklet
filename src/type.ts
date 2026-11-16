export interface List {
  id: string;
  title: string;
  createdAt: string;
}

export type TaskStatus = "todo" | "doing" | "done";
export type TaskType = "Story" | "Task" | "Bug" | "Epic";
export type TaskPriority = "Low" | "Medium" | "High" | "Urgent";

export interface Task {
  id: string;
  listId: string;
  title: string;
  status: TaskStatus;
  taskType: TaskType;
  priority: TaskPriority;
  startedAt?: string;
  endedAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Column {
  status: TaskStatus;
  title: string;
  color: string;
  createdAt: string;
  listId: string;
}

export interface BoardState {
  lists: List[];
  tasks: Task[];
  columns: Column[];
}

export interface HistoryState {
  past: BoardState[];
  present: BoardState;
  future: BoardState[];
}

export type TasksUpdater = Task[] | ((prev: Task[]) => Task[]);

export type ColumnsUpdater = Column[] | ((prev: Column[]) => Column[]);
