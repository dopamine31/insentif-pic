// ============================================
// SCHOOL CRUD SERVICE
// ============================================
import { getSupabase } from '../supabase-client.js';
import { state } from '../state.js';
import { auth } from '../auth.js';
import { StorageService } from './storage-service.js';

export const SchoolService = {
    async _checkSuperadmin() {
        if (!auth.isSuperadmin()) {
            throw new Error('Akses ditolak: hanya Superadmin');
        }
    },

    async create(data, file = null) {
        await this._checkSuperadmin();
        
        let proofUrl = null;
        let proofPath = null;

        if (file) {
            const uploaded = await StorageService.upload(file, `periods/${data.period_id}`);
            proofUrl = uploaded.url;
            proofPath = uploaded.path;
        }

        const payload = {
            ...data,
            transfer_proof_url: proofUrl,
            transfer_proof_path: proofPath
        };

        const supabase = getSupabase();
        const { data: inserted, error } = await supabase
            .from('schools')
            .insert(payload)
            .select()
            .single();

        if (error) throw error;
        await state.loadPeriods();
        return inserted;
    },

    async update(id, data, file = null, existingPath = null) {
        await this._checkSuperadmin();
        
        let proofUrl = data.transfer_proof_url || null;
        let proofPath = existingPath || null;

        if (file) {
            if (existingPath) {
                await StorageService.delete(existingPath);
            }
            const uploaded = await StorageService.upload(file, `periods/${data.period_id}`);
            proofUrl = uploaded.url;
            proofPath = uploaded.path;
        }

        const payload = {
            ...data,
            transfer_proof_url: proofUrl,
            transfer_proof_path: proofPath
        };

        const supabase = getSupabase();
        const { data: updated, error } = await supabase
            .from('schools')
            .update(payload)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        await state.loadPeriods();
        return updated;
    },

    async delete(id, proofPath = null) {
        await this._checkSuperadmin();
        
        if (proofPath) {
            await StorageService.delete(proofPath);
        }

        const supabase = getSupabase();
        const { error } = await supabase
            .from('schools')
            .delete()
            .eq('id', id);

        if (error) throw error;
        await state.loadPeriods();
    }
};
