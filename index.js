/**
 * Kova — point d'entrée
 * Charge les commandes, les événements, puis connecte le bot.
 * Compatible Railway / Docker : tout vient des variables d'environnement
 * si elles sont définies (voir core.js).
 */
const fs = require('fs');
const path = require('path');
const { client, config, DATA_DIR } = require('./core');

// --- Chargement des commandes slash -----------------------------------------
// Un fichier peut exporter une commande ou un tableau de commandes.
const dossierSlash = path.join(__dirname, 'commandes', 'slash');
if (fs.existsSync(dossierSlash)) {
  for (const f of fs.readdirSync(dossierSlash).filter((x) => x.endsWith('.js'))) {
    const contenu = require(path.join(dossierSlash, f));
    const liste = Array.isArray(contenu) ? contenu : [contenu];
    for (const cmd of liste) {
      if (cmd?.data?.name) client.commandes.set(cmd.data.name, cmd);
    }
  }
}

// --- Chargement des commandes classiques ------------------------------------
const dossierPrefixe = path.join(__dirname, 'commandes', 'prefixe');
if (fs.existsSync(dossierPrefixe)) {
  for (const f of fs.readdirSync(dossierPrefixe).filter((x) => x.endsWith('.js'))) {
    const contenu = require(path.join(dossierPrefixe, f));
    const liste = Array.isArray(contenu) ? contenu : [contenu];
    for (const cmd of liste) {
      if (cmd?.nom) client.commandesPrefixe.set(cmd.nom, cmd);
    }
  }
}

// --- Chargement des événements ----------------------------------------------
const dossierEvents = path.join(__dirname, 'evenements');
if (fs.existsSync(dossierEvents)) {
  for (const f of fs.readdirSync(dossierEvents).filter((x) => x.endsWith('.js'))) {
    const contenu = require(path.join(dossierEvents, f));
    const liste = Array.isArray(contenu) ? contenu : [contenu];
    for (const ev of liste) {
      if (!ev?.nom) continue;
      const executer = (...args) => ev.executer(...args, client);
      const enveloppe = (...args) => {
        try { executer(...args); } catch (e) { console.error(`[event:${ev.nom}]`, e); }
      };
      if (ev.once) client.once(ev.nom, enveloppe);
      else client.on(ev.nom, enveloppe);
    }
  }
}

// Filet de sécurité : aucune erreur ne doit tuer le process
process.on('unhandledRejection', (e) => console.error('[unhandledRejection]', e));
process.on('uncaughtException', (e) => console.error('[uncaughtException]', e));

// --- Diagnostic de démarrage -------------------------------------------------
console.log('Kova — démarrage…');
console.log(`   Commandes : ${client.commandes.size} slash · ${client.commandesPrefixe.size} classiques`);
console.log(`   Données   : ${DATA_DIR}`);
console.log(`   Modules   : ${Object.entries(config.modules).filter(([, v]) => v).map(([k]) => k).join(', ')}`);

if (!config.bot.token || String(config.bot.token).startsWith('TON_')) {
  console.error('\n❌ Aucun token configuré.');
  console.error('   Railway : onglet Variables → ajoute BOT_TOKEN (et BOT_CLIENT_ID, BOT_GUILD_ID).');
  console.error('   Local   : renseigne bot.token dans config.json, ou copie .env.example en .env.\n');
  process.exit(1);
}

client.login(config.bot.token).catch((e) => {
  console.error('\n❌ Connexion impossible. Vérifie le token.', e.message);
  process.exit(1);
});
