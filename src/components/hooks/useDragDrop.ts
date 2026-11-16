import { useState } from "react";
import type { DragEvent } from "react";
import type { Task, TaskStatus, Column } from "../../type";

const useDragDrop = ({
  updateTasks,
  updateColumns,
}: {
  updateTasks: (callback: (prev: Task[]) => Task[]) => Promise<void>;
  updateColumns: (callback: (prev: Column[]) => Column[]) => Promise<void>;
}) => {
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [draggedColumnId, setDraggedColumnId] = useState<string | null>(null);
  // Task 드래그 시작
  const handleTaskDragStart = (
    event: DragEvent<HTMLElement>,
    taskId: string,
  ) => {
    event.stopPropagation();

    event.dataTransfer.setData("text/plain", `task:${taskId}`);

    event.dataTransfer.effectAllowed = "move";
    setDraggedTaskId(taskId);
  };

  // Task 드래그 종료
  const handleTaskDragEnd = () => {
    setDraggedTaskId(null);
  };

  // Task 드롭
  const handleTaskDrop = (
    event: DragEvent<HTMLElement>,
    status: TaskStatus,
    listId: string,
    targetId?: string,
  ) => {
    event.preventDefault();
    event.stopPropagation();

    const data = event.dataTransfer.getData("text/plain");

    if (!data.startsWith("task:")) {
      return;
    }

    const id = data.slice("task:".length) || draggedTaskId;

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
        listId,
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
            task.id === prev[index].id &&
            task.status === prev[index].status &&
            task.listId === prev[index].listId,
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
    listId: string,
  ) => {
    event.stopPropagation();

    event.dataTransfer.setData("text/plain", `column:${listId}:${status}`);

    event.dataTransfer.effectAllowed = "move";
    setDraggedColumnId(`${listId}:${status}`);
  };

  // Column 드래그 종료
  const handleColumnDragEnd = () => {
    setDraggedColumnId(null);
  };

  // Column 드롭
  const handleColumnDrop = (
    event: DragEvent<HTMLElement>,
    targetStatus: TaskStatus,
    targetListId: string,
  ) => {
    event.preventDefault();
    event.stopPropagation();

    const data = event.dataTransfer.getData("text/plain");

    if (!data.startsWith("column:")) {
      return;
    }

    const source = data.slice("column:".length) || draggedColumnId;
    if (!source) return;
    const separator = source.lastIndexOf(":");
    if (separator < 0) return;
    const sourceListId = source.slice(0, separator);
    const sourceStatus = source.slice(separator + 1) as TaskStatus;
    if (sourceListId !== targetListId || sourceStatus === targetStatus) {
      handleColumnDragEnd();
      return;
    }

    void updateColumns((prev) => {
      const sourceIndex = prev.findIndex(
        (column) =>
          column.listId === sourceListId && column.status === sourceStatus,
      );

      const targetIndex = prev.findIndex(
        (column) =>
          column.listId === targetListId && column.status === targetStatus,
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

  return {
    draggedTaskId,
    setDraggedTaskId,
    draggedColumnId,
    setDraggedColumnId,
    handleTaskDragStart,
    handleTaskDragEnd,
    handleTaskDrop,
    handleColumnDragStart,
    handleColumnDragEnd,
    handleColumnDrop,
  };
};

export default useDragDrop;
