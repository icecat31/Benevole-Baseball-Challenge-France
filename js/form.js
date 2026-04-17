/**
 * form.js — Calendrier de disponibilités partagé
 * Utilisateurs marquent leur disponibilité simple: jour + mission + heure
 * Tous peuvent voir qui est disponible sur chaque créneau
 */

'use strict';

const CALENDAR_DATES = ['2026-05-06', '2026-05-07', '2026-05-08', '2026-05-09'];
const CALENDAR_START_HOUR = 7;
const CALENDAR_END_HOUR = 22;
const CALENDAR_START_MINUTE = CALENDAR_START_HOUR * 60;
const CALENDAR_END_MINUTE = CALENDAR_END_HOUR * 60;
const TIMELINE_PIXELS_PER_MINUTE = 0.8;

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
const plannerMission = document.getElementById('planner-mission');
const plannerDate = document.getElementById('planner-date');
const plannerStart = document.getElementById('planner-start');
const plannerEnd = document.getElementById('planner-end');
const plannerDescription = document.getElementById('planner-description');
const markAvailableBtn = document.getElementById('create-slot-btn');
const cancelEditBtn = document.getElementById('cancel-edit-btn');

const plannerCalendarGrid = document.getElementById('planner-calendar-grid');
const joinSlotsList = document.getElementById('join-slots-list');

// === State ===
let allRegistrations = [];


document.addEventListener('DOMContentLoaded', async () => {
  populateMissionSelect();
  setupAuthTabs();
  setupEvents();
  prefillFromUrl();
  await refreshSessionUi();
});

function setupEvents() {
  if (loginForm) loginForm.addEventListener('submit', handleLogin);
  if (registerForm) registerForm.addEventListener('submit', handleRegister);
  if (logoutUserBtn) logoutUserBtn.addEventListener('click', handleLogout);
  if (markAvailableBtn) markAvailableBtn.addEventListener('click', handleMarkAvailable);
  if (cancelEditBtn) cancelEditBtn.addEventListener('click', resetForm);
  if (plannerDate) {
    plannerDate.addEventListener('blur', () => {
      const parsed = parsePlannerDateInput(plannerDate.value);
      if (parsed) plannerDate.value = isoToFrenchDate(parsed);
    });
  }

  if (plannerCalendarGrid) {
    plannerCalendarGrid.addEventListener('click', handleCalendarClick);
  }
  if (joinSlotsList) {
    joinSlotsList.addEventListener('click', handleCalendarClick);
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

function prefillFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const date = params.get('date');
  const mission = params.get('mission');
  if (date && plannerDate) {
    const parsedDate = parsePlannerDateInput(date);
    if (parsedDate) {
      plannerDate.value = isoToFrenchDate(parsedDate);
    }
  }
  if (mission && plannerMission) plannerMission.value = mission;
}

function populateMissionSelect() {
  if (!plannerMission) return;

  plannerMission.innerHTML = '';
  const missions = DataService.getMissions();
  missions.forEach(mission => {
    const option = document.createElement('option');
    option.value = mission.id;
    option.textContent = `${mission.icon} ${mission.label}`;
    plannerMission.appendChild(option);
  });

  if (plannerDate) plannerDate.value = isoToFrenchDate(CALENDAR_DATES[0]);
  if (plannerStart) plannerStart.value = '09:00';
  if (plannerEnd) plannerEnd.value = '12:00';
}

// === Authentication ===

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

  const contact = document.getElementById('login-contact').value.trim();
  const password = document.getElementById('login-password').value.trim();

  const result = await DataService.loginVolunteerUser(contact, password);
  if (!result.success) {
    showAuthAlert(result.error, true);
    return;
  }

  showAuthAlert('Connexion réussie!', false);
  setTimeout(() => {
    clearAuthAlert();
    refreshSessionUi();
  }, 1000);
}

async function handleRegister(e) {
  e.preventDefault();

  const firstName = document.getElementById('register-firstName').value.trim();
  const lastName = document.getElementById('register-lastName').value.trim();
  const contact = document.getElementById('register-contact').value.trim();
  const password = document.getElementById('register-password').value.trim();

  const result = await DataService.registerVolunteerUser({
    firstName,
    lastName,
    contact,
    password,
  });

  if (!result.success) {
    showAuthAlert(result.error, true);
    return;
  }

  showAuthAlert('Compte créé! Vous êtes connecté.', false);
  setTimeout(() => {
    clearAuthAlert();
    refreshSessionUi();
  }, 1000);
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
    resetForm();
    await loadAndRenderCalendar();
  }
}

// === Disponibilité (Mark/Unmark) ===

async function handleMarkAvailable() {
  const mission = plannerMission.value.trim();
  const rawDate = plannerDate.value.trim();
  const date = parsePlannerDateInput(rawDate);
  const startTime = plannerStart.value.trim();
  const endTime = plannerEnd.value.trim();
  const comment = plannerDescription.value.trim();

  if (!mission || !rawDate || !startTime || !endTime) {
    showPlannerAlert('Veuillez remplir tous les champs.', true);
    return;
  }

  if (!date) {
    showPlannerAlert('Date invalide. Utilisez le format JJ/MM/AAAA.', true);
    return;
  }

  if (!CALENDAR_DATES.includes(date)) {
    showPlannerAlert('Date invalide. Choisissez une date du 06/05/2026 au 09/05/2026.', true);
    return;
  }

  if (endTime <= startTime) {
    showPlannerAlert('L\'heure de fin doit être après l\'heure de début.', true);
    return;
  }

  const result = await DataService.markAvailability({
    date,
    mission,
    startTime,
    endTime,
    comment,
  });

  if (!result.success) {
    showPlannerAlert(result.error, true);
    return;
  }

  showPlannerAlert('Disponibilité ajoutée!', false);
  resetForm();
  await loadAndRenderCalendar();
}

async function handleCalendarClick(e) {
  const unregBtn = e.target.closest('.unregister-btn');
  if (unregBtn) {
    const regId = unregBtn.dataset.regId;
    if (!regId) return;

    const result = await DataService.unmarkAvailability(regId);
    if (!result.success) {
      showPlannerAlert(result.error, true);
      return;
    }

    showPlannerAlert('Disponibilité supprimée.', false);
    await loadAndRenderCalendar();
  }
}

function resetForm() {
  if (plannerMission) plannerMission.value = plannerMission.options[0]?.value || '';
  if (plannerDate) plannerDate.value = isoToFrenchDate(CALENDAR_DATES[0]);
  if (plannerStart) plannerStart.value = '09:00';
  if (plannerEnd) plannerEnd.value = '12:00';
  if (plannerDescription) plannerDescription.value = '';
  if (plannerAlert) {
    plannerAlert.textContent = '';
    plannerAlert.classList.add('hidden');
  }
}

function showPlannerAlert(message, isError = true) {
  if (plannerAlert) {
    plannerAlert.textContent = message;
    plannerAlert.classList.toggle('hidden', false);
    plannerAlert.classList.toggle('error', isError);
  }
}

// === Rendering ===

async function loadAndRenderCalendar() {
  allRegistrations = await DataService.getRegistrations();
  renderCalendar();
  renderList();
}

function renderCalendar() {
  if (!plannerCalendarGrid) return;
  const currentUser = DataService.getCurrentVolunteerUser();
  const groupedByDate = groupRegistrationsByDate(allRegistrations, CALENDAR_DATES);
  const hourRows = CALENDAR_END_HOUR - CALENDAR_START_HOUR;
  const rowHeight = Math.round(60 * TIMELINE_PIXELS_PER_MINUTE);
  const trackHeight = Math.round((CALENDAR_END_MINUTE - CALENDAR_START_MINUTE) * TIMELINE_PIXELS_PER_MINUTE);

  let html = '<div class="outlook-board">';
  html += `<div class="outlook-time-col" style="grid-template-rows: repeat(${hourRows}, ${rowHeight}px);">`;

  for (let hour = CALENDAR_START_HOUR; hour < CALENDAR_END_HOUR; hour++) {
    const timeLabel = `${hour.toString().padStart(2, '0')}:00`;
    html += `<div class="outlook-time-label">${timeLabel}</div>`;
  }

  html += '</div>';
  html += `<div class="outlook-days" style="grid-template-columns: repeat(${CALENDAR_DATES.length}, minmax(180px, 1fr));">`;

  CALENDAR_DATES.forEach(date => {
    const dayName = new Date(date + 'T00:00:00').toLocaleDateString('fr-FR', { weekday: 'short' });
    const dayNum = new Date(date + 'T00:00:00').toLocaleDateString('fr-FR', { day: 'numeric' });
    const regsForDay = groupedByDate[date] || [];

    html += '<div class="outlook-day">';
    html += `<div class="outlook-day-head">${dayName} ${dayNum}</div>`;
    html += `<div class="outlook-track" style="height:${trackHeight}px;">`;
    html += `<div class="outlook-hour-lines" style="grid-template-rows: repeat(${hourRows}, 1fr);">`;
    for (let i = 0; i < hourRows; i++) {
      html += '<div class="outlook-hour-line"></div>';
    }
    html += '</div>';
    html += '<div class="outlook-events-layer">';

    regsForDay.forEach(reg => {
      const mission = DataService.getMissionById(reg.mission);
      const icon = mission ? mission.icon : '📌';
      const missionLabel = mission ? mission.label : 'Mission';
      const isCurrentUser = currentUser && currentUser.id === reg.userId;

      const startMinute = parseTimeToMinutes(reg.startTime);
      const endMinute = parseTimeToMinutes(reg.endTime);
      const clampedStart = Math.max(CALENDAR_START_MINUTE, startMinute);
      const clampedEnd = Math.min(CALENDAR_END_MINUTE, endMinute);

      if (clampedEnd <= clampedStart) return;

      const top = Math.round((clampedStart - CALENDAR_START_MINUTE) * TIMELINE_PIXELS_PER_MINUTE);
      const height = Math.max(18, Math.round((clampedEnd - clampedStart) * TIMELINE_PIXELS_PER_MINUTE));
      const title = escapeAttr(`${reg.firstName} ${reg.lastName} · ${reg.startTime}-${reg.endTime} · ${missionLabel}`);

      html += `
        <div class="outlook-event ${isCurrentUser ? 'current-user' : ''}" style="top:${top}px;height:${height}px;" title="${title}">
          <div class="outlook-event-title">${icon} ${escapeHtmlText(reg.firstName)} ${escapeHtmlText(reg.lastName)}${isCurrentUser ? ' (vous)' : ''}</div>
          <div class="outlook-event-meta">${reg.startTime} - ${reg.endTime}</div>
        </div>`;
    });

    html += '</div></div></div>';
  });

  html += '</div></div>';
  plannerCalendarGrid.innerHTML = html;
}

function groupRegistrationsByDate(registrations, datesToRender) {
  const dateSet = new Set(datesToRender);
  const grouped = {};

  datesToRender.forEach(date => {
    grouped[date] = [];
  });

  registrations.forEach(reg => {
    if (!dateSet.has(reg.date)) return;
    grouped[reg.date].push(reg);
  });

  datesToRender.forEach(date => {
    grouped[date].sort((a, b) => parseTimeToMinutes(a.startTime) - parseTimeToMinutes(b.startTime));
  });

  return grouped;
}

function parseTimeToMinutes(timeStr) {
  const [hours, minutes] = String(timeStr || '00:00').split(':');
  return (parseInt(hours, 10) * 60) + parseInt(minutes, 10);
}

function parsePlannerDateInput(value) {
  const normalized = String(value || '').trim();
  if (!normalized) return null;

  if (/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    return CALENDAR_DATES.includes(normalized) ? normalized : null;
  }

  const match = normalized.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!match) return null;

  const day = match[1].padStart(2, '0');
  const month = match[2].padStart(2, '0');
  const year = match[3];
  const isoDate = `${year}-${month}-${day}`;

  const date = new Date(`${isoDate}T00:00:00`);
  if (Number.isNaN(date.getTime())) return null;

  const isValidDate = date.getFullYear() === parseInt(year, 10)
    && (date.getMonth() + 1) === parseInt(month, 10)
    && date.getDate() === parseInt(day, 10);

  if (!isValidDate) return null;
  return CALENDAR_DATES.includes(isoDate) ? isoDate : null;
}

function isoToFrenchDate(isoDate) {
  const parts = String(isoDate || '').split('-');
  if (parts.length !== 3) return '';
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

function escapeHtmlText(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function escapeAttr(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function renderList() {
  if (!joinSlotsList) return;

  joinSlotsList.innerHTML = '';
  const currentUser = DataService.getCurrentVolunteerUser();

  // Group by date
  const grouped = {};
  CALENDAR_DATES.forEach(date => {
    grouped[date] = {};
    DataService.getMissions().forEach(mission => {
      grouped[date][mission.id] = [];
    });
  });

  allRegistrations.forEach(reg => {
    if (grouped[reg.date] && grouped[reg.date][reg.mission]) {
      grouped[reg.date][reg.mission].push(reg);
    }
  });

  // Render
  CALENDAR_DATES.forEach(date => {
    const dayLabel = new Date(date + 'T00:00:00').toLocaleDateString('fr-FR', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    });

    const daySection = document.createElement('div');
    daySection.className = 'list-day-section';
    daySection.innerHTML = `<h4>${dayLabel}</h4>`;

    let hasContent = false;

    DataService.getMissions().forEach(mission => {
      const regs = grouped[date][mission.id];
      if (regs.length === 0) return;

      hasContent = true;
      const missionSection = document.createElement('div');
      missionSection.className = 'mission-section';
      missionSection.innerHTML = `<div class="mission-header">${mission.icon} ${mission.label}</div>`;

      const volList = document.createElement('div');
      volList.className = 'volunteer-list-compact';

      regs.forEach(reg => {
        const isCurrentUser = currentUser && reg.userId === currentUser.id;
        const vol = document.createElement('div');
        vol.className = 'volunteer-line';
        const timeRange = `${reg.startTime} - ${reg.endTime}`;

        if (isCurrentUser) {
          vol.innerHTML = `
            <div style="flex:1">
              <strong>${reg.firstName} ${reg.lastName}</strong> (vous)<br>
              <span style="font-size:0.85rem;color:var(--color-text-muted)">${timeRange}</span>
              ${reg.comment ? `<br><span style="font-size:0.75rem;color:#666">${reg.comment}</span>` : ''}
            </div>
            <button class="unregister-btn" data-reg-id="${reg.id}">Retirer</button>
          `;
        } else {
          vol.innerHTML = `
            <div>
              <strong>${reg.firstName} ${reg.lastName}</strong><br>
              <span style="font-size:0.85rem;color:var(--color-text-muted)">${timeRange}</span>
              ${reg.comment ? `<br><span style="font-size:0.75rem;color:#666">${reg.comment}</span>` : ''}
            </div>
          `;
        }

        volList.appendChild(vol);
      });

      missionSection.appendChild(volList);
      daySection.appendChild(missionSection);
    });

    if (hasContent) {
      joinSlotsList.appendChild(daySection);
    }
  });

  if (joinSlotsList.innerHTML === '') {
    joinSlotsList.innerHTML = '<div class="empty-state" style="padding:1rem;text-align:center;color:var(--color-text-muted)">Aucune disponibilité enregistrée pour le moment.</div>';
  }
}


