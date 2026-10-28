// ============================================
// SUMMARY VIEW
// FIX: Tombol edit sekarang berfungsi (tidak stopPropagation)
// FEATURE: Tanggal range ditampilkan di kartu
// ============================================
import { state } from '../state.js';
import { auth } from '../auth.js';
import { formatRupiah, escapeHtml, formatDate } from '../utils/format.js';

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
            
            // FIX: Tidak ada stopPropagation lagi - event bubbling normal
            const actionButtons = auth.isSuperadmin() ? `
                <div class="card-actions">
                    <button class="btn btn-icon edit" data-action="edit-period" data-id="${periodId}" title="Edit Periode">✏️</button>
                    <button class="btn btn-icon delete" data-action="delete-period" data-id="${periodId}" title="Hapus Periode">🗑️</button>
                </div>
            ` : '';

            const inactiveTag = !p.is_active ? '<span class="status-badge status-inactive">Nonaktif</span>' : '';
            
            // TANGGAL DI KARTU - Format profesional
            const dateRange = this.formatDateRange(p.start_date, p.end_date);

            return `
                <div class="period-card" data-action="show-period" data-idx="${i}">
                    ${actionButtons}
                    <div class="icon">📅</div>
                    <h3>${escapeHtml(p.name)}${inactiveTag}</h3>
                    ${dateRange}
                    <div class="meta">
                        <span>🏫 ${schoolCount} Sekolah</span>
                        <span>💕 ${schoolCount > 0 ? 'Aktif' : 'Kosong'}</span>
                    </div>
                    <div class="total-nominal">${formatRupiah(totalNom)}</div>
                </div>
            `;
        }).join('');
    },

    /**
     * Format range tanggal dengan pattern professional (seperti Stripe/Airbnb)
     */
    formatDateRange(start, end) {
        if (!start && !end) {
            return `
                <div class="period-date-range">
                    <span class="date-icon">📆</span>
                    <div class="date-text">
                        <span class="date-main">Tanggal Belum Diatur</span>
                        <span class="date-sub">Periode fleksibel</span>
                    </div>
                </div>
            `;
        }
        
        if (start && !end) {
            const startDate = new Date(start);
            const mainDate = startDate.toLocaleDateString('id-ID', { 
                day: 'numeric', month: 'short', year: 'numeric' 
            });
            return `
                <div class="period-date-range">
                    <span class="date-icon">📅</span>
                    <div class="date-text">
                        <span class="date-main">Mulai ${mainDate}</span>
                        <span class="date-sub">Tanggal mulai saja</span>
                    </div>
                </div>
            `;
        }
        
        if (!start && end) {
            const endDate = new Date(end);
            const mainDate = endDate.toLocaleDateString('id-ID', { 
                day: 'numeric', month: 'short', year: 'numeric' 
            });
            return `
                <div class="period-date-range">
                    <span class="date-icon">🏁</span>
                    <div class="date-text">
                        <span class="date-main">Berakhir ${mainDate}</span>
                        <span class="date-sub">Tanggal akhir saja</span>
                    </div>
                </div>
            `;
        }
        
        // Both dates - range
        const startDate = new Date(start);
        const endDate = new Date(end);
        const sameYear = startDate.getFullYear() === endDate.getFullYear();
        const sameMonth = sameYear && startDate.getMonth() === endDate.getMonth();
        
        let mainDate;
        if (sameMonth) {
            mainDate = `${startDate.getDate()} - ${endDate.getDate()} ${startDate.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}`;
        } else if (sameYear) {
            mainDate = `${startDate.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })} - ${endDate.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}`;
        } else {
            mainDate = `${startDate.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })} - ${endDate.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}`;
        }
        
        const diffTime = Math.abs(endDate - startDate);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
        const durationText = diffDays === 1 ? '1 hari' : `${diffDays} hari`;
        
        return `
            <div class="period-date-range">
                <span class="date-icon">📅</span>
                <div class="date-text">
                    <span class="date-main">${mainDate}</span>
                    <span class="date-sub">Durasi: ${durationText}</span>
                </div>
            </div>
        `;
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
