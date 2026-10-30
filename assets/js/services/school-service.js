// ============================================
// SCHOOL SERVICE - DENGAN AUTO-LINK & STATUS
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

        // Auto-set status berdasarkan apakah ada bukti transfer
        const initialStatus = proofUrl ? 'transferred' : 'draft';

        const payload = {
            ...data,
            transfer_proof_url: proofUrl,
            transfer_proof_path: proofPath,
            transfer_status: data.transfer_status || initialStatus,
            status_updated_by: auth.getCurrentUser()?.userId || null
        };

        const supabase = getSupabase();
        const { data: inserted, error } = await supabase
            .from('schools')
            .insert(payload)
            .select()
            .single();

        if (error) throw error;
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

        // Auto-update status saat upload bukti pertama kali
        if (file && (!data.transfer_status || data.transfer_status === 'draft')) {
            data.transfer_status = 'transferred';
        }

        const payload = {
            ...data,
            transfer_proof_url: proofUrl,
            transfer_proof_path: proofPath,
            status_updated_by: auth.getCurrentUser()?.userId || null
        };

        const supabase = getSupabase();
        const { data: updated, error } = await supabase
            .from('schools')
            .update(payload)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return updated;
    },

    async updateStatus(id, status) {
        await this._checkSuperadmin();
        
        const validStatuses = ['draft', 'pending', 'transferred', 'verified', 'cancelled'];
        if (!validStatuses.includes(status)) {
            throw new Error('Status tidak valid');
        }

        const supabase = getSupabase();
        const { data, error } = await supabase
            .from('schools')
            .update({ 
                transfer_status: status,
                status_updated_by: auth.getCurrentUser()?.userId || null
            })
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    async batchUpdateStatus(ids, status) {
        await this._checkSuperadmin();
        
        const validStatuses = ['draft', 'pending', 'transferred', 'verified', 'cancelled'];
        if (!validStatuses.includes(status)) {
            throw new Error('Status tidak valid');
        }

        const supabase = getSupabase();
        const { error } = await supabase
            .from('schools')
            .update({ 
                transfer_status: status,
                status_updated_by: auth.getCurrentUser()?.userId || null
            })
            .in('id', ids);

        if (error) throw error;
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
    },

    /**
     * Auto-link school ke bank account berdasarkan bank_name + account_number
     */
    async autoLinkBankAccount(schoolId, bankName, accountNumber) {
        const supabase = getSupabase();
        
        // Cari bank account yang cocok
        const { data: match } = await supabase
            .from('bank_accounts')
            .select('id')
            .ilike('bank_name', bankName)
            .eq('account_number', accountNumber)
            .eq('is_active', true)
            .maybeSingle();
        
        if (match) {
            await supabase
                .from('schools')
                .update({ bank_account_id: match.id })
                .eq('id', schoolId);
            return match.id;
        }
        return null;
    },

    /**
     * Duplicate schools dari periode source ke periode target
     */
    async duplicateFromPeriod(sourcePeriodId, targetPeriodId, options = {}) {
        await this._checkSuperadmin();
        
        const supabase = getSupabase();
        
        // Fetch schools dari source period
        const { data: sourceSchools, error: fetchError } = await supabase
            .from('schools')
            .select('*')
            .eq('period_id', sourcePeriodId)
            .order('no_urut', { ascending: true });
        
        if (fetchError) throw fetchError;
        
        if (!sourceSchools || !sourceSchools.length) {
            throw new Error('Tidak ada sekolah di periode sumber');
        }

        // Fetch existing schools di target period (untuk skip duplicate)
        const { data: existingTarget } = await supabase
            .from('schools')
            .select('sekolah_name')
            .eq('period_id', targetPeriodId);
        
        const existingNames = new Set((existingTarget || []).map(s => s.sekolah_name.toLowerCase()));
        
        // Prepare new schools
        const newSchools = [];
        let noUrut = (existingTarget?.length || 0) + 1;
        
        for (const school of sourceSchools) {
            // Skip jika sudah ada di target (by nama)
            if (options.skipExisting && existingNames.has(school.sekolah_name.toLowerCase())) {
                continue;
            }
            
            newSchools.push({
                period_id: targetPeriodId,
                no_urut: noUrut++,
                sekolah_name: school.sekolah_name,
                pic_name: school.pic_name,
                bank_name: school.bank_name,
                account_number: school.account_number,
                nominal: options.resetNominal ? 0 : (school.nominal || 0),
                transfer_date: null,
                notes: school.notes,
                bank_account_id: school.bank_account_id,
                transfer_status: 'draft',
                transfer_proof_url: null,
                transfer_proof_path: null
            });
        }
        
        if (!newSchools.length) {
            throw new Error('Tidak ada sekolah baru untuk dicopy');
        }
        
        // Bulk insert
        const { data, error } = await supabase
            .from('schools')
            .insert(newSchools)
            .select();
        
        if (error) throw error;
        return data;
    }
};
