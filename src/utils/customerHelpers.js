/**
 * Helper function to get customer display name consistently across the application
 * @param {string|Object} customer - Customer data (can be string or object)
 * @returns {string} - Formatted customer display name
 */
export const getCustomerDisplayName = (customer) => {
  if (typeof customer === 'string') {
    return customer;
  }
  
  if (!customer) {
    return 'Unknown Customer';
  }
  
  // Check if name exists and is not empty/whitespace
  if (customer.name && customer.name.trim() !== '') {
    return customer.name.trim();
  }
  
  // Fallback to contactPerson if name is empty
  if (customer.contactPerson && customer.contactPerson.trim() !== '') {
    return customer.contactPerson.trim();
  }
  
  return 'Unknown Customer';
};
