import { h } from 'preact';
import Card from '../common/Card';

/**
 * PurchaseOrderDetails component for viewing purchase order details
 * 
 * @param {Object} props - Component props
 * @param {Object} props.purchaseOrder - The purchase order data to display
 */
const PurchaseOrderDetails = ({ purchaseOrder }) => {
  if (!purchaseOrder) return null;

  // Get status badge class
  const getStatusBadgeClass = (status) => {
    switch(status) {
      case 'Approved': return 'bg-green-100 text-green-800';
      case 'Rejected': return 'bg-red-100 text-red-800';
      case 'Completed': return 'bg-blue-100 text-blue-800';
      case 'Draft': return 'bg-gray-100 text-gray-800';
      default: return 'bg-yellow-100 text-yellow-800';
    }
  };

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return isNaN(date.getTime()) ? '' : date.toLocaleDateString();
  };

  return (
    <div className="space-y-6">
      {/* Header Information */}
      <div className="flex justify-between items-start">
        <div>
          <h3 className="text-lg font-medium text-gray-900">Purchase Order #{purchaseOrder.orderNumber}</h3>
          <p className="mt-1 text-sm text-gray-500">
            Created on {formatDate(purchaseOrder.orderDate || purchaseOrder.date)}
          </p>
        </div>
        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadgeClass(purchaseOrder.status)}`}>
          {purchaseOrder.status}
        </span>
      </div>

      {/* Basic Information */}
      <Card title="Purchase Order Information">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <h4 className="text-sm font-medium text-gray-500">Supplier</h4>
            <p className="mt-1 text-sm text-gray-900">
              {typeof purchaseOrder.supplier === 'object' ? purchaseOrder.supplier.name : purchaseOrder.supplier}
            </p>
          </div>
          
          <div>
            <h4 className="text-sm font-medium text-gray-500">Branch</h4>
            <p className="mt-1 text-sm text-gray-900">
              {purchaseOrder.branchName || (typeof purchaseOrder.branch === 'object' ? purchaseOrder.branch.name : '')}
            </p>
          </div>
          
          <div>
            <h4 className="text-sm font-medium text-gray-500">Order Date</h4>
            <p className="mt-1 text-sm text-gray-900">
              {formatDate(purchaseOrder.orderDate || purchaseOrder.date)}
            </p>
          </div>
          
          <div>
            <h4 className="text-sm font-medium text-gray-500">Expected Delivery Date</h4>
            <p className="mt-1 text-sm text-gray-900">
              {formatDate(purchaseOrder.expectedDeliveryDate)}
            </p>
          </div>
        </div>
      </Card>

      {/* Items */}
      <Card title="Order Items">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Unit Price</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {purchaseOrder.items && purchaseOrder.items.length > 0 ? (
                purchaseOrder.items.map((item, index) => (
                  <tr key={item.tempId || item._id || index}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{item.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.quantity}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      ${(parseFloat(item.price || item.unitPrice) || 0).toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      ${(parseFloat(item.total) || 0).toFixed(2)}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="4" className="px-6 py-4 text-center text-sm text-gray-500">
                    No items in this purchase order.
                  </td>
                </tr>
              )}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan="3" className="px-6 py-4 text-right text-sm font-medium text-gray-900">Total:</td>
                <td className="px-6 py-4 text-sm font-bold text-gray-900">
                  ${(parseFloat(purchaseOrder.totalAmount) || 0).toFixed(2)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </Card>

      {/* Notes */}
      {purchaseOrder.notes && (
        <Card title="Additional Notes">
          <p className="text-sm text-gray-700 whitespace-pre-line">{purchaseOrder.notes}</p>
        </Card>
      )}
    </div>
  );
};

export default PurchaseOrderDetails;
