// Admin panel control functions
import { supabase } from './supabase.js';
import { checkAdminGuard } from './app.js';
import { NotificationManager } from './notifications.js';

async function initAdmin() {
  await checkAdminGuard();
  await loadWithdrawalRequests();
  await loadActiveTasks();
}

async function loadWithdrawalRequests() {
  const { data: list } = await supabase
    .from('withdraw_requests')
    .select('*, profiles(name, email)')
    .eq('status', 'pending');

  const container = document.getElementById('payout-requests');
  if (!list || list.length === 0) {
    container.innerHTML = '<p style="color:var(--text-muted)">No pending payouts found.</p>';
    return;
  }

  container.innerHTML = list.map(req => `
    <div style="border-bottom:1px solid var(--border); padding:16px 0; display:flex; justify-content:space-between; align-items:center;">
      <div>
        <strong>$${req.amount.toFixed(2)}</strong> to ${req.profiles?.name || req.profiles?.email}<br>
        <span style="font-size:0.8rem; color:var(--text-muted)">Method: ${req.method} (${req.wallet})</span>
      </div>
      <div style="display:flex; gap:10px;">
        <button class="btn-primary" style="padding:6px 12px; background:var(--success); font-size:0.8rem;" onclick="processPayout('${req.id}', 'approved')">Approve</button>
        <button class="btn-secondary" style="padding:6px 12px; font-size:0.8rem;" onclick="processPayout('${req.id}', 'rejected')">Reject</button>
      </div>
    </div>
  `).join('');
}

window.processPayout = async (id, status) => {
  const { error } = await supabase
    .from('withdraw_requests')
    .update({ status })
    .eq('id', id);

  if (error) {
    NotificationManager.show("Modification error.", "error");
  } else {
    NotificationManager.show(`Request marked as ${status}.`, "success");
    loadWithdrawalRequests();
  }
};

async function loadActiveTasks() {
  const { data: list } = await supabase
    .from('youtube_tasks')
    .select('*');

  const container = document.getElementById('tasks-list');
  container.innerHTML = list.map(t => `
    <div style="padding:10px 0; border-bottom:1px solid var(--border); display:flex; justify-content:space-between;">
      <span>${t.title} (+$${t.reward.toFixed(2)})</span>
      <button class="btn-secondary" style="padding:4px 8px; font-size:0.75rem;" onclick="deleteTask('${t.id}')">Delete</button>
    </div>
  `).join('');
}

window.deleteTask = async (id) => {
  const { error } = await supabase.from('youtube_tasks').delete().eq('id', id);
  if (error) NotificationManager.show("Task deletion error", "error");
  else {
    NotificationManager.show("Task removed.", "success");
    loadActiveTasks();
  }
};

document.getElementById('task-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const title = document.getElementById('task-title').value;
  const youtube_url = document.getElementById('task-url').value;
  const reward = parseFloat(document.getElementById('task-reward').value);
  const watch_time = parseInt(document.getElementById('task-time').value);

  const { error } = await supabase.from('youtube_tasks').insert({
    title, youtube_url, reward, watch_time, status: 'active'
  });

  if (error) NotificationManager.show(error.message, "error");
  else {
    NotificationManager.show("New rewarded task registered!", "success");
    loadActiveTasks();
  }
});

document.addEventListener('DOMContentLoaded', initAdmin);