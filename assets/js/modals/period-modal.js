// ============================================
// PERIOD MODAL (CREATE/EDIT)
// ============================================
import { PeriodService } from '../services/period-service.js';
import { state } from '../state.js';
import { toast } from '../utils/toast.js';

export const PeriodModal = {
    open(id = null) {
        const modal = document.getElementById('periodModal');
        const form = modal.querySelector('form');
        form.reset();
        document.getElementById('periodId').value = '';
        document.getElementById('periodActive').checked = true;

        if (id) {
            const p = state.periods.find(x => x.id === id);
            if (p) {
                document.getElementById('periodModalTitle').innerText = '✏️ Edit Periode';
                document.getElementById('periodId').value = p.id;
                document.getElementById('periodName').value = p.name || '';
                document.getElementById('periodStart').value = p.start_date || '';
                document.getElementById('periodEnd').value = p.end_date || '';
                document.getElementById('periodDesc').value = p.description || '';
                document.getElementById('periodActive').checked = p.is_active;
            }
        } else {
            document.getElementById('periodModalTitle').innerText = '➕ Periode Baru';
        }

        modal.classList.add('active');
    },

    async save(e) {
        e.preventDefault();
        const id = document.getElementById('periodId').value;
        const payload = {
            name: document.getElementById('periodName').value.trim(),
            start_date: document.getElementById('periodStart').value || null,
            end_date: document.getElementById('periodEnd').value || null,
            description: document.getElementById('periodDesc').value.trim() || null,
            is_active: document.getElementById('periodActive').checked
        };

        if (!payload.name) {
            toast('Nama periode wajib diisi', 'error');
            return;
        }

        try {
            const submitBtn = e.target.querySelector('button[type="submit"]');
            submitBtn.disabled = true;
            submitBtn.innerText = '⏳ Menyimpan...';

            if (id) {
                await PeriodService.update(id, payload);
                toast('Periode diperbarui', 'success');
            } else {
                await PeriodService.create(payload);
                toast('Periode ditambahkan', 'success');
            }

            document.getElementById('periodModal').classList.remove('active');
        } catch (err) {
            toast('Gagal menyimpan: ' + err.message, 'error');
        } finally {
            const submitBtn = e.target.querySelector('button[type="submit"]');
            submitBtn.disabled = false;
            submitBtn.innerText = '💾 Simpan';
        }
    }
};

// Expose ke window
window.savePeriod = (e) => PeriodModal.save(e);
window.closeModal = (id) => document.getElementById(id).classList.remove('active');
