// ============================================
// DETAIL VIEW (SINGLE SCHOOL)
// ============================================
import { state } from '../state.js';
import { formatRupiah, formatDate, escapeHtml } from '../utils/format.js';

export const DetailView = {
    render(school) {
        const p = state.getCurrentPeriod();
        if (!p || !school) return;

        document.getElementById('breadcrumbDetail').innerHTML = `
            <a onclick="window.showSummary()">🏠 Summary</a>
            <span class="sep">›</span>
            <a onclick="window.showPeriod(${state.currentPeriodIdx})">📅 ${escapeHtml(p.name)}</a>
            <span class="sep">›</span>
            <span class="current">🏫 ${escapeHtml(school.sekolah_name)}</span>
        `;

        document.getElementById('detailSekolah').innerText = school.sekolah_name;
        document.getElementById('detailNo').innerText = `Data No. ${school.no_urut || '-'} • ${p.name}`;
        document.getElementById('detailPIC').innerText = school.pic_name || '-';
        document.getElementById('detailBank').innerText = school.bank_name || '-';
        document.getElementById('detailRek').innerText = school.account_number || '-';
        document.getElementById('detailNom').innerText = formatRupiah(school.nominal);
        document.getElementById('detailDate').innerText = formatDate(school.transfer_date);
        document.getElementById('detailNotes').innerText = school.notes || '-';

        const ic = document.getElementById('imgContainer');
        if (school.transfer_proof_url) {
            const url = school.transfer_proof_url;
            ic.innerHTML = `<img src="${url}" class="bukti-img" onclick="window.openZoom('${url}')">`;
        } else {
            ic.innerHTML = '<div class="no-image">📭 Tidak ada bukti transfer</div>';
        }

        state.setCurrentSchool(school);
    }
};

window.openZoom = (src) => {
    document.getElementById('zoomImg').src = src;
    document.getElementById('zoomModal').classList.add('active');
};

window.closeZoom = () => {
    document.getElementById('zoomModal').classList.remove('active');
};

// ESC untuk tutup zoom
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        window.closeZoom();
        document.querySelectorAll('.modal-overlay.active').forEach(m => m.classList.remove('active'));
    }
});
