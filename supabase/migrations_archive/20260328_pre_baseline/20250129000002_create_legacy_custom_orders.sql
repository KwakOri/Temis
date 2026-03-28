-- Create legacy_custom_orders table for transitional period
CREATE TABLE legacy_custom_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL,
    nickname VARCHAR(100) NOT NULL,
    status VARCHAR(20) NOT NULL CHECK (status IN ('pending', 'accepted', 'in_progress', 'completed', 'cancelled')),
    deadline DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add comments to describe the table and columns
COMMENT ON TABLE legacy_custom_orders IS 'Temporary table for managing external orders during transitional period';
COMMENT ON COLUMN legacy_custom_orders.email IS 'Customer email address';
COMMENT ON COLUMN legacy_custom_orders.nickname IS 'Customer nickname or display name';
COMMENT ON COLUMN legacy_custom_orders.status IS 'Order processing status';
COMMENT ON COLUMN legacy_custom_orders.deadline IS 'Expected completion date';

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_legacy_custom_orders_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER legacy_custom_orders_updated_at_trigger
    BEFORE UPDATE ON legacy_custom_orders
    FOR EACH ROW
    EXECUTE FUNCTION update_legacy_custom_orders_updated_at();