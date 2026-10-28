// ============================================
// CRYPTO UTILITIES - LENGKAP
// ============================================

const GLOBAL_SALT = 'pic_incentive:';

/**
 * Hash string dengan SHA-256
 * @param {string} text 
 * @returns {Promise<string>} hex string
 */
export async function sha256(text) {
    const encoder = new TextEncoder();
    const data = encoder.encode(text);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Hash PIN dengan global salt
 * @param {string} pin - 4 digit PIN
 * @returns {Promise<string>} hex hash
 */
export async function hashPin(pin) {
    const salted = `${GLOBAL_SALT}${pin}`;
    return await sha256(salted);
}

/**
 * Generate random 4-digit PIN (1000-9999)
 * @returns {string} 4 digit string
 */
export function generatePin() {
    return String(Math.floor(1000 + Math.random() * 9000));
}
