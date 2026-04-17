// Import removed for file:// compatibility

const canvas = document.getElementById('wheelCanvas');
const ctx = canvas.getContext('2d');
const startBtn = document.getElementById('startBtn');
const roundDisplay = document.getElementById('roundDisplay');
const modal = document.getElementById('winnerModal');
const winnerNameEl = document.getElementById('winnerName');

let participants = [];
let visualParticipants = [];
let targetVisualIndex = -1;
let settings = {};
let currentRotation = 0; // in degrees
let isSpinning = false;
let isDecelerating = false;
let animationFrameId = null;
let lastTickAngle = 0;
let idleAnimationId = null;
let isIdle = false;

function startIdleRotation() {
  if (isSpinning || idleAnimationId || settings.currentRound !== 1) return;
  isIdle = true;
  function animate() {
    if (!isIdle) return;
    currentRotation += 0.3;
    canvas.style.transform = `rotate(${currentRotation}deg)`;
    idleAnimationId = requestAnimationFrame(animate);
  }
  animate();
}

function stopIdleRotation() {
  isIdle = false;
  if (idleAnimationId) {
    cancelAnimationFrame(idleAnimationId);
    idleAnimationId = null;
  }
}

// Animation logic variables
let spinStartTime = 0;
let startRotation = 0;
let endRotation = 0;
let decelerationDuration = 5000;

const COLORS = [
  '#4f46e5', '#9333ea', '#ec4899', '#ef4444', 
  '#f97316', '#f59e0b', '#eab308', '#84cc16', 
  '#22c55e', '#10b981', '#06b6d4', '#3b82f6'
];

function shuffleArray(array) {
  let curId = array.length;
  while (0 !== curId) {
    let randId = Math.floor(Math.random() * curId);
    curId -= 1;
    let tmp = array[curId];
    array[curId] = array[randId];
    array[randId] = tmp;
  }
  return array;
}

function initWheel() {
  participants = getParticipants();
  settings = getSettings();
  if (roundDisplay) {
    roundDisplay.textContent = 'Round: ' + settings.currentRound;
  }

  if (participants.length === 0) {
    drawEmptyWheel();
    return;
  }

  // Determine the winner right now so we can include them in the visual subset
  let winner = getRiggedWinnerForRound(settings.currentRound);

  if (winner && !participants.includes(winner)) {
    // If they were deleted by a past test spin, force them back into memory so the rig works!
    participants.push(winner);
  } else if (!winner) {
    winner = participants[Math.floor(Math.random() * participants.length)];
  }

  // Cap visual slices at 1000
  const MAX_VISUAL_SLICES = 1000;

  if (participants.length <= MAX_VISUAL_SLICES) {
    visualParticipants = [...participants];
    targetVisualIndex = visualParticipants.indexOf(winner);
  } else {
    const others = participants.filter(p => p !== winner);
    shuffleArray(others);
    const selectedOthers = others.slice(0, MAX_VISUAL_SLICES - 1);

    visualParticipants = [winner, ...selectedOthers];
    shuffleArray(visualParticipants);
    targetVisualIndex = visualParticipants.indexOf(winner);
  }

  drawWheel();
  startIdleRotation();
}

function drawEmptyWheel() {
  const w = canvas.width;
  const h = canvas.height;
  const center = w / 2;
  ctx.clearRect(0, 0, w, h);
  ctx.font = '40px Inter';
  ctx.fillStyle = '#fff';
  ctx.textAlign = 'center';
  ctx.fillText('Please add participants in Settings', center, center);
}

function drawWheel() {
  const w = canvas.width;
  const h = canvas.height;
  const center = w / 2;
  const radius = center - 10;

  ctx.clearRect(0, 0, w, h);

  const numSlices = visualParticipants.length;
  const sliceAngle = (Math.PI * 2) / numSlices;
  const startOffset = -Math.PI / 2;

  for (let i = 0; i < numSlices; i++) {
    const angle = startOffset + i * sliceAngle;

    ctx.beginPath();
    ctx.moveTo(center, center);
    ctx.arc(center, center, radius, angle, angle + sliceAngle);
    ctx.closePath();

    ctx.fillStyle = COLORS[i % COLORS.length];
    ctx.fill();

    ctx.strokeStyle = 'rgba(0,0,0,0.1)';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.save();
    ctx.translate(center, center);
    ctx.rotate(angle + sliceAngle / 2);
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#fff";

    const arcLength = (2 * Math.PI * radius) / numSlices;
    const fontSize = Math.min(24, Math.max(8, arcLength * 0.6));

    ctx.font = `bold ${fontSize}px Inter`;
    let text = visualParticipants[i];
    if (text.length > 25) text = text.substring(0, 22) + '...';

    ctx.shadowColor = 'rgba(0,0,0,0.5)';
    ctx.shadowBlur = 4;
    ctx.fillText(text, radius - 30, 0);
    ctx.restore();
  }
}

function easeOutCubic(t) {
  return 1 - Math.pow(1 - t, 3);
}

function animateSpin(timestamp) {
  if (!isSpinning) return;

  if (isDecelerating) {
    const elapsed = timestamp - spinStartTime;
    const progress = Math.min(elapsed / decelerationDuration, 1);

    const easedProgress = easeOutCubic(progress);
    currentRotation = startRotation + (endRotation - startRotation) * easedProgress;

    const sliceAngleDeg = 360 / visualParticipants.length;
    if (currentRotation - lastTickAngle >= sliceAngleDeg) {
      if (typeof playTickSound === 'function') playTickSound();
      lastTickAngle = currentRotation - ((currentRotation - lastTickAngle) % sliceAngleDeg);
    }

    canvas.style.transform = `rotate(${currentRotation}deg)`;

    if (progress >= 1) {
      isSpinning = false;
      isDecelerating = false;
      if (typeof playWinnerSound === 'function') playWinnerSound();
      showWinner(visualParticipants[targetVisualIndex]);
      return;
    }
  } else {
    currentRotation += 15;
    
    const sliceAngleDeg = 360 / visualParticipants.length;
    if (currentRotation - lastTickAngle >= sliceAngleDeg) {
      if (typeof playTickSound === 'function') playTickSound();
      lastTickAngle = currentRotation - ((currentRotation - lastTickAngle) % sliceAngleDeg);
    }
    
    canvas.style.transform = `rotate(${currentRotation}deg)`;
  }

  animationFrameId = requestAnimationFrame(animateSpin);
}

startBtn.addEventListener('click', () => {
  if (typeof audioCtx !== 'undefined' && audioCtx.state === 'suspended') audioCtx.resume();
  // Force sync everything from local storage in case the browser hasn't refreshed
  settings = getSettings();
  participants = getParticipants();

  let riggedWinner = getRiggedWinnerForRound(settings.currentRound);

  if (riggedWinner && !participants.includes(riggedWinner)) {
    participants.push(riggedWinner);
  }

  if (riggedWinner && participants.includes(riggedWinner) && !visualParticipants.includes(riggedWinner)) {
    // Rigged winner was assigned but not present in our 50 visual slices!
    // We swap out a random slice to ensure the winner is on the board.
    const swapIdx = Math.floor(Math.random() * visualParticipants.length);
    visualParticipants[swapIdx] = riggedWinner;
    drawWheel(); // redraw right away
  }

  if (participants.length === 0) return alert('No participants!');
  if (isSpinning) return;

  stopIdleRotation();

  isSpinning = true;
  startBtn.disabled = true;

  rotationSpeed = 0.5; // rads per frame
  lastTickAngle = currentRotation;
  requestAnimationFrame(animateSpin);

  // Automatically start deceleration after 2 seconds of pure fast spinning
  setTimeout(() => {
    if (!isSpinning || isDecelerating) return;
    isDecelerating = true;

    // Total duration is fast spin + deceleration spin
    const decelerationSeconds = settings.spinDuration || 5;

    // Find target
    let winner = getRiggedWinnerForRound(settings.currentRound);

    if (winner && visualParticipants.includes(winner)) {
      targetVisualIndex = visualParticipants.indexOf(winner);
    } else {
      targetVisualIndex = Math.floor(Math.random() * visualParticipants.length);
    }

    // Calculate ending angle
    const numSlices = visualParticipants.length;
    const sliceAngleDeg = 360 / numSlices;

    // The top of the wheel (where pointer points) is 0 degrees or actually 360 - angle
    const centerOfTargetSlice = (targetVisualIndex * sliceAngleDeg) + (sliceAngleDeg / 2);
    const exactTargetDeg = 360 - centerOfTargetSlice;

    const extraSpins = 360 * 4;
    let targetRot = exactTargetDeg + extraSpins;

    // Ensure we spin forward at least 2 full revolutions from current
    while (targetRot <= currentRotation + 360 * 2) {
      targetRot += 360;
    }

    decelerationDuration = decelerationSeconds * 1000;
    spinStartTime = document.timeline ? document.timeline.currentTime : performance.now();
    startRotation = currentRotation;
    endRotation = targetRot;
  }, 2000);
});

let currentWinnerDetails = null;

function showWinner(name) {
  if (window.triggerConfetti) window.triggerConfetti();
  winnerNameEl.textContent = name;
  currentWinnerDetails = { name, round: settings.currentRound };
  modal.classList.add('active');
}

document.getElementById('closeModalBtn').addEventListener('click', () => {
  if (currentWinnerDetails) {
    // 1. Save to history
    addWinnerHistory(currentWinnerDetails.name, currentWinnerDetails.round);
    // 2. Remove participant from pool
    removeParticipantByName(currentWinnerDetails.name);
    // 3. Increment round
    updateSettings({ currentRound: settings.currentRound + 1 });
  }

  currentWinnerDetails = null;
  modal.classList.remove('active');

  // Prepare for next
  initWheel();
  startBtn.disabled = false;
});



// Initial draw
if (typeof applyBackground === 'function') applyBackground();
initWheel();

// Sync settings/participants if changed in another tab
window.addEventListener('storage', (e) => {
  if (!isSpinning && (e.key === 'ld_settings' || e.key === 'ld_participants' || e.key === 'ld_rigged')) {
    if (typeof applyBackground === 'function') applyBackground();
    initWheel();
  }
});

document.addEventListener('visibilitychange', () => {
  if (!document.hidden && !isSpinning) {
    initWheel();
  }
});

