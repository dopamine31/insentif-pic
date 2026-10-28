// ============================================
// PERIOD VIEW - RENDER SCHOOLS LIST
// ============================================
import { state } from '../state.js';
import { auth } from '../auth.js';
import { formatRupiah, escapeHtml } from '../utils/format.js';

export const PeriodView = {
    render(idx) {
        const p = state.periods[idx];
        if (!p) return;

        const totalNom = (p.schools || []).reduce((a, s) => a + (Number(s.nominal) || 0), 0);
        
        document.getElementById('breadcrumbPeriod').innerHTML = `
            <a data-action="show-summary">🏠 Summary</a>
            <span class="sep">›</span>
            <span class="current">📅 ${escapeHtml(p.name)}</span>
        `;

        const editorActions = auth.isSuperadmin() ? `
            <div class="card-actions">
                <button class="btn btn-icon edit" data-action="edit-period" data-id="${p.id}" title="Edit">✏️</button>
                <button class="btn btn-icon delete" data-action="delete-period" data-id="${p.id}" title="Hapus">🗑️</button>
            </div>
        ` : '';

        document.getElementById('periodHeader').innerHTML = `
            <div>
                <h2>📅 ${escapeHtml(p.name)}</h2>
                <p class="meta">
                    🏫 ${p.schools?.length || 0} Sekolah • 
                    💰 Total: ${formatRupiah(totalNom)}
                    ${p.description ? ' • ' + escapeHtml(p.description) : ''}
                </p>
            </div>
            ${editorActions}
        `;

        document.getElementById('periodActions').innerHTML = auth.isSuperadmin() 
            ? '<button class="btn btn-primary" data-action="open-school-modal">➕ Tambah Sekolah</button>'
            : '<div style="background:rgba(255,255,255,0.2); color:white; padding:10px 16px; border-radius:8px; font-size:13px;">👁️ Mode Viewer — Read Only</div>';

        const list = document.getElementById('schoolList');
        
        if (!p.schools || !p.schools.length) {
            list.innerHTML = `
                <div class="loading">
                    Belum ada data sekolah di periode ini.<br>
                    ${auth.isSuperadmin() 
                        ? '<button class="btn btn-primary btn-sm" data-action="open-school-modal" style="margin-top:15px;">➕ Tambah Sekolah Pertama</button>'
                        : '<small style="color:var(--gray);">🔒 Login sebagai <b>Superadmin</b> untuk menambah data</small>'}
                </div>
            `;
            return;
        }

        list.innerHTML = p.schools.map((s) => {
            const actionButtons = auth.isSuperadmin() ? `
                <div class="card-actions">
                    <button class="btn btn-icon edit" data-action="edit-school" data-id="${s.id}" title="Edit">✏️</button>
                    <button class="btn btn-icon delete" data-action="delete-school" data-id="${s.id}" title="Hapus">🗑️</button>
                </div>
            ` : '';
            
            return `
                <div class="school-card" data-action="show-detail" data-id="${s.id}">
                    ${actionButtons}
                    <h4>🏫 ${escapeHtml(s.sekolah_name)}</h4>
                    <div class="info">
                        <span>${escapeHtml(s.bank_name || '')} • ${escapeHtml(s.pic_name || '-')}</span>
                        <span class="nominal">${formatRupiah(s.nominal)}</span>
                    </div>
                </div>
            `;
        }).join('');
    }
};
