-- ============================================
-- SUMMARY INSENTIF PIC - DATABASE SCHEMA
-- ============================================

-- EXTENSION untuk UUID & crypto
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================
-- TABLE: admins (untuk autentikasi PIN)
-- ============================================
CREATE TABLE IF NOT EXISTS admins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username TEXT UNIQUE NOT NULL,
    pin_hash TEXT NOT NULL,                -- SHA-256 hash dari PIN
    role TEXT DEFAULT 'admin' CHECK (role IN ('admin', 'superadmin')),
    is_active BOOLEAN DEFAULT true,
    last_login TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- TABLE: periods (Master Periode)
-- ============================================
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

-- ============================================
-- TABLE: schools (Data Sekolah + PIC)
-- ============================================
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
    transfer_proof_path TEXT,              -- Untuk delete dari storage
    transfer_date DATE,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INDEXES untuk performa
-- ============================================
CREATE INDEX IF NOT EXISTS idx_schools_period_id ON schools(period_id);
CREATE INDEX IF NOT EXISTS idx_schools_name ON schools(sekolah_name);
CREATE INDEX IF NOT EXISTS idx_periods_active ON periods(is_active);
CREATE INDEX IF NOT EXISTS idx_admins_username ON admins(username);

-- ============================================
-- AUTO-UPDATE updated_at TRIGGER
-- ============================================
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

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================
ALTER TABLE admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE schools ENABLE ROW LEVEL SECURITY;

-- Public read untuk data display
CREATE POLICY "Public read periods" ON periods FOR SELECT USING (true);
CREATE POLICY "Public read schools" ON schools FOR SELECT USING (true);

-- Public read untuk login (hanya username + pin_hash)
CREATE POLICY "Public read active admins" ON admins FOR SELECT 
    USING (is_active = true);

-- CRUD operations (dilindungi PIN di frontend)
CREATE POLICY "Allow all CRUD periods" ON periods 
    FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all CRUD schools" ON schools 
    FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow admin update last_login" ON admins 
    FOR UPDATE USING (true) WITH CHECK (true);

-- ============================================
-- STORAGE BUCKET untuk bukti transfer
-- ============================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types) 
VALUES (
    'transfer-proofs', 
    'transfer-proofs', 
    true,
    5242880,  -- 5MB max
    ARRAY['image/jpeg', 'image/png', 'image/jpg', 'image/webp']
) ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "Public read transfer proofs" ON storage.objects
    FOR SELECT USING (bucket_id = 'transfer-proofs');
CREATE POLICY "Public insert transfer proofs" ON storage.objects
    FOR INSERT WITH CHECK (bucket_id = 'transfer-proofs');
CREATE POLICY "Public delete transfer proofs" ON storage.objects
    FOR DELETE USING (bucket_id = 'transfer-proofs');
CREATE POLICY "Public update transfer proofs" ON storage.objects
    FOR UPDATE USING (bucket_id = 'transfer-proofs');

-- ============================================
-- VIEW: Summary statistics (optional helper)
-- ============================================
CREATE OR REPLACE VIEW v_period_summary AS
SELECT 
    p.id,
    p.name,
    p.start_date,
    p.end_date,
    p.description,
    p.is_active,
    COUNT(s.id) AS total_sekolah,
    COALESCE(SUM(s.nominal), 0) AS total_nominal
FROM periods p
LEFT JOIN schools s ON s.period_id = p.id
GROUP BY p.id, p.name, p.start_date, p.end_date, p.description, p.is_active;
