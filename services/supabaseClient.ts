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

// Use environment variables if present, otherwise use the provided specific project credentials
const supabaseUrl = getEnvVar('VITE_SUPABASE_URL') || 'https://muhpuufgxdsezecbpfnj.supabase.co';
const supabaseKey = getEnvVar('VITE_SUPABASE_ANON_KEY') || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im11aHB1dWZneGRzZXplY2JwZm5qIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQwNzgwNTEsImV4cCI6MjA3OTY1NDA1MX0.U9UwIkdoUTsFwpYwBieXsYNW0XGG2BddVDRDBLPuxhY';

// Helper to check if we have valid credentials
export const isSupabaseConfigured = () => {
  return supabaseUrl && supabaseUrl.startsWith('http') && supabaseKey && supabaseKey !== 'placeholder';
};

if (!isSupabaseConfigured()) {
  console.warn('Supabase credentials not found or invalid. App will run in Demo Mode using mock data.');
}

// Initialize with valid URL or a safe fallback to prevent crash on init
export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co', 
  supabaseKey || 'placeholder'
);