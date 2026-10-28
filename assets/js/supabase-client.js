// ============================================
// SUPABASE CLIENT - Singleton Pattern
// ============================================
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
import { SUPABASE_CONFIG } from './config.js';

let client = null;

export function getSupabase() {
    if (!client) {
        if (SUPABASE_CONFIG.url.includes('YOUR_')) {
            throw new Error('Konfigurasi Supabase belum diatur. Edit assets/js/config.js');
        }
        client = createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey);
    }
    return client;
}
