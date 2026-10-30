// ============================================
// BANK ACCOUNT MODAL
// ============================================
import { BankAccountService } from '../services/bank-account-service.js';
import { state } from '../state.js';
import { toast } from '../utils/toast.js';
import { auth } from '../auth.js';
import { Loader } from '../app.js';
import { BankAccountsView } from '../views/bank-accounts-view.js';

export const BankAccountModal = {
    schools: [],

    async open(id = null) {
        if (!auth.isSuperadmin()) {
            toast('⛔ Hanya Superadmin', 'warning');
            return;
        }

        const modal = document.getElementById('bankAccountModal');
        const form = modal.querySelector('form');
        form.reset();
        document.getElementById('bankAccountId').value = '';
        document.getElementById('bankAccountActive').checked = true;
        document.getElementById('bankAccountPrimary').checked = false;
        document.getElementById('bankAccountType').value = 'personal';

        // Load schools untuk dropdown
        await this.loadSchoolsDropdown();

        if (id) {
            const account = BankAccountsView.accounts.find(a => a.id === id);
            if (account) {
                document.getElementById('bankAccountModalTitle').innerText = '✏️ Edit Rekening';
                document.getElementById('bankAccountId').value = account.id;
                document.getElementById('bankAccountName').value = account.account_name || '';
                document.getElementById('bankAccountBank').value = account.bank_name || '';
                document.getElementById('bankAccountNumber').value = account.account_number || '';
                document.getElementById('bankAccountType').value = account.account_type || 'personal';
                document.getElementById('bankAccountBranch').value = account.branch || '';
                document.getElementById('bankAccountNotes').value = account.notes || '';
                document.getElementById('bankAccountSchool').value = account.school_id || '';
                document.getElementById('bankAccountActive').checked = account.is_active;
                document.getElementById('bankAccountPrimary').checked = account.is_primary;
            }
        } else {
            document.getElementById('bankAccountModalTitle').innerText = '➕ Tambah Rekening';
        }

        modal.classList.add('active');
    },

    async loadSchoolsDropdown() {
        const select = document.getElementById('bankAccountSchool');
        try {
            this.schools = await BankAccountService.getAllSchools();
            select.innerHTML = '<option value="">-- Tidak ada --</option>' +
                this.schools.map(s => {
                    const periodName = s.periods?.name || '';
                    return `<option value="${s.id}">${s.sekolah_name}${periodName ? ' (' + periodName + ')' : ''}</option>`;
                }).join('');
        } catch (err) {
            console.error('Load schools for dropdown failed:', err);
        }
    },

    async save(e) {
        e.preventDefault();
        
        if (!auth.isSuperadmin()) {
            toast('⛔ Hanya Superadmin', 'warning');
            return;
        }

        const id = document.getElementById('bankAccountId').value;
        const payload = {
            account_name: document.getElementById('bankAccountName').value.trim(),
            bank_name: document.getElementById('bankAccountBank').value.trim(),
            account_number: document.getElementById('bankAccountNumber').value.trim(),
            account_type: document.getElementById('bankAccountType').value,
            branch: document.getElementById('bankAccountBranch').value.trim() || null,
            notes: document.getElementById('bankAccountNotes').value.trim() || null,
            school_id: document.getElementById('bankAccountSchool').value || null,
            is_active: document.getElementById('bankAccountActive').checked,
            is_primary: document.getElementById('bankAccountPrimary').checked
        };

        if (!payload.account_name || !payload.bank_name || !payload.account_number) {
            toast('Mohon lengkapi field wajib', 'error');
            return;
        }

        try {
            const submitBtn = e.target.querySelector('button[type="submit"]');
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<span class="btn-loader"></span> Menyimpan...';

            if (id) {
                await BankAccountService.update(id, payload);
                toast('Rekening diperbarui 💕', 'success');
            } else {
                await BankAccountService.create(payload);
                toast('Rekening ditambahkan 💕', 'success');
            }

            document.getElementById('bankAccountModal').classList.remove('active');
            await BankAccountsView.load();
        } catch (err) {
            toast('Gagal menyimpan: ' + err.message, 'error');
        } finally {
            const submitBtn = e.target.querySelector('button[type="submit"]');
            submitBtn.disabled = false;
            submitBtn.innerHTML = '💾 Simpan';
        }
    }
};
