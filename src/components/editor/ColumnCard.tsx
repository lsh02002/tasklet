import type { DragEvent } from "react";
import TaskCard from "./TaskCard";
import type { BoardState, TaskStatus } from "../../type";

type Column = BoardState["columns"][number];
type Task = BoardState["tasks"][number];

interface ColumnsProps {
  listId: string;
  columns: Column[];
  tasks: Task[];
  busy: boolean;
  addTask: (status: TaskStatus, listId: string) => void;
  deleteTask: (taskId: string) => void;
  handleColumnDragStart: (
    event: DragEvent<HTMLElement>,
    status: TaskStatus,
    listId: string,
  ) => void;
  handleColumnDragEnd: () => void;
  handleColumnDrop: (
    event: DragEvent<HTMLElement>,
    status: TaskStatus,
    listId: string,
  ) => void;
  handleTaskDragStart: (event: DragEvent<HTMLElement>, taskId: string) => void;
  handleTaskDragEnd: () => void;
  handleTaskDrop: (
    event: DragEvent<HTMLElement>,
    status: TaskStatus,
    listId: string,
    taskId?: string,
  ) => void;
}

export default function ColumnCard({
  listId,
  columns,
  tasks,
  busy,
  addTask,
  deleteTask,
  handleColumnDragStart,
  handleColumnDragEnd,
  handleColumnDrop,
  handleTaskDragStart,
  handleTaskDragEnd,
  handleTaskDrop,
}: ColumnsProps) {
  return (
    <div className="d-flex justify-content-between gap-3">
      {columns
        .filter((column) => column.listId === listId)
        .map((column) => (
          <div
            key={`${listId}-${column.status}`}
            className="card p-3"
            style={{
              width: "100%",
              minHeight: 300,
              backgroundColor: column.color,
            }}
            draggable={!busy}
            onDragStart={(event) =>
              handleColumnDragStart(event, column.status, listId)
            }
            onDragEnd={handleColumnDragEnd}
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              const data = event.dataTransfer.getData("text/plain");

              if (data.startsWith("column:")) {
                handleColumnDrop(event, column.status, listId);
              } else if (data.startsWith("task:")) {
                handleTaskDrop(event, column.status, listId);
              }
            }}
          >
            <div className="d-flex justify-content-between">
              <h5>{column.title}</h5>
              <button
                className="btn btn-outline-primary mb-2"
                onClick={() => addTask(column.status, listId)}
                disabled={busy}
              >
                + Task
              </button>
            </div>

            {tasks
              .filter(
                (task) =>
                  task.listId === listId && task.status === column.status,
              )
              .map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  onDragStart={handleTaskDragStart}
                  onDragEnd={handleTaskDragEnd}
                  onDrop={(event) =>
                    handleTaskDrop(event, column.status, listId, task.id)
                  }
                  onDelete={() => deleteTask(task.id)}
                />
              ))}
          </div>
        ))}
    </div>
  );
}
