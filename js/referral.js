// Referral dynamic program logic
import { supabase } from './supabase.js';
import { checkRouteGuard } from './app.js';
import { NotificationManager } from './notifications.js';

async function initReferral() {
  const session = await checkRouteGuard(true);
  if (!session) return;

  const { data: profile } = await supabase
    .from('profiles')
    .select('referral_code')
    .eq('id', session.user.id)
    .single();

  if (profile) {
    const referralUrl = `${window.location.origin}/signup.html?ref=${profile.referral_code}`;
    document.getElementById('referral-link').value = referralUrl;
  }

  await loadReferralsList(session.user.id);
}

async function loadReferralsList(userId) {
  const { data: list } = await supabase
    .from('referrals')
    .select(`
      id,
      status,
      reward,
      referred:profiles!referred_id(name, email)
    `)
    .eq('referrer_id', userId);

  const container = document.getElementById('referral-history');
  if (!list || list.length === 0) {
    container.innerHTML = '<p style="color:var(--text-muted)">No accounts referred yet.</p>';
    return;
  }

  container.innerHTML = list.map(ref => `
    <div style="border-bottom: 1px solid var(--border); padding: 12px 0; display:flex; justify-content:space-between;">
      <div>
        <strong>${ref.referred?.name || ref.referred?.email}</strong><br>
        <span style="font-size:0.8rem; color:var(--text-muted)">Status: ${ref.status.toUpperCase()}</span>
      </div>
      <div style="color:var(--success)">+$${ref.reward.toFixed(2)}</div>
    </div>
  `).join('');
}

document.getElementById('copy-referral-btn').addEventListener('click', () => {
  const linkBox = document.getElementById('referral-link');
  linkBox.select();
  document.execCommand('copy');
  NotificationManager.show("Link copied to clipboard!", "success");
});

document.addEventListener('DOMContentLoaded', initReferral);