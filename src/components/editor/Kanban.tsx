import { useEffect, useState } from "react";
import useHistory from "../hooks/useHistory";
import useCrud from "../hooks/useCrud";
import useDragDrop from "../hooks/useDragDrop";
import Card from "./Card";
import { boardApi } from "../../api/board";

function Kanban() {
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [draggedColumn, setDraggedColumn] = useState<string | null>(null);

  const {
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
  } = useHistory();

  const {
    addList,
    deleteList,
    addTask,
    deleteTask,
    updateTasks,
    updateColumns,
  } = useCrud({ historyRef, runCommand });

  const {
    handleTaskDragStart,
    handleTaskDragEnd,
    handleTaskDrop,
    handleColumnDragStart,
    handleColumnDragEnd,
    handleColumnDrop,
  } = useDragDrop({
    draggedId,
    setDraggedId,
    draggedColumn,
    setDraggedColumn,
    updateTasks,
    updateColumns,
  });

  useEffect(() => {
    boardApi
      .getBoard()
      .then((next) => {
        historyRef.current = next;
        setHistory(next);
      })
      .catch(console.error);
  }, [historyRef, setHistory]);

  return (
    <div className="container-fluid">
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
          <button className="btn btn-primary" onClick={addList} disabled={busy}>
            + List
          </button>
        </div>
      </div>

      <div className="container-fluid">
        {lists.map((list) => (
          <section key={list.id} className="mb-4 py-3">
            <div className="d-flex justify-content-between">
              <h3>{list.title}</h3>

              <button
                className="btn btn-outline-danger mb-3"
                onClick={() => deleteList(list.id)}
                disabled={busy}
              >
                삭제
              </button>
            </div>

            <div className="d-flex justify-content-between gap-3">
              {columns
                .filter((column) => column.listId === list.id)
                .map((column) => (
                  <div
                    className="card p-3"
                    style={{
                      width: "100%",
                      minHeight: 300,
                      backgroundColor: column.color,
                    }}
                    key={`${list.id}-${column.status}`}
                    draggable={!busy}
                    onDragStart={(event) =>
                      handleColumnDragStart(event, column.status, list.id)
                    }
                    onDragEnd={handleColumnDragEnd}
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={(event) => {
                      const data = event.dataTransfer.getData("text/plain");
                      if (data.startsWith("column:")) {
                        handleColumnDrop(event, column.status, list.id);
                      } else if (data.startsWith("task:")) {
                        handleTaskDrop(event, column.status, list.id);
                      }
                    }}
                  >
                    <div className="d-flex justify-content-between">
                      <h5>{column.title}</h5>

                      <button
                        className="btn btn-outline-primary mb-2"
                        onClick={() => addTask(column.status, list.id)}
                        disabled={busy}
                      >
                        + Task
                      </button>
                    </div>

                    {tasks
                      .filter(
                        (task) =>
                          task.listId === list.id &&
                          task.status === column.status,
                      )
                      .map((task) => (
                        <Card
                          key={task.id}
                          task={task}
                          onDragStart={handleTaskDragStart}
                          onDragEnd={handleTaskDragEnd}
                          onDrop={(event) =>
                            handleTaskDrop(
                              event,
                              column.status,
                              list.id,
                              task.id,
                            )
                          }
                          onDelete={() => deleteTask(task.id)}
                        />
                      ))}
                  </div>
                ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

export default Kanban;
