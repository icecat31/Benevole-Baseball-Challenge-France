/**
 * slots.js — Affichage des créneaux sur la page d'accueil
 * Baseball Challenge France 2026
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
let allSlots = [];

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
    allSlots = await DataService.getSlots();
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

/* ================================================================
   Stats
   ================================================================ */
function updateStats() {
  if (!statTotal) return;

  const openSlots = allSlots.filter(s => s.status === 'open');
  const totalVolunteers = allSlots.reduce(
    (sum, s) => sum + (s.registrations ? s.registrations.length : 0), 0
  );

  statTotal.textContent   = allSlots.length;
  statOpen.textContent    = openSlots.length;
  statVolunteers.textContent = totalVolunteers;
}

/* ================================================================
   Rendering
   ================================================================ */
function renderSlots(slots) {
  if (!slotsContainer) return;

  if (slots.length === 0) {
    slotsContainer.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">🔍</div>
        <p>Aucun créneau ne correspond à votre sélection.</p>
      </div>`;
    return;
  }

  // Grouper par date
  const byDate = groupSlotsByDate(slots);

  let html = '';
  Object.keys(byDate).sort().forEach(date => {
    html += `<h3 class="date-heading">${escapeHtml(formatDate(date))}</h3>`;
    html += '<div class="slots-grid">';
    byDate[date].forEach(slot => {
      html += renderSlotCard(slot);
    });
    html += '</div>';
  });

  slotsContainer.innerHTML = html;
}

/**
 * Génère le HTML d'une carte de créneau.
 * @param {Object} slot
 * @returns {string}
 */
function renderSlotCard(slot) {
  const mission = DataService.getMissionById(slot.mission);
  const icon    = mission ? mission.icon : '📌';
  const label   = mission ? mission.label : slot.mission;

  const registered  = slot.registrations ? slot.registrations.length : 0;
  const remaining   = slot.maxVolunteers - registered;
  const pct         = Math.min(100, Math.round((registered / slot.maxVolunteers) * 100));

  const statusLabel = slot.status === 'open'   ? 'Disponible'
                    : slot.status === 'full'   ? 'Complet'
                    : 'Fermé';

  const fillClass   = pct >= 100 ? 'full'
                    : pct >= 70  ? 'nearly-full'
                    : '';

  const ctaDisabled = slot.status !== 'open';
  const ctaUrl      = `benevole.html?slot=${encodeURIComponent(slot.id)}`;

  return `
    <div class="slot-card">
      <div class="slot-card-header">
        <span class="slot-mission">${escapeHtml(icon)} ${escapeHtml(label)}</span>
        <span class="slot-badge ${escapeHtml(slot.status)}">${escapeHtml(statusLabel)}</span>
      </div>
      <div class="slot-card-body">
        <div class="slot-info">
          <div class="slot-info-row">
            <span class="icon">🕒</span>
            <span>${escapeHtml(formatTime(slot.startTime))} – ${escapeHtml(formatTime(slot.endTime))}</span>
          </div>
          ${slot.description ? `
          <div class="slot-info-row">
            <span class="icon">📝</span>
            <span>${escapeHtml(slot.description)}</span>
          </div>` : ''}
          <div class="slot-info-row">
            <span class="icon">👥</span>
            <span>${remaining > 0 ? `${remaining} place${remaining > 1 ? 's' : ''} restante${remaining > 1 ? 's' : ''}` : 'Complet'}</span>
          </div>
        </div>
        <div class="slot-progress">
          <div class="slot-progress-label">
            <span>${registered} / ${slot.maxVolunteers} bénévoles</span>
            <span>${pct}%</span>
          </div>
          <div class="progress-bar">
            <div class="progress-fill ${fillClass}" style="width: ${pct}%"></div>
          </div>
        </div>
        ${ctaDisabled
          ? `<button class="btn btn-block" disabled style="opacity:0.5;cursor:not-allowed;background:#ddd;color:#888;border:none">Complet</button>`
          : `<a href="${ctaUrl}" class="btn btn-primary btn-block">Je m'inscris →</a>`
        }
      </div>
    </div>`;
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

  let filtered = allSlots;

  if (mission !== 'all') {
    filtered = filtered.filter(s => s.mission === mission);
  }

  if (date !== 'all') {
    filtered = filtered.filter(s => s.date === date);
  }

  renderSlots(filtered);
}

function populateDateFilter() {
  if (!filterDate) return;

  const dates = [...new Set(allSlots.map(s => s.date))].sort();
  dates.forEach(d => {
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
   Utilitaire : groupe les créneaux par date
   ================================================================ */
function groupSlotsByDate(slots) {
  return slots.reduce((acc, slot) => {
    if (!acc[slot.date]) acc[slot.date] = [];
    acc[slot.date].push(slot);
    return acc;
  }, {});
}
