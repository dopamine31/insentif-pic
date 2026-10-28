// ============================================
// VIEWERS MODAL
// ============================================
import { ViewerService } from '../services/viewer-service.js';
import { toast } from '../utils/toast.js';
import { auth } from '../auth.js';
import { formatDateTime, escapeHtml } from '../utils/format.js';
import { Loader } from '../app.js';

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
            list.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">😔</div>
                    <div class="empty-state-title">Gagal Memuat</div>
                    <div class="empty-state-text">${escapeHtml(err.message)}</div>
                </div>
            `;
        }
    },

    render() {
        const list = document.getElementById('viewersList');
        
        if (!this.viewers.length) {
            list.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">👥</div>
                    <div class="empty-state-title">Belum Ada Viewer</div>
                    <div class="empty-state-text">Buat viewer pertama untuk memberi akses kepada rekan.</div>
                    <button class="btn btn-primary" data-action="create-viewer">➕ Buat Viewer Pertama</button>
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
                        <th>Login Terakhir</th>
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
            ? '<span class="status-badge status-active">✅ Aktif</span>'
            : '<span class="status-badge status-inactive">⛔ Nonaktif</span>';
        
        const toggleText = v.is_active ? 'Nonaktifkan' : 'Aktifkan';
        const toggleIcon = v.is_active ? '🚫' : '✅';
        
        return `
            <tr>
                <td><strong>${escapeHtml(v.notes || '-')}</strong></td>
                <td>${statusBadge}</td>
                <td style="font-size:12px;">${v.last_login ? formatDateTime(v.last_login) : '<em style="color:#9ca3af;">Belum pernah</em>'}</td>
                <td style="font-size:12px;">${formatDateTime(v.created_at)}</td>
                <td>
                    <div style="display:flex; gap:4px; justify-content:flex-start; flex-wrap:wrap;">
                        <button class="btn btn-sm btn-primary" data-action="reset-viewer-pin" data-id="${v.id}" title="Reset PIN">🔄</button>
                        <button class="btn btn-sm btn-secondary" data-action="toggle-viewer" data-id="${v.id}" data-active="${v.is_active}" title="${toggleText}">${toggleIcon}</button>
                        <button class="btn btn-sm btn-secondary" data-action="edit-viewer-notes" data-id="${v.id}" title="Edit Catatan">📝</button>
                        <button class="btn btn-sm btn-danger" data-action="delete-viewer" data-id="${v.id}" title="Hapus">🗑️</button>
                    </div>
                </td>
            </tr>
        `;
    },

    async createViewer() {
        const notes = prompt('Catatan untuk viewer ini (contoh: "Viewer Cabang Jakarta"):', '');
        if (notes === null) return;
        
        Loader.show('Membuat viewer baru...');
        try {
            const result = await ViewerService.create(notes);
            Loader.hide();
            this.showPinDisplay(result.pin, '💕 Viewer Berhasil Dibuat!', 'Berikan PIN ini kepada viewer:');
            await this.load();
        } catch (err) {
            Loader.hide();
            toast('Gagal membuat viewer: ' + err.message, 'error');
        }
    },

    async resetPin(id) {
        if (!confirm('Reset PIN viewer ini? PIN lama tidak akan bisa digunakan.')) return;
        
        Loader.show('Reset PIN...');
        try {
            const result = await ViewerService.resetPin(id);
            Loader.hide();
            this.showPinDisplay(result.pin, '🔄 PIN Di-Reset!', 'PIN baru untuk viewer:');
            await this.load();
        } catch (err) {
            Loader.hide();
            toast('Gagal reset PIN: ' + err.message, 'error');
        }
    },

    async toggleActive(id, isActive) {
        const action = isActive ? 'mengaktifkan' : 'menonaktifkan';
        if (!confirm(`Yakin ingin ${action} viewer ini?`)) return;
        
        Loader.show('Memperbarui...');
        try {
            await ViewerService.toggleActive(id, isActive);
            toast(`Viewer berhasil ${isActive ? 'diaktifkan' : 'dinonaktifkan'} 💕`, 'success');
            await this.load();
            Loader.hide();
        } catch (err) {
            Loader.hide();
            toast('Gagal: ' + err.message, 'error');
        }
    },

    async editNotes(id) {
        const viewer = this.viewers.find(v => v.id === id);
        if (!viewer) return;
        
        const notes = prompt('Edit catatan viewer:', viewer.notes || '');
        if (notes === null) return;
        
        Loader.show('Memperbarui...');
        try {
            await ViewerService.updateNotes(id, notes);
            toast('Catatan diperbarui 💕', 'success');
            await this.load();
            Loader.hide();
        } catch (err) {
            Loader.hide();
            toast('Gagal: ' + err.message, 'error');
        }
    },

    async delete(id) {
        if (!confirm('Hapus viewer ini secara permanen? Tindakan ini tidak bisa dibatalkan.')) return;
        
        Loader.show('Menghapus...');
        try {
            await ViewerService.delete(id);
            toast('Viewer dihapus 💕', 'success');
            await this.load();
            Loader.hide();
        } catch (err) {
            Loader.hide();
            toast('Gagal menghapus: ' + err.message, 'error');
        }
    },

    showPinDisplay(pin, title, subtitle) {
        document.getElementById('pinDisplayTitle').innerText = title;
        document.getElementById('pinDisplaySubtitle').innerText = subtitle;
        document.getElementById('pinDisplayValue').innerText = pin;
        document.getElementById('pinDisplayModal').classList.add('active');
    }
};
