// ============================================
// VIEWER MANAGEMENT SERVICE
// ============================================
import { getSupabase } from '../supabase-client.js';
import { auth } from '../auth.js';
import { hashPin, generatePin } from '../utils/crypto.js';

export const ViewerService = {
    async _checkSuperadmin() {
        if (!auth.isSuperadmin()) {
            throw new Error('Akses ditolak: hanya Superadmin');
        }
    },

    async getAll() {
        await this._checkSuperadmin();
        const supabase = getSupabase();
        const { data, error } = await supabase
            .from('admins')
            .select('*')
            .eq('role', 'viewer')
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        return data || [];
    },

    async create(notes = '') {
        await this._checkSuperadmin();
        const supabase = getSupabase();
        const user = auth.getCurrentUser();
        
        const pin = generatePin();
        const pinHash = await hashPin(pin);
        const username = `viewer_${Date.now()}`;
        
        const { data, error } = await supabase
            .from('admins')
            .insert({
                username: username,
                pin_hash: pinHash,
                role: 'viewer',
                is_active: true,
                notes: notes || `Viewer dibuat ${new Date().toLocaleString('id-ID')}`,
                created_by: user.userId
            })
            .select()
            .single();
        
        if (error) throw error;
        
        return {
            viewer: data,
            pin: pin
        };
    },

    async resetPin(id) {
        await this._checkSuperadmin();
        const supabase = getSupabase();
        
        const pin = generatePin();
        const pinHash = await hashPin(pin);
        
        const { data, error } = await supabase
            .from('admins')
            .update({ pin_hash: pinHash })
            .eq('id', id)
            .eq('role', 'viewer')
            .select()
            .single();
        
        if (error) throw error;
        
        return {
            viewer: data,
            pin: pin
        };
    },

    async toggleActive(id, isActive) {
        await this._checkSuperadmin();
        const supabase = getSupabase();
        
        const { data, error } = await supabase
            .from('admins')
            .update({ is_active: isActive })
            .eq('id', id)
            .eq('role', 'viewer')
            .select()
            .single();
        
        if (error) throw error;
        return data;
    },

    async updateNotes(id, notes) {
        await this._checkSuperadmin();
        const supabase = getSupabase();
        
        const { data, error } = await supabase
            .from('admins')
            .update({ notes: notes })
            .eq('id', id)
            .eq('role', 'viewer')
            .select()
            .single();
        
        if (error) throw error;
        return data;
    },

    async delete(id) {
        await this._checkSuperadmin();
        const supabase = getSupabase();
        
        const { error } = await supabase
            .from('admins')
            .delete()
            .eq('id', id)
            .eq('role', 'viewer');
        
        if (error) throw error;
    }
};
