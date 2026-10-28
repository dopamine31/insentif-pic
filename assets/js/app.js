// ============================================
// MAIN APPLICATION ENTRY POINT
// ============================================
import { auth } from './auth.js';
import { state } from './state.js';
import { SummaryView } from './views/summary-view.js';
import { PeriodView } from './views/period-view.js';
import { DetailView } from './views/detail-view.js';
import { toast } from './utils/toast.js';

class App {
    constructor() {
        this.initAuth();
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
        
        // Start lock timer jika terkunci
        if (auth.isLocked()) {
            this.startLockTimer();
        }
    }

    startLockTimer() {
        const timer = setInterval(() => {
            if (!auth.isLocked()) {
                clearInterval(timer);
                document.getElementById('pinInput').disabled = false;
                document.getElementById('pinMessage').innerText = '';
                document.getElementById('pinInput').focus();
            } else {
                const remaining = auth.getLockRemaining();
                document.getElementById('pinMessage').innerText = 
                    `🔒 Terkunci. Coba dalam ${remaining} detik`;
                document.getElementById('pinMessage').className = 'pin-message error';
            }
        }, 1000);
    }

    async handleLogin(e) {
        e.preventDefault();
        const username = document.getElementById('username').value.trim() || 'admin';
        const pin = document.getElementById('pinInput').value;
        const msgEl = document.getElementById('pinMessage');

        if (!pin) {
            msgEl.innerText = '⚠️ Masukkan PIN';
            msgEl.className = 'pin-message error';
            return;
        }

        msgEl.innerText = '⏳ Memverifikasi...';
        msgEl.className = 'pin-message info';

        const result = await auth.login(username, pin);
        
        if (result.success) {
            msgEl.innerText = result.message;
            msgEl.className = 'pin-message success';
            setTimeout(() => this.unlockApp(), 500);
        } else {
            msgEl.innerText = result.message;
            msgEl.className = 'pin-message error';
            document.getElementById('pinInput').value = '';
            document.getElementById('pinInput').focus();
            
            if (auth.isLocked()) {
                this.startLockTimer();
            }
        }
    }

    async unlockApp() {
        document.getElementById('pinOverlay').classList.add('unlocked');
        document.getElementById('mainContainer').style.display = 'block';
        
        // Update user info di header
        const user = auth.getCurrentUser();
        if (user) {
            document.getElementById('userInfo').innerHTML = 
                `👤 ${user.username} <button class="btn btn-sm btn-secondary" onclick="window.logout()" style="margin-left:8px;">Logout</button>`;
        }

        await this.loadData();
    }

    async loadData() {
        try {
            await state.loadPeriods();
            this.showSummary();
        } catch (err) {
            toast('Gagal memuat data: ' + err.message, 'error');
            document.getElementById('periodList').innerHTML = 
                `<div class="loading" style="color:var(--danger)">
                    ❌ ${err.message}<br>
                    <small>Pastikan konfigurasi Supabase benar</small>
                </div>`;
        }
    }

    showSummary() {
        document.getElementById('viewSummary').classList.remove('hidden');
        document.getElementById('viewPeriod').classList.add('hidden');
        document.getElementById('viewDetail').classList.add('hidden');
        SummaryView.render();
        window.scrollTo(0, 0);
    }

    showPeriod(idx) {
        state.setCurrentPeriod(idx);
        document.getElementById('viewSummary').classList.add('hidden');
        document.getElementById('viewPeriod').classList.remove('hidden');
        document.getElementById('viewDetail').classList.add('hidden');
        PeriodView.render(idx);
        window.scrollTo(0, 0);
    }

    showDetail(school) {
        document.getElementById('viewSummary').classList.add('hidden');
        document.getElementById('viewPeriod').classList.add('hidden');
        document.getElementById('viewDetail').classList.remove('hidden');
        DetailView.render(school);
        window.scrollTo(0, 0);
    }
}

// ============================================
// INITIALIZE
// ============================================
const app = new App();

// Expose ke global scope (untuk onclick handlers di HTML)
window.showSummary = () => app.showSummary();
window.showPeriod = (idx) => app.showPeriod(idx);
window.showDetail = (school) => app.showDetail(school);
window.handleLogin = (e) => app.handleLogin(e);
window.logout = () => {
    auth.logout();
    location.reload();
};

// Subscribe state changes untuk re-render
state.subscribe(() => {
    if (!document.getElementById('viewSummary').classList.contains('hidden')) {
        SummaryView.render();
    }
});

// Auto-refresh setiap 60 detik
setInterval(() => {
    if (auth.isAuthenticated()) {
        state.loadPeriods().catch(() => {});
    }
}, 60000);
