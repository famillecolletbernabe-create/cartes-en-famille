// server/games/tarot.js - Tarot français RÈGLES OFFICIELLES (3/4/5 joueurs)

const { createTarotDeck, shuffle, dealCards } = require('../../shared/cards');

const TAROT_CARD_POINTS = (card) => {
  if (card.type === 'excuse') return 4.5;
  if (card.type === 'trump' && (card.rank === '1' || card.rank === '21')) return 4.5;
  if (card.type === 'regular') {
    if (card.rank === 'R') return 4.5;
    if (card.rank === 'D') return 3.5;
    if (card.rank === 'C') return 2.5;
    if (card.rank === 'V') return 1.5;
  }
  return 0.5;
};

// Seuils selon nombre de bouts (oudlers)
const BOUT_THRESHOLDS = { 0: 56, 1: 51, 2: 41, 3: 36 };
const CONTRACTS = ['Petite', 'Garde', 'Garde Sans', 'Garde Contre'];
const CONTRACT_MULT = { 'Petite': 1, 'Garde': 2, 'Garde Sans': 4, 'Garde Contre': 6 };
const RANK_ORDER = ['1','2','3','4','5','6','7','8','9','10','V','C','D','R'];

class TarotGame {
  constructor(roomId, players) {
    this.roomId = roomId;
    this.numPlayers = players.length; // 3, 4 ou 5
    this.players = players;
    this.gameScores = new Array(this.numPlayers).fill(0);
    this.dealer = -1;
    this.targetScore = 0; // Tarot : pas de cible fixe par défaut
    this.reset();
  }

  cardsPerPlayer() { return { 3: 24, 4: 18, 5: 15 }[this.numPlayers]; }
  dogSize()        { return { 3: 6,  4: 6,  5: 3  }[this.numPlayers]; }

  reset() {
    this.phase = 'bidding';
    this.dealer = (this.dealer + 1 + this.numPlayers) % this.numPlayers;

    // Distribution + vérification Petit seul
    let valid = false;
    while (!valid) {
      this.deck = shuffle(createTarotDeck());
      const { hands, remaining } = dealCards(this.deck, this.numPlayers, this.cardsPerPlayer());
      this.hands = hands;
      this.dog = remaining.slice(0, this.dogSize());
      valid = !this.hasPetitSeul();
    }

    // Entame : joueur à DROITE du donneur (sens antihoraire = index - 1)
    this.currentPlayer = (this.dealer - 1 + this.numPlayers) % this.numPlayers;
    this.firstBidder = this.currentPlayer;

    this.bids = [];
    this.contract = null;
    this.takerIdx = null;
    this.partnerIdx = null;
    this.calledCard = null;

    this.trick = [];
    this.trickStarter = this.currentPlayer;
    this.wonCards = Array.from({ length: this.numPlayers }, () => []);
    this.trickCount = 0;
    this.lastTrick = null;

    // Poignée annoncée
    this.poignee = null;
    // Petit au bout : suivi du dernier pli
    this.lastTrickHasPetit = false;
    this.lastTrickWinner = null;
  }

  // Vérifie si un joueur a le Petit (atout 1) comme seul atout (sans l'Excuse)
  hasPetitSeul() {
    for (const hand of this.hands) {
      const trumps = hand.filter(c => c.type === 'trump');
      const hasExcuse = hand.some(c => c.type === 'excuse');
      if (trumps.length === 1 && trumps[0].rank === '1' && !hasExcuse) return true;
    }
    return false;
  }

  getState(forPlayer = null) {
    const state = {
      phase: this.phase,
      numPlayers: this.numPlayers,
      players: this.players.map((p, i) => ({ ...p, handSize: this.hands[i]?.length || 0 })),
      currentPlayer: this.currentPlayer,
      dealer: this.dealer,
      bids: this.bids,
      contract: this.contract,
      takerIdx: this.takerIdx,
      partnerIdx: this.partnerIdx,
      calledCard: this.calledCard,
      calledSuit: this.calledSuit,
      partnerRevealed: this.partnerRevealed,
      trick: this.trick,
      lastTrick: this.lastTrick,
      trickCount: this.trickCount,
      wonCounts: this.wonCards.map(w => w.length),
      gameScores: this.gameScores,
      dogSize: this.dogSize(),
      // Chien visible par tous pendant la phase dog (sauf Garde Sans/Contre où il n'y a pas de phase dog)
      dog: (this.phase === 'dog' || this.phase === 'end') ? this.dog : null,
    };
    if (forPlayer !== null) {
      state.myHand = this.hands[forPlayer] || [];
      state.playableTarotCards = this.phase === 'playing'
        ? this.getPlayableCards(forPlayer).map(c => c.id) : [];
    }
    return state;
  }

  // ─── ENCHÈRES ─────────────────────────────────────────────────────────────
  // Règle officielle : UN SEUL TOUR. Chaque joueur parle UNE SEULE FOIS.
  // On peut surenchérir sur le joueur précédent, mais on ne reparle plus.
  placeBid(playerIdx, bid) {
    if (playerIdx !== this.currentPlayer) return { error: 'Pas votre tour' };
    if (this.phase !== 'bidding') return { error: 'Pas la phase d\'enchères' };

    if (bid.type === 'pass') {
      this.bids.push({ player: playerIdx, type: 'pass' });
    } else {
      const level = CONTRACTS.indexOf(bid.contract);
      const curLevel = this.contract ? CONTRACTS.indexOf(this.contract.type) : -1;
      if (level <= curLevel) return { error: 'Contrat insuffisant — surenchérissez' };
      this.contract = { playerIdx, type: bid.contract };
      this.takerIdx = playerIdx;
      this.bids.push({ player: playerIdx, type: 'bid', contract: bid.contract });
    }

    // Passer au joueur suivant (sens antihoraire = index - 1)
    const next = (this.currentPlayer - 1 + this.numPlayers) % this.numPlayers;

    // Tout le monde a parlé une fois quand on revient au premier enchérisseur
    const allSpoke = this.bids.length === this.numPlayers;

    if (allSpoke) {
      if (!this.contract) {
        // Tout le monde a passé → redistribution
        this.reset();
        return { action: 'redeal' };
      }
      return this.endBidding();
    }

    this.currentPlayer = next;
    return { action: 'bid_placed', state: this.getState() };
  }

  endBidding() {
    const type = this.contract.type;
    if (type === 'Garde Contre') {
      // Chien va aux défenseurs (non consulté)
      const defenseurs = [];
      for (let i = 0; i < this.numPlayers; i++) {
        if (i !== this.takerIdx) defenseurs.push(i);
      }
      // Les cartes du chien comptent pour les défenseurs
      this.wonCards[defenseurs[0]].push(...this.dog);
      this.dog = [];
      return this.startPlaying();
    }
    if (type === 'Garde Sans') {
      // Chien compte pour le preneur mais n'est pas vu
      this.wonCards[this.takerIdx].push(...this.dog);
      this.dog = [];
      if (this.numPlayers === 5) {
        this.phase = 'calling';
        return { action: 'calling', takerIdx: this.takerIdx, state: this.getState() };
      }
      return this.startPlaying();
    }
    // Petite ou Garde : montrer le chien, écarter
    if (this.numPlayers === 5) {
      this.phase = 'calling';
      return { action: 'calling', takerIdx: this.takerIdx, state: this.getState() };
    }
    this.phase = 'dog';
    return { action: 'dog_phase', state: this.getState(this.takerIdx) };
  }

  // Appel par COULEUR (ex: '♥') - le Roi de cette couleur désigne l'appelé
  // L'identité de l'appelé reste cachée jusqu'à ce qu'il joue le Roi
  callCard(playerIdx, suit) {
    if (playerIdx !== this.takerIdx) return { error: 'Pas le preneur' };
    if (this.phase !== 'calling') return { error: 'Pas la phase d\'appel' };
    this.calledSuit = suit;
    this.calledCard = 'R' + suit; // pour référence

    // Si le preneur a lui-même le Roi → joue seul (partnerIdx = takerIdx)
    const takerHasKing = this.hands[this.takerIdx].find(c => c.suit === suit && c.rank === 'R');
    const dogHasKing = this.dog.find(c => c.suit === suit && c.rank === 'R');
    if (takerHasKing || dogHasKing) {
      this.partnerIdx = this.takerIdx;
      this.partnerRevealed = true;
    } else {
      this.partnerIdx = null; // sera révélé quand le Roi sera joué
      this.partnerRevealed = false;
    }

    if (this.contract && (this.contract.type === 'Garde Sans' || this.contract.type === 'Garde Contre')) {
      return this.startPlaying();
    }
    this.phase = 'dog';
    return { action: 'dog_phase', state: this.getState(this.takerIdx) };
  }

  makeEcart(playerIdx, cardIds) {
    if (playerIdx !== this.takerIdx) return { error: 'Pas le preneur' };
    if (this.phase !== 'dog') return { error: 'Pas la phase du chien' };
    if (cardIds.length !== this.dogSize())
      return { error: `L\'écart doit contenir ${this.dogSize()} cartes` };

    // Intégrer le chien dans la main (si pas déjà fait)
    if (this.dog.length > 0) { this.hands[this.takerIdx].push(...this.dog); this.dog = []; }

    for (const id of cardIds) {
      // Interdiction d'écarter bouts et Rois (sauf si aucune autre option)
      const card = this.hands[this.takerIdx].find(c => c.id === id);
      if (!card) return { error: 'Carte introuvable' };
      if (card.type === 'excuse') return { error: 'Impossible d\'écarter l\'Excuse' };
      if (card.type === 'trump' && (card.rank === '1' || card.rank === '21'))
        return { error: 'Impossible d\'écarter un bout' };
    }

    for (const id of cardIds) {
      const idx = this.hands[this.takerIdx].findIndex(c => c.id === id);
      const [card] = this.hands[this.takerIdx].splice(idx, 1);
      this.wonCards[this.takerIdx].push(card); // L'écart compte pour le preneur
    }

    return this.startPlaying();
  }

  startPlaying() {
    this.phase = 'playing';
    // Entame : joueur à droite du donneur (même que le premier enchérisseur)
    this.currentPlayer = this.firstBidder;
    this.trickStarter = this.currentPlayer;
    this.trick = [];
    return { action: 'playing', state: this.getState() };
  }

  // ─── RÈGLES CARTES JOUABLES ───────────────────────────────────────────────
  // Règles officielles :
  // - Couleur demandée → fournir (sans obligation de monter)
  // - Pas la couleur → couper (atout). Si atout demandé ou coupé → MONTER TOUJOURS si possible (même sur partenaire)
  // - Pas d'atout → défausser librement
  // - L'Excuse peut toujours être jouée (sauf en fin de partie dans certaines règles avancées)
  getPlayableCards(playerIdx) {
    const hand = this.hands[playerIdx];
    const excuse = hand.find(c => c.type === 'excuse');

    if (this.trick.length === 0) {
      // Règle 5 joueurs : on ne peut pas entamer la couleur appelée sauf avec le Roi
      if (this.calledSuit && this.numPlayers === 5 && !this.partnerRevealed) {
        const calledSuitCards = hand.filter(c => c.type === 'regular' && c.suit === this.calledSuit);
        const hasKing = calledSuitCards.find(c => c.rank === 'R');
        if (!hasKing && calledSuitCards.length > 0) {
          // Peut jouer tout sauf la couleur appelée (sauf si que ça)
          const without = hand.filter(c => !(c.type === 'regular' && c.suit === this.calledSuit));
          if (without.length > 0) return without;
        }
      }
      return hand;
    }

    const lead = this.trick[0];
    const leadIsTrump = lead.type === 'trump'; // L'Excuse en entame = couleur libre (cas rare)

    // ── Atout demandé en entame ──────────────────────────────────────────────
    if (leadIsTrump) {
      const myTrumps = hand.filter(c => c.type === 'trump');
      // Obligation de monter (même sur partenaire)
      const highestTrump = Math.max(
        ...this.trick.filter(c => c.type === 'trump').map(c => parseInt(c.rank) || 0), 0);
      const overTrumps = myTrumps.filter(c => parseInt(c.rank) > highestTrump);
      if (overTrumps.length > 0) return excuse ? [...overTrumps, excuse] : overTrumps;
      if (myTrumps.length > 0) return excuse ? [...myTrumps, excuse] : myTrumps;
      // Pas d'atout : défausse libre
      return hand;
    }

    // ── Couleur demandée ─────────────────────────────────────────────────────
    const sameSuit = hand.filter(c => c.suit === lead.suit && c.type === 'regular');
    if (sameSuit.length > 0) {
      // Fournir la couleur (pas obligé de monter sur une couleur)
      return excuse ? [...sameSuit, excuse] : sameSuit;
    }

    // ── Pas la couleur → couper ou pisser ────────────────────────────────────
    const myTrumps = hand.filter(c => c.type === 'trump');
    if (myTrumps.length > 0) {
      // Obligation de monter (même sur partenaire) si atout déjà joué
      const highestTrump = Math.max(
        ...this.trick.filter(c => c.type === 'trump').map(c => parseInt(c.rank) || 0), 0);
      const overTrumps = myTrumps.filter(c => parseInt(c.rank) > highestTrump);
      if (highestTrump > 0) {
        // Atout déjà en jeu → obligation de surcouper si possible
        if (overTrumps.length > 0) return excuse ? [...overTrumps, excuse] : overTrumps;
        // Sinon pisser (sous-couper)
        return excuse ? [...myTrumps, excuse] : myTrumps;
      }
      // Pas encore d'atout → couper avec n'importe quel atout
      return excuse ? [...myTrumps, excuse] : myTrumps;
    }

    // Pas d'atout non plus → défausse libre
    return hand;
  }

  // ─── JEU ─────────────────────────────────────────────────────────────────
  playCard(playerIdx, cardId) {
    if (playerIdx !== this.currentPlayer) return { error: 'Pas votre tour' };
    if (this.phase !== 'playing') return { error: 'Pas la phase de jeu' };

    const hand = this.hands[playerIdx];
    const playable = this.getPlayableCards(playerIdx);
    if (!playable.find(c => c.id === cardId)) return { error: 'Carte non jouable selon les règles' };

    const idx = hand.findIndex(c => c.id === cardId);
    const card = hand.splice(idx, 1)[0];
    // Révéler l'appelé quand il joue le Roi appelé
    if (this.calledSuit && !this.partnerRevealed &&
        card.type === 'regular' && card.rank === 'R' && card.suit === this.calledSuit) {
      this.partnerIdx = playerIdx;
      this.partnerRevealed = true;
    }

    this.trick.push({ ...card, playedBy: playerIdx });

    if (this.trick.length === this.numPlayers) return this.resolveTrick();

    // Sens antihoraire
    this.currentPlayer = (this.currentPlayer - 1 + this.numPlayers) % this.numPlayers;
    return { action: 'card_played', state: this.getState() };
  }

  resolveTrick() {
    let winner = null;
    let winnerIdx = -1;
    const excuse = this.trick.find(c => c.type === 'excuse');

    for (let i = 0; i < this.trick.length; i++) {
      const card = this.trick[i];
      if (card.type === 'excuse') continue;
      if (winner === null) { winner = card; winnerIdx = i; continue; }

      const wTrump = winner.type === 'trump';
      const cTrump = card.type === 'trump';

      if (cTrump && !wTrump) {
        winner = card; winnerIdx = i;
      } else if (cTrump && wTrump) {
        if (parseInt(card.rank) > parseInt(winner.rank)) { winner = card; winnerIdx = i; }
      } else if (!cTrump && !wTrump && card.suit === this.trick[0].suit) {
        if (RANK_ORDER.indexOf(card.rank) > RANK_ORDER.indexOf(winner.rank)) {
          winner = card; winnerIdx = i;
        }
      }
    }

    const absWinner = this.trick[winnerIdx].playedBy;

    // L'Excuse reste à celui qui l'a jouée (sauf dernier pli où elle est perdue)
    const isLastTrick = this.trickCount === (this.cardsPerPlayer() - 1);
    const trickCards = this.trick.filter(c => c.type !== 'excuse');
    this.wonCards[absWinner].push(...trickCards);
    if (excuse) {
      if (isLastTrick) {
        // Au dernier pli, l'Excuse est perdue pour le camp qui l'a jouée
        this.wonCards[absWinner].push(excuse); // elle va au gagnant du pli
      } else {
        // L'Excuse reste à son joueur (mais son camp doit rendre une petite carte)
        this.wonCards[excuse.playedBy].push(excuse);
      }
    }

    // Petit au bout : le Petit (atout 1) dans le dernier pli = prime
    const petitInTrick = this.trick.find(c => c.type === 'trump' && c.rank === '1');
    if (isLastTrick && petitInTrick) {
      this.lastTrickHasPetit = true;
      this.lastTrickWinner = absWinner;
    }

    this.lastTrick = { cards: [...this.trick], winner: absWinner };
    this.trickCount++;
    this.trick = [];
    this.trickStarter = absWinner;
    this.currentPlayer = absWinner;

    if (this.trickCount >= this.cardsPerPlayer()) return this.endRound();
    return { action: 'trick_won', winner: absWinner, state: this.getState() };
  }

  // ─── FIN DE MANCHE ────────────────────────────────────────────────────────
  endRound() {
    this.phase = 'end';

    const isTakerTeam = (i) =>
      i === this.takerIdx || (this.numPlayers === 5 && i === this.partnerIdx);

    // Rassembler les cartes du preneur (+ écart déjà inclus dans wonCards[takerIdx])
    const takerCards = this.wonCards.filter((_, i) => isTakerTeam(i)).flat();

    const takerPoints = takerCards.reduce((s, c) => s + TAROT_CARD_POINTS(c), 0);
    const bouts = takerCards.filter(c =>
      c.type === 'excuse' ||
      (c.type === 'trump' && (c.rank === '1' || c.rank === '21'))
    ).length;

    const threshold = BOUT_THRESHOLDS[bouts];
    const diff = takerPoints - threshold;
    const extra = Math.abs(Math.ceil(diff));
    const baseScore = (25 + extra) * CONTRACT_MULT[this.contract.type];
    const success = takerPoints >= threshold;

    // Prime Petit au bout
    const petitBonus = this.lastTrickHasPetit
      ? (isTakerTeam(this.lastTrickWinner) ? 10 : -10) * CONTRACT_MULT[this.contract.type]
      : 0;

    const finalScore = (success ? baseScore : -baseScore) + petitBonus;

    // Mise à jour des scores
    if (this.numPlayers <= 4) {
      for (let i = 0; i < this.numPlayers; i++) {
        if (i === this.takerIdx) {
          this.gameScores[i] += finalScore * (this.numPlayers - 1);
        } else {
          this.gameScores[i] -= finalScore;
        }
      }
    } else {
      // 5 joueurs : preneur ×2, partenaire ×1, défenseurs −1
      for (let i = 0; i < this.numPlayers; i++) {
        if (i === this.takerIdx) this.gameScores[i] += finalScore * 2;
        else if (i === this.partnerIdx) this.gameScores[i] += finalScore;
        else this.gameScores[i] -= finalScore;
      }
    }

    const result = { success, takerPoints: Math.round(takerPoints * 2) / 2,
                     threshold, bouts, baseScore, petitBonus, finalScore };

    if (this.targetScore && this.targetScore > 0) {
      const maxScore = Math.max(...this.gameScores);
      if (maxScore >= this.targetScore) {
        const winner = this.gameScores.indexOf(maxScore);
        return { action: 'game_over', winner, gameScores: this.gameScores, result, state: this.getState() };
      }
    }
    return { action: 'round_over', result, gameScores: this.gameScores, state: this.getState() };
  }

  // ─── IA ──────────────────────────────────────────────────────────────────
  getAIAction(playerIdx) {
    if (this.phase === 'bidding') return this.getAIBid(playerIdx);
    if (this.phase === 'calling') return { cardId: this.getAICallCard(playerIdx) };
    if (this.phase === 'dog') return { cardIds: this.getAIEcart(playerIdx) };
    if (this.phase === 'playing') return { cardId: this.getAICard(playerIdx).id };
    return null;
  }

  getAIBid(playerIdx) {
    const hand = this.hands[playerIdx];
    const trumps = hand.filter(c => c.type === 'trump');
    const bouts = hand.filter(c =>
      c.type === 'excuse' || (c.type === 'trump' && (c.rank === '1' || c.rank === '21'))).length;
    const kings = hand.filter(c => c.rank === 'R').length;
    const strength = trumps.length * 1.5 + bouts * 3 + kings * 1.2;
    const curLevel = this.contract ? CONTRACTS.indexOf(this.contract.type) : -1;
    if (this.contract?.playerIdx === playerIdx) return { type: 'pass' };
    if (strength >= 14 && curLevel < 1) return { type: 'bid', contract: 'Garde' };
    if (strength >= 10 && curLevel < 0) return { type: 'bid', contract: 'Petite' };
    return { type: 'pass' };
  }

  getAICallCard(playerIdx) {
    const hand = this.hands[playerIdx];
    // Appeler la couleur dont on n'a pas le Roi
    for (const suit of ['♠','♥','♣','♦']) {
      const hasKing = hand.find(c => c.suit === suit && c.rank === 'R');
      if (!hasKing) return suit; // retourner la couleur, pas l'id
    }
    return '♠'; // fallback
  }

  getAIEcart(playerIdx) {
    const hand = this.hands[playerIdx];
    const needed = this.dogSize();
    const result = [];
    const rv = {'1':1,'2':2,'3':3,'4':4,'5':5,'6':6,'7':7,'8':8,'9':9,'10':10,'V':11,'C':12,'D':13,'R':14};
    const low = hand.filter(c => c.type === 'regular' && !['R','D','C','V'].includes(c.rank))
                    .sort((a,b) => (rv[a.rank]||0) - (rv[b.rank]||0));
    for (const c of low) { if (result.length >= needed) break; result.push(c.id); }
    if (result.length < needed) {
      const heads = hand.filter(c => c.type === 'regular' && ['D','C','V'].includes(c.rank) && !result.includes(c.id));
      for (const c of heads) { if (result.length >= needed) break; result.push(c.id); }
    }
    if (result.length < needed) {
      const small = hand.filter(c => c.type === 'trump' && c.rank !== '1' && c.rank !== '21' && !result.includes(c.id))
                        .sort((a,b) => parseInt(a.rank) - parseInt(b.rank));
      for (const c of small) { if (result.length >= needed) break; result.push(c.id); }
    }
    if (result.length < needed) {
      const rest = hand.filter(c => c.type !== 'excuse' &&
        !(c.type === 'trump' && (c.rank === '1' || c.rank === '21')) && !result.includes(c.id));
      for (const c of rest) { if (result.length >= needed) break; result.push(c.id); }
    }
    return result;
  }

  getAICard(playerIdx) {
    const playable = this.getPlayableCards(playerIdx);
    const myTeam = this.isTakerTeam(playerIdx);

    const cardVal = c => {
      if (c.type === 'excuse') return 4.5;
      if (c.type === 'trump' && (c.rank==='1'||c.rank==='21')) return 4.5;
      if (c.type === 'trump') return 0.5;
      if (c.rank==='R') return 4.5; if (c.rank==='D') return 3.5;
      if (c.rank==='C') return 2.5; if (c.rank==='V') return 1.5;
      return 0.5;
    };

    // Qui gagne le pli actuellement ?
    const currentWinner = () => {
      if (this.trick.length === 0) return null;
      let w = null;
      for (const c of this.trick) {
        if (c.type === 'excuse') continue;
        if (!w) { w = c; continue; }
        if (c.type==='trump' && w.type!=='trump') w = c;
        else if (c.type==='trump' && w.type==='trump' && parseInt(c.rank)>parseInt(w.rank)) w = c;
        else if (c.type!=='trump' && w.type!=='trump' && c.suit===this.trick[0].suit &&
                 RANK_ORDER.indexOf(c.rank)>RANK_ORDER.indexOf(w.rank)) w = c;
      }
      return w;
    };
    const partnerWinning = () => {
      const w = currentWinner();
      return w ? this.isTakerTeam(w.playedBy) === myTeam : false;
    };

    if (this.trick.length === 0) {
      // Entame
      if (myTeam) {
        const king = playable.find(c => c.type==='regular' && c.rank==='R');
        if (king) return king;
        const trumps = playable.filter(c => c.type==='trump' && c.rank!=='1' && c.rank!=='21')
                               .sort((a,b) => parseInt(a.rank)-parseInt(b.rank));
        if (trumps.length >= 3) return trumps[Math.floor(trumps.length/2)];
        const reg = playable.filter(c=>c.type==='regular').sort((a,b)=>cardVal(b)-cardVal(a));
        if (reg.length) return reg[0];
      } else {
        const reg = playable.filter(c=>c.type==='regular').sort((a,b)=>cardVal(b)-cardVal(a));
        if (reg.length) return reg[0];
      }
      return playable.sort((a,b)=>cardVal(a)-cardVal(b))[0];
    }

    if (partnerWinning()) {
      // Pisser une grosse carte au partenaire
      const val = playable.filter(c=>cardVal(c)>=3.5 && c.type!=='trump');
      if (val.length) return val.sort((a,b)=>cardVal(b)-cardVal(a))[0];
      return playable.sort((a,b)=>cardVal(a)-cardVal(b))[0];
    }

    // Essayer de prendre
    const leadTrump = this.trick[0]?.type === 'trump';
    const trumps = playable.filter(c=>c.type==='trump' && c.rank!=='1');
    if (!leadTrump && trumps.length > 0 && myTeam) {
      return trumps.sort((a,b)=>parseInt(a.rank)-parseInt(b.rank))[0];
    }
    if (leadTrump && trumps.length > 0) {
      const highest = Math.max(...this.trick.filter(c=>c.type==='trump').map(c=>parseInt(c.rank)||0));
      const over = trumps.filter(c=>parseInt(c.rank)>highest).sort((a,b)=>parseInt(a.rank)-parseInt(b.rank));
      if (over.length) return over[0];
    }
    return playable.sort((a,b)=>cardVal(a)-cardVal(b))[0];
  }

  isTakerTeam(playerIdx) {
    if (playerIdx === this.takerIdx) return true;
    if (this.numPlayers === 5 && this.partnerIdx !== null && playerIdx === this.partnerIdx) return true;
    return false;
  }
}

module.exports = TarotGame;
