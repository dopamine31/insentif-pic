// ============================================
// PERIOD CRUD SERVICE
// ============================================
import { getSupabase } from '../supabase-client.js';
import { state } from '../state.js';

export const PeriodService = {
    async create(data) {
        const supabase = getSupabase();
        const { data: inserted, error } = await supabase
            .from('periods')
            .insert(data)
            .select()
            .single();
        
        if (error) throw error;
        await state.loadPeriods();
        return inserted;
    },

    async update(id, data) {
        const supabase = getSupabase();
        const { data: updated, error } = await supabase
            .from('periods')
            .update(data)
            .eq('id', id)
            .select()
            .single();
        
        if (error) throw error;
        await state.loadPeriods();
        return updated;
    },

    async delete(id) {
        const supabase = getSupabase();
        const { error } = await supabase
            .from('periods')
            .delete()
            .eq('id', id);
        
        if (error) throw error;
        await state.loadPeriods();
    }
};
