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
    const [registrations, slots] = await Promise.all([
      DataService.getRegistrations(),
      DataService.getSlots(),
    ]);

    renderAdminStats(registrations, slots);
    renderRegistrationsTab(registrations, slots);
    renderSlotsTab(slots, registrations);
    setupTabs();
    setupExport(registrations, slots);
    setupDeleteModal(registrations, slots);
  } catch (err) {
    console.error('Erreur chargement admin:', err);
  }
}

/* ================================================================
   Stats admin
   ================================================================ */
function renderAdminStats(registrations, slots) {
  const totalReg    = registrations.length;
  const openSlots   = slots.filter(s => s.status === 'open').length;
  const fullSlots   = slots.filter(s => s.status === 'full').length;
  const totalPlaces = slots.reduce((s, sl) => s + sl.maxVolunteers, 0);

  setText('admin-stat-reg',    totalReg);
  setText('admin-stat-open',   openSlots);
  setText('admin-stat-full',   fullSlots);
  setText('admin-stat-places', totalPlaces);
}

/* ================================================================
   Onglet inscriptions
   ================================================================ */
function renderRegistrationsTab(registrations, slots) {
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
      renderRegistrationRows(registrations, slots, filterMission.value, filterDate ? filterDate.value : 'all')
    );
  }

  if (filterDate) {
    filterDate.innerHTML = '<option value="all">Toutes les dates</option>';
    const dates = [...new Set(slots.map(s => s.date))].sort();
    dates.forEach(d => {
      filterDate.innerHTML += `<option value="${escapeHtml(d)}">${escapeHtml(formatDate(d))}</option>`;
    });
    filterDate.addEventListener('change', () =>
      renderRegistrationRows(registrations, slots, filterMission ? filterMission.value : 'all', filterDate.value)
    );
  }

  renderRegistrationRows(registrations, slots, 'all', 'all');
}

function renderRegistrationRows(registrations, slots, missionFilter, dateFilter) {
  const tbody = document.getElementById('reg-tbody');
  if (!tbody) return;

  let filtered = registrations;

  if (missionFilter !== 'all') {
    filtered = filtered.filter(r => r.mission === missionFilter);
  }

  if (dateFilter !== 'all') {
    const slotIds = slots.filter(s => s.date === dateFilter).map(s => s.id);
    filtered = filtered.filter(r => slotIds.includes(r.slotId));
  }

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" class="empty-state" style="padding:2rem;text-align:center;color:var(--color-text-muted)">Aucune inscription trouvée.</td></tr>`;
    return;
  }

  tbody.innerHTML = filtered.map(reg => {
    const slot    = slots.find(s => s.id === reg.slotId);
    const mission = DataService.getMissionById(reg.mission);
    const slotLabel = slot
      ? `${formatDate(slot.date)} ${formatTime(slot.startTime)}–${formatTime(slot.endTime)}`
      : reg.slotId;

    return `
      <tr>
        <td>${escapeHtml(reg.firstName)} ${escapeHtml(reg.lastName)}</td>
        <td>${escapeHtml(reg.contact)}</td>
        <td><span class="badge-mission">${mission ? escapeHtml(mission.icon) + ' ' + escapeHtml(mission.label) : escapeHtml(reg.mission)}</span></td>
        <td>${escapeHtml(slotLabel)}</td>
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
   Onglet créneaux
   ================================================================ */
function renderSlotsTab(slots, registrations) {
  const container = document.getElementById('slots-admin-container');
  if (!container) return;

  const byDate = slots.reduce((acc, s) => {
    if (!acc[s.date]) acc[s.date] = [];
    acc[s.date].push(s);
    return acc;
  }, {});

  let html = '';
  Object.keys(byDate).sort().forEach(date => {
    html += `<h3 class="date-heading" style="margin:1.5rem 0 0.75rem;color:var(--color-primary)">${escapeHtml(formatDate(date))}</h3>`;
    html += '<div class="slots-admin-grid">';

    byDate[date].forEach(slot => {
      const mission = DataService.getMissionById(slot.mission);
      const icon    = mission ? mission.icon : '📌';
      const label   = mission ? mission.label : slot.mission;
      const slotRegs = registrations.filter(r => r.slotId === slot.id);
      const pct     = Math.min(100, Math.round((slotRegs.length / slot.maxVolunteers) * 100));

      html += `
        <div class="slot-admin-card">
          <div class="slot-admin-card-header">
            <span>${escapeHtml(icon)} ${escapeHtml(label)}</span>
            <span class="slot-badge ${escapeHtml(slot.status)}">${slot.status === 'open' ? 'Dispo' : slot.status === 'full' ? 'Complet' : 'Fermé'}</span>
          </div>
          <div class="slot-admin-card-body">
            <div class="slot-info-row" style="font-size:0.85rem;color:var(--color-text-muted);margin-bottom:0.5rem">
              🕒 ${escapeHtml(formatTime(slot.startTime))} – ${escapeHtml(formatTime(slot.endTime))}
              &nbsp;·&nbsp; ${slotRegs.length}/${slot.maxVolunteers} bénévoles
            </div>
            <div class="progress-bar" style="margin-bottom:0.75rem">
              <div class="progress-fill ${pct >= 100 ? 'full' : pct >= 70 ? 'nearly-full' : ''}" style="width:${pct}%"></div>
            </div>
            ${slotRegs.length > 0 ? `
              <div class="slot-volunteers">
                <div class="slot-volunteers-title">Inscrits</div>
                ${slotRegs.map(r => `
                  <div class="volunteer-item">
                    👤 ${escapeHtml(r.firstName)} ${escapeHtml(r.lastName)}
                    <span style="color:var(--color-text-muted);font-size:0.78rem;margin-left:auto">${escapeHtml(r.contact)}</span>
                  </div>`).join('')}
              </div>` : `<div style="color:var(--color-text-muted);font-size:0.85rem">Aucun inscrit pour le moment.</div>`}
          </div>
        </div>`;
    });

    html += '</div>';
  });

  container.innerHTML = html;
}

/* ================================================================
   Onglets
   ================================================================ */
function setupTabs() {
  const tabBtns   = document.querySelectorAll('.tab-btn');
  const tabPanels = document.querySelectorAll('.tab-panel');

  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      tabBtns.forEach(b => b.classList.remove('active'));
      tabPanels.forEach(p => p.classList.remove('active'));

      btn.classList.add('active');
      const target = document.getElementById(btn.dataset.tab);
      if (target) target.classList.add('active');
    });
  });
}

/* ================================================================
   Export CSV
   ================================================================ */
function setupExport(registrations, slots) {
  const exportBtn = document.getElementById('export-csv-btn');
  if (!exportBtn) return;

  exportBtn.addEventListener('click', () => {
    const rows = [
      ['Prénom', 'Nom', 'Contact', 'Mission', 'Date', 'Horaire', 'Commentaire', 'Date inscription'],
      ...registrations.map(reg => {
        const slot    = slots.find(s => s.id === reg.slotId);
        const mission = DataService.getMissionById(reg.mission);
        return [
          reg.firstName,
          reg.lastName,
          reg.contact,
          mission ? mission.label : reg.mission,
          slot ? formatDate(slot.date) : '',
          slot ? `${formatTime(slot.startTime)}-${formatTime(slot.endTime)}` : '',
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

function setupDeleteModal(registrations, slots) {
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
