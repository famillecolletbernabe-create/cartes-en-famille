// js/game.js — v4

const SUIT_COLOR = {'♠':'black','♥':'red','♦':'red','♣':'black'};
const FACES = new Set(['J','Q','K','V','C','D','R']);

// ─── Figures SVG inline (lisibles sur desktop) ───────────────────────────────
const FIGURE_SVG = {
  'K': c => `<svg viewBox="0 0 40 56" xmlns="http://www.w3.org/2000/svg">
    <path d="M8 24 L14 11 L20 19 L26 9 L32 24 Z" fill="${c}" opacity="0.88"/>
    <rect x="7" y="23" width="26" height="4" rx="2" fill="${c}"/>
    <circle cx="20" cy="19" r="2.2" fill="#f0c040" opacity="0.9"/>
    <circle cx="14" cy="11" r="1.6" fill="#f0c040" opacity="0.8"/>
    <circle cx="26" cy="9"  r="1.6" fill="#f0c040" opacity="0.8"/>
    <ellipse cx="20" cy="37" rx="7.5" ry="9" fill="#f5deb3" stroke="${c}" stroke-width="0.9"/>
    <ellipse cx="17" cy="34.5" rx="1.3" ry="1.5" fill="${c}"/>
    <ellipse cx="23" cy="34.5" rx="1.3" ry="1.5" fill="${c}"/>
    <path d="M15 39 Q17 37 20 39 Q23 37 25 39" stroke="${c}" stroke-width="1.1" fill="none"/>
    <path d="M14 41 Q20 47 26 41" stroke="${c}" stroke-width="0.9" fill="none"/>
  </svg>`,
  'R': c => `<svg viewBox="0 0 40 56" xmlns="http://www.w3.org/2000/svg">
    <path d="M8 24 L14 11 L20 19 L26 9 L32 24 Z" fill="${c}" opacity="0.88"/>
    <rect x="7" y="23" width="26" height="4" rx="2" fill="${c}"/>
    <circle cx="20" cy="19" r="2.2" fill="#f0c040" opacity="0.9"/>
    <circle cx="14" cy="11" r="1.6" fill="#f0c040" opacity="0.8"/>
    <circle cx="26" cy="9"  r="1.6" fill="#f0c040" opacity="0.8"/>
    <ellipse cx="20" cy="37" rx="7.5" ry="9" fill="#f5deb3" stroke="${c}" stroke-width="0.9"/>
    <ellipse cx="17" cy="34.5" rx="1.3" ry="1.5" fill="${c}"/>
    <ellipse cx="23" cy="34.5" rx="1.3" ry="1.5" fill="${c}"/>
    <path d="M15 39 Q17 37 20 39 Q23 37 25 39" stroke="${c}" stroke-width="1.1" fill="none"/>
    <path d="M14 41 Q20 47 26 41" stroke="${c}" stroke-width="0.9" fill="none"/>
  </svg>`,
  'Q': c => `<svg viewBox="0 0 40 56" xmlns="http://www.w3.org/2000/svg">
    <ellipse cx="20" cy="17" rx="10" ry="7.5" fill="${c}" opacity="0.2"/>
    <path d="M10 15 L15 8 L20 13 L25 7 L30 15" stroke="${c}" stroke-width="2.2" fill="none" stroke-linecap="round"/>
    <circle cx="20" cy="13" r="2"   fill="#f0c040" opacity="0.9"/>
    <circle cx="15" cy="8"  r="1.5" fill="#f0c040" opacity="0.8"/>
    <circle cx="25" cy="7"  r="1.5" fill="#f0c040" opacity="0.8"/>
    <ellipse cx="20" cy="30" rx="7.5" ry="9.5" fill="#f5deb3" stroke="${c}" stroke-width="0.9"/>
    <ellipse cx="17" cy="27.5" rx="1.3" ry="1.3" fill="${c}"/>
    <ellipse cx="23" cy="27.5" rx="1.3" ry="1.3" fill="${c}"/>
    <path d="M15.5 26.5 L17 25.5" stroke="${c}" stroke-width="0.9"/>
    <path d="M22.5 26.5 L24 25.5" stroke="${c}" stroke-width="0.9"/>
    <path d="M16 33 Q20 36.5 24 33" stroke="${c}" stroke-width="1.1" fill="none" stroke-linecap="round"/>
    <circle cx="12.5" cy="30" r="1.7" fill="#f0c040" opacity="0.85"/>
    <circle cx="27.5" cy="30" r="1.7" fill="#f0c040" opacity="0.85"/>
    <path d="M13 38 Q20 44 27 38" stroke="${c}" stroke-width="1.5" fill="none"/>
  </svg>`,
  'D': c => `<svg viewBox="0 0 40 56" xmlns="http://www.w3.org/2000/svg">
    <ellipse cx="20" cy="17" rx="10" ry="7.5" fill="${c}" opacity="0.2"/>
    <path d="M10 15 L15 8 L20 13 L25 7 L30 15" stroke="${c}" stroke-width="2.2" fill="none" stroke-linecap="round"/>
    <circle cx="20" cy="13" r="2"   fill="#f0c040" opacity="0.9"/>
    <circle cx="15" cy="8"  r="1.5" fill="#f0c040" opacity="0.8"/>
    <circle cx="25" cy="7"  r="1.5" fill="#f0c040" opacity="0.8"/>
    <ellipse cx="20" cy="30" rx="7.5" ry="9.5" fill="#f5deb3" stroke="${c}" stroke-width="0.9"/>
    <ellipse cx="17" cy="27.5" rx="1.3" ry="1.3" fill="${c}"/>
    <ellipse cx="23" cy="27.5" rx="1.3" ry="1.3" fill="${c}"/>
    <path d="M15.5 26.5 L17 25.5" stroke="${c}" stroke-width="0.9"/>
    <path d="M22.5 26.5 L24 25.5" stroke="${c}" stroke-width="0.9"/>
    <path d="M16 33 Q20 36.5 24 33" stroke="${c}" stroke-width="1.1" fill="none" stroke-linecap="round"/>
    <circle cx="12.5" cy="30" r="1.7" fill="#f0c040" opacity="0.85"/>
    <circle cx="27.5" cy="30" r="1.7" fill="#f0c040" opacity="0.85"/>
    <path d="M13 38 Q20 44 27 38" stroke="${c}" stroke-width="1.5" fill="none"/>
  </svg>`,
  'J': c => `<svg viewBox="0 0 40 56" xmlns="http://www.w3.org/2000/svg">
    <ellipse cx="20" cy="14" rx="10.5" ry="5.5" fill="${c}" opacity="0.82"/>
    <rect x="10" y="13" width="20" height="3.5" rx="1.5" fill="${c}"/>
    <path d="M28 9 Q37 2 34 13 Q31 9 29 11 Z" fill="${c}" opacity="0.55"/>
    <ellipse cx="20" cy="30" rx="7.5" ry="9" fill="#f5deb3" stroke="${c}" stroke-width="0.9"/>
    <ellipse cx="17" cy="27.5" rx="1.2" ry="1.2" fill="${c}"/>
    <ellipse cx="23" cy="27.5" rx="1.2" ry="1.2" fill="${c}"/>
    <path d="M17 33 Q20 36 23 33" stroke="${c}" stroke-width="1" fill="none" stroke-linecap="round"/>
    <path d="M13 38 Q20 43 27 38" stroke="${c}" stroke-width="1.5" fill="none"/>
  </svg>`,
  'V': c => `<svg viewBox="0 0 40 56" xmlns="http://www.w3.org/2000/svg">
    <ellipse cx="20" cy="14" rx="10.5" ry="5.5" fill="${c}" opacity="0.82"/>
    <rect x="10" y="13" width="20" height="3.5" rx="1.5" fill="${c}"/>
    <path d="M28 9 Q37 2 34 13 Q31 9 29 11 Z" fill="${c}" opacity="0.55"/>
    <ellipse cx="20" cy="30" rx="7.5" ry="9" fill="#f5deb3" stroke="${c}" stroke-width="0.9"/>
    <ellipse cx="17" cy="27.5" rx="1.2" ry="1.2" fill="${c}"/>
    <ellipse cx="23" cy="27.5" rx="1.2" ry="1.2" fill="${c}"/>
    <path d="M17 33 Q20 36 23 33" stroke="${c}" stroke-width="1" fill="none" stroke-linecap="round"/>
    <path d="M13 38 Q20 43 27 38" stroke="${c}" stroke-width="1.5" fill="none"/>
  </svg>`,
  'C': c => `<svg viewBox="0 0 40 56" xmlns="http://www.w3.org/2000/svg">
    <!-- Casque -->
    <path d="M10 24 Q9 9 20 8 Q31 9 30 24 L28 26 Q20 29 12 26 Z" fill="${c}" opacity="0.82"/>
    <rect x="10" y="22" width="20" height="4.5" rx="1.5" fill="${c}" opacity="0.6"/>
    <line x1="12" y1="24" x2="28" y2="24" stroke="rgba(255,255,255,0.35)" stroke-width="0.6"/>
    <!-- Panache -->
    <path d="M20 8 Q13 1 11 6 Q15 5.5 18 10" fill="${c}" opacity="0.5"/>
    <path d="M20 8 Q27 0 30 5 Q26 5.5 22 10" fill="${c}" opacity="0.4"/>
    <!-- Armure corps -->
    <path d="M12 26 Q20 30 28 26 L30 34 Q20 38 10 34 Z" fill="${c}" opacity="0.22"/>
    <path d="M12 26 Q20 30 28 26" stroke="${c}" stroke-width="1.6" fill="none"/>
    <!-- Épée -->
    <line x1="33" y1="19" x2="37" y2="50" stroke="${c}" stroke-width="1.6" opacity="0.65"/>
    <line x1="30" y1="33" x2="40" y2="33" stroke="${c}" stroke-width="1.6" opacity="0.65"/>
  </svg>`,
};

// ─── Créer une carte DOM ─────────────────────────────────────────────────────
function makeCard(card, opts = {}) {
  const el = document.createElement('div');
  el.className = 'card';
  el.dataset.id = card.id;

  if (card.type === 'trump') {
    el.classList.add('trump');
    const isBout = card.rank === '1' || card.rank === '21';
    const deco = isBout ? '★' : ['✦','✧','◆','❖','⬡'][parseInt(card.rank) % 5];
    const romanNum = ['','I','II','III','IV','V','VI','VII','VIII','IX','X','XI','XII','XIII','XIV','XV','XVI','XVII','XVIII','XIX','XX','XXI'][parseInt(card.rank)] || card.rank;
    el.innerHTML = `
      <div class="card-top"><span class="card-rank">${card.rank}</span></div>
      <div class="card-center">
        <div class="trump-center${isBout?' bout':''}">
          <span class="trump-deco" style="font-size:0.75rem;opacity:0.5">${deco}${deco}</span>
          <span class="trump-num">${card.rank}</span>
          <span class="trump-roman">${romanNum}</span>
          <span class="trump-deco" style="font-size:0.75rem;opacity:0.5">${deco}${deco}</span>
        </div>
      </div>
      <div class="card-bot"><span class="card-rank">${card.rank}</span></div>`;

  } else if (card.type === 'excuse') {
    el.classList.add('excuse');
    el.innerHTML = `
      <div class="card-top"><span class="card-rank">★</span></div>
      <div class="card-center">
        <div class="excuse-center">
          <span class="excuse-icon">☆</span>
          <span class="excuse-label">L'Excuse</span>
        </div>
      </div>
      <div class="card-bot"><span class="card-rank">★</span></div>`;

  } else {
    const colorKey = SUIT_COLOR[card.suit] || 'black';
    el.classList.add('c-' + colorKey);
    const isFace = FACES.has(card.rank);
    let centerHTML;
    if (isFace && FIGURE_SVG[card.rank]) {
      el.classList.add('face');
      const svgColor = colorKey === 'red' ? '#cc1f35' : '#1a1a1a';
      centerHTML = `<div class="face-svg">${FIGURE_SVG[card.rank](svgColor)}</div>`;
    } else {
      centerHTML = `<span class="card-pip">${card.suit}</span>`;
    }
    el.innerHTML = `
      <div class="card-top"><span class="card-rank">${card.rank}</span><span class="card-suit-sm">${card.suit}</span></div>
      <div class="card-center">${centerHTML}</div>
      <div class="card-bot"><span class="card-rank">${card.rank}</span><span class="card-suit-sm">${card.suit}</span></div>`;
  }

  if (opts.small)   el.classList.add('sm');
  if (opts.inTrick) el.classList.add('in-trick');
  if (opts.playable === true)  el.classList.add('playable');
  if (opts.playable === false) el.classList.add('not-playable');
  if (opts.selected) el.classList.add('selected');
  if (opts.onClick) el.addEventListener('click', () => opts.onClick(card));
  return el;
}

// ─── Tri de la main ──────────────────────────────────────────────────────────
// Belote/Coinche : par couleur (♠ ♥ ♦ ♣) puis par valeur croissante (7→A)
// Tarot : Excuse | Atouts (1→21) | Couleurs (♠ ♥ ♦ ♣) par rang (As→Roi)
function sortHand(cards) {
  // Ordre ♠ ♥ ♣ ♦ : séparation maximale noires/rouges
  const suitOrd = ['♠','♥','♣','♦'];
  // Belote : 7 8 9 10 J Q K A   Tarot couleur : As=1 → Roi
  const beloteRankVal = {'7':0,'8':1,'9':2,'10':3,'J':4,'Q':5,'K':6,'A':7};
  const tarotRankVal  = {'1':1,'2':2,'3':3,'4':4,'5':5,'6':6,'7':7,'8':8,'9':9,'10':10,'V':11,'C':12,'D':13,'R':14};

  const isTarot = cards.some(c => c.type === 'trump' || c.type === 'excuse' ||
    ['V','C','D','R'].includes(c.rank));

  return [...cards].sort((a, b) => {
    // Excuse toujours en premier
    if (a.type === 'excuse') return -1;
    if (b.type === 'excuse') return 1;
    // Atouts tarot avant les couleurs
    if (a.type === 'trump' && b.type !== 'trump') return -1;
    if (b.type === 'trump' && a.type !== 'trump') return 1;
    // Deux atouts : ordre croissant
    if (a.type === 'trump' && b.type === 'trump') return parseInt(a.rank) - parseInt(b.rank);
    // Deux cartes ordinaires
    const sd = suitOrd.indexOf(a.suit) - suitOrd.indexOf(b.suit);
    if (sd !== 0) return sd;
    const rv = isTarot ? tarotRankVal : beloteRankVal;
    return (rv[a.rank] ?? 99) - (rv[b.rank] ?? 99);
  });
}

// ─── GameUI ──────────────────────────────────────────────────────────────────
const GameUI = {
  state: null, myIndex: null,
  ecartMode: false, ecartRequired: 0, selected: new Set(),

  update({state, yourIndex}) {
    this.state = state;
    if (yourIndex !== undefined) this.myIndex = yourIndex;
    this.renderHeader();
    this.renderPhaseInfo();
    this.renderOpponents();
    this.renderMyRole();
    this.renderTrick();
    this.renderLastTrick();
    this.renderDog();
    this.renderMyHand();
    this.renderBidPanel();
  },

  // ─── SCORES ──────────────────────────────────────────────
  renderHeader() {
    const s = this.state;
    if (!s.gameScores) return;
    const tgt = App.targetScore;
    if (s.numPlayers && s.numPlayers > 2) {
      const el = document.getElementById('g-scores');
      el.innerHTML = s.gameScores.map((v, i) => {
        const name = s.players[i]?.name || '?';
        const col = v >= 0 ? '#7ddd7d' : '#ff8080';
        return `<div class="g-score-item">
          <span class="g-score-label" style="font-size:0.58rem;overflow:hidden;text-overflow:ellipsis;max-width:56px;white-space:nowrap">${name}</span>
          <span class="g-score-val" style="color:${col};font-size:0.82rem">${v>=0?'+':''}${v}</span>
          ${tgt?`<span class="g-score-target">obj ${tgt}</span>`:''}
        </div>`;
      }).join('');
    } else {
      const ns = document.getElementById('sc-ns');
      const eo = document.getElementById('sc-eo');
      if (ns) ns.textContent = s.gameScores[0] || 0;
      if (eo) eo.textContent = s.gameScores[1] || 0;
    }
  },

  // ─── PHASE INFO ──────────────────────────────────────────
  renderPhaseInfo() {
    const s = this.state;
    const el = document.getElementById('g-phase');
    const isMe = s.currentPlayer === this.myIndex;
    const parts = [];

    if (s.phase === 'bidding') {
      const name = s.players[s.currentPlayer]?.name || '?';
      parts.push(isMe ? `<span class="blink">🃏</span> <strong>À vous d'enchérir</strong>` : `⏳ ${name} réfléchit…`);
      if (s.contract) {
        const c = s.contract;
        const taker = s.players[c.playerIdx ?? -1]?.name || '?';
        const myTeam = this.myIndex % 2;
        const takerTeam = (c.playerIdx ?? 0) % 2;
        const teamLabel = s.numPlayers <= 2 || !s.numPlayers
          ? (takerTeam === myTeam ? '<span style="color:#7ac0ff">votre partenaire</span>' : '<span style="color:#ffaa70">vos adversaires</span>')
          : '';
        const suit = c.suit ? `${c.suit}` : '';
        const pts  = c.points ? ` ${c.points} pts` : '';
        const mult = c.surcoinched ? ' ×4' : c.coinched ? ' ×2' : '';
        parts.push(`Contrat : <strong>${taker}</strong>${teamLabel?' ('+teamLabel+')':''} — ${c.type||suit}${pts}${mult}`);
      }
    } else if (s.phase === 'playing') {
      const name = s.players[s.currentPlayer]?.name || '?';
      parts.push(isMe ? `<span class="blink">🎯</span> <strong>À vous de jouer !</strong>` : `⏳ ${name} joue…`);
      if (s.trumpSuit) parts.push(`Atout : <strong>${s.trumpSuit}</strong>`);
      // Afficher preneur (tarot)
      if (s.takerIdx !== undefined) {
        const taker = s.players[s.takerIdx]?.name || '?';
        const contract = s.contract?.type || '';
        parts.push(`<span style="color:#ffd060">Preneur : ${taker} (${contract})</span>`);
        // Couleur appelée (5j)
        if (s.calledCard && s.numPlayers === 5) {
          const suitOf = s.calledCard.match(/[♠♥♦♣]/)?.[0] || s.calledCard.slice(-1);
          const partner = s.partnerIdx !== undefined && s.partnerIdx !== s.takerIdx
            ? s.players[s.partnerIdx]?.name : '?';
          parts.push(`<span style="color:#50b4ff">Appelé : ${suitOf} R → ${partner}</span>`);
        }
      }
      // Preneur belote/coinche
      if (s.contract && s.takerIdx === undefined) {
        const taker = s.players[s.contract.playerIdx ?? -1]?.name;
        if (taker) {
          const myTeam = this.myIndex % 2;
          const takerTeam = (s.contract.playerIdx ?? 0) % 2;
          const ally = takerTeam === myTeam;
          parts.push(`Preneur : <span style="color:${ally?'#7ac0ff':'#ffaa70'}">${taker}</span>`);
        }
      }
      const tc = s.trickCount;
      if (Array.isArray(tc)) parts.push(`NS ${tc[0]} – EO ${tc[1]}`);
      else if (typeof tc === 'number' && tc > 0) parts.push(`Plis : ${tc}`);
    } else if (s.phase === 'dog') {
      const name = s.players[s.takerIdx]?.name || '?';
      parts.push(s.takerIdx === this.myIndex
        ? `<span class="blink">📦</span> <strong>Constituez votre écart</strong>`
        : `⏳ ${name} constitue son écart…`);
      if (s.contract?.type) parts.push(`Contrat : <strong>${s.contract.type}</strong>`);
    } else if (s.phase === 'calling') {
      parts.push(s.takerIdx === this.myIndex
        ? `<span class="blink">👑</span> <strong>Cliquez sur un Roi à appeler</strong>`
        : `⏳ ${s.players[s.takerIdx]?.name} appelle un Roi…`);
    } else {
      parts.push('✅ Manche terminée');
    }
    el.innerHTML = parts.join(' &nbsp;·&nbsp; ');
  },

  // ─── ADVERSAIRES ─────────────────────────────────────────
  renderOpponents() {
    const s = this.state;
    const area = document.getElementById('opponents');
    area.innerHTML = '';
    const n = s.players.length;
    for (let off = 1; off < n; off++) {
      const idx = (this.myIndex + off) % n;
      const p = s.players[idx];
      const isActive = s.currentPlayer === idx;
      const div = document.createElement('div');
      div.className = 'opp';

      // Badge rôle tarot
      let badge = '';
      if (s.numPlayers > 2 && s.takerIdx !== undefined) {
        if (idx === s.takerIdx) badge = '<span class="role-badge taker">P</span>';
        else if (idx === s.partnerIdx && s.partnerIdx !== s.takerIdx) badge = '<span class="role-badge partner">A</span>';
      }

      // Couleur d'équipe
      const col = this.teamColor(idx);
      div.innerHTML = `
        ${badge}
        <div class="opp-name${isActive?' active':''}" style="color:${col}">
          ${p.name||'?'}${p.isAI?' 🤖':''}
        </div>
        ${isActive ? '<div class="opp-dot"></div>' : '<div style="height:7px"></div>'}
        <div class="opp-hand"></div>`;
      const handDiv = div.querySelector('.opp-hand');
      for (let i = 0; i < (p.handSize||0); i++) {
        const mc = document.createElement('div'); mc.className = 'mini-card'; handDiv.appendChild(mc);
      }
      area.appendChild(div);
    }
  },

  // ─── MON RÔLE ────────────────────────────────────────────
  renderMyRole() {
    const s = this.state;
    const el = document.getElementById('my-role-badge');
    if (!el || s.takerIdx === undefined) { if(el) el.style.display='none'; return; }
    const idx = this.myIndex;
    if (idx === s.takerIdx) {
      el.innerHTML = `<span class="role-badge taker">Preneur</span>`;
    } else if (idx === s.partnerIdx && s.partnerIdx !== s.takerIdx) {
      el.innerHTML = `<span class="role-badge partner">Appelé</span>`;
    } else {
      el.innerHTML = `<span class="role-badge defense">Défense</span>`;
    }
    el.style.display = '';
  },

  teamColor(idx) {
    const s = this.state;
    if (s.numPlayers > 2 && s.takerIdx !== undefined) {
      if (idx === s.takerIdx) return '#ffd060';
      if (idx === s.partnerIdx && s.partnerIdx !== s.takerIdx) return '#50b4ff';
      return '#ff9070';
    }
    return idx % 2 === 0 ? '#7ac0ff' : '#ffaa70';
  },

  // ─── PLI EN COURS ────────────────────────────────────────
  renderTrick() {
    const s = this.state;
    const area = document.getElementById('played-cards');
    area.innerHTML = '';
    if (!s.trick || s.trick.length === 0) return;
    s.trick.forEach(card => {
      const who = card.playedBy;
      const name = who === this.myIndex ? 'Vous' : (s.players[who]?.name || '?');
      const entry = document.createElement('div');
      entry.className = 'trick-entry';
      const nm = document.createElement('div');
      nm.className = 'tp-name';
      nm.style.color = this.teamColor(who);
      nm.textContent = name;
      entry.appendChild(nm);
      entry.appendChild(makeCard(card, {inTrick: true}));
      area.appendChild(entry);
    });
  },

  // ─── DERNIER PLI ─────────────────────────────────────────
  renderLastTrick() {
    const s = this.state;
    const bar = document.getElementById('last-trick-bar');
    if (!s.lastTrick || (s.trick && s.trick.length > 0)) { bar.style.display='none'; return; }
    bar.style.display = 'flex';
    const cardsEl = document.getElementById('last-trick-cards');
    cardsEl.innerHTML = '';
    s.lastTrick.cards.forEach(c => cardsEl.appendChild(makeCard(c, {small:true, inTrick:true})));
    const w = s.lastTrick.winner;
    document.getElementById('last-trick-who').textContent =
      '→ ' + (w === this.myIndex ? 'Vous' : (s.players[w]?.name||'?'));
  },

  // ─── CHIEN ───────────────────────────────────────────────
  renderDog() {
    const s = this.state;
    const zone = document.getElementById('dog-zone');
    if (s.dog && s.dog.length > 0 && s.phase === 'dog') {
      zone.classList.add('visible');
      const label = document.createElement('span');
      label.style.cssText = 'font-size:0.72rem;color:var(--gold-light);margin-right:0.4rem;flex-shrink:0;align-self:center';
      label.textContent = 'Chien (visible par tous) :';
      zone.innerHTML = '';
      zone.appendChild(label);
      s.dog.forEach(c => zone.appendChild(makeCard(c, {inTrick: true})));
    } else {
      zone.classList.remove('visible');
    }
  },

  // ─── MA MAIN ─────────────────────────────────────────────
  renderMyHand() {
    const s = this.state;
    const area = document.getElementById('my-hand');
    area.innerHTML = '';
    if (!s.myHand) return;
    const isMyTurn = s.currentPlayer === this.myIndex && s.phase === 'playing';
    const playable = new Set([...(s.playableTarotCards||[]), ...(s.playableCards||[])]);

    // Phase écart tarot : le preneur voit le chien fusionné dans sa main
    let handCards = [...s.myHand];
    if (s.phase === 'dog' && s.takerIdx === this.myIndex && s.dog && s.dog.length > 0) {
      handCards = [...handCards, ...s.dog];
    }
    const sorted = sortHand(handCards);
    // Ordre ♠ ♥ ♣ ♦ — grand séparateur entre ♥ et ♣ (rouge→noir)
    const SUIT_ORD_IDX = {'♠':0,'♥':1,'♣':2,'♦':3};
    let prevSuit = null;
    let prevType = null;

    sorted.forEach(card => {
      const isReg = card.type === 'regular';
      if (prevType !== null && prevType !== card.type) {
        // Transition atouts→couleurs (tarot)
        if (card.type === 'regular') {
          const sep = document.createElement('div');
          sep.className = 'hand-sep-color';
          area.appendChild(sep);
        }
      } else if (isReg && prevSuit !== null && prevSuit !== card.suit) {
        // Même type regular : séparateur selon changement couleur
        const prevIdx = SUIT_ORD_IDX[prevSuit] ?? 0;
        const curIdx  = SUIT_ORD_IDX[card.suit] ?? 0;
        // Grand séparateur entre ♥(1) et ♣(2)
        const isBig = (prevIdx === 1 && curIdx === 2);
        const sep = document.createElement('div');
        sep.className = isBig ? 'hand-sep-color' : 'hand-sep-suit';
        area.appendChild(sep);
      }
      prevType = card.type;
      if (isReg) prevSuit = card.suit;

      const canPlay = isMyTurn ? (playable.size === 0 || playable.has(card.id)) : undefined;
      area.appendChild(makeCard(card, {
        playable: isMyTurn ? canPlay : undefined,
        selected: this.selected.has(card.id),
        onClick: c => this.onCardClick(c, canPlay)
      }));
    });
  },

  onCardClick(card, canPlay) {
    const s = this.state;
    if (this.ecartMode) {
      if (card.type==='trump'||card.type==='excuse') { toast('Impossible d\'écarter un atout !'); return; }
      if (card.rank==='R' && !confirm('Écarter un Roi ?')) return;
      if (this.selected.has(card.id)) this.selected.delete(card.id);
      else if (this.selected.size < this.ecartRequired) this.selected.add(card.id);
      this.renderMyHand(); this.updateEcartBtn(); return;
    }
    if (s.phase==='calling' && s.takerIdx===this.myIndex) {
      if (card.rank!=='R') { toast('Choisissez un Roi !'); return; }
      App.socket.emit('tarot:call', {cardId: card.id}); return;
    }
    if (!canPlay) { toast('Carte non jouable'); return; }
    if (s.currentPlayer !== this.myIndex || s.phase !== 'playing') return;
    App.socket.emit('game:play', {cardId: card.id});
  },

  // ─── ENCHÈRES ────────────────────────────────────────────
  renderBidPanel() {
    const s = this.state;
    const panel = document.getElementById('bid-panel');
    const isMyTurn = s.currentPlayer === this.myIndex;
    if (s.phase==='bidding' && isMyTurn) {
      panel.classList.add('visible');
      s.numPlayers ? this.buildTarotBids() : this.buildBeloteBids();
    } else if (s.phase==='dog' && s.takerIdx===this.myIndex) {
      panel.classList.add('visible'); this.buildEcartPanel();
    } else if (s.phase==='calling' && s.takerIdx===this.myIndex) {
      panel.classList.add('visible');
      document.getElementById('bid-panel-title').textContent = '👑 Appelez une couleur';
      const bb = document.getElementById('bid-buttons');
      bb.innerHTML = '<div style="font-size:0.8rem;color:rgba(245,240,232,0.55);margin-bottom:0.4rem;width:100%;text-align:center">Quel Roi appelez-vous ?</div>';
      ['\u2660','\u2665','\u2663','\u2666'].forEach(suit => {
        const myHand = s.myHand || [];
        const iHaveKing = myHand.find(c => c.rank === 'R' && c.suit === suit);
        const b = document.createElement('button');
        b.className = 'bid-btn' + (['\u2665','\u2666'].includes(suit) ? ' r' : '');
        b.style.cssText = 'font-size:1.4rem;min-width:52px;padding:0.4rem';
        b.textContent = suit;
        if (iHaveKing) {
          b.style.opacity = '0.35';
          b.title = 'Vous avez déjà ce Roi';
          b.disabled = true;
        } else {
          b.onclick = () => App.socket.emit('tarot:call', { cardId: suit });
        }
        bb.appendChild(b);
      });
    } else {
      panel.classList.remove('visible');
      document.getElementById('bid-buttons').innerHTML = '';
      if (s.phase !== 'dog') { this.ecartMode = false; this.selected.clear(); }
    }
  },

  buildBeloteBids() {
    const s = this.state;
    const mode = App.gameType;
    const myTeam = this.myIndex % 2;
    const round = s.bidRound || 1;
    const retourne = s.retourneSuit;
    const title = mode === 'coinche' ? 'Coinche — Enchères'
      : round === 1 ? `Belote — Tour 1 : prenez-vous à ${retourne} ?`
      : 'Belote — Tour 2 : libre';
    document.getElementById('bid-panel-title').textContent = title;
    const bb = document.getElementById('bid-buttons');
    bb.innerHTML = '';

    // Historique enchères (affiché en haut)
    if (s.bids && s.bids.length > 0) {
      const hist = document.createElement('div');
      hist.className = 'bid-history';
      hist.innerHTML = s.bids.map(b => {
        const name = s.players[b.player]?.name || '?';
        const isAlly = (b.player % 2) === myTeam;
        if (b.type === 'pass') return `<span class="bid-pass">${name}: passe</span>`;
        if (b.type === 'coinche') return `<span class="${isAlly?'bid-us':'bid-them'}">${name}: Coinche!</span>`;
        if (b.type === 'surcoinche') return `<span class="${isAlly?'bid-us':'bid-them'}">${name}: Surcoinche!</span>`;
        const cls = isAlly ? 'bid-us' : 'bid-them';
        const label = b.suit ? `${b.suit}${b.points?' '+b.points+' pts':''}` : b.contract || '';
        return `<span class="${cls}">${name}: ${label}</span>`;
      }).join(' · ');
      bb.appendChild(hist);
    }

    if (mode === 'belote') {
      // Tour 1 : seulement la couleur retournée. Tour 2 : toutes.
      const availSuits = (round === 1 && retourne) ? [retourne] : ['♠','♥','♣','♦'];
      availSuits.forEach(suit => {
        const b = document.createElement('button');
        b.className = 'bid-btn' + (['♥','♦'].includes(suit)?' r':'');
        b.style.cssText = 'font-size:1.05rem;padding:0.4rem 1rem';
        b.textContent = suit + ' Atout';
        b.onclick = () => App.socket.emit('game:bid', {bid:{type:'bid',suit}});
        bb.appendChild(b);
      });
    } else {
      // Coinche : grille directe pts × couleur
      const lastBid = (s.bids||[]).filter(b=>b.type==='bid').pop();
      const minPts = lastBid ? lastBid.points + 10 : 80;
      const suits = ['\u2660','\u2665','\u2663','\u2666'];
      const allPts = [80,90,100,110,120,130,140,150,160,250];

      const wrap = document.createElement('div');
      wrap.style.cssText = 'display:flex;flex-direction:column;gap:2px;width:100%;overflow-x:auto';

      // En-tête couleurs
      const head = document.createElement('div');
      head.style.cssText = 'display:grid;grid-template-columns:36px repeat(4,1fr);gap:2px';
      head.appendChild(document.createElement('div'));
      suits.forEach(suit => {
        const th = document.createElement('div');
        th.style.cssText = 'text-align:center;font-size:1.2rem;padding:2px 0;' + (['\u2665','\u2666'].includes(suit)?'color:#cc1f35':'');
        th.textContent = suit;
        head.appendChild(th);
      });
      wrap.appendChild(head);

      allPts.forEach(pts => {
        if (pts < minPts) return;
        const row = document.createElement('div');
        row.style.cssText = 'display:grid;grid-template-columns:36px repeat(4,1fr);gap:2px';
        const lbl = document.createElement('div');
        lbl.style.cssText = 'font-size:0.78rem;color:rgba(245,240,232,0.55);text-align:right;padding-right:3px;display:flex;align-items:center;justify-content:flex-end';
        lbl.textContent = pts === 250 ? 'Cap' : pts;
        row.appendChild(lbl);
        suits.forEach(suit => {
          const b = document.createElement('button');
          b.className = 'bid-btn' + (['\u2665','\u2666'].includes(suit)?' r':'');
          b.style.cssText = 'padding:0.2rem 0;font-size:0.75rem;text-align:center;min-width:0';
          b.textContent = suit;
          b.onclick = () => App.socket.emit('game:bid', {bid:{type:'bid',suit,points:pts}});
          row.appendChild(b);
        });
        wrap.appendChild(row);
      });

      if (s.contract && s.contract.team !== myTeam) {
        const cb = document.createElement('button');
        cb.className = 'bid-btn coinche-btn';
        cb.style.marginTop = '0.3rem';
        cb.textContent = s.contract.coinched ? 'Surcoinche !' : 'Coinche !';
        cb.onclick = () => App.socket.emit('game:bid', {bid:{type:s.contract.coinched?'surcoinche':'coinche'}});
        wrap.appendChild(cb);
      }

      bb.appendChild(wrap);
    }

    const pb = document.createElement('button');
    pb.className = 'bid-btn pass';
    pb.textContent = 'Passer';
    pb.onclick = () => App.socket.emit('game:bid', {bid:{type:'pass'}});
    bb.appendChild(pb);
  },

  buildTarotBids() {
    const s = this.state;
    document.getElementById('bid-panel-title').textContent = 'Contrat Tarot';
    const bb = document.getElementById('bid-buttons');
    bb.innerHTML = '';
    const contracts = ['Petite','Garde','Garde Sans','Garde Contre'];
    const mults = ['×1','×2','×4','×6'];
    const cur = s.contract ? contracts.indexOf(s.contract.type) : -1;
    const grid = document.createElement('div');
    grid.className = 'contract-grid';
    contracts.forEach((c, i) => {
      const tile = document.createElement('div');
      tile.className = 'contract-tile' + (i<=cur?' disabled':'');
      tile.innerHTML = `<div class="ct-name">${c}</div><div class="ct-mult">${mults[i]}</div>`;
      if (i > cur) tile.onclick = () => App.socket.emit('game:bid', {bid:{type:'bid',contract:c}});
      grid.appendChild(tile);
    });
    bb.appendChild(grid);
    const pb = document.createElement('button');
    pb.className = 'bid-btn pass';
    pb.textContent = 'Passer';
    pb.onclick = () => App.socket.emit('game:bid', {bid:{type:'pass'}});
    bb.appendChild(pb);
  },

  buildEcartPanel() {
    this.ecartMode = true;
    this.ecartRequired = this.state.dogSize || 6;
    this.selected.clear();
    document.getElementById('bid-panel-title').textContent = 'Constituez votre écart';
    document.getElementById('bid-buttons').innerHTML = `
      <div class="ecart-bar">
        <span class="ecart-txt">Sélectionnez <strong id="ecart-n">0</strong>/${this.ecartRequired} cartes dans votre main</span>
        <button class="btn-confirm" id="btn-ecart" disabled>Confirmer l'écart</button>
      </div>`;
    document.getElementById('btn-ecart').onclick = () => {
      if (this.selected.size !== this.ecartRequired) return;
      App.socket.emit('tarot:ecart', {cardIds: Array.from(this.selected)});
      this.ecartMode = false; this.selected.clear();
      document.getElementById('bid-panel').classList.remove('visible');
    };
  },

  updateEcartBtn() {
    const n = document.getElementById('ecart-n');
    const btn = document.getElementById('btn-ecart');
    if (n) n.textContent = this.selected.size;
    if (btn) btn.disabled = this.selected.size !== this.ecartRequired;
  },

  // ─── ÉVÉNEMENTS ──────────────────────────────────────────
  onTrickWon({winner}) {
    const name = this.state?.players[winner]?.name || '?';
    toast((winner === this.myIndex ? 'Vous remportez' : name + ' remporte') + ' le pli !');
  },

  onRoundOver({roundResult, gameScores}) {
    const m = document.getElementById('modal');
    const title = document.getElementById('m-title');
    const body = document.getElementById('m-body');
    if (roundResult?.contractTeam !== undefined) {
      const team = roundResult.contractTeam===0 ? 'Nord-Sud' : 'Est-Ouest';
      title.textContent = roundResult.success ? '✅ Contrat réussi !' : '❌ Chute !';
      body.innerHTML = roundResult.success
        ? `<p>L'équipe <strong>${team}</strong> remporte la manche.</p>`
        : `<p>L'équipe <strong>${team}</strong> chute.</p>`;
      const tgt = App.targetScore;
      body.innerHTML += `<div class="modal-score">NS : ${gameScores[0]}${tgt?'/'+tgt:''} &nbsp;·&nbsp; EO : ${gameScores[1]}${tgt?'/'+tgt:''}</div>`;
    } else if (roundResult) {
      const {success, takerPoints, threshold, bouts, finalScore} = roundResult;
      const taker = this.state?.players[this.state?.takerIdx];
      title.textContent = success ? '✅ Contrat réussi !' : '❌ Chute !';
      body.innerHTML = `<p>${taker?.name||'Preneur'} : ${takerPoints?.toFixed(1)} pts (seuil ${threshold})</p>
        <p>${bouts} bout(s) · Score : ${finalScore>=0?'+':''}${finalScore}</p>
        <div class="modal-score">${(gameScores||[]).map((v,i)=>`${this.state?.players[i]?.name||i}: ${v>=0?'+':''}${v}`).join(' · ')}</div>`;
    }
    m.classList.add('open');
    clearTimeout(m._t);
    m._t = setTimeout(() => m.classList.remove('open'), 6000);
  },

  onGameOver({winner, gameScores}) {
    clearTimeout(document.getElementById('modal')._t);
    document.getElementById('m-title').textContent = '🏆 Partie terminée !';
    const teamName = winner===0 ? 'Nord-Sud' : 'Est-Ouest';
    document.getElementById('m-body').innerHTML =
      `<p>Victoire de l'équipe <strong>${teamName}</strong> !</p>
       <div class="modal-score">NS : ${gameScores[0]} &nbsp;·&nbsp; EO : ${gameScores[1]}</div>`;
    document.getElementById('modal').classList.add('open');
  },
};
