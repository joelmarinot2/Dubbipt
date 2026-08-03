import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

// REEMPLAZA ESTO CON TU URL DE SUPABASE
const SUPABASE_URL = 'https://rdveoxcnrtirhxpmtmck.supabase.co'; 

// PEGA TU CLAVE JWT AQUÍ (La que proporcionaste)
const SUPABASE_ANON_KEY = 'TU_CLAVE_JWT_AQUI'; 

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
        persistSession: true,
        autoRefreshToken: true
    }
});