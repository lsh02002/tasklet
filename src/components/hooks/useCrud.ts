import { boardApi } from "../../api/board";
import { useCallback } from "react";
import type {
  HistoryState,
  TaskStatus,
  Task,
  BoardState,
  Column,
} from "../../type";

const useCrud = ({
  historyRef,
  runCommand,
}: {
  historyRef: React.MutableRefObject<HistoryState | null>;
  runCommand: (command: () => Promise<HistoryState>) => Promise<void>;
}) => {
  const addList = async () => {
    const title = window.prompt("List 이름");
    if (!title?.trim()) return;

    await runCommand(() => boardApi.addList(title.trim()));
  };

  const deleteList = async (listId: string) => {
    if (!window.confirm("List와 모든 Task를 삭제하시겠습니까?")) {
      return;
    }

    await runCommand(() => boardApi.deleteList(listId));
  };

  const addTask = async (status: TaskStatus, listId: string) => {
    const title = window.prompt("Task 이름");
    if (!title?.trim()) return;

    await runCommand(() => boardApi.addTask(title.trim(), status, listId));
  };

  const deleteTask = async (taskId: string) => {
    await runCommand(() => boardApi.deleteTask(taskId));
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
    [historyRef, runCommand],
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
    [historyRef, runCommand],
  );

  return {
    addList,
    deleteList,
    addTask,
    deleteTask,
    updateTasks,
    updateColumns,
  };
};

export default useCrud;
