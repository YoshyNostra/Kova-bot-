# Déployer Kova sur Railway

Guide pas à pas, du dépôt GitHub au bot en ligne.

---

## Résumé express

1. Pousse le projet sur un dépôt GitHub **privé** (le token ne doit jamais y figurer).
2. Railway → **New Project** → **Deploy from GitHub repo**.
3. Onglet **Variables** → ajoute `BOT_TOKEN`, `BOT_CLIENT_ID`, `BOT_GUILD_ID`.
4. Onglet **Settings** → **Volumes** → monte un volume sur `/app/data`.
5. Déploie, puis lance **une fois** `npm run deploy` pour publier les commandes slash.
6. Sur Discord : `/setup tout`.

---

## 1. Préparer le dépôt

Railway déploie depuis Git (GitHub, GitLab, Bitbucket) ou depuis ton disque avec la CLI.

```bash
cd kova
git init
git add .
git commit -m "Kova — bot de gestion Discord"
git remote add origin https://github.com/TON_COMPTE/kova.git
git push -u origin main
```

Le fichier `.gitignore` du projet exclut déjà `node_modules/`, `data/`, `backups/`, `transcripts/` et les `.env`. **Ne mets jamais ton token dans `config.json` avant de pousser** : il finirait dans l'historique Git, et le retirer après coup ne l'efface pas d'un dépôt public.

Le `.dockerignore` exclut aussi ces dossiers de l'image, donc l'image reste légère.

## 2. Créer le service sur Railway

1. Va sur [railway.app](https://railway.app) → **New Project**.
2. **Deploy from GitHub repo** → autorise Railway sur ton compte → choisis le dépôt `kova`.
3. Railway détecte le `Dockerfile` et construit avec. Le fichier `railway.json` du projet fixe déjà :

```json
{
  "build": { "builder": "DOCKERFILE", "dockerfilePath": "Dockerfile" },
  "deploy": {
    "startCommand": "node index.js",
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10,
    "numReplicas": 1
  }
}
```

> **`numReplicas: 1` est important.** Deux instances du même bot avec le même token font planter la connexion gateway et dupliquent les messages de logs. Ne monte jamais le nombre de réplicas.

4. Onglet **Settings** :
   - **Region** — choisis la plus proche de ton serveur (Europe West pour la France).
   - **Restart Policy** — laisse `On Failure`.
   - Si le service est exposé avec un domaine public, tu peux le retirer : un bot Discord n'écoute sur aucun port.

## 3. Variables d'environnement

Onglet **Variables** du service, en mode **Raw Editor** pour tout coller d'un coup :

```env
BOT_TOKEN=ton_token_de_bot
BOT_CLIENT_ID=ton_application_id
BOT_GUILD_ID=id_de_ton_serveur
BOT_PREFIX=!
BOT_COULEUR=#1B2A4A
VIP_PAYPAL=ton-lien-paypal.me
VIP_DUREE_JOURS=30
SEUIL_ROLES_MINUTE=8
SEUIL_BANS_MINUTE=4
SEUIL_JOINS_MINUTE=12
SEUIL_COMPTES_JOURS=7
DATA_DIR=/app/data
BACKUP_DIR=/app/backups
```

Les trois premières sont obligatoires. Toutes les autres sont facultatives : ce qui n'est pas défini garde la valeur écrite dans `config.json`.

| Variable | Effet | Défaut |
|---|---|---|
| `BOT_TOKEN` | Token du bot (onglet Bot du portail développeur) | — |
| `BOT_CLIENT_ID` | Application ID | — |
| `BOT_GUILD_ID` | ID du serveur cible | — |
| `BOT_PREFIX` | Préfixe des commandes classiques | `!` |
| `BOT_COULEUR` | Couleur du thème | `#1B2A4A` |
| `VIP_PAYPAL` | Lien PayPal de la boutique | — |
| `VIP_DUREE_JOURS` | Durée d'un accès VIP | `30` |
| `SEUIL_ROLES_MINUTE` | Anti-nuke — changements de rôles/minute | `8` |
| `SEUIL_BANS_MINUTE` | Anti-nuke — bans/minute | `4` |
| `SEUIL_JOINS_MINUTE` | Anti-raid — arrivées/minute | `12` |
| `SEUIL_COMPTES_JOURS` | Filtre de comptes récents | `7` |
| `DATA_DIR` | Dossier des données persistantes | `./data` |
| `BACKUP_DIR` | Dossier des sauvegardes | `./backups` |

> Le portail développeur doit avoir **SERVER MEMBERS INTENT** et **MESSAGE CONTENT INTENT** activés (onglet *Bot*), sinon les logs de messages et l'anti-nuke restent muets.

## 4. Volume persistant — l'étape à ne pas sauter

Sans volume, le conteneur repart de zéro à chaque déploiement : tickets, avertissements, VIP et sauvegardes sont perdus.

**Settings → Volumes → Add Volume** :

- **Mount path** : `/app/data`

Puis, pour les sauvegardes, soit un second volume sur `/app/backups`, soit tu laisses les sauvegardes sur le même volume (change `BACKUP_DIR` en `/app/data/backups`).

Ce que le volume conserve :

| Fichier | Contenu |
|---|---|
| `data/tickets.json` | Compteur de tickets |
| `data/warns.json` | Avertissements |
| `data/blacklist.json` | Membres blacklistés |
| `data/vip.json` | Accès VIP actifs et dates d'expiration |
| `data/staff.json` | Classement du staff |
| `data/bienvenue.json` | Configuration du message de bienvenue |
| `backups/*.json` | Sauvegardes rôles + salons |

## 5. Publier les commandes slash

`npm run deploy` n'a pas besoin de tourner en permanence : c'est une commande à lancer **une fois**, puis à relancer seulement si tu ajoutes une commande.

Trois façons de la lancer :

**a. En local** — le plus simple. Lance-la depuis ta machine, avec le même `.env` que Railway :

```bash
npm install
npm run deploy
```

**b. Dans la console Railway** — onglet du service → icône `>_` (shell) → puis :

```bash
npm run deploy
```

**c. Au démarrage du conteneur** — si tu veux que ce soit automatique, remplace la ligne `CMD` du `Dockerfile` par :

```dockerfile
CMD ["sh", "-c", "node deploy-commands.js && node index.js"]
```

Le déploiement s'exécute alors à chaque redémarrage. Sans inconvénient notable (quelques secondes), mais les commandes sont réécrites à l'identique à chaque fois.

## 6. Vérifier que ça tourne

Onglet **Deployments** → **View Logs**. Tu dois voir :

```
Kova — démarrage…
   Commandes : 25 slash · 33 classiques
   Données   : /app/data
   Modules   : setup, tickets, securite, moderation, vip, logs, vocal, backup
✅ Connecté en tant que Kova#0000
   1 serveur(s) · 25 commandes slash · 33 commandes classiques
   Modules actifs : setup, tickets, securite, moderation, vip, logs, vocal, backup
   🛡️ Module sécurité : anti-nuke, anti-raid, filtre comptes récents, anti-pub
   🎫 Module tickets : menu déroulant, transcripts HTML, claim, classement
   💾 Module backup : sauvegarde toutes les 12 h → /app/backups
   ⏳ Surveillance des expirations VIP : toutes les 5 minutes
```

Si tu vois `❌ Aucun token configuré`, la variable `BOT_TOKEN` n'est pas lue : vérifie l'onglet Variables et redéploie.

Puis sur Discord, tape `/setup tout` et laisse-le créer rôles, salons, panneaux et les 8 salons de logs.

## 7. Coût et ressources

Le bot consomme très peu : environ 80 à 150 Mo de RAM et un CPU quasi nul au repos. Le plan **Hobby** (5 $/mois de crédit offert) suffit largement, et le **Free Trial** permet de tester d'abord.

Si Railway met le service en veille : **Settings → Sleep → désactive**. Un bot Discord doit rester éveillé pour répondre aux événements.

## 8. Mettre à jour le bot

```bash
git add .
git commit -m "Mise à jour"
git push
```

Railway redéploie automatiquement. Le volume n'est pas touché : tes données restent en place.

---

## Dépannage Railway

| Symptôme | Cause | Solution |
|---|---|---|
| `Aucun token configuré` au démarrage | Variable manquante ou mal nommée | Variables → `BOT_TOKEN`, puis redéployer |
| Le bot se connecte puis se déconnecte en boucle | Plusieurs réplicas | `numReplicas: 1` dans `railway.json` |
| Les données disparaissent après un déploiement | Aucun volume monté | Monter un volume sur `/app/data` |
| Les commandes slash n'apparaissent pas | Non déployées | Lancer `npm run deploy`, attendre 1 à 2 min |
| `/setup tout` échoue | Bot sans permission Administrateur | Le réinviter avec `permissions=8` |
| Aucun log de message | Intent manquant | Activer `MESSAGE CONTENT INTENT` au portail |
| Le build échoue | `package.json` absent du dépôt | Vérifier qu'il est bien commité et non ignoré |
| Sauvegarde impossible | Volume en lecture seule, mauvais chemin | `BACKUP_DIR` doit pointer dans le volume (`/app/data/backups`) |

Tout est visible dans **View Logs** : chaque module annonce son état au démarrage, et les erreurs d'événement sont préfixées par leur nom (`[event:messageCreate]`, `[backup]`, `[securite:sanction]`).
