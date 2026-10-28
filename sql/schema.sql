-- ============================================
-- DATABASE SCHEMA
-- ============================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- TABLE: admins
CREATE TABLE IF NOT EXISTS admins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username TEXT UNIQUE,
    pin_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'viewer',
    is_active BOOLEAN DEFAULT true,
    notes TEXT,
    created_by UUID REFERENCES admins(id),
    last_login TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT admins_role_check CHECK (role IN ('superadmin', 'viewer'))
);

-- TABLE: periods
CREATE TABLE IF NOT EXISTS periods (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    start_date DATE,
    end_date DATE,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- TABLE: schools
CREATE TABLE IF NOT EXISTS schools (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    period_id UUID NOT NULL REFERENCES periods(id) ON DELETE CASCADE,
    no_urut INTEGER DEFAULT 1,
    sekolah_name TEXT NOT NULL,
    pic_name TEXT,
    bank_name TEXT,
    account_number TEXT,
    nominal BIGINT DEFAULT 0,
    transfer_proof_url TEXT,
    transfer_proof_path TEXT,
    transfer_date DATE,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- INDEXES
CREATE INDEX IF NOT EXISTS idx_schools_period_id ON schools(period_id);
CREATE INDEX IF NOT EXISTS idx_schools_name ON schools(sekolah_name);
CREATE INDEX IF NOT EXISTS idx_periods_active ON periods(is_active);
CREATE INDEX IF NOT EXISTS idx_admins_pin_hash ON admins(pin_hash);
CREATE INDEX IF NOT EXISTS idx_admins_role ON admins(role);
CREATE INDEX IF NOT EXISTS idx_admins_active ON admins(is_active);

-- AUTO-UPDATE updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_periods_updated_at
    BEFORE UPDATE ON periods FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_schools_updated_at
    BEFORE UPDATE ON schools FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_admins_updated_at
    BEFORE UPDATE ON admins FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS
ALTER TABLE admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE schools ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read active admins" ON admins FOR SELECT 
    USING (is_active = true);
CREATE POLICY "Allow all CRUD admins" ON admins 
    FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Public read periods" ON periods FOR SELECT USING (true);
CREATE POLICY "Allow all CRUD periods" ON periods 
    FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Public read schools" ON schools FOR SELECT USING (true);
CREATE POLICY "Allow all CRUD schools" ON schools 
    FOR ALL USING (true) WITH CHECK (true);

-- STORAGE
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types) 
VALUES (
    'transfer-proofs', 
    'transfer-proofs', 
    true,
    5242880,
    ARRAY['image/jpeg', 'image/png', 'image/jpg', 'image/webp']
) ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public read transfer proofs" ON storage.objects
    FOR SELECT USING (bucket_id = 'transfer-proofs');
CREATE POLICY "Public insert transfer proofs" ON storage.objects
    FOR INSERT WITH CHECK (bucket_id = 'transfer-proofs');
CREATE POLICY "Public delete transfer proofs" ON storage.objects
    FOR DELETE USING (bucket_id = 'transfer-proofs');
CREATE POLICY "Public update transfer proofs" ON storage.objects
    FOR UPDATE USING (bucket_id = 'transfer-proofs');

-- INSERT SUPERADMIN (PIN 2000)
INSERT INTO admins (username, pin_hash, role, is_active, notes) 
VALUES (
    'superadmin', 
    '8ee6525a6e419f69a448d3cbd583e12322c39b8878c449e0e60a0e9e9e464cd6', 
    'superadmin', 
    true, 
    'Master admin - PIN only access'
) ON CONFLICT (username) DO NOTHING;
