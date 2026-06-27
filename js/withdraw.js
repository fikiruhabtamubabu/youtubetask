// js/withdraw.js
import { supabase } from './supabase.js';
import { checkRouteGuard } from './app.js';
import { NotificationManager } from './notifications.js';
import { formatCurrency, formatDate } from './utils.js';

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
    container.innerHTML = '<p style="color:var(--text-muted); text-align: center;">No withdrawals registered yet.</p>';
    return;
  }

  container.innerHTML = list.map(req => {
    let statusColor = 'var(--accent)'; // default for 'inprogress'
    if (req.status === 'approved') statusColor = 'var(--success)';
    if (req.status === 'rejected') statusColor = '#EF4444';

    return `
      <div style="border-bottom: 1px solid var(--border); padding:14px 0; display:flex; justify-content:space-between; align-items:center;">
        <div>
          <strong>${formatCurrency(req.amount)}</strong> via ${req.method}<br>
          <span style="font-size:0.8rem; color:var(--text-muted)">Wallet: ${req.wallet}</span><br>
          <span style="font-size:0.8rem; color:var(--text-muted)">Submitted: ${formatDate(req.created_at)}</span>
        </div>
        <div style="font-weight: 600; color: ${statusColor}">
          ${req.status.toUpperCase()}
        </div>
      </div>
    `;
  }).join('');
}

document.getElementById('withdraw-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const amount = parseFloat(document.getElementById('amount').value);
  const method = document.getElementById('method').value;
  const wallet = document.getElementById('wallet').value;

  if (amount < 20) {
    NotificationManager.show("Minimum withdrawal is $20.00", "error");
    return;
  }

  const { data, error } = await supabase.rpc('submit_withdrawal', {
    amount_val: amount,
    method_val: method,
    wallet_val: wallet
  });

  if (error || !data.success) {
    NotificationManager.show(data?.message || "Unable to submit withdrawal request.", "error");
  } else {
    NotificationManager.show("Withdrawal requested successfully!", "success");
    location.reload();
  }
});

document.addEventListener('DOMContentLoaded', initWithdraw);
// Reusable, Event-Delegated Mobile Menu Toggle Handler (Bypasses mobile bubbling conflicts)
function setupMobileMenu() {
  document.addEventListener('click', (e) => {
    const triggerBtn = document.getElementById('mobile-menu-trigger');
    const sidebar = document.querySelector('aside');
    if (!triggerBtn || !sidebar) return;

    // Check if the click is on the trigger button or any element inside it (like the icon)
    if (triggerBtn.contains(e.target)) {
      e.preventDefault();
      const isOpen = sidebar.classList.contains('mobile-menu-open');
      const icon = triggerBtn.querySelector('i');
      
      if (!isOpen) {
        // Open the full-screen menu overlay
        sidebar.classList.add('mobile-menu-open');
        if (icon) icon.className = 'fas fa-times'; // Change icon to X
        document.body.style.overflow = 'hidden'; // Lock background scrolling
      } else {
        // Close the menu
        sidebar.classList.remove('mobile-menu-open');
        if (icon) icon.className = 'fas fa-bars'; // Change icon back to ---
        document.body.style.overflow = 'auto'; // Restore scrolling
      }
    } else if (sidebar.classList.contains('mobile-menu-open')) {
      // If menu is open and click is outside the sidebar, close it immediately
      if (!sidebar.contains(e.target)) {
        sidebar.classList.remove('mobile-menu-open');
        const icon = triggerBtn.querySelector('i');
        if (icon) icon.className = 'fas fa-bars';
        document.body.style.overflow = 'auto';
      }
    }
  });

  // Ensure menu closes if any navigation link is clicked
  const sidebar = document.querySelector('aside');
  if (sidebar) {
    sidebar.querySelectorAll('.menu-link').forEach(link => {
      link.addEventListener('click', () => {
        sidebar.classList.remove('mobile-menu-open');
        const triggerBtn = document.getElementById('mobile-menu-trigger');
        if (triggerBtn) {
          const icon = triggerBtn.querySelector('i');
          if (icon) icon.className = 'fas fa-bars';
        }
        document.body.style.overflow = 'auto';
      });
    });
  }
}

// Execute the responsive menu handler
setupMobileMenu();