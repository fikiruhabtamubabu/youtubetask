// js/balance.js
import { supabase } from './supabase.js';

async function initBalance() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const { data: profile } = await supabase.from('profiles').select('balance').eq('id', user.id).single();
  if (profile) {
    document.getElementById('currentBalance').innerText = `$${profile.balance.toFixed(2)}`;
  }

  const { data: txns } = await supabase.from('transactions').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
  const tbody = document.getElementById('txnHistoryBody');
  if (!tbody) return;

  if (!txns || txns.length === 0) {
    tbody.innerHTML = `<tr><td colspan="4" style="text-align:center; padding: 24px; color: var(--text-muted);">No records found.</td></tr>`;
    return;
  }

  tbody.innerHTML = txns.map(t => `
    <tr style="border-bottom: 1px solid var(--border);">
      <td style="padding: 12px; text-transform: capitalize;"><strong>${t.type}</strong></td>
      <td style="padding: 12px; color: var(--text-muted);">${t.description || ''}</td>
      <td style="padding: 12px; color: ${t.amount >= 0 ? 'var(--success)' : '#EF4444'}">${t.amount >= 0 ? '+' : ''}$${t.amount.toFixed(2)}</td>
      <td style="padding: 12px; font-size: 0.85rem; color: var(--text-muted);">${new Date(t.created_at).toLocaleDateString()}</td>
    </tr>
  `).join('');
}

document.addEventListener('DOMContentLoaded', initBalance);