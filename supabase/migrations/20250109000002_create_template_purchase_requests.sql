-- Create template_purchase_requests table
-- This replaces the old purchase_requests for template purchases
-- Includes user_id reference and plan selection (lite/pro)

CREATE TABLE IF NOT EXISTS template_purchase_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES templates(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plan VARCHAR(20) NOT NULL CHECK (plan IN ('lite', 'pro')),
  customer_phone TEXT,
  message TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'completed')),
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);

-- Add comments for documentation
COMMENT ON TABLE template_purchase_requests IS 'Template purchase requests with user reference and plan selection';
COMMENT ON COLUMN template_purchase_requests.template_id IS 'Reference to the template being purchased';
COMMENT ON COLUMN template_purchase_requests.user_id IS 'Reference to the user making the purchase request';
COMMENT ON COLUMN template_purchase_requests.plan IS 'Selected plan type: lite or pro';
COMMENT ON COLUMN template_purchase_requests.customer_phone IS 'Customer phone number (optional)';
COMMENT ON COLUMN template_purchase_requests.message IS 'Customer message or special requests';
COMMENT ON COLUMN template_purchase_requests.status IS 'Request status: pending, approved, rejected, completed';

-- Create indexes for faster lookups
CREATE INDEX idx_template_purchase_requests_template_id ON template_purchase_requests(template_id);
CREATE INDEX idx_template_purchase_requests_user_id ON template_purchase_requests(user_id);
CREATE INDEX idx_template_purchase_requests_status ON template_purchase_requests(status);
CREATE INDEX idx_template_purchase_requests_created_at ON template_purchase_requests(created_at DESC);

-- Create trigger to update updated_at
CREATE OR REPLACE FUNCTION update_template_purchase_requests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc', NOW());
  RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_template_purchase_requests_updated_at ON template_purchase_requests;
CREATE TRIGGER update_template_purchase_requests_updated_at
  BEFORE UPDATE ON template_purchase_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_template_purchase_requests_updated_at();
