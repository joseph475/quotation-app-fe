import { h } from 'preact';

/**
 * Table component
 * 
 * @param {Object} props - Component props
 * @param {Array} props.columns - Array of column definitions
 * @param {Array} props.data - Array of data objects
 * @param {boolean} [props.isLoading=false] - Whether the table is in loading state
 * @param {boolean} [props.isEmpty=false] - Whether the table has no data
 * @param {JSX.Element} [props.emptyMessage] - Message to display when table is empty
 * @param {JSX.Element} [props.loadingMessage] - Message to display when table is loading
 * @param {string} [props.className] - Additional CSS classes
 */
const Table = ({
  columns,
  data,
  isLoading = false,
  isEmpty = false,
  emptyMessage = 'No data available',
  loadingMessage = 'Loading...',
  className = '',
  ...rest
}) => {
  // Base classes
  const tableClasses = `min-w-full divide-y divide-gray-200 ${className}`;
  
  return (
    <div class="overflow-x-auto">
      <table class={tableClasses} {...rest}>
        {/* Table Header */}
        <thead class="bg-gray-50">
          <tr>
            {columns.map((column, index) => (
              <th
                key={column.key || index}
                scope="col"
                class={`px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider ${column.headerClassName || ''}`}
                style={column.width ? { width: column.width } : {}}
              >
                {column.header || column.key}
              </th>
            ))}
          </tr>
        </thead>
        
        {/* Table Body */}
        <tbody class="bg-white divide-y divide-gray-200">
          {/* Loading State */}
          {isLoading && (
            <tr>
              <td colSpan={columns.length} class="px-6 py-4 text-center text-sm text-gray-500">
                {loadingMessage}
              </td>
            </tr>
          )}
          
          {/* Empty State */}
          {!isLoading && isEmpty && (
            <tr>
              <td colSpan={columns.length} class="px-6 py-4 text-center text-sm text-gray-500">
                {emptyMessage}
              </td>
            </tr>
          )}
          
          {/* Data Rows */}
          {!isLoading && !isEmpty && data.map((row, rowIndex) => (
            <tr key={row.id || rowIndex} class={rowIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
              {columns.map((column, colIndex) => (
                <td
                  key={`${rowIndex}-${column.key || colIndex}`}
                  class={`px-6 py-4 whitespace-nowrap text-sm ${column.cellClassName || ''}`}
                >
                  {column.render ? column.render(row) : row[column.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

/**
 * Pagination component for the Table
 * 
 * @param {Object} props - Component props
 * @param {number} props.currentPage - Current page number
 * @param {number} props.totalPages - Total number of pages
 * @param {number} props.totalItems - Total number of items
 * @param {number} props.pageSize - Number of items per page
 * @param {Function} props.onPageChange - Page change handler
 * @param {string} [props.className] - Additional CSS classes
 */
export const TablePagination = ({
  currentPage,
  totalPages,
  totalItems,
  pageSize,
  onPageChange,
  className = '',
}) => {
  // Calculate start and end item numbers
  const startItem = (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems);
  
  // Generate page numbers to display
  const getPageNumbers = () => {
    const pages = [];
    const maxPagesToShow = 5;
    
    if (totalPages <= maxPagesToShow) {
      // Show all pages if there are few
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Show a subset of pages with ellipsis
      if (currentPage <= 3) {
        // Near the start
        for (let i = 1; i <= 3; i++) {
          pages.push(i);
        }
        pages.push('...');
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 2) {
        // Near the end
        pages.push(1);
        pages.push('...');
        for (let i = totalPages - 2; i <= totalPages; i++) {
          pages.push(i);
        }
      } else {
        // In the middle
        pages.push(1);
        pages.push('...');
        pages.push(currentPage - 1);
        pages.push(currentPage);
        pages.push(currentPage + 1);
        pages.push('...');
        pages.push(totalPages);
      }
    }
    
    return pages;
  };
  
  return (
    <div class={`bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6 ${className}`}>
      {/* Mobile pagination */}
      <div class="flex-1 flex justify-between sm:hidden">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          class="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Previous
        </button>
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          class="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Next
        </button>
      </div>
      
      {/* Desktop pagination */}
      <div class="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
        <div>
          <p class="text-sm text-gray-700">
            Showing <span class="font-medium">{startItem}</span> to <span class="font-medium">{endItem}</span> of{' '}
            <span class="font-medium">{totalItems}</span> results
          </p>
        </div>
        <div>
          <nav class="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
            {/* Previous page button */}
            <button
              onClick={() => onPageChange(currentPage - 1)}
              disabled={currentPage === 1}
              class="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span class="sr-only">Previous</span>
              <svg class="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path fill-rule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clip-rule="evenodd" />
              </svg>
            </button>
            
            {/* Page numbers */}
            {getPageNumbers().map((page, index) => (
              page === '...' ? (
                <span
                  key={`ellipsis-${index}`}
                  class="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700"
                >
                  ...
                </span>
              ) : (
                <button
                  key={page}
                  onClick={() => onPageChange(page)}
                  class={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                    currentPage === page
                      ? 'z-10 bg-primary-50 border-primary-500 text-primary-600'
                      : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                  }`}
                >
                  {page}
                </button>
              )
            ))}
            
            {/* Next page button */}
            <button
              onClick={() => onPageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              class="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span class="sr-only">Next</span>
              <svg class="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path fill-rule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clip-rule="evenodd" />
              </svg>
            </button>
          </nav>
        </div>
      </div>
    </div>
  );
};

export default Table;
