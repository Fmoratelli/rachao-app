import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  console.error(
    'Faltam VITE_SUPABASE_URL e/ou VITE_SUPABASE_ANON_KEY. Configure no .env'
  );
}

export const supabase = createClient(url, anonKey);

export const ADMIN_EMAIL = import.meta.env.VITE_ADMIN_EMAIL || '';
