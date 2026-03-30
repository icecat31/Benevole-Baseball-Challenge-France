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
   CRÉNEAUX (données de démonstration)
   ================================================================ */
const DEFAULT_SLOTS = [
  /* --- Vendredi 19 juin 2026 --- */
  {
    id: 'slot-1',
    date: '2026-06-19',
    startTime: '09:00',
    endTime: '12:00',
    mission: 'terrain',
    maxVolunteers: 6,
    status: 'open',
    description: 'Montage et marquage des terrains',
    registrations: [],
  },
  {
    id: 'slot-2',
    date: '2026-06-19',
    startTime: '12:00',
    endTime: '15:00',
    mission: 'accueil',
    maxVolunteers: 4,
    status: 'open',
    description: 'Accueil des équipes et enregistrement',
    registrations: [],
  },
  {
    id: 'slot-3',
    date: '2026-06-19',
    startTime: '11:00',
    endTime: '14:00',
    mission: 'sandwichs',
    maxVolunteers: 4,
    status: 'open',
    description: 'Préparation des repas du midi',
    registrations: [],
  },
  {
    id: 'slot-4',
    date: '2026-06-19',
    startTime: '14:00',
    endTime: '18:00',
    mission: 'buvette',
    maxVolunteers: 3,
    status: 'open',
    description: 'Tenue de la buvette du soir',
    registrations: [],
  },

  /* --- Samedi 20 juin 2026 --- */
  {
    id: 'slot-5',
    date: '2026-06-20',
    startTime: '08:00',
    endTime: '12:00',
    mission: 'accueil',
    maxVolunteers: 5,
    status: 'open',
    description: 'Accueil du public et distribution des programmes',
    registrations: [],
  },
  {
    id: 'slot-6',
    date: '2026-06-20',
    startTime: '08:00',
    endTime: '12:00',
    mission: 'buvette',
    maxVolunteers: 4,
    status: 'open',
    description: 'Buvette du matin',
    registrations: [],
  },
  {
    id: 'slot-7',
    date: '2026-06-20',
    startTime: '11:30',
    endTime: '14:00',
    mission: 'sandwichs',
    maxVolunteers: 5,
    status: 'open',
    description: 'Service des repas — pause midi',
    registrations: [],
  },
  {
    id: 'slot-8',
    date: '2026-06-20',
    startTime: '13:00',
    endTime: '17:00',
    mission: 'animation',
    maxVolunteers: 4,
    status: 'open',
    description: 'Animation stands enfants et initiation baseball',
    registrations: [],
  },
  {
    id: 'slot-9',
    date: '2026-06-20',
    startTime: '14:00',
    endTime: '20:00',
    mission: 'buvette',
    maxVolunteers: 4,
    status: 'open',
    description: 'Buvette de l\'après-midi',
    registrations: [],
  },
  {
    id: 'slot-10',
    date: '2026-06-20',
    startTime: '20:00',
    endTime: '23:00',
    mission: 'buvette',
    maxVolunteers: 3,
    status: 'open',
    description: 'Soirée conviviale inter-clubs',
    registrations: [],
  },

  /* --- Dimanche 21 juin 2026 --- */
  {
    id: 'slot-11',
    date: '2026-06-21',
    startTime: '08:00',
    endTime: '12:00',
    mission: 'accueil',
    maxVolunteers: 4,
    status: 'open',
    description: 'Accueil public — demi-finales et finale',
    registrations: [],
  },
  {
    id: 'slot-12',
    date: '2026-06-21',
    startTime: '08:00',
    endTime: '13:00',
    mission: 'buvette',
    maxVolunteers: 4,
    status: 'open',
    description: 'Buvette du matin — journée finale',
    registrations: [],
  },
  {
    id: 'slot-13',
    date: '2026-06-21',
    startTime: '12:00',
    endTime: '14:00',
    mission: 'sandwichs',
    maxVolunteers: 4,
    status: 'open',
    description: 'Repas de midi — journée finale',
    registrations: [],
  },
  {
    id: 'slot-14',
    date: '2026-06-21',
    startTime: '14:00',
    endTime: '18:00',
    mission: 'animation',
    maxVolunteers: 3,
    status: 'open',
    description: 'Animation et cérémonie de clôture',
    registrations: [],
  },
  {
    id: 'slot-15',
    date: '2026-06-21',
    startTime: '18:00',
    endTime: '20:00',
    mission: 'terrain',
    maxVolunteers: 6,
    status: 'open',
    description: 'Démontage et rangement du terrain',
    registrations: [],
  },
  {
    id: 'slot-16',
    date: '2026-06-19',
    startTime: '09:00',
    endTime: '18:00',
    mission: 'autres',
    maxVolunteers: 4,
    status: 'open',
    description: 'Logistique générale / aide polyvalente',
    registrations: [],
  },
];

/* ================================================================
   STORAGE HELPERS (localStorage)
   [SUPABASE] Ces fonctions seront remplacées par des appels Supabase
   ================================================================ */

/**
 * Charge les créneaux depuis localStorage.
 * Si aucune donnée, initialise avec DEFAULT_SLOTS.
 * @returns {Array}
 */
function loadSlotsFromStorage() {
  const raw = localStorage.getItem('bcf2026_slots');
  if (raw) {
    try {
      return JSON.parse(raw);
    } catch (e) {
      console.error('Erreur lecture créneaux:', e);
    }
  }
  // Initialiser avec les données de démo
  saveSlotsToStorage(DEFAULT_SLOTS);
  return JSON.parse(JSON.stringify(DEFAULT_SLOTS));
}

/**
 * Sauvegarde les créneaux dans localStorage.
 * @param {Array} slots
 */
function saveSlotsToStorage(slots) {
  localStorage.setItem('bcf2026_slots', JSON.stringify(slots));
}

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

/* ================================================================
   DATA SERVICE — Interface publique
   ================================================================ */
const DataService = {

  /* ---- Créneaux ---- */

  /**
   * Récupère tous les créneaux.
   * [SUPABASE] supabase.from('slots').select('*')
   * @returns {Promise<Array>}
   */
  async getSlots() {
    return loadSlotsFromStorage();
  },

  /**
   * Récupère un créneau par son identifiant.
   * [SUPABASE] supabase.from('slots').select('*').eq('id', id).single()
   * @param {string} id
   * @returns {Promise<Object|null>}
   */
  async getSlotById(id) {
    const slots = loadSlotsFromStorage();
    return slots.find(s => s.id === id) || null;
  },

  /**
   * Mise à jour du statut d'un créneau.
   * [SUPABASE] supabase.from('slots').update({ status }).eq('id', id)
   * @param {string} id
   * @param {string} status  'open' | 'full' | 'closed'
   * @returns {Promise<boolean>}
   */
  async updateSlotStatus(id, status) {
    const slots = loadSlotsFromStorage();
    const idx = slots.findIndex(s => s.id === id);
    if (idx === -1) return false;
    slots[idx].status = status;
    saveSlotsToStorage(slots);
    return true;
  },

  /* ---- Inscriptions ---- */

  /**
   * Récupère toutes les inscriptions.
   * [SUPABASE] supabase.from('registrations').select('*')
   * @returns {Promise<Array>}
   */
  async getRegistrations() {
    return loadRegistrationsFromStorage();
  },

  /**
   * Soumet une nouvelle inscription bénévole.
   * [SUPABASE] supabase.from('registrations').insert([registration])
   *
   * @param {Object} formData - Données du formulaire
   * @param {string} formData.firstName    - Prénom
   * @param {string} formData.lastName     - Nom
   * @param {string} formData.contact      - Email ou téléphone
   * @param {string} formData.mission      - Identifiant de mission
   * @param {string} formData.slotId       - Identifiant du créneau
   * @param {string} [formData.comment]    - Commentaire libre
   * @returns {Promise<{success: boolean, error?: string, id?: string}>}
   */
  async submitRegistration(formData) {
    const slots = loadSlotsFromStorage();
    const slot = slots.find(s => s.id === formData.slotId);

    if (!slot) {
      return { success: false, error: 'Créneau introuvable.' };
    }

    if (slot.status !== 'open') {
      return { success: false, error: 'Ce créneau n\'est plus disponible.' };
    }

    const currentCount = slot.registrations ? slot.registrations.length : 0;
    if (currentCount >= slot.maxVolunteers) {
      return { success: false, error: 'Ce créneau est complet.' };
    }

    // Vérifier si la personne n'est pas déjà inscrite sur ce créneau
    const registrations = loadRegistrationsFromStorage();
    const alreadyRegistered = registrations.some(
      r => r.slotId === formData.slotId &&
           r.contact.toLowerCase() === formData.contact.toLowerCase()
    );
    if (alreadyRegistered) {
      return { success: false, error: 'Vous êtes déjà inscrit(e) sur ce créneau avec ce contact.' };
    }

    const id = 'reg-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7);
    const registration = {
      id,
      firstName: formData.firstName.trim(),
      lastName: formData.lastName.trim(),
      contact: formData.contact.trim(),
      mission: formData.mission,
      slotId: formData.slotId,
      comment: (formData.comment || '').trim(),
      submittedAt: new Date().toISOString(),
    };

    registrations.push(registration);
    saveRegistrationsToStorage(registrations);

    // Mettre à jour la liste dans le créneau
    if (!slot.registrations) slot.registrations = [];
    slot.registrations.push(id);
    if (slot.registrations.length >= slot.maxVolunteers) {
      slot.status = 'full';
    }
    saveSlotsToStorage(slots);

    return { success: true, id };
  },

  /**
   * Supprime une inscription (admin).
   * [SUPABASE] supabase.from('registrations').delete().eq('id', id)
   * @param {string} id
   * @returns {Promise<boolean>}
   */
  async deleteRegistration(id) {
    const registrations = loadRegistrationsFromStorage();
    const idx = registrations.findIndex(r => r.id === id);
    if (idx === -1) return false;

    const reg = registrations[idx];
    registrations.splice(idx, 1);
    saveRegistrationsToStorage(registrations);

    // Mise à jour du créneau
    const slots = loadSlotsFromStorage();
    const slot = slots.find(s => s.id === reg.slotId);
    if (slot && slot.registrations) {
      slot.registrations = slot.registrations.filter(rid => rid !== id);
      if (slot.status === 'full' && slot.registrations.length < slot.maxVolunteers) {
        slot.status = 'open';
      }
      saveSlotsToStorage(slots);
    }

    return true;
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
