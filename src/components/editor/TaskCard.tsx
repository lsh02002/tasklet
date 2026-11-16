import { type DragEvent, useState, useRef } from "react";
import {
  AlertCircle,
  ArrowDown,
  ArrowUp,
  Bookmark,
  Bug,
  CalendarDays,
  CheckCircle2,
  Circle,
  CircleDot,
  Layers3,
  ListTodo,
  Trash2,
} from "lucide-react";
import type { Task, TaskPriority, TaskType, DropPosition } from "../../type";
import "./TaskCard.css";

type DropZone = {
  taskId: string;
  position: DropPosition;
};

type CardProps = {
  task: Task;
  onDragStart: (event: DragEvent<HTMLElement>, taskId: string) => void;
  onDragEnd: () => void;
  onDrop: (
    event: DragEvent<HTMLElement>,
    taskId: string,
    position: DropPosition,
  ) => void;
  onDelete: () => void;

  activeDropZone: DropZone | null;
  setActiveDropZone: (zone: DropZone | null) => void;
};

const typeConfig = {
  Story: { icon: Bookmark, color: "#22a06b" },
  Task: { icon: ListTodo, color: "#3b82f6" },
  Bug: { icon: Bug, color: "#ef4444" },
  Epic: { icon: Layers3, color: "#a855f7" },
} satisfies Record<
  TaskType,
  {
    icon: typeof Bug;
    color: string;
  }
>;

const priorityConfig = {
  Low: { icon: ArrowDown, color: "#94a3b8" },
  Medium: { icon: CircleDot, color: "#eab308" },
  High: { icon: ArrowUp, color: "#f97316" },
  Urgent: { icon: AlertCircle, color: "#ef4444" },
} satisfies Record<
  TaskPriority,
  {
    icon: typeof AlertCircle;
    color: string;
  }
>;

const statusConfig = {
  todo: { label: "Todo", icon: Circle },
  doing: { label: "Doing", icon: CircleDot },
  done: { label: "Done", icon: CheckCircle2 },
};

function TaskCard({
  task,
  onDragStart,
  onDragEnd,
  onDrop,
  onDelete,
  activeDropZone,
  setActiveDropZone,
}: CardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const [cardHeight, setCardHeight] = useState(0);

  const type = typeConfig[task.taskType] ?? typeConfig.Task;
  const priority = priorityConfig[task.priority] ?? priorityConfig.Medium;
  const status = statusConfig[task.status] ?? statusConfig.todo;

  const TypeIcon = type.icon;
  const PriorityIcon = priority.icon;
  const StatusIcon = status.icon;

  const handleDragOver = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();

    const data = event.dataTransfer.types;

    if (!data.includes("text/plain")) return;

    event.dataTransfer.dropEffect = "move";

    const rect = cardRef.current?.getBoundingClientRect();
    if (!rect) return;

    setCardHeight((prev) => (prev === rect.height ? prev : rect.height));

    const position: DropPosition =
      event.clientY < rect.top + rect.height / 2 ? "top" : "bottom";

    if (
      activeDropZone?.taskId !== task.id ||
      activeDropZone.position !== position
    ) {
      setActiveDropZone({
        taskId: task.id,
        position,
      });
    }
  };

  const handleDragLeave = (event: DragEvent<HTMLDivElement>) => {
    const rect = wrapperRef.current?.getBoundingClientRect();
    if (!rect) return;

    const { clientX, clientY } = event;

    if (
      clientX < rect.left ||
      clientX > rect.right ||
      clientY < rect.top ||
      clientY > rect.bottom
    ) {
      if (activeDropZone?.taskId === task.id) {
        setActiveDropZone(null);
      }
    }
  };

  const handleDrop = (event: DragEvent<HTMLElement>) => {
    event.preventDefault();
    event.stopPropagation();

    const position: DropPosition =
      activeDropZone?.taskId === task.id ? activeDropZone.position : "bottom";

    setActiveDropZone(null);
    onDrop(event, task.id, position);
  };

  return (
    <div
      ref={wrapperRef}
      className="task-card-wrapper"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {activeDropZone?.taskId === task.id &&
        activeDropZone.position === "top" && (
          <div
            className="task-card-placeholder"
            style={{ height: cardHeight }}
            aria-hidden="true"
          />
        )}
      <div
        ref={cardRef}
        className="task-card"
        draggable
        onDragStart={(event) => {
          setActiveDropZone(null);
          onDragStart(event, task.id);
        }}
        onDragEnd={() => {
          setActiveDropZone(null);
          onDragEnd();
        }}
      >
        {/* Header */}
        <div className="task-card-header">
          <div className="task-card-type" style={{ color: type.color }}>
            <TypeIcon size={15} strokeWidth={2.2} />
            <span>{task.taskType ?? "Task"}</span>
          </div>

          <div className="task-card-actions">
            <div
              className="task-card-priority"
              style={{ color: priority.color }}
              title={`${task.priority ?? "Medium"} priority`}
            >
              <PriorityIcon size={14} />
              <span>{task.priority ?? "Medium"}</span>
            </div>

            <button
              type="button"
              className="task-card-delete"
              title="Delete task"
              aria-label="Delete task"
              draggable={false}
              onClick={(event) => {
                event.stopPropagation();
                onDelete();
              }}
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>

        {/* Title */}
        <div className="task-card-title">{task.title}</div>

        {/* Footer */}
        <div className="task-card-footer">
          <span className={`task-status task-status-${task.status}`}>
            <StatusIcon size={12} />
            {status.label}
          </span>

          {task.createdAt && (
            <div className="task-card-date">
              <CalendarDays size={12} />
              <span>
                {new Date(task.createdAt).toLocaleDateString("ko-KR")}
              </span>
            </div>
          )}
        </div>
      </div>

      {activeDropZone?.taskId === task.id &&
        activeDropZone.position === "bottom" && (
          <div
            className="task-card-placeholder"
            style={{ height: cardHeight }}
            aria-hidden="true"
          />
        )}
    </div>
  );
}

export default TaskCard;
