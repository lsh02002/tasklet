export type CanvasDropTarget = {
  parentId: string | null;
  index: number;
  area: "canvas" | "layer";
};

export type ContainerDirection = "row" | "column";

export type TaskStatus = "todo" | "doing" | "done";

export type Task = {
  id: string;
  title: string;
  status: TaskStatus;
};

export interface HistoryState {
  past: Task[][];
  present: Task[];
  future: Task[][];
}

export type TasksUpdater =
  | Task[]
  | ((prev: Task[]) => Task[]);

  
export type HistoryUpdater = (prev: Task[]) => Task[];