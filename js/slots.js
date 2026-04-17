/**
 * slots.js — Affichage des disponibilités sur la page d'accueil
 * Baseball Challenge France 2026
 *
 * Les bénévoles marquent leur disponibilité sur la page d'inscription.
 * Cette page affiche un résumé des disponibilités enregistrées.
 */

'use strict';

/* ---- DOM references ---- */
const slotsContainer   = document.getElementById('slots-container');
const filterMission    = document.getElementById('filter-mission');
const filterDate       = document.getElementById('filter-date');
const statTotal        = document.getElementById('stat-total-slots');
const statOpen         = document.getElementById('stat-open-slots');
const statVolunteers   = document.getElementById('stat-volunteers');

/* ---- State ---- */
let allRegistrations = [];

const CALENDAR_DATES = ['2026-05-06', '2026-05-07', '2026-05-08', '2026-05-09'];
const CALENDAR_START_HOUR = 7;
const CALENDAR_END_HOUR = 22;
const CALENDAR_START_MINUTE = CALENDAR_START_HOUR * 60;
const CALENDAR_END_MINUTE = CALENDAR_END_HOUR * 60;
const TIMELINE_PIXELS_PER_MINUTE = 0.8;

/* ================================================================
   Initialisation
   ================================================================ */
document.addEventListener('DOMContentLoaded', async () => {
  await loadAndRender();
  setupFilters();
  setupMissionChips();
});

async function loadAndRender() {
  try {
    // Charger les disponibilités au lieu des créneaux
    allRegistrations = await DataService.getRegistrations();
    updateStats();
    renderAvailabilities(allRegistrations);
    populateDateFilter();
  } catch (err) {
    console.error('Erreur chargement disponibilités:', err);
    if (slotsContainer) {
      slotsContainer.innerHTML = `
        <div class="alert alert-danger">
          <span class="alert-icon">⚠️</span>
          Impossible de charger les disponibilités. Veuillez rafraîchir la page.
        </div>`;
    }
  }
}

/* ================================================================
   Stats
   ================================================================ */
function updateStats() {
  if (!statTotal) return;

  const uniqueVolunteers = new Set(allRegistrations.map(r => r.userId)).size;
  
  statTotal.textContent   = allRegistrations.length;
  statOpen.textContent    = allRegistrations.length;
  statVolunteers.textContent = uniqueVolunteers;
}

/* ================================================================
   Rendering
   ================================================================ */
function renderAvailabilities(registrations) {
  if (!slotsContainer) return;
  const selectedDate = filterDate ? filterDate.value : 'all';
  const datesToRender = selectedDate !== 'all' ? [selectedDate] : CALENDAR_DATES;
  const groupedByDate = groupRegistrationsByDate(registrations, datesToRender);
  const hourRows = CALENDAR_END_HOUR - CALENDAR_START_HOUR;
  const trackHeight = Math.round((CALENDAR_END_MINUTE - CALENDAR_START_MINUTE) * TIMELINE_PIXELS_PER_MINUTE);

  let html = '';
  if (registrations.length === 0) {
    html += `
      <div class="empty-state" style="margin-bottom:1rem; padding:1rem 1.2rem;">
        <p>Aucune disponibilité enregistrée pour le moment.</p>
        <p style="font-size:0.9rem;color:var(--color-text-muted);margin-top:0.35rem">Le planning ci-dessous reste visible pour consulter tous les créneaux à la minute.</p>
      </div>`;
  }

  html += '<div class="outlook-board">';
  html += `<div class="outlook-time-col" style="grid-template-rows: repeat(${hourRows}, ${Math.round(60 * TIMELINE_PIXELS_PER_MINUTE)}px);">`;

  for (let hour = CALENDAR_START_HOUR; hour < CALENDAR_END_HOUR; hour++) {
    const timeLabel = `${hour.toString().padStart(2, '0')}:00`;
    html += `<div class="outlook-time-label">${timeLabel}</div>`;
  }

  html += '</div>';
  html += `<div class="outlook-days" style="grid-template-columns: repeat(${datesToRender.length}, minmax(180px, 1fr));">`;

  datesToRender.forEach(date => {
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

      const startMinute = parseTimeToMinutes(reg.startTime);
      const endMinute = parseTimeToMinutes(reg.endTime);
      const clampedStart = Math.max(CALENDAR_START_MINUTE, startMinute);
      const clampedEnd = Math.min(CALENDAR_END_MINUTE, endMinute);

      if (clampedEnd <= clampedStart) return;

      const top = Math.round((clampedStart - CALENDAR_START_MINUTE) * TIMELINE_PIXELS_PER_MINUTE);
      const height = Math.max(18, Math.round((clampedEnd - clampedStart) * TIMELINE_PIXELS_PER_MINUTE));
      const title = escapeAttr(`${reg.firstName} ${reg.lastName} · ${reg.startTime}-${reg.endTime} · ${missionLabel}`);

      html += `
        <div class="outlook-event" style="top:${top}px;height:${height}px;" title="${title}">
          <div class="outlook-event-title">${icon} ${escapeHtmlText(reg.firstName)} ${escapeHtmlText(reg.lastName)}</div>
          <div class="outlook-event-meta">${reg.startTime} - ${reg.endTime}</div>
        </div>`;
    });

    html += '</div></div></div>';
  });

  html += '</div></div>';
  slotsContainer.innerHTML = html;
}

/* ================================================================
   Filtres
   ================================================================ */
function setupFilters() {
  if (filterMission) {
    filterMission.addEventListener('change', applyFilters);
  }
  if (filterDate) {
    filterDate.addEventListener('change', applyFilters);
  }
}

function applyFilters() {
  const mission = filterMission ? filterMission.value : 'all';
  const date    = filterDate    ? filterDate.value    : 'all';

  let filtered = allRegistrations;

  if (mission !== 'all') {
    filtered = filtered.filter(r => r.mission === mission);
  }

  if (date !== 'all') {
    filtered = filtered.filter(r => r.date === date);
  }

  renderAvailabilities(filtered);
}

function populateDateFilter() {
  if (!filterDate) return;

  const existing = new Set(Array.from(filterDate.options).map(o => o.value));
  CALENDAR_DATES.forEach(d => {
    if (existing.has(d)) return;
    const opt = document.createElement('option');
    opt.value = d;
    opt.textContent = formatDate(d);
    filterDate.appendChild(opt);
  });
}

/* ================================================================
   Mission chips (page d'accueil)
   ================================================================ */
function setupMissionChips() {
  const chips = document.querySelectorAll('.mission-chip[data-mission]');
  chips.forEach(chip => {
    chip.addEventListener('click', () => {
      const missionId = chip.dataset.mission;

      chips.forEach(c => c.classList.remove('active'));

      if (filterMission) {
        if (filterMission.value === missionId) {
          filterMission.value = 'all';
          applyFilters();
        } else {
          chip.classList.add('active');
          filterMission.value = missionId;
          applyFilters();
          // Scroll to slots section
          const section = document.getElementById('creneaux');
          if (section) section.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }
    });
  });
}

/* ================================================================
   Utilitaires
   ================================================================ */
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
