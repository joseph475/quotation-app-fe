import { h, Fragment } from 'preact';
import { useState } from 'preact/hooks';
import Button from '../common/Button';
import Modal from '../common/Modal';
import api from '../../services/api';

/**
 * Smart cancellation button component that handles different cancellation scenarios
 * based on quotation status and user role
 */
const CancelButton = ({ quotation, user, onCancellationUpdate, className = '' }) => {
  const [showModal, setShowModal] = useState(false);
  const [cancellationReason, setCancellationReason] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [actionType, setActionType] = useState('');

  // Get the current user ID - handle different user object structures
  const getCurrentUserId = () => {
    return user?.id || user?._id || user?.data?.id || user?.data?._id;
  };

  // Get the quotation creator ID - handle different structures (Supabase uses created_by)
  const getQuotationCreatorId = () => {
    return quotation?.created_by || quotation?.createdBy?._id || quotation?.createdBy?.id || quotation?.createdBy;
  };

  // Debug logging
  console.log('CancelButton Debug:', {
    user,
    quotation,
    currentUserId: getCurrentUserId(),
    quotationCreatorId: getQuotationCreatorId(),
    quotationStatus: quotation?.status,
    userRole: user?.role || user?.data?.role
  });

  // Determine what cancellation actions are available
  const canCancelDirectly = () => {
    // Only the user who created the quotation can cancel their own draft/pending quotations
    const currentUserId = getCurrentUserId();
    const creatorId = getQuotationCreatorId();
    
    return currentUserId && creatorId && 
           currentUserId.toString() === creatorId.toString() && 
           ['draft', 'pending'].includes(quotation.status);
  };

  const canRequestCancellation = () => {
    // Only the user who created the quotation can request cancellation for approved/accepted quotations
    const currentUserId = getCurrentUserId();
    const creatorId = getQuotationCreatorId();
    
    return currentUserId && creatorId && 
           currentUserId.toString() === creatorId.toString() && 
           ['approved', 'accepted'].includes(quotation.status);
  };

  const canApproveCancellation = () => {
    // Admin can approve cancellation requests (but this should be a separate admin interface)
    return ['admin', 'superadmin'].includes(user.role) && 
           quotation.status === 'cancellation_requested';
  };

  const canDenyCancellation = () => {
    // Admin can deny cancellation requests (but this should be a separate admin interface)
    return ['admin', 'superadmin'].includes(user.role) && 
           quotation.status === 'cancellation_requested';
  };

  // Handle opening the cancellation modal
  const handleCancelClick = (type) => {
    setActionType(type);
    setShowModal(true);
    setCancellationReason('');
  };

  // Handle the actual cancellation action
  const handleConfirmCancellation = async () => {
    // Only require reason for non-approval actions
    if (actionType !== 'approve' && !cancellationReason.trim()) {
      alert('Please provide a reason for cancellation');
      return;
    }

    setIsLoading(true);
    try {
      let response;
      
      switch (actionType) {
        case 'direct':
          response = await api.quotations.cancel(quotation._id || quotation.id, cancellationReason);
          break;
        case 'request':
          response = await api.quotations.cancel(quotation._id || quotation.id, cancellationReason);
          break;
        case 'approve':
          response = await api.quotations.approveCancellation(quotation._id || quotation.id, cancellationReason);
          break;
        case 'deny':
          response = await api.quotations.denyCancellation(quotation._id || quotation.id, cancellationReason);
          break;
        default:
          throw new Error('Invalid action type');
      }

      if (response.success) {
        setShowModal(false);
        setCancellationReason('');
        
        // Notify parent component of the update
        if (onCancellationUpdate) {
          onCancellationUpdate(response.data);
        }
        
        // Show success message
        alert(response.message || 'Action completed successfully');
      } else {
        throw new Error(response.message || 'Action failed');
      }
    } catch (error) {
      console.error('Cancellation error:', error);
      alert(error.message || 'Failed to process cancellation');
    } finally {
      setIsLoading(false);
    }
  };

  // Get button text and variant based on action type
  const getButtonConfig = () => {
    if (canCancelDirectly()) {
      return {
        text: 'Cancel',
        variant: 'danger',
        action: 'direct'
      };
    }
    
    if (canRequestCancellation()) {
      return {
        text: 'Request Cancellation',
        variant: 'warning',
        action: 'request'
      };
    }
    
    if (canApproveCancellation()) {
      return {
        text: 'Approve Cancellation',
        variant: 'success',
        action: 'approve'
      };
    }
    
    return null;
  };

  // Get modal title and description based on action type
  const getModalConfig = () => {
    switch (actionType) {
      case 'direct':
        return {
          title: 'Cancel Order',
          description: 'This will immediately cancel the quotation. This action cannot be undone.',
          confirmText: 'Cancel Order',
          confirmVariant: 'danger'
        };
      case 'request':
        return {
          title: 'Request Cancellation',
          description: 'This will send a cancellation request to the administrator for approval.',
          confirmText: 'Submit Request',
          confirmVariant: 'warning'
        };
      case 'approve':
        return {
          title: 'Approve Cancellation',
          description: 'This will approve the user\'s cancellation request and cancel the quotation.',
          confirmText: 'Approve Cancellation',
          confirmVariant: 'success'
        };
      case 'deny':
        return {
          title: 'Deny Cancellation',
          description: 'This will deny the user\'s cancellation request and restore the quotation.',
          confirmText: 'Deny Request',
          confirmVariant: 'danger'
        };
      default:
        return {
          title: 'Confirm Action',
          description: 'Please confirm your action.',
          confirmText: 'Confirm',
          confirmVariant: 'primary'
        };
    }
  };

  const buttonConfig = getButtonConfig();
  const modalConfig = getModalConfig();

  // Don't render if no actions are available
  if (!buttonConfig && !canDenyCancellation()) {
    return null;
  }

  return (
    <>
      {/* Main action button */}
      {buttonConfig && (
        <Button
          variant={buttonConfig.variant}
          size="sm"
          onClick={() => handleCancelClick(buttonConfig.action)}
          className={className}
        >
          {buttonConfig.text}
        </Button>
      )}

      {/* Deny button for admin (separate from main button) */}
      {canDenyCancellation() && (
        <Button
          variant="secondary"
          size="sm"
          onClick={() => handleCancelClick('deny')}
          className={`${className} ml-2`}
        >
          Deny Request
        </Button>
      )}

      {/* Cancellation Modal */}
      {showModal && (
        <Modal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          title={modalConfig.title}
        >
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              {modalConfig.description}
            </p>

            {/* Quotation Info */}
            <div className="bg-gray-50 p-3 rounded-md">
              <p className="text-sm font-medium">Quotation: {quotation.quotation_number || quotation.quotationNumber}</p>
              <p className="text-sm text-gray-600">Status: {quotation.status}</p>
              <p className="text-sm text-gray-600">
                Total: {process.env.REACT_APP_CURRENCY_SYMBOL || '₱'}{quotation.total?.toFixed(2)}
              </p>
            </div>

            {/* Show existing cancellation reason if this is an approval/denial */}
            {(actionType === 'approve' || actionType === 'deny') && quotation.cancellationReason && (
              <div className="bg-yellow-50 p-3 rounded-md">
                <p className="text-sm font-medium text-yellow-800">User's Cancellation Reason:</p>
                <p className="text-sm text-yellow-700">{quotation.cancellationReason}</p>
              </div>
            )}

            {/* Reason input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {actionType === 'approve' ? 'Admin notes (optional):' :
                 actionType === 'deny' ? 'Reason for denial:' : 
                 'Reason for cancellation:'}
              </label>
              <textarea
                value={cancellationReason}
                onChange={(e) => setCancellationReason(e.target.value)}
                onInput={(e) => setCancellationReason(e.target.value)}
                placeholder={
                  actionType === 'approve' 
                    ? 'Optional notes about the approval...'
                    : actionType === 'deny' 
                    ? 'Explain why the cancellation request is being denied...'
                    : 'Please provide a reason for this cancellation...'
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                rows="3"
                required={actionType !== 'approve'}
              />
            </div>

            {/* Action buttons */}
            <div className="flex justify-end space-x-3 pt-4">
              <Button
                variant="secondary"
                onClick={() => setShowModal(false)}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button
                variant={modalConfig.confirmVariant}
                onClick={handleConfirmCancellation}
                disabled={isLoading || (actionType !== 'approve' && !cancellationReason.trim())}
              >
                {isLoading ? 'Processing...' : modalConfig.confirmText}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
};

export default CancelButton;
