// ============================================
// VIEWERS MANAGEMENT MODAL
// ============================================
import { ViewerService } from '../services/viewer-service.js';
import { toast } from '../utils/toast.js';
import { auth } from '../auth.js';
import { formatDateTime, escapeHtml } from '../utils/format.js';

export const ViewersModal = {
    viewers: [],

    async open() {
        if (!auth.isSuperadmin()) {
            toast('⛔ Hanya Superadmin', 'warning');
            return;
        }

        const modal = document.getElementById('viewersModal');
        modal.classList.add('active');
        await this.load();
    },

    async load() {
        const list = document.getElementById('viewersList');
        list.innerHTML = '<div class="loading">Memuat daftar viewer...</div>';

        try {
            this.viewers = await ViewerService.getAll();
            this.render();
        } catch (err) {
            list.innerHTML = `<div class="loading" style="color:var(--danger)">❌ ${err.message}</div>`;
        }
    },

    render() {
        const list = document.getElementById('viewersList');
        
        if (!this.viewers.length) {
            list.innerHTML = `
                <div style="text-align:center; padding:40px; color:var(--gray);">
                    <div style="font-size:48px; margin-bottom:10px;">👥</div>
                    <div>Belum ada viewer.</div>
                    <div style="font-size:13px; margin-top:8px;">Klik "➕ Buat Viewer Baru" untuk mulai.</div>
                </div>
            `;
            return;
        }

        list.innerHTML = `
            <table class="viewers-table">
                <thead>
                    <tr>
                        <th>Catatan</th>
                        <th>Status</th>
                        <th>Dibuat</th>
                        <th>Aksi</th>
                    </tr>
                </thead>
                <tbody>
                    ${this.viewers.map(v => this.renderRow(v)).join('')}
                </tbody>
            </table>
        `;
    },

    renderRow(v) {
        const statusBadge = v.is_active 
            ? '<span class="status-badge status-active">Aktif</span>'
            : '<span class="status-badge status-inactive">Nonaktif</span>';
        
        const toggleText = v.is_active ? 'Nonaktifkan' : 'Aktifkan';
        
        return `
            <tr>
                <td>${escapeHtml(v.notes || '-')}</td>
                <td>${statusBadge}</td>
                <td style="font-size:12px;">${formatDateTime(v.created_at)}</td>
                <td style="text-align:center;">
                    <div style="display:flex; gap:4px; justify-content:center; flex-wrap:wrap;">
                        <button class="btn btn-sm btn-primary" data-action="reset-viewer-pin" data-id="${v.id}" title="Reset PIN">🔄</button>
                        <button class="btn btn-sm btn-secondary" data-action="toggle-viewer" data-id="${v.id}" data-active="${v.is_active}" title="${toggleText}">
                            ${v.is_active ? '🚫' : '✅'}
                        </button>
                        <button class="btn btn-sm btn-secondary" data-action="edit-viewer-notes" data-id="${v.id}" title="Edit Catatan">📝</button>
                        <button class="btn btn-sm btn-danger" data-action="delete-viewer" data-id="${v.id}" title="Hapus">🗑️</button>
                    </div>
                </td>
            </tr>
        `;
    },

    async createViewer() {
        const notes = prompt('Catatan untuk viewer ini (opsional):', '');
        if (notes === null) return;
        
        try {
            const result = await ViewerService.create(notes);
            this.showPinDisplay(result.pin, 'Viewer Berhasil Dibuat!');
            await this.load();
        } catch (err) {
            toast('Gagal membuat viewer: ' + err.message, 'error');
        }
    },

    async resetPin(id) {
        if (!confirm('Reset PIN viewer ini? PIN lama tidak akan bisa digunakan.')) return;
        
        try {
            const result = await ViewerService.resetPin(id);
            this.showPinDisplay(result.pin, 'PIN Berhasil Di-Reset!');
            await this.load();
        } catch (err) {
            toast('Gagal reset PIN: ' + err.message, 'error');
        }
    },

    async toggleActive(id, isActive) {
        const action = isActive ? 'mengaktifkan' : 'menonaktifkan';
        if (!confirm(`Yakin ingin ${action} viewer ini?`)) return;
        
        try {
            await ViewerService.toggleActive(id, isActive);
            toast(`Viewer berhasil ${isActive ? 'diaktifkan' : 'dinonaktifkan'}`, 'success');
            await this.load();
        } catch (err) {
            toast('Gagal: ' + err.message, 'error');
        }
    },

    async editNotes(id) {
        const viewer = this.viewers.find(v => v.id === id);
        if (!viewer) return;
        
        const notes = prompt('Edit catatan viewer:', viewer.notes || '');
        if (notes === null) return;
        
        try {
            await ViewerService.updateNotes(id, notes);
            toast('Catatan diperbarui', 'success');
            await this.load();
        } catch (err) {
            toast('Gagal: ' + err.message, 'error');
        }
    },

    async delete(id) {
        if (!confirm('Yakin ingin menghapus viewer ini? Tindakan ini tidak bisa dibatalkan.')) return;
        
        try {
            await ViewerService.delete(id);
            toast('Viewer dihapus', 'success');
            await this.load();
        } catch (err) {
            toast('Gagal menghapus: ' + err.message, 'error');
        }
    },

    showPinDisplay(pin, title) {
        document.getElementById('pinDisplayTitle').innerText = title;
        document.getElementById('pinDisplayValue').innerText = pin;
        document.getElementById('pinDisplayModal').classList.add('active');
    }
};
