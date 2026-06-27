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

const copyBtn = document.getElementById('copy-referral-btn');
if (copyBtn) {
  copyBtn.addEventListener('click', () => {
    const linkBox = document.getElementById('referral-link');
    if (linkBox) {
      linkBox.select();
      document.execCommand('copy');
      NotificationManager.show("Link copied to clipboard!", "success");
    }
  });
}

document.addEventListener('DOMContentLoaded', initReferral);

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