'use strict';

/* ---- DOM references ---- */
const slotsContainer = document.getElementById('slots-container');
const filterMission = document.getElementById('filter-mission');
const filterDate = document.getElementById('filter-date');
const statTotal = document.getElementById('stat-total-slots');
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
    DataService.maybeShowVolunteerContactReminder();
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

  statTotal.textContent = String(allSlots.length);
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

  const missions = DataService.getMissions().filter(mission => selectedMission === 'all' || mission.id === selectedMission);
  const dates = [...new Set(filteredSlots.map(slot => slot.date))].sort();
  const registrationsBySlot = new Map();
  allRegistrations.forEach(registration => {
    if (!registration.slotId) return;
    if (!registrationsBySlot.has(registration.slotId)) registrationsBySlot.set(registration.slotId, []);
    registrationsBySlot.get(registration.slotId).push(registration);
  });

  const slotLookup = new Map();
  filteredSlots.forEach(slot => {
    if (!slotLookup.has(slot.date)) slotLookup.set(slot.date, new Map());
    const missionMap = slotLookup.get(slot.date);
    if (!missionMap.has(slot.mission)) missionMap.set(slot.mission, []);
    missionMap.get(slot.mission).push(slot);
  });

  const missionLegend = missions.map(mission => {
    const theme = getMissionTheme(mission.id);
    return `
      <div class="calendar-legend-item" style="--mission-accent:${theme.accent};--mission-soft:${theme.soft};--mission-text:${theme.text};">
        <span class="calendar-legend-swatch"></span>
        <span>${escapeHtml(`${mission.icon} ${mission.label}`)}</span>
    const SLOT_DATES = ['2026-05-14', '2026-05-15', '2026-05-16', '2026-05-17']; 
    const CALENDAR_DAYS = [
      { date: '2026-05-14', label: 'Jeudi 14', shortLabel: 'Jeu. 14' },
      { date: '2026-05-15', label: 'Vendredi 15', shortLabel: 'Ven. 15' },
      { date: '2026-05-16', label: 'Samedi 16', shortLabel: 'Sam. 16' },
      { date: '2026-05-17', label: 'Dimanche 17', shortLabel: 'Dim. 17' },
    ];
    `;
  }).join('');

  const headerCells = dates.map(date => `
    <div class="calendar-day-head">
      <span class="calendar-day-weekday">${escapeHtml(formatCalendarWeekday(date))}</span>
      <span class="calendar-day-date">${escapeHtml(formatDate(date))}</span>
    </div>
  `).join('');

  const rows = missions.map(mission => {
    const theme = getMissionTheme(mission.id);
    const cells = dates.map(date => {
      const daySlots = (slotLookup.get(date) && slotLookup.get(date).get(mission.id)) ? slotLookup.get(date).get(mission.id) : [];
      const sortedSlots = daySlots.slice().sort((a, b) => String(a.startTime).localeCompare(String(b.startTime)));

      if (!sortedSlots.length) {
        return `
          <div class="calendar-cell calendar-cell-empty">
            <span class="calendar-cell-empty-label">Aucun créneau</span>
          </div>
        `;
      }

      return `
        <div class="calendar-cell">
          ${sortedSlots.map(slot => renderCalendarSlotBand(slot, mission, theme, registrationsBySlot, currentUser)).join('')}
        </div>
      `;
    }).join('');

    return `
      <div class="calendar-row">
        <div class="calendar-row-label" style="--mission-accent:${theme.accent};--mission-soft:${theme.soft};--mission-text:${theme.text};">
          <span class="calendar-row-label-icon">${escapeHtml(mission.icon)}</span>
          <span class="calendar-row-label-text">${escapeHtml(mission.label)}</span>
        </div>
        ${cells}
      </div>
    `;
  }).join('');

  slotsContainer.innerHTML = `
    <div class="calendar-intro">
      <div>
        <h3 class="calendar-title">Planning visuel des ressources</h3>
        <p class="calendar-subtitle">Chaque colonne correspond à un jour. Chaque bande représente un créneau. Les bandes hachurées indiquent qu’aucun bénévole n’est placé.</p>
      </div>
      slotsContainer.innerHTML = renderPlanningCalendar(filteredSlots, currentUser);
  filterMission.innerHTML = '<option value="all">Toutes les missions</option>';

  DataService.getMissions().forEach(mission => {
    const option = document.createElement('option');
    option.value = mission.id;
    option.textContent = `${mission.icon} ${mission.label}`;
    filterMission.appendChild(option);
  });

  filterMission.value = currentValue;
}
    function renderPlanningCalendar(slots, currentUser) {
      const grouped = groupSlotsByMissionAndDate(slots);
      const visibleDays = CALENDAR_DAYS.filter(day => slots.some(slot => slot.date === day.date));
      const visibleMissions = DataService.getMissions().filter(mission =>
        slots.some(slot => slot.mission === mission.id)
      );

      const dayHeader = visibleDays.map(day => `
        <div class="calendar-day-header-cell">
          <div class="calendar-day-kicker">${escapeHtml(day.shortLabel)}</div>
          <div class="calendar-day-title">${escapeHtml(day.label)}</div>
          <div class="calendar-day-sub">${escapeHtml(formatDate(day.date))}</div>
        </div>
      `).join('');

      const rows = visibleMissions.map(mission => {
        const rowCells = visibleDays.map(day => {
          const daySlots = (grouped[mission.id] && grouped[mission.id][day.date]) ? grouped[mission.id][day.date] : [];

          if (!daySlots.length) {
            return `<div class="calendar-cell calendar-cell-empty"></div>`;
          }

          return `
            <div class="calendar-cell">
              ${daySlots.map(slot => renderCalendarBand(slot, mission, currentUser)).join('')}
            </div>
          `;
        }).join('');

        return `
          <div class="calendar-row">
            <div class="calendar-resource-cell">
              <div class="calendar-resource-label">${escapeHtml(mission.icon)} ${escapeHtml(mission.label)}</div>
              <div class="calendar-resource-meta">${escapeHtml(slots.filter(slot => slot.mission === mission.id).length)} créneau(x)</div>
            </div>
            ${rowCells}
          </div>
        `;
      }).join('');

      return `
        <div class="calendar-legend">
          <span class="calendar-legend-item"><span class="calendar-legend-swatch calendar-legend-filled"></span> Affecté</span>
          <span class="calendar-legend-item"><span class="calendar-legend-swatch calendar-legend-empty"></span> Aucun bénévole</span>
        </div>
        <div class="calendar-scroll">
          <div class="calendar-grid-wrap" style="grid-template-columns: 220px repeat(${visibleDays.length}, minmax(220px, 1fr));">
            <div class="calendar-corner">Ressources</div>
            ${dayHeader}
            ${rows}
          </div>
        </div>
      `;
    }

    function groupSlotsByMissionAndDate(slots) {
      return slots.reduce((acc, slot) => {
        if (!acc[slot.mission]) acc[slot.mission] = {};
        if (!acc[slot.mission][slot.date]) acc[slot.mission][slot.date] = [];
        acc[slot.mission][slot.date].push(slot);
        acc[slot.mission][slot.date].sort((a, b) => String(a.startTime).localeCompare(String(b.startTime)));
        return acc;
      }, {});
    }

    function renderCalendarBand(slot, mission, currentUser) {
      const slotRegistrations = allRegistrations.filter(reg => reg.slotId === slot.id);
      const volunteerNames = slotRegistrations.map(formatVolunteerShortName).filter(Boolean);
      const isMine = !!(currentUser && slot.isSelectedByCurrentUser);
      const bandClasses = [
        'calendar-band',
        `calendar-band-${mission.id}`,
        slot.registeredCount ? 'calendar-band-filled' : 'calendar-band-empty',
        slot.isFull ? 'calendar-band-full' : '',
        isMine ? 'calendar-band-mine' : '',
      ].filter(Boolean).join(' ');

      return `
        <a class="${bandClasses}" href="benevole.html?slot=${encodeURIComponent(slot.id)}" aria-label="${escapeAttr(mission.label)} ${escapeAttr(formatDate(slot.date))} ${escapeAttr(formatTime(slot.startTime))} - ${escapeAttr(formatTime(slot.endTime))}">
          <div class="calendar-band-top">
            <span class="calendar-band-time">${escapeHtml(formatTime(slot.startTime))} - ${escapeHtml(formatTime(slot.endTime))}</span>
            <span class="calendar-band-count">${escapeHtml(String(slot.registeredCount || 0))}/${escapeHtml(String(slot.maxVolunteers || 0))}</span>
          </div>
          <div class="calendar-band-title">${escapeHtml(mission.label)}</div>
          <div class="calendar-band-body">
            ${slot.registeredCount ? `<span class="calendar-band-names">${escapeHtml(volunteerNames.join(', '))}</span>` : '<span class="calendar-band-empty-label">Personne placé</span>'}
          </div>
        </a>
      `;
    }

    function escapeAttr(value) {
      return escapeHtml(value).replace(/`/g, '&#96;');
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

  return `${firstName} ${lastName.charAt(0).toUpperCase()}.`;
}

function getMissionTheme(missionId) {
  const themes = {
    restauration: { accent: '#d61f26', soft: 'rgba(214, 31, 38, 0.12)', text: '#8d1117' },
    caisse_tombola: { accent: '#c98a00', soft: 'rgba(201, 138, 0, 0.13)', text: '#7b5400' },
    terrain: { accent: '#17814f', soft: 'rgba(23, 129, 79, 0.13)', text: '#105537' },
    sono_video: { accent: '#2457d6', soft: 'rgba(36, 87, 214, 0.13)', text: '#17368b' },
    buvette_1: { accent: '#aa5c00', soft: 'rgba(170, 92, 0, 0.13)', text: '#7c4200' },
    buvette_2: { accent: '#0f8b8d', soft: 'rgba(15, 139, 141, 0.13)', text: '#0b6465' },
  };

  return themes[missionId] || { accent: '#111111', soft: 'rgba(17, 17, 17, 0.08)', text: '#111111' };
}

function renderCalendarSlotBand(slot, mission, theme, registrationsBySlot, currentUser) {
  const registrations = registrationsBySlot.get(slot.id) || [];
  const volunteerNames = registrations.map(formatVolunteerShortName).filter(Boolean);
  const isEmpty = Number(slot.registeredCount || 0) === 0;
  const isSelected = !!(currentUser && slot.isSelectedByCurrentUser);
  const href = `benevole.html?slot=${encodeURIComponent(slot.id)}`;
  const statusLabel = slot.isFull ? 'Complet' : `${slot.registeredCount || 0}/${slot.maxVolunteers}`;
  const titleNames = volunteerNames.length ? volunteerNames.join(', ') : 'Aucun bénévole placé';

  return `
    <a class="calendar-slot-band ${isEmpty ? 'is-empty' : ''} ${slot.isFull ? 'is-full' : ''} ${isSelected ? 'is-selected' : ''}" href="${href}" style="--mission-accent:${theme.accent};--mission-soft:${theme.soft};--mission-text:${theme.text};" title="${escapeHtml(`${mission.label} · ${formatTime(slot.startTime)}-${formatTime(slot.endTime)} · ${titleNames}`)}">
      <span class="calendar-slot-band-top">
        <span class="calendar-slot-time">${escapeHtml(`${formatTime(slot.startTime)} - ${formatTime(slot.endTime)}`)}</span>
        <span class="calendar-slot-capacity">${escapeHtml(statusLabel)}</span>
      </span>
      <span class="calendar-slot-band-title">${escapeHtml(slot.description || mission.label)}</span>
      <span class="calendar-slot-band-names">${escapeHtml(isEmpty ? 'Aucune personne placée' : volunteerNames.join(', ') || 'Place libre')}</span>
    </a>
  `;
}

function formatCalendarWeekday(date) {
  const parsed = new Date(`${date}T12:00:00`);
  return parsed.toLocaleDateString('fr-FR', { weekday: 'short' });
}
