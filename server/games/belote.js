// server/games/belote.js - v5
// Distribution correcte belote : 5 cartes + retourne + 3 cartes
// IA coinche basée sur évaluation de main structurée

const { createBeloteDeck, shuffle, beloteTrickWinner,
        beloteCardPoints, getPlayableCards, BELOTE_ORDER } = require('../../shared/cards');

// ─── Distribution belote : 5 cartes par joueur, retourne, puis 3 cartes ──────
function dealBelote(deck) {
  // Chaque joueur reçoit 5 cartes d'abord (2+3 ou 3+2, on fait 5 direct)
  const hands = [[], [], [], []];
  let idx = 0;
  // Tour 1 : 2 cartes chacun
  for (let p = 0; p < 4; p++) for (let c = 0; c < 2; c++) hands[p].push(deck[idx++]);
  // Tour 1 suite : 3 cartes chacun → 5 par joueur
  for (let p = 0; p < 4; p++) for (let c = 0; c < 3; c++) hands[p].push(deck[idx++]);
  // 21e carte = retourne (face retournée)
  const retourne = deck[idx++]; // idx = 20
  // Reste = 11 cartes restantes (distribuées après que quelqu'un prend)
  const remaining = deck.slice(idx);
  return { hands, retourne, remaining };
}

// Distribuer les 3 cartes restantes après prise
// Le preneur reçoit 2 cartes + la retourne (déjà dans sa main), les autres reçoivent 3
function dealAfterTake(hands, remaining, takerIdx) {
  let idx = 0;
  for (let p = 0; p < 4; p++) {
    const count = p === takerIdx ? 2 : 3;
    for (let c = 0; c < count; c++) hands[p].push(remaining[idx++]);
  }
  // idx = 2 + 3*3 = 11 → tout distribué
}

class BeloteGame {
  constructor(roomId, players, mode = 'belote') {
    this.roomId = roomId;
    this.mode = mode;
    this.players = players;
    this.gameScores = [0, 0];
    this.dealer = -1;
    this.targetScore = mode === 'coinche' ? 701 : 501;
    this.reset();
  }

  reset() {
    this.phase = 'bidding';
    this.dealer = (this.dealer + 1 + 4) % 4;
    this.currentPlayer = (this.dealer + 1) % 4;
    this.firstBidder = this.currentPlayer;
    this.deck = shuffle(createBeloteDeck());
    this.trumpSuit = null;
    this.contract = null;
    this.bids = [];
    this.trick = [];
    this.tricks = [[], []];
    this.trickCount = [0, 0];
    this.lastTrick = null;
    this.belote = null;
    this.passCount = 0;
    this.bidRound = 1;
    this.playedCards = []; // suivi des cartes jouées pour l'IA

    if (this.mode === 'belote') {
      // Distribution en 2 temps
      const { hands, retourne, remaining } = dealBelote(this.deck);
      this.hands = hands;
      this.retourneCard = retourne;
      this.retourneSuit = retourne.suit;
      this.remainingDeck = remaining;
    } else {
      // Coinche : toutes les cartes distribuées d'emblée (8 par joueur)
      const hands = [[], [], [], []];
      // Distribution 3+2+3
      let idx = 0;
      for (let p = 0; p < 4; p++) for (let c = 0; c < 3; c++) hands[p].push(this.deck[idx++]);
      for (let p = 0; p < 4; p++) for (let c = 0; c < 2; c++) hands[p].push(this.deck[idx++]);
      for (let p = 0; p < 4; p++) for (let c = 0; c < 3; c++) hands[p].push(this.deck[idx++]);
      this.hands = hands;
      this.retourneCard = null;
      this.retourneSuit = null;
      this.remainingDeck = [];
    }
  }

  getState(forPlayer = null) {
    const state = {
      phase: this.phase, mode: this.mode,
      players: this.players.map((p, i) => ({
        ...p, handSize: this.hands[i]?.length || 0, team: i % 2
      })),
      currentPlayer: this.currentPlayer, dealer: this.dealer,
      trumpSuit: this.trumpSuit, contract: this.contract, bids: this.bids,
      trick: this.trick, lastTrick: this.lastTrick, trickCount: this.trickCount,
      gameScores: this.gameScores, belote: this.belote,
      bidRound: this.bidRound, retourneSuit: this.retourneSuit,
      retourneCard: this.retourneCard,
    };
    if (forPlayer !== null) {
      state.myHand = this.hands[forPlayer] || [];
      state.playableCards = this.phase === 'playing'
        ? getPlayableCards(this.hands[forPlayer], this.trick, this.trumpSuit).map(c => c.id)
        : [];
    }
    return state;
  }

  // ─── ENCHÈRES ─────────────────────────────────────────────────────────────
  placeBid(playerIdx, bid) {
    if (playerIdx !== this.currentPlayer) return { error: 'Pas votre tour' };
    if (this.phase !== 'bidding') return { error: 'Pas la phase d\'enchères' };

    if (bid.type === 'pass') {
      this.bids.push({ player: playerIdx, type: 'pass' });
      this.passCount++;

      if (this.mode === 'belote') {
        if (this.contract && this.passCount >= 3) {
          this.finalizeBeloteTake(this.contract.playerIdx);
          return { action: 'playing', state: this.getState() };
        }
        if (!this.contract && this.passCount >= 4) {
          if (this.bidRound === 1) {
            this.bidRound = 2;
            this.passCount = 0;
            this.currentPlayer = this.firstBidder;
            return { action: 'bid_placed', state: this.getState() };
          } else {
            this.reset();
            return { action: 'redeal' };
          }
        }
      } else {
        // Coinche
        if (this.contract && this.passCount >= 3) {
          this.startPlaying();
          return { action: 'playing', state: this.getState() };
        }
        const totalPasses = this.bids.filter(b => b.type === 'pass').length;
        if (!this.contract && totalPasses >= 4) {
          this.reset();
          return { action: 'redeal' };
        }
      }

    } else if (bid.type === 'bid') {
      if (this.mode === 'belote') {
        if (this.bidRound === 1 && bid.suit !== this.retourneSuit)
          return { error: `Tour 1 : prenez-vous à ${this.retourneSuit} ?` };
        this.passCount = 0;
        this.contract = { team: playerIdx % 2, playerIdx, suit: bid.suit, points: 82 };
        this.trumpSuit = bid.suit;
        this.bids.push({ player: playerIdx, type: 'bid', suit: bid.suit, round: this.bidRound });
        // Lancer directement la partie
        this.finalizeBeloteTake(playerIdx);
        return { action: 'playing', state: this.getState() };
      } else {
        const lastBid = this.bids.filter(b => b.type === 'bid').pop();
        const minPts = lastBid ? lastBid.points + 10 : 80;
        if (bid.points < minPts) return { error: `Minimum ${minPts} points` };
        if (this.contract?.playerIdx === playerIdx)
          return { error: 'Vous ne pouvez pas surenchérir sur vous-même' };
        this.passCount = 0;
        this.contract = { team: playerIdx % 2, playerIdx, suit: bid.suit, points: bid.points };
        this.trumpSuit = bid.suit;
        this.bids.push({ player: playerIdx, type: 'bid', suit: bid.suit, points: bid.points });
      }
    } else if (bid.type === 'coinche') {
      if (!this.contract || this.contract.team === playerIdx % 2)
        return { error: 'Impossible de coincher votre propre équipe' };
      this.contract.coinched = true;
      this.bids.push({ player: playerIdx, type: 'coinche' });
    } else if (bid.type === 'surcoinche') {
      if (!this.contract?.coinched || this.contract.team !== playerIdx % 2)
        return { error: 'Impossible de surcoincher' };
      this.contract.surcoinched = true;
      this.bids.push({ player: playerIdx, type: 'surcoinche' });
      this.startPlaying();
      return { action: 'playing', state: this.getState() };
    }

    this.currentPlayer = (this.currentPlayer + 1) % 4;
    return { action: 'bid_placed', state: this.getState() };
  }

  // Le preneur prend la retourne + reçoit ses 2 cartes, les autres reçoivent 3
  finalizeBeloteTake(takerIdx) {
    // Ajouter la retourne à la main du preneur
    this.hands[takerIdx].push(this.retourneCard);
    this.retourneCard = null;
    // Distribuer le reste
    dealAfterTake(this.hands, this.remainingDeck, takerIdx);
    this.remainingDeck = [];
    this.startPlaying();
  }

  startPlaying() {
    this.phase = 'playing';
    this.currentPlayer = (this.dealer + 1) % 4;
    this.trick = [];
    this.playedCards = [];
  }

  // ─── JEU ──────────────────────────────────────────────────────────────────
  playCard(playerIdx, cardId) {
    if (playerIdx !== this.currentPlayer) return { error: 'Pas votre tour' };
    if (this.phase !== 'playing') return { error: 'Pas la phase de jeu' };
    const hand = this.hands[playerIdx];
    const cardIdx = hand.findIndex(c => c.id === cardId);
    if (cardIdx === -1) return { error: 'Carte introuvable' };
    const playable = getPlayableCards(hand, this.trick, this.trumpSuit);
    if (!playable.find(c => c.id === cardId)) return { error: 'Carte non jouable' };
    const card = hand.splice(cardIdx, 1)[0];
    // Belote/Rebelote
    if (card.suit === this.trumpSuit && (card.rank === 'K' || card.rank === 'Q')) {
      const other = card.rank === 'K' ? 'Q' : 'K';
      if (hand.find(c => c.suit === this.trumpSuit && c.rank === other))
        if (!this.belote) this.belote = { player: playerIdx, team: playerIdx % 2 };
    }
    this.trick.push({ ...card, playedBy: playerIdx });
    this.playedCards.push({ ...card, playedBy: playerIdx });
    if (this.trick.length === 4) return this.resolveTrick();
    this.currentPlayer = (this.currentPlayer + 1) % 4;
    return { action: 'card_played', state: this.getState() };
  }

  resolveTrick() {
    const leadSuit = this.trick[0].suit;
    const relWinner = beloteTrickWinner(this.trick, this.trumpSuit, leadSuit);
    const absWinner = this.trick[relWinner].playedBy;
    const winTeam = absWinner % 2;
    this.trickCount[winTeam]++;
    let pts = this.trick.reduce((s, c) => s + beloteCardPoints(c, this.trumpSuit), 0);
    const isLast = this.trickCount[0] + this.trickCount[1] === 8;
    if (isLast) pts += 10;
    this.tricks[winTeam].push({ cards: this.trick, points: pts });
    this.lastTrick = { cards: [...this.trick], winner: absWinner, points: pts };
    this.trick = [];
    this.currentPlayer = absWinner;
    if (isLast) return this.endRound();
    return { action: 'trick_won', winner: absWinner, state: this.getState() };
  }

  endRound() {
    this.phase = 'end';
    const ct = this.contract.team, ot = 1 - ct;
    let ctPts = this.tricks[ct].reduce((s, t) => s + t.points, 0);
    let otPts = this.tricks[ot].reduce((s, t) => s + t.points, 0);
    const beloteBonus = this.belote ? 20 : 0;
    if (this.belote) {
      if (this.belote.team === ct) ctPts += beloteBonus;
      else otPts += beloteBonus;
    }
    let mult = 1;
    if (this.contract.coinched) mult = 2;
    if (this.contract.surcoinched) mult = 4;
    const success = ctPts >= this.contract.points;
    let roundResult;
    if (success) {
      this.gameScores[ct] += ctPts * mult;
      this.gameScores[ot] += otPts * mult;
      roundResult = { success: true, contractTeam: ct, contractPoints: ctPts, otherPoints: otPts, beloteBonus };
    } else {
      this.gameScores[ot] += (162 + beloteBonus) * mult;
      roundResult = { success: false, contractTeam: ct, contractPoints: ctPts, beloteBonus };
    }
    if (this.gameScores[0] >= this.targetScore || this.gameScores[1] >= this.targetScore) {
      const winner = this.gameScores[0] > this.gameScores[1] ? 0 : 1;
      return { action: 'game_over', winner, gameScores: this.gameScores, roundResult, state: this.getState() };
    }
    return { action: 'round_over', roundResult, gameScores: this.gameScores, state: this.getState() };
  }

  // ─── IA ───────────────────────────────────────────────────────────────────
  getAIAction(playerIdx) {
    if (this.phase === 'bidding') return this.getAIBid(playerIdx);
    if (this.phase === 'playing') return this.getAICard(playerIdx);
    return null;
  }

  // Évaluation structurée d'une couleur comme atout (pseudocode → JS)
  evaluateSuit(hand, suit) {
    const cards = hand.filter(c => c.suit === suit);
    const has = r => cards.find(c => c.rank === r);
    let score = 0;
    if (has('J'))  score += 25;
    if (has('9'))  score += 20;
    if (has('A'))  score += 15;
    if (has('10')) score += 10;
    if (has('K'))  score += 5;
    if (has('Q'))  score += 3;
    if (cards.length >= 4) score += 10;
    if (cards.length >= 5) score += 20;
    if (has('K') && has('Q')) score += 8; // belote potentielle
    return score;
  }

  // Valeur hors-atout (As, 10 maîtres)
  evaluateOffSuit(hand, trumpSuit) {
    let pts = 0;
    for (const suit of ['♠','♥','♣','♦']) {
      if (suit === trumpSuit) continue;
      const cards = hand.filter(c => c.suit === suit);
      if (cards.find(c => c.rank === 'A')) pts += 15;
      if (cards.find(c => c.rank === '10') && cards.find(c => c.rank === 'A')) pts += 5;
      if (cards.find(c => c.rank === 'K') && cards.length >= 2) pts += 3;
    }
    return pts;
  }

  getAIBid(playerIdx) {
    const hand = this.hands[playerIdx];
    const myTeam = playerIdx % 2;

    if (this.mode === 'belote') {
      if (this.contract && this.contract.team === myTeam) return { type: 'pass' };
      if (this.bidRound === 1) {
        const score = this.evaluateSuit(hand, this.retourneSuit);
        // Prendre si main solide (J ou 9+A+longueur)
        const cards = hand.filter(c => c.suit === this.retourneSuit);
        const hasJ = cards.find(c => c.rank === 'J');
        const has9A = cards.find(c => c.rank === '9') && cards.find(c => c.rank === 'A');
        return (hasJ || (has9A && cards.length >= 3) || score >= 45)
          ? { type: 'bid', suit: this.retourneSuit }
          : { type: 'pass' };
      }
      // Tour 2 : chercher meilleure couleur
      const best = ['♠','♥','♣','♦']
        .map(s => ({ s, score: this.evaluateSuit(hand, s) }))
        .sort((a,b) => b.score - a.score)[0];
      const bCards = hand.filter(c => c.suit === best.s);
      const hasJ = bCards.find(c => c.rank === 'J');
      const has9A = bCards.find(c => c.rank === '9') && bCards.find(c => c.rank === 'A');
      return (hasJ || (has9A && bCards.length >= 3) || best.score >= 50)
        ? { type: 'bid', suit: best.s }
        : { type: 'pass' };
    }

    // ── COINCHE ─────────────────────────────────────────────────────────────
    if (this.contract?.playerIdx === playerIdx) return { type: 'pass' };
    const lastBid = this.bids.filter(b => b.type === 'bid').pop();
    const minPts = lastBid ? lastBid.points + 10 : 80;
    const partnerBid = this.bids.filter(b => b.type === 'bid' && b.player % 2 === myTeam).pop();
    const opponentBid = this.bids.filter(b => b.type === 'bid' && b.player % 2 !== myTeam).pop();

    // Soutien du partenaire
    if (partnerBid && this.contract?.team === myTeam) {
      const suit = this.contract.suit;
      const cards = hand.filter(c => c.suit === suit);
      const has = r => cards.find(c => c.rank === r);
      let boost = 0;
      if (has('J')) boost += 20;
      if (has('9')) boost += 10;
      const aces = hand.filter(c => c.rank === 'A' && c.suit !== suit).length;
      boost += aces * 10;
      if (cards.length >= 3) boost += 5;
      const newPts = this.contract.points + boost;
      if (boost >= 10 && newPts >= minPts && newPts <= 160)
        return { type: 'bid', suit, points: Math.ceil(newPts / 10) * 10 };
      return { type: 'pass' };
    }

    // Contre-enchère adversaire
    if (opponentBid && !partnerBid) {
      const evals = ['♠','♥','♣','♦'].map(s => ({
        suit: s,
        score: this.evaluateSuit(hand, s) + this.evaluateOffSuit(hand, s)
      })).sort((a,b) => b.score - a.score);
      const best = evals[0];
      const bCards = hand.filter(c => c.suit === best.suit);
      const hasJ = bCards.find(c => c.rank === 'J');
      if (hasJ && best.score > opponentBid.points) {
        const pts = Math.max(minPts, Math.ceil(best.score * 0.9 / 10) * 10);
        if (pts <= 160) return { type: 'bid', suit: best.suit, points: pts };
      }
      // Coinche si on pense que l'adversaire va chuter
      if (this.contract && this.contract.team !== myTeam && best.score > 70)
        return { type: 'coinche' };
      return { type: 'pass' };
    }

    // Ouverture
    const evals = ['♠','♥','♣','♦'].map(s => ({
      suit: s,
      total: this.evaluateSuit(hand, s) + this.evaluateOffSuit(hand, s),
      trumpScore: this.evaluateSuit(hand, s),
      cards: hand.filter(c => c.suit === s)
    })).sort((a,b) => b.total - a.total);
    const best = evals[0];
    const hasJ = best.cards.find(c => c.rank === 'J');
    const has9 = best.cards.find(c => c.rank === '9');
    const hasA = hand.filter(c => c.rank === 'A').length >= 1;
    const canOpen = hasJ || (has9 && hasA && best.cards.length >= 3);
    if (!canOpen || best.total < 60) return { type: 'pass' };
    let pts = Math.max(minPts, Math.ceil(best.total * 0.85 / 10) * 10);
    pts = Math.min(pts, 130);
    return { type: 'bid', suit: best.suit, points: pts };
  }

  // ── IA de jeu : simulate_card ─────────────────────────────────────────────
  getAICard(playerIdx) {
    const hand = this.hands[playerIdx];
    const playable = getPlayableCards(hand, this.trick, this.trumpSuit);
    const myTeam = playerIdx % 2;

    // Cartes jouées (pour estimation probabilités)
    const playedIds = new Set(this.playedCards.map(c => c.id));
    const totalTrumps = 8; // 7 8 9 10 J Q K A à l'atout
    const playedTrumps = this.playedCards.filter(c => c.suit === this.trumpSuit).length;
    const myTrumpCount = hand.filter(c => c.suit === this.trumpSuit).length;
    const remainingTrumps = totalTrumps - playedTrumps - myTrumpCount;

    const val = c => beloteCardPoints(c, this.trumpSuit);
    const isTrump = c => c.suit === this.trumpSuit;
    const isHighTrump = c => isTrump(c) && (BELOTE_ORDER?.trump?.[c.rank] || 0) >= 5;

    // Qui gagne le pli en cours ?
    const currentWinner = () => {
      if (!this.trick.length) return null;
      const rel = beloteTrickWinner(this.trick, this.trumpSuit, this.trick[0].suit);
      return this.trick[rel];
    };
    const partnerWinning = () => {
      const w = currentWinner();
      return w && w.playedBy % 2 === myTeam;
    };
    const pw = partnerWinning();

    // Simuler chaque carte jouable
    const scored = playable.map(card => {
      let score = val(card) * 0.5; // valeur intrinsèque (pondérée)

      if (this.trick.length === 0) {
        // ── ENTAME ────────────────────────────────────────────────────────
        const isTaker = myTeam === this.contract?.team;
        if (isTrump(card)) {
          if (remainingTrumps > 3 && isHighTrump(card)) score += 20; // tirer les atouts
          else score -= 10; // éviter de gaspiller les atouts
        } else {
          if (card.rank === 'A') score += 25; // As = pli quasi-certain
          if (card.rank === '10' && playedIds.has('A' + card.suit)) score += 15; // 10 maître
          if (card.rank === 'K') score += 8;
        }
      } else {
        // ── ON SUIT ───────────────────────────────────────────────────────
        if (pw) {
          // Partenaire gagne → pisser du score ou petite carte
          if (!isTrump(card) && val(card) >= 10) score += 20; // donner As/10 au partenaire
          else score -= val(card) * 0.3; // éviter de gaspiller
        } else {
          // Adversaire gagne → essayer de prendre
          const w = currentWinner();
          const wVal = w ? (BELOTE_ORDER?.trump?.[w.rank] || 0) : 0;
          const myTrumpVal = isTrump(card) ? (BELOTE_ORDER?.trump?.[card.rank] || 0) : 0;

          if (isTrump(card) && (!w || !isTrump(w))) {
            score += 15; // couper = bon si adversaire gagne
            if (isHighTrump(card)) score += 10;
          } else if (isTrump(card) && isTrump(w) && myTrumpVal > wVal) {
            score += 12; // surcouper
            if (isHighTrump(card) && remainingTrumps > 2) score -= 5; // pas gaspiller si inutile
          } else if (!isTrump(card)) {
            // Suivre couleur : jouer le plus gros si chance de gagner
            score += val(card) * 0.3;
          }
        }
      }
      return { card, score };
    });

    scored.sort((a,b) => b.score - a.score);
    return scored[0].card;
  }
}

module.exports = BeloteGame;
