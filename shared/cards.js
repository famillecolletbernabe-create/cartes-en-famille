// shared/cards.js - Logique commune des cartes

const SUITS = ['♠', '♥', '♦', '♣'];
const SUIT_NAMES = { '♠': 'Pique', '♥': 'Coeur', '♦': 'Carreau', '♣': 'Trèfle' };
const SUIT_COLORS = { '♠': 'black', '♥': 'red', '♦': 'red', '♣': 'black' };

// Valeurs belote/coinche
const BELOTE_RANKS = ['7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
const TAROT_RANKS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'V', 'C', 'D', 'R'];

// Points en belote (atout / non-atout)
const BELOTE_POINTS = {
  trump:    { '7': 0, '8': 0, '9': 14, '10': 10, 'J': 20, 'Q': 3, 'K': 4, 'A': 11 },
  nonTrump: { '7': 0, '8': 0, '9': 0,  '10': 10, 'J': 2,  'Q': 3, 'K': 4, 'A': 11 }
};

// Ordre en belote (atout / non-atout)
const BELOTE_ORDER = {
  trump:    { '7': 0, '8': 1, 'Q': 2, 'K': 3, '10': 4, 'A': 5, '9': 6, 'J': 7 },
  nonTrump: { '7': 0, '8': 1, '9': 2, 'J': 3, 'Q': 4,  'K': 5, '10': 6, 'A': 7 }
};

function createBeloteDeck() {
  const deck = [];
  for (const suit of SUITS) {
    for (const rank of BELOTE_RANKS) {
      deck.push({ suit, rank, id: `${rank}${suit}` });
    }
  }
  return deck;
}

function createTarotDeck() {
  const deck = [];
  // Cartes ordinaires
  for (const suit of SUITS) {
    for (const rank of TAROT_RANKS) {
      deck.push({ suit, rank, id: `${rank}${suit}`, type: 'regular' });
    }
  }
  // Atouts (lames)
  for (let i = 1; i <= 21; i++) {
    deck.push({ suit: 'trump', rank: String(i), id: `T${i}`, type: 'trump', 
                name: getTarotTrumpName(i) });
  }
  // Excuse
  deck.push({ suit: 'excuse', rank: '0', id: 'EX', type: 'excuse', name: "L'Excuse" });
  return deck;
}

function getTarotTrumpName(n) {
  const names = {
    1: 'Le Petit', 21: 'Le Monde'
  };
  return names[n] || `${n}`;
}

function shuffle(deck) {
  const d = [...deck];
  for (let i = d.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [d[i], d[j]] = [d[j], d[i]];
  }
  return d;
}

function dealCards(deck, numPlayers, cardsPerPlayer) {
  const hands = Array.from({ length: numPlayers }, () => []);
  for (let i = 0; i < cardsPerPlayer * numPlayers; i++) {
    hands[i % numPlayers].push(deck[i]);
  }
  return { hands, remaining: deck.slice(cardsPerPlayer * numPlayers) };
}

// Qui gagne le pli en belote ?
function beloteTrickWinner(trick, trumpSuit, leadSuit) {
  let winner = 0;
  let winCard = trick[0];
  
  for (let i = 1; i < trick.length; i++) {
    const card = trick[i];
    const winIsTrump = winCard.suit === trumpSuit;
    const cardIsTrump = card.suit === trumpSuit;
    
    if (cardIsTrump && !winIsTrump) {
      winner = i; winCard = card;
    } else if (cardIsTrump && winIsTrump) {
      if (BELOTE_ORDER.trump[card.rank] > BELOTE_ORDER.trump[winCard.rank]) {
        winner = i; winCard = card;
      }
    } else if (!cardIsTrump && !winIsTrump && card.suit === leadSuit) {
      if (BELOTE_ORDER.nonTrump[card.rank] > BELOTE_ORDER.nonTrump[winCard.rank]) {
        winner = i; winCard = card;
      }
    }
  }
  return winner;
}

function beloteCardPoints(card, trumpSuit) {
  if (card.suit === trumpSuit) return BELOTE_POINTS.trump[card.rank];
  return BELOTE_POINTS.nonTrump[card.rank];
}

// Cartes jouables en belote
function getPlayableCards(hand, trick, trumpSuit) {
  if (trick.length === 0) return hand;
  
  const leadSuit = trick[0].suit;
  const leadIsTrump = leadSuit === trumpSuit;
  const hasSuit = hand.filter(c => c.suit === leadSuit);
  const hasTrump = hand.filter(c => c.suit === trumpSuit);
  
  if (leadIsTrump) {
    // On a demandé de l'atout
    if (hasTrump.length > 0) {
      // Doit monter si possible
      const currentBest = trick.filter(c => c.suit === trumpSuit)
        .reduce((best, c) => BELOTE_ORDER.trump[c.rank] > BELOTE_ORDER.trump[best.rank] ? c : best, 
                trick.find(c => c.suit === trumpSuit) || { rank: '7' });
      const canOver = hasTrump.filter(c => BELOTE_ORDER.trump[c.rank] > BELOTE_ORDER.trump[currentBest.rank]);
      return canOver.length > 0 ? canOver : hasTrump;
    }
    return hand;
  }
  
  if (hasSuit.length > 0) return hasSuit;
  
  // Pas la couleur demandée - doit couper si possible
  const partnerIdx = trick.length >= 2 ? (trick.length - 1) : -1; // simplification
  if (hasTrump.length > 0) return hasTrump;
  return hand;
}

if (typeof module !== 'undefined') {
  module.exports = {
    SUITS, SUIT_NAMES, SUIT_COLORS,
    BELOTE_RANKS, TAROT_RANKS,
    BELOTE_POINTS, BELOTE_ORDER,
    createBeloteDeck, createTarotDeck,
    shuffle, dealCards,
    beloteTrickWinner, beloteCardPoints, getPlayableCards,
    getTarotTrumpName
  };
}
