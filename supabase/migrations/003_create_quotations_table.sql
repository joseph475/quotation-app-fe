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
