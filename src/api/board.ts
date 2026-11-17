import { invoke, type InvokeArgs } from "@tauri-apps/api/core";
import { toast } from "sonner";

import type {
  BoardState,
  HistoryState,
  TaskStatus,
  TaskType,
  TaskPriority,
} from "../type";

const invokeWithToast = async <T>(
  command: string,
  args?: InvokeArgs,
): Promise<T> => {
  try {
    return await invoke<T>(command, args);
  } catch (error) {
    const message =
      typeof error === "string"
        ? error
        : error instanceof Error
          ? error.message
          : "알 수 없는 오류가 발생했습니다.";

    toast.error(message);
    throw error;
  }
};

export const boardApi = {
  getBoard: () => invokeWithToast<HistoryState>("get_board"),

  updateBoard: (board: BoardState) =>
    invokeWithToast<HistoryState>("update_board", { board }),

  addList: (title: string) =>
    invokeWithToast<HistoryState>("add_list", { title }),

  deleteList: (listId: string) =>
    invokeWithToast<HistoryState>("delete_list", { listId }),

  addTask: (
    title: string,
    status: TaskStatus,
    taskType: TaskType,
    priority: TaskPriority,
    startedAt: string | null,
    endedAt: string | null,
    listId: string,
  ) =>
    invokeWithToast<HistoryState>("add_task", {
      title,
      status,
      taskType: taskType.toLowerCase(),
      priority: priority.toLowerCase(),
      startedAt,
      endedAt,
      listId,
    }),

  deleteTask: (taskId: string) =>
    invokeWithToast<HistoryState>("delete_task", { taskId }),

  undo: () => invokeWithToast<HistoryState>("undo"),

  redo: () => invokeWithToast<HistoryState>("redo"),
};
