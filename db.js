// db.js - Simple local storage "backend" for the static lucky draw app

const DEFAULT_SETTINGS = {
  spinDuration: 5,
  currentRound: 1,
  confettiDuration: 1
};

function getSettings() {
  const settings = localStorage.getItem('ld_settings');
  if (settings) {
    return { ...DEFAULT_SETTINGS, ...JSON.parse(settings) };
  }
  return DEFAULT_SETTINGS;
}

function updateSettings(newSettings) {
  const current = getSettings();
  const updated = { ...current, ...newSettings };
  localStorage.setItem('ld_settings', JSON.stringify(updated));
}

// History Management
function getWinnerHistory() {
  const data = localStorage.getItem('ld_history');
  return data ? JSON.parse(data) : [];
}

function addWinnerHistory(name, round) {
  const history = getWinnerHistory();
  history.push({ name, round, timestamp: new Date().toISOString() });
  localStorage.setItem('ld_history', JSON.stringify(history));
}

function deleteWinnerHistoryByIndex(index) {
  const history = getWinnerHistory();
  if (index >= 0 && index < history.length) {
    history.splice(index, 1);
    localStorage.setItem('ld_history', JSON.stringify(history));
  }
}

function clearWinnerHistory() {
  localStorage.removeItem('ld_history');
}

// Removing specific winner
function removeParticipantByName(name) {
  const participants = getParticipants();
  const index = participants.indexOf(name);
  if (index !== -1) {
    participants.splice(index, 1);
    localStorage.setItem('ld_participants', JSON.stringify(participants));
  }
}

function getParticipants() {
  const participants = localStorage.getItem('ld_participants');
  return participants ? JSON.parse(participants) : [];
}

function addParticipants(namesText) {
  const current = getParticipants();
  const names = namesText.split('\n')
    .map(n => n.trim())
    .filter(n => n.length > 0);

  // Allow duplicate names so users can have multiple raffle tickets
  const combined = [...current, ...names];
  localStorage.setItem('ld_participants', JSON.stringify(combined));
  return combined;
}

function deleteParticipant(index) {
  const current = getParticipants();
  current.splice(index, 1);
  localStorage.setItem('ld_participants', JSON.stringify(current));

  // Optional: Clean up rigged winners if that index was used, 
  // but to keep it simple, if participant is deleted, the rigged mapping may break.
  // Better to rig by exact name.
  return current;
}

function searchParticipants(query) {
  const current = getParticipants();
  if (!query) return [];
  const qStr = query.toLowerCase();

  // Return early matches up to 50 results to not overload UI
  const results = [];
  for (let i = 0; i < current.length; i++) {
    if (current[i].toLowerCase().includes(qStr)) {
      results.push({ index: i, name: current[i] });
      if (results.length >= 50) break;
    }
  }
  return results;
}

// Rigging management uses exact participant name
function getRigged() {
  const rigged = localStorage.getItem('ld_rigged');
  return rigged ? JSON.parse(rigged) : {}; // { "1": "Alice", "2": "Bob" }
}

function setRiggedWinner(round, name) {
  const rigged = getRigged();
  rigged[round] = name;
  localStorage.setItem('ld_rigged', JSON.stringify(rigged));
}

function getRiggedWinnerForRound(round) {
  const rigged = getRigged();
  return rigged[round] || null;
}

function deleteRiggedWinner(round) {
  const rigged = getRigged();
  delete rigged[round];
  localStorage.setItem('ld_rigged', JSON.stringify(rigged));
}

// Ensure at least 1 mock data if empty
function initializeDB() {
  const p = getParticipants();
  if (p.length === 0) {
    addParticipants("Test User 1\nTest User 2\nTest User 3\nTest User 4\nTest User 5\nTest User 6\nTest User 7\nTest User 8");
  }
}

initializeDB();

const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
let isGlobalMuted = getSettings().isMuted || false;

function playTickSound() {
  if (isGlobalMuted || !audioCtx) return;
  if (audioCtx.state === 'suspended') audioCtx.resume();
  const osc = audioCtx.createOscillator();
  const gainNode = audioCtx.createGain();
  osc.connect(gainNode);
  gainNode.connect(audioCtx.destination);
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(300, audioCtx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(100, audioCtx.currentTime + 0.05);
  gainNode.gain.setValueAtTime(0.2, audioCtx.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.05);
  osc.start();
  osc.stop(audioCtx.currentTime + 0.05);
}

function playWinnerSound() {
  if (isGlobalMuted || !audioCtx) return;
  if (audioCtx.state === 'suspended') audioCtx.resume();
  const osc = audioCtx.createOscillator();
  const gainNode = audioCtx.createGain();
  osc.connect(gainNode);
  gainNode.connect(audioCtx.destination);
  osc.type = 'sine';
  osc.frequency.setValueAtTime(523.25, audioCtx.currentTime);
  osc.frequency.setValueAtTime(659.25, audioCtx.currentTime + 0.1);
  osc.frequency.setValueAtTime(783.99, audioCtx.currentTime + 0.2);
  osc.frequency.setValueAtTime(1046.50, audioCtx.currentTime + 0.3);
  gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime);
  gainNode.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 1.5);
  osc.start();
  osc.stop(audioCtx.currentTime + 1.5);
}

function applyBackground() {
  const settings = getSettings();
  if (settings.backgroundImage) {
    document.body.style.backgroundImage = `url(${settings.backgroundImage})`;
    document.body.style.backgroundSize = 'cover';
    document.body.style.backgroundPosition = 'center';
    document.body.style.backgroundRepeat = 'no-repeat';
  } else {
    document.body.style.backgroundImage = '';
  }
}

function injectFloatingButtons() {
  if (document.getElementById('globalMuteBtn')) return;

  const btn = document.createElement('button');
  btn.id = 'globalMuteBtn';
  btn.style.position = 'fixed';
  btn.style.bottom = '20px';
  btn.style.right = '20px';
  btn.style.borderRadius = '50%';
  btn.style.width = '60px';
  btn.style.height = '60px';
  btn.style.display = 'flex';
  btn.style.alignItems = 'center';
  btn.style.justifyContent = 'center';
  btn.style.zIndex = '9999';
  btn.style.fontSize = '1.8rem';
  btn.style.background = 'rgba(255, 255, 255, 0.9)';
  btn.style.backdropFilter = 'blur(10px)';
  btn.style.border = '2px solid rgba(203, 213, 225, 0.8)';
  btn.style.color = '#0f172a';
  btn.style.boxShadow = '0 10px 15px -3px rgba(0,0,0,0.2)';
  btn.style.cursor = 'pointer';
  btn.style.transition = 'all 0.2s';

  btn.onmouseover = () => { btn.style.transform = 'scale(1.1)'; };
  btn.onmouseout = () => { btn.style.transform = 'scale(1)'; };

  const fsBtn = btn.cloneNode(true);
  fsBtn.id = 'globalFullscreenBtn';
  fsBtn.style.bottom = '90px'; // sit above mute
  fsBtn.style.fontSize = '1.5rem';

  fsBtn.onmouseover = () => { fsBtn.style.transform = 'scale(1.1)'; };
  fsBtn.onmouseout = () => { fsBtn.style.transform = 'scale(1)'; };

  document.body.appendChild(btn);
  document.body.appendChild(fsBtn);

  function updateIcon() {
    btn.innerHTML = isGlobalMuted ? '🔇' : '🔊';
  }

  function updateFsIcon() {
    fsBtn.innerHTML = document.fullscreenElement ? '✖' : '⛶';
  }

  btn.addEventListener('click', () => {
    isGlobalMuted = !isGlobalMuted;
    updateSettings({ isMuted: isGlobalMuted });
    updateIcon();
  });

  fsBtn.addEventListener('click', () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => console.error(err));
    } else {
      if (document.exitFullscreen) document.exitFullscreen();
    }
  });

  document.addEventListener('fullscreenchange', updateFsIcon);

  updateIcon();
  updateFsIcon();
}

window.addEventListener('storage', (e) => {
  if (e.key === 'ld_settings') {
    const settingsStr = localStorage.getItem('ld_settings');
    if (settingsStr) {
      isGlobalMuted = JSON.parse(settingsStr).isMuted || false;
      const btn = document.getElementById('globalMuteBtn');
      if (btn) btn.innerHTML = isGlobalMuted ? '🔇' : '🔊';
    }
  }
});

if (typeof document !== 'undefined') {
  const script = document.createElement('script');
  script.src = 'https://cdn.jsdelivr.net/npm/canvas-confetti@1.6.0/dist/confetti.browser.min.js';
  script.async = true;
  document.head.appendChild(script);
}

window.triggerConfetti = function () {
  if (typeof confetti === 'function') {
    const s = getSettings();
    var duration = (s.confettiDuration || 3) * 1000;
    var end = Date.now() + duration;
    (function frame() {
      confetti({ particleCount: 7, angle: 60, spread: 55, origin: { x: 0, y: 0.8 }, colors: ['#4f46e5', '#ec4899', '#facc15'], zIndex: 2000 });
      confetti({ particleCount: 7, angle: 120, spread: 55, origin: { x: 1, y: 0.8 }, colors: ['#4f46e5', '#ec4899', '#facc15'], zIndex: 2000 });
      if (Date.now() < end) requestAnimationFrame(frame);
    }());
  }
};

// Create DOM elements if context allows
if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', injectFloatingButtons);
  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    injectFloatingButtons();
  }
}

