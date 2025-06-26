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
