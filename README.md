# Kova — Bot de gestion complète pour serveur Discord

Un seul bot pour gérer entièrement ton serveur de A à Z, avec un thème bleu foncé (`#1B2A4A`) appliqué partout : embeds, rôles créés, transcripts.

---

## Sommaire

1. [Caractéristiques](#caractéristiques)
2. [Installation rapide (3 minutes)](#installation-rapide-3-minutes)
3. [Structure du projet](#structure-du-projet)
4. [Configuration (`config.json`)](#configuration-configjson)
5. [Modules en détail](#modules-en-détail)
6. [Liste des commandes](#liste-des-commandes)
7. [Hébergement](#hébergement)
8. [Dépannage](#dépannage)

---

## Caractéristiques

| Module | Contenu |
|---|---|
| **Installation rapide** | 4 champs à remplir, puis `/setup tout` : le bot crée lui-même ses rôles, ses catégories, ses 8 salons de logs, les panneaux tickets / boutique / règlement. |
| **Tickets** | Menu déroulant multi-catégories, transcripts HTML autonomes, fonction *claim*, classement du staff. |
| **Sécurité** | Anti-nuke (rôles, salons, bans), anti-raid, filtre de comptes récents, anti-pub / anti-liens. |
| **Modération** | `ban`, `kick`, `mute`, `unmute`, `warn`, `blacklist`, `historique`, `clear`, `slowmode`. |
| **VIP** | Boutique avec preuve de paiement PayPal, attribution automatique du rôle, expiration, gestion des visibilités, salons privés. |
| **Logs** | 8 salons : messages, membres, modération, rôles, salons, vocal, sécurité, tickets. |
| **Vocal** | Salons vocaux temporaires (hub) + logs des connexions / déconnexions / déplacements. |
| **Sauvegardes** | Sauvegarde automatique des rôles et salons toutes les 12 h, avec téléchargement. |
| **Personnalisable** | Tout est centralisé dans `config.json`, chaque module s'active en `true`/`false`. |

---

## Installation rapide (3 minutes)

### 1. Prérequis

- [Node.js](https://nodejs.org) version **18 ou supérieure**
- Un compte Discord et un serveur dont tu es administrateur

### 2. Créer l'application sur le portail développeur

1. Va sur [discord.com/developers/applications](https://discord.com/developers/applications) → **New Application**, nomme-la « Kova ».
2. Onglet **Bot** → **Reset Token** → copie le token (garde-le secret).
3. Toujours dans **Bot**, active les **Privileged Gateway Intents** :
   - ✅ `SERVER MEMBERS INTENT`
   - ✅ `MESSAGE CONTENT INTENT`
4. Onglet **OAuth2 → URL Generator** :
   - Scopes : `bot`, `applications.commands`
   - Permissions : `Administrator` (le bot doit pouvoir créer rôles et salons)
5. Ouvre l'URL générée et invite le bot sur ton serveur.

### 3. Remplir les 4 champs

Ouvre `config.json` et renseigne :

```json
"bot": {
  "token": "ton token du portail développeur",
  "clientId": "l'Application ID (onglet General Information)",
  "guildId": "l'ID de ton serveur (clic droit sur le serveur → Copier l'identifiant)",
  "prefix": "!"
}
```

> 💡 Pour obtenir un ID, active **Paramètres → Avancés → Mode développeur** sur Discord.

### 4. Installer et lancer

```bash
npm install
npm run deploy     # déploie les commandes slash (une seule fois, ou après ajout d'une commande)
npm start          # démarre le bot
```

### 5. Tout créer d'un coup

Sur ton serveur, tape :

```
/setup tout
```

Le bot crée alors :

- **6 rôles** : Staff, Modérateur, VIP, Membre, Muted, Non vérifié
- **4 salons publics** : `reglement`, `annonces`, `boutique`, `tickets`
- **2 catégories** : `Logs`, `Tickets`
- **8 salons de logs** : `logs-messages`, `logs-membres`, `logs-moderation`, `logs-roles`, `logs-salons`, `logs-vocal`, `logs-securite`, `logs-tickets`
- **Les panneaux** : panneau de tickets, boutique VIP, règlement

Pour vérifier que rien ne manque : `/setup verifier`.

---

## Structure du projet

```
kova/
├── config.json              ← toute la configuration
├── package.json
├── index.js                 ← point d'entrée (charge commandes + événements)
├── core.js                  ← client Discord, utilitaires, base JSON
├── deploy-commands.js       ← déploiement des commandes slash
├── commandes/
│   ├── slash/               ← 22 commandes slash
│   │   ├── setup.js  ticket.js  moderation.js  vip.js
│   │   ├── securite.js  logs.js  backup.js  aide.js
│   │   └── ...
│   └── prefixe/             ← 33+ commandes classiques
│       ├── aide.js  moderation.js  tickets.js  vip.js
│       ├── securite.js  setup.js  vocal.js  util.js
│       └── ...
├── evenements/              ← écouteurs Discord
│   ├── pret.js  messageCreate.js  interactionCreate.js
│   ├── guildMemberAdd.js  guildMemberRemove.js  guildMemberUpdate.js
│   ├── messageDelete.js  messageUpdate.js  guildBanAdd.js
│   └── voiceStateUpdate.js
├── modules/                 ← logique métier
│   ├── setup.js  tickets.js  moderation.js  securite.js
│   ├── logs.js  vip.js  backup.js
├── data/                    ← données persistantes (généré à l'usage)
│   ├── tickets.json  warns.json  blacklist.json  vip.json  staff.json
├── backups/                 ← sauvegardes automatiques (généré à l'usage)
└── transcripts/             ← transcripts HTML générés (généré à l'usage)
```

---

## Configuration (`config.json`)

Chaque module s'active indépendamment. Un module désactivé ne charge pas ses écouteurs.

```json
"modules": {
  "setup": true,
  "tickets": true,
  "securite": true,
  "moderation": true,
  "vip": true,
  "logs": true,
  "vocal": true,
  "backup": true
}
```

### Points de réglage utiles

| Clé | Effet |
|---|---|
| `bot.couleur` | Couleur du thème, en hexadécimal. Par défaut `#1B2A4A` (bleu foncé). |
| `bot.prefix` | Préfixe des commandes classiques (défaut `!`). |
| `roles.*` | Nom des rôles créés par le setup. |
| `salons.*` | Nom des salons créés par le setup. |
| `logs.*` | Active/désactive chaque catégorie de log séparément. |
| `tickets.categories` | Catégories du menu déroulant : `label`, `emoji`, `description`. |
| `securite.nombreChangementsRoleParMinute` | Seuil anti-nuke sur les rôles. |
| `securite.nombreJoinsParMinute` | Seuil anti-raid sur les arrivées. |
| `securite.listeMotsInterdits` | Termes déclenchant l'anti-pub (liens, invitations…). |
| `securite.sanctionParDefaut` | `timeout24h`, `kick` ou `ban`. |
| `vip.paypal` | Ton lien PayPal (sans `https://`). |
| `vip.dureeJours` | Durée d'un accès VIP. |
| `backup.intervalleHeures` | Fréquence des sauvegardes automatiques. |

---

## Modules en détail

### 🎫 Tickets

Le panneau du salon `tickets` affiche un menu déroulant. À la sélection d'une catégorie :

1. Un salon privé `ticket-0001` est créé, visible par le membre, le staff et les modérateurs.
2. Trois boutons apparaissent : **Claim**, **Fermer**, **Transcript**.

- **Claim** : le premier membre du staff à cliquer s'attribue le ticket ; le compteur du classement s'incrémente.
- **Transcript** : génère un fichier `.html` stylisé aux couleurs du thème, prêt à archiver.
- **Fermer** : génère le transcript, l'envoie dans `logs-tickets`, puis supprime le salon après 5 secondes.

`/ticket classement` affiche le top 10 du staff par tickets pris en charge.

### 🛡️ Sécurité

| Protection | Fonctionnement |
|---|---|
| **Anti-nuke** | Surveille les logs d'audit. Au-delà de `nombreChangementsRoleParMinute` changements de rôles, `nombreBansParMinute` bans ou `nombreCreationsSalonParMinute` suppressions de salons par la même personne en une minute, la sanction automatique est appliquée. |
| **Anti-raid** | Au-delà de `nombreJoinsParMinute` arrivées en une minute, le serveur passe automatiquement en niveau de vérification maximal (4). |
| **Filtre de comptes récents** | Tout compte créé il y a moins de `filtreComptesRecentsJours` jours est sanctionné ou rejeté. |
| **Anti-pub** | Supprime les messages contenant un terme de `listeMotsInterdits`, prévient l'auteur, et sanctionne à la 3ᵉ récidive. Le staff et les modérateurs sont exemptés. |

`/securite etat` affiche tous les réglages actifs. `/securite verrouiller` et `/securite deverrouiller` ajustent le niveau de vérification du serveur à la main.

### 🔨 Modération

Avertissements persistants stockés dans `data/warns.json`. À partir de `avertissementAvantBlacklist` avertissements (3 par défaut), la blacklist s'applique automatiquement : bannissement définitif et inscription dans `data/blacklist.json`.

Les sanctions sont annoncées en message privé au membre (désactivable via `moderation.dmAuto`) et journalisées dans `logs-moderation`.

### 💎 VIP

1. Le panneau du salon `boutique` propose **J'ai payé** (ouvre un formulaire : e-mail PayPal, référence de transaction, note) et **Mon statut VIP**.
2. La demande est transmise dans `logs-securite` pour vérification par le staff.
3. `/vip donner @membre` attribue le rôle VIP pour `vip.dureeJours` jours et ouvre la visibilité des salons privés.
4. À l'expiration, le rôle est retiré automatiquement avec un message privé.

`/vip liste` affiche tous les VIP actifs et leurs dates d'expiration.

### 📋 Logs

Huit salons, chacun alimenté par son événement :

| Salon | Contenu |
|---|---|
| `logs-messages` | Messages supprimés et modifiés (avant / après). |
| `logs-membres` | Arrivées, départs, changements de pseudo. |
| `logs-moderation` | Bans, mutes, blacklists, avertissements. |
| `logs-roles` | Rôles ajoutés et retirés. |
| `logs-salons` | Sauvegardes effectuées, modifications de salons. |
| `logs-vocal` | Connexions, déconnexions, déplacements, mutes vocaux. |
| `logs-securite` | Anti-nuke, anti-raid, anti-pub, sanctions automatiques, demandes VIP. |
| `logs-tickets` | Ouvertures, claims, fermetures, transcripts. |

Chaque catégorie s'active séparément dans `config.json → logs`.

### 💾 Sauvegardes

Une sauvegarde complète (rôles + salons + liste des membres et de leurs rôles) est écrite dans `backups/` toutes les `backup.intervalleHeures`, plus une minute après le démarrage du bot. Les `backup.maxBackups` plus anciennes sont purgées automatiquement.

- `/backup creer` — sauvegarde immédiate
- `/backup liste` — liste les fichiers
- `/backup telecharger <fichier>` — récupère le JSON

---

## Liste des commandes

### Commandes slash (22)

| Commande | Description |
|---|---|
| `/setup tout` \| `roles` \| `salons` \| `panneaux` \| `verifier` | Installation et diagnostic |
| `/ticket panneau` \| `fermer` \| `classement` | Gestion des tickets |
| `/moderation ban` \| `kick` \| `mute` \| `unmute` \| `warn` \| `blacklist` \| `historique` | Modération |
| `/securite etat` \| `verrouiller` \| `deverrouiller` | Sécurité |
| `/vip panneau` \| `donner` \| `retirer` \| `liste` | Accès VIP |
| `/logs etat` \| `/logs voir <catégorie>` | Salons de logs |
| `/backup creer` \| `liste` \| `telecharger` | Sauvegardes |
| `/aide` | Aide du bot |

### Commandes classiques (33+)

**Installation** — `!setup`

**Tickets** — `!panneau`, `!transcript`, `!classement`

**Modération** — `!ban`, `!kick`, `!mute`, `!unmute`, `!warn`, `!blacklist`, `!historique`, `!clear`, `!slowmode`

**Sécurité** — `!securite`, `!lock`, `!unlock`

**VIP** — `!vip`, `!unvip`, `!vips`, `!boutique`

**Vocal** — `!voc`, `!voc lock`, `!voc unlock`

**Utilitaires** — `!ping`, `!serveur`, `!user`, `!avatar`, `!roleinfo`, `!annonce`, `!sondage`, `!say`, `!reglement`, `!aide`

Les commandes d'administration vérifient la permission du membre (ban, kick, gestion des salons, etc.). Un cooldown de 3 secondes s'applique aux commandes classiques.

---

## Hébergement

Le bot doit tourner en permanence. Trois options :

| Option | Avantage | Inconvénient |
|---|---|---|
| **VPS** (OVH, Hetzner…) | Contrôle total, ~5 €/mois | Configuration manuelle |
| **Panel Pterodactyl** | Installation en quelques clics | Ressources limitées |
| **Ton PC** | Gratuit | Le bot s'arrête quand tu éteins |

Sur un VPS Linux, avec `systemd` :

```ini
[Unit]
Description=Kova Discord Bot
After=network.target

[Service]
Type=simple
User=debian
WorkingDirectory=/home/debian/kova
ExecStart=/usr/bin/node index.js
Restart=always

[Install]
WantedBy=multi-user.target
```

Puis :

```bash
sudo systemctl enable --now kova
sudo journalctl -u kova -f      # suivre les logs du process
```

> ⚠️ Ne mets jamais ton token dans un dépôt Git public. Le fichier `config.json` doit rester privé.

---

## Dépannage

| Symptôme | Cause probable | Solution |
|---|---|---|
| `Connexion impossible` au démarrage | Token invalide | Régénère le token sur le portail développeur et remets-le dans `config.json`. |
| Les commandes slash n'apparaissent pas | Non déployées | Lance `npm run deploy`, puis attends 1 à 2 minutes. |
| `/setup tout` échoue | Le bot n'a pas la permission Administrateur | Réinvite le bot avec la permission `Administrator`. |
| Certains logs ne s'affichent pas | Salon de log manquant | `/setup verifier` puis `/setup salons`. |
| Les rôles changent pourtant personne ne les modifie | Anti-nuke trop sensible | Augmente `securite.nombreChangementsRoleParMinute`. |
| Le bot ne lit pas les messages | Intent manquant | Active `MESSAGE CONTENT INTENT` sur le portail (onglet Bot). |

Tous les fichiers de données sont en JSON lisible, dans `data/` : tu peux les inspecter ou les éditer pour remettre un compteur à zéro ou retirer un avertissement.

---

**Kova** — thème bleu foncé `#1B2A4A` · support et mises à jour via le salon boutique de ton serveur.
