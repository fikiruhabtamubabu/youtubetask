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
          name: name,
          referral_code: referralCode // Pass the referral code in user metadata
        }
      }
    });

    if (signupErr) throw signupErr;

    NotificationManager.show("Registration successful!", "success");
    
    // Automatically log the user in
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