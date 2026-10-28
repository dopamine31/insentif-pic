// ============================================
// TOAST NOTIFICATIONS
// ============================================

export function toast(message, type = 'info', duration = 3000) {
    // Remove existing
    document.querySelectorAll('.toast-notification').forEach(el => el.remove());

    const t = document.createElement('div');
    t.className = `toast-notification toast-${type}`;
    t.innerHTML = `
        <div class="toast-icon">${getIcon(type)}</div>
        <div class="toast-message">${escapeHtml(message)}</div>
    `;
    document.body.appendChild(t);

    setTimeout(() => {
        t.classList.add('toast-exit');
        setTimeout(() => t.remove(), 300);
    }, duration);
}

function getIcon(type) {
    const icons = {
        success: '✅',
        error: '❌',
        warning: '⚠️',
        info: 'ℹ️'
    };
    return icons[type] || icons.info;
}

function escapeHtml(s) {
    const div = document.createElement('div');
    div.textContent = s;
    return div.innerHTML;
}
