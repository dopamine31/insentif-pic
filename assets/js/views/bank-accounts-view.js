// ============================================
// BANK ACCOUNTS VIEW
// FEATURE: Table / Grid / Cards view toggle
//          Search, Filter, Sort, Copy-to-clipboard
// ============================================
import { BankAccountService } from '../services/bank-account-service.js';
import { auth } from '../auth.js';
import { escapeHtml } from '../utils/format.js';
import { toast } from '../utils/toast.js';

export const BankAccountsView = {
    accounts: [],
    filteredAccounts: [],
    currentView: 'table',
    searchTerm: '',
    typeFilter: '',
    statusFilter: '',
    sortField: 'account_name',
    sortDirection: 'asc',
    viewKey: 'bank_accounts_view_pref',

    async init() {
        this.loadPreferences();
        await this.load();
        this.setupEventListeners();
    },

    loadPreferences() {
        const saved = localStorage.getItem(this.viewKey);
        if (saved) {
            try {
                const prefs = JSON.parse(saved);
                this.currentView = prefs.view || 'table';
            } catch {}
        }
    },

    savePreferences() {
        localStorage.setItem(this.viewKey, JSON.stringify({
            view: this.currentView
        }));
    },

    setupEventListeners() {
        // Search
        const searchInput = document.getElementById('bankSearch');
        if (searchInput && !searchInput.dataset.listenerAttached) {
            searchInput.dataset.listenerAttached = 'true';
            searchInput.addEventListener('input', (e) => {
                this.searchTerm = e.target.value.toLowerCase();
                document.getElementById('bankSearchClear').classList.toggle('hidden', !this.searchTerm);
                this.applyFilters();
            });
        }

        // Type filter
        const typeFilter = document.getElementById('bankTypeFilter');
        if (typeFilter && !typeFilter.dataset.listenerAttached) {
            typeFilter.dataset.listenerAttached = 'true';
            typeFilter.addEventListener('change', (e) => {
                this.typeFilter = e.target.value;
                this.applyFilters();
            });
        }

        // Status filter
        const statusFilter = document.getElementById('bankStatusFilter');
        if (statusFilter && !statusFilter.dataset.listenerAttached) {
            statusFilter.dataset.listenerAttached = 'true';
            statusFilter.addEventListener('change', (e) => {
                this.statusFilter = e.target.value;
                this.applyFilters();
            });
        }

        // Update toggle buttons visual
        this.updateToggleButtons();
    },

    async load() {
        try {
            this.accounts = await BankAccountService.getAll();
            this.applyFilters();
            this.renderStats();
        } catch (err) {
            console.error('Load bank accounts error:', err);
            toast('Gagal memuat data: ' + err.message, 'error');
        }
    },

    renderStats() {
        const statsEl = document.getElementById('bankStats');
        if (!statsEl) return;

        const total = this.accounts.length;
        const active = this.accounts.filter(a => a.is_active).length;
        const primary = this.accounts.filter(a => a.is_primary).length;
        
        const byType = {
            personal: this.accounts.filter(a => a.account_type === 'personal').length,
            school: this.accounts.filter(a => a.account_type === 'school').length,
            operational: this.accounts.filter(a => a.account_type === 'operational').length,
            vendor: this.accounts.filter(a => a.account_type === 'vendor').length,
            ewallet: this.accounts.filter(a => a.account_type === 'ewallet').length
        };

        statsEl.innerHTML = `
            <div class="bank-stat-card">
                <div class="bank-stat-icon">💳</div>
                <div class="bank-stat-info">
                    <div class="bank-stat-label">Total Rekening</div>
                    <div class="bank-stat-value">${total}</div>
                </div>
            </div>
            <div class="bank-stat-card">
                <div class="bank-stat-icon">✅</div>
                <div class="bank-stat-info">
                    <div class="bank-stat-label">Aktif</div>
                    <div class="bank-stat-value">${active}</div>
                </div>
            </div>
            <div class="bank-stat-card">
                <div class="bank-stat-icon">⭐</div>
                <div class="bank-stat-info">
                    <div class="bank-stat-label">Utama</div>
                    <div class="bank-stat-value">${primary}</div>
                </div>
            </div>
            <div class="bank-stat-card">
                <div class="bank-stat-icon">🏫</div>
                <div class="bank-stat-info">
                    <div class="bank-stat-label">Sekolah</div>
                    <div class="bank-stat-value">${byType.school}</div>
                </div>
            </div>
            <div class="bank-stat-card">
                <div class="bank-stat-icon">📱</div>
                <div class="bank-stat-info">
                    <div class="bank-stat-label">E-Wallet</div>
                    <div class="bank-stat-value">${byType.ewallet}</div>
                </div>
            </div>
        `;
    },

    applyFilters() {
        let result = [...this.accounts];

        if (this.searchTerm) {
            result = result.filter(a => {
                const search = this.searchTerm;
                return (
                    (a.account_name || '').toLowerCase().includes(search) ||
                    (a.bank_name || '').toLowerCase().includes(search) ||
                    (a.account_number || '').toLowerCase().includes(search) ||
                    (a.branch || '').toLowerCase().includes(search) ||
                    (a.notes || '').toLowerCase().includes(search) ||
                    (a.schools?.sekolah_name || '').toLowerCase().includes(search)
                );
            });
        }

        if (this.typeFilter) {
            result = result.filter(a => a.account_type === this.typeFilter);
        }

        if (this.statusFilter === 'active') {
            result = result.filter(a => a.is_active);
        } else if (this.statusFilter === 'inactive') {
            result = result.filter(a => !a.is_active);
        }

        // Sort
        result.sort((a, b) => {
            // Primary first
            if (a.is_primary !== b.is_primary) {
                return a.is_primary ? -1 : 1;
            }
            
            let valA = a[this.sortField];
            let valB = b[this.sortField];
            
            if (valA == null) valA = '';
            if (valB == null) valB = '';
            
            if (typeof valA === 'string') valA = valA.toLowerCase();
            if (typeof valB === 'string') valB = valB.toLowerCase();
            
            if (valA < valB) return this.sortDirection === 'asc' ? -1 : 1;
            if (valA > valB) return this.sortDirection === 'asc' ? 1 : -1;
            return 0;
        });

        this.filteredAccounts = result;
        this.render();
    },

    setView(view) {
        this.currentView = view;
        this.savePreferences();
        this.updateToggleButtons();
        this.render();
    },

    updateToggleButtons() {
        document.querySelectorAll('[data-action="set-bank-view"]').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.view === this.currentView);
        });
    },

    setSort(field) {
        if (this.sortField === field) {
            this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
        } else {
            this.sortField = field;
            this.sortDirection = 'asc';
        }
        this.applyFilters();
    },

    render() {
        const container = document.getElementById('bankAccountsList');
        if (!container) return;

        if (!this.accounts.length) {
            container.innerHTML = `
                <div class="bank-empty-state">
                    <div class="bank-empty-icon">💳</div>
                    <div class="bank-empty-title">Belum Ada Rekening</div>
                    <div class="bank-empty-text">Mulai dengan menambahkan rekening pertama.</div>
                    ${auth.isSuperadmin() 
                        ? '<button class="btn btn-primary" data-action="open-bank-account-modal">➕ Tambah Rekening Pertama</button>' 
                        : ''}
                </div>
            `;
            return;
        }

        if (!this.filteredAccounts.length) {
            container.innerHTML = `
                <div class="bank-empty-state">
                    <div class="bank-empty-icon">🔍</div>
                    <div class="bank-empty-title">Tidak Ada Hasil</div>
                    <div class="bank-empty-text">Coba ubah kata kunci atau filter pencarian.</div>
                    <button class="btn btn-secondary" data-action="clear-bank-search">🔄 Reset Filter</button>
                </div>
            `;
            return;
        }

        if (this.currentView === 'table') {
            container.innerHTML = this.renderTable();
        } else if (this.currentView === 'grid') {
            container.innerHTML = `<div class="bank-grid">${this.filteredAccounts.map(a => this.renderGridCard(a)).join('')}</div>`;
        } else {
            container.innerHTML = `<div class="bank-cards">${this.filteredAccounts.map(a => this.renderCardRow(a)).join('')}</div>`;
        }
    },

    renderTable() {
        const sortClass = (field) => {
            if (this.sortField !== field) return '';
            return this.sortDirection === 'asc' ? 'sorted-asc' : 'sorted-desc';
        };

        return `
            <div class="bank-table-wrapper">
                <table class="bank-table">
                    <thead>
                        <tr>
                            <th class="${sortClass('account_name')}" data-action="sort-bank" data-field="account_name">Pemilik</th>
                            <th class="${sortClass('bank_name')}" data-action="sort-bank" data-field="bank_name">Bank</th>
                            <th class="${sortClass('account_number')}" data-action="sort-bank" data-field="account_number">No. Rekening</th>
                            <th class="${sortClass('account_type')}" data-action="sort-bank" data-field="account_type">Tipe</th>
                            <th class="${sortClass('branch')}" data-action="sort-bank" data-field="branch">Cabang</th>
                            <th class="no-sort">Status</th>
                            <th class="no-sort" style="text-align:right;">Aksi</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${this.filteredAccounts.map(a => this.renderTableRow(a)).join('')}
                    </tbody>
                </table>
            </div>
        `;
    },

    renderTableRow(a) {
        const typeBadge = this.getTypeBadge(a.account_type);
        const statusBadge = a.is_active 
            ? '<span class="status-badge status-active">Aktif</span>'
            : '<span class="status-badge status-inactive">Nonaktif</span>';
        const primaryBadge = a.is_primary ? '<span class="bank-primary-badge">⭐ Utama</span>' : '';
        const schoolName = a.schools?.sekolah_name ? `<span class="owner-school">🏫 ${escapeHtml(a.schools.sekolah_name)}</span>` : '';
        
        const rowClass = [];
        if (!a.is_active) rowClass.push('inactive');
        if (a.is_primary) rowClass.push('primary');

        return `
            <tr class="${rowClass.join(' ')}">
                <td>
                    <div class="owner-cell">
                        <span class="owner-name">${escapeHtml(a.account_name)}</span>
                        ${schoolName}
                    </div>
                </td>
                <td><strong>${escapeHtml(a.bank_name)}</strong></td>
                <td>
                    <span class="account-number" data-action="copy-account-number" data-number="${escapeHtml(a.account_number)}" title="Klik untuk copy">
                        ${escapeHtml(a.account_number)}
                    </span>
                </td>
                <td>${typeBadge} ${primaryBadge}</td>
                <td>${escapeHtml(a.branch || '-')}</td>
                <td>${statusBadge}</td>
                <td>
                    <div class="actions-cell">
                        <button class="btn btn-icon edit" data-action="edit-bank-account" data-id="${a.id}" title="Edit">✏️</button>
                        <button class="btn btn-icon delete" data-action="delete-bank-account" data-id="${a.id}" title="Hapus">🗑️</button>
                    </div>
                </td>
            </tr>
        `;
    },

    renderGridCard(a) {
        const typeBadge = this.getTypeBadge(a.account_type);
        const primaryBadge = a.is_primary ? '<span class="bank-primary-badge">⭐ Utama</span>' : '';
        const bankIcon = this.getBankIcon(a.bank_name, a.account_type);
        const schoolName = a.schools?.sekolah_name ? `<div class="bank-grid-school">🏫 ${escapeHtml(a.schools.sekolah_name)}</div>` : '';
        
        const cardClass = [];
        if (!a.is_active) cardClass.push('inactive');
        if (a.is_primary) cardClass.push('primary');

        return `
            <div class="bank-grid-card ${cardClass.join(' ')}">
                <div class="bank-grid-header">
                    <div class="bank-grid-bank">
                        <span class="bank-grid-bank-icon">${bankIcon}</span>
                        ${escapeHtml(a.bank_name)}
                    </div>
                    <div style="display:flex; gap:4px; flex-wrap:wrap; justify-content:flex-end;">
                        ${typeBadge}
                        ${primaryBadge}
                    </div>
                </div>
                <div class="bank-grid-owner">${escapeHtml(a.account_name)}</div>
                ${schoolName}
                <div class="bank-grid-number-wrapper" data-action="copy-account-number" data-number="${escapeHtml(a.account_number)}" title="Klik untuk copy">
                    <div>
                        <div class="bank-grid-number-label">No. Rekening</div>
                        <div class="bank-grid-number">${escapeHtml(a.account_number)}</div>
                    </div>
                    <span class="bank-grid-copy">📋</span>
                </div>
                <div class="bank-grid-meta">
                    <span>${a.branch ? '🏛️ ' + escapeHtml(a.branch) : ''}</span>
                    <span>${a.is_active ? '✅ Aktif' : '⛔ Nonaktif'}</span>
                </div>
                ${a.notes ? `<div class="bank-grid-notes">💬 ${escapeHtml(a.notes)}</div>` : ''}
                <div class="bank-grid-actions">
                    <button class="btn btn-sm btn-secondary" data-action="edit-bank-account" data-id="${a.id}">✏️ Edit</button>
                    <button class="btn btn-sm btn-danger" data-action="delete-bank-account" data-id="${a.id}">🗑️ Hapus</button>
                </div>
            </div>
        `;
    },

    renderCardRow(a) {
        const typeBadge = this.getTypeBadge(a.account_type);
        const primaryBadge = a.is_primary ? '<span class="bank-primary-badge">⭐ Utama</span>' : '';
        const bankIcon = this.getBankIcon(a.bank_name, a.account_type);
        const schoolName = a.schools?.sekolah_name ? `<div class="bank-card-school">🏫 ${escapeHtml(a.schools.sekolah_name)}</div>` : '';
        
        const rowClass = [];
        if (!a.is_active) rowClass.push('inactive');
        if (a.is_primary) rowClass.push('primary');

        return `
            <div class="bank-card-row ${rowClass.join(' ')}">
                <div class="bank-card-icon">${bankIcon}</div>
                <div class="bank-card-info">
                    <div class="bank-card-top">
                        <div class="bank-card-bank">${escapeHtml(a.bank_name)}</div>
                        <div style="display:flex; gap:4px; flex-wrap:wrap;">
                            ${typeBadge}
                            ${primaryBadge}
                        </div>
                    </div>
                    <div class="bank-card-owner">${escapeHtml(a.account_name)}</div>
                    ${schoolName}
                    <div class="bank-card-number-wrapper" data-action="copy-account-number" data-number="${escapeHtml(a.account_number)}">
                        <span class="bank-card-number">${escapeHtml(a.account_number)}</span>
                        <span class="bank-card-copy">📋 Copy</span>
                    </div>
                </div>
                <div class="bank-card-meta">
                    ${a.branch ? `<span style="font-size:11px;">🏛️ ${escapeHtml(a.branch)}</span>` : ''}
                    <span>${a.is_active ? '<span class="status-badge status-active">Aktif</span>' : '<span class="status-badge status-inactive">Nonaktif</span>'}</span>
                </div>
                <div class="bank-card-actions">
                    <button class="btn btn-sm btn-secondary" data-action="edit-bank-account" data-id="${a.id}">✏️ Edit</button>
                    <button class="btn btn-sm btn-danger" data-action="delete-bank-account" data-id="${a.id}">🗑️</button>
                </div>
            </div>
        `;
    },

    getTypeBadge(type) {
        const types = {
            personal: { label: 'Pribadi', icon: '👤', class: 'bank-type-personal' },
            school: { label: 'Sekolah', icon: '🏫', class: 'bank-type-school' },
            operational: { label: 'Operasional', icon: '🏢', class: 'bank-type-operational' },
            vendor: { label: 'Vendor', icon: '🛒', class: 'bank-type-vendor' },
            ewallet: { label: 'E-Wallet', icon: '📱', class: 'bank-type-ewallet' }
        };
        const t = types[type] || types.personal;
        return `<span class="bank-type-badge ${t.class}">${t.icon} ${t.label}</span>`;
    },

    getBankIcon(bankName, type) {
        if (type === 'ewallet') return '📱';
        const name = (bankName || '').toLowerCase();
        if (name.includes('bca')) return '🏦';
        if (name.includes('mandiri')) return '🏛️';
        if (name.includes('bni')) return '🏦';
        if (name.includes('bri')) return '🏦';
        if (name.includes('dana')) return '💙';
        if (name.includes('ovo')) return '💜';
        if (name.includes('gopay')) return '💚';
        if (name.includes('shopee')) return '🧡';
        return '💳';
    },

    async copyToClipboard(text) {
        try {
            await navigator.clipboard.writeText(text);
            this.showCopyToast(text);
        } catch (err) {
            // Fallback
            const textArea = document.createElement('textarea');
            textArea.value = text;
            textArea.style.position = 'fixed';
            textArea.style.opacity = '0';
            document.body.appendChild(textArea);
            textArea.select();
            try {
                document.execCommand('copy');
                this.showCopyToast(text);
            } catch (e) {
                toast('Gagal copy', 'error');
            }
            document.body.removeChild(textArea);
        }
    },

    showCopyToast(text) {
        // Remove existing
        document.querySelectorAll('.copy-toast').forEach(t => t.remove());
        
        const toast = document.createElement('div');
        toast.className = 'copy-toast';
        toast.innerHTML = `✅ Tersalin: <strong>${escapeHtml(text)}</strong>`;
        document.body.appendChild(toast);
        
        setTimeout(() => toast.remove(), 2500);
    },

    clearSearch() {
        document.getElementById('bankSearch').value = '';
        document.getElementById('bankTypeFilter').value = '';
        document.getElementById('bankStatusFilter').value = '';
        document.getElementById('bankSearchClear').classList.add('hidden');
        this.searchTerm = '';
        this.typeFilter = '';
        this.statusFilter = '';
        this.applyFilters();
    }
};
