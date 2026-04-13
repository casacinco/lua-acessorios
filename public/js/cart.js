// ============================================================
// cart.js — Gerenciamento do carrinho (localStorage)
// ============================================================
const API = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? 'http://localhost:8787'
  : 'https://lua-acessorios-api.rodsgalvan.workers.dev';

window.API_URL = API;

// ── Carrinho ─────────────────────────────────────────────────
function getCart() {
  try { return JSON.parse(localStorage.getItem('lua_cart') || '[]'); } catch { return []; }
}
function saveCart(cart) {
  localStorage.setItem('lua_cart', JSON.stringify(cart));
  updateCartUI();
}
function clearCart() { localStorage.removeItem('lua_cart'); updateCartUI(); }

function addItem(item) {
  const cart = getCart();
  const idx = cart.findIndex(i => i.variacao_id === item.variacao_id);
  if (idx >= 0) cart[idx].quantidade += item.quantidade;
  else cart.push(item);
  saveCart(cart);
}

function removeItem(variacaoId) {
  saveCart(getCart().filter(i => i.variacao_id !== variacaoId));
}

function changeQty(variacaoId, delta) {
  const cart = getCart();
  const idx = cart.findIndex(i => i.variacao_id === variacaoId);
  if (idx < 0) return;
  cart[idx].quantidade = Math.max(1, cart[idx].quantidade + delta);
  saveCart(cart);
}

function getTotal() {
  return getCart().reduce((s, i) => s + i.preco * i.quantidade, 0);
}

function getCount() {
  return getCart().reduce((s, i) => s + i.quantidade, 0);
}

// ── UI do Carrinho ───────────────────────────────────────────
function updateCartUI() {
  const cart = getCart();
  const count = getCount();
  const total = getTotal();

  // FAB
  const fab = document.getElementById('cart-fab');
  const fabCount = document.getElementById('fab-count');
  if (fab) { fab.style.display = count > 0 ? 'flex' : 'none'; }
  if (fabCount) fabCount.textContent = count;

  // Nav count
  const navCount = document.getElementById('nav-cart-count');
  if (navCount) {
    navCount.textContent = count;
    navCount.style.display = count > 0 ? 'inline' : 'none';
  }

  // Total
  const totalEl = document.getElementById('cart-total');
  if (totalEl) totalEl.textContent = `R$ ${total.toFixed(2).replace('.',',')}`;

  // Body do drawer
  const body = document.getElementById('cart-body');
  if (!body) return;

  if (cart.length === 0) {
    body.innerHTML = `<div class="cart-empty"><div style="font-size:3rem">🛍️</div><p>Seu pedido está vazio.<br>Adicione produtos do catálogo.</p></div>`;
    return;
  }

  body.innerHTML = cart.map(item => `
    <div class="cart-item">
      <div class="cart-item__info">
        <div class="cart-item__ref">${item.ref}</div>
        <div class="cart-item__mat">${item.material_nome}</div>
        <div class="cart-item__price">R$ ${item.preco.toFixed(2).replace('.',',')} / un — Subtotal: <strong>R$ ${(item.preco * item.quantidade).toFixed(2).replace('.',',')}</strong></div>
      </div>
      <div class="cart-item__controls">
        <button class="qty-btn" onclick="changeQty(${item.variacao_id}, -1)">−</button>
        <span class="qty-val">${item.quantidade}</span>
        <button class="qty-btn" onclick="changeQty(${item.variacao_id}, 1)">+</button>
        <button class="cart-item__remove" onclick="removeItem(${item.variacao_id})" title="Remover">🗑</button>
      </div>
    </div>
  `).join('');
}

function openCart() {
  document.getElementById('cart-overlay')?.classList.add('open');
  document.getElementById('cart-drawer')?.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeCart() {
  document.getElementById('cart-overlay')?.classList.remove('open');
  document.getElementById('cart-drawer')?.classList.remove('open');
  document.body.style.overflow = '';
}

function goToCheckout() {
  if (getCart().length === 0) { showToast('Adicione itens ao pedido primeiro.', 'error'); return; }
  window.location.href = 'pedido.html';
}

// ── Toast ────────────────────────────────────────────────────
function showToast(msg, type = 'success') {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const t = document.createElement('div');
  t.className = `toast toast--${type}`;
  t.textContent = type === 'success' ? `✅ ${msg}` : `❌ ${msg}`;
  container.appendChild(t);
  setTimeout(() => t.remove(), 3500);
}

// Inicializar UI ao carregar
document.addEventListener('DOMContentLoaded', updateCartUI);
