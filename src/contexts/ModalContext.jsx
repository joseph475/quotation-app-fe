import { h, createContext } from 'preact';
import { useState, useContext } from 'preact/hooks';
import Modal from '../components/common/Modal';

// Create contexts
const ErrorModalContext = createContext();
const ConfirmModalContext = createContext();

/**
 * Provider component for managing error modals
 */
export const ErrorModalProvider = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [errorTitle, setErrorTitle] = useState('Error');
  const [errorMessage, setErrorMessage] = useState('');
  const [errorDetails, setErrorDetails] = useState(null);
  const [showDetails, setShowDetails] = useState(false);

  // Show error modal
  const showError = (message, title = 'Error', details = null) => {
    setErrorMessage(message);
    setErrorTitle(title);
    setErrorDetails(details);
    setShowDetails(false);
    setIsOpen(true);
  };

  // Close error modal
  const closeError = () => {
    setIsOpen(false);
  };

  // Toggle error details
  const toggleDetails = () => {
    setShowDetails(!showDetails);
  };

  // Format error message from API response
  const formatApiError = (error) => {
    if (!error) return 'An unknown error occurred';
    
    if (typeof error === 'string') return error;
    
    if (error.message) return error.message;
    
    if (error.error) return error.error;
    
    return 'An unexpected error occurred';
  };

  return (
    <ErrorModalContext.Provider value={{ showError, formatApiError }}>
      {children}
      
      {/* Error Modal */}
      <Modal
        isOpen={isOpen}
        onClose={closeError}
        title={errorTitle}
        size="md"
        footer={
          <div class="flex justify-end space-x-3 w-full">
            {errorDetails && (
              <button
                type="button"
                onClick={toggleDetails}
                class="inline-flex justify-center py-2 px-4 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
              >
                {showDetails ? 'Hide Details' : 'Show Details'}
              </button>
            )}
            <button
              type="button"
              onClick={closeError}
              class="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            >
              Close
            </button>
          </div>
        }
      >
        <div class="space-y-4">
          <div class="flex items-start">
            <div class="flex-shrink-0">
              <svg class="h-6 w-6 text-red-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div class="ml-3">
              <p class="text-sm text-gray-700">{errorMessage}</p>
            </div>
          </div>
          
          {showDetails && errorDetails && (
            <div class="mt-4 bg-gray-50 p-4 rounded-md border border-gray-200 overflow-auto max-h-60">
              <pre class="text-xs text-gray-600 whitespace-pre-wrap">
                {typeof errorDetails === 'object' 
                  ? JSON.stringify(errorDetails, null, 2) 
                  : errorDetails}
              </pre>
            </div>
          )}
        </div>
      </Modal>
    </ErrorModalContext.Provider>
  );
};

/**
 * Provider component for managing confirmation modals
 */
export const ConfirmModalProvider = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [confirmText, setConfirmText] = useState('Confirm');
  const [cancelText, setCancelText] = useState('Cancel');
  const [confirmButtonClass, setConfirmButtonClass] = useState('bg-red-600 hover:bg-red-700');
  const [onConfirm, setOnConfirm] = useState(() => () => {});
  const [onCancel, setOnCancel] = useState(() => () => {});
  const [isProcessing, setIsProcessing] = useState(false);

  // Show confirmation modal
  const showConfirm = ({
    title = 'Confirm Action',
    message = 'Are you sure you want to proceed?',
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    confirmButtonClass = 'bg-red-600 hover:bg-red-700',
    onConfirm = () => {},
    onCancel = () => {},
  }) => {
    setTitle(title);
    setMessage(message);
    setConfirmText(confirmText);
    setCancelText(cancelText);
    setConfirmButtonClass(confirmButtonClass);
    setOnConfirm(() => async () => {
      setIsProcessing(true);
      try {
        await onConfirm();
      } finally {
        setIsProcessing(false);
        setIsOpen(false);
      }
    });
    setOnCancel(() => () => {
      onCancel();
      setIsOpen(false);
    });
    setIsOpen(true);
  };

  // Show delete confirmation modal
  const showDeleteConfirm = ({
    itemName = 'item',
    onConfirm = () => {},
    onCancel = () => {},
  }) => {
    showConfirm({
      title: `Delete ${itemName.charAt(0).toUpperCase() + itemName.slice(1)}`,
      message: `Are you sure you want to delete this ${itemName}? This action cannot be undone.`,
      confirmText: 'Delete',
      cancelText: 'Cancel',
      confirmButtonClass: 'bg-red-600 hover:bg-red-700',
      onConfirm,
      onCancel,
    });
  };

  // Show approve confirmation modal
  const showApproveConfirm = ({
    itemName = 'purchase order',
    onConfirm = () => {},
    onCancel = () => {},
  }) => {
    showConfirm({
      title: `Approve ${itemName.charAt(0).toUpperCase() + itemName.slice(1)}`,
      message: `Are you sure you want to approve this ${itemName}?`,
      confirmText: 'Approve',
      cancelText: 'Cancel',
      confirmButtonClass: 'bg-green-600 hover:bg-green-700',
      onConfirm,
      onCancel,
    });
  };

  return (
    <ConfirmModalContext.Provider value={{ showConfirm, showDeleteConfirm, showApproveConfirm }}>
      {children}
      
      {/* Confirmation Modal */}
      <Modal
        isOpen={isOpen}
        onClose={() => !isProcessing && setIsOpen(false)}
        title={title}
        size="sm"
        closeOnEsc={!isProcessing}
        closeOnOverlayClick={!isProcessing}
        footer={
          <div class="flex justify-end space-x-3 w-full">
            {cancelText && (
              <button
                type="button"
                onClick={onCancel}
                disabled={isProcessing}
                class={`inline-flex justify-center py-2 px-4 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 ${
                  isProcessing ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                {cancelText}
              </button>
            )}
            <button
              type="button"
              onClick={onConfirm}
              disabled={isProcessing}
              class={`inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white ${confirmButtonClass} focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 ${
                isProcessing ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              {isProcessing ? (
                <svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : null}
              {confirmText}
            </button>
          </div>
        }
      >
        <div class="mt-2">
          <p class="text-sm text-gray-500">{message}</p>
        </div>
      </Modal>
    </ConfirmModalContext.Provider>
  );
};

/**
 * Combined provider for all modal contexts
 */
export const ModalProvider = ({ children }) => {
  return (
    <ErrorModalProvider>
      <ConfirmModalProvider>
        {children}
      </ConfirmModalProvider>
    </ErrorModalProvider>
  );
};

// Custom hooks to use the contexts
export const useErrorModal = () => useContext(ErrorModalContext);
export const useConfirmModal = () => useContext(ConfirmModalContext);
