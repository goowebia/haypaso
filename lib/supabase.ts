
import { createClient } from '@supabase/supabase-js';

// Función ultra segura para leer variables
const getSafeEnv = (key: string, fallback: string): string => {
  try {
    // 1. Intentar con Vite
    const viteEnv = (import.meta as any).env?.[key];
    if (viteEnv) return viteEnv;

    // 2. Intentar con process (Hostinger Build)
    if (typeof process !== 'undefined' && process.env?.[key]) {
      return process.env[key] as string;
    }
  } catch (e) {
    // Silencioso
  }
  return fallback;
};

// Llaves de respaldo directas para asegurar que el cliente se cree siempre
const DEFAULT_URL = 'https://lgbdffqtijwyzkkbpkup.supabase.co';
const DEFAULT_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxnYmRmZnF0aWp3eXpra2Jwa3VwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAzODA4MzgsImV4cCI6MjA4NTk1NjgzOH0.YyPG6Jvs5BSGeIV0kL_sfQWC7cz3zW7Qj-rsoyXKU7M';

const supabaseUrl = getSafeEnv('VITE_SUPABASE_URL', DEFAULT_URL);
const supabaseAnonKey = getSafeEnv('VITE_SUPABASE_ANON_KEY', DEFAULT_KEY);

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const getUserId = () => {
  if (typeof window === 'undefined') return 'server';
  let userId = localStorage.getItem('hay_paso_user_id');
  if (!userId) {
    userId = crypto.randomUUID();
    localStorage.setItem('hay_paso_user_id', userId);
  }
  return userId;
};
