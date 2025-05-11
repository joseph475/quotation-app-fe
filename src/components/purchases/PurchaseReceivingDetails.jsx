import { h } from 'preact';
import Card from '../common/Card';

/**
 * PurchaseReceivingDetails component for viewing purchase receiving details
 * 
 * @param {Object} props - Component props
 * @param {Object} props.purchaseReceipt - The purchase receipt data to display
 */
const PurchaseReceivingDetails = ({ purchaseReceipt }) => {
  if (!purchaseReceipt) return null;

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return isNaN(date.getTime()) ? '' : date.toLocaleDateString();
  };

  // Get supplier name
  const getSupplierName = (supplier) => {
    if (!supplier) return 'Unknown Supplier';
    return typeof supplier === 'string' ? supplier : supplier.name || 'Unknown Supplier';
  };

  // Get purchase order number
  const getPONumber = (purchaseOrder) => {
    if (!purchaseOrder) return 'N/A';
    return typeof purchaseOrder === 'string' 
      ? purchaseOrder 
      : purchaseOrder.orderNumber || purchaseOrder._id || 'N/A';
  };

  return (
    <div className="space-y-6">
      {/* Header Information */}
      <div className="flex justify-between items-start">
        <div>
          <h3 className="text-lg font-medium text-gray-900">
            Receipt #{purchaseReceipt.receivingNumber || purchaseReceipt._id}
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            Received on {formatDate(purchaseReceipt.receivingDate)}
          </p>
        </div>
        <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
          Completed
        </span>
      </div>

      {/* Basic Information */}
      <Card title="Receipt Information">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <h4 className="text-sm font-medium text-gray-500">Purchase Order</h4>
            <p className="mt-1 text-sm text-gray-900">
              {getPONumber(purchaseReceipt.purchaseOrder)}
            </p>
          </div>
          
          <div>
            <h4 className="text-sm font-medium text-gray-500">Supplier</h4>
            <p className="mt-1 text-sm text-gray-900">
              {getSupplierName(purchaseReceipt.supplier)}
            </p>
          </div>
          
          <div>
            <h4 className="text-sm font-medium text-gray-500">Receiving Date</h4>
            <p className="mt-1 text-sm text-gray-900">
              {formatDate(purchaseReceipt.receivingDate)}
            </p>
          </div>
          
          <div>
            <h4 className="text-sm font-medium text-gray-500">Total Items Received</h4>
            <p className="mt-1 text-sm text-gray-900">
              {purchaseReceipt.items && Array.isArray(purchaseReceipt.items) 
                ? purchaseReceipt.items.reduce((total, item) => total + (item.quantityReceived || 0), 0)
                : 0}
            </p>
          </div>
        </div>
      </Card>

      {/* Items */}
      <Card title="Received Items">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity Ordered</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity Received</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Previously Received</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Notes</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {purchaseReceipt.items && purchaseReceipt.items.length > 0 ? (
                purchaseReceipt.items.map((item, index) => (
                  <tr key={item._id || index}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{item.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.quantityOrdered || 0}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.quantityReceived || 0}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.previouslyReceived || 0}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.notes || '-'}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" className="px-6 py-4 text-center text-sm text-gray-500">
                    No items in this receipt.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Notes */}
      {purchaseReceipt.notes && (
        <Card title="Additional Notes">
          <p className="text-sm text-gray-700 whitespace-pre-line">{purchaseReceipt.notes}</p>
        </Card>
      )}
    </div>
  );
};

export default PurchaseReceivingDetails;
