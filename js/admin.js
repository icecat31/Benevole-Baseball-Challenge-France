/**
 * admin.js — Interface d'administration
 * Baseball Challenge France 2026
 *
 * Accès protégé par un simple mot de passe côté client.
 * ATTENTION : Pour un vrai site en production, utiliser Supabase Auth.
 */

'use strict';

/* ---- DOM references ---- */
const loginSection     = document.getElementById('admin-login');
const dashboardSection = document.getElementById('admin-dashboard');
const loginForm        = document.getElementById('login-form');
const loginError       = document.getElementById('login-error');
const logoutBtn        = document.getElementById('logout-btn');

/* ================================================================
   Initialisation
   ================================================================ */
document.addEventListener('DOMContentLoaded', () => {
  if (DataService.isAdminLoggedIn()) {
    showDashboard();
  } else {
    showLogin();
  }

  if (loginForm) {
    loginForm.addEventListener('submit', handleLogin);
  }

  if (logoutBtn) {
    logoutBtn.addEventListener('click', handleLogout);
  }
});

/* ================================================================
   Auth
   ================================================================ */
function handleLogin(e) {
  e.preventDefault();
  const pwd = loginForm.elements['password'].value;

  if (DataService.loginAdmin(pwd)) {
    if (loginError) loginError.classList.add('hidden');
    showDashboard();
  } else {
    if (loginError) loginError.classList.remove('hidden');
    loginForm.elements['password'].value = '';
    loginForm.elements['password'].focus();
  }
}

function handleLogout() {
  DataService.logoutAdmin();
  showLogin();
}

function showLogin() {
  if (loginSection)    loginSection.style.display    = 'flex';
  if (dashboardSection) dashboardSection.style.display = 'none';
}

function showDashboard() {
  if (loginSection)    loginSection.style.display    = 'none';
  if (dashboardSection) dashboardSection.style.display = 'block';
  loadDashboard();
}

/* ================================================================
   Dashboard
   ================================================================ */
async function loadDashboard() {
  try {
    const [slots, registrations, users] = await Promise.all([
      DataService.getSlots(),
      DataService.getRegistrations(),
      DataService.getVolunteerUsers(),
    ]);

    renderAdminStats(slots, registrations);
    renderRegistrationsTab(registrations);
    renderAvailabilityTab(slots, registrations);
    renderCalendarTab(slots, registrations);
    renderAccountsTab(users);
    setupTabs();
    setupExport(registrations);
    setupDeleteModal(registrations);
  } catch (err) {
    console.error('Erreur chargement admin:', err);
  }
}

/* ================================================================
   Stats admin
   ================================================================ */
function renderAdminStats(slots, registrations) {
  const totalReg = registrations.length;
  const totalSlots = slots.length;
  const openSlots = slots.filter(slot => !slot.isFull).length;
  const fullSlots = slots.filter(slot => slot.isFull).length;
  const totalPlaces = slots.reduce((sum, slot) => sum + Number(slot.maxVolunteers || 0), 0);

  setText('admin-stat-reg',    totalReg);
  setText('admin-stat-open',   openSlots);
  setText('admin-stat-full',   fullSlots);
  setText('admin-stat-places', totalPlaces);

  const label = document.getElementById('admin-stat-places-label');
  if (label) label.textContent = 'Places total';
}

/* ================================================================
   Onglet inscriptions / disponibilités
   ================================================================ */
function renderRegistrationsTab(registrations) {
  const tbody = document.getElementById('reg-tbody');
  if (!tbody) return;

  const filterMission = document.getElementById('admin-filter-mission');
  const filterDate    = document.getElementById('admin-filter-date');

  // Peupler les filtres
  if (filterMission) {
    filterMission.innerHTML = '<option value="all">Toutes les missions</option>';
    DataService.getMissions().forEach(m => {
      filterMission.innerHTML += `<option value="${escapeHtml(m.id)}">${escapeHtml(m.icon)} ${escapeHtml(m.label)}</option>`;
    });
    filterMission.addEventListener('change', () =>
      renderRegistrationRows(registrations, filterMission.value, filterDate ? filterDate.value : 'all')
    );
  }

  if (filterDate) {
    filterDate.innerHTML = '<option value="all">Toutes les dates</option>';
    const dates = [...new Set(registrations.map(r => r.date))].sort();
    dates.forEach(d => {
      filterDate.innerHTML += `<option value="${escapeHtml(d)}">${escapeHtml(formatDate(d))}</option>`;
    });
    filterDate.addEventListener('change', () =>
      renderRegistrationRows(registrations, filterMission ? filterMission.value : 'all', filterDate.value)
    );
  }

  renderRegistrationRows(registrations, 'all', 'all');
}

function renderRegistrationRows(registrations, missionFilter, dateFilter) {
  const tbody = document.getElementById('reg-tbody');
  if (!tbody) return;

  let filtered = registrations;

  if (missionFilter !== 'all') {
    filtered = filtered.filter(r => r.mission === missionFilter);
  }

  if (dateFilter !== 'all') {
    filtered = filtered.filter(r => r.date === dateFilter);
  }

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" class="empty-state" style="padding:2rem;text-align:center;color:var(--color-text-muted)">Aucune disponibilité trouvée.</td></tr>`;
    return;
  }

  tbody.innerHTML = filtered.map(reg => {
    const mission = DataService.getMissionById(reg.mission);
    const timeRange = `${formatDate(reg.date)} ${reg.startTime}–${reg.endTime}`;

    return `
      <tr>
        <td>${escapeHtml(reg.firstName)} ${escapeHtml(reg.lastName)}</td>
        <td>${escapeHtml(reg.contact)}</td>
        <td><span class="badge-mission">${mission ? escapeHtml(mission.icon) + ' ' + escapeHtml(mission.label) : escapeHtml(reg.mission)}</span></td>
        <td>${escapeHtml(timeRange)}</td>
        <td>${reg.comment ? escapeHtml(reg.comment) : '<span style="color:#aaa">—</span>'}</td>
        <td>${formatDatetime(reg.submittedAt)}</td>
        <td class="td-actions">
          <button class="btn btn-sm" style="background:#dc3545;color:white;border:none"
            data-delete="${escapeHtml(reg.id)}"
            title="Supprimer cette inscription">🗑</button>
        </td>
      </tr>`;
  }).join('');
}

/* ================================================================
   Onglet disponibilités
   ================================================================ */
function renderAvailabilityTab(slots, registrations) {
  const container = document.getElementById('slots-admin-container');
  if (!container) return;

  const registrationsBySlot = registrations.reduce((acc, reg) => {
    if (!reg.slotId) return acc;
    if (!acc[reg.slotId]) acc[reg.slotId] = [];
    acc[reg.slotId].push(reg);
    return acc;
  }, {});

  if (!slots || slots.length === 0) {
    container.innerHTML = '<p style="color:var(--color-text-muted)">Aucun créneau disponible.</p>';
    return;
  }

  let html = '';
  const grouped = slots.reduce((acc, slot) => {
    if (!acc[slot.date]) acc[slot.date] = [];
    acc[slot.date].push(slot);
    return acc;
  }, {});

  Object.keys(grouped).sort().forEach(date => {
    html += `<h3 class="date-heading" style="margin:1.5rem 0 0.75rem;color:var(--color-primary)">${escapeHtml(formatDate(date))}</h3>`;
    html += '<div class="slots-admin-grid">';

    grouped[date].forEach(slot => {
      const mission = DataService.getMissionById(slot.mission);
      const volunteers = registrationsBySlot[slot.id] || [];

      html += `
        <div class="slot-admin-card">
          <div class="slot-admin-card-header">
            <span>${escapeHtml(mission ? `${mission.icon} ${mission.label}` : slot.mission)}</span>
            <span class="slot-badge ${slot.isFull ? 'full' : 'open'}">${slot.isFull ? 'Complet' : 'Ouvert'}</span>
          </div>
          <div class="slot-admin-card-body">
            <div class="slot-info-row" style="font-size:0.85rem;color:var(--color-text-muted);margin-bottom:0.5rem">
              🕒 ${escapeHtml(formatTime(slot.startTime))} – ${escapeHtml(formatTime(slot.endTime))}
            </div>
            <div class="slot-info-row" style="font-size:0.85rem;color:var(--color-text-muted);margin-bottom:0.5rem">
              👥 ${escapeHtml(String(slot.registeredCount || 0))} / ${escapeHtml(String(slot.maxVolunteers || 0))} inscrits
            </div>
            <div class="slot-volunteers">
              ${volunteers.length > 0 ? volunteers.map(reg => `
                <div class="volunteer-item">
                  👤 ${escapeHtml(reg.firstName)} ${escapeHtml(reg.lastName)}
                  <span style="color:var(--color-text-muted);font-size:0.78rem;margin-left:auto">${escapeHtml(reg.contact)}</span>
                </div>
              `).join('') : '<div class="volunteer-item" style="color:var(--color-text-muted)">Aucun bénévole inscrit</div>'}
            </div>
          </div>
        </div>`;
    });

    html += '</div>';
  });

  container.innerHTML = html;
}

/* ================================================================
   Onglet calendrier
   ================================================================ */
function renderCalendarTab(slots, registrations) {
  const container = document.getElementById('calendar-admin-container');
  if (!container) return;

  if (!slots || slots.length === 0) {
    container.innerHTML = '<p style="color:var(--color-text-muted)">Aucun créneau disponible.</p>';
    return;
  }

  const registrationsBySlot = registrations.reduce((acc, reg) => {
    if (!reg.slotId) return acc;
    if (!acc[reg.slotId]) acc[reg.slotId] = [];
    acc[reg.slotId].push(reg);
    return acc;
  }, {});

  const groupedByDate = slots.reduce((acc, slot) => {
    if (!acc[slot.date]) acc[slot.date] = [];
    acc[slot.date].push(slot);
    return acc;
  }, {});

  const sortedDates = Object.keys(groupedByDate).sort();
  let html = '<div class="calendar-admin-grid">';

  sortedDates.forEach(date => {
    const daySlots = groupedByDate[date]
      .slice()
      .sort((a, b) => `${a.startTime}-${a.endTime}-${a.mission}`.localeCompare(`${b.startTime}-${b.endTime}-${b.mission}`));

    html += `
      <section class="calendar-day-card">
        <h3 class="calendar-day-title">${escapeHtml(formatDate(date))}</h3>
        <div class="calendar-day-list">`;

    daySlots.forEach(slot => {
      const mission = DataService.getMissionById(slot.mission);
      const volunteers = registrationsBySlot[slot.id] || [];
      const volunteerNames = volunteers.map(reg => `${reg.firstName} ${reg.lastName}`).join(', ');

      html += `
          <article class="calendar-slot-item">
            <div class="calendar-slot-time">${escapeHtml(formatTime(slot.startTime))} - ${escapeHtml(formatTime(slot.endTime))}</div>
            <div class="calendar-slot-content">
              <div class="calendar-slot-mission">${escapeHtml(mission ? `${mission.icon} ${mission.label}` : slot.mission)}</div>
              <div class="calendar-slot-meta">${escapeHtml(String(slot.registeredCount || 0))}/${escapeHtml(String(slot.maxVolunteers || 0))} inscrits</div>
              <div class="calendar-slot-volunteers">${volunteerNames ? escapeHtml(volunteerNames) : 'Aucun bénévole inscrit'}</div>
            </div>
          </article>`;
    });

    html += `
        </div>
      </section>`;
  });

  html += '</div>';
  container.innerHTML = html;
}

/* ================================================================
  Onglet comptes créés
  ================================================================ */
function renderAccountsTab(users) {
  const tbody = document.getElementById('accounts-tbody');
  if (!tbody) return;

  if (!Array.isArray(users) || users.length === 0) {
    tbody.innerHTML = `<tr><td colspan="3" class="empty-state" style="padding:2rem;text-align:center;color:var(--color-text-muted)">Aucun compte créé pour le moment.</td></tr>`;
    return;
  }

  tbody.innerHTML = users.map(user => `
    <tr>
      <td>${escapeHtml(user.firstName || '')} ${escapeHtml(user.lastName || '')}</td>
      <td>${escapeHtml(user.contact || '—')}</td>
      <td>${formatDatetime(user.createdAt)}</td>
    </tr>
  `).join('');
}

/* ================================================================
   Onglets
   ================================================================ */
function setupTabs() {
  const tabBtns   = document.querySelectorAll('.tab-btn');
  const tabPanels = document.querySelectorAll('.tab-panel');

  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      tabBtns.forEach(b => {
        b.classList.remove('active');
        b.setAttribute('aria-selected', 'false');
      });
      tabPanels.forEach(p => p.classList.remove('active'));

      btn.classList.add('active');
      btn.setAttribute('aria-selected', 'true');
      const target = document.getElementById(btn.dataset.tab);
      if (target) target.classList.add('active');
    });
  });
}

/* ================================================================
   Export CSV
   ================================================================ */
function setupExport(registrations) {
  const exportBtn = document.getElementById('export-csv-btn');
  if (!exportBtn) return;

  exportBtn.addEventListener('click', () => {
    const rows = [
      ['Prénom', 'Nom', 'Contact', 'Mission', 'Date', 'Horaire', 'Commentaire', 'Date soumise'],
      ...registrations.map(reg => {
        const mission = DataService.getMissionById(reg.mission);
        return [
          reg.firstName,
          reg.lastName,
          reg.contact,
          mission ? mission.label : reg.mission,
          formatDate(reg.date),
          `${reg.startTime}-${reg.endTime}`,
          reg.comment || '',
          formatDatetime(reg.submittedAt),
        ];
      }),
    ];

    const csv = rows.map(r => r.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(';')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `benevoles_bcf2026_${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  });
}

/* ================================================================
   Suppression d'inscription
   ================================================================ */
let pendingDeleteId = null;

function setupDeleteModal(registrations) {
  const modal      = document.getElementById('delete-modal');
  const confirmBtn = document.getElementById('delete-confirm-btn');
  const cancelBtn  = document.getElementById('delete-cancel-btn');

  // Délégation d'événements sur le tableau
  const tbody = document.getElementById('reg-tbody');
  if (tbody) {
    tbody.addEventListener('click', e => {
      const btn = e.target.closest('[data-delete]');
      if (!btn) return;
      pendingDeleteId = btn.dataset.delete;
      if (modal) modal.classList.remove('hidden');
    });
  }

  if (cancelBtn) {
    cancelBtn.addEventListener('click', () => {
      pendingDeleteId = null;
      if (modal) modal.classList.add('hidden');
    });
  }

  if (confirmBtn) {
    confirmBtn.addEventListener('click', async () => {
      if (!pendingDeleteId) return;
      await DataService.deleteRegistration(pendingDeleteId);
      pendingDeleteId = null;
      if (modal) modal.classList.add('hidden');
      // Recharger le dashboard
      loadDashboard();
    });
  }
}

/* ================================================================
   Utilitaires
   ================================================================ */
function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

function formatDatetime(isoStr) {
  if (!isoStr) return '—';
  const d = new Date(isoStr);
  return d.toLocaleDateString('fr-FR') + ' ' + d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}
