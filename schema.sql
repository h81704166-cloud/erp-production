-- ============================================================================
-- OFFLINE-FIRST MULTI-TENANT LOCAL ERP - PRODUCTION POSTGRESQL DDL SCHEMAS
-- Hardware Target: Intel i3 5th Gen, 4GB RAM, 250GB SSD (Ubuntu Server)
-- Security: 5-Stage Protection, Row Level Security (RLS), Brute-Force Lockout
-- ============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. ENUMS & DOMAINS
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
        CREATE TYPE user_role AS ENUM ('super_admin', 'owner', 'manager', 'accountant', 'cashier', 'stock_keeper');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'party_type') THEN
        CREATE TYPE party_type AS ENUM ('customer', 'vendor');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'gst_slab') THEN
        CREATE TYPE gst_slab AS ENUM ('0.00', '5.00', '12.00', '18.00', '28.00');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_mode') THEN
        CREATE TYPE payment_mode AS ENUM ('cash', 'upi_paytm', 'upi_phonepe', 'card', 'bank_transfer', 'khata_credit');
    END IF;
END $$;

-- 3. COMPANIES TABLE (Multi-Tenant Isolation Root)
CREATE TABLE IF NOT EXISTS companies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    legal_name VARCHAR(255) NOT NULL,
    gstin VARCHAR(15) UNIQUE NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    address TEXT NOT NULL,
    city VARCHAR(100) NOT NULL,
    state VARCHAR(100) NOT NULL,
    pincode VARCHAR(10) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. USERS TABLE (With Brute-Force Lockout Tracking)
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role user_role NOT NULL DEFAULT 'cashier',
    phone VARCHAR(20),
    is_active BOOLEAN DEFAULT TRUE,
    failed_login_attempts INT DEFAULT 0,
    locked_until TIMESTAMP WITH TIME ZONE NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. PRODUCTS TABLE (With GST Slabs & Inventory Alerts)
CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    sku VARCHAR(100) NOT NULL,
    barcode VARCHAR(100),
    hsn_code VARCHAR(20) NOT NULL,
    category VARCHAR(100) NOT NULL,
    unit VARCHAR(20) DEFAULT 'Pcs',
    purchase_price NUMERIC(12,2) NOT NULL CHECK (purchase_price >= 0),
    selling_price NUMERIC(12,2) NOT NULL CHECK (selling_price >= 0),
    gst_rate NUMERIC(5,2) NOT NULL DEFAULT 18.00,
    stock_qty NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    min_stock_alert NUMERIC(12,2) NOT NULL DEFAULT 5.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_company_sku UNIQUE (company_id, sku)
);

-- 6. CUSTOMERS_VENDORS TABLE (Parties Directory)
CREATE TABLE IF NOT EXISTS customers_vendors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    type party_type NOT NULL,
    name VARCHAR(255) NOT NULL,
    company_name VARCHAR(255),
    phone VARCHAR(20) NOT NULL,
    email VARCHAR(255),
    gstin VARCHAR(15),
    address TEXT,
    city VARCHAR(100),
    credit_limit NUMERIC(12,2) DEFAULT 0.00,
    current_balance NUMERIC(12,2) DEFAULT 0.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 7. BANK ACCOUNTS TABLE
CREATE TABLE IF NOT EXISTS bank_accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    account_name VARCHAR(255) NOT NULL,
    bank_name VARCHAR(255) NOT NULL,
    account_number VARCHAR(100) NOT NULL,
    ifsc_code VARCHAR(20) NOT NULL,
    branch_name VARCHAR(100),
    current_balance NUMERIC(12,2) DEFAULT 0.00,
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 8. CASH ACCOUNTS TABLE (Physical Cash Register)
CREATE TABLE IF NOT EXISTS cash_accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    account_name VARCHAR(255) NOT NULL DEFAULT 'Main Cash Drawer',
    current_balance NUMERIC(12,2) DEFAULT 0.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 9. SALES TABLE
CREATE TABLE IF NOT EXISTS sales (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    invoice_no VARCHAR(100) NOT NULL,
    customer_id UUID REFERENCES customers_vendors(id),
    customer_name VARCHAR(255) NOT NULL,
    customer_phone VARCHAR(20),
    customer_gstin VARCHAR(15),
    subtotal NUMERIC(12,2) NOT NULL,
    total_taxable NUMERIC(12,2) NOT NULL,
    total_cgst NUMERIC(12,2) DEFAULT 0.00,
    total_sgst NUMERIC(12,2) DEFAULT 0.00,
    total_igst NUMERIC(12,2) DEFAULT 0.00,
    grand_total NUMERIC(12,2) NOT NULL,
    paid_amount NUMERIC(12,2) DEFAULT 0.00,
    due_amount NUMERIC(12,2) DEFAULT 0.00,
    payment_mode payment_mode DEFAULT 'cash',
    billed_by_user_id UUID REFERENCES users(id),
    billed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_company_invoice UNIQUE (company_id, invoice_no)
);

-- 10. SALE ITEMS TABLE
CREATE TABLE IF NOT EXISTS sale_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sale_id UUID NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id),
    product_name VARCHAR(255) NOT NULL,
    hsn_code VARCHAR(20),
    qty NUMERIC(12,2) NOT NULL CHECK (qty > 0),
    unit_price NUMERIC(12,2) NOT NULL,
    gst_rate NUMERIC(5,2) NOT NULL,
    taxable_amount NUMERIC(12,2) NOT NULL,
    total_amount NUMERIC(12,2) NOT NULL
);

-- 11. PURCHASES TABLE
CREATE TABLE IF NOT EXISTS purchases (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    purchase_no VARCHAR(100) NOT NULL,
    vendor_id UUID REFERENCES customers_vendors(id),
    vendor_name VARCHAR(255) NOT NULL,
    vendor_gstin VARCHAR(15),
    subtotal NUMERIC(12,2) NOT NULL,
    total_tax NUMERIC(12,2) NOT NULL,
    grand_total NUMERIC(12,2) NOT NULL,
    paid_amount NUMERIC(12,2) DEFAULT 0.00,
    payment_mode payment_mode DEFAULT 'cash',
    purchased_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_company_purchase UNIQUE (company_id, purchase_no)
);

-- 12. PURCHASE ITEMS TABLE
CREATE TABLE IF NOT EXISTS purchase_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    purchase_id UUID NOT NULL REFERENCES purchases(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id),
    product_name VARCHAR(255) NOT NULL,
    qty NUMERIC(12,2) NOT NULL CHECK (qty > 0),
    unit_cost NUMERIC(12,2) NOT NULL,
    gst_rate NUMERIC(5,2) NOT NULL,
    total_amount NUMERIC(12,2) NOT NULL
);

-- 13. LEDGER TRANSACTIONS TABLE
CREATE TABLE IF NOT EXISTS ledger_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    transaction_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    reference_type VARCHAR(50) NOT NULL, -- 'sale', 'purchase', 'expense', 'income', 'khata'
    reference_id UUID,
    account_type VARCHAR(20) NOT NULL CHECK (account_type IN ('cash', 'bank', 'khata')),
    description TEXT NOT NULL,
    debit_amount NUMERIC(12,2) DEFAULT 0.00,
    credit_amount NUMERIC(12,2) DEFAULT 0.00,
    balance_after NUMERIC(12,2) NOT NULL
);

-- ============================================================================
-- 14. ROW-LEVEL SECURITY (RLS) POLICIES - ENFORCING COMPANY ISOLATION
-- ============================================================================

ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE companies FORCE ROW LEVEL SECURITY;

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE users FORCE ROW LEVEL SECURITY;

ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE products FORCE ROW LEVEL SECURITY;

ALTER TABLE customers_vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers_vendors FORCE ROW LEVEL SECURITY;

ALTER TABLE bank_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE bank_accounts FORCE ROW LEVEL SECURITY;

ALTER TABLE cash_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE cash_accounts FORCE ROW LEVEL SECURITY;

ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales FORCE ROW LEVEL SECURITY;

ALTER TABLE sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE sale_items FORCE ROW LEVEL SECURITY;

ALTER TABLE purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchases FORCE ROW LEVEL SECURITY;

ALTER TABLE purchase_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_items FORCE ROW LEVEL SECURITY;

ALTER TABLE ledger_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ledger_transactions FORCE ROW LEVEL SECURITY;

-- Dynamic RLS Policies using Session Variable 'app.current_company_id'
CREATE POLICY rls_company_companies ON companies
    FOR ALL USING (id = NULLIF(current_setting('app.current_company_id', true), '')::uuid);

CREATE POLICY rls_company_users ON users
    FOR ALL USING (company_id = NULLIF(current_setting('app.current_company_id', true), '')::uuid);

CREATE POLICY rls_company_products ON products
    FOR ALL USING (company_id = NULLIF(current_setting('app.current_company_id', true), '')::uuid);

CREATE POLICY rls_company_customers ON customers_vendors
    FOR ALL USING (company_id = NULLIF(current_setting('app.current_company_id', true), '')::uuid);

CREATE POLICY rls_company_sales ON sales
    FOR ALL USING (company_id = NULLIF(current_setting('app.current_company_id', true), '')::uuid);

CREATE POLICY rls_company_purchases ON purchases
    FOR ALL USING (company_id = NULLIF(current_setting('app.current_company_id', true), '')::uuid);

CREATE POLICY rls_company_bank ON bank_accounts
    FOR ALL USING (company_id = NULLIF(current_setting('app.current_company_id', true), '')::uuid);

CREATE POLICY rls_company_cash ON cash_accounts
    FOR ALL USING (company_id = NULLIF(current_setting('app.current_company_id', true), '')::uuid);

CREATE POLICY rls_company_ledger ON ledger_transactions
    FOR ALL USING (company_id = NULLIF(current_setting('app.current_company_id', true), '')::uuid);

-- ============================================================================
-- 15. BRUTE FORCE LOCKOUT STORED PROCEDURE
-- ============================================================================

CREATE OR REPLACE FUNCTION check_brute_force_lockout(
    p_email VARCHAR,
    p_is_success BOOLEAN
) RETURNS TABLE (is_locked BOOLEAN, attempts_left INT, message TEXT) AS $$
DECLARE
    v_failed INT;
    v_locked_until TIMESTAMP WITH TIME ZONE;
BEGIN
    SELECT failed_login_attempts, locked_until 
    INTO v_failed, v_locked_until 
    FROM users WHERE email = p_email;

    -- Check if currently locked
    IF v_locked_until IS NOT NULL AND v_locked_until > CURRENT_TIMESTAMP THEN
        RETURN QUERY SELECT TRUE, 0, 'Account is locked. Try again after 15 minutes.'::TEXT;
        RETURN;
    END IF;

    IF p_is_success THEN
        -- Reset counter on successful login
        UPDATE users SET failed_login_attempts = 0, locked_until = NULL WHERE email = p_email;
        RETURN QUERY SELECT FALSE, 5, 'Login successful.'::TEXT;
    ELSE
        -- Increment failed count
        v_failed := COALESCE(v_failed, 0) + 1;
        IF v_failed >= 5 THEN
            -- Lock for 15 minutes
            UPDATE users SET failed_login_attempts = v_failed, locked_until = CURRENT_TIMESTAMP + INTERVAL '15 minutes' WHERE email = p_email;
            RETURN QUERY SELECT TRUE, 0, 'Account locked for 15 minutes due to 5 failed attempts.'::TEXT;
        ELSE
            UPDATE users SET failed_login_attempts = v_failed WHERE email = p_email;
            RETURN QUERY SELECT FALSE, (5 - v_failed), ('Invalid credentials. ' || (5 - v_failed) || ' attempts remaining.')::TEXT;
        END IF;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 16. PERFORMANCE INDEXES
-- ============================================================================

CREATE INDEX idx_products_sku ON products(sku);
CREATE INDEX idx_sales_billed_at ON sales(billed_at DESC);
CREATE INDEX idx_ledger_date ON ledger_transactions(transaction_date DESC);
CREATE INDEX idx_users_email ON users(email);

-- ============================================================================
-- 17. COUNTERS TABLE (Multi Billing Counters per Shop)
-- ============================================================================
CREATE TABLE IF NOT EXISTS counters (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) NOT NULL,
    pin VARCHAR(20) DEFAULT '1111',
    location VARCHAR(255),
    assigned_cashier_name VARCHAR(255),
    status VARCHAR(20) DEFAULT 'active',
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_company_counter_code UNIQUE (company_id, code)
);

-- ============================================================================
-- 18. SHIFTS TABLE (Cashier Shift Management & Cash Reconciliation)
-- ============================================================================
CREATE TABLE IF NOT EXISTS shifts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    counter_id UUID NOT NULL REFERENCES counters(id) ON DELETE CASCADE,
    counter_name VARCHAR(255) NOT NULL,
    cashier_id UUID REFERENCES users(id),
    cashier_name VARCHAR(255) NOT NULL,
    opening_cash NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    closing_cash NUMERIC(12,2) DEFAULT 0.00,
    expected_cash NUMERIC(12,2) DEFAULT 0.00,
    cash_difference NUMERIC(12,2) DEFAULT 0.00,
    opened_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    closed_at TIMESTAMP WITH TIME ZONE NULL,
    status VARCHAR(20) DEFAULT 'open',
    notes TEXT
);

-- Add counter_id and shift_id columns to sales table
ALTER TABLE sales ADD COLUMN IF NOT EXISTS counter_id UUID REFERENCES counters(id);
ALTER TABLE sales ADD COLUMN IF NOT EXISTS shift_id UUID REFERENCES shifts(id);

-- Enforce Row Level Security (RLS) on counters and shifts
ALTER TABLE counters ENABLE ROW LEVEL SECURITY;
ALTER TABLE counters FORCE ROW LEVEL SECURITY;

ALTER TABLE shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE shifts FORCE ROW LEVEL SECURITY;

CREATE POLICY rls_company_counters ON counters
    FOR ALL USING (company_id = NULLIF(current_setting('app.current_company_id', true), '')::uuid);

-- 19. GOOGLE SHEETS SYNC COLUMNS & AUDIT LOGS TABLE
-- ============================================================================
ALTER TABLE companies ADD COLUMN IF NOT EXISTS google_sheet_id VARCHAR(255);
ALTER TABLE companies ADD COLUMN IF NOT EXISTS google_sheet_webhook_url TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS sheets_sync_enabled BOOLEAN DEFAULT TRUE;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS last_sheets_sync_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS last_sheets_sync_status VARCHAR(50);

CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    action VARCHAR(255) NOT NULL,
    actor_email VARCHAR(255),
    ip_address VARCHAR(50),
    status VARCHAR(50) DEFAULT 'SUCCESS',
    details TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs FORCE ROW LEVEL SECURITY;

CREATE POLICY rls_company_audit_logs ON audit_logs
    FOR ALL USING (company_id IS NULL OR company_id = NULLIF(current_setting('app.current_company_id', true), '')::uuid);

CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);

