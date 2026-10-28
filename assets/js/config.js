// ============================================
// KONFIGURASI SUPABASE
// ============================================

export const SUPABASE_CONFIG = {
    url: 'https://ujdmumcpqyqurnmcyyzs.supabase.co',
    anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVqZG11bWNwcXlxdXJubWN5eXpzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTMyMDE5MDgsImV4cCI6MjEwODc3NzkwOH0.L5VfdHvc3ZoT3HE3KGBbILxAnTmzwMcfowyESNcqDFQ'
};

export const APP_CONFIG = {
    name: 'Summary Insentif PIC',
    version: '2.0.0',
    sessionKey: 'pic_auth_session',
    lockDuration: 60000,
    maxPinAttempts: 5,
    globalSalt: 'pic_incentive:'
};
