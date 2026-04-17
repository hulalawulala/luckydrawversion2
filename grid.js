const gridContainer = document.getElementById('matrixGrid');
const startBtn = document.getElementById('startBtn');
const roundDisplay = document.getElementById('roundDisplay');
const modal = document.getElementById('winnerModal');
const winnerNameEl = document.getElementById('winnerName');

let participants = [];
let visualParticipants = [];
let targetVisualIndex = -1;
let settings = {};
let isSpinning = false;
let isDecelerating = false;
let activeIndex = -1;
let spinTimer = null;
let cellElements = [];

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

function initGrid() {
  participants = getParticipants();
  settings = getSettings();
  if (roundDisplay) {
    roundDisplay.textContent = 'Round: ' + settings.currentRound;
  }
  
  gridContainer.innerHTML = '';
  cellElements = [];
  
  if (participants.length === 0) {
    const div = document.createElement('div');
    div.style.color = '#fff';
    div.textContent = 'Please add participants...';
    gridContainer.appendChild(div);
    return;
  }

  let winner = getRiggedWinnerForRound(settings.currentRound);
  
  if (winner && !participants.includes(winner)) {
    participants.push(winner);
  } else if (!winner) {
    winner = participants[Math.floor(Math.random() * participants.length)];
  }

  visualParticipants = [...participants];
  targetVisualIndex = visualParticipants.indexOf(winner);

  // Render grid
  visualParticipants.forEach((name, idx) => {
    const cell = document.createElement('div');
    cell.className = 'grid-cell';
    
    // Truncate name
    let text = name;
    if (text.length > 25) text = text.substring(0, 22) + '...';
    cell.textContent = text;
    
    gridContainer.appendChild(cell);
    cellElements.push(cell);
  });
}

function setActiveCell(index, isFinal = false) {
  if (activeIndex === index) return;
  if (activeIndex >= 0 && activeIndex < cellElements.length) {
    cellElements[activeIndex].classList.remove('active');
  }
  activeIndex = index;
  if (activeIndex >= 0 && activeIndex < cellElements.length) {
    const el = cellElements[activeIndex];
    el.classList.add('active');
    // Rapidly updating smooth scrolling causes browsers to freeze the scroll completely. 
    // We use instant 'auto' and only center the final winner.
    el.scrollIntoView({ behavior: 'auto', block: isFinal ? 'center' : 'nearest' });
    if (!isFinal) {
      if (typeof playTickSound === 'function') playTickSound();
    }
  }
}

function highSpeedLoop() {
  if (!isSpinning || isDecelerating) return;
  const rndIndex = Math.floor(Math.random() * visualParticipants.length);
  setActiveCell(rndIndex);
  const jumpSpeed = settings.animationSpeed || 50;
  spinTimer = setTimeout(highSpeedLoop, jumpSpeed);
}

function runDecelerationSequence() {
  // We calculate an array of delay times that sum up roughly to spinDuration
  const durationMs = (settings.spinDuration || 5) * 1000;
  const delays = [];
  
  // Start with e.g. 50ms, ease out to 800ms
  let currentDelay = 50;
  let totalTime = 0;
  
  while (totalTime < durationMs) {
    delays.push(currentDelay);
    totalTime += currentDelay;
    // increase delay using a curve to simulate friction
    currentDelay = currentDelay * 1.08; 
    if (currentDelay > 900) currentDelay = 900;
  }
  
  // Now we execute these delays
  let jumpIndex = 0;
  function nextJump() {
    if (jumpIndex >= delays.length - 1) {
      // Very last jump -> force it to land on target!
      setActiveCell(targetVisualIndex, true);
      setTimeout(() => {
        isSpinning = false;
        isDecelerating = false;
        if (targetVisualIndex >= 0 && targetVisualIndex < cellElements.length) {
          cellElements[targetVisualIndex].classList.add('winner');
        }
        if (typeof playWinnerSound === 'function') playWinnerSound();
        showWinner(visualParticipants[targetVisualIndex]);
      }, 500);
      return;
    }
    
    // Pick random index but DO NOT let it be the target until the end
    // so it doesn't accidentally tease the winner early
    let rndIndex = Math.floor(Math.random() * visualParticipants.length);
    while (rndIndex === targetVisualIndex) {
      rndIndex = Math.floor(Math.random() * visualParticipants.length);
    }
    
    setActiveCell(rndIndex);
    
    setTimeout(nextJump, delays[jumpIndex]);
    jumpIndex++;
  }
  
  nextJump();
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
    // Rigged winner was assigned but not present in our 50 visual cells!
    // We swap out a random cell for the winner to ensure they are on the board.
    const swapIdx = Math.floor(Math.random() * visualParticipants.length);
    visualParticipants[swapIdx] = riggedWinner;
    cellElements[swapIdx].textContent = riggedWinner.length > 25 ? riggedWinner.substring(0, 22) + '...' : riggedWinner;
  }

  if (participants.length === 0) return alert('No participants!');
  if (isSpinning) return;
  
  // Remove any previous winner styling
  if (activeIndex >= 0 && activeIndex < cellElements.length) {
    cellElements[activeIndex].classList.remove('winner');
  }

  
  isSpinning = true;
  isDecelerating = false;
  startBtn.disabled = true;
  
  highSpeedLoop();
  
  // Automatically start deceleration after 2 seconds of wild fast spinning
  setTimeout(() => {
    if (!isSpinning || isDecelerating) return;
    isDecelerating = true;
    clearTimeout(spinTimer);
    
    // Recalculate target logic just in case
    let winner = getRiggedWinnerForRound(settings.currentRound);
    if (winner && visualParticipants.includes(winner)) {
      targetVisualIndex = visualParticipants.indexOf(winner);
    } else {
      targetVisualIndex = Math.floor(Math.random() * visualParticipants.length);
    }
    
    runDecelerationSequence();
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
  initGrid();
  startBtn.disabled = false;
});



// Initialize
setTimeout(() => {
  if (typeof applyBackground === 'function') applyBackground();
  initGrid();
}, 100);

// Sync settings/participants if changed in another tab
window.addEventListener('storage', (e) => {
  if (!isSpinning && (e.key === 'ld_settings' || e.key === 'ld_participants' || e.key === 'ld_rigged')) {
    if (typeof applyBackground === 'function') applyBackground();
    initGrid();
  }
});

document.addEventListener('visibilitychange', () => {
  if (!document.hidden && !isSpinning) {
    initGrid();
  }
});

