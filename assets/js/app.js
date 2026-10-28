async unlockApp() {
    document.getElementById('pinOverlay').classList.add('unlocked');
    document.getElementById('mainContainer').style.display = 'block';
    
    const user = auth.getCurrentUser();
    if (user) {
        // Role badge
        const roleBadge = user.role === 'superadmin' 
            ? '<span class="role-badge role-superadmin">👑 Superadmin</span>' 
            : '<span class="role-badge role-viewer">👁️ Viewer</span>';
        
        document.getElementById('userInfo').innerHTML = `
            <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
                ${roleBadge}
                ${user.notes ? `<span style="opacity:0.8; font-size:11px;">${user.notes}</span>` : ''}
                <button class="btn btn-sm btn-secondary" onclick="window.logout()">Logout</button>
            </div>
        `;
        
        // Header actions berdasarkan role
        this.renderHeaderActions();
        
        // Apply role ke body
        document.body.dataset.role = user.role;
    }

    await this.loadData();
}

renderHeaderActions() {
    const actions = document.getElementById('headerActions');
    const isSuperadmin = auth.isSuperadmin();
    
    if (isSuperadmin) {
        actions.innerHTML = `
            <button class="btn btn-primary" onclick="window.openPeriodModal()">
                ➕ Periode Baru
            </button>
            <button class="btn" style="background:linear-gradient(135deg, #f093fb 0%, #f5576c 100%); color:white;" 
                    onclick="window.openViewersModal()">
                👥 Kelola Viewer
            </button>
        `;
    } else {
        actions.innerHTML = `
            <div style="background:rgba(255,255,255,0.2); padding:8px 14px; border-radius:8px; font-size:12px; color:white;">
                👁️ Mode Viewer — Read Only
            </div>
        `;
    }
}

handleLogin(e) {
    e.preventDefault();
    const pin = document.getElementById('pinInput').value.trim();
    const msgEl = document.getElementById('pinMessage');
    const submitBtn = document.getElementById('pinSubmit');

    if (!pin || pin.length !== 4) {
        msgEl.innerText = '⚠️ PIN harus 4 digit';
        msgEl.className = 'pin-message error';
        return;
    }

    if (!/^\d{4}$/.test(pin)) {
        msgEl.innerText = '⚠️ PIN harus angka saja';
        msgEl.className = 'pin-message error';
        return;
    }

    msgEl.innerText = '⏳ Memverifikasi...';
    msgEl.className = 'pin-message info';
    submitBtn.disabled = true;

    auth.login(pin).then(result => {
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
        submitBtn.disabled = false;
    });
}
