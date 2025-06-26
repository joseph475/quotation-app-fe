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
