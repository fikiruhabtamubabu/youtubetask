// Handling user withdrawal operations securely
import { supabase } from './supabase.js';
import { checkRouteGuard } from './app.js';
import { NotificationManager } from './notifications.js';
import { formatCurrency } from './utils.js';

async function initWithdraw() {
  const session = await checkRouteGuard(true);
  if (!session) return;

  await loadWithdrawalsHistory(session.user.id);
}

async function loadWithdrawalsHistory(userId) {
  const { data: list } = await supabase
    .from('withdraw_requests')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  const container = document.getElementById('withdraw-history');
  if (!list || list.length === 0) {
    container.innerHTML = '<p style="color:var(--text-muted)">No withdrawals registered yet.</p>';
    return;
  }

  container.innerHTML = list.map(req => `
    <div style="border-bottom: 1px solid var(--border); padding:12px 0; display:flex; justify-content:space-between;">
      <div>
        <strong>${formatCurrency(req.amount)}</strong> via ${req.method}<br>
        <span style="font-size:0.8rem; color:var(--text-muted)">Wallet: ${req.wallet}</span>
      </div>
      <div style="color: ${req.status === 'approved' ? 'var(--success)' : req.status === 'pending' ? 'var(--accent)' : 'red'}">
        ${req.status.toUpperCase()}
      </div>
    </div>
  `).join('');
}

document.getElementById('withdraw-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const amount = parseFloat(document.getElementById('amount').value);
  const method = document.getElementById('method').value;
  const wallet = document.getElementById('wallet').value;

  const { data, error } = await supabase.rpc('submit_withdrawal', {
    amount_val: amount,
    method_val: method,
    wallet_val: wallet
  });

  if (error || !data.success) {
    NotificationManager.show(data?.message || "Unable to submit withdraw request.", "error");
  } else {
    NotificationManager.show("Withdrawal request created successfully!", "success");
    location.reload();
  }
});

document.addEventListener('DOMContentLoaded', initWithdraw);