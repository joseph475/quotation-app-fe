/**
 * Low Stock Helpers for Grocery Quotation App
 * 
 * This utility determines low stock thresholds based on the unit type of items.
 * Different units have different low stock thresholds appropriate for grocery items.
 */

/**
 * Get the low stock threshold based on the unit type
 * 
 * @param {string} unit - The unit of measurement for the item
 * @returns {number} - The low stock threshold for this unit type
 */
export const getLowStockThreshold = (unit) => {
  if (!unit) return 100; // Default fallback
  
  const unitLower = unit.toLowerCase().trim();
  
  // Weight-based units (typically bulk items for wholesale)
  if (unitLower.includes('kg') || unitLower.includes('kilogram') || 
      unitLower.includes('kilo') || unitLower === 'k') {
    return 50; // 50kg or less is low stock
  }
  
  if (unitLower.includes('g') || unitLower.includes('gram') || 
      unitLower.includes('grams')) {
    return 5000; // 5000g (5kg) or less is low stock
  }
  
  if (unitLower.includes('lb') || unitLower.includes('pound') || 
      unitLower.includes('lbs')) {
    return 100; // 100 lbs or less is low stock
  }
  
  if (unitLower.includes('oz') || unitLower.includes('ounce')) {
    return 200; // 200 oz or less is low stock
  }
  
  // Volume-based units (liquids, etc.) - wholesale quantities
  if (unitLower.includes('l') || unitLower.includes('liter') || 
      unitLower.includes('litre') || unitLower === 'lt') {
    return 30; // 30 liters or less is low stock
  }
  
  if (unitLower.includes('ml') || unitLower.includes('milliliter') || 
      unitLower.includes('millilitre')) {
    return 5000; // 5000ml (5L) or less is low stock
  }
  
  if (unitLower.includes('gal') || unitLower.includes('gallon')) {
    return 20; // 20 gallons or less is low stock
  }
  
  if (unitLower.includes('qt') || unitLower.includes('quart')) {
    return 40; // 40 quarts or less is low stock
  }
  
  if (unitLower.includes('pt') || unitLower.includes('pint')) {
    return 80; // 80 pints or less is low stock
  }
  
  if (unitLower.includes('fl oz') || unitLower.includes('fluid ounce') || 
      unitLower === 'floz') {
    return 320; // 320 fl oz or less is low stock
  }
  
  // Count-based units (individual items) - wholesale quantities
  if (unitLower.includes('pcs') || unitLower.includes('piece') || 
      unitLower.includes('pieces') || unitLower === 'pc' || 
      unitLower === 'each' || unitLower === 'ea') {
    return 200; // 200 pieces or less is low stock
  }
  
  if (unitLower.includes('pack') || unitLower.includes('packet') || 
      unitLower.includes('pkg') || unitLower === 'pk') {
    return 100; // 100 packs or less is low stock
  }
  
  if (unitLower.includes('box') || unitLower.includes('boxes') || 
      unitLower === 'bx') {
    return 50; // 50 boxes or less is low stock
  }
  
  if (unitLower.includes('case') || unitLower.includes('cases')) {
    return 30; // 30 cases or less is low stock
  }
  
  if (unitLower.includes('dozen') || unitLower === 'doz') {
    return 20; // 20 dozen or less is low stock
  }
  
  if (unitLower.includes('bag') || unitLower.includes('bags')) {
    return 80; // 80 bags or less is low stock
  }
  
  if (unitLower.includes('bottle') || unitLower.includes('bottles') || 
      unitLower === 'btl') {
    return 120; // 120 bottles or less is low stock
  }
  
  if (unitLower.includes('can') || unitLower.includes('cans')) {
    return 150; // 150 cans or less is low stock
  }
  
  if (unitLower.includes('jar') || unitLower.includes('jars')) {
    return 80; // 80 jars or less is low stock
  }
  
  if (unitLower.includes('tube') || unitLower.includes('tubes')) {
    return 100; // 100 tubes or less is low stock
  }
  
  if (unitLower.includes('roll') || unitLower.includes('rolls')) {
    return 60; // 60 rolls or less is low stock
  }
  
  // Bundle/bulk units - wholesale quantities
  if (unitLower.includes('bundle') || unitLower.includes('bundles')) {
    return 50; // 50 bundles or less is low stock
  }
  
  if (unitLower.includes('tray') || unitLower.includes('trays')) {
    return 40; // 40 trays or less is low stock
  }
  
  if (unitLower.includes('carton') || unitLower.includes('cartons')) {
    return 30; // 30 cartons or less is low stock
  }
  
  // Special grocery units - wholesale quantities
  if (unitLower.includes('loaf') || unitLower.includes('loaves')) {
    return 50; // 50 loaves or less is low stock
  }
  
  if (unitLower.includes('head') || unitLower.includes('heads')) {
    return 80; // 80 heads (lettuce, cabbage) or less is low stock
  }
  
  if (unitLower.includes('bunch') || unitLower.includes('bunches')) {
    return 60; // 60 bunches or less is low stock
  }
  
  // Default fallback for unrecognized units
  return 100;
};

/**
 * Determine if an item is low stock based on its quantity and unit
 * 
 * @param {number} quantity - Current quantity of the item
 * @param {string} unit - Unit of measurement
 * @returns {boolean} - True if the item is low stock
 */
export const isLowStock = (quantity, unit) => {
  const threshold = getLowStockThreshold(unit);
  return quantity < threshold;
};

/**
 * Get the status of an item based on quantity and unit
 * 
 * @param {number} quantity - Current quantity of the item
 * @param {string} unit - Unit of measurement
 * @returns {string} - 'Out of Stock', 'Low Stock', or 'In Stock'
 */
export const getItemStatus = (quantity, unit) => {
  if (quantity <= 0) {
    return 'Out of Stock';
  }
  
  if (isLowStock(quantity, unit)) {
    return 'Low Stock';
  }
  
  return 'In Stock';
};

/**
 * Get all supported units with their thresholds for reference
 * 
 * @returns {Array} - Array of unit objects with unit name and threshold
 */
export const getSupportedUnits = () => {
  return [
    // Weight units
    { unit: 'kg', threshold: 5, category: 'Weight' },
    { unit: 'g', threshold: 500, category: 'Weight' },
    { unit: 'lb', threshold: 10, category: 'Weight' },
    { unit: 'oz', threshold: 20, category: 'Weight' },
    
    // Volume units
    { unit: 'l', threshold: 3, category: 'Volume' },
    { unit: 'ml', threshold: 500, category: 'Volume' },
    { unit: 'gal', threshold: 2, category: 'Volume' },
    { unit: 'qt', threshold: 4, category: 'Volume' },
    { unit: 'pt', threshold: 8, category: 'Volume' },
    { unit: 'fl oz', threshold: 32, category: 'Volume' },
    
    // Count units
    { unit: 'pcs', threshold: 20, category: 'Count' },
    { unit: 'pack', threshold: 10, category: 'Count' },
    { unit: 'box', threshold: 5, category: 'Count' },
    { unit: 'case', threshold: 3, category: 'Count' },
    { unit: 'dozen', threshold: 2, category: 'Count' },
    { unit: 'bag', threshold: 8, category: 'Count' },
    { unit: 'bottle', threshold: 12, category: 'Count' },
    { unit: 'can', threshold: 15, category: 'Count' },
    { unit: 'jar', threshold: 8, category: 'Count' },
    { unit: 'tube', threshold: 10, category: 'Count' },
    { unit: 'roll', threshold: 6, category: 'Count' },
    { unit: 'bundle', threshold: 5, category: 'Count' },
    { unit: 'tray', threshold: 4, category: 'Count' },
    { unit: 'carton', threshold: 3, category: 'Count' },
    
    // Special grocery units
    { unit: 'loaf', threshold: 5, category: 'Special' },
    { unit: 'head', threshold: 8, category: 'Special' },
    { unit: 'bunch', threshold: 6, category: 'Special' },
  ];
};
