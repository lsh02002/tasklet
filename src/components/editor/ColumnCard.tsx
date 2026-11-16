import { useState, type DragEvent } from "react";
import TaskCard from "./TaskCard";
import type { BoardState, DropPosition, TaskStatus } from "../../type";

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
    taskId: string,
    position: DropPosition,
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
  const [activeDropZone, setActiveDropZone] = useState<{
    taskId: string;
    position: DropPosition;
  } | null>(null);

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
              height: "100%",
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
                handleTaskDrop(event, column.status, listId, "", "bottom");
              }
            }}
          >
            <div className="d-flex justify-content-between">
              <h5>{column.title}</h5>
            </div>

            <div
              className="kanban-top-dropzone"
              onDragOver={(event) => {
                event.preventDefault();
                event.stopPropagation();
                event.dataTransfer.dropEffect = "move";

                setActiveDropZone(null);
              }}
              onDrop={(event) => {
                event.preventDefault();
                event.stopPropagation();

                const firstTask = tasks.find(
                  (task) =>
                    task.listId === listId && task.status === column.status,
                );

                handleTaskDrop(
                  event,
                  column.status,
                  listId,
                  firstTask?.id ?? "",
                  "top",
                );

                setActiveDropZone(null);
              }}
            />

            {tasks
              .filter(
                (task) =>
                  task.listId === listId && task.status === column.status,
              )
              .map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  activeDropZone={activeDropZone}
                  setActiveDropZone={setActiveDropZone}
                  onDragStart={handleTaskDragStart}
                  onDragEnd={() => {
                    setActiveDropZone(null);
                    handleTaskDragEnd();
                  }}
                  onDrop={(event, targetTaskId, position) => {
                    setActiveDropZone(null);
                    handleTaskDrop(
                      event,
                      column.status,
                      listId,
                      targetTaskId,
                      position,
                    );
                  }}
                  onDelete={() => deleteTask(task.id)}
                />
              ))}
            <button
              className="btn btn-outline-primary mt-3"
              onClick={() => addTask(column.status, listId)}
              disabled={busy}
            >
              + Task
            </button>
          </div>
        ))}
    </div>
  );
}
