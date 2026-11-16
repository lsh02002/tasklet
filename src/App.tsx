import { type DragEvent, useCallback, useEffect, useState } from "react";

import type {
  Task,
  TaskStatus,
  Column,
  HistoryState,
  TasksUpdater,
  ColumnsUpdater,
} from "./type";

import Card from "./Card";

const initialColumns: Column[] = [
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
    present: {
      tasks: initialTasks,
      columns: initialColumns,
    },
    future: [],
  });

  const [draggedId, setDraggedId] = useState<string | null>(null);

  const [draggedColumn, setDraggedColumn] = useState<TaskStatus | null>(null);

  const { tasks, columns } = history.present;

  const canUndo = history.past.length > 0;
  const canRedo = history.future.length > 0;

  // Task 변경 및 히스토리 기록
  const setTasks = useCallback(
    (updater: TasksUpdater, recordHistory = true) => {
      setHistory((prev) => {
        const nextTasks =
          typeof updater === "function" ? updater(prev.present.tasks) : updater;

        if (nextTasks === prev.present.tasks) {
          return prev;
        }

        const nextPresent = {
          ...prev.present,
          tasks: nextTasks,
        };

        if (!recordHistory) {
          return {
            ...prev,
            present: nextPresent,
          };
        }

        return {
          past: [...prev.past, prev.present],
          present: nextPresent,
          future: [],
        };
      });
    },
    [],
  );

  // Column 변경 및 히스토리 기록
  const setColumns = useCallback(
    (updater: ColumnsUpdater, recordHistory = true) => {
      setHistory((prev) => {
        const nextColumns =
          typeof updater === "function"
            ? updater(prev.present.columns)
            : updater;

        if (nextColumns === prev.present.columns) {
          return prev;
        }

        const nextPresent = {
          ...prev.present,
          columns: nextColumns,
        };

        if (!recordHistory) {
          return {
            ...prev,
            present: nextPresent,
          };
        }

        return {
          past: [...prev.past, prev.present],
          present: nextPresent,
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

      // 입력 중에는 브라우저 기본 Undo/Redo 유지
      const target = event.target;

      if (
        target instanceof HTMLElement &&
        (target.isContentEditable ||
          ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName))
      ) {
        return;
      }

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

  // Task 드래그 시작
  const handleDragStart = (event: DragEvent<HTMLElement>, taskId: string) => {
    event.stopPropagation();

    event.dataTransfer.setData("application/x-task", taskId);
    event.dataTransfer.effectAllowed = "move";

    setDraggedId(taskId);
  };

  // Task 드래그 종료
  const handleDragEnd = () => {
    setDraggedId(null);
  };

  // Task 드롭
  const handleDrop = (
    event: DragEvent<HTMLElement>,
    status: TaskStatus,
    targetId?: string,
  ) => {
    event.preventDefault();
    event.stopPropagation();

    if (!event.dataTransfer.types.includes("application/x-task")) {
      return;
    }

    const id = event.dataTransfer.getData("application/x-task") || draggedId;

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

  // Column 드래그 시작
  const handleColumnDragStart = (
    event: DragEvent<HTMLElement>,
    status: TaskStatus,
  ) => {
    event.stopPropagation();

    event.dataTransfer.setData("application/x-column", status);
    event.dataTransfer.effectAllowed = "move";

    setDraggedColumn(status);
  };

  // Column 드래그 종료
  const handleColumnDragEnd = () => {
    setDraggedColumn(null);
  };

  // Column 드롭
  const handleColumnDrop = (
    event: DragEvent<HTMLElement>,
    targetStatus: TaskStatus,
  ) => {
    event.preventDefault();
    event.stopPropagation();

    const sourceStatus =
      event.dataTransfer.getData("application/x-column") || draggedColumn;

    if (!sourceStatus || sourceStatus === targetStatus) {
      handleColumnDragEnd();
      return;
    }

    setColumns((prev) => {
      const sourceIndex = prev.findIndex(
        (column) => column.status === sourceStatus,
      );

      const targetIndex = prev.findIndex(
        (column) => column.status === targetStatus,
      );

      if (sourceIndex === -1 || targetIndex === -1) {
        return prev;
      }

      const next = [...prev];

      const [moving] = next.splice(sourceIndex, 1);

      next.splice(targetIndex, 0, moving);

      return next;
    });

    handleColumnDragEnd();
  };

  // Task 추가
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

  // Task 삭제
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
              style={{
                minHeight: 300,
                backgroundColor: column.color,
                opacity: draggedColumn === column.status ? 0.5 : 1,
              }}
              onDragOver={(event) => {
                event.preventDefault();
              }}
              onDrop={(event) => {
                if (event.dataTransfer.types.includes("application/x-column")) {
                  handleColumnDrop(event, column.status);
                } else if (
                  event.dataTransfer.types.includes("application/x-task")
                ) {
                  handleDrop(event, column.status);
                }
              }}
            >
              <div className="d-flex justify-content-between align-items-center">
                <h5
                  className="mb-3"
                  draggable
                  onDragStart={(event) =>
                    handleColumnDragStart(event, column.status)
                  }
                  onDragEnd={handleColumnDragEnd}
                  style={{
                    cursor: "grab",
                    userSelect: "none",
                  }}
                >
                  <span className="me-2">⠿</span>
                  {column.title}
                </h5>

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
                    onDrop={(event) => {
                      if (
                        event.dataTransfer.types.includes("application/x-task")
                      ) {
                        handleDrop(event, column.status, task.id);
                      }
                    }}
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
