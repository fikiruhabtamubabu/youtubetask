// js/admin.js
import { supabase } from './supabase.js';
import { checkAdminGuard } from './app.js';
import { NotificationManager } from './notifications.js';

async function initAdminPanel() {
  await checkAdminGuard();
  await loadAdminStats();
  await loadPayoutRequests();
  await loadCreatedTasksList();
}

async function loadAdminStats() {
  // 1. Query total system users
  const { count: usersCount } = await supabase
    .from('profiles')
    .select('id', { count: 'exact', head: true });
  document.getElementById('admin-total-users').innerText = usersCount || 0;

  // 2. Query active users (defined as users who have completed at least 1 task)
  const { data: activeUsers, error: activeErr } = await supabase
    .from('completed_tasks')
    .select('user_id');
  
  let uniqueActiveCount = 0;
  if (!activeErr && activeUsers) {
    const uniqueUsers = new Set(activeUsers.map(item => item.user_id));
    uniqueActiveCount = uniqueUsers.size;
  }
  // Fallback to updating an active users element if it exists in your dashboard markup
  const activeUserEl = document.getElementById('admin-active-users');
  if (activeUserEl) {
    activeUserEl.innerText = uniqueActiveCount;
  }

  // 3. Query total active youtube tasks
  const { count: tasksCount } = await supabase
    .from('youtube_tasks')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'active');
  document.getElementById('admin-total-tasks').innerText = tasksCount || 0;

  // 4. Query pending withdraw requests count (now matching status 'inprogress')
  const { count: pendingPayoutsCount } = await supabase
    .from('withdraw_requests')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'inprogress');
  document.getElementById('admin-pending-payouts').innerText = pendingPayoutsCount || 0;
}

async function loadPayoutRequests() {
  const container = document.getElementById('payout-requests-container');

  const { data: requests, error } = await supabase
    .from('withdraw_requests')
    .select('*, profiles(name, email)')
    .eq('status', 'inprogress'); // Matches 'inprogress' default

  if (error || !requests || requests.length === 0) {
    container.innerHTML = '<p style="color: var(--text-muted);">No pending withdrawals.</p>';
    return;
  }

  container.innerHTML = requests.map(req => `
    <div style="border-bottom: 1px solid var(--border); padding: 12px 0; display: flex; justify-content: space-between; align-items: center;">
      <div>
        <strong>$${req.amount.toFixed(2)}</strong> to ${req.profiles?.name || req.profiles?.email}<br>
        <span style="font-size: 0.8rem; color: var(--text-muted);">${req.method} (${req.wallet})</span>
      </div>
      <div style="display: flex; gap: 8px;">
        <button class="btn-primary approve-btn" data-id="${req.id}" style="padding: 6px 12px; font-size: 0.75rem; background: var(--success);">Approve</button>
        <button class="btn-secondary reject-btn" data-id="${req.id}" style="padding: 6px 12px; font-size: 0.75rem; color: #EF4444; border-color: rgba(239, 68, 68, 0.2);">Reject</button>
      </div>
    </div>
  `).join('');

  // Attach event handlers
  document.querySelectorAll('.approve-btn').forEach(btn => {
    btn.addEventListener('click', () => processPayout(btn.getAttribute('data-id'), 'approved'));
  });
  document.querySelectorAll('.reject-btn').forEach(btn => {
    btn.addEventListener('click', () => processPayout(btn.getAttribute('data-id'), 'rejected'));
  });
}

// Executes secure transaction processing RPC (performs auto-refunds on rejection)
async function processPayout(id, status) {
  try {
    const { data, error } = await supabase.rpc('process_withdrawal_request', {
      target_request_id: id,
      target_status: status
    });

    if (error || !data.success) {
      NotificationManager.show(data?.message || "Error processing payout request.", "error");
    } else {
      NotificationManager.show(`Payout request successfully marked as ${status}!`, "success");
      await initAdminPanel();
    }
  } catch (err) {
    NotificationManager.show("Error processing payout request.", "error");
  }
}

async function loadCreatedTasksList() {
  const container = document.getElementById('active-tasks-list');

  const { data: tasks, error } = await supabase
    .from('youtube_tasks')
    .select('*')
    .eq('status', 'active')
    .order('created_at', { ascending: false });

  if (error || !tasks || tasks.length === 0) {
    container.innerHTML = '<p style="color: var(--text-muted);">No tasks registered yet.</p>';
    return;
  }

  container.innerHTML = tasks.map(t => `
    <div style="border-bottom: 1px solid var(--border); padding: 10px 0; display: flex; justify-content: space-between; align-items: center;">
      <span>${t.title} (+$${t.reward.toFixed(2)})</span>
      <button class="btn-secondary delete-task-btn" data-id="${t.id}" style="padding: 4px 8px; font-size: 0.75rem; color: #EF4444; border-color: rgba(239, 68, 68, 0.2);">Delete</button>
    </div>
  `).join('');

  document.querySelectorAll('.delete-task-btn').forEach(btn => {
    btn.addEventListener('click', () => deleteTask(btn.getAttribute('data-id')));
  });
}

async function deleteTask(id) {
  const { error } = await supabase
    .from('youtube_tasks')
    .delete()
    .eq('id', id);

  if (error) {
    NotificationManager.show("Error deleting task.", "error");
  } else {
    NotificationManager.show("Task deleted successfully.", "success");
    await initAdminPanel();
  }
}

// Handle Task Registration
document.getElementById('create-task-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const title = document.getElementById('task-title').value;
  const url = document.getElementById('task-url').value;
  const reward = parseFloat(document.getElementById('task-reward').value);
  const time = parseInt(document.getElementById('task-time').value);

  const videoId = extractVideoID(url);
  if (!videoId) {
    NotificationManager.show("Invalid YouTube URL format.", "error");
    return;
  }

  // Construct high-resolution thumbnail path
  const thumbnail = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;

  const { error } = await supabase
    .from('youtube_tasks')
    .insert({
      title,
      youtube_url: url,
      thumbnail,
      reward,
      watch_time: time,
      status: 'active'
    });

  if (error) {
    NotificationManager.show(error.message, "error");
  } else {
    NotificationManager.show("New rewarded task registered!", "success");
    document.getElementById('create-task-form').reset();
    await initAdminPanel();
  }
});

function extractVideoID(url) {
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : null;
}

document.addEventListener('DOMContentLoaded', initAdminPanel);