import { h } from 'preact';
import { useEffect, useRef } from 'preact/hooks';

/**
 * Modal component
 * 
 * @param {Object} props - Component props
 * @param {boolean} props.isOpen - Whether the modal is open
 * @param {Function} props.onClose - Close handler
 * @param {string} [props.title] - Modal title
 * @param {JSX.Element} [props.footer] - Modal footer content
 * @param {string} [props.size='md'] - Modal size (sm, md, lg, xl, full)
 * @param {boolean} [props.closeOnEsc=true] - Whether to close the modal on Escape key
 * @param {boolean} [props.closeOnOverlayClick=true] - Whether to close the modal on overlay click
 * @param {string} [props.className] - Additional CSS classes
 * @param {JSX.Element} props.children - Modal content
 */
const Modal = ({
  isOpen,
  onClose,
  title,
  footer,
  size = 'md',
  closeOnEsc = true,
  closeOnOverlayClick = true,
  className = '',
  children,
  ...rest
}) => {
  const modalRef = useRef(null);
  
  // Handle Escape key press
  useEffect(() => {
    const handleEscKey = (event) => {
      if (closeOnEsc && event.key === 'Escape') {
        onClose();
      }
    };
    
    if (isOpen) {
      document.addEventListener('keydown', handleEscKey);
      document.body.style.overflow = 'hidden'; // Prevent scrolling when modal is open
    }
    
    return () => {
      document.removeEventListener('keydown', handleEscKey);
      document.body.style.overflow = ''; // Restore scrolling when modal is closed
    };
  }, [isOpen, closeOnEsc, onClose]);
  
  // Handle overlay click
  const handleOverlayClick = (event) => {
    if (closeOnOverlayClick && event.target === event.currentTarget) {
      onClose();
    }
  };
  
  // Size classes
  const sizeClasses = {
    sm: 'sm:max-w-sm',
    md: 'sm:max-w-md',
    lg: 'sm:max-w-lg',
    xl: 'sm:max-w-xl',
    '2xl': 'sm:max-w-2xl',
    '3xl': 'sm:max-w-3xl',
    '4xl': 'sm:max-w-4xl',
    '5xl': 'sm:max-w-5xl',
    '6xl': 'sm:max-w-6xl',
    '7xl': 'sm:max-w-7xl',
    full: 'sm:max-w-full sm:m-4',
  };
  
  // Don't render anything if the modal is not open
  if (!isOpen) return null;
  
  return (
    <div
      class={`fixed inset-0 z-50 overflow-y-auto modal-container ${className}`}
      aria-labelledby="modal-title"
      role="dialog"
      aria-modal="true"
      onClick={handleOverlayClick}
    >
      {/* Overlay */}
      <div class="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <div class="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity modal-overlay" aria-hidden="true"></div>
        
        {/* Modal positioning */}
        <span class="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
        
        {/* Modal content */}
        <div
          ref={modalRef}
          class={`inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:w-full ${sizeClasses[size] || sizeClasses.md}`}
          {...rest}
        >
          {/* Modal header */}
          {title && (
            <div class="bg-gray-50 px-4 py-3 border-b border-gray-200 sm:px-6 modal-header">
              <div class="flex items-center justify-between">
                <h3 class="text-lg leading-6 font-medium text-gray-900" id="modal-title">
                  {title}
                </h3>
                <button
                  type="button"
                  class="bg-gray-50 rounded-md text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  onClick={onClose}
                >
                  <span class="sr-only">Close</span>
                  <svg class="h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          )}
          
          {/* Modal body */}
          <div class="px-4 py-5 sm:p-6">
            {children}
          </div>
          
          {/* Modal footer */}
          {footer && (
            <div class="bg-gray-50 px-4 py-3 border-t border-gray-200 sm:px-6 sm:flex sm:flex-row-reverse modal-footer">
              {footer}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Modal;
