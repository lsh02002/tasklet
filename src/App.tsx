import { type DragEvent, useCallback, useEffect, useState } from "react";
import type { Task, TaskStatus, HistoryState, TasksUpdater } from "./type";
import Card from "./Card";

const columns: {
  status: TaskStatus;
  title: string;
  color: string;
}[] = [
  { status: "todo", title: "할 일", color: "#E3F2FD" },
  { status: "doing", title: "진행 중", color: "#FFF3CD" },
  { status: "done", title: "완료", color: "#D1E7DD" },
];

const initialTasks: Task[] = [
  { id: "1", title: "Task 1", status: "todo" },
  { id: "2", title: "Task 2", status: "doing" },
  { id: "3", title: "Task 3", status: "done" },
];

function App() {
  const [history, setHistory] = useState<HistoryState>({
    past: [],
    present: initialTasks,
    future: [],
  });

  const [draggedId, setDraggedId] = useState<string | null>(null);

  const tasks = history.present;
  const canUndo = history.past.length > 0;
  const canRedo = history.future.length > 0;

  // 작업 변경 및 히스토리 기록
  const setTasks = useCallback(
    (updater: TasksUpdater, recordHistory = true) => {
      setHistory((prev) => {
        const nextTasks =
          typeof updater === "function" ? updater(prev.present) : updater;

        // 변경 사항이 없으면 기록하지 않음
        if (nextTasks === prev.present) {
          return prev;
        }

        if (!recordHistory) {
          return {
            ...prev,
            present: nextTasks,
          };
        }

        return {
          past: [...prev.past, prev.present],
          present: nextTasks,
          future: [],
        };
      });
    },
    [],
  );

  // Undo
  const undo = useCallback(() => {
    setHistory((prev) => {
      if (prev.past.length === 0) return prev;

      const previous = prev.past[prev.past.length - 1];

      return {
        past: prev.past.slice(0, -1),
        present: previous,
        future: [prev.present, ...prev.future],
      };
    });
  }, []);

  // Redo
  const redo = useCallback(() => {
    setHistory((prev) => {
      if (prev.future.length === 0) return prev;

      const next = prev.future[0];

      return {
        past: [...prev.past, prev.present],
        present: next,
        future: prev.future.slice(1),
      };
    });
  }, []);

  // 키보드 단축키
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!event.ctrlKey && !event.metaKey) return;

      const key = event.key.toLowerCase();

      if (key === "z" && !event.shiftKey) {
        if (canUndo) {
          event.preventDefault();
          undo();
        }
      } else if (key === "y" || (key === "z" && event.shiftKey)) {
        if (canRedo) {
          event.preventDefault();
          redo();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [canUndo, canRedo, undo, redo]);

  // 드래그 시작
  const handleDragStart = (event: DragEvent<HTMLElement>, taskId: string) => {
    event.dataTransfer.setData("text/plain", taskId);
    event.dataTransfer.effectAllowed = "move";
    setDraggedId(taskId);
  };

  // 드래그 종료
  const handleDragEnd = () => {
    setDraggedId(null);
  };

  // 드롭 처리
  const handleDrop = (
    event: DragEvent<HTMLElement>,
    status: TaskStatus,
    targetId?: string,
  ) => {
    event.preventDefault();
    event.stopPropagation();

    const id = event.dataTransfer.getData("text/plain") || draggedId;

    if (!id || id === targetId) {
      handleDragEnd();
      return;
    }

    setTasks((prev) => {
      const moving = prev.find((task) => task.id === id);

      if (!moving) return prev;

      const remaining = prev.filter((task) => task.id !== id);

      const updated: Task = {
        ...moving,
        status,
      };

      const targetIndex = targetId
        ? remaining.findIndex((task) => task.id === targetId)
        : -1;

      if (targetIndex !== -1) {
        remaining.splice(targetIndex, 0, updated);
      } else {
        remaining.push(updated);
      }

      // 실제 순서나 상태가 같으면 변경하지 않음
      if (
        remaining.length === prev.length &&
        remaining.every(
          (task, index) =>
            task.id === prev[index].id && task.status === prev[index].status,
        )
      ) {
        return prev;
      }

      return remaining;
    });

    handleDragEnd();
  };

  // 작업 추가
  const addTask = (status: TaskStatus) => {
    const title = window.prompt("Enter task title");

    if (!title?.trim()) return;

    setTasks((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        title: title.trim(),
        status,
      },
    ]);
  };

  // 작업 삭제
  const deleteTask = (taskId: string) => {
    setTasks((prev) => prev.filter((task) => task.id !== taskId));
  };

  return (
    <div className="container-fluid p-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h3 className="mb-0">Tasklet</h3>

        <div className="d-flex gap-2">
          <button
            className="btn btn-outline-secondary"
            onClick={undo}
            disabled={!canUndo}
          >
            Undo
          </button>

          <button
            className="btn btn-outline-secondary"
            onClick={redo}
            disabled={!canRedo}
          >
            Redo
          </button>
        </div>
      </div>

      <div className="row g-3">
        {columns.map((column) => (
          <div className="col-md-4" key={column.status}>
            <div
              className="rounded p-3 h-100"
              style={{ minHeight: 300, backgroundColor: column.color }}
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => handleDrop(event, column.status)}
            >
              <div className="d-flex justify-content-between align-items-center">
                <h5 className="mb-3">{column.title}</h5>

                <button
                  className="btn btn-primary mb-3"
                  onClick={() => addTask(column.status)}
                >
                  +
                </button>
              </div>

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
                    onDelete={() => deleteTask(task.id)}
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
