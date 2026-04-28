# 🃏 Cartes en Famille

PWA multijoueur pour jouer à la **Belote**, **Coinche** et **Tarot** (3, 4 ou 5 joueurs) en réseau local ou sur internet, avec **joueurs IA** pour combler les places vides.

---

## 🚀 Installation & Démarrage

### Prérequis
- [Node.js](https://nodejs.org/) v18 ou supérieur

### Installation
```bash
cd belote-pwa
npm install
```

### Lancement
```bash
npm start
```

Le serveur démarre sur **http://localhost:3000**

---

## 📱 Accès depuis les téléphones / tablettes

Pour jouer en réseau local (WiFi familial) :

1. Trouvez l'adresse IP locale de votre ordinateur :
   - **Windows** : `ipconfig` → "Adresse IPv4"
   - **Mac/Linux** : `ifconfig` ou `ip addr`

2. Sur chaque appareil (téléphone, tablette), ouvrez le navigateur et allez sur :
   ```
   http://[VOTRE-IP]:3000
   ```
   Ex : `http://192.168.1.10:3000`

3. **Installer comme PWA** : Sur mobile, utilisez "Ajouter à l'écran d'accueil" pour une expérience native.

---

## 🎮 Comment jouer

### Créer une partie
1. Entrez votre prénom
2. Choisissez le jeu (Belote, Coinche, Tarot)
3. Choisissez le nombre de joueurs (Tarot : 3, 4 ou 5)
4. Cochez "Remplir avec des IA" si vous manquez de joueurs
5. Cliquez "Créer la partie"

### Rejoindre une partie
1. Entrez votre prénom
2. Saisissez le **code à 6 lettres** donné par le créateur
3. Cliquez "Rejoindre"

### Pendant la partie
- **La salle attend** que tous les joueurs rejoignent
- L'hôte peut ajouter des **IA** avec le bouton "+ IA"
- La partie démarre automatiquement quand la salle est pleine

---

## 🎴 Règles implémentées

### Belote (4 joueurs)
- Distribution 8 cartes par joueur (32 cartes)
- Enchères : chaque joueur peut prendre à une couleur
- Belote/Rebelote automatiquement détecté
- Victoire à **501 points**

### Coinche (4 joueurs)
- Distribution 8 cartes par joueur
- Enchères avec points (80 à 250) + couleur
- Coinche et Surcoinche
- Victoire à **1000 points**

### Tarot (3, 4 ou 5 joueurs)
- Distribution adaptée au nombre de joueurs + chien
- Contrats : Petite (×1), Garde (×2), Garde Sans (×4), Garde Contre (×6)
- Appel d'un Roi en 5 joueurs
- Constitution de l'écart
- Calcul automatique (bouts, seuils, Petit au bout)
- Scores en points individuels

---

## 🤖 Intelligence Artificielle

Les joueurs IA utilisent une stratégie intégrée :
- **Enchères** : évalue la force de la main (atouts, figures)
- **Jeu** : suit les règles (fournir, couper, pisser)
- **Tarot** : gère l'écart, joue les atouts

Pour une IA plus avancée (via Claude API), remplacez `getAIAction()` dans les fichiers de jeu.

---

## 📁 Structure du projet

```
belote-pwa/
├── server/
│   ├── index.js          # Serveur Express + Socket.io
│   └── games/
│       ├── belote.js     # Logique Belote & Coinche
│       └── tarot.js      # Logique Tarot
├── shared/
│   └── cards.js          # Logique commune des cartes
├── public/
│   ├── index.html        # Interface principale
│   ├── manifest.json     # Config PWA
│   ├── service-worker.js # Cache offline
│   ├── css/style.css     # Styles
│   └── js/
│       ├── app.js        # Gestion UI & sockets
│       └── game.js       # Interface de jeu
└── package.json
```

---

## 🌐 Déploiement sur internet

Pour jouer depuis n'importe où (et pas seulement en local) :

### Option 1 : Railway / Render (gratuit)
```bash
# Avec Railway CLI
railway login
railway init
railway up
```

### Option 2 : Variables d'environnement
```bash
PORT=3000 npm start
```

---

## 🛠 Développement

```bash
npm run dev   # Redémarre automatiquement avec nodemon
```

---

*Bonne partie en famille ! 🃏*
