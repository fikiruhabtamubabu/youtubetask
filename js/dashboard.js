// Controller for landing / stats layout calculations
import { supabase } from './supabase.js';
import { checkRouteGuard } from './app.js';
import { formatCurrency } from './utils.js';

async function initDashboard() {
  const session = await checkRouteGuard(true);
  if (!session) return;

  const userId = session.user.id;
  await fetchProfileStats(userId);
  await renderTaskCards();
}

async function fetchProfileStats(userId) {
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (profile) {
    document.getElementById('profile-name').innerText = profile.name || "User Account";
    document.getElementById('user-balance').innerText = formatCurrency(profile.balance);
    document.getElementById('user-avatar').src = profile.avatar || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&h=150&q=80";
  }
}

async function renderTaskCards() {
  const container = document.getElementById('tasks-container');
  container.innerHTML = '<div class="shimmer-load" style="height:200px; width:100%; border-radius:20px;"></div>';

  const { data: tasks, error } = await supabase
    .from('youtube_tasks')
    .select('*')
    .eq('status', 'active');

  if (error || !tasks || tasks.length === 0) {
    container.innerHTML = '<p style="grid-column:1/-1; text-align:center; color:var(--text-muted)">No active tasks found.</p>';
    return;
  }

  container.innerHTML = '';
  tasks.forEach(task => {
    const card = document.createElement('div');
    card.className = 'task-card glass glow-hover';
    card.innerHTML = `
      <div class="task-img-wrapper">
        <img src="${task.thumbnail || 'https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?auto=format&fit=crop&w=600&q=80'}" class="task-img" alt="task cover">
        <span class="task-badge">${task.watch_time} Secs</span>
      </div>
      <div class="task-body">
        <h4 style="margin-bottom:8px;">${task.title}</h4>
        <div style="margin-top:auto; display:flex; justify-content:space-between; align-items:center;">
          <span class="task-reward">+${formatCurrency(task.reward)}</span>
          <a href="watch.html?id=${task.id}" class="btn-primary" style="padding:8px 16px; font-size:0.85rem;">Watch Now</a>
        </div>
      </div>
    `;
    container.appendChild(card);
  });
}

document.addEventListener('DOMContentLoaded', initDashboard);