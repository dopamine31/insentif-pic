// ============================================
// MAIN APPLICATION - OPTIMIZED
// ============================================

import { auth } from './auth.js';
import { state } from './state.js';
import { SummaryView } from './views/summary-view.js';
import { PeriodView } from './views/period-view.js';
import { DetailView } from './views/detail-view.js';
import { toast } from './utils/toast.js';
import { escapeHtml } from './utils/format.js';

// ============================================
// GLOBAL LOADER
// ============================================
export const Loader = {
    show(text = 'Memproses...') {
        const loader = document.getElementById('globalLoader');
        const textEl = document.getElementById('loaderText');
        if (textEl) textEl.innerText = text;
        if (loader) loader.classList.remove('hidden');
    },
    hide() {
        const loader = document.getElementById('globalLoader');
        if (loader) loader.classList.add('hidden');
    }
};

// ============================================
// MAIN APP CLASS
// ============================================
class App {
    constructor() {
        this.initAuth();
        this.initEventDelegation();
    }

    initAuth() {
        if (auth.isAuthenticated()) {
            this.unlockApp();
        } else {
            this.showPinScreen();
        }
    }

    showPinScreen() {
        document.getElementById('pinOverlay').classList.remove('unlocked');
        document.getElementById('mainContainer').style.display = 'none';
        
        if (auth.isLocked()) {
            this.startLockTimer();
        }
    }

    startLockTimer() {
        const timer = setInterval(() => {
            if (!auth.isLocked()) {
                clearInterval(timer);
                const input = document.getElementById('pinInput');
                const msg = document.getElementById('pinMessage');
                const btn = document.getElementById('pinSubmit');
                
                if (input) { input.disabled = false; input.focus(); }
                if (msg) { msg.innerText = ''; msg.className = 'pin-message'; }
                if (btn) btn.disabled = false;
            } else {
                const msg = document.getElementById('pinMessage');
                if (msg) {
                    msg.innerText = `🔒 Terkunci. Coba dalam ${auth.getLockRemaining()} detik`;
                    msg.className = 'pin-message error';
                }
            }
        }, 1000);
    }

    async handleLogin(e) {
        e.preventDefault();
        const pin = document.getElementById('pinInput').value.trim();
        const msgEl = document.getElementById('pinMessage');
        const submitBtn = document.getElementById('pinSubmit');
        const btnText = submitBtn.querySelector('.btn-text');
        const btnLoader = submitBtn.querySelector('.btn-loader');

        if (!/^\d{4}$/.test(pin)) {
            msgEl.innerText = '⚠️ PIN harus 4 digit angka';
            msgEl.className = 'pin-message error';
            return;
        }

        msgEl.innerText = '⏳ Memverifikasi...';
        msgEl.className = 'pin-message';
        submitBtn.disabled = true;
        if (btnText) btnText.classList.add('hidden');
        if (btnLoader) btnLoader.classList.remove('hidden');

        try {
            const result = await auth.login(pin);
            
            if (result.success) {
                msgEl.innerText = result.message;
                msgEl.className = 'pin-message success';
                setTimeout(() => this.unlockApp(), 700);
            } else {
                msgEl.innerText = result.message;
                msgEl.className = 'pin-message error';
                document.getElementById('pinInput').value = '';
                document.getElementById('pinInput').focus();
                
                if (auth.isLocked()) {
                    this.startLockTimer();
                }
            }
        } catch (err) {
            msgEl.innerText = `❌ Error: ${err.message}`;
            msgEl.className = 'pin-message error';
        } finally {
            submitBtn.disabled = false;
            if (btnText) btnText.classList.remove('hidden');
            if (btnLoader) btnLoader.classList.add('hidden');
        }
    }

    async unlockApp() {
        document.getElementById('pinOverlay').classList.add('unlocked');
        document.getElementById('mainContainer').style.display = 'block';
        
        const user = auth.getCurrentUser();
        if (user) {
            const roleBadge = user.role === 'superadmin' 
                ? '<span class="role-badge role-superadmin">👑 Superadmin</span>' 
                : '<span class="role-badge role-viewer">👁️ Viewer</span>';
            
            document.getElementById('userInfo').innerHTML = `
                <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
                    ${roleBadge}
                    ${user.notes ? `<span style="opacity:0.8; font-size:11px;">${escapeHtml(user.notes)}</span>` : ''}
                    <button class="btn btn-sm btn-secondary" data-action="logout">Logout</button>
                </div>
            `;
            
            this.renderHeaderActions();
            document.body.dataset.role = user.role;
        }

        Loader.show('Memuat data...');
        await this.loadData();
        Loader.hide();
    }

    renderHeaderActions() {
        const actions = document.getElementById('headerActions');
        if (auth.isSuperadmin()) {
            actions.innerHTML = `
                <button class="btn btn-primary" data-action="open-period-modal">
                    ➕ Periode Baru
                </button>
                <button class="btn btn-gold" data-action="open-viewers-modal">
                    👥 Kelola Viewer
                </button>
            `;
        } else {
            actions.innerHTML = `
                <div style="background:rgba(100,116,139,0.1); padding:10px 16px; border-radius:10px; font-size:12px; color:#475569; font-weight:600; border:1px solid rgba(100,116,139,0.2);">
                    🔒 Mode Viewer
                </div>
            `;
        }
    }

    async loadData() {
        try {
            await state.loadPeriods();
            this.showSummary();
        } catch (err) {
            console.error('Load data error:', err);
            toast('Gagal memuat data: ' + err.message, 'error');
            document.getElementById('periodList').innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">😔</div>
                    <div class="empty-state-title">Gagal Memuat Data</div>
                    <div class="empty-state-text">${escapeHtml(err.message)}</div>
                    <button class="btn btn-primary" data-action="retry-load">🔄 Coba Lagi</button>
                </div>
            `;
        }
    }

    // ============================================
    // NAVIGATION - DENGAN AUTO-RENDER
    // ============================================

    showSummary() {
        document.getElementById('viewSummary').classList.remove('hidden');
        document.getElementById('viewPeriod').classList.add('hidden');
        document.getElementById('viewDetail').classList.add('hidden');
        SummaryView.render();
        this.scrollToTop();
    }

    showPeriod(idx) {
        state.setCurrentPeriod(idx);
        document.getElementById('viewSummary').classList.add('hidden');
        document.getElementById('viewPeriod').classList.remove('hidden');
        document.getElementById('viewDetail').classList.add('hidden');
        PeriodView.render(idx);
        this.scrollToTop();
    }

    showDetail(school) {
        document.getElementById('viewSummary').classList.add('hidden');
        document.getElementById('viewPeriod').classList.add('hidden');
        document.getElementById('viewDetail').classList.remove('hidden');
        DetailView.render(school);
        this.scrollToTop();
    }

    backToPeriod() {
        this.showPeriod(state.currentPeriodIdx);
    }

    scrollToTop() {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    // ============================================
    // REFRESH CURRENT VIEW - FIX BUG
    // ============================================
    
    async refreshAndShow(viewName) {
        Loader.show('Memperbarui data...');
        try {
            await state.loadPeriods();
            if (viewName === 'summary') {
                this.showSummary();
            } else if (viewName === 'period') {
                this.showPeriod(state.currentPeriodIdx);
            } else if (viewName === 'detail') {
                // Re-render detail dengan data terbaru
                const school = state.currentSchool;
                if (school) {
                    const updatedSchool = this.findSchoolById(school.id);
                    if (updatedSchool) {
                        this.showDetail(updatedSchool);
                    } else {
                        this.showPeriod(state.currentPeriodIdx);
                    }
                } else {
                    this.showPeriod(state.currentPeriodIdx);
                }
            }
        } catch (err) {
            toast('Gagal memperbarui: ' + err.message, 'error');
        } finally {
            Loader.hide();
        }
    }

    getCurrentView() {
        if (!document.getElementById('viewDetail').classList.contains('hidden')) return 'detail';
        if (!document.getElementById('viewPeriod').classList.contains('hidden')) return 'period';
        return 'summary';
    }

    // ============================================
    // EVENT DELEGATION
    // ============================================

    initEventDelegation() {
        document.addEventListener('click', async (e) => {
            const target = e.target.closest('[data-action]');
            if (!target) return;
            
            e.stopPropagation();
            const action = target.dataset.action;
            const id = target.dataset.id;
            
            await this.handleAction(action, id, target);
        });

        document.addEventListener('submit', async (e) => {
            const form = e.target.closest('form[data-form]');
            if (!form) return;
            
            e.preventDefault();
            await this.handleFormSubmit(form.dataset.form, e);
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeAllModals();
            }
        });

        // Click on pin-display-value to copy
        document.getElementById('pinDisplayValue')?.addEventListener('click', () => {
            const pin = document.getElementById('pinDisplayValue').innerText;
            navigator.clipboard.writeText(pin).then(() => {
                toast('PIN berhasil di-copy!', 'success');
            });
        });
    }

    async handleAction(action, id, target) {
        try {
            switch (action) {
                case 'open-period-modal':
                    if (!this.requireSuperadmin()) return;
                    const { PeriodModal } = await import('./modals/period-modal.js');
                    PeriodModal.open();
                    break;
                    
                case 'edit-period':
                    if (!this.requireSuperadmin()) return;
                    const { PeriodModal: PM } = await import('./modals/period-modal.js');
                    PM.open(id);
                    break;
                    
                case 'delete-period':
                    if (!this.requireSuperadmin()) return;
                    if (!confirm('Hapus periode ini? Semua data sekolah di dalamnya ikut terhapus.')) return;
                    Loader.show('Menghapus periode...');
                    const { PeriodService } = await import('./services/period-service.js');
                    await PeriodService.delete(id);
                    toast('Periode dihapus 💕', 'success');
                    await this.refreshAndShow('summary');
                    break;

                case 'open-school-modal':
                    if (!this.requireSuperadmin()) return;
                    const { SchoolModal } = await import('./modals/school-modal.js');
                    SchoolModal.open();
                    break;
                    
                case 'edit-school':
                    if (!this.requireSuperadmin()) return;
                    const school = this.findSchoolById(id);
                    if (school) {
                        const { SchoolModal: SM } = await import('./modals/school-modal.js');
                        SM.open(school);
                    }
                    break;
                    
                case 'delete-school':
                    if (!this.requireSuperadmin()) return;
                    const schoolDel = this.findSchoolById(id);
                    if (schoolDel && confirm(`Hapus ${schoolDel.sekolah_name}?`)) {
                        Loader.show('Menghapus data...');
                        const { SchoolService } = await import('./services/school-service.js');
                        await SchoolService.delete(schoolDel.id, schoolDel.transfer_proof_path);
                        toast('Data dihapus 💕', 'success');
                        await this.refreshAndShow('period');
                    }
                    break;

                case 'open-viewers-modal':
                    if (!this.requireSuperadmin()) return;
                    const { ViewersModal } = await import('./modals/viewers-modal.js');
                    await ViewersModal.open();
                    break;
                    
                case 'reset-viewer-pin':
                    if (!this.requireSuperadmin()) return;
                    if (!confirm('Reset PIN viewer ini?')) return;
                    const { ViewersModal: VM } = await import('./modals/viewers-modal.js');
                    await VM.resetPin(id);
                    break;
                    
                case 'toggle-viewer':
                    if (!this.requireSuperadmin()) return;
                    const isActive = target.dataset.active === 'true';
                    const { ViewersModal: VM2 } = await import('./modals/viewers-modal.js');
                    await VM2.toggleActive(id, !isActive);
                    break;
                    
                case 'edit-viewer-notes':
                    if (!this.requireSuperadmin()) return;
                    const { ViewersModal: VM3 } = await import('./modals/viewers-modal.js');
                    await VM3.editNotes(id);
                    break;
                    
                case 'delete-viewer':
                    if (!this.requireSuperadmin()) return;
                    if (!confirm('Hapus viewer ini?')) return;
                    const { ViewersModal: VM4 } = await import('./modals/viewers-modal.js');
                    await VM4.delete(id);
                    break;
                    
                case 'create-viewer':
                    if (!this.requireSuperadmin()) return;
                    const { ViewersModal: VM5 } = await import('./modals/viewers-modal.js');
                    await VM5.createViewer();
                    break;
                    
                case 'refresh-viewers':
                    const { ViewersModal: VM6 } = await import('./modals/viewers-modal.js');
                    await VM6.load();
                    break;

                case 'close-modal':
                    const modalId = target.dataset.modal;
                    if (modalId) this.closeModal(modalId);
                    break;
                    
                case 'close-zoom':
                    this.closeZoom();
                    break;
                    
                case 'close-pin-display':
                    this.closePinDisplay();
                    break;

                case 'show-summary':
                    this.showSummary();
                    break;
                    
                case 'show-period':
                    const idx = parseInt(target.dataset.idx);
                    if (!isNaN(idx)) this.showPeriod(idx);
                    break;
                    
                case 'show-detail':
                    const schoolId = target.dataset.id;
                    const schoolDetail = this.findSchoolById(schoolId);
                    if (schoolDetail) this.showDetail(schoolDetail);
                    break;
                    
                case 'back-to-period':
                    this.backToPeriod();
                    break;
                    
                case 'open-zoom':
                    const src = target.dataset.src;
                    if (src) this.openZoom(src);
                    break;
                    
                case 'logout':
                    auth.logout();
                    location.reload();
                    break;

                case 'retry-load':
                    await this.loadData();
                    break;
            }
        } catch (err) {
            console.error('Action error:', err);
            toast('Error: ' + err.message, 'error');
            Loader.hide();
        }
    }

    async handleFormSubmit(formType, e) {
        try {
            switch (formType) {
                case 'login':
                    await this.handleLogin(e);
                    break;
                    
                case 'period':
                    if (!this.requireSuperadmin()) return;
                    Loader.show('Menyimpan periode...');
                    const { PeriodModal } = await import('./modals/period-modal.js');
                    await PeriodModal.save(e);
                    break;
                    
                case 'school':
                    if (!this.requireSuperadmin()) return;
                    Loader.show('Menyimpan data sekolah...');
                    const { SchoolModal } = await import('./modals/school-modal.js');
                    await SchoolModal.save(e);
                    break;
            }
        } catch (err) {
            console.error('Form submit error:', err);
            toast('Error: ' + err.message, 'error');
            Loader.hide();
        }
    }

    requireSuperadmin() {
        if (!auth.isSuperadmin()) {
            toast('⛔ Hanya Superadmin yang dapat melakukan aksi ini', 'warning');
            return false;
        }
        return true;
    }

    findSchoolById(id) {
        for (const p of state.periods) {
            const school = (p.schools || []).find(s => s.id === id);
            if (school) return school;
        }
        return null;
    }

    closeAllModals() {
        this.closeZoom();
        this.closePinDisplay();
        document.querySelectorAll('.modal-overlay.active').forEach(m => {
            m.classList.remove('active');
        });
    }

    closeModal(id) {
        const modal = document.getElementById(id);
        if (modal) modal.classList.remove('active');
    }

    openZoom(src) {
        document.getElementById('zoomImg').src = src;
        document.getElementById('zoomModal').classList.add('active');
    }

    closeZoom() {
        document.getElementById('zoomModal').classList.remove('active');
        document.getElementById('zoomImg').src = '';
    }

    closePinDisplay() {
        document.getElementById('pinDisplayModal').classList.remove('active');
    }
}

// ============================================
// INITIALIZE
// ============================================
const app = new App();

// ============================================
// GLOBAL EXPOSURE
// ============================================
window.app = app;
window.Loader = Loader;
window.handleLogin = (e) => app.handleLogin(e);
window.logout = () => { auth.logout(); location.reload(); };
window.showSummary = () => app.showSummary();
window.showPeriod = (idx) => app.showPeriod(idx);
window.showDetail = (school) => app.showDetail(school);
window.backToPeriod = () => app.backToPeriod();
window.closeModal = (id) => app.closeModal(id);
window.closeZoom = () => app.closeZoom();
window.closePinDisplay = () => app.closePinDisplay();
window.openZoom = (src) => app.openZoom(src);

window.savePeriod = async (e) => {
    e.preventDefault();
    if (!app.requireSuperadmin()) return;
    Loader.show('Menyimpan periode...');
    const { PeriodModal } = await import('./modals/period-modal.js');
    await PeriodModal.save(e);
};

window.saveSchool = async (e) => {
    e.preventDefault();
    if (!app.requireSuperadmin()) return;
    Loader.show('Menyimpan data sekolah...');
    const { SchoolModal } = await import('./modals/school-modal.js');
    await SchoolModal.save(e);
};

window.previewFile = async (e) => {
    const { SchoolModal } = await import('./modals/school-modal.js');
    SchoolModal.previewFile(e);
};

window.openPeriodModal = async (id = null) => {
    if (!app.requireSuperadmin()) return;
    const { PeriodModal } = await import('./modals/period-modal.js');
    PeriodModal.open(id);
};

window.deletePeriod = async (id) => {
    if (!app.requireSuperadmin()) return;
    if (!confirm('Hapus periode ini?')) return;
    try {
        Loader.show('Menghapus...');
        const { PeriodService } = await import('./services/period-service.js');
        await PeriodService.delete(id);
        toast('Periode dihapus 💕', 'success');
        await app.refreshAndShow('summary');
    } catch (err) {
        toast('Gagal: ' + err.message, 'error');
        Loader.hide();
    }
};

window.openSchoolModal = async (school = null) => {
    if (!app.requireSuperadmin()) return;
    const { SchoolModal } = await import('./modals/school-modal.js');
    SchoolModal.open(school);
};

window.editSchool = async (schoolData) => {
    if (!app.requireSuperadmin()) return;
    try {
        const school = typeof schoolData === 'string' 
            ? JSON.parse(schoolData.replace(/&quot;/g, '"')) 
            : schoolData;
        const { SchoolModal } = await import('./modals/school-modal.js');
        SchoolModal.open(school);
    } catch (err) {
        toast('Error: ' + err.message, 'error');
    }
};

window.deleteSchool = async (schoolData) => {
    if (!app.requireSuperadmin()) return;
    try {
        const school = typeof schoolData === 'string' 
            ? JSON.parse(schoolData.replace(/&quot;/g, '"')) 
            : schoolData;
        if (!confirm(`Hapus ${school.sekolah_name}?`)) return;
        Loader.show('Menghapus...');
        const { SchoolService } = await import('./services/school-service.js');
        await SchoolService.delete(school.id, school.transfer_proof_path);
        toast('Data dihapus 💕', 'success');
        await app.refreshAndShow('period');
    } catch (err) {
        toast('Gagal: ' + err.message, 'error');
        Loader.hide();
    }
};

window.openViewersModal = async () => {
    if (!app.requireSuperadmin()) return;
    const { ViewersModal } = await import('./modals/viewers-modal.js');
    await ViewersModal.open();
};

window.closeViewersModal = () => app.closeModal('viewersModal');

window.createViewer = async () => {
    if (!app.requireSuperadmin()) return;
    const { ViewersModal } = await import('./modals/viewers-modal.js');
    await ViewersModal.createViewer();
};

window.resetViewerPin = async (id) => {
    if (!app.requireSuperadmin()) return;
    const { ViewersModal } = await import('./modals/viewers-modal.js');
    await ViewersModal.resetPin(id);
};

window.toggleViewer = async (id, isActive) => {
    if (!app.requireSuperadmin()) return;
    const { ViewersModal } = await import('./modals/viewers-modal.js');
    await ViewersModal.toggleActive(id, isActive);
};

window.editViewerNotes = async (id) => {
    if (!app.requireSuperadmin()) return;
    const { ViewersModal } = await import('./modals/viewers-modal.js');
    await ViewersModal.editNotes(id);
};

window.deleteViewer = async (id) => {
    if (!app.requireSuperadmin()) return;
    const { ViewersModal } = await import('./modals/viewers-modal.js');
    await ViewersModal.delete(id);
};

window.ViewersModal = {
    load: async () => {
        const { ViewersModal } = await import('./modals/viewers-modal.js');
        await ViewersModal.load();
    }
};

setInterval(() => {
    if (auth.isAuthenticated()) {
        state.loadPeriods().then(() => {
            // Silent refresh untuk view aktif
            const view = app.getCurrentView();
            if (view === 'summary') SummaryView.render();
            else if (view === 'period') PeriodView.render(state.currentPeriodIdx);
        }).catch(() => {});
    }
}, 60000);

export { app, auth, state };
