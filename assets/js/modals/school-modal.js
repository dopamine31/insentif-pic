// ============================================
// SCHOOL MODAL - DENGAN AUTO-LINK REKENING
// ============================================
import { SchoolService } from '../services/school-service.js';
import { BankAccountService } from '../services/bank-account-service.js';
import { state } from '../state.js';
import { toast } from '../utils/toast.js';
import { auth } from '../auth.js';
import { Loader } from '../app.js';

export const SchoolModal = {
    currentFile: null,
    bankAccounts: [],
    linkedAccountId: null,

    async open(school = null) {
        if (!auth.isSuperadmin()) {
            toast('⛔ Hanya Superadmin', 'warning');
            return;
        }

        // Load bank accounts untuk dropdown
        await this.loadBankAccounts();

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
        this.linkedAccountId = null;

        // Render dropdown
        this.renderLinkedAccountDropdown();

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
            
            // Set linked account dropdown
            this.linkedAccountId = school.bank_account_id || null;
            const dropdown = document.getElementById('schoolLinkedAccount');
            if (dropdown && this.linkedAccountId) {
                dropdown.value = this.linkedAccountId;
            }
            
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

    async loadBankAccounts() {
        try {
            this.bankAccounts = await BankAccountService.getActiveAccounts();
        } catch (err) {
            console.error('Load bank accounts failed:', err);
            this.bankAccounts = [];
        }
    },

    renderLinkedAccountDropdown() {
        // Create dropdown jika belum ada
        let dropdown = document.getElementById('schoolLinkedAccount');
        if (!dropdown) {
            // Insert setelah schoolName
            const schoolNameGroup = document.getElementById('schoolName').closest('.form-group');
            const wrapper = document.createElement('div');
            wrapper.className = 'form-group';
            wrapper.innerHTML = `
                <label>
                    🔗 Link ke Rekening Tersimpan 
                    <small>(auto-fill data dari daftar rekening)</small>
                </label>
                <select id="schoolLinkedAccount">
                    <option value="">-- Input manual --</option>
                </select>
            `;
            schoolNameGroup.parentNode.insertBefore(wrapper, schoolNameGroup.nextSibling);
            dropdown = document.getElementById('schoolLinkedAccount');
            
            // Attach event listener
            dropdown.addEventListener('change', (e) => this.onLinkedAccountChange(e));
        }
        
        // Populate options
        dropdown.innerHTML = '<option value="">-- Input manual --</option>' +
            this.bankAccounts.map(a => {
                const schoolName = a.schools?.sekolah_name ? ` (${a.schools.sekolah_name})` : '';
                const typeLabel = this.getTypeLabel(a.account_type);
                return `<option value="${a.id}">${a.account_name} - ${a.bank_name} ${a.account_number} ${typeLabel}${schoolName}</option>`;
            }).join('');
    },

    getTypeLabel(type) {
        const types = {
            personal: '👤',
            school: '🏫',
            operational: '🏢',
            vendor: '🛒',
            ewallet: '📱'
        };
        return types[type] || '';
    },

    onLinkedAccountChange(e) {
        const accountId = e.target.value;
        if (!accountId) {
            this.linkedAccountId = null;
            return;
        }
        
        const account = this.bankAccounts.find(a => a.id === accountId);
        if (!account) return;
        
        this.linkedAccountId = accountId;
        
        // Auto-fill form
        document.getElementById('schoolPIC').value = account.account_name || '';
        document.getElementById('schoolBank').value = account.bank_name || '';
        document.getElementById('schoolRek').value = account.account_number || '';
        
        toast(`✅ Data terisi dari rekening ${account.account_name}`, 'success');
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

        // Auto no_urut
        const period = state.periods.find(p => p.id === periodId);
        const existingSchools = period?.schools || [];
        let autoNoUrut;
        
        if (id) {
            const existing = existingSchools.find(s => s.id === id);
            autoNoUrut = existing?.no_urut || 1;
        } else {
            const maxNo = existingSchools.reduce((max, s) => Math.max(max, s.no_urut || 0), 0);
            autoNoUrut = maxNo + 1;
        }

        // Try auto-match dengan bank account berdasarkan input user
        const inputBank = document.getElementById('schoolBank').value.trim();
        const inputRek = document.getElementById('schoolRek').value.trim();
        
        let bankAccountId = this.linkedAccountId;
        
        if (!bankAccountId && inputBank && inputRek) {
            // Cari matching otomatis
            const match = await BankAccountService.findMatching(inputBank, inputRek);
            if (match) {
                bankAccountId = match.id;
            }
        }

        const data = {
            period_id: periodId,
            no_urut: autoNoUrut,
            sekolah_name: document.getElementById('schoolName').value.trim(),
            pic_name: document.getElementById('schoolPIC').value.trim(),
            bank_name: inputBank,
            account_number: inputRek,
            nominal: parseInt(document.getElementById('schoolNom').value) || 0,
            transfer_date: document.getElementById('schoolDate').value || null,
            notes: document.getElementById('schoolNotes').value.trim() || null,
            bank_account_id: bankAccountId || null
        };

        if (!data.sekolah_name || !data.pic_name || !data.bank_name) {
            toast('Mohon lengkapi field wajib', 'error');
            return;
        }

        try {
            const submitBtn = e.target.querySelector('button[type="submit"]');
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<span class="btn-loader"></span> Menyimpan...';

            let fileToUpload = null;
            if (this.currentFile) {
                Loader.show('Mengompres gambar...');
                try {
                    fileToUpload = await this.compressImage(this.currentFile);
                } catch (err) {
                    console.warn('Compression failed:', err);
                    fileToUpload = this.currentFile;
                }
                Loader.show('Mengunggah data...');
            }

            if (id) {
                const existing = existingSchools.find(s => s.id === id);
                await SchoolService.update(id, data, fileToUpload, existing?.transfer_proof_path);
                toast(`Data diperbarui 💕${bankAccountId ? ' (linked ke rekening)' : ''}`, 'success');
            } else {
                await SchoolService.create(data, fileToUpload);
                toast(`Sekolah ditambahkan 💕${bankAccountId ? ' (linked ke rekening)' : ''}`, 'success');
            }

            document.getElementById('schoolModal').classList.remove('active');
            
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
