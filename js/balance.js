// js/balance.js
import { supabase } from './supabase.js';
import { checkRouteGuard } from './app.js';
import { formatCurrency, formatDate } from './utils.js';

async function initBalancePage() {
  const session = await checkRouteGuard(true);
  if (!session) return;

  await loadWalletStats(session.user.id);
  await loadTransactionList(session.user.id);
}

async function loadWalletStats(userId) {
  const { data: profile } = await supabase
    .from('profiles')
    .select('balance')
    .eq('id', userId)
    .single();

  if (profile) {
    // Check for both possible ID formats safely
    const balanceEl = document.getElementById('wallet-balance') || document.getElementById('user-balance');
    if (balanceEl) {
      balanceEl.innerText = formatCurrency(profile.balance);
    }
  }

  // Calculate today's earnings from completed tasks
  const todayStart = new Date();
  todayStart.setHours(0,0,0,0);

  const { data: todayTransactions } = await supabase
    .from('transactions')
    .select('amount')
    .eq('user_id', userId)
    .gt('created_at', todayStart.toISOString());

  let todaySum = 0;
  if (todayTransactions) {
    todaySum = todayTransactions.reduce((acc, curr) => acc + (curr.amount > 0 ? curr.amount : 0), 0);
  }
  const todayEl = document.getElementById('today-earnings');
  if (todayEl) {
    todayEl.innerText = formatCurrency(todaySum);
  }

  // Calculate lifetime earnings
  const { data: allPositives } = await supabase
    .from('transactions')
    .select('amount')
    .eq('user_id', userId);

  let lifetimeSum = 0;
  if (allPositives) {
    lifetimeSum = allPositives.reduce((acc, curr) => acc + (curr.amount > 0 ? curr.amount : 0), 0);
  }
  const lifetimeEl = document.getElementById('lifetime-earnings');
  if (lifetimeEl) {
    lifetimeEl.innerText = formatCurrency(lifetimeSum);
  }
}

async function loadTransactionList(userId) {
  const container = document.getElementById('transaction-history-list');
  if (!container) return; // Exit early if container does not exist on page

  const { data: transactions, error } = await supabase
    .from('transactions')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error || !transactions || transactions.length === 0) {
    container.innerHTML = '<p style="color: var(--text-muted); text-align: center;">No transactions found.</p>';
    return;
  }

  container.innerHTML = transactions.map(t => `
    <div style="border-bottom: 1px solid var(--border); padding: 16px 0; display: flex; justify-content: space-between; align-items: center;">
      <div>
        <strong>${t.description || 'System Adjustment'}</strong><br>
        <span style="font-size: 0.8rem; color: var(--text-muted);">${formatDate(t.created_at)}</span>
      </div>
      <div style="font-weight: 600; color: ${t.amount >= 0 ? 'var(--success)' : '#EF4444'}">
        ${t.amount >= 0 ? '+' : ''}${formatCurrency(t.amount)}
      </div>
    </div>
  `).join('');
}

document.addEventListener('DOMContentLoaded', initBalancePage);
// Mobile Responsive Menu Toggle Handler (Transforms --- to X, hides underlying pages)
function setupMobileMenu() {
  const triggerBtn = document.getElementById('mobile-menu-trigger');
  const sidebar = document.querySelector('aside');
  
  if (triggerBtn && sidebar) {
    triggerBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      
      const isOpen = sidebar.classList.contains('mobile-menu-open');
      const icon = triggerBtn.querySelector('i');
      
      if (!isOpen) {
        sidebar.classList.add('mobile-menu-open');
        icon.className = 'fas fa-times'; // Change icon to X
        document.body.style.overflow = 'hidden'; // Stop background scrolling
      } else {
        sidebar.classList.remove('mobile-menu-open');
        icon.className = 'fas fa-bars'; // Change icon back to hamburger
        document.body.style.overflow = 'auto'; // Restore background scrolling
      }
    });

    document.querySelectorAll('aside .menu-link').forEach(link => {
      link.addEventListener('click', () => {
        sidebar.classList.remove('mobile-menu-open');
        const icon = triggerBtn.querySelector('i');
        if (icon) icon.className = 'fas fa-bars';
        document.body.style.overflow = 'auto';
      });
    });

    document.addEventListener('click', (e) => {
      if (sidebar.classList.contains('mobile-menu-open')) {
        if (!sidebar.contains(e.target) && !triggerBtn.contains(e.target)) {
          sidebar.classList.remove('mobile-menu-open');
          const icon = triggerBtn.querySelector('i');
          if (icon) icon.className = 'fas fa-bars';
          document.body.style.overflow = 'auto';
        }
      }
    });
  }
}

// Execute responsive handler
setupMobileMenu();

// Execute menu setup
setupMobileMenu();