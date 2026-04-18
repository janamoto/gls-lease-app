-- GLS Infotech Lease Management System
-- Supabase Schema with Row Level Security (RLS)
-- Run this in the Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- TABLES
-- ============================================================

-- Laptops inventory
CREATE TABLE IF NOT EXISTS laptops (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  brand TEXT NOT NULL,
  model TEXT NOT NULL,
  serial_number TEXT UNIQUE NOT NULL,
  processor TEXT,
  ram_gb INTEGER,
  storage_gb INTEGER,
  storage_type TEXT DEFAULT 'SSD' CHECK (storage_type IN ('SSD', 'HDD', 'NVMe SSD')),
  condition TEXT DEFAULT 'Good' CHECK (condition IN ('Excellent', 'Good', 'Fair', 'Poor')),
  status TEXT DEFAULT 'Available' CHECK (status IN ('Available', 'On Lease', 'Under Repair', 'Retired')),
  purchase_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Customers
CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  company_name TEXT,
  contact_person TEXT,
  phone TEXT NOT NULL,
  email TEXT,
  address TEXT,
  city TEXT,
  state TEXT NOT NULL DEFAULT 'Tamil Nadu',
  pincode TEXT,
  gstin TEXT,
  monthly_rate NUMERIC(10,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Delivery Challans
CREATE TABLE IF NOT EXISTS challans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  challan_number TEXT UNIQUE NOT NULL,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
  delivery_date DATE NOT NULL,
  expected_return_date DATE NOT NULL,
  status TEXT DEFAULT 'Active' CHECK (status IN ('Active', 'Returned', 'Partially Returned')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Challan Items (laptops in a challan)
CREATE TABLE IF NOT EXISTS challan_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  challan_id UUID NOT NULL REFERENCES challans(id) ON DELETE CASCADE,
  laptop_id UUID NOT NULL REFERENCES laptops(id) ON DELETE RESTRICT,
  UNIQUE(challan_id, laptop_id)
);

-- Return Receipts
CREATE TABLE IF NOT EXISTS return_receipts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  receipt_number TEXT UNIQUE NOT NULL,
  challan_id UUID NOT NULL REFERENCES challans(id) ON DELETE RESTRICT,
  return_date DATE NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Return Items
CREATE TABLE IF NOT EXISTS return_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  receipt_id UUID NOT NULL REFERENCES return_receipts(id) ON DELETE CASCADE,
  laptop_id UUID NOT NULL REFERENCES laptops(id) ON DELETE RESTRICT,
  condition TEXT DEFAULT 'Good' CHECK (condition IN ('Good', 'Damaged', 'Missing accessories')),
  notes TEXT
);

-- Invoices
CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_number TEXT UNIQUE NOT NULL,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
  invoice_date DATE NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  subtotal NUMERIC(12,2) NOT NULL DEFAULT 0,
  cgst_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  sgst_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  igst_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  status TEXT DEFAULT 'Draft' CHECK (status IN ('Draft', 'Sent', 'Paid', 'Overdue')),
  payment_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Invoice Items
CREATE TABLE IF NOT EXISTS invoice_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  laptop_id UUID NOT NULL REFERENCES laptops(id) ON DELETE RESTRICT,
  challan_id UUID REFERENCES challans(id) ON DELETE SET NULL,
  lease_start DATE NOT NULL,
  lease_end DATE NOT NULL,
  days_leased INTEGER NOT NULL,
  monthly_rate NUMERIC(10,2) NOT NULL,
  amount NUMERIC(12,2) NOT NULL
);

-- Settings (single row)
CREATE TABLE IF NOT EXISTS settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_name TEXT NOT NULL DEFAULT 'GLS Infotech',
  address TEXT,
  phone TEXT,
  email TEXT,
  gstin TEXT,
  bank_name TEXT,
  bank_account TEXT,
  bank_ifsc TEXT,
  bank_branch TEXT
);

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_laptops_status ON laptops(status);
CREATE INDEX IF NOT EXISTS idx_challans_customer_id ON challans(customer_id);
CREATE INDEX IF NOT EXISTS idx_challans_status ON challans(status);
CREATE INDEX IF NOT EXISTS idx_challan_items_challan_id ON challan_items(challan_id);
CREATE INDEX IF NOT EXISTS idx_challan_items_laptop_id ON challan_items(laptop_id);
CREATE INDEX IF NOT EXISTS idx_return_receipts_challan_id ON return_receipts(challan_id);
CREATE INDEX IF NOT EXISTS idx_return_items_receipt_id ON return_items(receipt_id);
CREATE INDEX IF NOT EXISTS idx_return_items_laptop_id ON return_items(laptop_id);
CREATE INDEX IF NOT EXISTS idx_invoices_customer_id ON invoices(customer_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice_id ON invoice_items(invoice_id);

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================

-- Enable RLS on all tables
ALTER TABLE laptops ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE challans ENABLE ROW LEVEL SECURITY;
ALTER TABLE challan_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE return_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE return_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- Policies: Only authenticated users can access data
-- (All authenticated users have full access - adjust as needed for multi-user)

CREATE POLICY "Authenticated users can do all on laptops"
  ON laptops FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can do all on customers"
  ON customers FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can do all on challans"
  ON challans FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can do all on challan_items"
  ON challan_items FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can do all on return_receipts"
  ON return_receipts FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can do all on return_items"
  ON return_items FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can do all on invoices"
  ON invoices FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can do all on invoice_items"
  ON invoice_items FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can do all on settings"
  ON settings FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- ============================================================
-- INITIAL DATA
-- ============================================================

-- Insert default settings (run only once)
INSERT INTO settings (business_name, address, phone, email, gstin)
VALUES (
  'GLS Infotech',
  'No. 1, Anna Salai, Chennai - 600 002, Tamil Nadu',
  '+91 44 1234 5678',
  'info@glsinfotech.com',
  '33AAAAA0000A1Z5'
)
ON CONFLICT DO NOTHING;

-- ============================================================
-- SCHEMA UPDATES (run these after initial setup)
-- ============================================================

-- 1. Per-laptop monthly rate in challan_items
ALTER TABLE challan_items ADD COLUMN IF NOT EXISTS monthly_rate NUMERIC(10,2);

-- 2. Role-based access
CREATE TABLE IF NOT EXISTS user_roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'staff' CHECK (role IN ('admin', 'staff')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own role" ON user_roles
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage roles" ON user_roles
  FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

-- 3. Maintenance / service history per laptop
CREATE TABLE IF NOT EXISTS laptop_maintenance (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  laptop_id UUID NOT NULL REFERENCES laptops(id) ON DELETE CASCADE,
  maintenance_date DATE NOT NULL,
  issue_description TEXT NOT NULL,
  resolution TEXT,
  cost NUMERIC(10,2),
  status TEXT DEFAULT 'Resolved' CHECK (status IN ('Pending', 'In Progress', 'Resolved')),
  technician TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE laptop_maintenance ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can do all on laptop_maintenance"
  ON laptop_maintenance FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE INDEX IF NOT EXISTS idx_laptop_maintenance_laptop_id ON laptop_maintenance(laptop_id);
