# Quotation Cancellation Logic Design

## Current Workflow Analysis

### Quotation Status Flow:
1. **draft** → User is still creating the quotation
2. **pending** → Submitted, waiting for admin approval
3. **approved** → Admin approved, may have delivery assigned
4. **accepted** → Customer accepted the approved quotation
5. **delivered** → Delivery personnel marked as delivered
6. **completed** → Converted to sale or marked as delivered
7. **rejected** → Admin rejected the quotation

## Proposed Cancellation Logic

### 1. **User Cancellation Rules**

#### **Can Cancel Immediately:**
- **draft** status: User can delete/cancel anytime
- **pending** status: User can cancel if not yet processed by admin

#### **Cannot Cancel:**
- **approved** status: Admin is processing, requires admin approval to cancel
- **accepted** status: Customer accepted, requires admin approval to cancel
- **delivered/completed** status: Order fulfilled, cannot cancel
- **rejected** status: Already rejected, no action needed

#### **Request Cancellation:**
- **approved/accepted** status: User can request cancellation, admin must approve

### 2. **Admin Cancellation Rules**

#### **Can Cancel Anytime:**
- **draft** status: Can delete user's draft
- **pending** status: Can reject instead of cancel
- **approved** status: Can cancel before delivery assignment
- **accepted** status: Can cancel with inventory restoration

#### **Cannot Cancel:**
- **delivered/completed** status: Order fulfilled, would require refund process
- **rejected** status: Already rejected

### 3. **Cancellation Types**

#### **Type 1: Direct Cancellation**
- User cancels own draft/pending quotations
- Admin cancels any quotation in early stages
- **Action**: Delete quotation or set status to 'cancelled'

#### **Type 2: Cancellation Request**
- User requests cancellation of approved/accepted quotations
- **Action**: Set status to 'cancellation_requested', notify admin

#### **Type 3: Admin-Approved Cancellation**
- Admin approves user's cancellation request
- **Action**: Set status to 'cancelled', restore inventory if needed

## Implementation Plan

### 1. **Update Quotation Model**

Add new statuses and fields:
```javascript
status: {
  type: String,
  enum: [
    'draft', 'pending', 'approved', 'rejected', 
    'accepted', 'delivered', 'completed',
    'cancelled', 'cancellation_requested'  // New statuses
  ],
  default: 'pending'
},
cancellationReason: {
  type: String,
  trim: true
},
cancellationRequestedAt: {
  type: Date
},
cancellationRequestedBy: {
  type: mongoose.Schema.ObjectId,
  ref: 'User'
},
cancelledAt: {
  type: Date
},
cancelledBy: {
  type: mongoose.Schema.ObjectId,
  ref: 'User'
}
```

### 2. **Add Controller Methods**

#### **User Cancellation**
```javascript
exports.cancelQuotation = async (req, res) => {
  const quotation = await Quotation.findById(req.params.id);
  
  // Check if user owns the quotation
  if (quotation.createdBy.toString() !== req.user.id) {
    return res.status(403).json({
      success: false,
      message: 'Not authorized to cancel this quotation'
    });
  }
  
  // Direct cancellation for early stages
  if (['draft', 'pending'].includes(quotation.status)) {
    quotation.status = 'cancelled';
    quotation.cancelledAt = new Date();
    quotation.cancelledBy = req.user.id;
    quotation.cancellationReason = req.body.reason;
    await quotation.save();
    
    // Notify admin
    webSocketService.notifyQuotationCancelled({...});
    
    return res.status(200).json({
      success: true,
      message: 'Quotation cancelled successfully'
    });
  }
  
  // Request cancellation for later stages
  if (['approved', 'accepted'].includes(quotation.status)) {
    quotation.status = 'cancellation_requested';
    quotation.cancellationRequestedAt = new Date();
    quotation.cancellationRequestedBy = req.user.id;
    quotation.cancellationReason = req.body.reason;
    await quotation.save();
    
    // Notify admin for approval
    webSocketService.notifyQuotationCancellationRequested({...});
    
    return res.status(200).json({
      success: true,
      message: 'Cancellation request submitted. Waiting for admin approval.'
    });
  }
  
  // Cannot cancel
  return res.status(400).json({
    success: false,
    message: `Cannot cancel quotation with status: ${quotation.status}`
  });
};
```

#### **Admin Approve Cancellation**
```javascript
exports.approveCancellation = async (req, res) => {
  // Only admin can approve cancellations
  if (req.user.role !== 'admin' && req.user.role !== 'superadmin') {
    return res.status(403).json({
      success: false,
      message: 'Only administrators can approve cancellations'
    });
  }
  
  const quotation = await Quotation.findById(req.params.id);
  
  if (quotation.status !== 'cancellation_requested') {
    return res.status(400).json({
      success: false,
      message: 'No cancellation request found for this quotation'
    });
  }
  
  // Restore inventory if quotation was accepted
  if (quotation.status === 'accepted') {
    await restoreInventoryQuantities(quotation.items);
  }
  
  quotation.status = 'cancelled';
  quotation.cancelledAt = new Date();
  quotation.cancelledBy = req.user.id;
  await quotation.save();
  
  // Notify user and delivery personnel
  webSocketService.notifyQuotationCancellationApproved({...});
  
  res.status(200).json({
    success: true,
    message: 'Cancellation approved successfully'
  });
};
```

### 3. **Frontend Implementation**

#### **Cancellation Button Logic**
```javascript
const canCancelDirectly = (quotation, user) => {
  // User can cancel their own draft/pending quotations
  if (quotation.createdBy === user.id && 
      ['draft', 'pending'].includes(quotation.status)) {
    return true;
  }
  
  // Admin can cancel early-stage quotations
  if (['admin', 'superadmin'].includes(user.role) && 
      ['draft', 'pending', 'approved'].includes(quotation.status)) {
    return true;
  }
  
  return false;
};

const canRequestCancellation = (quotation, user) => {
  // User can request cancellation for approved/accepted quotations
  return quotation.createdBy === user.id && 
         ['approved', 'accepted'].includes(quotation.status);
};

const canApproveCancellation = (quotation, user) => {
  // Admin can approve cancellation requests
  return ['admin', 'superadmin'].includes(user.role) && 
         quotation.status === 'cancellation_requested';
};
```

#### **UI Components**
```javascript
// Cancel Button Component
const CancelButton = ({ quotation, user, onCancel }) => {
  if (canCancelDirectly(quotation, user)) {
    return (
      <Button 
        variant="danger" 
        onClick={() => onCancel('direct')}
      >
        Cancel Order
      </Button>
    );
  }
  
  if (canRequestCancellation(quotation, user)) {
    return (
      <Button 
        variant="warning" 
        onClick={() => onCancel('request')}
      >
        Request Cancellation
      </Button>
    );
  }
  
  if (canApproveCancellation(quotation, user)) {
    return (
      <Button 
        variant="success" 
        onClick={() => onCancel('approve')}
      >
        Approve Cancellation
      </Button>
    );
  }
  
  return null;
};
```

### 4. **Inventory Management**

#### **Restore Inventory Function**
```javascript
const restoreInventoryQuantities = async (items) => {
  for (const item of items) {
    const inventoryItem = await Inventory.findById(item.inventory);
    if (inventoryItem) {
      inventoryItem.quantity += item.quantity;
      await inventoryItem.save();
    }
  }
};
```

### 5. **Notification System**

#### **WebSocket Events**
- `quotation_cancelled` - Direct cancellation
- `quotation_cancellation_requested` - User requests cancellation
- `quotation_cancellation_approved` - Admin approves cancellation
- `quotation_cancellation_denied` - Admin denies cancellation

### 6. **Business Rules Summary**

| Status | User Action | Admin Action | Inventory Impact |
|--------|-------------|--------------|------------------|
| draft | ✅ Cancel | ✅ Cancel | None |
| pending | ✅ Cancel | ✅ Reject/Cancel | None |
| approved | 🔄 Request | ✅ Cancel | None |
| accepted | 🔄 Request | ✅ Cancel | Restore quantities |
| delivered | ❌ Cannot | ❌ Cannot | Requires refund process |
| completed | ❌ Cannot | ❌ Cannot | Requires refund process |
| rejected | ❌ N/A | ❌ N/A | None |

**Legend:**
- ✅ = Direct action allowed
- 🔄 = Request required, needs approval
- ❌ = Action not allowed

### 7. **Error Prevention**

#### **Race Condition Prevention**
- Lock quotation during status changes
- Validate current status before any action
- Use atomic operations for inventory updates

#### **Validation Rules**
- User can only cancel own quotations
- Admin approval required for advanced-stage cancellations
- Inventory restoration only for accepted quotations
- Prevent cancellation of delivered/completed orders

### 8. **User Experience**

#### **Clear Status Messages**
- "Cancel Order" - Direct cancellation
- "Request Cancellation" - Needs admin approval
- "Cancellation Pending" - Waiting for admin
- "Cannot Cancel" - Order too advanced

#### **Reason Collection**
- Mandatory cancellation reason
- Predefined options + custom text
- Visible to admin for decision making

This comprehensive cancellation logic ensures:
1. **User Control**: Users can cancel early-stage orders
2. **Admin Oversight**: Admin approval for processed orders
3. **Inventory Integrity**: Proper quantity restoration
4. **Clear Communication**: Status updates and notifications
5. **Business Protection**: Prevents cancellation of fulfilled orders
