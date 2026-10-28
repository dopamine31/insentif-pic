// ============================================
// PERIOD VIEW (LIST SCHOOLS)
// ============================================
import { state } from '../state.js';
import { formatRupiah, escapeHtml } from '../utils/format.js';
import { SchoolModal } from '../modals/school-modal.js';

export const PeriodView = {
    render(idx) {
        const p = state.periods[idx];
        if (!p) return;

        const totalNom = (p.schools || []).reduce((a, s) => a + (Number(s.nominal) || 0), 0);
        
        document.getElementById('breadcrumbPeriod').innerHTML = `
            <a onclick="window.showSummary()">🏠 Summary</a>
            <span class="sep">›</span>
            <span class="current">📅 ${escapeHtml(p.name)}</span>
        `;

        document.getElementById('periodHeader').innerHTML = `
            <div>
                <h2>📅 ${escapeHtml(p.name)}</h2>
                <p class="meta">
                    🏫 ${p.schools?.length || 0} Sekolah • 
                    💰 Total: ${formatRupiah(totalNom)}
                    ${p.description ? ' • ' + escapeHtml(p.description) : ''}
                </p>
            </div>
            <div class="card-actions">
                <button class="btn btn-icon edit" onclick="window.editCurrentPeriod()" title="Edit">✏️</button>
                <button class="btn btn-icon delete" onclick="window.deleteCurrentPeriod()" title="Hapus">🗑️</button>
            </div>
        `;

        const list = document.getElementById('schoolList');
        if (!p.schools || !p.schools.length) {
            list.innerHTML = `
                <div class="loading">
                    Belum ada data sekolah di periode ini.<br>
                    <button class="btn btn-primary btn-sm" onclick="window.openSchoolModal()" style="margin-top:15px;">
                        ➕ Tambah Sekolah Pertama
                    </button>
                </div>
            `;
            return;
        }

        list.innerHTML = p.schools.map((s, i) => {
            const schoolJson = JSON.stringify(s).replace(/"/g, '&quot;');
            return `
                <div class="school-card" onclick='window.showDetail(${schoolJson})'>
                    <div class="card-actions" onclick="event.stopPropagation()">
                        <button class="btn btn-icon edit" onclick='window.editSchool(${schoolJson})' title="Edit">✏️</button>
                        <button class="btn btn-icon delete" onclick='window.deleteSchool(${schoolJson})' title="Hapus">🗑️</button>
                    </div>
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

window.editCurrentPeriod = () => {
    const p = state.getCurrentPeriod();
    if (p) {
        import('../modals/period-modal.js').then(({ PeriodModal }) => {
            PeriodModal.open(p.id);
        });
    }
};

window.deleteCurrentPeriod = async () => {
    const p = state.getCurrentPeriod();
    if (!p) return;
    if (!confirm('Yakin ingin menghapus periode ini?')) return;
    try {
        const { PeriodService } = await import('../services/period-service.js');
        await PeriodService.delete(p.id);
        const { toast } = await import('../utils/toast.js');
        toast('Periode dihapus', 'success');
        window.showSummary();
    } catch (err) {
        const { toast } = await import('../utils/toast.js');
        toast('Gagal menghapus: ' + err.message, 'error');
    }
};

window.openSchoolModal = () => {
    import('../modals/school-modal.js').then(({ SchoolModal }) => {
        SchoolModal.open();
    });
};

window.editSchool = (school) => {
    import('../modals/school-modal.js').then(({ SchoolModal }) => {
        SchoolModal.open(school);
    });
};

window.deleteSchool = async (school) => {
    if (!confirm(`Yakin ingin menghapus data ${school.sekolah_name}?`)) return;
    try {
        const { SchoolService } = await import('../services/school-service.js');
        await SchoolService.delete(school.id, school.transfer_proof_path);
        const { toast } = await import('../utils/toast.js');
        toast('Data dihapus', 'success');
        PeriodView.render(state.currentPeriodIdx);
    } catch (err) {
        const { toast } = await import('../utils/toast.js');
        toast('Gagal menghapus: ' + err.message, 'error');
    }
};
