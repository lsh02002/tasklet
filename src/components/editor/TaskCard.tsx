import { type DragEvent, useState } from "react";
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
import type { Task, TaskPriority, TaskType } from "../../type";
import "./TaskCard.css";

type CardProps = {
  task: Task;
  onDragStart: (event: DragEvent<HTMLElement>, taskId: string) => void;
  onDragEnd: () => void;
  onDrop: (event: DragEvent<HTMLElement>) => void;
  onDelete: () => void;
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
}: CardProps) {
  const [isOver, setIsOver] = useState(false);

  const type = typeConfig[task.taskType] ?? typeConfig.Task;
  const priority = priorityConfig[task.priority] ?? priorityConfig.Medium;
  const status = statusConfig[task.status] ?? statusConfig.todo;

  const TypeIcon = type.icon;
  const PriorityIcon = priority.icon;
  const StatusIcon = status.icon;

  return (
    <div
      className={`task-card ${isOver ? "task-card-over" : ""}`}
      draggable
      onDragStart={(event) => onDragStart(event, task.id)}
      onDragEnd={() => {
        setIsOver(false);
        onDragEnd();
      }}
      onDragOver={(event) => {
        event.preventDefault();
        event.stopPropagation();
        event.dataTransfer.dropEffect = "move";
        setIsOver(true);
      }}
      onDragLeave={() => setIsOver(false)}
      onDrop={(event) => {
        event.preventDefault();
        event.stopPropagation();
        setIsOver(false);
        onDrop(event);
      }}
    >
      {/* Header */}
      <div className="task-card-header">
        <div className="task-card-type" style={{ color: type.color }}>
          <TypeIcon size={15} strokeWidth={2.2} />
          <span>{task.taskType}</span>
        </div>

        <div className="task-card-actions">
          <div
            className="task-card-priority"
            style={{ color: priority.color }}
            title={`${task.priority} priority`}
          >
            <PriorityIcon size={14} />
            <span>{task.priority}</span>
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
            <span>{new Date(task.createdAt).toLocaleDateString("ko-KR")}</span>
          </div>
        )}
      </div>
    </div>
  );
}

export default TaskCard;
