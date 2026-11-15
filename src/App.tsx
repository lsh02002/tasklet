
import { type DragEvent, useState } from "react";
import Card from "./Card";
import type { Task, TaskStatus } from "./type";

const columns: { status: TaskStatus; title: string }[] = [
  { status: "todo", title: "할 일" },
  { status: "doing", title: "진행 중" },
  { status: "done", title: "완료" },
];

function App() {
  const [tasks, setTasks] = useState<Task[]>([
    { id: "1", title: "Task 1", status: "todo" },
    { id: "2", title: "Task 2", status: "doing" },
    { id: "3", title: "Task 3", status: "done" },
  ]);

  const [draggedId, setDraggedId] = useState<string | null>(null);

  const handleDragStart = (
    event: DragEvent<HTMLElement>,
    taskId: string,
  ) => {
    event.dataTransfer.setData("text/plain", taskId);
    event.dataTransfer.effectAllowed = "move";
    setDraggedId(taskId);
  };

  const handleDragEnd = () => {
    setDraggedId(null);
  };

  const handleDrop = (
    event: DragEvent<HTMLElement>,
    status: TaskStatus,
    targetId?: string,
  ) => {
    event.preventDefault();
    event.stopPropagation();

    const id =
      event.dataTransfer.getData("text/plain") || draggedId;

    if (!id || id === targetId) {
      handleDragEnd();
      return;
    }

    setTasks((prev) => {
      const moving = prev.find((task) => task.id === id);
      if (!moving) return prev;

      const remaining = prev.filter((task) => task.id !== id);
      const updated: Task = { ...moving, status };

      const targetIndex = targetId
        ? remaining.findIndex((task) => task.id === targetId)
        : -1;

      if (targetIndex !== -1) {
        remaining.splice(targetIndex, 0, updated);
      } else {
        remaining.push(updated);
      }

      return remaining;
    });

    handleDragEnd();
  };

  return (
    <div className="container-fluid p-4">
      <h3 className="mb-4">Tasklet</h3>

      <div className="row g-3">
        {columns.map((column) => (
          <div className="col-md-4" key={column.status}>
            <div
              className="bg-light rounded p-3 h-100"
              style={{ minHeight: 300 }}
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) =>
                handleDrop(event, column.status)
              }
            >
              <h5 className="mb-3">{column.title}</h5>

              {tasks
                .filter((task) => task.status === column.status)
                .map((task) => (
                  <Card
                    key={task.id}
                    task={task}
                    onDragStart={handleDragStart}
                    onDragEnd={handleDragEnd}
                    onDrop={(event) =>
                      handleDrop(event, column.status, task.id)
                    }
                  />
                ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default App;
