// Anti-tamper embedded YouTube tracker using the secure RPC backend endpoint
import { supabase } from './supabase.js';
import { checkRouteGuard } from './app.js';
import { NotificationManager } from './notifications.js';

let player = null;
let timerInterval = null;
let secondsRemaining = 0;
let isPlaying = false;
let pageFocused = true;
let isCompleted = false;
let taskId = null;

async function initWatchPage() {
  const session = await checkRouteGuard(true);
  if (!session) return;

  const urlParams = new URLSearchParams(window.location.search);
  taskId = urlParams.get('id');

  if (!taskId) {
    window.location.href = "dashboard.html";
    return;
  }

  await loadTaskDetails();
}

async function loadTaskDetails() {
  const { data: task, error } = await supabase
    .from('youtube_tasks')
    .select('*')
    .eq('id', taskId)
    .single();

  if (error || !task) {
    NotificationManager.show("Task metadata error.", "error");
    return;
  }

  document.getElementById('watch-title').innerText = task.title;
  secondsRemaining = task.watch_time;
  document.getElementById('time-countdown').innerText = formatTimerDisplay(secondsRemaining);

  const videoId = extractVideoID(task.youtube_url);
  if (videoId) {
    initYoutubeIFrameAPI(videoId);
  } else {
    NotificationManager.show("Invalid YouTube URL metadata.", "error");
  }
}

function extractVideoID(url) {
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : null;
}

function initYoutubeIFrameAPI(videoId) {
  window.onYouTubeIframeAPIReady = () => {
    player = new YT.Player('player-frame', {
      videoId: videoId,
      playerVars: { 'autoplay': 0, 'controls': 1, 'disablekb': 1, 'rel': 0 },
      events: {
        'onStateChange': handlePlayerStateChange
      }
    });
  };

  // Trigger loading the external SDK asynchronously
  const tag = document.createElement('script');
  tag.src = "https://www.youtube.com/iframe_api";
  const firstScriptTag = document.getElementsByTagName('script')[0];
  firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
}

function handlePlayerStateChange(event) {
  if (event.data === YT.PlayerState.PLAYING) {
    isPlaying = true;
    if (pageFocused) startTimer();
  } else {
    isPlaying = false;
    pauseTimer("Video playback paused.");
  }
}

function startTimer() {
  if (timerInterval || isCompleted) return;
  document.getElementById('status-ticker').innerHTML = `<i class="fas fa-spinner fa-spin"></i> Watching video...`;
  
  timerInterval = setInterval(() => {
    if (secondsRemaining > 0) {
      secondsRemaining--;
      document.getElementById('time-countdown').innerText = formatTimerDisplay(secondsRemaining);
    } else {
      claimRewardSecurely();
    }
  }, 1000);
}

function pauseTimer(reason) {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
  document.getElementById('status-ticker').innerHTML = `<i class="fas fa-pause"></i> ${reason}`;
}

async function claimRewardSecurely() {
  pauseTimer("Verifying watching metrics...");
  isCompleted = true;

  try {
    const { data, error } = await supabase.rpc('complete_youtube_task', {
      target_task_id: taskId
    });

    if (error || !data.success) {
      NotificationManager.show(data?.message || "Verification failed.", "error");
      isCompleted = false;
    } else {
      confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 } });
      NotificationManager.show(`Earned $${data.reward}!`, "success");
      setTimeout(() => window.location.href = "dashboard.html", 3000);
    }
  } catch (err) {
    NotificationManager.show("Error submitting transaction validation.", "error");
    isCompleted = false;
  }
}

function formatTimerDisplay(seconds) {
  const min = Math.floor(seconds / 60).toString().padStart(2, '0');
  const sec = (seconds % 60).toString().padStart(2, '0');
  return `${min}:${sec}`;
}

// User active tracking check
document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    pageFocused = false;
    pauseTimer("Verification suspended (Focus shifted).");
    if (player && player.pauseVideo) player.pauseVideo();
  } else {
    pageFocused = true;
  }
});

window.addEventListener("blur", () => {
  pageFocused = false;
  pauseTimer("Verification suspended (Focus shifted).");
  if (player && player.pauseVideo) player.pauseVideo();
});

window.addEventListener("focus", () => {
  pageFocused = true;
});

document.addEventListener('DOMContentLoaded', initWatchPage);