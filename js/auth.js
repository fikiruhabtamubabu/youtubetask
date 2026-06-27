// js/auth.js
import { supabase } from './supabase.js';
import { NotificationManager } from './notifications.js';

export async function signupUser(email, password, name, referralCode = null) {
  try {
    // 1. Create the user
    const { data: authData, error: signupErr } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name: name
        }
      }
    });

    if (signupErr) throw signupErr;

    NotificationManager.show("Registration successful!", "success");
    
    // 2. Log the user in to establish their active session
    const { data: loginData, error: loginErr } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    
    if (loginErr) throw loginErr;
    
    // 3. Link referral immediately and securely via RPC
    if (referralCode) {
      console.log("Linking referral with code:", referralCode);
      const { data: refData, error: refError } = await supabase.rpc('link_referral', {
        referrer_code: referralCode
      });
      
      if (refError) {
        console.error("Referral linking failed at database:", refError);
      } else if (!refData.success) {
        console.error("Referral linking bypassed:", refData.message);
      } else {
        console.log("Referral linked successfully!");
      }
    }

    NotificationManager.show("Sign in successful!", "success");
    setTimeout(() => {
      window.location.href = "dashboard.html";
    }, 1500);
    
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