"use client";

interface PaginationProps {
  currentPage: number;
  setCurrentPage: (page: number) => void;
  totalPages: number;
  hasNextPage: boolean;
  itemsPerPage: number;
  setItemsPerPage: (items: number) => void;
}

export default function Pagination({
  currentPage,
  setCurrentPage,
  totalPages,
  hasNextPage,
  itemsPerPage,
  setItemsPerPage,
}: PaginationProps) {
  const hasPrevPage = currentPage > 1;
  const itemsPerPageOptions = [5, 10, 20, 50, 100];

  // Generate page numbers to display
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisible = 5;
    const validTotal = !isNaN(totalPages) && totalPages > 0 ? totalPages : 1;

    if (validTotal <= maxVisible) {
      // Show all pages if total is small
      for (let i = 1; i <= validTotal; i++) {
        pages.push(i);
      }
    } else {
      // Always show first page
      pages.push(1);

      if (currentPage <= 3) {
        // Near the start
        for (let i = 2; i <= 4; i++) {
          pages.push(i);
        }
        pages.push("...");
        pages.push(validTotal);
      } else if (currentPage >= validTotal - 2) {
        // Near the end
        pages.push("...");
        for (let i = validTotal - 3; i <= validTotal; i++) {
          pages.push(i);
        }
      } else {
        // In the middle
        pages.push("...");
        pages.push(currentPage - 1);
        pages.push(currentPage);
        pages.push(currentPage + 1);
        pages.push("...");
        pages.push(validTotal);
      }
    }

    return pages;
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleItemsPerPageChange = (items: number) => {
    setItemsPerPage(items);
    setCurrentPage(1); // Reset to first page when changing items per page
  };

  // Validate totalPages
  const validTotalPages = !isNaN(totalPages) && totalPages > 0 ? totalPages : 1;

  if (validTotalPages <= 1) {
    return null; // Don't show pagination if only 1 page
  }

  const pageNumbers = getPageNumbers();

  return (
    <div className="flex items-center justify-between px-4 py-3 bg-white dark:bg-neutral-900 border-t border-gray-200 dark:border-neutral-700 sm:px-6">
      {/* Mobile view */}
      <div className="flex flex-1 flex-wrap justify-between sm:hidden">
        <button
          onClick={() => handlePageChange(currentPage - 1)}
          disabled={!hasPrevPage}
          className={`relative inline-flex items-center px-4 py-2 text-sm font-medium rounded-md h-fit ${
            hasPrevPage
              ? "bg-white dark:bg-neutral-800 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-neutral-700 border border-gray-300 dark:border-neutral-600"
              : "bg-gray-100 dark:bg-neutral-800 text-gray-400 dark:text-neutral-500 cursor-not-allowed border border-gray-200 dark:border-neutral-700"
          }`}
        >
          Previous
        </button>
        <div className="flex items-center sm:flex-row flex-col gap-2">
          <label
            htmlFor="items-per-page"
            className="text-sm text-gray-700 dark:text-gray-300"
          >
            Show:
          </label>
          <select
            id="items-per-page"
            value={itemsPerPage}
            onChange={(e) => handleItemsPerPageChange(Number(e.target.value))}
            className="px-2 py-1 text-sm border border-gray-300 dark:border-neutral-600 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white dark:bg-neutral-800 text-gray-700 dark:text-gray-200"
          >
            {itemsPerPageOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
          <span className="text-sm text-gray-700 dark:text-gray-300">
            per page
          </span>
        </div>
        <button
          onClick={() => handlePageChange(currentPage + 1)}
          disabled={!hasNextPage}
          className={`relative ml-3 inline-flex items-center px-4 py-2 text-sm font-medium rounded-md h-fit ${
            hasNextPage
              ? "bg-white dark:bg-neutral-800 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-neutral-700 border border-gray-300 dark:border-neutral-600"
              : "bg-gray-100 dark:bg-neutral-800 text-gray-400 dark:text-neutral-500 cursor-not-allowed border border-gray-200 dark:border-neutral-700"
          }`}
        >
          Next
        </button>
      </div>

      {/* Desktop view */}
      <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <p className="text-sm text-gray-700 dark:text-gray-300">
            Page <span className="font-medium">{currentPage}</span> of{" "}
            <span className="font-medium">{validTotalPages}</span>
          </p>

          {/* Items per page selector */}
          <div className="flex items-center gap-2">
            <label
              htmlFor="items-per-page"
              className="text-sm text-gray-700 dark:text-gray-300"
            >
              Show:
            </label>
            <select
              id="items-per-page"
              value={itemsPerPage}
              onChange={(e) => handleItemsPerPageChange(Number(e.target.value))}
              className="px-2 py-1 text-sm border border-gray-300 dark:border-neutral-600 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white dark:bg-neutral-800 text-gray-700 dark:text-gray-200"
            >
              {itemsPerPageOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
            <span className="text-sm text-gray-700 dark:text-gray-300">
              per page
            </span>
          </div>
        </div>
        <div>
          <nav
            className="isolate inline-flex -space-x-px rounded-md shadow-sm"
            aria-label="Pagination"
          >
            {/* Previous button */}
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={!hasPrevPage}
              className={`relative inline-flex items-center rounded-l-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 dark:ring-neutral-600 focus:z-20 focus:outline-offset-0 ${
                hasPrevPage
                  ? "hover:bg-gray-50 dark:hover:bg-neutral-800"
                  : "cursor-not-allowed opacity-50"
              }`}
            >
              <span className="sr-only">Previous</span>
              <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path
                  fillRule="evenodd"
                  d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z"
                  clipRule="evenodd"
                />
              </svg>
            </button>

            {/* Page numbers */}
            {pageNumbers.map((page, index) => {
              if (page === "...") {
                return (
                  <span
                    key={`ellipsis-${index}`}
                    className="relative inline-flex items-center px-4 py-2 text-sm font-semibold text-gray-700 dark:text-gray-300 ring-1 ring-inset ring-gray-300 dark:ring-neutral-600 focus:outline-offset-0"
                  >
                    ...
                  </span>
                );
              }

              const pageNum = page as number;
              const isActive = pageNum === currentPage;

              return (
                <button
                  key={pageNum}
                  onClick={() => handlePageChange(pageNum)}
                  className={`relative inline-flex items-center px-4 py-2 text-sm font-semibold ${
                    isActive
                      ? "z-10 bg-blue-600 text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
                      : "text-gray-900 dark:text-gray-200 ring-1 ring-inset ring-gray-300 dark:ring-neutral-600 hover:bg-gray-50 dark:hover:bg-neutral-800 focus:z-20 focus:outline-offset-0"
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}

            {/* Next button */}
            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={!hasNextPage}
              className={`relative inline-flex items-center rounded-r-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 dark:ring-neutral-600 focus:z-20 focus:outline-offset-0 ${
                hasNextPage
                  ? "hover:bg-gray-50 dark:hover:bg-neutral-800"
                  : "cursor-not-allowed opacity-50"
              }`}
            >
              <span className="sr-only">Next</span>
              <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path
                  fillRule="evenodd"
                  d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
          </nav>
        </div>
      </div>
    </div>
  );
}
