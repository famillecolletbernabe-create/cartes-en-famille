// server/index.js - Serveur principal v4

const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const BeloteGame = require('./games/belote');
const TarotGame = require('./games/tarot');

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, { cors: { origin: '*' } });

app.use(express.static(path.join(__dirname, '../public')));
app.get('*', (req, res) => res.sendFile(path.join(__dirname, '../public/index.html')));

// Prénoms IA sympathiques
const AI_NAMES = ['Léa', 'Tom', 'Kim', 'Sue', 'Max', 'Zoé', 'Noa', 'Lou'];
let aiNameIdx = 0;
function nextAIName() { return AI_NAMES[aiNameIdx++ % AI_NAMES.length]; }

const rooms = new Map();
const playerToRoom = new Map();

// ─── Persistance des scores de session (en mémoire, réinitialisé au redémarrage) ───
// roomId -> { ns: n, eo: n } pour belote/coinche
//           { players: [...scores] } pour tarot
const sessionScores = new Map();

class Room {
  constructor(id, hostId, gameType, numPlayers, targetScore) {
    this.id = id;
    this.hostId = hostId;
    this.gameType = gameType;
    this.numPlayers = numPlayers;
    this.targetScore = targetScore; // points pour gagner la partie
    this.players = [];
    this.game = null;
    this.aiTimers = new Map();
    this.status = 'waiting';
  }

  addPlayer(socketId, name) {
    if (this.players.length >= this.numPlayers) return null;
    const playerIdx = this.players.length;
    this.players.push({ socketId, name, playerIdx, isAI: false });
    return playerIdx;
  }

  addAI() {
    if (this.players.length >= this.numPlayers) return null;
    const playerIdx = this.players.length;
    this.players.push({ socketId: null, name: nextAIName(), playerIdx, isAI: true });
    return playerIdx;
  }

  isFull() { return this.players.length >= this.numPlayers; }

  startGame() {
    const gamePlayers = this.players.map(p => ({ id: p.playerIdx, name: p.name, isAI: p.isAI }));
    if (this.gameType === 'tarot') {
      this.game = new TarotGame(this.id, gamePlayers);
      // Reprendre scores session
      if (sessionScores.has(this.id)) {
        this.game.gameScores = sessionScores.get(this.id).players || new Array(this.numPlayers).fill(0);
      }
    } else {
      this.game = new BeloteGame(this.id, gamePlayers, this.gameType);
      if (sessionScores.has(this.id)) {
        const ss = sessionScores.get(this.id);
        this.game.gameScores = [ss.ns || 0, ss.eo || 0];
      }
    }
    this.game.targetScore = this.targetScore;
    this.status = 'playing';
  }

  getPlayerBySocket(socketId) { return this.players.find(p => p.socketId === socketId); }

  broadcast(event, data, excludeSocket = null) {
    for (const p of this.players) {
      if (!p.isAI && p.socketId !== excludeSocket) io.to(p.socketId).emit(event, data);
    }
  }

  sendStateToAll() {
    for (const p of this.players) {
      if (!p.isAI && p.socketId) {
        io.to(p.socketId).emit('game:state', { state: this.game.getState(p.playerIdx), yourIndex: p.playerIdx });
      }
    }
  }

  scheduleAI(delay = 1200) {
    if (!this.game) return;
    const g = this.game;
    let targetIdx;
    if (g instanceof TarotGame && (g.phase === 'dog' || g.phase === 'calling')) {
      targetIdx = g.takerIdx;
    } else {
      targetIdx = g.currentPlayer;
    }
    if (targetIdx === undefined || targetIdx === null) return;
    if (!this.players[targetIdx]?.isAI) return;
    if (this.aiTimers.has(targetIdx)) return;
    const timer = setTimeout(() => {
      this.aiTimers.delete(targetIdx);
      this.executeAITurn(targetIdx);
    }, delay);
    this.aiTimers.set(targetIdx, timer);
  }

  executeAITurn(playerIdx) {
    if (!this.game || this.game.phase === 'end') return;
    if (!this.players[playerIdx]?.isAI) return;
    const g = this.game;
    let result;
    if (g instanceof TarotGame) {
      const action = g.getAIAction(playerIdx);
      if (!action) return;
      if (g.phase === 'bidding') result = g.placeBid(playerIdx, action);
      else if (g.phase === 'calling') result = g.callCard(playerIdx, action.cardId);
      else if (g.phase === 'dog') result = g.makeEcart(playerIdx, action.cardIds);
      else if (g.phase === 'playing') result = g.playCard(playerIdx, action.cardId);
    } else {
      const action = g.getAIAction(playerIdx);
      if (!action) return;
      if (g.phase === 'bidding') result = g.placeBid(playerIdx, action);
      else if (g.phase === 'playing') result = g.playCard(playerIdx, action.id);
    }
    if (result && !result.error) this.handleGameResult(result);
  }

  handleGameResult(result) {
    if (!result) return;
    if (result.action === 'redeal') {
      this.sendStateToAll();
      this.broadcast('game:message', { text: 'Redistribution des cartes…' });
      this.scheduleAI(800);
      return;
    }
    this.sendStateToAll();

    if (result.action === 'game_over') {
      // Effacer les scores de session car partie terminée
      sessionScores.delete(this.id);
      this.broadcast('game:over', { winner: result.winner, gameScores: result.gameScores });
      return;
    }
    if (result.action === 'round_over') {
      // Sauvegarder scores session
      const g = this.game;
      if (g instanceof TarotGame) {
        sessionScores.set(this.id, { players: [...g.gameScores] });
      } else {
        sessionScores.set(this.id, { ns: g.gameScores[0], eo: g.gameScores[1] });
      }
      this.broadcast('game:round_over', { roundResult: result.roundResult || result.result, gameScores: result.gameScores });
      setTimeout(() => {
        if (this.game) { this.game.reset(); this.sendStateToAll(); this.scheduleAI(1000); }
      }, 4000);
      return;
    }
    if (result.action === 'trick_won') this.broadcast('game:trick_won', { winner: result.winner });
    setTimeout(() => this.scheduleAI(), 300);
  }
}

// ─── Socket.io ───────────────────────────────────────────────────────────────
io.on('connection', (socket) => {
  console.log('+ ' + socket.id);

  socket.on('room:create', ({ name, gameType, numPlayers, fillWithAI, targetScore }) => {
    const roomId = uuidv4().slice(0, 6).toUpperCase();
    const target = targetScore || (gameType === 'coinche' ? 1000 : gameType === 'belote' ? 501 : 0);
    const room = new Room(roomId, socket.id, gameType, numPlayers, target);
    room.addPlayer(socket.id, name);
    rooms.set(roomId, room);
    playerToRoom.set(socket.id, roomId);
    socket.join(roomId);
    socket.emit('room:created', { roomId, playerIdx: 0, room: roomInfo(room) });
    if (fillWithAI) { while (!room.isFull()) room.addAI(); }
    if (room.isFull()) {
      // Démarrer directement sans passer par le lobby
      startRoom(room);
    } else {
      io.to(roomId).emit('room:updated', { room: roomInfo(room) });
    }
  });

  socket.on('room:join', ({ roomId, name }) => {
    const room = rooms.get(roomId.toUpperCase());
    if (!room) return socket.emit('error', { message: 'Salle introuvable' });
    if (room.status === 'playing') return socket.emit('error', { message: 'Partie déjà en cours' });
    if (room.isFull()) return socket.emit('error', { message: 'Salle pleine' });
    const playerIdx = room.addPlayer(socket.id, name);
    if (playerIdx === null) return socket.emit('error', { message: 'Erreur' });
    playerToRoom.set(socket.id, roomId.toUpperCase());
    socket.join(roomId.toUpperCase());
    socket.emit('room:joined', { playerIdx, room: roomInfo(room) });
    room.broadcast('room:player_joined', { player: name, room: roomInfo(room) }, socket.id);
    if (room.isFull()) setTimeout(() => startRoom(room), 600);
    else io.to(roomId.toUpperCase()).emit('room:updated', { room: roomInfo(room) });
  });

  socket.on('room:add_ai', () => {
    const room = getRoom(socket.id);
    if (!room || room.hostId !== socket.id) return;
    room.addAI();
    io.to(room.id).emit('room:updated', { room: roomInfo(room) });
    if (room.isFull()) setTimeout(() => startRoom(room), 600);
  });

  socket.on('game:bid', ({ bid }) => {
    const room = getRoom(socket.id);
    if (!room?.game) return;
    const p = room.getPlayerBySocket(socket.id);
    if (!p) return;
    const result = room.game.placeBid(p.playerIdx, bid);
    if (result?.error) return socket.emit('error', { message: result.error });
    room.handleGameResult(result);
  });

  socket.on('game:play', ({ cardId }) => {
    const room = getRoom(socket.id);
    if (!room?.game) return;
    const p = room.getPlayerBySocket(socket.id);
    if (!p) return;
    const result = room.game.playCard(p.playerIdx, cardId);
    if (result?.error) return socket.emit('error', { message: result.error });
    room.handleGameResult(result);
  });

  socket.on('tarot:call', ({ cardId }) => {
    const room = getRoom(socket.id);
    if (!room?.game) return;
    const p = room.getPlayerBySocket(socket.id);
    // cardId peut être une couleur '♥' ou un id legacy
    const arg = (cardId && cardId.length <= 2) ? cardId : cardId;
    const result = room.game.callCard(p.playerIdx, arg);
    if (result?.error) return socket.emit('error', { message: result.error });
    room.handleGameResult(result);
  });

  socket.on('tarot:ecart', ({ cardIds }) => {
    const room = getRoom(socket.id);
    if (!room?.game) return;
    const p = room.getPlayerBySocket(socket.id);
    const result = room.game.makeEcart(p.playerIdx, cardIds);
    if (result?.error) return socket.emit('error', { message: result.error });
    room.handleGameResult(result);
  });

  socket.on('game:rematch', () => {
    const room = getRoom(socket.id);
    if (!room || room.hostId !== socket.id) return;
    // Réinitialiser les scores de session aussi
    sessionScores.delete(room.id);
    if (room.game) { room.game.gameScores = room.game instanceof TarotGame ? new Array(room.numPlayers).fill(0) : [0,0]; room.game.reset(); }
    room.sendStateToAll();
    room.scheduleAI(1000);
  });

  socket.on('disconnect', () => {
    const roomId = playerToRoom.get(socket.id);
    if (roomId) {
      const room = rooms.get(roomId);
      if (room) {
        const p = room.getPlayerBySocket(socket.id);
        if (p) {
          const oldName = p.name;
          p.isAI = true; p.socketId = null; p.name = nextAIName();
          room.broadcast('game:message', { text: `${oldName} s'est déconnecté — remplacé par ${p.name}` });
          room.scheduleAI(2000);
        }
      }
      playerToRoom.delete(socket.id);
    }
  });
});

function getRoom(socketId) {
  const id = playerToRoom.get(socketId);
  return id ? rooms.get(id) : null;
}

function roomInfo(room) {
  return {
    id: room.id, gameType: room.gameType, numPlayers: room.numPlayers,
    status: room.status, targetScore: room.targetScore,
    players: room.players.map(p => ({ name: p.name, isAI: p.isAI })),
  };
}

function startRoom(room) {
  room.startGame();
  io.to(room.id).emit('game:start', { gameType: room.gameType, targetScore: room.targetScore });
  room.sendStateToAll();
  room.scheduleAI(1500);
}

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => console.log(`🃏 http://localhost:${PORT}`));
