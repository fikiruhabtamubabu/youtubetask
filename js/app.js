// js/app.js
import { supabase } from './supabase.js';

export async function checkRouteGuard(isProtectedRoute = true) {
  // If we just arrived from Google Auth, the URL has the access_token in the hash.
  // We must pause the route guard to let Supabase parse and save the session.
  if (window.location.hash && window.location.hash.includes("access_token=")) {
    // Wait 800 milliseconds for Supabase to finish parsing the URL hash
    await new Promise(resolve => setTimeout(resolve, 800));
  }

  const { data: { session } } = await supabase.auth.getSession();
  
  if (isProtectedRoute && !session) {
    // No active session found - redirect to login
    window.location.href = "login.html";
  } else if (!isProtectedRoute && session) {
    // Active session found on an auth page (login/signup) - redirect to dashboard
    window.location.href = "dashboard.html";
  }
  
  return session;
}

export async function checkAdminGuard() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    window.location.href = "login.html";
    return;
  }

  const { data: admin, error } = await supabase
    .from('admins')
    .select('id')
    .eq('id', user.id)
    .single();

  if (error || !admin) {
    window.location.href = "dashboard.html";
  }
}