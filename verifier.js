/**
 * Kova — script de diagnostic.
 * Vérifie la configuration, les variables d'environnement, la présence des
 * fichiers et la syntaxe JS. Ne se connecte pas à Discord.
 *
 *   node verifier.js
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const racine = __dirname;
let erreurs = 0;
let avertissements = 0;

const ok = (m) => console.log(`  ✅ ${m}`);
const ko = (m) => { console.log(`  ❌ ${m}`); erreurs++; };
const att = (m) => { console.log(`  ⚠️  ${m}`); avertissements++; };

console.log('\n╔══════════════════════════════════════════════╗');
console.log('║  Kova — vérification du projet                ║');
console.log('╚══════════════════════════════════════════════╝\n');

// --- 1. Variables d'environnement ---
console.log('1. Variables d\'environnement');
const envToken = process.env.BOT_TOKEN || process.env.DISCORD_TOKEN;
const envClientId = process.env.BOT_CLIENT_ID;
const envGuildId = process.env.BOT_GUILD_ID;
if (envToken) ok('BOT_TOKEN défini côté environnement');
else att('BOT_TOKEN absent (config.json sera utilisé)');
if (envClientId) ok('BOT_CLIENT_ID défini côté environnement');
else att('BOT_CLIENT_ID absent');
if (envGuildId) ok('BOT_GUILD_ID défini côté environnement');
else att('BOT_GUILD_ID absent');
if (process.env.DATA_DIR) ok(`DATA_DIR = ${process.env.DATA_DIR}`);
if (process.env.BACKUP_DIR) ok(`BACKUP_DIR = ${process.env.BACKUP_DIR}`);

// --- 2. Configuration ---
console.log('\n2. Configuration (config.json)');
let config = null;
try {
  config = JSON.parse(fs.readFileSync(path.join(racine, 'config.json'), 'utf8'));
  ok('config.json est un JSON valide');
} catch (e) {
  ko(`config.json illisible : ${e.message}`);
}

if (config) {
  const token = envToken || config.bot?.token;
  const clientId = envClientId || config.bot?.clientId;
  const guildId = envGuildId || config.bot?.guildId;

  if (token && !String(token).startsWith('TON_')) ok('token disponible');
  else att('token non renseigné (ni env, ni config.json)');
  if (clientId && !String(clientId).startsWith('TON_')) ok('clientId disponible');
  else att('clientId non renseigné');
  if (guildId && !String(guildId).startsWith('TON_')) ok('guildId disponible');
  else att('guildId non renseigné');

  const modulesActifs = Object.entries(config.modules || {}).filter(([, v]) => v).map(([k]) => k);
  ok(`${modulesActifs.length} module(s) actif(s) : ${modulesActifs.join(', ') || 'aucun'}`);
  if (/^#[0-9A-Fa-f]{6}$/.test(config.bot?.couleur || '')) ok(`Thème : ${config.bot.couleur}`);
  else att('bot.couleur invalide (attendu #RRGGBB)');
}

// --- 3. Dépendances ---
console.log('\n3. Dépendances');
if (!fs.existsSync(path.join(racine, 'node_modules'))) att('node_modules absent — lance « npm install »');
else if (!fs.existsSync(path.join(racine, 'node_modules', 'discord.js'))) ko('discord.js n\'est pas installé');
else ok('discord.js installé');

// --- 4. Fichiers du projet ---
console.log('\n4. Fichiers du projet');
for (const f of ['index.js', 'core.js', 'deploy-commands.js', 'config.json', 'package.json', 'README.md', 'Dockerfile', 'railway.json']) {
  if (fs.existsSync(path.join(racine, f))) ok(f);
  else if (f === 'Dockerfile' || f === 'railway.json') att(`${f} absent (nécessaire pour Railway)`);
  else ko(`${f} manquant`);
}
for (const d of ['modules', 'evenements', 'commandes/slash', 'commandes/prefixe']) {
  const chemin = path.join(racine, d);
  if (!fs.existsSync(chemin)) { ko(`dossier ${d} manquant`); continue; }
  const n = fs.readdirSync(chemin).filter((x) => x.endsWith('.js')).length;
  if (n === 0) att(`dossier ${d} vide`);
  else ok(`${d} — ${n} fichier(s)`);
}

// --- 5. Syntaxe ---
console.log('\n5. Vérification de la syntaxe');
const fichiers = [];
const parcourir = (dossier) => {
  for (const f of fs.readdirSync(dossier)) {
    const chemin = path.join(dossier, f);
    if (fs.statSync(chemin).isDirectory()) {
      if (!['node_modules', 'data', 'backups', 'transcripts', '.git'].includes(f)) parcourir(chemin);
    } else if (f.endsWith('.js')) {
      fichiers.push(chemin);
    }
  }
};
parcourir(racine);

let valides = 0;
for (const f of fichiers) {
  try {
    new vm.Script(fs.readFileSync(f, 'utf8'), { filename: f });
    valides++;
  } catch (e) {
    ko(`syntaxe invalide dans ${path.relative(racine, f)} : ${e.message}`);
  }
}
if (valides === fichiers.length && fichiers.length) ok(`${valides} fichiers JavaScript valides`);

// --- 6. Écriture des dossiers ---
console.log('\n6. Écriture des dossiers de données');
for (const [nom, valeur] of [['DATA_DIR', process.env.DATA_DIR], ['BACKUP_DIR', process.env.BACKUP_DIR]]) {
  const dossier = valeur ? path.resolve(valeur) : path.join(racine, nom === 'DATA_DIR' ? 'data' : 'backups');
  try {
    fs.mkdirSync(dossier, { recursive: true });
    fs.writeFileSync(path.join(dossier, '.test'), 'ok');
    fs.unlinkSync(path.join(dossier, '.test'));
    ok(`${nom} accessible en écriture (${dossier})`);
  } catch (e) {
    ko(`${nom} non accessible en écriture (${dossier}) : ${e.message}`);
  }
}

// --- Résultat ---
console.log('\n╔══════════════════════════════════════════════╗');
if (erreurs === 0 && avertissements === 0) console.log('║  ✅ Tout est prêt. Lance : npm start           ║');
else if (erreurs === 0) console.log(`║  ⚠️  ${avertissements} avertissement(s) — voir ci-dessus    ║`);
else console.log(`║  ❌ ${erreurs} erreur(s), ${avertissements} avertissement(s)        ║`);
console.log('╚══════════════════════════════════════════════╝\n');

process.exit(erreurs > 0 ? 1 : 0);
