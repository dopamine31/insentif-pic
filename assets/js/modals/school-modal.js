// ============================================
// SCHOOL MODAL
// FIX: No. urut otomatis (tidak perlu input)
// ============================================
import { SchoolService } from '../services/school-service.js';
import { state } from '../state.js';
import { toast } from '../utils/toast.js';
import { auth } from '../auth.js';
import { Loader } from '../app.js';

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
            // No. urut akan di-generate otomatis saat save
        }

        modal.classList.add('active');
    },

    async compressImage(file, maxWidth = 1200, quality = 0.8) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = new Image();
                img.onload = () => {
                    let width = img.width;
                    let height = img.height;
                    
                    if (width > maxWidth) {
                        height = Math.round((height * maxWidth) / width);
                        width = maxWidth;
                    }

                    const canvas = document.createElement('canvas');
                    canvas.width = width;
                    canvas.height = height;
                    
                    const ctx = canvas.getContext('2d');
                    ctx.imageSmoothingEnabled = true;
                    ctx.imageSmoothingQuality = 'high';
                    ctx.drawImage(img, 0, 0, width, height);
                    
                    canvas.toBlob(
                        (blob) => {
                            if (!blob) {
                                reject(new Error('Gagal compress gambar'));
                                return;
                            }
                            const compressedFile = new File([blob], file.name.replace(/\.[^.]+$/, '.jpg'), {
                                type: 'image/jpeg',
                                lastModified: Date.now()
                            });
                            resolve(compressedFile);
                        },
                        'image/jpeg',
                        quality
                    );
                };
                img.onerror = () => reject(new Error('Gagal load gambar'));
                img.src = e.target.result;
            };
            reader.onerror = () => reject(new Error('Gagal baca file'));
            reader.readAsDataURL(file);
        });
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
                `${file.name} (${(file.size/1024).toFixed(1)} KB) - Auto-compress saat save`;
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

        // NO URUT OTOMATIS - dihitung dari jumlah sekolah existing
        const period = state.periods.find(p => p.id === periodId);
        const existingSchools = period?.schools || [];
        let autoNoUrut;
        
        if (id) {
            // Edit - pertahankan no_urut existing
            const existing = existingSchools.find(s => s.id === id);
            autoNoUrut = existing?.no_urut || 1;
        } else {
            // Create - auto increment dari max existing
            const maxNo = existingSchools.reduce((max, s) => Math.max(max, s.no_urut || 0), 0);
            autoNoUrut = maxNo + 1;
        }

        const data = {
            period_id: periodId,
            no_urut: autoNoUrut, // AUTO-GENERATED
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
            submitBtn.innerHTML = '<span class="btn-loader"></span> Menyimpan...';

            // COMPRESS IMAGE jika ada file baru
            let fileToUpload = null;
            if (this.currentFile) {
                Loader.show('Mengompres gambar...');
                try {
                    const originalSize = this.currentFile.size;
                    fileToUpload = await this.compressImage(this.currentFile);
                    const compressedSize = fileToUpload.size;
                    const reduction = ((originalSize - compressedSize) / originalSize * 100).toFixed(0);
                    console.log(`Image compressed: ${(originalSize/1024).toFixed(0)}KB → ${(compressedSize/1024).toFixed(0)}KB (${reduction}% smaller)`);
                } catch (err) {
                    console.warn('Compression failed, using original:', err);
                    fileToUpload = this.currentFile;
                }
                Loader.show('Mengunggah data...');
            }

            if (id) {
                const existing = existingSchools.find(s => s.id === id);
                await SchoolService.update(
                    id, 
                    data, 
                    fileToUpload, 
                    existing?.transfer_proof_path
                );
                toast(`Data diperbarui (No. ${autoNoUrut}) 💕`, 'success');
            } else {
                await SchoolService.create(data, fileToUpload);
                toast(`Sekolah ditambahkan sebagai No. ${autoNoUrut} 💕`, 'success');
            }

            document.getElementById('schoolModal').classList.remove('active');
            
            // AUTO-REFRESH dengan navigate ke view aktif
            if (window.app) {
                await window.app.refreshAndShow('period');
            } else {
                await state.loadPeriods();
            }
        } catch (err) {
            toast('Gagal menyimpan: ' + err.message, 'error');
            Loader.hide();
        } finally {
            const submitBtn = e.target.querySelector('button[type="submit"]');
            submitBtn.disabled = false;
            submitBtn.innerHTML = '💾 Simpan';
            this.currentFile = null;
        }
    }
};
