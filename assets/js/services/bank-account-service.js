// ============================================
// BANK ACCOUNT SERVICE
// ============================================
import { getSupabase } from '../supabase-client.js';
import { auth } from '../auth.js';

export const BankAccountService = {
    async _checkSuperadmin() {
        if (!auth.isSuperadmin()) {
            throw new Error('Akses ditolak: hanya Superadmin');
        }
    },

    async getAll() {
        const supabase = getSupabase();
        const { data, error } = await supabase
            .from('bank_accounts')
            .select('*, schools(sekolah_name)')
            .order('is_primary', { ascending: false })
            .order('account_name', { ascending: true });
        
        if (error) throw error;
        return data || [];
    },

    async getActiveAccounts() {
        const supabase = getSupabase();
        const { data, error } = await supabase
            .from('bank_accounts')
            .select('*')
            .eq('is_active', true)
            .order('is_primary', { ascending: false })
            .order('account_name', { ascending: true });
        
        if (error) throw error;
        return data || [];
    },

    async create(payload) {
        await this._checkSuperadmin();
        const supabase = getSupabase();
        
        if (payload.is_primary) {
            await supabase.from('bank_accounts').update({ is_primary: false }).neq('id', '00000000-0000-0000-0000-000000000000');
        }
        
        const { data, error } = await supabase
            .from('bank_accounts')
            .insert(payload)
            .select()
            .single();
        
        if (error) throw error;
        return data;
    },

    async update(id, payload) {
        await this._checkSuperadmin();
        const supabase = getSupabase();
        
        if (payload.is_primary) {
            await supabase.from('bank_accounts').update({ is_primary: false }).neq('id', id);
        }
        
        const { data, error } = await supabase
            .from('bank_accounts')
            .update(payload)
            .eq('id', id)
            .select()
            .single();
        
        if (error) throw error;
        return data;
    },

    async delete(id) {
        await this._checkSuperadmin();
        const supabase = getSupabase();
        const { error } = await supabase.from('bank_accounts').delete().eq('id', id);
        if (error) throw error;
    },

    async getAllSchools() {
        const supabase = getSupabase();
        const { data, error } = await supabase
            .from('schools')
            .select('id, sekolah_name, period_id, periods(name)')
            .order('sekolah_name', { ascending: true });
        
        if (error) throw error;
        return data || [];
    },

    /**
     * Find matching account berdasarkan bank + nomor
     */
    async findMatching(bankName, accountNumber) {
        const supabase = getSupabase();
        const { data, error } = await supabase
            .from('bank_accounts')
            .select('*')
            .ilike('bank_name', bankName)
            .eq('account_number', accountNumber)
            .eq('is_active', true)
            .maybeSingle();
        
        if (error) return null;
        return data;
    }
};
