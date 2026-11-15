import { type DragEvent, useState } from "react";
import type { Task } from "./type";

type CardProps = {
  task: Task;
  onDragStart: (event: DragEvent<HTMLElement>, taskId: string) => void;
  onDragEnd: () => void;
  onDrop: (event: DragEvent<HTMLElement>) => void;
};

function Card({ task, onDragStart, onDragEnd, onDrop }: CardProps) {
  const [isOver, setIsOver] = useState(false);

  return (
    <div
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
      className="card mb-2 shadow-sm"
      style={{
        cursor: "grab",
        userSelect: "none",
        borderTop: isOver ? "3px solid #0d6efd" : undefined,
        opacity: 1,
      }}
    >
      <div className="card-body p-3">{task.title}</div>
    </div>
  );
}

export default Card;
