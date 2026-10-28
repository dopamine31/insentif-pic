// ============================================
// DETAIL VIEW
// ============================================
import { state } from '../state.js';
import { auth } from '../auth.js';
import { formatRupiah, formatDate, escapeHtml } from '../utils/format.js';

export const DetailView = {
    render(school) {
        const p = state.getCurrentPeriod();
        if (!p || !school) return;

        document.getElementById('breadcrumbDetail').innerHTML = `
            <a data-action="show-summary">🏠 Summary</a>
            <span class="sep">›</span>
            <a data-action="show-period" data-idx="${state.currentPeriodIdx}">📅 ${escapeHtml(p.name)}</a>
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

        const detailActions = document.getElementById('detailActions');
        if (auth.isSuperadmin()) {
            detailActions.innerHTML = `
                <div style="display:flex; gap:8px;">
                    <button class="btn btn-icon edit" data-action="edit-school" data-id="${school.id}" title="Edit">✏️</button>
                    <button class="btn btn-icon delete" data-action="delete-school" data-id="${school.id}" title="Hapus">🗑️</button>
                </div>
            `;
        } else {
            detailActions.innerHTML = `
                <div style="background:linear-gradient(135deg, #f1f5f9, #e2e8f0); padding:10px 16px; border-radius:10px; font-size:12px; color:#475569; font-weight:600; display:flex; align-items:center; gap:6px;">
                    🔒 Read Only
                </div>
            `;
        }

        const ic = document.getElementById('imgContainer');
        if (school.transfer_proof_url) {
            const url = school.transfer_proof_url;
            ic.innerHTML = `<img src="${url}" class="bukti-img" data-action="open-zoom" data-src="${url}" loading="lazy">`;
        } else {
            ic.innerHTML = `
                <div class="no-image">
                    <div style="font-size:48px; margin-bottom:10px;">📭</div>
                    <div>Tidak ada bukti transfer</div>
                </div>
            `;
        }

        state.setCurrentSchool(school);
    }
};
