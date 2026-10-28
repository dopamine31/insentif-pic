// ============================================
// SUMMARY VIEW RENDERER
// ============================================
import { state } from '../state.js';
import { formatRupiah, escapeHtml } from '../utils/format.js';
import { PeriodModal } from '../modals/period-modal.js';

export const SummaryView = {
    render() {
        const totalPeriods = state.periods.length;
        const totalSchools = state.getTotalSchools();
        const grandTotal = state.getGrandTotal();

        const summaryTotal = document.getElementById('summaryTotal');
        summaryTotal.innerHTML = `
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
                    <button class="btn btn-primary btn-sm" onclick="window.openPeriodModal()" style="margin-top:15px;">
                        ➕ Buat Periode Pertama
                    </button>
                </div>
            `;
            return;
        }

        list.innerHTML = state.periods.map((p, i) => {
            const schoolCount = p.schools?.length || 0;
            const totalNom = (p.schools || []).reduce((a, s) => a + (Number(s.nominal) || 0), 0);
            const periodId = p.id;
            return `
                <div class="period-card" onclick="window.showPeriod(${i})">
                    <div class="card-actions" onclick="event.stopPropagation()">
                        <button class="btn btn-icon edit" onclick="window.editPeriod('${periodId}')" title="Edit">✏️</button>
                        <button class="btn btn-icon delete" onclick="window.deletePeriod('${periodId}')" title="Hapus">🗑️</button>
                    </div>
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

// Expose globals (dipanggil dari HTML)
window.openPeriodModal = () => PeriodModal.open();
window.editPeriod = (id) => PeriodModal.open(id);
window.deletePeriod = async (id) => {
    if (!confirm('Yakin ingin menghapus periode ini? Semua data sekolah di dalamnya juga akan dihapus.')) return;
    try {
        const { PeriodService } = await import('../services/period-service.js');
        await PeriodService.delete(id);
        const { toast } = await import('../utils/toast.js');
        toast('Periode dihapus', 'success');
        SummaryView.render();
    } catch (err) {
        const { toast } = await import('../utils/toast.js');
        toast('Gagal menghapus: ' + err.message, 'error');
    }
};
