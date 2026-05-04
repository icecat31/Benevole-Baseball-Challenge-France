/**
 * data.js — Couche d'abstraction des données
 * Baseball Challenge France 2026 — Toulouse
 *
 * Stockage persistant via Supabase.
 * La session locale reste côté navigateur, mais toutes les données métiers
 * (comptes bénévoles, créneaux et inscriptions) passent par la base distante.
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
  adminPasswordKey: 'bcf2026_admin_pwd',
  volunteerSessionKey: 'bcf2026_user_session',
  volunteerSessionUserKey: 'bcf2026_user_session_data',
  defaultAdminPassword: 'challenge2026',

  // [SUPABASE] Remplacer par vos vraies valeurs quand vous connecterez Supabase
  supabase: {
    url: (typeof window !== 'undefined' && window.SUPABASE_URL) ? window.SUPABASE_URL : '',
    anonKey: (typeof window !== 'undefined' && window.SUPABASE_ANON_KEY) ? window.SUPABASE_ANON_KEY : '',
  },
};

const ALLOWED_DATES = ['2026-05-14', '2026-05-15', '2026-05-16', '2026-05-17'];

/* ================================================================
   MISSIONS
   ================================================================ */
const MISSIONS = [
  { id: 'restauration',   label: 'Restauration',          icon: '🍽️' },
  { id: 'caisse_tombola', label: 'Caisse/Tombola',        icon: '🎟️' },
  { id: 'terrain',        label: 'Terrain',               icon: '⚾' },
  { id: 'sono_video',     label: 'Sono/vidéo',            icon: '🎤' },
  { id: 'buvette_1',      label: 'Buvette 1 (Snack)',     icon: '🍺' },
  { id: 'buvette_2',      label: 'Buvette 2 (Boissons)',  icon: '🍺' },
];

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
    const parsed = JSON.parse(raw);
    if (!parsed || !parsed.id) return null;
    return {
      ...parsed,
      email: parsed.email || parsed.contact || '',
      phone: parsed.phone || '',
    };
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

function mapSlotRow(row) {
  return {
    id: row.id,
    date: row.date,
    mission: row.mission,
    startTime: row.start_time,
    endTime: row.end_time,
    maxVolunteers: Number(row.max_volunteers || 1),
    status: row.status || 'open',
    description: row.description || '',
  };
}

function mapUserRow(row) {
  return {
    id: row.id,
    firstName: row.first_name,
    lastName: row.last_name,
    email: row.email || row.contact || '',
    phone: row.phone || '',
    createdAt: row.created_at,
  };
}

function enrichSlotsWithRegistrations(slots, registrations, currentUserId = null) {
  const counts = {};
  const selectedSlotIds = new Set();

  registrations.forEach(reg => {
    if (!reg.slotId) return;
    counts[reg.slotId] = (counts[reg.slotId] || 0) + 1;
    if (currentUserId && reg.userId === currentUserId) {
      selectedSlotIds.add(reg.slotId);
    }
  });

  return slots.map(slot => {
    const registeredCount = counts[slot.id] || 0;
    const remainingPlaces = Math.max(0, slot.maxVolunteers - registeredCount);
    const isFull = remainingPlaces <= 0 || slot.status === 'full';

    return {
      ...slot,
      registeredCount,
      remainingPlaces,
      isFull,
      isSelectedByCurrentUser: selectedSlotIds.has(slot.id),
    };
  });
}

function enrichRegistrationsWithSlots(registrations, slots) {
  const slotMap = new Map(slots.map(slot => [slot.id, slot]));

  return registrations.map(registration => {
    const slot = slotMap.get(registration.slotId);
    if (!slot) {
      return {
        ...registration,
        slot: null,
      };
    }

    return {
      ...registration,
      date: slot.date,
      mission: slot.mission,
      startTime: slot.startTime,
      endTime: slot.endTime,
      slot,
    };
  });
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
      const [slotRows, regRows] = await Promise.all([
        supabaseRequest({
          table: 'slots',
          query: 'select=*&order=date.asc,start_time.asc',
        }),
        supabaseRequest({
          table: 'registrations',
          query: 'select=*&order=submitted_at.desc',
        }),
      ]);

      const slots = Array.isArray(slotRows) ? slotRows.map(mapSlotRow) : [];
      const registrations = Array.isArray(regRows) ? regRows.map(row => ({
        id: row.id,
        userId: row.user_id,
        firstName: row.first_name,
        lastName: row.last_name,
        email: row.email || row.contact || '',
        phone: row.phone || '',
        slotId: row.slot_id,
        comment: row.comment || '',
        submittedAt: row.submitted_at,
      })) : [];

      return enrichRegistrationsWithSlots(registrations, slots);
    } catch (err) {
      console.error('Erreur Supabase getRegistrations:', err);
      return [];
    }
  }

  return [];
},

/**
 * Marquer une disponibilité (nouvelle inscription).
 * Structure: {id, userId, date, mission, startTime, endTime, email, phone, comment, submittedAt}
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

  const slotId = String(input.slotId || input.slot_id || '').trim();
  const comment = String(input.comment || '').trim();

  if (!slotId) {
    return { success: false, error: 'Créneau manquant.' };
  }

  if (!isSupabaseEnabled()) {
    return { success: false, error: 'Connexion Supabase non configurée.' };
  }

  try {
    const slotRows = await supabaseRequest({
      table: 'slots',
      query: `select=*&id=eq.${encodeURIComponent(slotId)}&limit=1`,
      prefer: '',
    });
    const slot = Array.isArray(slotRows) && slotRows.length ? mapSlotRow(slotRows[0]) : null;
    if (!slot) {
      return { success: false, error: 'Créneau introuvable.' };
    }

    if (!ALLOWED_DATES.includes(slot.date)) {
      return { success: false, error: 'Créneau invalide.' };
    }

    if (!MISSIONS.some(m => m.id === slot.mission)) {
      return { success: false, error: 'Mission inconnue.' };
    }

    if (slot.status === 'closed') {
      return { success: false, error: 'Ce créneau est fermé.' };
    }

    const registrations = await supabaseRequest({
      table: 'registrations',
      query: [
        'select=id,user_id,slot_id',
        `slot_id=eq.${encodeURIComponent(slotId)}`,
        `user_id=eq.${encodeURIComponent(user.id)}`,
        'limit=1',
      ].join('&'),
      prefer: '',
    });
    if (Array.isArray(registrations) && registrations.length > 0) {
      return { success: false, error: 'Vous êtes déjà marqué disponible pour ce créneau.' };
    }

    // Empêche l'inscription sur plusieurs activités au même horaire/jour.
    const concurrentSlots = await supabaseRequest({
      table: 'slots',
      query: [
        'select=id',
        `date=eq.${encodeURIComponent(slot.date)}`,
        `start_time=eq.${encodeURIComponent(slot.startTime)}`,
        `end_time=eq.${encodeURIComponent(slot.endTime)}`,
      ].join('&'),
      prefer: '',
    });

    const concurrentSlotIds = Array.isArray(concurrentSlots)
      ? concurrentSlots.map(row => row.id).filter(Boolean)
      : [];

    if (concurrentSlotIds.length > 0) {
      const conflictRows = await supabaseRequest({
        table: 'registrations',
        query: [
          'select=id,slot_id',
          `user_id=eq.${encodeURIComponent(user.id)}`,
          `slot_id=in.(${concurrentSlotIds.map(id => encodeURIComponent(id)).join(',')})`,
          'limit=1',
        ].join('&'),
        prefer: '',
      });

      if (Array.isArray(conflictRows) && conflictRows.length > 0) {
        return { success: false, error: 'Vous êtes déjà inscrit sur une autre activité à ce même horaire.' };
      }
    }

    const slotRegistrations = await supabaseRequest({
      table: 'registrations',
      query: `select=id&slot_id=eq.${encodeURIComponent(slotId)}`,
      prefer: '',
    });
    if (Array.isArray(slotRegistrations) && slotRegistrations.length >= slot.maxVolunteers) {
      return { success: false, error: 'Ce créneau est complet.' };
    }

    const rows = await supabaseRequest({
      method: 'POST',
      table: 'registrations',
      body: {
        user_id: user.id,
        first_name: user.firstName,
        last_name: user.lastName,
        email: user.email || user.contact || '',
        phone: user.phone || '',
        slot_id: slotId,
        comment,
      },
    });

    const created = Array.isArray(rows) && rows.length ? rows[0] : null;
    return { success: true, id: created ? created.id : undefined };
  } catch (err) {
    console.error('Erreur Supabase markAvailability:', err);
    if (err && err.message && /duplicate|unique|already/i.test(err.message)) {
      return { success: false, error: 'Vous êtes déjà marqué disponible pour ce créneau.' };
    }
    return { success: false, error: 'Impossible d’enregistrer la disponibilité.' };
  }
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

  if (!isSupabaseEnabled()) {
    return { success: false, error: 'Connexion Supabase non configurée.' };
  }

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
    console.error('Erreur Supabase unmarkAvailability:', err);
    return { success: false, error: 'Impossible de supprimer cette disponibilité.' };
  }
},

  /**
   * Met à jour les informations du compte bénévole connecté.
   * @param {Object} payload
   * @returns {Promise<{success: boolean, error?: string, user?: Object}>}
   */
  async updateVolunteerUser(payload) {
    const currentUser = this.getCurrentVolunteerUser();
    if (!currentUser) {
      return { success: false, error: 'Connexion requise.' };
    }

    if (!isSupabaseEnabled()) {
      return { success: false, error: 'Connexion Supabase non configurée.' };
    }

    const firstName = String(currentUser.firstName || payload.firstName || '').trim();
    const lastName = String(currentUser.lastName || payload.lastName || '').trim();
    const email = String(payload.email || '').trim().toLowerCase();
    const phone = String(payload.phone || '').trim();

    if (!firstName || !lastName || !email || !phone) {
      return { success: false, error: 'Informations de compte invalides.' };
    }

    try {
      // Vérifier les conflits d'email et phone
      const emailConflict = await supabaseRequest({
        table: 'volunteer_users',
        query: `select=id&email=eq.${encodeURIComponent(email)}&id=neq.${encodeURIComponent(currentUser.id)}&limit=1`,
        prefer: '',
      });
      if (Array.isArray(emailConflict) && emailConflict.length > 0) {
        return { success: false, error: 'Un autre compte utilise déjà cet email.' };
      }

      const phoneConflict = await supabaseRequest({
        table: 'volunteer_users',
        query: `select=id&phone=eq.${encodeURIComponent(phone)}&id=neq.${encodeURIComponent(currentUser.id)}&limit=1`,
        prefer: '',
      });
      if (Array.isArray(phoneConflict) && phoneConflict.length > 0) {
        return { success: false, error: 'Un autre compte utilise déjà ce numéro de téléphone.' };
      }

      // Appeler la RPC qui exécute les deux UPDATE SQL
      const response = await fetch(buildSupabaseRestUrl('rpc/update_volunteer_contact'), {
        method: 'POST',
        headers: {
          apikey: CONFIG.supabase.anonKey,
          Authorization: `Bearer ${CONFIG.supabase.anonKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          p_first_name: firstName,
          p_last_name: lastName,
          p_email: email,
          p_phone: phone,
        }),
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || 'Erreur lors de la mise à jour.');
      }

      // Refetcher l'utilisateur mis à jour
      const refreshedRows = await supabaseRequest({
        table: 'volunteer_users',
        query: `select=*&first_name=eq.${encodeURIComponent(firstName)}&last_name=eq.${encodeURIComponent(lastName)}&limit=1`,
        prefer: '',
      });

      const updatedUser = Array.isArray(refreshedRows) && refreshedRows.length
        ? mapUserRow(refreshedRows[0])
        : {
            id: currentUser.id,
            firstName,
            lastName,
            email,
            phone,
            createdAt: currentUser.createdAt || null,
          };

      saveVolunteerSessionToStorage(updatedUser.id);
      saveVolunteerSessionUserToStorage(updatedUser);
      return { success: true, user: updatedUser };
    } catch (err) {
      console.error('Erreur Supabase updateVolunteerUser:', err);
      const errorMessage = (err && err.message) ? String(err.message) : '';
      return { success: false, error: errorMessage || 'Impossible de mettre à jour le compte.' };
    }
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
    const firstName = String(payload.firstName || '').trim();
    const lastName = String(payload.lastName || '').trim();
    const email = String(payload.email || '').trim().toLowerCase();
    const phone = String(payload.phone || '').trim();

    if (!firstName || !lastName || !email || !phone) {
      return { success: false, error: 'Informations de compte invalides.' };
    }

    if (!isSupabaseEnabled()) {
      return { success: false, error: 'Connexion Supabase non configurée.' };
    }

    try {
      const existingByName = await supabaseRequest({
        table: 'volunteer_users',
        query: [
          'select=*',
          `first_name=ilike.${encodeURIComponent(firstName)}`,
          `last_name=ilike.${encodeURIComponent(lastName)}`,
          'limit=2',
        ].join('&'),
        prefer: '',
      });

      if (Array.isArray(existingByName) && existingByName.length > 1) {
        return { success: false, error: 'Plusieurs comptes portent ce nom. Contactez l’organisation.' };
      }

      const matchedUser = Array.isArray(existingByName) && existingByName.length ? mapUserRow(existingByName[0]) : null;
      if (matchedUser) {
        saveVolunteerSessionToStorage(matchedUser.id);
        saveVolunteerSessionUserToStorage(matchedUser);
        return { success: true, user: matchedUser, reusedExisting: true };
      }

      const existing = await supabaseRequest({
        table: 'volunteer_users',
        query: `select=id&email=eq.${encodeURIComponent(email)}&limit=1`,
        prefer: '',
      });
      if (Array.isArray(existing) && existing.length > 0) {
        return { success: false, error: 'Un compte existe deja avec cet email.' };
      }

      const existingPhone = await supabaseRequest({
        table: 'volunteer_users',
        query: `select=id&phone=eq.${encodeURIComponent(phone)}&limit=1`,
        prefer: '',
      });
      if (Array.isArray(existingPhone) && existingPhone.length > 0) {
        return { success: false, error: 'Un compte existe deja avec ce numéro de téléphone.' };
      }

      const rows = await supabaseRequest({
        method: 'POST',
        table: 'volunteer_users',
        body: {
          first_name: firstName,
          last_name: lastName,
          email,
          phone,
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
      console.error('Erreur Supabase registerVolunteerUser:', err);
      return { success: false, error: 'Impossible de creer le compte.' };
    }
  },

  async loginVolunteerUser(firstName, lastName) {
    const normalizedFirstName = String(firstName || '').trim();
    const normalizedLastName = String(lastName || '').trim();

    if (!isSupabaseEnabled()) {
      return { success: false, error: 'Connexion Supabase non configurée.' };
    }

    if (!normalizedFirstName || !normalizedLastName) {
      return { success: false, error: 'Prénom et nom requis.' };
    }

    try {
      const rows = await supabaseRequest({
        table: 'volunteer_users',
        query: [
          'select=*',
          `first_name=ilike.${encodeURIComponent(normalizedFirstName)}`,
          `last_name=ilike.${encodeURIComponent(normalizedLastName)}`,
          'limit=2',
        ].join('&'),
        prefer: '',
      });

      if (Array.isArray(rows) && rows.length > 1) {
        return { success: false, error: 'Plusieurs comptes portent ce nom. Contactez l’organisation.' };
      }

      const user = Array.isArray(rows) && rows.length ? mapUserRow(rows[0]) : null;
      if (!user) {
        return { success: false, error: 'Compte introuvable.' };
      }

      saveVolunteerSessionToStorage(user.id);
      saveVolunteerSessionUserToStorage(user);
      return { success: true, user };
    } catch (err) {
      console.error('Erreur Supabase loginVolunteerUser:', err);
      return { success: false, error: 'Compte introuvable.' };
    }
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

    return null;
  },

  hasMissingVolunteerContactInfo(user = this.getCurrentVolunteerUser()) {
    if (!user) {
      return false;
    }

    const email = String(user.email || '').trim();
    const phone = String(user.phone || '').trim();
    return !email || !phone;
  },

  maybeShowVolunteerContactReminder(user = this.getCurrentVolunteerUser()) {
    if (!user || !this.hasMissingVolunteerContactInfo(user) || typeof document === 'undefined') {
      return false;
    }

    const reminderKey = `bcf2026_contact_reminder_${user.id}`;
    if (sessionStorage.getItem(reminderKey) === 'shown') {
      return false;
    }

    if (document.getElementById('volunteer-contact-reminder-overlay')) {
      sessionStorage.setItem(reminderKey, 'shown');
      return true;
    }

    const missingParts = [];
    if (!String(user.email || '').trim()) {
      missingParts.push('votre adresse e-mail');
    }
    if (!String(user.phone || '').trim()) {
      missingParts.push('votre numéro de téléphone');
    }

    const overlay = document.createElement('div');
    overlay.className = 'contact-reminder-overlay';
    overlay.id = 'volunteer-contact-reminder-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.innerHTML = `
      <div class="contact-reminder" role="document">
        <button type="button" class="contact-reminder-close" aria-label="Fermer la pop-up">×</button>
        <div class="contact-reminder-badge">Profil incomplet</div>
        <h3>Complétez vos informations de compte</h3>
        <p>Il manque ${escapeHtml(missingParts.join(' et '))}. Rendez-vous sur la page compte pour les ajouter.</p>
        <div class="contact-reminder-actions">
          <a class="btn btn-primary" href="compte.html">Aller sur mon compte</a>
          <button type="button" class="btn btn-outline contact-reminder-later">Plus tard</button>
        </div>
      </div>
    `;

    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        closeReminder();
      }
    };

    const closeReminder = () => {
      overlay.remove();
      sessionStorage.setItem(reminderKey, 'shown');
      document.removeEventListener('keydown', handleEscape);
    };

    overlay.addEventListener('click', (event) => {
      if (event.target === overlay) {
        closeReminder();
      }
    });

    overlay.querySelector('.contact-reminder-close')?.addEventListener('click', closeReminder);
    overlay.querySelector('.contact-reminder-later')?.addEventListener('click', closeReminder);

    document.addEventListener('keydown', handleEscape);
    document.body.appendChild(overlay);
    sessionStorage.setItem(reminderKey, 'shown');
    return true;
  },

  /**
   * Liste les comptes bénévoles créés.
   * @returns {Promise<Array>}
   */
  async getVolunteerUsers() {
    if (!isSupabaseEnabled()) {
      return [];
    }

    try {
      const rows = await supabaseRequest({
        table: 'volunteer_users',
        query: 'select=*&order=created_at.desc',
      });

      return Array.isArray(rows) ? rows.map(mapUserRow) : [];
    } catch (err) {
      console.error('Erreur Supabase getVolunteerUsers:', err);
      return [];
    }
  },

  /**
   * Récupère un bénévole par son ID depuis la base.
   * @param {string} id
   * @returns {Promise<Object|null>}
   */
  async getVolunteerUserById(id) {
    if (!id) return null;
    if (!isSupabaseEnabled()) return null;

    try {
      const rows = await supabaseRequest({
        table: 'volunteer_users',
        query: `select=*&id=eq.${encodeURIComponent(id)}&limit=1`,
        prefer: '',
      });
      return Array.isArray(rows) && rows.length ? mapUserRow(rows[0]) : null;
    } catch (err) {
      console.error('Erreur Supabase getVolunteerUserById:', err);
      return null;
    }
  },

  /* ---- Slots (lecture seule pour affichage) ---- */

  /**
   * Retourne les disponibilités sous forme de "slots" pour affichage.
   * (Conversion pour compatibilité avec slots.js et admin.js)
   * @returns {Promise<Array>}
   */
  async getSlots() {
    if (!isSupabaseEnabled()) {
      return [];
    }

    try {
      const [slotRows, regRows] = await Promise.all([
        supabaseRequest({
          table: 'slots',
          query: 'select=*&order=date.asc,start_time.asc',
        }),
        supabaseRequest({
          table: 'registrations',
          query: 'select=slot_id,user_id',
        }),
      ]);

      const slots = Array.isArray(slotRows) ? slotRows.map(mapSlotRow) : [];
      const registrations = Array.isArray(regRows) ? regRows.map(row => ({
        slotId: row.slot_id,
        userId: row.user_id,
      })) : [];
      const currentUser = this.getCurrentVolunteerUser();

      return enrichSlotsWithRegistrations(slots, registrations, currentUser ? currentUser.id : null);
    } catch (err) {
      console.error('Erreur Supabase getSlots:', err);
      return [];
    }
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

    if (!isSupabaseEnabled()) {
      return { success: false, error: 'Connexion Supabase non configurée.' };
    }

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
      console.error('Erreur Supabase deleteRegistration:', err);
      return { success: false, error: 'Impossible de supprimer cet enregistrement.' };
    }
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
