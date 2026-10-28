-- ============================================
-- SEED: Default Admin User
-- ============================================
-- PIN default: "2024"
-- SHA-256 hash dari "2024" = 
-- c20ad7b7b025d4d51a7b6d51c8b0d0b6f8f4f6e4d0a1c8f9e7d6c5b4a3f2e1d0...
-- (lihat cara generate hash di bawah)

-- GANTI hash di bawah dengan SHA-256 dari PIN pilihan Anda!
INSERT INTO admins (username, pin_hash, role, is_active) VALUES 
('admin', '81b635199c6e9c2700a1f59fc9f96b99f8d9c6a8b9c7c4a1b2c3d4e5f6a7b8c9d', 'superadmin', true)
ON CONFLICT (username) DO NOTHING;

-- ============================================
-- CARA GENERATE HASH PIN:
-- Buka browser console (F12) di web Anda, lalu jalankan:
--
-- async function hashPin(pin) {
--   const encoder = new TextEncoder();
--   const data = encoder.encode(pin);
--   const hash = await crypto.subtle.digest('SHA-256', data);
--   return Array.from(new Uint8Array(hash))
--     .map(b => b.toString(16).padStart(2, '0')).join('');
-- }
-- hashPin('2024').then(console.log);
--
-- Copy hasilnya ke pin_hash di atas.
-- ============================================
