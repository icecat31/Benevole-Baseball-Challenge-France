/**
 * data.js — Couche d'abstraction des données
 * Baseball Challenge France 2026 — Toulouse
 *
 * Actuellement : stockage en localStorage (mode démo / MVP).
 * Pour connecter Supabase, remplacer les fonctions marquées
 * [SUPABASE] par des appels à l'API Supabase correspondante.
 *
 * Structure :
 *  - SLOTS    : créneaux disponibles
 *  - MISSIONS : liste des missions bénévoles
 *  - DataService : interface publique utilisée par les autres modules
 */

'use strict';

/* ================================================================
   CONFIGURATION
   ================================================================ */
const CONFIG = {
  storageKey: 'bcf2026_registrations',
  adminPasswordKey: 'bcf2026_admin_pwd',
  volunteerUsersKey: 'bcf2026_users',
  volunteerSessionKey: 'bcf2026_user_session',
  defaultAdminPassword: 'challenge2026',

  // [SUPABASE] Remplacer par vos vraies valeurs quand vous connecterez Supabase
  supabase: {
    url: '',
    anonKey: '',
  },
};

/* ================================================================
   MISSIONS
   ================================================================ */
const MISSIONS = [
  { id: 'buvette',      label: 'Buvette',               icon: '🍺' },
  { id: 'sandwichs',    label: 'Préparation sandwichs',  icon: '🥪' },
  { id: 'terrain',      label: 'Préparation terrain',    icon: '⚾' },
  { id: 'animation',    label: 'Activités / Animation',  icon: '🎉' },
  { id: 'accueil',      label: 'Accueil',                icon: '👋' },
  { id: 'autres',       label: 'Autres missions',        icon: '🔧' },
];

/* ================================================================
   STORAGE HELPERS (localStorage)
   [SUPABASE] Ces fonctions seront remplacées par des appels Supabase
   ================================================================ */

/**
 * Charge les inscriptions depuis localStorage.
 * @returns {Array}
 */
function loadRegistrationsFromStorage() {
  const raw = localStorage.getItem(CONFIG.storageKey);
  if (raw) {
    try {
      return JSON.parse(raw);
    } catch (e) {
      console.error('Erreur lecture inscriptions:', e);
    }
  }
  return [];
}

/**
 * Sauvegarde les inscriptions dans localStorage.
 * @param {Array} registrations
 */
function saveRegistrationsToStorage(registrations) {
  localStorage.setItem(CONFIG.storageKey, JSON.stringify(registrations));
}

/**
 * Charge les comptes benevoles depuis localStorage.
 * @returns {Array}
 */
function loadVolunteerUsersFromStorage() {
  const raw = localStorage.getItem(CONFIG.volunteerUsersKey);
  if (raw) {
    try {
      return JSON.parse(raw);
    } catch (e) {
      console.error('Erreur lecture utilisateurs:', e);
    }
  }
  return [];
}

/**
 * Sauvegarde les comptes benevoles.
 * @param {Array} users
 */
function saveVolunteerUsersToStorage(users) {
  localStorage.setItem(CONFIG.volunteerUsersKey, JSON.stringify(users));
}

/**
 * Lit la session benevole courante.
 * @returns {string|null}
 */
function loadVolunteerSessionFromStorage() {
  return localStorage.getItem(CONFIG.volunteerSessionKey);
}

/**
 * Enregistre l'identifiant de session benevole.
 * @param {string} userId
 */
function saveVolunteerSessionToStorage(userId) {
  localStorage.setItem(CONFIG.volunteerSessionKey, userId);
}

/**
 * Supprime la session benevole active.
 */
function clearVolunteerSessionFromStorage() {
  localStorage.removeItem(CONFIG.volunteerSessionKey);
}

/* ================================================================
   DATA SERVICE — Interface publique
   ================================================================ */
const DataService = {

  /* ---- Missions ---- */

/**
 * Récupère toutes les inscriptions.
 * [SUPABASE] supabase.from('registrations').select('*')
 * @returns {Promise<Array>}
 */
async getRegistrations() {
  return loadRegistrationsFromStorage();
},

/**
 * Marquer une disponibilité (nouvelle inscription).
 * Structure: {id, userId, date, mission, startTime, endTime, contact, comment, submittedAt}
 *
 * @param {Object} input
 * @param {string} input.date      - Date (YYYY-MM-DD)
 * @param {string} input.mission   - ID de mission
 * @param {string} input.startTime - Heure début (HH:MM)
 * @param {string} input.endTime   - Heure fin (HH:MM)
 * @param {string} [input.comment] - Commentaire libre
 * @returns {Promise<{success: boolean, error?: string, id?: string}>}
 */
async markAvailability(input) {
  const user = this.getCurrentVolunteerUser();
  if (!user) {
    return { success: false, error: 'Connexion requise.' };
  }

  const date = String(input.date || '').trim();
  const mission = String(input.mission || '').trim();
  const startTime = String(input.startTime || '').trim();
  const endTime = String(input.endTime || '').trim();

  if (!date || !mission || !startTime || !endTime) {
    return { success: false, error: 'Données incomplètes.' };
  }

  const allowedDates = ['2026-05-06', '2026-05-07', '2026-05-08', '2026-05-09'];
  if (!allowedDates.includes(date)) {
    return { success: false, error: 'Date invalide.' };
  }

  if (!MISSIONS.some(m => m.id === mission)) {
    return { success: false, error: 'Mission inconnue.' };
  }

  // Validation des horaires
  if (endTime <= startTime) {
    return { success: false, error: 'L\'heure de fin doit être après l\'heure de début.' };
  }

  // Vérifier pas de doublon (même date, mission, créneau horaire)
  const registrations = loadRegistrationsFromStorage();
  const alreadyExists = registrations.some(
    r => r.userId === user.id && r.date === date && r.mission === mission && 
         r.startTime === startTime && r.endTime === endTime
  );
  if (alreadyExists) {
    return { success: false, error: 'Vous êtes déjà marqué disponible pour ce créneau.' };
  }

  const id = 'reg-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7);
  registrations.push({
    id,
    userId: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    date,
    mission,
    startTime,
    endTime,
    contact: user.contact,
    comment: String(input.comment || '').trim(),
    submittedAt: new Date().toISOString(),
  });

  saveRegistrationsToStorage(registrations);
  return { success: true, id };
},

/**
 * Retire une disponibilité (supprime une inscription).
 * L'utilisateur peut seulement supprimer ses propres inscriptions.
 *
 * @param {string} registrationId
 * @returns {Promise<{success: boolean, error?: string}>}
 */
async unmarkAvailability(registrationId) {
  const user = this.getCurrentVolunteerUser();
  if (!user) {
    return { success: false, error: 'Connexion requise.' };
  }

  const registrations = loadRegistrationsFromStorage();
  const idx = registrations.findIndex(r => r.id === registrationId);
  if (idx === -1) {
    return { success: false, error: 'Enregistrement introuvable.' };
  }

  const reg = registrations[idx];
  if (reg.userId !== user.id) {
    return { success: false, error: 'Vous pouvez seulement supprimer vos propres entrées.' };
  }

  registrations.splice(idx, 1);
  saveRegistrationsToStorage(registrations);
  return { success: true };
},

  /* ---- Missions ---- */

  /**
   * Récupère la liste des missions.
   * @returns {Array}
   */
  getMissions() {
    return MISSIONS;
  },

  /**
   * Récupère une mission par son identifiant.
   * @param {string} id
   * @returns {Object|undefined}
   */
  getMissionById(id) {
    return MISSIONS.find(m => m.id === id);
  },

  /**
   * Récupère une mission par son identifiant.
   * @param {string} id
   * @returns {Object|undefined}
   */
  getMissionById(id) {
    return MISSIONS.find(m => m.id === id);
  },

  /* ---- Auth benevole (MVP cote client) ---- */

  registerVolunteerUser(payload) {
    const contact = String(payload.contact || '').trim().toLowerCase();
    const password = String(payload.password || '').trim();
    const firstName = String(payload.firstName || '').trim();
    const lastName = String(payload.lastName || '').trim();

    if (!firstName || !lastName || !contact || password.length < 6) {
      return { success: false, error: 'Informations de compte invalides.' };
    }

    const users = loadVolunteerUsersFromStorage();
    const alreadyExists = users.some(u => u.contact.toLowerCase() === contact);
    if (alreadyExists) {
      return { success: false, error: 'Un compte existe deja avec ce contact.' };
    }

    const id = 'usr-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7);
    users.push({
      id,
      firstName,
      lastName,
      contact,
      password,
      createdAt: new Date().toISOString(),
    });
    saveVolunteerUsersToStorage(users);
    saveVolunteerSessionToStorage(id);

    return { success: true, id };
  },

  loginVolunteerUser(contact, password) {
    const users = loadVolunteerUsersFromStorage();
    const normalizedContact = String(contact || '').trim().toLowerCase();
    const user = users.find(u => u.contact.toLowerCase() === normalizedContact && u.password === String(password || ''));

    if (!user) {
      return { success: false, error: 'Contact ou mot de passe incorrect.' };
    }

    saveVolunteerSessionToStorage(user.id);
    return { success: true, user };
  },

  logoutVolunteerUser() {
    clearVolunteerSessionFromStorage();
  },

  getCurrentVolunteerUser() {
    const userId = loadVolunteerSessionFromStorage();
    if (!userId) return null;
    const users = loadVolunteerUsersFromStorage();
    return users.find(u => u.id === userId) || null;
  },

  isVolunteerLoggedIn() {
    return !!this.getCurrentVolunteerUser();
  },

  /* ---- Slots (lecture seule pour affichage) ---- */

  /**
   * Retourne les disponibilités sous forme de "slots" pour affichage.
   * (Conversion pour compatibilité avec slots.js et admin.js)
   * @returns {Promise<Array>}
   */
  async getSlots() {
    // Les "slots" sont maintenant des disponibilités groupées par jour/mission
    // Génération dynamique pour la page d'accueil
    return [];
  },

  /* ---- Auth admin (simple, côté client uniquement) ---- */

  /**
   * Vérifie le mot de passe admin.
   * ATTENTION : méthode MVP uniquement, pas de sécurité réelle côté client.
   * Pour un vrai accès sécurisé, utiliser Supabase Auth.
   * @param {string} password
   * @returns {boolean}
   */
  checkAdminPassword(password) {
    return password === CONFIG.defaultAdminPassword;
  },

  /**
   * Vérifie si la session admin est active (localStorage).
   * @returns {boolean}
   */
  isAdminLoggedIn() {
    return localStorage.getItem(CONFIG.adminPasswordKey) === CONFIG.defaultAdminPassword;
  },

  /**
   * Enregistre la session admin.
   */
  loginAdmin(password) {
    if (this.checkAdminPassword(password)) {
      localStorage.setItem(CONFIG.adminPasswordKey, password);
      return true;
    }
    return false;
  },

  /**
   * Déconnecte l'admin.
   */
  logoutAdmin() {
    localStorage.removeItem(CONFIG.adminPasswordKey);
  },
};

/* ================================================================
   HELPERS UTILITAIRES (partagés entre modules)
   ================================================================ */

/**
 * Formate une date ISO en français lisible.
 * @param {string} dateStr  'YYYY-MM-DD'
 * @returns {string}  'Samedi 20 juin 2026'
 */
function formatDate(dateStr) {
  const date = new Date(dateStr + 'T12:00:00');
  return date.toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

/**
 * Formate une heure 'HH:MM' en 'HHhMM'.
 * @param {string} timeStr
 * @returns {string}
 */
function formatTime(timeStr) {
  return timeStr.replace(':', 'h');
}

/**
 * Échappe le HTML pour éviter les injections XSS.
 * @param {string} str
 * @returns {string}
 */
function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = String(str);
  return div.innerHTML;
}
