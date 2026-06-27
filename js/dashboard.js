// js/dashboard.js
import { supabase } from './supabase.js';
import { checkRouteGuard } from './app.js';
import { NotificationManager } from './notifications.js';
import { formatCurrency } from './utils.js';

let currentPage = 1;
const tasksPerPage = 10;
let totalTasksCount = 0;

// Modal & Anti-Cheat variables
let ytPlayerInstance = null;
let countdownTimer = null;
let fallbackInterval = null; // Backup polling tracker
let lastTrackedTime = -1;
let secondsLeft = 0;
let isVideoPlaying = false;
let isWindowFocused = true;
let isTaskCompleted = false;
let activeTaskId = null;

async function initDashboard() {
  const session = await checkRouteGuard(true);
  if (!session) return;

  // Optimize: Fetch profile metrics and task grid in parallel to eliminate page lag
  try {
    await Promise.all([
      loadUserProfile(session.user.id),
      loadTasksGrid()
    ]);
  } catch (err) {
    console.error("Dashboard parallel loading failed:", err);
  }

  setupModalEventListeners();
  setupPaginationEventListeners();
}

async function loadUserProfile(userId) {
  const { data: profile } = await supabase
    .from('profiles')
    .select('balance, avatar')
    .eq('id', userId)
    .single();

  if (profile) {
    const balanceEl = document.getElementById('user-display-balance');
    if (balanceEl) balanceEl.innerText = formatCurrency(profile.balance);
    
    const avatarEl = document.getElementById('user-avatar');
    if (avatarEl) avatarEl.src = profile.avatar || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&h=150&q=80";
  }
}

async function loadTasksGrid() {
  const container = document.getElementById('tasks-container');
  container.innerHTML = '<div class="shimmer-load" style="height:220px; width:100%; border-radius:20px; grid-column: 1/-1;"></div>';

  // Get total active tasks count for pagination
  const { count } = await supabase
    .from('youtube_tasks')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'active');

  totalTasksCount = count || 0;

  const startRange = (currentPage - 1) * tasksPerPage;
  const endRange = startRange + tasksPerPage - 1;

  // Fetch tasks with pagination range
  const { data: tasks, error } = await supabase
    .from('youtube_tasks')
    .select('*')
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .range(startRange, endRange);

  if (error || !tasks || tasks.length === 0) {
    container.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: var(--text-muted);">No active tasks found.</p>';
    updatePaginationControls();
    return;
  }

  container.innerHTML = '';
  tasks.forEach(task => {
    const card = document.createElement('div');
    card.className = 'task-card glass glow-hover';
    card.innerHTML = `
      <div class="task-img-wrapper">
        <img src="${task.thumbnail}" class="task-img" alt="cover" loading="lazy">
        <span class="task-badge">${task.watch_time} Secs</span>
      </div>
      <div class="task-body">
        <h4 style="margin-bottom: 8px;">${task.title}</h4>
        <div style="margin-top: auto; display: flex; justify-content: space-between; align-items: center;">
          <span class="task-reward">+${formatCurrency(task.reward)}</span>
          <button class="btn-primary watch-btn" data-id="${task.id}" data-url="${task.youtube_url}" data-time="${task.watch_time}" data-title="${task.title}" style="padding: 8px 16px; font-size: 0.85rem;">
            Watch Now
          </button>
        </div>
      </div>
    `;
    container.appendChild(card);
  });

  // Attach watch button handlers
  document.querySelectorAll('.watch-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      openWatchModal(
        btn.getAttribute('data-id'),
        btn.getAttribute('data-url'),
        parseInt(btn.getAttribute('data-time')),
        btn.getAttribute('data-title')
      );
    });
  });

  updatePaginationControls();
}

function updatePaginationControls() {
  const prevBtn = document.getElementById('prev-page-btn');
  const nextBtn = document.getElementById('next-page-btn');

  if (prevBtn) prevBtn.disabled = currentPage === 1;
  if (nextBtn) nextBtn.disabled = currentPage * tasksPerPage >= totalTasksCount;
}

function setupPaginationEventListeners() {
  const prevBtn = document.getElementById('prev-page-btn');
  const nextBtn = document.getElementById('next-page-btn');

  if (prevBtn) {
    prevBtn.addEventListener('click', () => {
      if (currentPage > 1) {
        currentPage--;
        loadTasksGrid();
      }
    });
  }

  if (nextBtn) {
    nextBtn.addEventListener('click', () => {
      if (currentPage * tasksPerPage < totalTasksCount) {
        currentPage++;
        loadTasksGrid();
      }
    });
  }
}

/* Modal Popup & Anti-Cheat Player Engine */

function openWatchModal(taskId, videoUrl, watchTime, title) {
  activeTaskId = taskId;
  secondsLeft = watchTime;
  isTaskCompleted = false;
  isVideoPlaying = false;
  lastTrackedTime = -1;

  document.getElementById('modal-title').innerText = title;
  document.getElementById('modal-timer-countdown').innerText = formatTimer(secondsLeft);
  document.getElementById('modal-status-text').innerHTML = `Initializing secure video player...`;
  document.getElementById('watch-modal').style.display = 'flex';

  const videoId = extractVideoID(videoUrl);
  if (videoId) {
    initializeIframePlayer(videoId);
  } else {
    NotificationManager.show("Invalid YouTube URL metadata.", "error");
    closeWatchModal();
  }
}

function extractVideoID(url) {
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : null;
}

function initializeIframePlayer(videoId) {
  document.getElementById('modal-video-frame').innerHTML = '';
  
  ytPlayerInstance = new YT.Player('modal-video-frame', {
    videoId: videoId,
    playerVars: {
      'autoplay': 0,
      'controls': 1,
      'disablekb': 1,
      'rel': 0,
      'fs': 0,
      'enablejsapi': 1, // Enables Javascript interface on the Iframe
      'origin': window.location.origin
    },
    events: {
      'onReady': onPlayerReady, // Safely delay tracking until the player is ready
      'onStateChange': onPlayerStateChange
    }
  });
}

function onPlayerReady(event) {
  console.log("YouTube Player is ready. Initializing dynamic anti-cheat tracking.");
  document.getElementById('modal-status-text').innerHTML = `Play the video to start the verification timer.`;
  
  // Only start the fallback tracking loop AFTER the onReady event fires safely
  startFallbackPolling();
}

function onPlayerStateChange(event) {
  if (event.data === YT.PlayerState.PLAYING) {
    isVideoPlaying = true;
    if (isWindowFocused) {
      startCountdownTimer();
    }
  } else {
    isVideoPlaying = false;
    pauseCountdownTimer("Playback paused.");
  }
}

// Backup Polling Engine: Bypasses browser cross-origin constraints
function startFallbackPolling() {
  if (fallbackInterval) return;

  fallbackInterval = setInterval(() => {
    if (ytPlayerInstance && typeof ytPlayerInstance.getPlayerState === 'function') {
      try {
        const state = ytPlayerInstance.getPlayerState();

        // state 1 = Playing, state 3 = Buffering
        // Keep the countdown ticking smoothly during standard play and slow network buffering.
        if (state === 1 || state === 3) {
          isVideoPlaying = true;
          if (isWindowFocused && !countdownTimer) {
            startCountdownTimer();
          }
        } else {
          isVideoPlaying = false;
          pauseCountdownTimer("Playback paused.");
        }
      } catch (err) {
        // Suppress any temporary cross-origin initialization errors
      }
    }
  }, 500);
}

function startCountdownTimer() {
  if (countdownTimer || isTaskCompleted) return;

  document.getElementById('modal-status-text').innerHTML = `<i class="fas fa-spinner fa-spin" style="color:var(--accent)"></i> Watching video... Do not switch tabs.`;

  countdownTimer = setInterval(() => {
    if (secondsLeft > 0) {
      secondsLeft--;
      document.getElementById('modal-timer-countdown').innerText = formatTimer(secondsLeft);
    } else {
      executeTaskReward();
    }
  }, 1000);
}

function pauseCountdownTimer(reason) {
  if (countdownTimer) {
    clearInterval(countdownTimer);
    countdownTimer = null;
  }
  document.getElementById('modal-status-text').innerHTML = `<i class="fas fa-pause"></i> Verification suspended: ${reason}`;
}

async function executeTaskReward() {
  pauseCountdownTimer("Processing transaction...");
  isTaskCompleted = true;

  try {
    const { data, error } = await supabase.rpc('complete_youtube_task', {
      target_task_id: activeTaskId
    });

    if (error || !data.success) {
      NotificationManager.show(data?.message || "Verification failed.", "error");
      isTaskCompleted = false;
      closeWatchModal();
      return;
    }

    confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 } });
    NotificationManager.show(`Successfully earned $${data.reward.toFixed(2)}!`, "success");
    
    // Refresh the user's balance on the header immediately
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      await loadUserProfile(session.user.id);
    }

    // Automatically close the popup after a brief delay
    setTimeout(() => {
      closeWatchModal();
      loadTasksGrid(); // Refresh tasks grid dynamically
    }, 2500);

  } catch (err) {
    NotificationManager.show("Error submitting transaction validation.", "error");
    isTaskCompleted = false;
  }
}

function closeWatchModal() {
  // Clear any running intervals
  if (countdownTimer) {
    clearInterval(countdownTimer);
    countdownTimer = null;
  }
  if (fallbackInterval) {
    clearInterval(fallbackInterval);
    fallbackInterval = null;
  }

  // Destroy YouTube Player instance to stop playback
  if (ytPlayerInstance && ytPlayerInstance.destroy) {
    ytPlayerInstance.destroy();
    ytPlayerInstance = null;
  }

  document.getElementById('watch-modal').style.display = 'none';
  activeTaskId = null;
}

function setupModalEventListeners() {
  document.getElementById('modal-close-btn').addEventListener('click', () => {
    closeWatchModal();
  });

  // Track window focus and tab changes to handle anti-cheat triggers
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      isWindowFocused = false;
      pauseCountdownTimer("Focus shifted.");
      if (ytPlayerInstance && ytPlayerInstance.pauseVideo) ytPlayerInstance.pauseVideo();
    } else {
      isWindowFocused = true;
    }
  });

  window.addEventListener("blur", () => {
    isWindowFocused = false;
    pauseCountdownTimer("Focus shifted.");
    if (ytPlayerInstance && ytPlayerInstance.pauseVideo) ytPlayerInstance.pauseVideo();
  });

  window.addEventListener("focus", () => {
    isWindowFocused = true;
  });
}

function formatTimer(seconds) {
  const min = Math.floor(seconds / 60).toString().padStart(2, '0');
  const sec = (seconds % 60).toString().padStart(2, '0');
  return `${min}:${sec}`;
}

document.addEventListener('DOMContentLoaded', initDashboard);