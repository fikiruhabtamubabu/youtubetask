// js/app.js
import { supabase } from './supabase.js';

export async function checkRouteGuard(isProtectedRoute = true) {
  const urlParams = new URLSearchParams(window.location.search);
  const hasCode = urlParams.has('code');
  const hasHashToken = window.location.hash && window.location.hash.includes("access_token=");

  // If we detect an incoming OAuth callback (?code= or #access_token=)
  if (hasCode || hasHashToken) {
    // Poll the getSession function every 100ms (up to 20 times / 2 seconds) 
    // to dynamically wait for the background network exchange to complete.
    for (let i = 0; i < 20; i++) {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        // Cleanly clear the callback parameters (?code= or #hash) from the browser address bar
        window.history.replaceState({}, document.title, window.location.pathname);
        break;
      }
      // Wait 100ms before checking again
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  const { data: { session } } = await supabase.auth.getSession();
  
  if (isProtectedRoute && !session) {
    window.location.href = "login.html";
  } else if (!isProtectedRoute && session) {
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