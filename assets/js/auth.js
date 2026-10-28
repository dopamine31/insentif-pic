// ============================================
// AUTHENTICATION MODULE - PIN ONLY
// ============================================
import { getSupabase } from './supabase-client.js';
import { hashPin } from './utils/crypto.js';
import { APP_CONFIG } from './config.js';

export class AuthManager {
    constructor() {
        this.attemptsKey = 'pic_pin_attempts';
        this.lockUntilKey = 'pic_pin_lock_until';
    }

    async login(pin) {
        if (this.isLocked()) {
            const remaining = this.getLockRemaining();
            return { success: false, message: `🔒 Terkunci. Coba dalam ${remaining} detik` };
        }

        try {
            const inputHash = await hashPin(pin);
            const supabase = getSupabase();
            
            const { data, error } = await supabase
                .from('admins')
                .select('id, username, role, notes')
                .eq('pin_hash', inputHash)
                .eq('is_active', true)
                .single();

            if (error || !data) {
                this.recordFailedAttempt();
                const remaining = APP_CONFIG.maxPinAttempts - this.getAttempts();
                return {
                    success: false,
                    message: remaining > 0 
                        ? `❌ PIN salah! Sisa ${remaining} percobaan`
                        : '🚫 Akun terkunci sementara.'
                };
            }

            await supabase.from('admins')
                .update({ last_login: new Date().toISOString() })
                .eq('id', data.id);

            sessionStorage.setItem(APP_CONFIG.sessionKey, JSON.stringify({
                userId: data.id,
                username: data.username,
                role: data.role,
                notes: data.notes,
                loginAt: Date.now()
            }));

            sessionStorage.removeItem(this.attemptsKey);
            sessionStorage.removeItem(this.lockUntilKey);

            const roleLabel = data.role === 'superadmin' ? '👑 Superadmin' : '👁️ Viewer';
            return {
                success: true,
                user: data,
                message: `✅ ${roleLabel} berhasil masuk!`
            };
        } catch (err) {
            return { success: false, message: `❌ Error: ${err.message}` };
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
            return Date.now() - data.loginAt < 24 * 60 * 60 * 1000;
        } catch { return false; }
    }

    getCurrentUser() {
        if (!this.isAuthenticated()) return null;
        try { return JSON.parse(sessionStorage.getItem(APP_CONFIG.sessionKey)); }
        catch { return null; }
    }

    isSuperadmin() {
        const user = this.getCurrentUser();
        return user && user.role === 'superadmin';
    }

    isViewer() {
        const user = this.getCurrentUser();
        return user && user.role === 'viewer';
    }

    canEdit() {
        return this.isSuperadmin();
    }

    recordFailedAttempt() {
        const attempts = this.getAttempts() + 1;
        sessionStorage.setItem(this.attemptsKey, attempts.toString());
        if (attempts >= APP_CONFIG.maxPinAttempts) this.lockAccount();
    }

    lockAccount() {
        sessionStorage.setItem(this.lockUntilKey, (Date.now() + APP_CONFIG.lockDuration).toString());
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
