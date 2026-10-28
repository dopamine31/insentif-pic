// ============================================
// TOAST NOTIFICATIONS
// ============================================
import { escapeHtml } from './format.js';

export function toast(message, type = 'info', duration = 3000) {
    document.querySelectorAll('.toast-notification').forEach(el => el.remove());

    const icons = {
        success: '✅',
        error: '❌',
        warning: '⚠️',
        info: 'ℹ️'
    };

    const t = document.createElement('div');
    t.className = `toast-notification toast-${type}`;
    t.innerHTML = `
        <div class="toast-icon">${icons[type] || icons.info}</div>
        <div class="toast-message">${escapeHtml(message)}</div>
    `;
    document.body.appendChild(t);

    setTimeout(() => {
        t.classList.add('toast-exit');
        setTimeout(() => t.remove(), 300);
    }, duration);
}
