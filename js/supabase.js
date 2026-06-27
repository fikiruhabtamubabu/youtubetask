// js/supabase.js
const SUPABASE_URL = "https://sdojaqmqfjhlohuasoyo.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNkb2phcW1xZmpobG9odWFzb3lvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI1MTAzMjIsImV4cCI6MjA5ODA4NjMyMn0.p_hwXpYocF9RV6WZpyzYsvEHSYbcbIaWwX9gMzEKz40";

const { createClient } = window.supabase;
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);