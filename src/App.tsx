import {
  type DragEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import type {
  Task,
  TaskStatus,
  Column,
  HistoryState,
  BoardState,
} from "./type";

import Card from "./Card";
import { boardApi } from "./api/board";

const initialColumns: Column[] = [];

const initialTasks: Task[] = [];

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

  const [busy, setBusy] = useState(false);

  const historyRef = useRef<HistoryState | null>(null);
  const busyRef = useRef(false);

  const tasks = history?.present.tasks ?? [];
  const columns = history?.present.columns ?? [];

  const canUndo = !busy && (history?.past.length ?? 0) > 0;
  const canRedo = !busy && (history?.future.length ?? 0) > 0;

  useEffect(() => {
    boardApi
      .getBoard()
      .then((next) => {
        historyRef.current = next;
        setHistory(next);
      })
      .catch(console.error);
  }, []);

  // 백엔드 작업 공통 처리
  const runCommand = useCallback(
    async (command: () => Promise<HistoryState>) => {
      if (busyRef.current || !historyRef.current) return;

      busyRef.current = true;
      setBusy(true);

      try {
        const next = await command();

        historyRef.current = next;
        setHistory(next);
      } catch (error) {
        console.error("Board update failed:", error);
      } finally {
        busyRef.current = false;
        setBusy(false);
      }
    },
    [],
  );

  const undo = useCallback(async () => {
    await runCommand(() => boardApi.undo());
  }, [runCommand]);

  const redo = useCallback(async () => {
    await runCommand(() => boardApi.redo());
  }, [runCommand]);

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

  const addTask = async (status: TaskStatus) => {
    const title = window.prompt("Enter task title");

    if (!title?.trim()) return;

    const next = await boardApi.addTask(title.trim(), status);

    setHistory(next);
  };

  const deleteTask = async (taskId: string) => {
    const next = await boardApi.deleteTask(taskId);
    setHistory(next);
  };

  // Task 변경
  const updateTasks = useCallback(
    async (updater: Task[] | ((prev: Task[]) => Task[])) => {
      const current = historyRef.current;
      if (!current) return;

      const prevTasks = current.present.tasks;

      const nextTasks =
        typeof updater === "function" ? updater(prevTasks) : updater;

      if (nextTasks === prevTasks) return;

      const board: BoardState = {
        ...current.present,
        tasks: nextTasks,
      };

      await runCommand(() => boardApi.updateBoard(board));
    },
    [runCommand],
  );

  // Column 변경
  const updateColumns = useCallback(
    async (updater: Column[] | ((prev: Column[]) => Column[])) => {
      const current = historyRef.current;
      if (!current) return;

      const prevColumns = current.present.columns;

      const nextColumns =
        typeof updater === "function" ? updater(prevColumns) : updater;

      if (nextColumns === prevColumns) return;

      const board: BoardState = {
        ...current.present,
        columns: nextColumns,
      };

      await runCommand(() => boardApi.updateBoard(board));
    },
    [runCommand],
  );

  // Task 드래그 시작
  const handleTaskDragStart = (
    event: DragEvent<HTMLElement>,
    taskId: string,
  ) => {
    event.stopPropagation();

    event.dataTransfer.setData("text/plain", `task:${taskId}`);

    event.dataTransfer.effectAllowed = "move";
    setDraggedId(taskId);
  };

  // Task 드래그 종료
  const handleTaskDragEnd = () => {
    setDraggedId(null);
  };

  // Task 드롭
  const handleTaskDrop = (
    event: DragEvent<HTMLElement>,
    status: TaskStatus,
    targetId?: string,
  ) => {
    event.preventDefault();
    event.stopPropagation();

    const data = event.dataTransfer.getData("text/plain");

    if (!data.startsWith("task:")) {
      return;
    }

    const id = data.slice("task:".length) || draggedId;

    if (!id || id === targetId) {
      handleTaskDragEnd();
      return;
    }

    void updateTasks((prev) => {
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

    handleTaskDragEnd();
  };

  // Column 드래그 시작
  const handleColumnDragStart = (
    event: DragEvent<HTMLElement>,
    status: TaskStatus,
  ) => {
    event.stopPropagation();

    event.dataTransfer.setData("text/plain", `column:${status}`);

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

    const data = event.dataTransfer.getData("text/plain");

    if (!data.startsWith("column:")) {
      return;
    }

    const sourceStatus =
      (data.slice("column:".length) as TaskStatus) || draggedColumn;

    if (!sourceStatus || sourceStatus === targetStatus) {
      handleColumnDragEnd();
      return;
    }

    void updateColumns((prev) => {
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
                event.dataTransfer.dropEffect = "move";
              }}
              onDrop={(event) => {
                event.preventDefault();
                event.stopPropagation();

                if (busyRef.current) return;

                const data = event.dataTransfer.getData("text/plain");

                if (data.startsWith("column:")) {
                  handleColumnDrop(event, column.status);
                } else if (data.startsWith("task:")) {
                  handleTaskDrop(event, column.status);
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
                    onDragStart={handleTaskDragStart}
                    onDragEnd={handleTaskDragEnd}
                    onDrop={(event) => {
                      const data = event.dataTransfer.getData("text/plain");

                      if (data.startsWith("task:")) {
                        handleTaskDrop(event, column.status, task.id);
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
