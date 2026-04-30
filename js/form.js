'use strict';

const SLOT_DATES = ['2026-05-14', '2026-05-15', '2026-05-16', '2026-05-17'];

// === DOM Elements ===
const authPanel = document.getElementById('auth-panel');
const authAlert = document.getElementById('auth-alert');
const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');
const authTabs = document.querySelectorAll('.auth-tab');

const userSession = document.getElementById('user-session');
const sessionName = document.getElementById('session-name');
const logoutUserBtn = document.getElementById('logout-user-btn');

const plannerCard = document.getElementById('planner-card');
const plannerAlert = document.getElementById('planner-alert');
const slotFilterMission = document.getElementById('slot-filter-mission');
const slotFilterDate = document.getElementById('slot-filter-date');
const slotComment = document.getElementById('slot-comment');
const slotsGrid = document.getElementById('slots-grid');
const mySlotsList = document.getElementById('my-slots-list');

let allSlots = [];
let allRegistrations = [];
let pendingSlotId = null;

document.addEventListener('DOMContentLoaded', async () => {
  populateFilters();
  setupAuthTabs();
  setupEvents();
  prefillFromUrl();
  await refreshSessionUi();
});

function setupEvents() {
  if (loginForm) loginForm.addEventListener('submit', handleLogin);
  if (registerForm) registerForm.addEventListener('submit', handleRegister);
  if (logoutUserBtn) logoutUserBtn.addEventListener('click', handleLogout);

  if (slotFilterMission) slotFilterMission.addEventListener('change', renderSlotBoard);
  if (slotFilterDate) slotFilterDate.addEventListener('change', renderSlotBoard);

  if (slotsGrid) {
    slotsGrid.addEventListener('click', handleSlotAction);
  }

  if (mySlotsList) {
    mySlotsList.addEventListener('click', handleMySlotAction);
  }
}

function setupAuthTabs() {
  authTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      authTabs.forEach(t => {
        t.classList.remove('active');
        t.setAttribute('aria-selected', 'false');
      });
      tab.classList.add('active');
      tab.setAttribute('aria-selected', 'true');

      const target = tab.dataset.tab;
      const loginVisible = target === 'login';
      if (loginForm) loginForm.classList.toggle('hidden', !loginVisible);
      if (registerForm) registerForm.classList.toggle('hidden', loginVisible);
      clearAuthAlert();
    });
  });
}

function populateFilters() {
  if (slotFilterMission) {
    const missions = DataService.getMissions();
    slotFilterMission.innerHTML = '<option value="all">Toutes les missions</option>';
    missions.forEach(mission => {
      const option = document.createElement('option');
      option.value = mission.id;
      option.textContent = `${mission.icon} ${mission.label}`;
      slotFilterMission.appendChild(option);
    });
  }

  if (slotFilterDate) {
    slotFilterDate.innerHTML = '<option value="all">Toutes les dates</option>';
    SLOT_DATES.forEach(date => {
      const option = document.createElement('option');
      option.value = date;
      option.textContent = formatDate(date);
      slotFilterDate.appendChild(option);
    });
  }
}

function prefillFromUrl() {
  const params = new URLSearchParams(window.location.search);
  pendingSlotId = params.get('slot') || params.get('slotId') || '';

  const date = params.get('date');
  const mission = params.get('mission');
  if (slotFilterDate && date && SLOT_DATES.includes(date)) {
    slotFilterDate.value = date;
  }
  if (slotFilterMission && mission) {
    slotFilterMission.value = mission;
  }
}

function clearAuthAlert() {
  if (authAlert) {
    authAlert.textContent = '';
    authAlert.classList.add('hidden');
  }
}

function showAuthAlert(message, isError = true) {
  if (authAlert) {
    authAlert.textContent = message;
    authAlert.classList.toggle('hidden', false);
    authAlert.classList.toggle('error', isError);
  }
}

async function handleLogin(e) {
  e.preventDefault();

  const firstName = document.getElementById('login-firstName').value.trim();
  const lastName = document.getElementById('login-lastName').value.trim();

  const result = await DataService.loginVolunteerUser(firstName, lastName);
  if (!result.success) {
    showAuthAlert(result.error, true);
    return;
  }

  showAuthAlert('Connexion réussie!', false);
  setTimeout(async () => {
    clearAuthAlert();
    await refreshSessionUi();
  }, 700);
}

async function handleRegister(e) {
  e.preventDefault();

  const firstName = document.getElementById('register-firstName').value.trim();
  const lastName = document.getElementById('register-lastName').value.trim();
  const email = document.getElementById('register-email').value.trim();
  const phone = document.getElementById('register-phone').value.trim();

  const result = await DataService.registerVolunteerUser({
    firstName,
    lastName,
    email,
    phone,
  });

  if (!result.success) {
    showAuthAlert(result.error, true);
    return;
  }

  showAuthAlert('Compte créé! Vous êtes connecté.', false);
  setTimeout(async () => {
    clearAuthAlert();
    await refreshSessionUi();
  }, 700);
}

function handleLogout() {
  DataService.logoutVolunteerUser();
  refreshSessionUi();
}

async function refreshSessionUi() {
  const user = DataService.getCurrentVolunteerUser();
  const isLoggedIn = !!user;

  if (authPanel) authPanel.classList.toggle('hidden', isLoggedIn);
  if (userSession) userSession.classList.toggle('hidden', !isLoggedIn);
  if (plannerCard) plannerCard.classList.toggle('hidden', !isLoggedIn);

  if (isLoggedIn && sessionName) {
    sessionName.textContent = `${user.firstName} ${user.lastName}`;
  }

  if (isLoggedIn) {
    await loadAndRenderSlots();
  }
}

async function loadAndRenderSlots() {
  allSlots = await DataService.getSlots();
  allRegistrations = await DataService.getRegistrations();

  applyPendingSlotSelection();
  renderSlotBoard();
  renderMySlots();
}

function applyPendingSlotSelection() {
  if (!pendingSlotId) return;

  const targetSlot = allSlots.find(slot => slot.id === pendingSlotId);
  if (!targetSlot) return;

  if (slotFilterMission) slotFilterMission.value = targetSlot.mission;
  if (slotFilterDate) slotFilterDate.value = targetSlot.date;
}

function renderSlotBoard() {
  if (!slotsGrid) return;

  const currentUser = DataService.getCurrentVolunteerUser();
  const currentUserId = currentUser ? currentUser.id : null;
  const missionFilter = slotFilterMission ? slotFilterMission.value : 'all';
  const dateFilter = slotFilterDate ? slotFilterDate.value : 'all';

  const myTimeKeys = new Set(
    allRegistrations
      .filter(reg => currentUserId && reg.userId === currentUserId && reg.date && reg.startTime && reg.endTime)
      .map(reg => `${reg.date}|${reg.startTime}|${reg.endTime}`)
  );

  const filteredSlots = allSlots.filter(slot => {
    if (missionFilter !== 'all' && slot.mission !== missionFilter) return false;
    if (dateFilter !== 'all' && slot.date !== dateFilter) return false;
    return true;
  });

  if (filteredSlots.length === 0) {
    slotsGrid.innerHTML = `
      <div class="empty-state" style="padding:1rem 1.2rem;">
        <p>Aucun créneau ne correspond à ce filtre.</p>
      </div>`;
    return;
  }

  const cards = filteredSlots.map(slot => {
    const mission = DataService.getMissionById(slot.mission);
    const isMine = !!(currentUser && slot.isSelectedByCurrentUser);
    const slotTimeKey = `${slot.date}|${slot.startTime}|${slot.endTime}`;
    const hasTimeConflict = myTimeKeys.has(slotTimeKey) && !isMine;
    const canJoin = !slot.isFull && !isMine && !hasTimeConflict;
    const badge = slot.isFull ? 'Complet' : `${slot.remainingPlaces} place(s) restante(s)`;
    const slotRegistrations = allRegistrations.filter(reg => reg.slotId === slot.id);
    const volunteerNames = slotRegistrations.map(formatVolunteerShortName).filter(Boolean);

    return `
      <article class="card slot-card" data-slot-id="${escapeAttr(slot.id)}" style="margin-bottom:0.9rem;padding:1rem;">
        <div style="display:flex;justify-content:space-between;gap:1rem;align-items:flex-start;flex-wrap:wrap">
          <div>
            <div style="font-size:0.95rem;color:var(--color-text-muted);margin-bottom:0.25rem">${escapeHtml(formatDate(slot.date))}</div>
            <h4 style="margin:0 0 0.35rem 0">${escapeHtml(mission ? `${mission.icon} ${mission.label}` : slot.mission)}</h4>
            <div style="font-weight:600">${escapeHtml(formatTime(slot.startTime))} - ${escapeHtml(formatTime(slot.endTime))}</div>
          </div>
          <span class="slot-badge ${slot.isFull ? 'full' : 'open'}">${escapeHtml(badge)}</span>
        </div>
        ${slot.description ? `<p style="margin:0.75rem 0 0;color:var(--color-text-muted)">${escapeHtml(slot.description)}</p>` : ''}
        ${volunteerNames.length ? `<p style="margin:0.65rem 0 0;font-size:0.86rem;color:var(--color-text-muted)"><strong>Inscrits:</strong> ${escapeHtml(volunteerNames.join(', '))}</p>` : ''}
        <div style="display:flex;gap:0.75rem;flex-wrap:wrap;align-items:center;margin-top:1rem">
          <button class="btn btn-primary btn-sm join-slot-btn" data-slot-id="${escapeAttr(slot.id)}" ${canJoin ? '' : 'disabled'}>
            ${slot.isFull ? 'Créneau complet' : hasTimeConflict ? 'Conflit horaire' : 'S\'ajouter'}
          </button>
          <span style="font-size:0.85rem;color:var(--color-text-muted)">${escapeHtml(String(slot.registeredCount || 0))} bénévole(s) inscrit(s)</span>
        </div>
      </article>
    `;
  }).join('');

  slotsGrid.innerHTML = cards;
}

function renderMySlots() {
  if (!mySlotsList) return;

  const currentUser = DataService.getCurrentVolunteerUser();
  if (!currentUser) {
    mySlotsList.innerHTML = '';
    return;
  }

  const myRegistrations = allRegistrations.filter(reg => reg.userId === currentUser.id);
  if (myRegistrations.length === 0) {
    mySlotsList.innerHTML = `
      <div class="empty-state" style="padding:1rem 1.2rem;">
        <p>Vous n'avez encore réservé aucun créneau.</p>
      </div>`;
    return;
  }

  mySlotsList.innerHTML = myRegistrations.map(reg => {
    const mission = DataService.getMissionById(reg.mission);
    const slotLabel = reg.slot ? `${formatDate(reg.date)} · ${formatTime(reg.startTime)} - ${formatTime(reg.endTime)}` : 'Créneau réservé';

    return `
      <div class="slot-item" style="display:flex;justify-content:space-between;gap:1rem;align-items:center;padding:0.9rem 1rem;border:1px solid var(--color-border);border-radius:14px;margin-bottom:0.75rem;background:white">
        <div>
          <div style="font-weight:600">${escapeHtml(mission ? `${mission.icon} ${mission.label}` : reg.mission)}</div>
          <div style="font-size:0.9rem;color:var(--color-text-muted)">${escapeHtml(slotLabel)}</div>
          ${reg.comment ? `<div style="font-size:0.85rem;color:var(--color-text-muted);margin-top:0.25rem">${escapeHtml(reg.comment)}</div>` : ''}
        </div>
        <button class="btn btn-sm unregister-btn" type="button" data-reg-id="${escapeAttr(reg.id)}">Retirer</button>
      </div>
    `;
  }).join('');
}

async function handleSlotAction(e) {
  const joinBtn = e.target.closest('.join-slot-btn');
  if (!joinBtn) return;

  const slotId = joinBtn.dataset.slotId;
  if (!slotId) return;

  const comment = slotComment ? slotComment.value.trim() : '';
  const result = await DataService.markAvailability({ slotId, comment });
  if (!result.success) {
    showPlannerAlert(result.error, true);
    return;
  }

  showPlannerAlert('Créneau réservé avec succès.', false);
  if (slotComment) slotComment.value = '';
  await loadAndRenderSlots();
}

async function handleMySlotAction(e) {
  const unregBtn = e.target.closest('.unregister-btn');
  if (!unregBtn) return;

  const regId = unregBtn.dataset.regId;
  if (!regId) return;

  const result = await DataService.unmarkAvailability(regId);
  if (!result.success) {
    showPlannerAlert(result.error, true);
    return;
  }

  showPlannerAlert('Créneau retiré.', false);
  await loadAndRenderSlots();
}

function showPlannerAlert(message, isError = true) {
  if (plannerAlert) {
    plannerAlert.textContent = message;
    plannerAlert.classList.toggle('hidden', false);
    plannerAlert.classList.toggle('error', isError);
  }
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function escapeAttr(value) {
  return escapeHtml(value);
}

function formatVolunteerShortName(registration) {
  const firstName = String(registration.firstName || '').trim();
  const lastName = String(registration.lastName || '').trim();
  if (!firstName) return '';
  if (!lastName) return firstName;

  return `${firstName} . ${lastName.charAt(0).toUpperCase()}`;
}
