# Inventory Duplicate Key Error Fix

## Problem Description

The application was experiencing a MongoDB duplicate key error:

```
E11000 duplicate key error collection: quotation-app.inventories index: itemCode_1_branch_1 dup key: { itemCode: null, branch: null }
```

## Root Cause

The error occurred due to a schema mismatch between:

1. **Current Inventory Model**: Used `itemcode` (lowercase) and had no `branch` field
2. **Expected Schema**: Application code expected `itemCode` (camelCase) and `branch` fields
3. **Database State**: Had an old compound unique index `itemCode_1_branch_1` that didn't match the current schema

This mismatch caused the system to try inserting documents with null values for `itemCode` and `branch`, violating the unique constraint when multiple such documents existed.

## Solution Implemented

### 1. Updated Inventory Model (`../quotation-app-be/models/Inventory.js`)

**Changes Made:**
- Changed `itemcode` → `itemCode` (camelCase)
- Added `branch` field as required ObjectId reference to Branch model
- Changed `cost` → `costPrice` and `price` → `sellingPrice`
- Added missing fields: `description`, `category`, `quantity`, `reorderLevel`
- Removed auto-increment logic for itemcode (now uses string itemCode)
- Updated indexes:
  - Added compound unique index: `{ itemCode: 1, branch: 1 }`
  - Updated barcode index to: `{ barcode: 1, branch: 1 }` (unique within branch)

**New Schema Structure:**
```javascript
{
  itemCode: String (required),
  barcode: String (required),
  name: String (required),
  description: String,
  category: String,
  unit: String (required),
  costPrice: Number (required),
  sellingPrice: Number (required),
  quantity: Number (default: 0),
  reorderLevel: Number (default: 0),
  branch: ObjectId (required, ref: 'Branch'),
  createdAt: Date,
  updatedAt: Date
}
```

### 2. Updated Inventory Controller (`../quotation-app-be/controllers/inventory.js`)

**Changes Made:**
- Updated search filter to use `itemCode` instead of `itemcode`
- Removed old itemcode auto-generation logic
- Simplified create function to use new schema

### 3. Created Database Cleanup Script (`../quotation-app-be/fix-inventory-indexes.js`)

**Script Functions:**
- Lists all current indexes
- Drops problematic old indexes:
  - Old `itemCode_1_branch_1` index
  - Old `itemcode` indexes
  - Old single-field `barcode` unique index
- Removes documents with null `itemCode` or `branch` values
- Identifies documents with old schema fields
- Shows updated index state

## How to Apply the Fix

### Step 1: Run the Database Cleanup Script

```bash
cd ../quotation-app-be
node fix-inventory-indexes.js
```

This will:
- Remove problematic indexes
- Clean up null value documents
- Show any remaining old schema documents

### Step 2: Handle Existing Data (Choose One Option)

**Option A: Clear and Reseed (Recommended for Development)**
```bash
# Clear all data and reseed with new schema
node seeder.js -d  # Delete all data
node seeder.js -i  # Import fresh data with new schema
```

**Option B: Migrate Existing Data (For Production)**
If you have important existing inventory data, you'll need to create a migration script to:
- Convert `itemcode` → `itemCode`
- Convert `cost` → `costPrice`, `price` → `sellingPrice`
- Add required `branch` field to existing documents
- Add missing fields with default values

### Step 3: Restart the Server

After cleanup, restart your backend server. The new indexes will be created automatically based on the updated schema.

## Verification

After applying the fix:

1. **Check Indexes**: The inventory collection should have these indexes:
   - `{ itemCode: 1, branch: 1 }` (unique)
   - `{ barcode: 1, branch: 1 }` (unique)
   - `{ name: "text", barcode: "text" }` (text search)

2. **Test Operations**:
   - Create new inventory items
   - Search inventory
   - Verify no duplicate key errors

3. **Check Related Features**:
   - Stock transfers
   - Purchase orders
   - Sales
   - Quotations

## Prevention

To prevent similar issues in the future:

1. **Schema Versioning**: Consider implementing schema versioning for major changes
2. **Migration Scripts**: Create proper migration scripts for schema changes
3. **Index Management**: Document index changes and provide cleanup scripts
4. **Testing**: Test schema changes in development before production deployment

## Files Modified

- `../quotation-app-be/models/Inventory.js` - Updated schema
- `../quotation-app-be/controllers/inventory.js` - Updated controller logic
- `../quotation-app-be/fix-inventory-indexes.js` - Database cleanup script (new)
- `INVENTORY_DUPLICATE_KEY_FIX.md` - This documentation (new)

## Related Files That May Need Updates

The following files reference inventory fields and may need updates if they use the old field names:

- Stock transfer controllers and models
- Purchase order controllers
- Sales controllers
- Quotation controllers
- Frontend inventory forms and components

Check these files for any references to:
- `itemcode` (should be `itemCode`)
- `cost` (should be `costPrice`)
- `price` (should be `sellingPrice`)
