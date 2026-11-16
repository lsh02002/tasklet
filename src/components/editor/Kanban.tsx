import { useEffect } from "react";
import BoardColumns from "./BoardColumns";
import useHistory from "../hooks/useHistory";
import useCrud from "../hooks/useCrud";
import useDragDrop from "../hooks/useDragDrop";
import { boardApi } from "../../api/board";

function Kanban() {
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

  const crud = useCrud({ historyRef, runCommand });

  const dragDrop = useDragDrop({
    updateTasks: crud.updateTasks,
    updateColumns: crud.updateColumns,
  });

  useEffect(() => {
    let cancelled = false;

    boardApi
      .getBoard()
      .then((next) => {
        if (cancelled) return;

        historyRef.current = next;
        setHistory(next);
      })
      .catch(console.error);

    return () => {
      cancelled = true;
    };
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
          <button
            className="btn btn-primary"
            onClick={crud.addList}
            disabled={busy}
          >
            + List
          </button>
        </div>
      </div>

      <div>
        {lists.map((list) => (
          <section key={list.id} className="mb-4 py-3">
            <div className="d-flex justify-content-between">
              <h3>{list.title}</h3>

              <button
                className="btn btn-outline-danger mb-3"
                onClick={() => crud.deleteList(list.id)}
                disabled={busy}
              >
                삭제
              </button>
            </div>

            <BoardColumns
              listId={list.id}
              columns={columns}
              tasks={tasks}
              busy={busy}
              addTask={crud.addTask}
              deleteTask={crud.deleteTask}
              {...dragDrop}
            />
          </section>
        ))}
      </div>
    </div>
  );
}

export default Kanban;
