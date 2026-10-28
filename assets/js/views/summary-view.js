// ============================================
// SUMMARY VIEW - RENDER PERIODS LIST
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
            list.innerHTML = '<div class="loading">Memuat data...</div>';
            return;
        }

        if (!state.periods.length) {
            list.innerHTML = `
                <div class="loading">
                    Belum ada periode.<br>
                    ${auth.isSuperadmin() 
                        ? '<button class="btn btn-primary btn-sm" data-action="open-period-modal" style="margin-top:15px;">➕ Buat Periode Pertama</button>' 
                        : '<small style="color:var(--gray);">🔒 Login sebagai <b>Superadmin</b> untuk menambah data</small>'}
                </div>
            `;
            return;
        }

        list.innerHTML = state.periods.map((p, i) => {
            const schoolCount = p.schools?.length || 0;
            const totalNom = (p.schools || []).reduce((a, s) => a + (Number(s.nominal) || 0), 0);
            const periodId = p.id;
            
            const actionButtons = auth.isSuperadmin() ? `
                <div class="card-actions">
                    <button class="btn btn-icon edit" data-action="edit-period" data-id="${periodId}" title="Edit">✏️</button>
                    <button class="btn btn-icon delete" data-action="delete-period" data-id="${periodId}" title="Hapus">🗑️</button>
                </div>
            ` : '';

            return `
                <div class="period-card" data-action="show-period" data-idx="${i}">
                    ${actionButtons}
                    <div class="icon">📅</div>
                    <h3>${escapeHtml(p.name)}</h3>
                    <div class="meta">
                        <span>🏫 ${schoolCount} Sekolah</span>
                        <span>${p.start_date ? new Date(p.start_date).toLocaleDateString('id-ID') : ''}</span>
                    </div>
                    <div class="total-nominal">${formatRupiah(totalNom)}</div>
                </div>
            `;
        }).join('');
    }
};
