
import { createClient } from '@supabase/supabase-js';

// Intentar obtener las variables de entorno, priorizando la configuración del usuario
const getSafeEnv = (key: string, fallback: string): string => {
  try {
    const viteEnv = (import.meta as any).env?.[key];
    if (viteEnv) return viteEnv;
    if (typeof process !== 'undefined' && process.env?.[key]) {
      return process.env[key] as string;
    }
  } catch (e) {}
  return fallback;
};

// URL y Key proporcionadas por el usuario para targets.mx
const SUPABASE_URL = getSafeEnv('VITE_SUPABASE_URL', 'https://lgbdffqtijwyzkkbpkup.supabase.co');
const SUPABASE_ANON_KEY = getSafeEnv('VITE_SUPABASE_ANON_KEY', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxnYmRmZnF0aWp3eXpra2Jwa3VwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAzODA4MzgsImV4cCI6MjA4NTk1NjgzOH0.YyPG6Jvs5BSGeIV0kL_sfQWC7cz3zW7Qj-rsoyXKU7M');

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  }
});

export const getUserId = () => {
  if (typeof window === 'undefined') return 'server';
  let userId = localStorage.getItem('hay_paso_user_id');
  if (!userId) {
    userId = crypto.randomUUID();
    localStorage.setItem('hay_paso_user_id', userId);
  }
  return userId;
};
