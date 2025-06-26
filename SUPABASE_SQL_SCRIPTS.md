# 🗄️ Supabase SQL Migration Scripts

Copy and paste these scripts **in order** into your Supabase SQL Editor.

## 📍 How to Run These Scripts

1. **Go to your Supabase Dashboard**: https://supabase.com/dashboard
2. **Select your project**: kijpjqvjlrfjgmmlsyzj
3. **Click "SQL Editor"** in the left sidebar
4. **Create a new query** for each script
5. **Copy and paste** each script below
6. **Run them in order** (1 → 2 → 3 → 4 → 5 → 6)

---

## 🔧 Script 1: Create Users Table

```sql
-- Create users table
CREATE TABLE IF NOT EXISTS users (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(20),
    department VARCHAR(50),
    address VARCHAR(200),
    is_active BOOLEAN DEFAULT true,
    role VARCHAR(20) DEFAULT 'customer' CHECK (role IN ('customer', 'admin', 'superadmin', 'delivery')),
    password_hash VARCHAR(255) NOT NULL,
    reset_password_token VARCHAR(255),
    reset_password_expire TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at 
    BEFORE UPDATE ON users 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Add email validation constraint
ALTER TABLE users ADD CONSTRAINT valid_email 
    CHECK (email ~* '^[A-Za-z0-9._%-]+@[A-Za-z0-9.-]+[.][A-Za-z]+$');
```

---

## 🔧 Script 2: Create Inventory Table

```sql
-- Create inventory table
CREATE TABLE IF NOT EXISTS inventory (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    itemcode INTEGER UNIQUE NOT NULL,
    barcode VARCHAR(255) UNIQUE,
    name VARCHAR(100) NOT NULL,
    unit VARCHAR(50) NOT NULL DEFAULT 'pcs',
    cost DECIMAL(10,2) NOT NULL DEFAULT 0,
    price DECIMAL(10,2) NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create sequence for itemcode auto-increment
CREATE SEQUENCE IF NOT EXISTS inventory_itemcode_seq;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_inventory_itemcode ON inventory(itemcode);
CREATE INDEX IF NOT EXISTS idx_inventory_barcode ON inventory(barcode);
CREATE INDEX IF NOT EXISTS idx_inventory_name ON inventory(name);

-- Create full-text search index
CREATE INDEX IF NOT EXISTS idx_inventory_search ON inventory USING gin(to_tsvector('english', name || ' ' || COALESCE(barcode, '')));

-- Create trigger for updated_at
CREATE TRIGGER update_inventory_updated_at 
    BEFORE UPDATE ON inventory 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Function to get next itemcode
CREATE OR REPLACE FUNCTION get_next_itemcode()
RETURNS INTEGER AS $$
DECLARE
    next_code INTEGER;
BEGIN
    SELECT COALESCE(MAX(itemcode), 0) + 1 INTO next_code FROM inventory;
    RETURN next_code;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-assign itemcode if not provided
CREATE OR REPLACE FUNCTION assign_itemcode()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.itemcode IS NULL THEN
        NEW.itemcode := get_next_itemcode();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER assign_inventory_itemcode 
    BEFORE INSERT ON inventory 
    FOR EACH ROW 
    EXECUTE FUNCTION assign_itemcode();
```

---

## 🔧 Script 3: Create Quotations Tables

```sql
-- Create quotations table
CREATE TABLE IF NOT EXISTS quotations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    quotation_number VARCHAR(50) UNIQUE NOT NULL,
    customer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    subtotal DECIMAL(12,2) DEFAULT 0,
    tax_amount DECIMAL(12,2) DEFAULT 0,
    discount_amount DECIMAL(12,2) DEFAULT 0,
    total DECIMAL(12,2) NOT NULL,
    status VARCHAR(30) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'completed', 'draft', 'active', 'accepted', 'delivered', 'cancelled', 'cancellation_requested')),
    cancellation_reason TEXT,
    cancellation_requested_at TIMESTAMP WITH TIME ZONE,
    cancellation_requested_by UUID REFERENCES users(id),
    cancelled_at TIMESTAMP WITH TIME ZONE,
    cancelled_by UUID REFERENCES users(id),
    assigned_delivery UUID REFERENCES users(id),
    valid_until TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    terms TEXT,
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create quotation items table
CREATE TABLE IF NOT EXISTS quotation_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    quotation_id UUID NOT NULL REFERENCES quotations(id) ON DELETE CASCADE,
    inventory_id UUID NOT NULL REFERENCES inventory(id),
    description TEXT NOT NULL,
    quantity DECIMAL(10,3) NOT NULL CHECK (quantity >= 0),
    unit_price DECIMAL(10,2) NOT NULL,
    discount DECIMAL(10,2) DEFAULT 0,
    tax DECIMAL(10,2) DEFAULT 0,
    total DECIMAL(12,2) NOT NULL,
    notes TEXT DEFAULT '',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for quotations
CREATE INDEX IF NOT EXISTS idx_quotations_customer_id ON quotations(customer_id);
CREATE INDEX IF NOT EXISTS idx_quotations_status ON quotations(status);
CREATE INDEX IF NOT EXISTS idx_quotations_created_by ON quotations(created_by);
CREATE INDEX IF NOT EXISTS idx_quotations_assigned_delivery ON quotations(assigned_delivery);
CREATE INDEX IF NOT EXISTS idx_quotations_created_at ON quotations(created_at);
CREATE INDEX IF NOT EXISTS idx_quotations_quotation_number ON quotations(quotation_number);

-- Create indexes for quotation items
CREATE INDEX IF NOT EXISTS idx_quotation_items_quotation_id ON quotation_items(quotation_id);
CREATE INDEX IF NOT EXISTS idx_quotation_items_inventory_id ON quotation_items(inventory_id);

-- Create trigger for updated_at
CREATE TRIGGER update_quotations_updated_at 
    BEFORE UPDATE ON quotations 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Function to generate quotation number
CREATE OR REPLACE FUNCTION generate_quotation_number()
RETURNS TEXT AS $$
DECLARE
    year_part TEXT;
    random_part TEXT;
    quotation_number TEXT;
    counter INTEGER := 0;
BEGIN
    year_part := EXTRACT(YEAR FROM NOW())::TEXT;
    
    LOOP
        random_part := LPAD((RANDOM() * 9999)::INTEGER::TEXT, 4, '0');
        quotation_number := 'Q-' || year_part || '-' || random_part;
        
        -- Check if this quotation number already exists
        IF NOT EXISTS (SELECT 1 FROM quotations WHERE quotation_number = quotation_number) THEN
            RETURN quotation_number;
        END IF;
        
        counter := counter + 1;
        -- Fallback to timestamp-based generation after 10 attempts
        IF counter >= 10 THEN
            quotation_number := 'Q-' || year_part || '-' || RIGHT(EXTRACT(EPOCH FROM NOW())::TEXT, 6);
            RETURN quotation_number;
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-assign quotation number
CREATE OR REPLACE FUNCTION assign_quotation_number()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.quotation_number IS NULL OR NEW.quotation_number = '' THEN
        NEW.quotation_number := generate_quotation_number();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER assign_quotation_number_trigger 
    BEFORE INSERT ON quotations 
    FOR EACH ROW 
    EXECUTE FUNCTION assign_quotation_number();
```

---

## 🔧 Script 4: Create Other Tables

```sql
-- Create customers table (if separate from users)
CREATE TABLE IF NOT EXISTS customers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(20),
    address TEXT,
    company VARCHAR(100),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create sales table
CREATE TABLE IF NOT EXISTS sales (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    sale_number VARCHAR(50) UNIQUE NOT NULL,
    customer_id UUID REFERENCES users(id),
    quotation_id UUID REFERENCES quotations(id),
    subtotal DECIMAL(12,2) DEFAULT 0,
    tax_amount DECIMAL(12,2) DEFAULT 0,
    discount_amount DECIMAL(12,2) DEFAULT 0,
    total DECIMAL(12,2) NOT NULL,
    payment_status VARCHAR(20) DEFAULT 'pending' CHECK (payment_status IN ('pending', 'partial', 'paid', 'overdue')),
    payment_method VARCHAR(50),
    notes TEXT,
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create sale items table
CREATE TABLE IF NOT EXISTS sale_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    sale_id UUID NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
    inventory_id UUID NOT NULL REFERENCES inventory(id),
    description TEXT NOT NULL,
    quantity DECIMAL(10,3) NOT NULL CHECK (quantity >= 0),
    unit_price DECIMAL(10,2) NOT NULL,
    discount DECIMAL(10,2) DEFAULT 0,
    tax DECIMAL(10,2) DEFAULT 0,
    total DECIMAL(12,2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create inventory history table
CREATE TABLE IF NOT EXISTS inventory_history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    inventory_id UUID NOT NULL REFERENCES inventory(id),
    transaction_type VARCHAR(20) NOT NULL CHECK (transaction_type IN ('purchase', 'sale', 'adjustment', 'transfer_in', 'transfer_out')),
    quantity_change DECIMAL(10,3) NOT NULL,
    quantity_before DECIMAL(10,3) NOT NULL,
    quantity_after DECIMAL(10,3) NOT NULL,
    reference_id UUID, -- Can reference sales, purchases, transfers, etc.
    reference_type VARCHAR(20), -- 'sale', 'purchase', 'transfer', 'adjustment'
    notes TEXT,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create cost history table
CREATE TABLE IF NOT EXISTS cost_history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    inventory_id UUID NOT NULL REFERENCES inventory(id),
    old_cost DECIMAL(10,2) NOT NULL,
    new_cost DECIMAL(10,2) NOT NULL,
    old_price DECIMAL(10,2) NOT NULL,
    new_price DECIMAL(10,2) NOT NULL,
    reason VARCHAR(100),
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create stock transfers table
CREATE TABLE IF NOT EXISTS stock_transfers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    transfer_number VARCHAR(50) UNIQUE NOT NULL,
    from_location VARCHAR(100),
    to_location VARCHAR(100),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'in_transit', 'completed', 'cancelled')),
    notes TEXT,
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create stock transfer items table
CREATE TABLE IF NOT EXISTS stock_transfer_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    transfer_id UUID NOT NULL REFERENCES stock_transfers(id) ON DELETE CASCADE,
    inventory_id UUID NOT NULL REFERENCES inventory(id),
    quantity DECIMAL(10,3) NOT NULL CHECK (quantity > 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create device fingerprints table
CREATE TABLE IF NOT EXISTS device_fingerprints (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    fingerprint_hash VARCHAR(255) NOT NULL,
    device_info JSONB,
    is_trusted BOOLEAN DEFAULT false,
    last_used_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create branches table
CREATE TABLE IF NOT EXISTS branches (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    code VARCHAR(20) UNIQUE NOT NULL,
    address TEXT,
    phone VARCHAR(20),
    email VARCHAR(255),
    manager_id UUID REFERENCES users(id),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create suppliers table
CREATE TABLE IF NOT EXISTS suppliers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    contact_person VARCHAR(100),
    email VARCHAR(255),
    phone VARCHAR(20),
    address TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create supplier prices table
CREATE TABLE IF NOT EXISTS supplier_prices (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
    inventory_id UUID NOT NULL REFERENCES inventory(id) ON DELETE CASCADE,
    price DECIMAL(10,2) NOT NULL,
    minimum_quantity DECIMAL(10,3) DEFAULT 1,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(supplier_id, inventory_id)
);

-- Create purchase orders table
CREATE TABLE IF NOT EXISTS purchase_orders (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    po_number VARCHAR(50) UNIQUE NOT NULL,
    supplier_id UUID NOT NULL REFERENCES suppliers(id),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'ordered', 'received', 'cancelled')),
    subtotal DECIMAL(12,2) DEFAULT 0,
    tax_amount DECIMAL(12,2) DEFAULT 0,
    total DECIMAL(12,2) NOT NULL,
    expected_delivery_date DATE,
    notes TEXT,
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create purchase order items table
CREATE TABLE IF NOT EXISTS purchase_order_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    po_id UUID NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
    inventory_id UUID NOT NULL REFERENCES inventory(id),
    quantity DECIMAL(10,3) NOT NULL CHECK (quantity > 0),
    unit_cost DECIMAL(10,2) NOT NULL,
    total DECIMAL(12,2) NOT NULL,
    received_quantity DECIMAL(10,3) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create purchase receiving table
CREATE TABLE IF NOT EXISTS purchase_receiving (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    po_id UUID NOT NULL REFERENCES purchase_orders(id),
    received_by UUID NOT NULL REFERENCES users(id),
    received_date DATE NOT NULL DEFAULT CURRENT_DATE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create purchase receiving items table
CREATE TABLE IF NOT EXISTS purchase_receiving_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    receiving_id UUID NOT NULL REFERENCES purchase_receiving(id) ON DELETE CASCADE,
    po_item_id UUID NOT NULL REFERENCES purchase_order_items(id),
    received_quantity DECIMAL(10,3) NOT NULL CHECK (received_quantity > 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_sales_customer_id ON sales(customer_id);
CREATE INDEX IF NOT EXISTS idx_sales_created_at ON sales(created_at);
CREATE INDEX IF NOT EXISTS idx_inventory_history_inventory_id ON inventory_history(inventory_id);
CREATE INDEX IF NOT EXISTS idx_inventory_history_created_at ON inventory_history(created_at);
CREATE INDEX IF NOT EXISTS idx_cost_history_inventory_id ON cost_history(inventory_id);
CREATE INDEX IF NOT EXISTS idx_device_fingerprints_user_id ON device_fingerprints(user_id);
CREATE INDEX IF NOT EXISTS idx_supplier_prices_supplier_id ON supplier_prices(supplier_id);
CREATE INDEX IF NOT EXISTS idx_supplier_prices_inventory_id ON supplier_prices(inventory_id);

-- Create updated_at triggers for tables that need them
CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON customers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_sales_updated_at BEFORE UPDATE ON sales FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_stock_transfers_updated_at BEFORE UPDATE ON stock_transfers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_branches_updated_at BEFORE UPDATE ON branches FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_suppliers_updated_at BEFORE UPDATE ON suppliers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_supplier_prices_updated_at BEFORE UPDATE ON supplier_prices FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_purchase_orders_updated_at BEFORE UPDATE ON purchase_orders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

---

## 🔧 Script 5: Enable Row Level Security

⚠️ **This is a large script - you may need to run it in smaller chunks**

```sql
-- Enable Row Level Security on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotation_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE cost_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_transfer_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE device_fingerprints ENABLE ROW LEVEL SECURITY;
ALTER TABLE branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_receiving ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_receiving_items ENABLE ROW LEVEL SECURITY;

-- Create helper function to get current user role
CREATE OR REPLACE FUNCTION get_user_role(user_uuid UUID)
RETURNS TEXT AS $$
DECLARE
    user_role TEXT;
BEGIN
    SELECT role INTO user_role FROM users WHERE id = user_uuid;
    RETURN COALESCE(user_role, 'customer');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create helper function to check if user is admin
CREATE OR REPLACE FUNCTION is_admin(user_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN get_user_role(user_uuid) IN ('admin', 'superadmin');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Users table policies
CREATE POLICY "Users can view their own profile" ON users
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Admins can view all users" ON users
    FOR SELECT USING (is_admin(auth.uid()));

CREATE POLICY "Users can update their own profile" ON users
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Admins can update all users" ON users
    FOR UPDATE USING (is_admin(auth.uid()));

CREATE POLICY "Admins can insert users" ON users
    FOR INSERT WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Admins can delete users" ON users
    FOR DELETE USING (is_admin(auth.uid()));

-- Inventory table policies
CREATE POLICY "All authenticated users can view inventory" ON inventory
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Admins can manage inventory" ON inventory
    FOR ALL USING (is_admin(auth.uid()));

-- Quotations table policies
CREATE POLICY "Users can view their own quotations" ON quotations
    FOR SELECT USING (
        auth.uid() = customer_id OR 
        auth.uid() = created_by OR 
        auth.uid() = assigned_delivery OR
        is_admin(auth.uid())
    );

CREATE POLICY "Users can create quotations" ON quotations
    FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update their own quotations" ON quotations
    FOR UPDATE USING (
        auth.uid() = created_by OR 
        auth.uid() = assigned_delivery OR
        is_admin(auth.uid())
    );

CREATE POLICY "Admins can delete quotations" ON quotations
    FOR DELETE USING (is_admin(auth.uid()));

-- Quotation items policies
CREATE POLICY "Users can view quotation items for accessible quotations" ON quotation_items
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM quotations q 
            WHERE q.id = quotation_items.quotation_id 
            AND (
                auth.uid() = q.customer_id OR 
                auth.uid() = q.created_by OR 
                auth.uid() = q.assigned_delivery OR
                is_admin(auth.uid())
            )
        )
    );

CREATE POLICY "Users can manage quotation items for their quotations" ON quotation_items
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM quotations q 
            WHERE q.id = quotation_items.quotation_id 
            AND (
                auth.uid() = q.created_by OR
                is_admin(auth.uid())
            )
        )
    );

-- Sales table policies
CREATE POLICY "Users can view their sales" ON sales
    FOR SELECT USING (
        auth.uid() = customer_id OR 
        auth.uid() = created_by OR
        is_admin(auth.uid())
    );

CREATE POLICY "Users can create sales" ON sales
    FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update their sales" ON sales
    FOR UPDATE USING (
        auth.uid() = created_by OR
        is_admin(auth.uid())
    );

CREATE POLICY "Admins can delete sales" ON sales
    FOR DELETE USING (is_admin(auth.uid()));

-- Sale items policies
CREATE POLICY "Users can view sale items for accessible sales" ON sale_items
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM sales s 
            WHERE s.id = sale_items.sale_id 
            AND (
                auth.uid() = s.customer_id OR 
                auth.uid() = s.created_by OR
                is_admin(auth.uid())
            )
        )
    );

CREATE POLICY "Users can manage sale items for their sales" ON sale_items
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM sales s 
            WHERE s.id = sale_items.sale_id 
            AND (
                auth.uid() = s.created_by OR
                is_admin(auth.uid())
            )
        )
    );

-- Device fingerprints policies
CREATE POLICY "Users can view their own device fingerprints" ON device_fingerprints
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own device fingerprints" ON device_fingerprints
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all device fingerprints" ON device_fingerprints
    FOR SELECT USING (is_admin(auth.uid()));

-- Inventory history policies
CREATE POLICY "All authenticated users can view inventory history" ON inventory_history
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Admins can manage inventory history" ON inventory_history
    FOR ALL USING (is_admin(auth.uid()));

-- Cost history policies
CREATE POLICY "All authenticated users can view cost history" ON cost_history
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Admins can manage cost history" ON cost_history
    FOR ALL USING (is_admin(auth.uid()));

-- Stock transfers policies
CREATE POLICY "All authenticated users can view stock transfers" ON stock_transfers
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Users can create stock transfers" ON stock_transfers
    FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update their stock transfers" ON stock_transfers
    FOR UPDATE USING (
        auth.uid() = created_by OR
        is_admin(auth.uid())
    );

CREATE POLICY "Admins can delete stock transfers" ON stock_transfers
    FOR DELETE USING (is_admin(auth.uid()));

-- Stock transfer items policies
CREATE POLICY "All authenticated users can view stock transfer items" ON stock_transfer_items
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Users can manage stock transfer items for their transfers" ON stock_transfer_items
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM stock_transfers st 
            WHERE st.id = stock_transfer_items.transfer_id 
            AND (
                auth.uid() = st.created_by OR
                is_admin(auth.uid())
            )
        )
    );

-- Customers policies
CREATE POLICY "All authenticated users can view customers" ON customers
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Admins can manage customers" ON customers
    FOR ALL USING (is_admin(auth.uid()));

-- Branches policies
CREATE POLICY "All authenticated users can view branches" ON branches
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Admins can manage branches" ON branches
    FOR ALL USING (is_admin(auth.uid()));

-- Suppliers policies
CREATE POLICY "All authenticated users can view suppliers" ON suppliers
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Admins can manage suppliers" ON suppliers
    FOR ALL USING (is_admin(auth.uid()));

-- Supplier prices policies
CREATE POLICY "All authenticated users can view supplier prices" ON supplier_prices
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Admins can manage supplier prices" ON supplier_prices
    FOR ALL USING (is_admin(auth.uid()));

-- Purchase orders policies
CREATE POLICY "All authenticated users can view purchase orders" ON purchase_orders
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Users can create purchase orders" ON purchase_orders
    FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update their purchase orders" ON purchase_orders
    FOR UPDATE USING (
        auth.uid() = created_by OR
        is_admin(auth.uid())
    );

CREATE POLICY "Admins can delete purchase orders" ON purchase_orders
    FOR DELETE USING (is_admin(auth.uid()));

-- Purchase order items policies
CREATE POLICY "All authenticated users can view purchase order items" ON purchase_order_items
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Users can manage purchase order items for their orders" ON purchase_order_items
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM purchase_orders po 
            WHERE po.id = purchase_order_items.po_id 
            AND (
                auth.uid() = po.created_by OR
                is_admin(auth.uid())
            )
        )
    );

-- Purchase receiving policies
CREATE POLICY "All authenticated users can view purchase receiving" ON purchase_receiving
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Users can create purchase receiving" ON purchase_receiving
    FOR INSERT WITH CHECK (auth.uid() = received_by);

CREATE POLICY "Admins can manage purchase receiving" ON purchase_receiving
    FOR ALL USING (is_admin(auth.uid()));

-- Purchase receiving items policies
CREATE POLICY "All authenticated users can view purchase receiving items" ON purchase_receiving_items
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Admins can manage purchase receiving items" ON purchase_receiving_items
    FOR ALL USING (is_admin(auth.uid()));
```

---

## 🔧 Script 6: Update User Roles

```sql
-- Update existing 'user' roles to 'customer' roles
-- This migration handles the role change from 'user' to 'customer'

-- Update all users with role 'user' to role 'customer'
UPDATE users 
SET role = 'customer' 
WHERE role = 'user';

-- Add a comment to track this migration
COMMENT ON TABLE users IS 'Updated user roles: changed "user" to "customer" role for better separation of concerns';

-- Verify the update (this will show in the query results)
SELECT 
    role,
    COUNT(*) as count
FROM users 
GROUP BY role
ORDER BY role;
```

---

## ✅ After Running All Scripts

1. **Verify tables were created**: Check the "Table Editor" in Supabase
2. **Check for any errors**: Review the SQL Editor output
3. **Update your Service Role Key**: See `GET_SUPABASE_KEYS.md`
4. **Run the data migration**: `./migrate-to-supabase.sh`

## 🔒 Important Notes

- **Run scripts in order** (1 → 6)
- **Script 5 is large** - you may need to run it in smaller chunks
- **Row Level Security** is enabled for data protection
- **Default role** is now 'customer' instead of 'user'
- **All existing 'user' roles** will be updated to 'customer'

---

**Need help?** Check the other migration guides:
- `SUPABASE_SETUP_GUIDE.md` - Getting your API keys
- `
