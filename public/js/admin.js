// ============================================================
// admin.js — Shared admin utilities
// ============================================================

function getToken() { return localStorage.getItem('lua_admin_token'); }

function requireAdmin() {
  if (!getToken()) { window.location.href = 'login.html'; return false; }
  return true;
}

function logout() {
  localStorage.removeItem('lua_admin_token');
  localStorage.removeItem('lua_admin_email');
  window.location.href = 'login.html';
}

function authHeaders() {
  return { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}` };
}

async function apiFetch(path, options = {}) {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: { ...authHeaders(), ...(options.headers || {}) },
  });
  if (res.status === 401) { logout(); return null; }
  return res;
}

function showToastAdmin(msg, type = 'success') {
  const c = document.getElementById('toast-container');
  if (!c) return;
  const t = document.createElement('div');
  t.className = `toast toast--${type}`;
  t.textContent = type === 'success' ? `✅ ${msg}` : `❌ ${msg}`;
  c.appendChild(t);
  setTimeout(() => t.remove(), 3500);
}

function formatDate(str) {
  if (!str) return '—';
  return new Date(str).toLocaleString('pt-BR', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' });
}

function formatMoney(v) {
  if (v == null) return '—';
  return `R$ ${parseFloat(v).toFixed(2).replace('.',',')}`;
}

const STATUS_LABELS = {
  pendente: 'Pendente', confirmado: 'Confirmado',
  enviado: 'Enviado', cancelado: 'Cancelado',
};

// Set active sidebar item
document.addEventListener('DOMContentLoaded', () => {
  const path = window.location.pathname;
  document.querySelectorAll('.sidebar__item').forEach(el => {
    if (el.getAttribute('href') && path.endsWith(el.getAttribute('href'))) {
      el.classList.add('active');
    }
  });
  const emailEl = document.getElementById('admin-email-display');
  if (emailEl) emailEl.textContent = localStorage.getItem('lua_admin_email') || '';
});
