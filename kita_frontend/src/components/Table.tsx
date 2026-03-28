const Table = ({
  columns,
  renderRow,
  data,
  tableClassName = "w-full mt-4",
}: {
  columns: { header: string; accessor: string; className?: string }[];
  renderRow: (item: any) => React.ReactNode;
  data: any[];
  /** e.g. `table-fixed` to control column widths */
  tableClassName?: string;
}) => {
  return (
    <table className={tableClassName}>
      <thead>
        <tr className="text-left text-gray-500 text-sm">
          {columns.map((col) => (
            <th key={col.accessor} className={col.className}>{col.header}</th>
          ))}
        </tr>
      </thead>
      <tbody>{data.map((item) => renderRow(item))}</tbody>
    </table>
  );
};

export default Table;