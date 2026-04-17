const fullHistoryList = document.getElementById('fullHistoryList');
const clearAllBtn = document.getElementById('clearAllBtn');
const addRound = document.getElementById('addRound');
const addName = document.getElementById('addName');
const addManualBtn = document.getElementById('addManualBtn');

function init() {
  renderList();
}

function renderList() {
  const history = getWinnerHistory();
  fullHistoryList.innerHTML = '';

  if (history.length === 0) {
    fullHistoryList.innerHTML = '<div style="color: var(--text-muted); text-align: center; padding: 2rem;">No winner history to display.</div>';
    return;
  }

  // Reverse to show newest first! But we need the original index to delete.
  // We attach the original index to the object for reference.
  const mapped = history.map((e, i) => ({ ...e, originalIndex: i }));
  mapped.reverse();

  mapped.forEach(entry => {
    const card = document.createElement('div');
    card.className = 'history-card';

    const info = document.createElement('div');
    info.innerHTML = `
      <div style="font-size: 1.25rem; font-weight: bold; color: #60a5fa;">Round ${entry.round}</div>
      <div style="font-size: 1.5rem; color: #000000; margin-top: 0.2rem;">${entry.name}</div>
      <div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 0.2rem;">Recorded: ${new Date(entry.timestamp).toLocaleString()}</div>
    `;
    
    const actions = document.createElement('div');
    actions.style.display = 'flex';
    actions.style.gap = '0.5rem';

    // 1. Return to Pool
    const returnBtn = document.createElement('button');
    returnBtn.style.padding = '0.5rem';
    returnBtn.style.background = 'rgba(59, 130, 246, 0.2)';
    returnBtn.style.color = '#60a5fa';
    returnBtn.style.fontSize = '0.8rem';
    returnBtn.innerHTML = 'Return to Pool & Delete';
    returnBtn.onclick = () => {
      if(confirm(`Are you sure you want to return ${entry.name} to the draw pool and strike this history record?`)) {
        addParticipants(entry.name); 
        deleteWinnerHistoryByIndex(entry.originalIndex);
        renderList();
      }
    };

    // 2. Delete Record entirely
    const delBtn = document.createElement('button');
    delBtn.className = 'danger';
    delBtn.style.padding = '0.5rem';
    delBtn.style.fontSize = '0.8rem';
    delBtn.innerHTML = 'Delete History';
    delBtn.onclick = () => {
      if(confirm(`Are you sure you want to delete ${entry.name}'s history record?`)) {
        deleteWinnerHistoryByIndex(entry.originalIndex);
        renderList();
      }
    };

    actions.appendChild(returnBtn);
    actions.appendChild(delBtn);

    card.appendChild(info);
    card.appendChild(actions);

    fullHistoryList.appendChild(card);
  });
}

addManualBtn.addEventListener('click', () => {
  const round = parseInt(addRound.value);
  const name = addName.value.trim();

  if (!round || !name) {
    alert("Please provide both a Round number and a Participant Name.");
    return;
  }

  addWinnerHistory(name, round);
  
  // Optionally remove from pool if manually added? No, let user manage pool.
  
  addRound.value = '';
  addName.value = '';
  renderList();
});

clearAllBtn.addEventListener('click', () => {
  if (confirm("Are you absolutely sure you want to wipe all history? This cannot be undone.")) {
    clearWinnerHistory();
    renderList();
  }
});

// Init
init();
