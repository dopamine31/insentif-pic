// ============================================
// SUMMARY VIEW
// ============================================
import { state } from '../state.js';
import { auth } from '../auth.js';
import { formatRupiah, escapeHtml } from '../utils/format.js';

export const SummaryView = {
    render() {
        const totalPeriods = state.periods.length;
        const totalSchools = state.getTotalSchools();
        const grandTotal = state.getGrandTotal();

        document.getElementById('summaryTotal').innerHTML = `
            <div class="total-item">
                <div class="label">📊 Total Periode</div>
                <div class="value">${totalPeriods}</div>
            </div>
            <div class="total-item">
                <div class="label">🏫 Total Sekolah</div>
                <div class="value">${totalSchools}</div>
            </div>
            <div class="total-item nominal">
                <div class="label">💰 Grand Total</div>
                <div class="value">${formatRupiah(grandTotal)}</div>
            </div>
        `;

        const list = document.getElementById('periodList');
        
        if (state.loading) {
            list.innerHTML = this.renderSkeleton(3);
            return;
        }

        if (!state.periods.length) {
            list.innerHTML = `
                <div class="empty-state" style="grid-column: 1 / -1;">
                    <div class="empty-state-icon">📅</div>
                    <div class="empty-state-title">Belum Ada Periode</div>
                    <div class="empty-state-text">
                        ${auth.isSuperadmin() 
                            ? 'Mulai dengan membuat periode pertama untuk mencatat insentif.'
                            : 'Belum ada data yang tersedia. Hubungi Superadmin.'}
                    </div>
                    ${auth.isSuperadmin() 
                        ? '<button class="btn btn-primary" data-action="open-period-modal">➕ Buat Periode Pertama</button>' 
                        : ''}
                </div>
            `;
            return;
        }

        list.innerHTML = state.periods.map((p, i) => {
            const schoolCount = p.schools?.length || 0;
            const totalNom = (p.schools || []).reduce((a, s) => a + (Number(s.nominal) || 0), 0);
            const periodId = p.id;
            
            const actionButtons = auth.isSuperadmin() ? `
                <div class="card-actions" onclick="event.stopPropagation()">
                    <button class="btn btn-icon edit" data-action="edit-period" data-id="${periodId}" title="Edit">✏️</button>
                    <button class="btn btn-icon delete" data-action="delete-period" data-id="${periodId}" title="Hapus">🗑️</button>
                </div>
            ` : '';

            const inactiveTag = !p.is_active ? '<span class="status-badge status-inactive" style="margin-left:8px;">Nonaktif</span>' : '';

            return `
                <div class="period-card" data-action="show-period" data-idx="${i}">
                    ${actionButtons}
                    <div class="icon">📅</div>
                    <h3>${escapeHtml(p.name)}${inactiveTag}</h3>
                    <div class="meta">
                        <span>🏫 ${schoolCount} Sekolah</span>
                        <span>${p.start_date ? new Date(p.start_date).toLocaleDateString('id-ID') : ''}</span>
                    </div>
                    <div class="total-nominal">${formatRupiah(totalNom)}</div>
                </div>
            `;
        }).join('');
    },

    renderSkeleton(count = 3) {
        return Array(count).fill(0).map(() => `
            <div class="skeleton-card">
                <div class="skeleton skeleton-title"></div>
                <div class="skeleton skeleton-line"></div>
                <div class="skeleton skeleton-line short"></div>
                <div class="skeleton skeleton-line" style="margin-top:20px; height:20px;"></div>
            </div>
        `).join('');
    }
};
