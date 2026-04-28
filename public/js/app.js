// js/app.js v4

const App = {
  socket: null, playerName: '', playerIdx: null,
  roomId: null, gameType: null, numPlayers: 4, gameMode: 'belote',
  fillAI: true, room: null, isHost: false, targetScore: 501,
};

function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById('screen-' + id).classList.add('active');
}

function toast(msg, ms = 3000) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(t._timer);
  t._timer = setTimeout(() => t.classList.remove('show'), ms);
}

function connectSocket() {
  if (App.socket?.connected) return;
  App.socket = io();
  App.socket.on('disconnect', () => toast('⚠ Connexion perdue…'));
  App.socket.on('error', ({message}) => toast('❌ ' + message));

  App.socket.on('room:created', ({roomId, playerIdx, room}) => {
    App.roomId = roomId; App.playerIdx = playerIdx; App.room = room; App.isHost = true;
    // Si la salle est déjà pleine (toutes IA), ne pas afficher le lobby — game:start va arriver
    if (room.players.length < room.numPlayers) {
      showLobby(room, true);
    }
    // Sinon on attend game:start qui arrive dans la foulée
  });
  App.socket.on('room:joined', ({playerIdx, room}) => {
    App.playerIdx = playerIdx; App.room = room; App.isHost = false;
    showLobby(room, false);
  });
  App.socket.on('room:updated', ({room}) => { App.room = room; updateSlots(room); });
  App.socket.on('room:player_joined', ({player, room}) => {
    App.room = room; updateSlots(room); toast(player + ' a rejoint !');
  });
  App.socket.on('game:start', ({gameType, targetScore}) => {
    App.gameType = gameType;
    App.targetScore = targetScore;
    const labels = {belote:'♠ Belote', coinche:'♣ Coinche', tarot:'🃏 Tarot'};
    document.getElementById('g-title').textContent = labels[gameType] || gameType;
    // Configurer l'affichage des scores selon le jeu
    setupScoreDisplay(gameType, targetScore);
    showScreen('game');
  });
  App.socket.on('game:state', data => GameUI.update(data));
  App.socket.on('game:trick_won', data => GameUI.onTrickWon(data));
  App.socket.on('game:round_over', data => GameUI.onRoundOver(data));
  App.socket.on('game:over', data => GameUI.onGameOver(data));
  App.socket.on('game:message', ({text}) => toast(text));
}

function setupScoreDisplay(gameType, targetScore) {
  const scoresEl = document.getElementById('g-scores');
  if (gameType === 'belote' || gameType === 'coinche') {
    scoresEl.innerHTML = `
      <div class="g-score-item">
        <span class="g-score-label">NS</span>
        <span class="g-score-val ns" id="sc-ns">0</span>
        ${targetScore ? `<span class="g-score-target">/${targetScore}</span>` : ''}
      </div>
      <div class="g-score-item">
        <span class="g-score-label">EO</span>
        <span class="g-score-val eo" id="sc-eo">0</span>
        ${targetScore ? `<span class="g-score-target">/${targetScore}</span>` : ''}
      </div>`;
  }
  // Pour tarot, renderHeader s'en charge dynamiquement
}

function showLobby(room, isHost) {
  showScreen('lobby');
  document.getElementById('lobby-code').textContent = room.id;
  const gameLabel = {belote:'Belote',coinche:'Coinche',tarot:'Tarot'}[room.gameType] || room.gameType;
  const target = room.targetScore ? ` · Objectif ${room.targetScore} pts` : '';
  document.getElementById('lobby-badge').textContent = `${gameLabel} · ${room.numPlayers} joueurs${target}`;
  document.getElementById('lobby-btns').style.display = isHost ? '' : 'none';
  updateSlots(room);
}

function updateSlots(room) {
  const list = document.getElementById('slot-list');
  list.innerHTML = '';
  for (let i = 0; i < room.numPlayers; i++) {
    const p = room.players[i];
    const div = document.createElement('div');
    div.className = 'slot';
    if (p) {
      div.innerHTML = `<div class="slot-av ${p.isAI?'ai':'human'}">${p.isAI?'🤖':'👤'}</div>
        <span class="slot-name">${p.name}</span>
        ${i===0?'<span class="badge">Hôte</span>':''}
        ${i===App.playerIdx?'<span style="font-size:0.7rem;color:var(--gold-light)">(vous)</span>':''}`;
    } else {
      div.innerHTML = `<div class="slot-av empty">—</div><span class="slot-name empty">Place libre…</span>`;
    }
    list.appendChild(div);
  }
}

// Calcul du score objectif selon le jeu
function defaultTarget(gameMode) {
  if (gameMode === 'coinche') return 1000;
  if (gameMode === 'belote') return 501;
  return 0; // Tarot : pas de cible fixe par défaut
}

document.addEventListener('DOMContentLoaded', () => {
  const savedName = localStorage.getItem('pname');
  if (savedName) document.getElementById('inp-name').value = savedName;
  document.getElementById('inp-name').addEventListener('input', e => localStorage.setItem('pname', e.target.value));

  // Sélection jeu
  document.getElementById('seg-game').addEventListener('click', e => {
    const btn = e.target.closest('[data-game]');
    if (!btn) return;
    document.querySelectorAll('#seg-game .seg-btn').forEach(b => b.classList.remove('on'));
    btn.classList.add('on');
    App.gameMode = btn.dataset.game;
    updatePlayersSeg();
    updateTargetDisplay();
  });

  document.getElementById('seg-players').addEventListener('click', e => {
    const btn = e.target.closest('[data-n]');
    if (!btn) return;
    document.querySelectorAll('#seg-players .seg-btn').forEach(b => b.classList.remove('on'));
    btn.classList.add('on');
    App.numPlayers = parseInt(btn.dataset.n);
  });

  function updatePlayersSeg() {
    const seg = document.getElementById('seg-players');
    seg.innerHTML = '';
    const opts = App.gameMode === 'tarot' ? [3,4,5] : [4];
    opts.forEach((n,i) => {
      const b = document.createElement('button');
      b.className = 'seg-btn' + (i===0?' on':'');
      b.dataset.n = n; b.textContent = n;
      seg.appendChild(b);
    });
    App.numPlayers = opts[0];
  }

  function updateTargetDisplay() {
    const tgt = document.getElementById('target-score-group');
    const inp = document.getElementById('inp-target');
    if (!tgt || !inp) return;
    const def = defaultTarget(App.gameMode);
    if (def > 0) {
      tgt.style.display = '';
      inp.value = def;
      inp.placeholder = def.toString();
    } else {
      // Tarot : pas de cible par défaut, champ optionnel
      tgt.style.display = '';
      inp.value = '';
      inp.placeholder = 'Libre (ex: 1000)';
    }
    App.targetScore = def || 0;
  }

  document.getElementById('inp-target')?.addEventListener('input', e => {
    App.targetScore = parseInt(e.target.value) || defaultTarget(App.gameMode);
  });

  // Init
  updateTargetDisplay();

  document.getElementById('btn-create').addEventListener('click', () => {
    const name = document.getElementById('inp-name').value.trim();
    if (!name) return toast('Entrez votre prénom');
    App.playerName = name;
    const targetVal = parseInt(document.getElementById('inp-target')?.value) || defaultTarget(App.gameMode);
    connectSocket();
    App.socket.emit('room:create', {
      name, gameType: App.gameMode, numPlayers: App.numPlayers,
      fillWithAI: document.getElementById('chk-ai').checked,
      targetScore: targetVal,
    });
  });

  function joinRoom() {
    const name = document.getElementById('inp-name').value.trim();
    const code = document.getElementById('inp-code').value.trim().toUpperCase();
    if (!name) return toast('Entrez votre prénom');
    if (code.length < 6) return toast('Code invalide (6 caractères)');
    App.playerName = name;
    connectSocket();
    App.socket.emit('room:join', {roomId: code, name});
  }
  document.getElementById('btn-join').addEventListener('click', joinRoom);
  document.getElementById('inp-code').addEventListener('keypress', e => { if (e.key==='Enter') joinRoom(); });

  document.getElementById('btn-add-ai').addEventListener('click', () => App.socket?.emit('room:add_ai'));
  document.getElementById('btn-start').addEventListener('click', () => {
    if (App.room && App.room.players.length < App.room.numPlayers) App.socket?.emit('room:add_ai');
  });
  document.getElementById('btn-back').addEventListener('click', () => {
    App.socket?.disconnect(); App.socket = null; showScreen('home');
  });

  document.getElementById('btn-gmenu').addEventListener('click', () => {
    if (confirm('Quitter la partie ?')) { App.socket?.disconnect(); showScreen('home'); }
  });

  document.getElementById('btn-m-quit').addEventListener('click', () => {
    document.getElementById('modal').classList.remove('open');
    App.socket?.disconnect(); showScreen('home');
  });
  document.getElementById('btn-m-again').addEventListener('click', () => {
    document.getElementById('modal').classList.remove('open');
    App.socket?.emit('game:rematch');
  });
});
