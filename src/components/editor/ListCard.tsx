import type { ComponentProps } from "react";
import ColumnCard from "./ColumnCard";

type ColumnsProps = ComponentProps<typeof ColumnCard>;

interface ListCardProps extends Omit<ColumnsProps, "listId"> {
  list: {
    id: string;
    title: string;
  };
  deleteList: (listId: string) => void | Promise<unknown>;
}

function ListCard({ list, deleteList, ...columnsProps }: ListCardProps) {
  return (
    <section className="mb-4 py-3">
      <div className="d-flex justify-content-between align-items-center">
        <h3>{list.title}</h3>

        <button
          className="btn btn-outline-danger mb-3"
          onClick={() => void deleteList(list.id)}
          disabled={columnsProps.busy}
        >
          삭제
        </button>
      </div>

      <ColumnCard listId={list.id} {...columnsProps} />
    </section>
  );
}

export default ListCard;
