import { createClient } from '@supabase/supabase-js';

const getEnvVar = (key: string) => {
  try {
    // Check import.meta.env (Vite)
    if (typeof import.meta !== 'undefined' && (import.meta as any).env) {
      return (import.meta as any).env[key];
    }
    // Check process.env (Node/Webpack) - Safe check for ReferenceError
    if (typeof process !== 'undefined' && process.env) {
      return process.env[key];
    }
  } catch (e) {
    // Ignore access errors
  }
  return undefined;
};

const supabaseUrl = getEnvVar('VITE_SUPABASE_URL');
const supabaseKey = getEnvVar('VITE_SUPABASE_ANON_KEY');

// Helper to check if we have valid credentials
export const isSupabaseConfigured = () => {
  return supabaseUrl && supabaseUrl.startsWith('http') && supabaseKey;
};

if (!isSupabaseConfigured()) {
  console.warn('Supabase credentials not found or invalid. App will run in Demo Mode using mock data.');
}

// Initialize with valid URL or a safe fallback to prevent crash on init
export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co', 
  supabaseKey || 'placeholder'
);