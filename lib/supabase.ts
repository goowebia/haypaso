
import { createClient } from '@supabase/supabase-js';

/**
 * Obtiene de forma segura las variables de entorno priorizando import.meta.env de Vite.
 * Si fallan, devuelve strings vacíos para evitar que la app crashee antes de mostrar el loader.
 */
const getEnvVar = (key: string): string => {
  try {
    const metaEnv = (import.meta as any).env;
    if (metaEnv && metaEnv[key]) return metaEnv[key];
    
    if (typeof process !== 'undefined' && process.env && process.env[key]) {
      return process.env[key] as string;
    }
  } catch (e) {
    console.warn(`Error leyendo la variable ${key}:`, e);
  }
  return '';
};

const SUPABASE_URL = getEnvVar('VITE_SUPABASE_URL') || 'https://lgbdffqtijwyzkkbpkup.supabase.co';
const SUPABASE_ANON_KEY = getEnvVar('VITE_SUPABASE_ANON_KEY') || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxnYmRmZnF0aWp3eXpra2Jwa3VwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAzODA4MzgsImV4cCI6MjA4NTk1NjgzOH0.YyPG6Jvs5BSGeIV0kL_sfQWC7cz3zW7Qj-rsoyXKU7M';

// Solo inicializamos si tenemos llaves básicas para evitar el error de createClient
export const supabase = createClient(
  SUPABASE_URL || 'https://empty.supabase.co', 
  SUPABASE_ANON_KEY || 'empty'
);

export const getUserId = () => {
  if (typeof window === 'undefined') return 'server';
  let userId = localStorage.getItem('hay_paso_user_id');
  if (!userId) {
    userId = crypto.randomUUID();
    localStorage.setItem('hay_paso_user_id', userId);
  }
  return userId;
};
