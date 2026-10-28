// ============================================
// SCHOOL MODAL - CREATE/EDIT FORM + UPLOAD
// ============================================
import { SchoolService } from '../services/school-service.js';
import { state } from '../state.js';
import { toast } from '../utils/toast.js';
import { auth } from '../auth.js';

export const SchoolModal = {
    currentFile: null,

    open(school = null) {
        if (!auth.isSuperadmin()) {
            toast('⛔ Hanya Superadmin', 'warning');
            return;
        }

        const modal = document.getElementById('schoolModal');
        const form = modal.querySelector('form');
        form.reset();
        document.getElementById('schoolId').value = '';
        document.getElementById('schoolPeriodId').value = state.getCurrentPeriod()?.id || '';
        document.getElementById('schoolFile').value = '';
        document.getElementById('filePreview').classList.add('hidden');
        document.getElementById('fileUploadLabel').classList.remove('has-file');
        document.getElementById('fileInfo').innerText = '';
        this.currentFile = null;

        if (school) {
            document.getElementById('schoolModalTitle').innerText = '✏️ Edit Sekolah';
            document.getElementById('schoolId').value = school.id;
            document.getElementById('schoolPeriodId').value = school.period_id;
            document.getElementById('schoolNo').value = school.no_urut || 1;
            document.getElementById('schoolName').value = school.sekolah_name || '';
            document.getElementById('schoolPIC').value = school.pic_name || '';
            document.getElementById('schoolBank').value = school.bank_name || '';
            document.getElementById('schoolRek').value = school.account_number || '';
            document.getElementById('schoolNom').value = school.nominal || 0;
            document.getElementById('schoolDate').value = school.transfer_date || '';
            document.getElementById('schoolNotes').value = school.notes || '';
            
            if (school.transfer_proof_url) {
                document.getElementById('filePreview').src = school.transfer_proof_url;
                document.getElementById('filePreview').classList.remove('hidden');
                document.getElementById('fileInfo').innerText = 'Pilih file baru untuk mengganti.';
            }
        } else {
            document.getElementById('schoolModalTitle').innerText = '➕ Tambah Sekolah';
        }

        modal.classList.add('active');
    },

    previewFile(e) {
        const file = e.target.files[0];
        if (!file) return;
        
        if (!file.type.startsWith('image/')) {
            toast('File harus berupa gambar', 'error');
            e.target.value = '';
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            toast('Ukuran file maksimal 5MB', 'error');
            e.target.value = '';
            return;
        }

        this.currentFile = file;
        const reader = new FileReader();
        reader.onload = (ev) => {
            document.getElementById('filePreview').src = ev.target.result;
            document.getElementById('filePreview').classList.remove('hidden');
            document.getElementById('fileUploadLabel').classList.add('has-file');
            document.getElementById('fileInfo').innerText = 
                `${file.name} (${(file.size/1024).toFixed(1)} KB)`;
        };
        reader.readAsDataURL(file);
    },

    async save(e) {
        e.preventDefault();
        
        if (!auth.isSuperadmin()) {
            toast('⛔ Hanya Superadmin', 'warning');
            return;
        }

        const id = document.getElementById('schoolId').value;
        const periodId = document.getElementById('schoolPeriodId').value;

        const data = {
            period_id: periodId,
            no_urut: parseInt(document.getElementById('schoolNo').value) || 1,
            sekolah_name: document.getElementById('schoolName').value.trim(),
            pic_name: document.getElementById('schoolPIC').value.trim(),
            bank_name: document.getElementById('schoolBank').value.trim(),
            account_number: document.getElementById('schoolRek').value.trim(),
            nominal: parseInt(document.getElementById('schoolNom').value) || 0,
            transfer_date: document.getElementById('schoolDate').value || null,
            notes: document.getElementById('schoolNotes').value.trim() || null
        };

        if (!data.sekolah_name || !data.pic_name || !data.bank_name) {
            toast('Mohon lengkapi field wajib', 'error');
            return;
        }

        try {
            const submitBtn = e.target.querySelector('button[type="submit"]');
            submitBtn.disabled = true;
            submitBtn.innerText = '⏳ Menyimpan...';

            if (id) {
                const existing = state.periods
                    .flatMap(p => p.schools || [])
                    .find(s => s.id === id);
                await SchoolService.update(
                    id, 
                    data, 
                    this.currentFile, 
                    existing?.transfer_proof_path
                );
                toast('Data sekolah diperbarui', 'success');
            } else {
                await SchoolService.create(data, this.currentFile);
                toast('Data sekolah ditambahkan', 'success');
            }

            document.getElementById('schoolModal').classList.remove('active');
            await state.loadPeriods();
        } catch (err) {
            toast('Gagal menyimpan: ' + err.message, 'error');
        } finally {
            const submitBtn = e.target.querySelector('button[type="submit"]');
            submitBtn.disabled = false;
            submitBtn.innerText = '💾 Simpan';
        }
    }
};
