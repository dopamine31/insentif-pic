// ============================================
// GLOBAL STATE MANAGEMENT
// ============================================
import { getSupabase } from './supabase-client.js';

class AppState {
    constructor() {
        this.periods = [];
        this.currentPeriodIdx = -1;
        this.currentSchool = null;
        this.loading = false;
        this.listeners = new Set();
    }

    subscribe(fn) {
        this.listeners.add(fn);
        return () => this.listeners.delete(fn);
    }

    notify() {
        this.listeners.forEach(fn => fn(this));
    }

    async loadPeriods() {
        this.loading = true;
        this.notify();
        
        try {
            const supabase = getSupabase();
            const { data, error } = await supabase
                .from('periods')
                .select('*, schools(*)')
                .order('created_at', { ascending: false });
            
            if (error) throw error;
            
            // Sort schools by no_urut
            this.periods = (data || []).map(p => ({
                ...p,
                schools: (p.schools || []).sort((a, b) => (a.no_urut || 0) - (b.no_urut || 0))
            }));
        } catch (err) {
            console.error('Load periods error:', err);
            throw err;
        } finally {
            this.loading = false;
            this.notify();
        }
    }

    getCurrentPeriod() {
        if (this.currentPeriodIdx < 0) return null;
        return this.periods[this.currentPeriodIdx];
    }

    setCurrentPeriod(idx) {
        this.currentPeriodIdx = idx;
        this.currentSchool = null;
        this.notify();
    }

    setCurrentSchool(school) {
        this.currentSchool = school;
        this.notify();
    }

    refreshPeriod(periodId) {
        const idx = this.periods.findIndex(p => p.id === periodId);
        if (idx >= 0) this.currentPeriodIdx = idx;
    }

    getGrandTotal() {
        return this.periods.reduce((sum, p) => {
            const nominal = (p.schools || []).reduce((s, sch) => s + (Number(sch.nominal) || 0), 0);
            return sum + nominal;
        }, 0);
    }

    getTotalSchools() {
        return this.periods.reduce((sum, p) => sum + (p.schools?.length || 0), 0);
    }
}

export const state = new AppState();
