// ============================================
// STORAGE SERVICE - Upload/Delete Files
// ============================================
import { getSupabase } from '../supabase-client.js';

export const StorageService = {
    async upload(file, folder = 'transfers') {
        const supabase = getSupabase();
        const timestamp = Date.now();
        const safeName = file.name.replace(/[^a-zA-Z0-9.]/g, '_');
        const filePath = `${folder}/${timestamp}_${safeName}`;

        const { data, error } = await supabase.storage
            .from('transfer-proofs')
            .upload(filePath, file, {
                cacheControl: '3600',
                upsert: false
            });

        if (error) throw error;

        const { data: urlData } = supabase.storage
            .from('transfer-proofs')
            .getPublicUrl(data.path);

        return {
            url: urlData.publicUrl,
            path: data.path
        };
    },

    async delete(path) {
        if (!path) return;
        const supabase = getSupabase();
        const { error } = await supabase.storage
            .from('transfer-proofs')
            .remove([path]);
        
        if (error) {
            console.warn('Gagal hapus file dari storage:', error);
        }
    }
};
