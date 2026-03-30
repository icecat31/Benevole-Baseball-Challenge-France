/**
 * form.js — Formulaire d'inscription bénévole
 * Baseball Challenge France 2026
 */

'use strict';

/* ---- DOM references ---- */
const form          = document.getElementById('registration-form');
const submitBtn     = document.getElementById('submit-btn');
const alertSuccess  = document.getElementById('alert-success');
const alertError    = document.getElementById('alert-error');
const successScreen = document.getElementById('success-screen');
const formCard      = document.getElementById('form-card');
const selectMission = document.getElementById('mission');
const selectSlot    = document.getElementById('slot');

/* ================================================================
   Initialisation
   ================================================================ */
document.addEventListener('DOMContentLoaded', async () => {
  await populateMissions();
  await populateSlots();
  preselectFromUrl();
  setupValidation();

  if (form) {
    form.addEventListener('submit', handleSubmit);
  }
});

/* ================================================================
   Pré-remplissage depuis l'URL (?slot=slot-X)
   ================================================================ */
function preselectFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const slotId = params.get('slot');
  if (slotId && selectSlot) {
    selectSlot.value = slotId;
    // Si un créneau est présélectionné, pré-sélectionne aussi la mission
    syncMissionFromSlot();
  }
}

/* ================================================================
   Remplissage des selects
   ================================================================ */
async function populateMissions() {
  if (!selectMission) return;

  const missions = DataService.getMissions();
  missions.forEach(m => {
    const opt = document.createElement('option');
    opt.value = m.id;
    opt.textContent = `${m.icon} ${m.label}`;
    selectMission.appendChild(opt);
  });
}

async function populateSlots() {
  if (!selectSlot) return;

  try {
    const slots = await DataService.getSlots();
    const openSlots = slots.filter(s => s.status === 'open');

    // Grouper par date pour optgroups
    const byDate = openSlots.reduce((acc, slot) => {
      if (!acc[slot.date]) acc[slot.date] = [];
      acc[slot.date].push(slot);
      return acc;
    }, {});

    const dates = Object.keys(byDate).sort();

    if (dates.length === 0) {
      const opt = document.createElement('option');
      opt.value = '';
      opt.textContent = 'Aucun créneau disponible';
      opt.disabled = true;
      selectSlot.appendChild(opt);
      return;
    }

    dates.forEach(date => {
      const group = document.createElement('optgroup');
      group.label = formatDate(date);

      byDate[date].forEach(slot => {
        const mission = DataService.getMissionById(slot.mission);
        const label = mission ? mission.label : slot.mission;
        const remaining = slot.maxVolunteers - (slot.registrations ? slot.registrations.length : 0);

        const opt = document.createElement('option');
        opt.value = slot.id;
        opt.dataset.mission = slot.mission;
        opt.textContent = `${formatTime(slot.startTime)}–${formatTime(slot.endTime)} · ${label} (${remaining} place${remaining !== 1 ? 's' : ''})`;
        group.appendChild(opt);
      });

      selectSlot.appendChild(group);
    });

    // Synchroniser la mission quand le créneau change
    selectSlot.addEventListener('change', syncMissionFromSlot);

  } catch (err) {
    console.error('Erreur chargement créneaux:', err);
  }
}

/**
 * Synchronise le champ Mission avec le créneau sélectionné.
 */
function syncMissionFromSlot() {
  if (!selectSlot || !selectMission) return;
  const selected = selectSlot.options[selectSlot.selectedIndex];
  if (selected && selected.dataset.mission) {
    selectMission.value = selected.dataset.mission;
  }
}

/* ================================================================
   Validation
   ================================================================ */
const VALIDATORS = {
  firstName: {
    validate: v => v.trim().length >= 2,
    message: 'Le prénom doit contenir au moins 2 caractères.',
  },
  lastName: {
    validate: v => v.trim().length >= 2,
    message: 'Le nom doit contenir au moins 2 caractères.',
  },
  contact: {
    validate: v => {
      const email = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      const phone = /^(\+33|0)[0-9]{9}$/;
      const cleaned = v.replace(/[\s.\-]/g, '');
      return email.test(v.trim()) || phone.test(cleaned);
    },
    message: 'Entrez un email valide ou un téléphone français (ex : 06 12 34 56 78).',
  },
  mission: {
    validate: v => v !== '',
    message: 'Veuillez choisir une mission.',
  },
  slot: {
    validate: v => v !== '',
    message: 'Veuillez choisir un créneau.',
  },
};

function setupValidation() {
  if (!form) return;

  Object.keys(VALIDATORS).forEach(fieldName => {
    const input = form.elements[fieldName];
    if (!input) return;

    input.addEventListener('blur', () => validateField(fieldName));
    input.addEventListener('input', () => {
      if (input.classList.contains('error')) validateField(fieldName);
    });
  });
}

/**
 * Valide un champ et affiche/masque le message d'erreur.
 * @param {string} fieldName
 * @returns {boolean}
 */
function validateField(fieldName) {
  const validator = VALIDATORS[fieldName];
  if (!validator || !form) return true;

  const input = form.elements[fieldName];
  if (!input) return true;

  const errorEl = document.getElementById(`error-${fieldName}`);
  const isValid = validator.validate(input.value);

  input.classList.toggle('error', !isValid);
  if (errorEl) {
    errorEl.textContent = validator.message;
    errorEl.classList.toggle('visible', !isValid);
  }

  return isValid;
}

/**
 * Valide tout le formulaire.
 * @returns {boolean}
 */
function validateAll() {
  const results = Object.keys(VALIDATORS).map(f => validateField(f));
  return results.every(Boolean);
}

/* ================================================================
   Soumission
   ================================================================ */
async function handleSubmit(e) {
  e.preventDefault();
  hideMessages();

  if (!validateAll()) {
    // Scroll vers la première erreur
    const firstError = form.querySelector('.error');
    if (firstError) firstError.focus();
    return;
  }

  setLoading(true);

  const formData = {
    firstName : form.elements['firstName'].value,
    lastName  : form.elements['lastName'].value,
    contact   : form.elements['contact'].value,
    mission   : form.elements['mission'].value,
    slotId    : form.elements['slot'].value,
    comment   : form.elements['comment'] ? form.elements['comment'].value : '',
  };

  try {
    const result = await DataService.submitRegistration(formData);

    if (result.success) {
      showSuccess(formData);
    } else {
      showError(result.error || 'Une erreur est survenue. Veuillez réessayer.');
    }
  } catch (err) {
    console.error('Erreur inscription:', err);
    showError('Une erreur inattendue est survenue. Veuillez réessayer.');
  } finally {
    setLoading(false);
  }
}

/* ================================================================
   Feedback UI
   ================================================================ */
function showSuccess(formData) {
  if (formCard) formCard.style.display = 'none';
  if (successScreen) {
    const nameEl = successScreen.querySelector('.success-name');
    const missionEl = successScreen.querySelector('.success-mission');
    if (nameEl) nameEl.textContent = `${formData.firstName} ${formData.lastName}`;
    if (missionEl) {
      const m = DataService.getMissionById(formData.mission);
      missionEl.textContent = m ? `${m.icon} ${m.label}` : formData.mission;
    }
    successScreen.classList.add('visible');
    successScreen.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
}

function showError(message) {
  if (alertError) {
    const msgEl = alertError.querySelector('.alert-message');
    if (msgEl) msgEl.textContent = message;
    alertError.classList.remove('hidden');
    alertError.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
}

function hideMessages() {
  if (alertSuccess) alertSuccess.classList.add('hidden');
  if (alertError)   alertError.classList.add('hidden');
}

function setLoading(isLoading) {
  if (!submitBtn) return;
  submitBtn.disabled = isLoading;
  const spinner = submitBtn.querySelector('.spinner');
  const label   = submitBtn.querySelector('.btn-label');
  if (spinner) spinner.style.display = isLoading ? 'inline-block' : 'none';
  if (label)   label.textContent     = isLoading ? 'Envoi en cours…' : "Confirmer mon inscription";
}
