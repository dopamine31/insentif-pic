// ============================================
// AUTHENTICATION MODULE
// PIN diverifikasi dari Supabase (hashed SHA-256)
// ============================================
import { getSupabase } from './supabase-client.js';
import { hashPin } from './utils/crypto.js';
import { APP_CONFIG } from './config.js';

export class AuthManager {
    constructor() {
        this.attemptsKey = 'pic_pin_attempts';
        this.lockUntilKey = 'pic_pin_lock_until';
    }

    /**
     * Login dengan PIN
     * @param {string} username 
     * @param {string} pin 
     * @returns {Promise<{success: boolean, user?: object, message: string}>}
     */
    async login(username, pin) {
        if (this.isLocked()) {
            const remaining = this.getLockRemaining();
            return {
                success: false,
                message: `🔒 Akun terkunci. Coba lagi dalam ${remaining} detik`
            };
        }

        try {
            // Hash PIN yang diinput
            const inputHash = await hashPin(pin, username);

            // Query ke Supabase
            const supabase = getSupabase();
            const { data, error } = await supabase
                .from('admins')
                .select('id, username, role')
                .eq('username', username)
                .eq('pin_hash', inputHash)
                .eq('is_active', true)
                .single();

            if (error || !data) {
                this.recordFailedAttempt();
                const attempts = this.getAttempts();
                const remaining = APP_CONFIG.maxPinAttempts - attempts;
                return {
                    success: false,
                    message: remaining > 0 
                        ? `❌ PIN salah! Sisa ${remaining} percobaan`
                        : '🚫 Terlalu banyak percobaan. Akun dikunci.'
                };
            }

            // Sukses - update last_login
            await supabase
                .from('admins')
                .update({ last_login: new Date().toISOString() })
                .eq('id', data.id);

            // Simpan session
            sessionStorage.setItem(APP_CONFIG.sessionKey, JSON.stringify({
                userId: data.id,
                username: data.username,
                role: data.role,
                loginAt: Date.now()
            }));

            // Reset attempts
            sessionStorage.removeItem(this.attemptsKey);
            sessionStorage.removeItem(this.lockUntilKey);

            return {
                success: true,
                user: data,
                message: `✅ Selamat datang, ${data.username}!`
            };
        } catch (err) {
            console.error('Login error:', err);
            return {
                success: false,
                message: `❌ Error: ${err.message}`
            };
        }
    }

    logout() {
        sessionStorage.removeItem(APP_CONFIG.sessionKey);
    }

    isAuthenticated() {
        const session = sessionStorage.getItem(APP_CONFIG.sessionKey);
        if (!session) return false;
        try {
            const data = JSON.parse(session);
            // Session valid 24 jam
            return Date.now() - data.loginAt < 24 * 60 * 60 * 1000;
        } catch {
            return false;
        }
    }

    getCurrentUser() {
        if (!this.isAuthenticated()) return null;
        try {
            return JSON.parse(sessionStorage.getItem(APP_CONFIG.sessionKey));
        } catch {
            return null;
        }
    }

    recordFailedAttempt() {
        const attempts = this.getAttempts() + 1;
        sessionStorage.setItem(this.attemptsKey, attempts.toString());
        
        if (attempts >= APP_CONFIG.maxPinAttempts) {
            this.lockAccount();
        }
    }

    lockAccount() {
        const lockUntil = Date.now() + APP_CONFIG.lockDuration;
        sessionStorage.setItem(this.lockUntilKey, lockUntil.toString());
        sessionStorage.setItem(this.attemptsKey, '0');
    }

    isLocked() {
        const lockUntil = parseInt(sessionStorage.getItem(this.lockUntilKey) || '0');
        return Date.now() < lockUntil;
    }

    getLockRemaining() {
        const lockUntil = parseInt(sessionStorage.getItem(this.lockUntilKey) || '0');
        return Math.max(0, Math.ceil((lockUntil - Date.now()) / 1000));
    }

    getAttempts() {
        return parseInt(sessionStorage.getItem(this.attemptsKey) || '0');
    }
}

export const auth = new AuthManager();
