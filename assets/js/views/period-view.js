// ============================================
// PERIOD VIEW
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

        const inactiveTag = !p.is_active ? '<span class="status-badge status-inactive" style="margin-left:8px;">Nonaktif</span>' : '';

        document.getElementById('periodHeader').innerHTML = `
            <div>
                <h2>📅 ${escapeHtml(p.name)}${inactiveTag}</h2>
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
            : `
                <div style="background:linear-gradient(135deg, #f1f5f9, #e2e8f0); padding:12px 18px; border-radius:12px; font-size:13px; color:#475569; font-weight:600; border:1px solid #cbd5e1; display:flex; align-items:center; gap:8px;">
                    <span style="font-size:18px;">🔒</span>
                    <div>
                        <div>Mode Viewer — Read Only</div>
                        <div style="font-size:11px; font-weight:400; color:#64748b; margin-top:2px;">Tidak dapat menambah, edit, atau hapus data</div>
                    </div>
                </div>
            `;

        const list = document.getElementById('schoolList');
        
        if (!p.schools || !p.schools.length) {
            list.innerHTML = `
                <div class="empty-state" style="grid-column: 1 / -1;">
                    <div class="empty-state-icon">🏫</div>
                    <div class="empty-state-title">Belum Ada Sekolah</div>
                    <div class="empty-state-text">
                        ${auth.isSuperadmin() 
                            ? 'Tambahkan sekolah pertama untuk periode ini.'
                            : 'Belum ada data sekolah di periode ini.'}
                    </div>
                    ${auth.isSuperadmin() 
                        ? '<button class="btn btn-primary" data-action="open-school-modal">➕ Tambah Sekolah Pertama</button>'
                        : ''}
                </div>
            `;
            return;
        }

        list.innerHTML = p.schools.map((s) => {
            const actionButtons = auth.isSuperadmin() ? `
                <div class="card-actions" onclick="event.stopPropagation()">
                    <button class="btn btn-icon edit" data-action="edit-school" data-id="${s.id}" title="Edit">✏️</button>
                    <button class="btn btn-icon delete" data-action="delete-school" data-id="${s.id}" title="Hapus">🗑️</button>
                </div>
            ` : '';
            
            const hasProof = s.transfer_proof_url ? '✅' : '📭';
            
            return `
                <div class="school-card" data-action="show-detail" data-id="${s.id}">
                    ${actionButtons}
                    <h4>${hasProof} ${escapeHtml(s.sekolah_name)}</h4>
                    <div class="info">
                        <span>${escapeHtml(s.bank_name || '')} • ${escapeHtml(s.pic_name || '-')}</span>
                        <span class="nominal">${formatRupiah(s.nominal)}</span>
                    </div>
                </div>
            `;
        }).join('');
    }
};
