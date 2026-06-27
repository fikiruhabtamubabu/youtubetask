// js/referral.js
import { supabase } from './supabase.js';
import { checkRouteGuard } from './app.js';
import { NotificationManager } from './notifications.js';
import { formatCurrency, formatDate } from './utils.js';

async function initReferral() {
  const session = await checkRouteGuard(true);
  if (!session) return;

  const { data: profile } = await supabase
    .from('profiles')
    .select('referral_code')
    .eq('id', session.user.id)
    .single();

  if (profile && profile.referral_code) {
    const referralUrl = `${window.location.origin}/signup.html?ref=${profile.referral_code}`;
    const linkInput = document.getElementById('referral-link');
    if (linkInput) {
      linkInput.value = referralUrl;
    }
  }

  await loadReferralsList(session.user.id);
}

async function loadReferralsList(userId) {
  console.log("1. Querying referrals for User ID:", userId);

  // Query 1: Fetch raw referral records (No relations or joins - 100% error-proof)
  const { data: list, error: refError } = await supabase
    .from('referrals')
    .select('*')
    .eq('referrer_id', userId);

  const countElement = document.getElementById('referrals-count');
  const earningsElement = document.getElementById('referrals-earnings');
  const container = document.getElementById('referral-history');

  if (refError) {
    console.error("2. Referrals Query Error:", refError);
    if (countElement) countElement.innerText = "0";
    if (earningsElement) earningsElement.innerText = formatCurrency(0);
    if (container) {
      container.innerHTML = `<p style="color: #EF4444; text-align: center;">Query Error: ${refError.message}</p>`;
    }
    return;
  }

  console.log("3. Raw referrals returned from database:", list);

  if (!list || list.length === 0) {
    console.log("4. No referrals found in database matching this User ID.");
    if (countElement) countElement.innerText = "0";
    if (earningsElement) earningsElement.innerText = formatCurrency(0);
    if (container) {
      container.innerHTML = '<p style="color:var(--text-muted); text-align: center;">No referred accounts registered yet.</p>';
    }
    return;
  }

  // Update Referral Count
  if (countElement) countElement.innerText = list.length;

  // Calculate Total referral earnings (0.50 per referral)
  const totalEarned = list.length * 0.50;
  if (earningsElement) earningsElement.innerText = formatCurrency(totalEarned);

  // Query 2: Fetch referred user profile details using a clean ID lookup
  const referredIds = list.map(ref => ref.referred_id);
  const { data: profiles, error: profError } = await supabase
    .from('profiles')
    .select('id, name, email')
    .in('id', referredIds);

  if (profError) {
    console.error("5. Profiles Query Error:", profError);
  }

  console.log("6. Referred profiles metadata returned:", profiles);

  // Map profile metadata by User ID
  const profileMap = {};
  if (profiles) {
    profiles.forEach(p => {
      profileMap[p.id] = p;
    });
  }

  // Render the Referral History List (Simplified: no pending/complete status shown)
  if (container) {
    container.innerHTML = list.map(ref => {
      const profile = profileMap[ref.referred_id];
      const displayName = profile?.name || profile?.email || 'New User';
      
      return `
        <div style="border-bottom: 1px solid var(--border); padding: 14px 0; display:flex; justify-content:space-between; align-items:center;">
          <div>
            <strong>${displayName}</strong><br>
            <span style="font-size:0.8rem; color:var(--text-muted)">Joined the platform</span>
          </div>
          <div style="font-weight: 600; color: var(--success)">
            +${formatCurrency(0.50)}
          </div>
        </div>
      `;
    }).join('');
  }
}

document.getElementById('copy-referral-btn').addEventListener('click', () => {
  const linkBox = document.getElementById('referral-link');
  if (linkBox) {
    linkBox.select();
    document.execCommand('copy');
    NotificationManager.show("Link copied to clipboard!", "success");
  }
});

document.addEventListener('DOMContentLoaded', initReferral);