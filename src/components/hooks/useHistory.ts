import { useCallback, useRef, useState, useEffect } from "react";
import type { Column, HistoryState, List, Task } from "../../type";
import { boardApi } from "../../api/board";

const initialLists: List[] = [];
const initialColumns: Column[] = [];
const initialTasks: Task[] = [];

const useHistory = () => {
  const [history, setHistory] = useState<HistoryState>({
    past: [],
    present: {
      lists: initialLists,
      tasks: initialTasks,
      columns: initialColumns,
    },
    future: [],
  });

  const [busy, setBusy] = useState(false);

  const historyRef = useRef<HistoryState | null>(null);
  const busyRef = useRef(false);

  const lists = history.present.lists ?? [];
  const tasks = history?.present.tasks ?? [];
  const columns = history?.present.columns ?? [];

  const canUndo = !busy && (history?.past.length ?? 0) > 0;
  const canRedo = !busy && (history?.future.length ?? 0) > 0;

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

  return {
    history,
    setHistory,
    historyRef,
    busy,
    lists,
    tasks,
    columns,
    canUndo,
    canRedo,
    runCommand,
    undo,
    redo,
  };
};

export default useHistory;
