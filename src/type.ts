export interface List {
  id: string;
  title: string;
}

export type TaskStatus = "todo" | "doing" | "done";

export interface Task {
  id: string;
  title: string;
  status: TaskStatus;
  listId: string;
}

export interface Column {
  status: TaskStatus;
  title: string;
  color: string;
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

export type TasksUpdater =
  | Task[]
  | ((prev: Task[]) => Task[]);

export type ColumnsUpdater =
  | Column[]
  | ((prev: Column[]) => Column[]);
