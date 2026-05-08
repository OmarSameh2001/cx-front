"use client";
import { TableColumn } from "./parts/column";
import { usePathname, useRouter } from "next/navigation";
import { TableProps } from "../../dto/table/table";
import CustomPagination from "./parts/pagination";
// import LoadingPage from "../../_utils/promise_handler/loading/loading";
import { TableActionIcon } from "./parts/action";
// import getPathName from "../../_utils/nav_path/pathname";

function ColumnHeader({ columns }: { columns: any[] }) {
  return (columns ?? []).map((column: any) => (
    <th className="p-2 whitespace-nowrap" key={column.key}>
      <span className="font-semibold text-left">{column.name}</span>
    </th>
  ));
}

function Table({
  name,
  columns,
  data,
  actions,
  loading,
  query,
  addNew,
  buttonName,
  pagination,
  base,
}: TableProps) {
  const router = useRouter();
//   const customPath = getPathName(base);
//   console.log(customPath);
  return (
    <div className="col-span-full xl:col-span-6 bg-white dark:bg-gray-800 shadow-xs rounded-xl border border-gray-400 dark:border-gray-200 overflow-hidden">
      <header className="px-4 xs:px-7 py-5 border-b border-gray-100 dark:border-gray-700/60 flex items-center justify-between">
        <h2 className="font-semibold text-xl text-gray-800 dark:text-gray-100">
          {name || "Table"}
        </h2>
        {addNew && (
          <button
            className="bg-blue-700 hover:bg-blue-800 text-white px-4 py-2 rounded cursor-pointer"
            onClick={addNew}
          >
            {buttonName || `Add New ${name || ""}`}
          </button>
        )}
      </header>
      <div className="p-3">
        <div className="overflow-x-auto">
          {/* Table */}
          {!loading && data?.length > 0 ? (
            <table className="table-auto w-full">
              {/* Table header */}
              <thead className="text-xs font-semibold uppercase text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-gray-700/50">
                <tr>
                  <ColumnHeader columns={columns} />
                  {actions?.length && actions?.length > 0 ? (
                    <th className="p-2 whitespace-nowrap">
                      <span className="font-semibold text-left">Actions</span>
                    </th>
                  ) : null}
                </tr>
              </thead>
              {/* Table body */}
              <tbody>
                {data.map((row, rowIndex) => (
                  <tr
                    key={row.id ?? rowIndex}
                    className="hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    {columns.map((column) => (
                      <td
                        key={column.key}
                        className="p-2 whitespace-nowrap cursor-pointer"
                        // onClick={() => router.push(`/${customPath}/${row.id}`)}
                      >
                        {column.key !== "id" ? (
                          <TableColumn
                            type={column.type}
                            data={row[column.key]}
                          />
                        ) : (
                          <TableColumn
                            type="text"
                            data={
                              pagination?.currentPage *
                                pagination?.itemsPerPage -
                                pagination?.itemsPerPage +
                                rowIndex +
                                1 || rowIndex + 1
                            }
                          />
                        )}
                      </td>
                    ))}
                    {actions && actions.length > 0 && (
                      <td className="p-2 whitespace-nowrap flex gap-2 items-center justify-center">
                        {actions?.map((action, index) => (
                          <TableActionIcon
                            action={action}
                            key={action.name + index}
                            row={row}
                            query={query}
                            tabelName={name}
                          />
                        ))}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          ) : loading ? (
            <table className="table-auto w-full">
              {/* Table header */}
              <thead className="text-xs font-semibold uppercase text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-gray-700/50">
                <tr>
                  <ColumnHeader columns={columns} />
                </tr>
              </thead>
              {/* Table body */}
              <tbody>
                <tr className="hover:bg-gray-100 dark:hover:bg-gray-700">
                  <td
                    className="py-5 whitespace-nowrap text-center"
                    colSpan={columns.length}
                  >
                    {/* <LoadingPage height="h-16" width="w-16" /> */}
                    loading
                  </td>
                </tr>
              </tbody>
            </table>
          ) : (
            <table className="table-auto w-full">
              {/* Table header */}
              <thead className="text-xs font-semibold uppercase text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-gray-700/50">
                <tr>
                  <ColumnHeader columns={columns} />
                </tr>
              </thead>
              {/* Table body */}
              <tbody>
                <tr className="hover:bg-gray-100 dark:hover:bg-gray-700">
                  <td
                    className="py-5 text-center max-w-[50vw]"
                    colSpan={columns.length}
                  >
                    No data found try to change your filters
                  </td>
                </tr>
              </tbody>
            </table>
          )}
        </div>
      </div>
      <CustomPagination
        currentPage={pagination?.currentPage}
        totalPages={pagination?.totalPages}
        hasNextPage={pagination?.hasNextPage}
        itemsPerPage={pagination?.itemsPerPage}
        setItemsPerPage={pagination?.setItemsPerPage}
        setCurrentPage={pagination?.setCurrentPage}
      />
    </div>
  );
}

export default Table;