// js/supabase.js
// Placeholders are automatically replaced by Netlify during deployment
const SUPABASE_URL = "___SUPABASE_URL___"; 
const SUPABASE_ANON_KEY = "___SUPABASE_ANON_KEY___"; 

const { createClient } = window.supabase;
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);