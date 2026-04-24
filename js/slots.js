'use strict';

/* ---- DOM references ---- */
const slotsContainer = document.getElementById('slots-container');
const filterMission = document.getElementById('filter-mission');
const filterDate = document.getElementById('filter-date');
const statTotal = document.getElementById('stat-total-slots');
const statOpen = document.getElementById('stat-open-slots');
const statVolunteers = document.getElementById('stat-volunteers');

/* ---- State ---- */
let allSlots = [];
let allRegistrations = [];

const SLOT_DATES = ['2026-05-14', '2026-05-15', '2026-05-16', '2026-05-17'];

document.addEventListener('DOMContentLoaded', async () => {
  setupFilters();
  setupMissionChips();
  await loadAndRender();
});

async function loadAndRender() {
  try {
    const [slots, registrations] = await Promise.all([
      DataService.getSlots(),
      DataService.getRegistrations(),
    ]);

    allSlots = Array.isArray(slots) ? slots : [];
    allRegistrations = Array.isArray(registrations) ? registrations : [];

    updateStats();
    renderSlots(allSlots);
    populateDateFilter();
  } catch (err) {
    console.error('Erreur chargement créneaux:', err);
    if (slotsContainer) {
      slotsContainer.innerHTML = `
        <div class="alert alert-danger">
          <span class="alert-icon">⚠️</span>
          Impossible de charger les créneaux. Veuillez rafraîchir la page.
        </div>`;
    }
  }
}

function updateStats() {
  if (!statTotal) return;

  const uniqueVolunteers = new Set(allRegistrations.map(reg => reg.userId)).size;
  const openSlots = allSlots.filter(slot => !slot.isFull).length;

  statTotal.textContent = String(allSlots.length);
  statOpen.textContent = String(openSlots);
  statVolunteers.textContent = String(uniqueVolunteers);
}

function renderSlots(slots) {
  if (!slotsContainer) return;

  const selectedMission = filterMission ? filterMission.value : 'all';
  const selectedDate = filterDate ? filterDate.value : 'all';
  const currentUser = DataService.getCurrentVolunteerUser();

  const filteredSlots = slots.filter(slot => {
    if (selectedMission !== 'all' && slot.mission !== selectedMission) return false;
    if (selectedDate !== 'all' && slot.date !== selectedDate) return false;
    return true;
  });

  if (filteredSlots.length === 0) {
    slotsContainer.innerHTML = `
      <div class="empty-state" style="padding:1rem 1.2rem;">
        <p>Aucun créneau ne correspond à votre filtre.</p>
      </div>`;
    return;
  }

  slotsContainer.innerHTML = filteredSlots.map(slot => {
    const mission = DataService.getMissionById(slot.mission);
    const badge = slot.isFull ? 'Complet' : `${slot.remainingPlaces} place(s) restante(s)`;
    const isMine = !!(currentUser && slot.isSelectedByCurrentUser);
    const actionLabel = slot.isFull ? 'Créneau complet' : 'S\'ajouter';
    const actionClass = slot.isFull ? 'btn btn-sm' : 'btn btn-primary btn-sm';
    const href = `benevole.html?slot=${encodeURIComponent(slot.id)}`;
    const slotRegistrations = allRegistrations.filter(reg => reg.slotId === slot.id);
    const volunteerNames = slotRegistrations.map(formatVolunteerShortName).filter(Boolean);

    return `
      <article class="card slot-card" style="margin-bottom:1rem;padding:1rem;">
        <div style="display:flex;justify-content:space-between;gap:1rem;align-items:flex-start;flex-wrap:wrap">
          <div>
            <div style="font-size:0.92rem;color:var(--color-text-muted);margin-bottom:0.25rem">${escapeHtml(formatDate(slot.date))}</div>
            <h3 style="margin:0 0 0.35rem 0;font-size:1.1rem">${escapeHtml(mission ? `${mission.icon} ${mission.label}` : slot.mission)}</h3>
            <div style="font-weight:600">${escapeHtml(formatTime(slot.startTime))} - ${escapeHtml(formatTime(slot.endTime))}</div>
          </div>
          <span class="slot-badge ${slot.isFull ? 'full' : 'open'}">${escapeHtml(badge)}</span>
        </div>
        ${slot.description ? `<p style="margin:0.75rem 0 0;color:var(--color-text-muted)">${escapeHtml(slot.description)}</p>` : ''}
        ${volunteerNames.length ? `<p style="margin:0.65rem 0 0;font-size:0.86rem;color:var(--color-text-muted)"><strong>Inscrits:</strong> ${escapeHtml(volunteerNames.join(', '))}</p>` : ''}
        <div style="display:flex;justify-content:space-between;gap:0.75rem;flex-wrap:wrap;align-items:center;margin-top:1rem">
          <span style="font-size:0.85rem;color:var(--color-text-muted)">${escapeHtml(String(slot.registeredCount || 0))} bénévole(s) inscrit(s)</span>
          ${slot.isFull ? `<button class="${actionClass}" type="button" disabled>${escapeHtml(actionLabel)}</button>` : `<a class="${actionClass}" href="${href}">${escapeHtml(actionLabel)}</a>`}
        </div>
      </article>
    `;
  }).join('');
}

function setupFilters() {
  populateMissionFilter();
  if (filterMission) filterMission.addEventListener('change', () => renderSlots(allSlots));
  if (filterDate) filterDate.addEventListener('change', () => renderSlots(allSlots));
}

function populateMissionFilter() {
  if (!filterMission) return;

  const currentValue = filterMission.value || 'all';
  filterMission.innerHTML = '<option value="all">Toutes les missions</option>';

  DataService.getMissions().forEach(mission => {
    const option = document.createElement('option');
    option.value = mission.id;
    option.textContent = `${mission.icon} ${mission.label}`;
    filterMission.appendChild(option);
  });

  filterMission.value = currentValue;
}

function populateDateFilter() {
  if (!filterDate) return;

  const existing = new Set(Array.from(filterDate.options).map(option => option.value));
  const dates = [...new Set(allSlots.map(slot => slot.date))].filter(Boolean);
  const source = dates.length > 0 ? dates : SLOT_DATES;

  source.forEach(date => {
    if (existing.has(date)) return;
    const option = document.createElement('option');
    option.value = date;
    option.textContent = formatDate(date);
    filterDate.appendChild(option);
  });
}

function setupMissionChips() {
  const chips = document.querySelectorAll('.mission-chip[data-mission]');
  chips.forEach(chip => {
    chip.addEventListener('click', () => {
      const missionId = chip.dataset.mission;

      chips.forEach(c => c.classList.remove('active'));

      if (!filterMission) return;

      if (filterMission.value === missionId) {
        filterMission.value = 'all';
      } else {
        chip.classList.add('active');
        filterMission.value = missionId;
        const section = document.getElementById('creneaux');
        if (section) section.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }

      renderSlots(allSlots);
    });
  });
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatVolunteerShortName(registration) {
  const firstName = String(registration.firstName || '').trim();
  const lastName = String(registration.lastName || '').trim();
  if (!firstName) return '';
  if (!lastName) return firstName;

  return `${firstName} . ${lastName.charAt(0).toUpperCase()}`;
}
