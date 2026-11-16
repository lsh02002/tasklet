import { invoke } from "@tauri-apps/api/core";

import type {
  BoardState,
  HistoryState,
  TaskStatus,
} from "../type";

export const boardApi = {
  getBoard: () =>
    invoke<HistoryState>("get_board"),

  updateBoard: (board: BoardState) =>
    invoke<HistoryState>("update_board", { board }),

  addList: (title: string) =>
    invoke<HistoryState>("add_list", { title }),

  deleteList: (listId: string) =>
    invoke<HistoryState>("delete_list", { listId }),

  addTask: (title: string, status: TaskStatus,listId: string) =>
    invoke<HistoryState>("add_task", { title, status, listId }),

  deleteTask: (taskId: string) =>
    invoke<HistoryState>("delete_task", { taskId }),

  undo: () =>
    invoke<HistoryState>("undo"),

  redo: () =>
    invoke<HistoryState>("redo"),
};
