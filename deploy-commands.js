/**
 * Déploie les commandes slash sur le serveur ciblé.
 * Lancer avec : npm run deploy
 *
 * Railway : ajoute un « Deploy Command » ou lance cette commande une fois
 * depuis la console du service (elle n'a pas besoin de tourner en permanence).
 */
const { REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');
const { config } = require('./core');

const token = config.bot.token;
const clientId = config.bot.clientId;
const guildId = config.bot.guildId;

if (!token || !clientId) {
  console.error('❌ Token ou clientId manquant.');
  console.error('   Renseigne BOT_TOKEN et BOT_CLIENT_ID (variables d\'environnement) ou config.json.');
  process.exit(1);
}
if (!guildId) {
  console.error('❌ guildId manquant.');
  console.error('   Renseigne BOT_GUILD_ID, ou laisse vide puis exécute cette commande une fois en local.');
  process.exit(1);
}

const commandes = [];
const dossier = path.join(__dirname, 'commandes', 'slash');

for (const f of fs.readdirSync(dossier).filter((x) => x.endsWith('.js'))) {
  const contenu = require(path.join(dossier, f));
  const liste = Array.isArray(contenu) ? contenu : [contenu];
  for (const cmd of liste) {
    if (cmd?.data) commandes.push(cmd.data.toJSON());
  }
}

const rest = new REST().setToken(token);

(async () => {
  try {
    console.log(`Déploiement de ${commandes.length} commandes slash…`);
    const data = await rest.put(
      Routes.applicationGuildCommands(clientId, guildId),
      { body: commandes }
    );
    console.log(`✅ ${data.length} commandes slash déployées sur le serveur.`);
  } catch (e) {
    console.error('❌ Échec du déploiement :', e);
    process.exit(1);
  }
})();
