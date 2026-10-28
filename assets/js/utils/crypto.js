// ============================================
// CRYPTO UTILITIES
// ============================================

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
 * Hash PIN dengan salt sederhana (username)
 */
export async function hashPin(pin, username = '') {
    const salted = `${username}:${pin}`;
    return await sha256(salted);
}
