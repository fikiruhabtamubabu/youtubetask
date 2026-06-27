// js/referral.js
import { supabase } from './supabase.js';
import { checkRouteGuard } from './app.js';
import { NotificationManager } from './notifications.js';
import { formatCurrency } from './utils.js';

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
  const { data: list, error } = await supabase
    .from('referrals')
    .select(`
      id,
      status,
      reward,
      referred:profiles!referred_id(name, email)
    `)
    .eq('referrer_id', userId);

  const countElement = document.getElementById('referrals-count');
  const earningsElement = document.getElementById('referrals-earnings');
  const container = document.getElementById('referral-history');

  if (error || !list || list.length === 0) {
    countElement.innerText = "0";
    earningsElement.innerText = formatCurrency(0);
    container.innerHTML = '<p style="color:var(--text-muted); text-align: center;">No referred accounts registered yet.</p>';
    return;
  }

  // Count total registers
  countElement.innerText = list.length;

  // Calculate earned referral rewards
  const totalEarned = list.reduce((acc, curr) => acc + (curr.status === 'completed' ? curr.reward : 0), 0);
  earningsElement.innerText = formatCurrency(totalEarned);

  // Render the table
  container.innerHTML = list.map(ref => `
    <div style="border-bottom: 1px solid var(--border); padding: 14px 0; display:flex; justify-content:space-between; align-items:center;">
      <div>
        <strong>${ref.referred?.name || ref.referred?.email}</strong><br>
        <span style="font-size:0.8rem; color:var(--text-muted)">Status: ${ref.status === 'completed' ? 'Earned' : 'Pending First Task'}</span>
      </div>
      <div style="font-weight: 600; color: ${ref.status === 'completed' ? 'var(--success)' : 'var(--text-muted)'}">
        ${ref.status === 'completed' ? `+${formatCurrency(ref.reward)}` : 'Pending'}
      </div>
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