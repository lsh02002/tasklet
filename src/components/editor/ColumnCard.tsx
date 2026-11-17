import { useState, type DragEvent } from "react";
import TaskCard from "./TaskCard";
import type {
  BoardState,
  DropPosition,
  TaskStatus,
  TaskType,
  TaskPriority,
} from "../../type";

type Column = BoardState["columns"][number];
type Task = BoardState["tasks"][number];

interface ColumnsProps {
  listId: string;
  columns: Column[];
  tasks: Task[];
  busy: boolean;
  addTask: (
    status: TaskStatus,
    taskType: TaskType,
    priority: TaskPriority,
    startedAt: string | null,
    endedAt: string | null,
    listId: string,
  ) => void;
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
    listId: string;
    status: TaskStatus;
    taskId: string | null;
    position: DropPosition;
  } | null>(null);

  const [hoveredEmptyColumn, setHoveredEmptyColumn] =
    useState<TaskStatus | null>(null);

  return (
    <div className="d-flex justify-content-between gap-3">
      {columns
        .filter((column) => column.listId === listId)
        .map((column) => {
          const columnTasks = tasks.filter(
            (task) => task.listId === listId && task.status === column.status,
          );

          const isEmpty = columnTasks.length === 0;

          const isEmptyTaskHover =
            isEmpty && hoveredEmptyColumn === column.status;

          return (
            <div
              key={`${listId}-${column.status}`}
              className="card p-3"
              style={{
                width: "100%",
                height: "100%",
                minHeight: 180,
                backgroundColor: column.color,
              }}
              draggable={!busy}
              onDragStart={(event) => {
                // Task 드래그 이벤트가 컬럼으로 전파되면
                // 컬럼 드래그가 시작되지 않도록 방지
                if (event.target !== event.currentTarget) {
                  return;
                }

                handleColumnDragStart(event, column.status, listId);
              }}
              onDragEnd={() => {
                setHoveredEmptyColumn(null);
                setActiveDropZone(null);
                handleColumnDragEnd();
              }}
              onDragOver={(event) => {
                event.preventDefault();

                const isTaskDrag = event.dataTransfer.types.includes(
                  "application/x-kanban-task",
                );

                if (isEmpty && isTaskDrag) {
                  event.dataTransfer.dropEffect = "move";

                  setHoveredEmptyColumn((prev) =>
                    prev === column.status ? prev : column.status,
                  );
                }
              }}
              onDragLeave={(event) => {
                const rect = event.currentTarget.getBoundingClientRect();

                if (
                  event.clientX < rect.left ||
                  event.clientX > rect.right ||
                  event.clientY < rect.top ||
                  event.clientY > rect.bottom
                ) {
                  setHoveredEmptyColumn((prev) =>
                    prev === column.status ? null : prev,
                  );
                }
              }}
              onDrop={(event) => {
                const data = event.dataTransfer.getData("text/plain");

                setHoveredEmptyColumn(null);
                setActiveDropZone(null);

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

              {/* 빈 컬럼 + Task 드래그 호버일 때만 표시 */}
              {isEmptyTaskHover && (
                <div
                  className="kanban-top-dropzone"
                  aria-hidden="true"
                  style={{
                    height: 20,
                    border: "2px dashed #3b82f6",
                    borderRadius: 8,
                    background: "rgba(59, 130, 246, 0.08)",
                    pointerEvents: "none",
                    flexShrink: 0,
                  }}
                />
              )}

              {/* 기존 TaskCard */}
              {columnTasks.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  activeDropZone={
                    activeDropZone?.listId === listId &&
                    activeDropZone.status === column.status &&
                    activeDropZone.taskId !== null
                      ? {
                          taskId: activeDropZone.taskId,
                          position: activeDropZone.position,
                        }
                      : null
                  }
                  setActiveDropZone={(zone) => {
                    setActiveDropZone((prev) => {
                      if (!zone) {
                        // 이전 카드의 dragLeave가
                        // 다른 카드의 드롭존을 지우지 않도록 함
                        return prev?.taskId === task.id &&
                          prev.listId === listId &&
                          prev.status === column.status
                          ? null
                          : prev;
                      }

                      if (
                        prev?.taskId === zone.taskId &&
                        prev.position === zone.position &&
                        prev.status === column.status &&
                        prev.listId === listId
                      ) {
                        return prev;
                      }

                      return {
                        listId,
                        status: column.status,
                        taskId: zone.taskId,
                        position: zone.position,
                      };
                    });
                  }}
                  onDragStart={(event, taskId) => {
                    setHoveredEmptyColumn(null);
                    setActiveDropZone(null);
                    handleTaskDragStart(event, taskId);
                  }}
                  onDragEnd={() => {
                    setHoveredEmptyColumn(null);
                    setActiveDropZone(null);
                    handleTaskDragEnd();
                  }}
                  onDrop={(event, targetTaskId, position) => {
                    setHoveredEmptyColumn(null);
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
                onClick={() =>
                  addTask(column.status, "Task", "Medium", null, null, listId)
                }
                disabled={busy}
              >
                + Task
              </button>
            </div>
          );
        })}
    </div>
  );
}
