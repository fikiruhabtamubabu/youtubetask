// js/auth.js
import { supabase } from './supabase.js';
import { NotificationManager } from './notifications.js';

export async function signupUser(email, password, name, referralCode = null) {
  try {
    const { data: authData, error: signupErr } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name: name // Automatically saved to raw_user_meta_data
        }
      }
    });

    if (signupErr) throw signupErr;

    // Handle referral tracking if code is present
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

    NotificationManager.show("Registration successful!", "success");
    
    // Automatically log the user in immediately after signup
    await loginUser(email, password);
    
  } catch (err) {
    NotificationManager.show(err.message, "error");
  }
}

export async function loginUser(email, password) {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    
    if (error) throw error;
    
    NotificationManager.show("Sign in successful!", "success");
    setTimeout(() => {
      window.location.href = "dashboard.html";
    }, 1500);
    
  } catch (err) {
    NotificationManager.show(err.message, "error");
  }
}