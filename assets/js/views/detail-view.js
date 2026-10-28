// ============================================
// DETAIL VIEW dengan SWIPE NAVIGATION
// FEATURE: Swipe kiri/kanan + Keyboard arrows + Dots
// ============================================
import { state } from '../state.js';
import { auth } from '../auth.js';
import { formatRupiah, formatDate, escapeHtml } from '../utils/format.js';

export const DetailView = {
    currentSchool: null,
    touchStartX: 0,
    touchStartY: 0,
    touchEndX: 0,
    touchEndY: 0,
    isSwiping: false,
    minSwipeDistance: 50,

    render(school) {
        const p = state.getCurrentPeriod();
        if (!p || !school) return;

        this.currentSchool = school;
        state.setCurrentSchool(school);

        document.getElementById('breadcrumbDetail').innerHTML = `
            <a data-action="show-summary">🏠 Summary</a>
            <span class="sep">›</span>
            <a data-action="show-period" data-idx="${state.currentPeriodIdx}">📅 ${escapeHtml(p.name)}</a>
            <span class="sep">›</span>
            <span class="current">🏫 ${escapeHtml(school.sekolah_name)}</span>
        `;

        // Detail number (urut otomatis)
        const currentIdx = (p.schools || []).findIndex(s => s.id === school.id);
        const displayNo = currentIdx >= 0 ? currentIdx + 1 : (school.no_urut || 1);
        document.getElementById('detailNumber').innerText = `#${displayNo}`;

        document.getElementById('detailSekolah').innerText = school.sekolah_name;
        document.getElementById('detailNo').innerText = `Data No. ${displayNo} • ${p.name}`;
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

        this.updateNavigation();
        this.renderDots();
        this.initSwipeListeners();
        this.showSwipeHintOnce();
    },

    /**
     * Update tombol Prev/Next dan counter
     */
    updateNavigation() {
        const p = state.getCurrentPeriod();
        if (!p || !p.schools || !this.currentSchool) return;

        const schools = p.schools;
        const currentIdx = schools.findIndex(s => s.id === this.currentSchool.id);
        const total = schools.length;

        // Counter
        const currentEl = document.getElementById('navCounterCurrent');
        const totalEl = document.getElementById('navCounterTotal');
        if (currentEl) currentEl.innerText = currentIdx + 1;
        if (totalEl) totalEl.innerText = total;

        // Prev button
        const prevBtn = document.querySelector('[data-action="nav-prev"]');
        if (prevBtn) {
            prevBtn.disabled = currentIdx <= 0;
            if (currentIdx > 0) {
                const prevSchool = schools[currentIdx - 1];
                prevBtn.title = `Sebelumnya: ${prevSchool.sekolah_name}`;
            } else {
                prevBtn.title = 'Ini data pertama';
            }
        }

        // Next button
        const nextBtn = document.querySelector('[data-action="nav-next"]');
        if (nextBtn) {
            nextBtn.disabled = currentIdx >= total - 1;
            if (currentIdx < total - 1) {
                const nextSchool = schools[currentIdx + 1];
                nextBtn.title = `Berikutnya: ${nextSchool.sekolah_name}`;
            } else {
                nextBtn.title = 'Ini data terakhir';
            }
        }
    },

    /**
     * Render progress dots (max 15 dots, kalau lebih show condensed)
     */
    renderDots() {
        const p = state.getCurrentPeriod();
        const dotsContainer = document.getElementById('navDots');
        if (!p || !p.schools || !dotsContainer || !this.currentSchool) return;

        const schools = p.schools;
        const currentIdx = schools.findIndex(s => s.id === this.currentSchool.id);
        const total = schools.length;

        if (total <= 1) {
            dotsContainer.innerHTML = '';
            return;
        }

        if (total <= 15) {
            // Show all dots
            dotsContainer.innerHTML = schools.map((s, i) => `
                <button 
                    class="nav-dot ${i === currentIdx ? 'active' : ''}" 
                    data-action="nav-goto" 
                    data-idx="${i}"
                    title="${escapeHtml(s.sekolah_name)}"
                ></button>
            `).join('');
        } else {
            // Show condensed: current-2, current-1, [current], current+1, current+2
            const visible = [];
            const range = 2;
            for (let i = Math.max(0, currentIdx - range); i <= Math.min(total - 1, currentIdx + range); i++) {
                visible.push(i);
            }
            
            let html = '';
            if (visible[0] > 0) {
                html += `<button class="nav-dot" data-action="nav-goto" data-idx="0" title="Ke awal"></button>`;
                if (visible[0] > 1) html += `<span style="color:#9ca3af; padding:0 4px;">...</span>`;
            }
            
            visible.forEach(i => {
                const s = schools[i];
                html += `<button 
                    class="nav-dot ${i === currentIdx ? 'active' : ''}" 
                    data-action="nav-goto" 
                    data-idx="${i}"
                    title="${escapeHtml(s.sekolah_name)}"
                ></button>`;
            });
            
            if (visible[visible.length - 1] < total - 1) {
                if (visible[visible.length - 1] < total - 2) html += `<span style="color:#9ca3af; padding:0 4px;">...</span>`;
                html += `<button class="nav-dot" data-action="nav-goto" data-idx="${total - 1}" title="Ke akhir"></button>`;
            }
            
            dotsContainer.innerHTML = html;
        }
    },

    /**
     * Navigasi ke data next/prev dengan animasi
     */
    navigate(direction) {
        const p = state.getCurrentPeriod();
        if (!p || !p.schools || !this.currentSchool) return;

        const schools = p.schools;
        const currentIdx = schools.findIndex(s => s.id === this.currentSchool.id);
        
        let newIdx;
        if (direction === 'next') {
            newIdx = currentIdx + 1;
            if (newIdx >= schools.length) return;
        } else if (direction === 'prev') {
            newIdx = currentIdx - 1;
            if (newIdx < 0) return;
        } else if (typeof direction === 'number') {
            newIdx = direction;
            if (newIdx < 0 || newIdx >= schools.length) return;
        } else {
            return;
        }

        const swipeArea = document.getElementById('detailSwipeArea');
        const isForward = newIdx > currentIdx;
        
        // Animasi keluar
        swipeArea.classList.add(isForward ? 'swipe-left' : 'swipe-right');
        
        setTimeout(() => {
            // Render data baru
            this.render(schools[newIdx]);
            
            // Animasi masuk
            swipeArea.classList.remove('swipe-left', 'swipe-right');
            swipeArea.classList.add(isForward ? 'swipe-in-left' : 'swipe-in-right');
            
            setTimeout(() => {
                swipeArea.classList.remove('swipe-in-left', 'swipe-in-right');
            }, 300);
            
            // Scroll ke top dengan smooth
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }, 280);
    },

    /**
     * Initialize swipe touch listeners
     */
    initSwipeListeners() {
        const swipeArea = document.getElementById('detailSwipeArea');
        if (!swipeArea || swipeArea.dataset.swipeInitialized === 'true') return;
        
        swipeArea.dataset.swipeInitialized = 'true';

        // Touch events
        swipeArea.addEventListener('touchstart', (e) => this.handleTouchStart(e), { passive: true });
        swipeArea.addEventListener('touchmove', (e) => this.handleTouchMove(e), { passive: false });
        swipeArea.addEventListener('touchend', (e) => this.handleTouchEnd(e), { passive: true });
        
        // Mouse drag untuk desktop
        swipeArea.addEventListener('mousedown', (e) => this.handleMouseDown(e));
    },

    handleTouchStart(e) {
        this.touchStartX = e.changedTouches[0].screenX;
        this.touchStartY = e.changedTouches[0].screenY;
        this.isSwiping = false;
    },

    handleTouchMove(e) {
        if (!this.touchStartX || !this.touchStartY) return;
        
        const currentX = e.changedTouches[0].screenX;
        const currentY = e.changedTouches[0].screenY;
        const diffX = Math.abs(currentX - this.touchStartX);
        const diffY = Math.abs(currentY - this.touchStartY);
        
        // Deteksi horizontal swipe
        if (diffX > diffY && diffX > 20) {
            this.isSwiping = true;
            e.preventDefault(); // Prevent vertical scroll
        }
    },

    handleTouchEnd(e) {
        if (!this.touchStartX || !this.touchStartY) return;
        
        this.touchEndX = e.changedTouches[0].screenX;
        this.touchEndY = e.changedTouches[0].screenY;
        
        if (this.isSwiping) {
            this.handleSwipe();
        }
        
        this.touchStartX = 0;
        this.touchStartY = 0;
        this.isSwiping = false;
    },

    handleMouseDown(e) {
        // Ignore clicks on buttons/links
        if (e.target.closest('button, a, img, [data-action]')) return;
        
        this.touchStartX = e.screenX;
        this.touchStartY = e.screenY;
        
        const onMouseMove = (ev) => {
            const diffX = Math.abs(ev.screenX - this.touchStartX);
            const diffY = Math.abs(ev.screenY - this.touchStartY);
            if (diffX > diffY && diffX > 20) {
                this.isSwiping = true;
            }
        };
        
        const onMouseUp = (ev) => {
            if (this.isSwiping) {
                this.touchEndX = ev.screenX;
                this.touchEndY = ev.screenY;
                this.handleSwipe();
            }
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
            this.touchStartX = 0;
            this.touchStartY = 0;
            this.isSwiping = false;
        };
        
        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
    },

    handleSwipe() {
        const diffX = this.touchEndX - this.touchStartX;
        const diffY = Math.abs(this.touchEndY - this.touchStartY);
        
        // Pastikan swipe horizontal dominan
        if (Math.abs(diffX) < this.minSwipeDistance) return;
        if (Math.abs(diffX) < diffY) return;
        
        if (diffX < 0) {
            // Swipe kiri → next
            this.navigate('next');
        } else {
            // Swipe kanan → prev
            this.navigate('prev');
        }
    },

    /**
     * Show swipe hint hanya sekali per session
     */
    showSwipeHintOnce() {
        if (sessionStorage.getItem('swipeHintShown')) return;
        
        const p = state.getCurrentPeriod();
        if (!p || !p.schools || p.schools.length <= 1) return;
        
        const hint = document.createElement('div');
        hint.className = 'swipe-hint';
        hint.innerHTML = '👆 Geser kiri/kanan atau gunakan tombol panah untuk navigasi';
        document.body.appendChild(hint);
        
        setTimeout(() => hint.remove(), 4000);
        sessionStorage.setItem('swipeHintShown', 'true');
    }
};
