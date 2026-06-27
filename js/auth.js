// Authentication operations handler
import { supabase } from './supabase.js';
import { NotificationManager } from './notifications.js';

export async function signupUser(email, password, referralCode = null) {
  try {
    const { data: authData, error: signupErr } = await supabase.auth.signUp({
      email,
      password
    });

    if (signupErr) throw signupErr;

    // Handle referral linkage if code exists
    if (referralCode && authData.user) {
      const { data: referrer, error: refErr } = await supabase
        .from('profiles')
        .select('id')
        .eq('referral_code', referralCode)
        .single();

      if (!refErr && referrer) {
        await supabase.from('referrals').insert({
          referrer_id: referrer.id,
          referred_id: authData.user.id,
          status: 'pending'
        });
      }
    }

    NotificationManager.show("Registration complete! Verify your email to login.", "success");
    return authData;
  } catch (err) {
    NotificationManager.show(err.message, "error");
    return null;
  }
}

export async function loginUser(email, password) {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    NotificationManager.show("Welcome back!", "success");
    setTimeout(() => window.location.href = "dashboard.html", 1500);
  } catch (err) {
    NotificationManager.show(err.message, "error");
  }
}

export async function loginWithGoogle() {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: window.location.origin + '/dashboard.html'
    }
  });
  if (error) NotificationManager.show(error.message, "error");
}