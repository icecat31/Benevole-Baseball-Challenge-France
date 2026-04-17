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
  volunteerSessionUserKey: 'bcf2026_user_session_data',
  defaultAdminPassword: 'challenge2026',

  // [SUPABASE] Remplacer par vos vraies valeurs quand vous connecterez Supabase
  supabase: {
    url: (typeof window !== 'undefined' && window.SUPABASE_URL) ? window.SUPABASE_URL : '',
    anonKey: (typeof window !== 'undefined' && window.SUPABASE_ANON_KEY) ? window.SUPABASE_ANON_KEY : '',
  },
};

const ALLOWED_DATES = ['2026-05-06', '2026-05-07', '2026-05-08', '2026-05-09'];

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

/**
 * Enregistre les informations de session benevole.
 * @param {Object} user
 */
function saveVolunteerSessionUserToStorage(user) {
  localStorage.setItem(CONFIG.volunteerSessionUserKey, JSON.stringify(user));
}

/**
 * Charge les informations de session benevole.
 * @returns {Object|null}
 */
function loadVolunteerSessionUserFromStorage() {
  const raw = localStorage.getItem(CONFIG.volunteerSessionUserKey);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch (e) {
    console.error('Erreur lecture session utilisateur:', e);
    return null;
  }
}

/**
 * Supprime les informations de session benevole.
 */
function clearVolunteerSessionUserFromStorage() {
  localStorage.removeItem(CONFIG.volunteerSessionUserKey);
}

/* ================================================================
   HELPERS SUPABASE (REST)
   ================================================================ */

function isSupabaseEnabled() {
  return !!(CONFIG.supabase.url && CONFIG.supabase.anonKey);
}

function normalizeSupabaseUrl(url) {
  return String(url || '').replace(/\/+$/, '');
}

function buildSupabaseRestUrl(table, query) {
  const base = normalizeSupabaseUrl(CONFIG.supabase.url);
  const qs = query ? `?${query}` : '';
  return `${base}/rest/v1/${table}${qs}`;
}

async function supabaseRequest({ method = 'GET', table, query = '', body, prefer = 'return=representation' }) {
  const headers = {
    apikey: CONFIG.supabase.anonKey,
    Authorization: `Bearer ${CONFIG.supabase.anonKey}`,
  };

  if (method !== 'GET' && method !== 'DELETE') {
    headers['Content-Type'] = 'application/json';
  }
  if (prefer) {
    headers.Prefer = prefer;
  }

  const response = await fetch(buildSupabaseRestUrl(table, query), {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await response.text();
  const payload = text ? JSON.parse(text) : null;

  if (!response.ok) {
    const err = new Error(payload && payload.message ? payload.message : 'Erreur Supabase');
    err.details = payload;
    throw err;
  }

  return payload;
}

function mapRegistrationRow(row) {
  return {
    id: row.id,
    userId: row.user_id,
    firstName: row.first_name,
    lastName: row.last_name,
    date: row.date,
    mission: row.mission,
    startTime: row.start_time,
    endTime: row.end_time,
    contact: row.contact,
    comment: row.comment || '',
    submittedAt: row.submitted_at,
  };
}

function mapUserRow(row) {
  return {
    id: row.id,
    firstName: row.first_name,
    lastName: row.last_name,
    contact: row.contact,
    password: row.password,
    createdAt: row.created_at,
  };
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
  if (isSupabaseEnabled()) {
    try {
      const rows = await supabaseRequest({
        table: 'registrations',
        query: 'select=*&order=submitted_at.desc',
      });
      return Array.isArray(rows) ? rows.map(mapRegistrationRow) : [];
    } catch (err) {
      console.error('Erreur Supabase getRegistrations, fallback localStorage:', err);
    }
  }

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

  if (!ALLOWED_DATES.includes(date)) {
    return { success: false, error: 'Date invalide.' };
  }

  if (!MISSIONS.some(m => m.id === mission)) {
    return { success: false, error: 'Mission inconnue.' };
  }

  // Validation des horaires
  if (endTime <= startTime) {
    return { success: false, error: 'L\'heure de fin doit être après l\'heure de début.' };
  }

  if (isSupabaseEnabled()) {
    try {
      const duplicateCheckQuery = [
        'select=id',
        `user_id=eq.${encodeURIComponent(user.id)}`,
        `date=eq.${encodeURIComponent(date)}`,
        `mission=eq.${encodeURIComponent(mission)}`,
        `start_time=eq.${encodeURIComponent(startTime)}`,
        `end_time=eq.${encodeURIComponent(endTime)}`,
        'limit=1',
      ].join('&');

      const existing = await supabaseRequest({
        table: 'registrations',
        query: duplicateCheckQuery,
        prefer: '',
      });
      if (Array.isArray(existing) && existing.length > 0) {
        return { success: false, error: 'Vous êtes déjà marqué disponible pour ce créneau.' };
      }

      const rows = await supabaseRequest({
        method: 'POST',
        table: 'registrations',
        body: {
          user_id: user.id,
          first_name: user.firstName,
          last_name: user.lastName,
          contact: user.contact,
          date,
          mission,
          start_time: startTime,
          end_time: endTime,
          comment: String(input.comment || '').trim(),
        },
      });

      const created = Array.isArray(rows) && rows.length ? rows[0] : null;
      return { success: true, id: created ? created.id : undefined };
    } catch (err) {
      console.error('Erreur Supabase markAvailability, fallback localStorage:', err);
      if (err && err.message && /duplicate|unique|already/i.test(err.message)) {
        return { success: false, error: 'Vous êtes déjà marqué disponible pour ce créneau.' };
      }
    }
  }

  // Fallback localStorage
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

  if (isSupabaseEnabled()) {
    try {
      const query = [
        `id=eq.${encodeURIComponent(registrationId)}`,
        `user_id=eq.${encodeURIComponent(user.id)}`,
        'select=id',
      ].join('&');

      const deleted = await supabaseRequest({
        method: 'DELETE',
        table: 'registrations',
        query,
      });

      if (!Array.isArray(deleted) || deleted.length === 0) {
        return { success: false, error: 'Enregistrement introuvable.' };
      }
      return { success: true };
    } catch (err) {
      console.error('Erreur Supabase unmarkAvailability, fallback localStorage:', err);
    }
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

  /* ---- Auth benevole (MVP cote client) ---- */

  async registerVolunteerUser(payload) {
    const contact = String(payload.contact || '').trim().toLowerCase();
    const password = String(payload.password || '').trim();
    const firstName = String(payload.firstName || '').trim();
    const lastName = String(payload.lastName || '').trim();

    if (!firstName || !lastName || !contact || password.length < 6) {
      return { success: false, error: 'Informations de compte invalides.' };
    }

    if (isSupabaseEnabled()) {
      try {
        const existing = await supabaseRequest({
          table: 'volunteer_users',
          query: `select=id&contact=eq.${encodeURIComponent(contact)}&limit=1`,
          prefer: '',
        });
        if (Array.isArray(existing) && existing.length > 0) {
          return { success: false, error: 'Un compte existe deja avec ce contact.' };
        }

        const rows = await supabaseRequest({
          method: 'POST',
          table: 'volunteer_users',
          body: {
            first_name: firstName,
            last_name: lastName,
            contact,
            password,
          },
        });

        const created = Array.isArray(rows) && rows.length ? mapUserRow(rows[0]) : null;
        if (!created) {
          return { success: false, error: 'Impossible de creer le compte.' };
        }

        saveVolunteerSessionToStorage(created.id);
        saveVolunteerSessionUserToStorage(created);
        return { success: true, id: created.id };
      } catch (err) {
        console.error('Erreur Supabase registerVolunteerUser, fallback localStorage:', err);
      }
    }

    const users = loadVolunteerUsersFromStorage();
    const alreadyExists = users.some(u => u.contact.toLowerCase() === contact);
    if (alreadyExists) {
      return { success: false, error: 'Un compte existe deja avec ce contact.' };
    }

    const id = 'usr-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7);
    const created = {
      id,
      firstName,
      lastName,
      contact,
      password,
      createdAt: new Date().toISOString(),
    };
    users.push(created);
    saveVolunteerUsersToStorage(users);
    saveVolunteerSessionToStorage(id);
    saveVolunteerSessionUserToStorage(created);

    return { success: true, id };
  },

  async loginVolunteerUser(contact, password) {
    const normalizedContact = String(contact || '').trim().toLowerCase();
    const normalizedPassword = String(password || '');

    if (isSupabaseEnabled()) {
      try {
        const rows = await supabaseRequest({
          table: 'volunteer_users',
          query: [
            'select=*',
            `contact=eq.${encodeURIComponent(normalizedContact)}`,
            `password=eq.${encodeURIComponent(normalizedPassword)}`,
            'limit=1',
          ].join('&'),
          prefer: '',
        });

        const user = Array.isArray(rows) && rows.length ? mapUserRow(rows[0]) : null;
        if (!user) {
          return { success: false, error: 'Contact ou mot de passe incorrect.' };
        }

        saveVolunteerSessionToStorage(user.id);
        saveVolunteerSessionUserToStorage(user);
        return { success: true, user };
      } catch (err) {
        console.error('Erreur Supabase loginVolunteerUser, fallback localStorage:', err);
      }
    }

    const users = loadVolunteerUsersFromStorage();
    const user = users.find(u => u.contact.toLowerCase() === normalizedContact && u.password === normalizedPassword);

    if (!user) {
      return { success: false, error: 'Contact ou mot de passe incorrect.' };
    }

    saveVolunteerSessionToStorage(user.id);
    saveVolunteerSessionUserToStorage(user);
    return { success: true, user };
  },

  logoutVolunteerUser() {
    clearVolunteerSessionFromStorage();
    clearVolunteerSessionUserFromStorage();
  },

  getCurrentVolunteerUser() {
    const sessionUser = loadVolunteerSessionUserFromStorage();
    if (sessionUser && sessionUser.id) {
      return sessionUser;
    }

    const userId = loadVolunteerSessionFromStorage();
    if (!userId) return null;

    const users = loadVolunteerUsersFromStorage();
    const user = users.find(u => u.id === userId) || null;
    if (user) {
      saveVolunteerSessionUserToStorage(user);
    }
    return user;
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

  /**
   * Suppression admin d'une inscription par ID.
   * @param {string} registrationId
   * @returns {Promise<{success: boolean, error?: string}>}
   */
  async deleteRegistration(registrationId) {
    if (!registrationId) {
      return { success: false, error: 'ID manquant.' };
    }

    if (isSupabaseEnabled()) {
      try {
        const deleted = await supabaseRequest({
          method: 'DELETE',
          table: 'registrations',
          query: `id=eq.${encodeURIComponent(registrationId)}&select=id`,
        });

        if (!Array.isArray(deleted) || deleted.length === 0) {
          return { success: false, error: 'Enregistrement introuvable.' };
        }

        return { success: true };
      } catch (err) {
        console.error('Erreur Supabase deleteRegistration, fallback localStorage:', err);
      }
    }

    const registrations = loadRegistrationsFromStorage();
    const next = registrations.filter(r => r.id !== registrationId);
    if (next.length === registrations.length) {
      return { success: false, error: 'Enregistrement introuvable.' };
    }

    saveRegistrationsToStorage(next);
    return { success: true };
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
