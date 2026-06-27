// Root lifecycle configuration handling session validation guards
import { supabase } from './supabase.js';

export async function checkRouteGuard(isProtectedRoute = true) {
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