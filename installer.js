/**
 * Assistant d'installation locale (Windows / macOS / Linux).
 * Écrit les identifiants dans un fichier .env — JAMAIS dans config.json,
 * pour qu'un `git push` ne diffuse pas ton token.
 *
 *   npm run installer
 */
const fs = require('fs');
const path = require('path');
const readline = require('readline');

const CHEMIN_ENV = path.join(__dirname, '.env');
const CHEMIN_CONFIG = path.join(__dirname, 'config.json');

const AIDE = `
╔══════════════════════════════════════════════════════════════════╗
║  Kova — installation guidée                                      ║
╚══════════════════════════════════════════════════════════════════╝

Prépare ces informations :

  1. TOKEN DU BOT
     discord.com/developers/applications → ton app → Bot → Reset Token
     Active aussi SERVER MEMBERS INTENT et MESSAGE CONTENT INTENT.

  2. APPLICATION ID
     Même page → General Information → Application ID

  3. ID DU SERVEUR
     Discord → clic droit sur ton serveur → Copier l'identifiant
     (active Paramètres → Avancés → Mode développeur)

Les valeurs seront écrites dans .env, qui est ignoré par Git.
`;

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const demander = (q) => new Promise((res) => rl.question(q, res));

(async () => {
  console.log(AIDE);

  const token = (await demander('1. Token du bot : ')).trim();
  const clientId = (await demander('2. Application ID : ')).trim();
  const guildId = (await demander('3. ID du serveur : ')).trim();
  const prefixe = (await demander('4. Préfixe des commandes classiques [!] : ')).trim() || '!';

  rl.close();

  if (!token || !clientId) {
    console.error('\n❌ Token et Application ID sont obligatoires. Relance : npm run installer');
    process.exit(1);
  }

  // Copie le modèle et injecte les valeurs
  let modele = '';
  try {
    modele = fs.readFileSync(path.join(__dirname, '.env.example'), 'utf8');
  } catch {
    modele = '';
  }

  const lignes = modele
    .split('\n')
    .filter((l) => l && !/^(BOT_TOKEN|BOT_CLIENT_ID|BOT_GUILD_ID|BOT_PREFIX)=/.test(l))
    .join('\n');

  const contenu = [
    '# Kova — généré par npm run installer',
    `BOT_TOKEN=${token}`,
    `BOT_CLIENT_ID=${clientId}`,
    `BOT_GUILD_ID=${guildId}`,
    `BOT_PREFIX=${prefixe}`,
    '',
    lignes.trim()
  ].join('\n');

  fs.writeFileSync(CHEMIN_ENV, contenu);
  console.log('\n✅ .env écrit (et ignoré par Git).\n');

  // Nettoie les identifiants restés dans config.json
  try {
    const config = JSON.parse(fs.readFileSync(CHEMIN_CONFIG, 'utf8'));
    config.bot.token = '';
    config.bot.clientId = '';
    config.bot.guildId = '';
    config.bot.prefix = prefixe;
    fs.writeFileSync(CHEMIN_CONFIG, JSON.stringify(config, null, 2));
    console.log('✅ config.json nettoyé (aucun identifiant dedans).\n');
  } catch (e) {
    console.warn('⚠️  config.json non modifié :', e.message);
  }

  console.log('Étapes suivantes :');
  console.log('  node verifier.js      → contrôle du projet');
  console.log('  npm run deploy        → déploie les commandes slash');
  console.log('  npm start             → démarre le bot');
  console.log('  Sur Discord          → /setup tout\n');

  if (guildId) {
    console.log('Invitation du bot — ouvre cette URL :');
    console.log(`https://discord.com/api/oauth2/authorize?client_id=${clientId}&permissions=8&scope=bot%20applications.commands\n`);
  }
})();
