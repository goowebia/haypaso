

import { createClient } from '@supabase/supabase-js';

// Prioridad: 1. import.meta.env (Vite), 2. process.env (Node/Hostinger Build), 3. Hardcoded Fallback
// Fix: Cast import.meta to any to resolve property 'env' error in environments missing Vite types
const SUPABASE_URL = 
  (import.meta as any).env?.VITE_SUPABASE_URL || 
  (typeof process !== 'undefined' ? process.env?.VITE_SUPABASE_URL : '') || 
  'https://lgbdffqtijwyzkkbpkup.supabase.co';

// Fix: Cast import.meta to any to resolve property 'env' error in environments missing Vite types
const SUPABASE_ANON_KEY = 
  (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || 
  (typeof process !== 'undefined' ? process.env?.VITE_SUPABASE_ANON_KEY : '') || 
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxnYmRmZnF0aWp3eXpra2Jwa3VwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAzODA4MzgsImV4cCI6MjA4NTk1NjgzOH0.YyPG6Jvs5BSGeIV0kL_sfQWC7cz3zW7Qj-rsoyXKU7M';

// Validación preventiva para evitar la pantalla azul
if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.warn("⚠️ Las llaves de Supabase no están configuradas correctamente en el entorno.");
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/**
 * Genera un ID de usuario único persistente para las validaciones
 */
export const getUserId = () => {
  if (typeof window === 'undefined') return 'server';
  let userId = localStorage.getItem('hay_paso_user_id');
  if (!userId) {
    userId = crypto.randomUUID();
    localStorage.setItem('hay_paso_user_id', userId);
  }
  return userId;
};
