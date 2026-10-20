/**
 * Kova — noyau du bot
 * Charge la config, les modules activés, et expose des utilitaires partagés.
 *
 * Configuration : config.json sert de base (valeurs par défaut, tout est
 * documenté dedans), mais toute clé peut être surchargée par une variable
 * d'environnement — utile pour Railway, Docker, VPS avec secrets.
 *
 *   BOT_TOKEN            → bot.token
 *   BOT_CLIENT_ID        → bot.clientId
 *   BOT_GUILD_ID         → bot.guildId
 *   BOT_PREFIX           → bot.prefix
 *   BOT_COULEUR          → bot.couleur
 *   VIP_PAYPAL           → vip.paypal
 *   SEUIL_ROLES_MINUTE   → securite.nombreChangementsRoleParMinute
 *   SEUIL_BANS_MINUTE    → securite.nombreBansParMinute
 *   SEUIL_JOINS_MINUTE   → securite.nombreJoinsParMinute
 *   AVEUGLE_COMPTES_JOURS → securite.filtreComptesRecentsJours
 */
const fs = require('fs');
const path = require('path');
const { Client, GatewayIntentBits, Partials, Collection } = require('discord.js');

// --- Chargement de la configuration ------------------------------------------
function chargerConfig() {
  let base = {};
  try {
    base = JSON.parse(fs.readFileSync(path.join(__dirname, 'config.json'), 'utf8'));
  } catch (e) {
    console.warn('⚠️  config.json illisible, utilisation des valeurs par défaut :', e.message);
  }

  // Fusion superficielle avec des valeurs de secours minimales
  base.bot = Object.assign({ prefix: '!', couleur: '#1B2A4A', couleurSecondaire: '#0D1629' }, base.bot);
  base.modules = Object.assign({
    setup: true, tickets: true, securite: true, moderation: true,
    vip: true, logs: true, vocal: true, backup: true
  }, base.modules);
  base.roles = Object.assign({
    staff: 'Staff', moderateur: 'Modérateur', vip: 'VIP',
    membre: 'Membre', mute: 'Muted', nonVerifie: 'Non vérifié'
  }, base.roles);
  base.salons = Object.assign({
    reglement: 'reglement', annonces: 'annonces', boutique: 'boutique',
    tickets: 'tickets', ticketOuvert: 'ticket-{user}', categorieTickets: 'Tickets',
    logs: 'logs', vocalGeneral: 'Vocal général'
  }, base.salons);
  base.logs = Object.assign({
    messages: true, membres: true, moderation: true, roles: true,
    salons: true, vocal: true, securite: true, tickets: true
  }, base.logs);
  base.tickets = Object.assign({ transcriptHTML: true, claim: true, classementStaff: true, categories: [] }, base.tickets);
  base.securite = Object.assign({
    antiNuke: true, antiRaid: true, filtreComptesRecents: true, filtreComptesRecentsJours: 7,
    antiPub: true, listeMotsInterdits: ['http://', 'https://', 'discord.gg/'],
    sanctionAuto: true, sanctionParDefaut: 'timeout24h',
    nombreChangementsRoleParMinute: 8, nombreBansParMinute: 4,
    nombreCreationsSalonParMinute: 4, nombreJoinsParMinute: 12
  }, base.securite);
  base.moderation = Object.assign({ dureeMuteParDefautMinutes: 60, avertissementAvantBlacklist: 3, dmAuto: true }, base.moderation);
  base.vip = Object.assign({ actif: true, paypal: '', dureeJours: 30, salonsPrives: [], roleVisibilite: true }, base.vip);
  base.vocal = Object.assign({ vocalTemporaire24h: true, nomSalonTemporaire: '🔊 Vocal de {user}', hubs: ['➕ Créer un vocal'] }, base.vocal);
  base.backup = Object.assign({ intervalleHeures: 12, dossier: './backups', maxBackups: 20 }, base.backup);

  // --- Surcharges par variables d'environnement ---
  const env = process.env;
  const definir = (chemin, valeur) => {
    if (valeur === undefined || valeur === null || valeur === '') return;
    const parties = chemin.split('.');
    let curseur = base;
    for (let i = 0; i < parties.length - 1; i++) curseur = curseur[parties[i]] = curseur[parties[i]] || {};
    curseur[parties[parties.length - 1]] = valeur;
  };
  const nombre = (v) => (v === undefined || v === '' ? undefined : parseInt(v, 10));
  const booleen = (v) => (v === undefined || v === '' ? undefined : !['false', '0', 'non', 'no'].includes(String(v).toLowerCase()));

  definir('bot.token', env.BOT_TOKEN || env.DISCORD_TOKEN);
  definir('bot.clientId', env.BOT_CLIENT_ID || env.DISCORD_CLIENT_ID);
  definir('bot.guildId', env.BOT_GUILD_ID || env.DISCORD_GUILD_ID);
  definir('bot.prefix', env.BOT_PREFIX);
  definir('bot.couleur', env.BOT_COULEUR);
  definir('vip.paypal', env.VIP_PAYPAL);
  definir('vip.dureeJours', nombre(env.VIP_DUREE_JOURS));
  definir('securite.nombreChangementsRoleParMinute', nombre(env.SEUIL_ROLES_MINUTE));
  definir('securite.nombreBansParMinute', nombre(env.SEUIL_BANS_MINUTE));
  definir('securite.nombreJoinsParMinute', nombre(env.SEUIL_JOINS_MINUTE));
  definir('securite.nombreCreationsSalonParMinute', nombre(env.SEUIL_SALONS_MINUTE));
  definir('securite.filtreComptesRecentsJours', nombre(env.SEUIL_COMPTES_JOURS));
  definir('securite.antiPub', booleen(env.ANTI_PUB));
  definir('backup.intervalleHeures', nombre(env.BACKUP_HEURES));

  return base;
}

const config = chargerConfig();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildModeration,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildInvites,
    GatewayIntentBits.MessageContent
  ],
  partials: [Partials.Message, Partials.Channel, Partials.GuildMember, Partials.User]
});

// --- Conteneurs partagés -----------------------------------------------------
client.config = config;
client.commandes = new Collection();        // commandes slash
client.commandesPrefixe = new Collection(); // commandes classiques
client.cooldowns = new Collection();

// --- Données persistantes ----------------------------------------------------
// Sur Railway, le disque est éphémère : pour conserver les données entre deux
// déploiements, monte un volume et pointe DATA_DIR dessus.
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const fichier = (nom) => path.join(DATA_DIR, `${nom}.json`);

client.db = {
  lire(nom, defaut = {}) {
    try {
      return JSON.parse(fs.readFileSync(fichier(nom), 'utf8'));
    } catch {
      return defaut;
    }
  },
  ecrire(nom, valeur) {
    try {
      fs.mkdirSync(DATA_DIR, { recursive: true });
      fs.writeFileSync(fichier(nom), JSON.stringify(valeur, null, 2));
    } catch (e) {
      console.error('[db:ecrire]', e.message);
    }
    return valeur;
  }
};

// --- Utilitaires -------------------------------------------------------------
client.util = {
  couleur: parseInt(String(config.bot.couleur).replace('#', ''), 16),
  couleurSecondaire: parseInt(String(config.bot.couleurSecondaire).replace('#', ''), 16),

  embed(titre, description, options = {}) {
    const { EmbedBuilder } = require('discord.js');
    const e = new EmbedBuilder().setColor(client.util.couleur).setTimestamp();
    if (titre) e.setTitle(titre);
    if (description) e.setDescription(description);
    if (options.champs) e.addFields(options.champs);
    if (options.footer) e.setFooter({ text: options.footer });
    if (options.image) e.setImage(options.image);
    if (options.thumbnail) e.setThumbnail(options.thumbnail);
    return e;
  },

  salon(guild, nom) {
    return guild.channels.cache.find((c) => c.name === nom);
  },

  role(guild, cle) {
    const nom = client.config.roles[cle];
    return guild.roles.cache.find((r) => r.name === nom);
  },

  maintenant() {
    return `<t:${Math.floor(Date.now() / 1000)}:F>`;
  },

  duree(str) {
    if (!str || typeof str !== 'string') return null;
    const unites = { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000, j: 86_400_000, w: 604_800_000 };
    const m = str.trim().match(/^(\d+)\s*([smhdjw]?)$/i);
    if (!m) return null;
    const valeur = parseInt(m[1], 10);
    const multiplier = unites[(m[2] || 'm').toLowerCase()];
    if (!multiplier || !valeur) return null;
    return valeur * multiplier;
  },

  html(str = '') {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  },

  nomComplet(user) {
    return `${user.username}${user.discriminator && user.discriminator !== '0' ? '#' + user.discriminator : ''}`;
  }
};

module.exports = { client, config, DATA_DIR };
