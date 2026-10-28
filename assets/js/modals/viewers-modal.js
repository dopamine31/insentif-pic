// ============================================
// VIEWERS MANAGEMENT MODAL
// ============================================
import { ViewerService } from '../services/viewer-service.js';
import { toast } from '../utils/toast.js';
import { formatDate, formatDateTime, escapeHtml } from '../utils/format.js';

export const ViewersModal = {
    viewers: [],

    async open() {
        const modal = document.getElementById('viewersModal');
        modal.classList.add('active');
        await this.load();
    },

    close() {
        document.getElementById('viewersModal').classList.remove('active');
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
            <div class="viewers-table">
                <table style="width:100%; border-collapse:collapse; font-size:13px;">
                    <thead style="background:#f8f9fa;">
                        <tr>
                            <th style="padding:10px; text-align:left; border-bottom:2px solid #e0e0e0;">PIN</th>
                            <th style="padding:10px; text-align:left; border-bottom:2px solid #e0e0e0;">Status</th>
                            <th style="padding:10px; text-align:left; border-bottom:2px solid #e0e0e0;">Catatan</th>
                            <th style="padding:10px; text-align:left; border-bottom:2px solid #e0e0e0;">Dibuat</th>
                            <th style="padding:10px; text-align:center; border-bottom:2px solid #e0e0e0;">Aksi</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${this.viewers.map(v => this.renderRow(v)).join('')}
                    </tbody>
                </table>
            </div>
        `;
    },

    renderRow(v) {
        const statusBadge = v.is_active 
            ? '<span style="background:#27ae60; color:white; padding:3px 8px; border-radius:10px; font-size:11px;">Aktif</span>'
            : '<span style="background:#e74c3c; color:white; padding:3px 8px; border-radius:10px; font-size:11px;">Nonaktif</span>';
        
        const toggleText = v.is_active ? '🚫 Nonaktifkan' : '✅ Aktifkan';
        
        return `
            <tr style="border-bottom:1px solid #e0e0e0;">
                <td style="padding:10px;">
                    <code style="background:#f0f0f0; padding:4px 8px; border-radius:4px; font-family:monospace; font-size:14px; letter-spacing:2px;">
                        ${v.pin_hidden || '••••'}
                    </code>
                </td>
                <td style="padding:10px;">${statusBadge}</td>
                <td style="padding:10px; max-width:200px; overflow:hidden; text-overflow:ellipsis;">
                    ${escapeHtml(v.notes || '-')}
                </td>
                <td style="padding:10px; font-size:12px; color:var(--gray);">
                    ${formatDateTime(v.created_at)}
                </td>
                <td style="padding:10px; text-align:center;">
                    <div style="display:flex; gap:4px; justify-content:center; flex-wrap:wrap;">
                        <button class="btn btn-sm btn-primary" onclick="window.resetViewerPin('${v.id}')" title="Reset PIN">
                            🔄
                        </button>
                        <button class="btn btn-sm btn-secondary" onclick="window.toggleViewer('${v.id}', ${!v.is_active})" title="${toggleText}">
                            ${v.is_active ? '🚫' : '✅'}
                        </button>
                        <button class="btn btn-sm btn-secondary" onclick="window.editViewerNotes('${v.id}')" title="Edit Catatan">
                            📝
                        </button>
                        <button class="btn btn-sm btn-danger" onclick="window.deleteViewer('${v.id}')" title="Hapus">
                            🗑️
                        </button>
                    </div>
                </td>
            </tr>
        `;
    },

    async createViewer() {
        const notes = prompt('Catatan untuk viewer ini (opsional):', '');
        if (notes === null) return; // Cancel
        
        try {
            const result = await ViewerService.create(notes);
            
            // Show PIN to user
            const pinDisplay = document.createElement('div');
            pinDisplay.style.cssText = `
                position:fixed; inset:0; background:rgba(0,0,0,0.8); 
                display:flex; align-items:center; justify-content:center; z-index:10000;
            `;
            pinDisplay.innerHTML = `
                <div style="background:white; padding:40px; border-radius:16px; max-width:400px; text-align:center;">
                    <div style="font-size:48px; margin-bottom:15px;">✅</div>
                    <h3 style="margin-bottom:10px;">Viewer Berhasil Dibuat!</h3>
                    <p style="color:var(--gray); margin-bottom:20px;">Berikan PIN ini kepada viewer:</p>
                    <div style="font-size:48px; font-weight:800; letter-spacing:8px; 
                                background:linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                                color:white; padding:20px; border-radius:12px; margin-bottom:20px;
                                font-family:monospace;">
                        ${result.pin}
                    </div>
                    <p style="font-size:12px; color:var(--danger); margin-bottom:20px;">
                        ⚠️ Simpan PIN ini! PIN tidak akan ditampilkan lagi.
                    </p>
                    <button class="btn btn-primary" onclick="this.closest('div[style]').parentElement.remove();">
                        OK, Saya Sudah Catat
                    </button>
                </div>
            `;
            document.body.appendChild(pinDisplay);
            
            await this.load();
        } catch (err) {
            toast('Gagal membuat viewer: ' + err.message, 'error');
        }
    },

    async resetPin(id) {
        if (!confirm('Reset PIN viewer ini? PIN lama tidak akan bisa digunakan.')) return;
        
        try {
            const result = await ViewerService.resetPin(id);
            
            // Show new PIN
            const pinDisplay = document.createElement('div');
            pinDisplay.style.cssText = `
                position:fixed; inset:0; background:rgba(0,0,0,0.8); 
                display:flex; align-items:center; justify-content:center; z-index:10000;
            `;
            pinDisplay.innerHTML = `
                <div style="background:white; padding:40px; border-radius:16px; max-width:400px; text-align:center;">
                    <div style="font-size:48px; margin-bottom:15px;">🔄</div>
                    <h3 style="margin-bottom:10px;">PIN Berhasil Di-Reset!</h3>
                    <p style="color:var(--gray); margin-bottom:20px;">PIN baru untuk viewer:</p>
                    <div style="font-size:48px; font-weight:800; letter-spacing:8px; 
                                background:linear-gradient(135deg, #f093fb 0%, #f5576c 100%); 
                                color:white; padding:20px; border-radius:12px; margin-bottom:20px;
                                font-family:monospace;">
                        ${result.pin}
                    </div>
                    <p style="font-size:12px; color:var(--danger); margin-bottom:20px;">
                        ⚠️ Berikan PIN baru ini kepada viewer!
                    </p>
                    <button class="btn btn-primary" onclick="this.closest('div[style]').parentElement.remove();">
                        OK
                    </button>
                </div>
            `;
            document.body.appendChild(pinDisplay);
            
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
    }
};

// Expose to window
window.openViewersModal = () => ViewersModal.open();
window.closeViewersModal = () => ViewersModal.close();
window.createViewer = () => ViewersModal.createViewer();
window.resetViewerPin = (id) => ViewersModal.resetPin(id);
window.toggleViewer = (id, isActive) => ViewersModal.toggleActive(id, isActive);
window.editViewerNotes = (id) => ViewersModal.editNotes(id);
window.deleteViewer = (id) => ViewersModal.delete(id);
