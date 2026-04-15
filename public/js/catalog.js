// ============================================================
// catalog.js — Carrega e renderiza o catálogo de produtos
// ============================================================

const MATERIAL_LABELS = {
  aco_inox: 'Aço Inox Polido',
  aco_dourado: 'Aço Dourado',
  latao_bruto: 'Latão Bruto',
  latao_folheado: 'Latão Folheado',
};

const MATERIAL_ICONS = {
  aco_inox: '🔘',
  aco_dourado: '✨',
  latao_bruto: '🟤',
  latao_folheado: '🌟',
};

const CAT_ICONS = {
  chaveiros: '🔑',
  plaquinhas: '🏷️',
  'pulseiras-infantis': '👶',
  aneis: '💍',
  'gravatas-broches': '🎀',
  marcadores: '📖',
  'pulseiras-femininas': '💎',
  outros: '✦',
};

let allProducts = [];
let currentProduct = null;
let currentVariacao = null;
let activeCategory = '';
let searchQuery = '';

// ── Carregar dados ────────────────────────────────────────────
async function loadCatalog() {
  try {
    const [prodRes, catRes] = await Promise.all([
      fetch(`${API_URL}/api/produtos`),
      fetch(`${API_URL}/api/categorias`),
    ]);
    allProducts = await prodRes.json();
    const categorias = await catRes.json();
    renderFilters(categorias);
    renderProducts(allProducts);
  } catch (e) {
    console.error('Erro ao carregar catálogo:', e);
    document.getElementById('product-grid').innerHTML = `
      <div style="grid-column:1/-1;text-align:center;padding:60px;color:var(--text-muted)">
        <div style="font-size:3rem;margin-bottom:16px">⚠️</div>
        <p>Não foi possível carregar o catálogo.</p>
        <button onclick="loadCatalog()" class="btn btn--primary" style="margin-top:16px">Tentar novamente</button>
      </div>`;
  }
}

// ── Renderizar Filtros ────────────────────────────────────────
function renderFilters(categorias) {
  const bar = document.getElementById('filters-bar');
  const searchWrap = bar.querySelector('.search-wrap');
  // Botão "Todos" + categorias
  const btns = [`<button class="filter-btn active" data-cat="">Todos</button>`];
  categorias.forEach(cat => {
    btns.push(`<button class="filter-btn" data-cat="${cat.slug}">${cat.nome}</button>`);
  });
  btns.forEach(html => {
    const div = document.createElement('div');
    div.innerHTML = html;
    const btn = div.firstChild;
    btn.addEventListener('click', () => {
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeCategory = btn.dataset.cat;
      filterAndRender();
    });
    bar.insertBefore(btn, searchWrap);
  });
}

// ── Busca ─────────────────────────────────────────────────────
document.getElementById('search-input')?.addEventListener('input', e => {
  searchQuery = e.target.value.toLowerCase();
  filterAndRender();
});

function filterAndRender() {
  let filtered = allProducts;
  if (activeCategory) filtered = filtered.filter(p => p.categoria_slug === activeCategory);
  if (searchQuery) filtered = filtered.filter(p =>
    p.ref.toLowerCase().includes(searchQuery) ||
    (p.nome || '').toLowerCase().includes(searchQuery)
  );
  renderProducts(filtered);
}

// ── Renderizar Grid ───────────────────────────────────────────
function renderProducts(products) {
  const grid = document.getElementById('product-grid');
  const count = document.getElementById('product-count');
  if (count) count.textContent = `${products.length} produto${products.length !== 1 ? 's' : ''}`;

  if (!products.length) {
    grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:60px 20px;color:var(--text-muted)">
      <div style="font-size:3rem;margin-bottom:12px">🔍</div>
      <p>Nenhum produto encontrado.</p></div>`;
    return;
  }

  grid.innerHTML = products.map(p => {
    const varDisp = (p.variacoes || []).filter(v => v.disponivel && v.preco);
    const menorPreco = varDisp.length ? Math.min(...varDisp.map(v => v.preco)) : null;
    const firstImg = p.primeira_imagem_url || p.imagem_url;
    const imgHtml = firstImg
      ? `<img src="${firstImg}" alt="${p.ref}" loading="lazy">`
      : `<span class="placeholder-icon">${CAT_ICONS[p.categoria_slug] || '🔗'}</span>`;
    const precosHtml = (p.variacoes || []).slice(0, 3).map(v => `
      <div class="price-tag ${!v.disponivel || !v.preco ? 'price-tag--unavailable' : ''}">
        <span class="price-tag__mat">${MATERIAL_LABELS[v.material] || v.material}</span>
        <span class="price-tag__val">${v.disponivel && v.preco ? `R$ ${v.preco.toFixed(2).replace('.',',')}` : '—'}</span>
      </div>`).join('');

    return `
      <div class="product-card" onclick="openModal(${p.id})">
        <div class="product-card__img">${imgHtml}</div>
        ${varDisp.length > 0 ? `<div class="product-card__badge">A partir R$ ${menorPreco.toFixed(2).replace('.',',')}</div>` : ''}
        <div class="product-card__body">
          <div class="product-card__ref">${p.ref}</div>
          <div class="product-card__name">${p.nome || p.categoria_nome || ''}</div>
          <div class="product-card__info">
            ${p.tamanho ? `📐 ${p.tamanho}` : ''} 
            ${p.pedido_minimo ? `• Mín. ${p.pedido_minimo} un` : ''}
          </div>
          <div class="product-card__prices">${precosHtml}</div>
          <button class="btn-add" onclick="event.stopPropagation();openModal(${p.id})">+ Adicionar ao Pedido</button>
        </div>
      </div>`;
  }).join('');
}

// ── Modal ─────────────────────────────────────────────────────
async function openModal(productId) {
  currentProduct = allProducts.find(p => p.id === productId);
  if (!currentProduct) return;
  currentVariacao = null;

  // Abrir modal imediatamente com dados básicos
  document.getElementById('modal-ref').textContent = currentProduct.ref;
  document.getElementById('modal-title').textContent = currentProduct.nome || currentProduct.categoria_nome || currentProduct.ref;
  document.getElementById('modal-meta').innerHTML = `
    ${currentProduct.tamanho ? `<span>📐 ${currentProduct.tamanho}</span>` : ''}
    ${currentProduct.espessura ? `<span>⚡ Esp. ${currentProduct.espessura}mm</span>` : ''}
    <span>📦 Mín. ${currentProduct.pedido_minimo || 15} un</span>
  `;

  const imgEl = document.getElementById('modal-img');
  // Placeholder inicial enquanto carrega
  if (currentProduct.imagem_url) {
    imgEl.innerHTML = `<div class="modal-gallery"><img class="modal-gallery__img" src="${currentProduct.imagem_url}" alt="${currentProduct.ref}"></div>`;
  } else {
    imgEl.innerHTML = `<div class="modal-gallery"><span class="modal-gallery__no-img">${CAT_ICONS[currentProduct.categoria_slug] || '🔗'}</span></div>`;
  }

  const minQty = currentProduct.pedido_minimo || 15;
  document.getElementById('modal-qty').value = minQty;
  document.getElementById('modal-qty').min = 1;
  document.getElementById('modal-min-note').textContent = `Mín. ${minQty} un`;

  renderMaterials(currentProduct.variacoes || []);
  document.getElementById('modal-overlay').classList.add('open');
  document.body.style.overflow = 'hidden';

  // Buscar produto completo (com imagens) em paralelo
  try {
    const res = await fetch(`${API_URL}/api/produto/${encodeURIComponent(currentProduct.ref)}`);
    if (res.ok) {
      const full = await res.json();
      currentProduct = { ...currentProduct, ...full };
      // Atualizar galeria
      if (full.imagens?.length > 0) {
        renderGallery(imgEl, full.imagens, full);
      }
      // Atualizar materiais (caso tenham mudado)
      renderMaterials(full.variacoes || []);
    }
  } catch(e) { /* silencioso — já temos dados básicos */ }
}

function renderMaterials(variacoes) {
  const matsEl = document.getElementById('modal-materials');
  if (!matsEl) return;
  matsEl.innerHTML = variacoes.map(v => `
    <div class="material-option ${!v.disponivel || !v.preco ? 'disabled' : ''}" 
         data-variacao="${v.id}"
         onclick="${v.disponivel && v.preco ? `selectMaterial(${v.id})` : ''}">
      <div class="material-option__radio"></div>
      <div class="material-option__name">${MATERIAL_ICONS[v.material] || ''} ${v.material_nome}</div>
      ${v.disponivel && v.preco
        ? `<div class="material-option__price">R$ ${v.preco.toFixed(2).replace('.',',')}</div>`
        : `<div class="material-option__unavail">Indisponível</div>`}
    </div>`).join('');
}

let galleryIndex = 0;
let galleryImages = [];

function renderGallery(container, imagens, produto) {
  galleryImages = imagens;
  galleryIndex = 0;
  updateGalleryDisplay(container);
}

function updateGalleryDisplay(container) {
  if (!container) container = document.getElementById('modal-img');
  const img = galleryImages[galleryIndex];
  const showNav = galleryImages.length > 1;
  container.innerHTML = `
    <div class="modal-gallery">
      <img class="modal-gallery__img" src="${img.url}" alt="Foto ${galleryIndex + 1}">
      ${showNav ? `<button class="gallery-nav gallery-nav--prev" onclick="galleryNav(-1)">❮</button>` : ''}
      ${showNav ? `<button class="gallery-nav gallery-nav--next" onclick="galleryNav(1)">❯</button>` : ''}
      ${showNav ? `<div class="gallery-dots">${galleryImages.map((_, i) =>
        `<button class="gallery-dot ${i === galleryIndex ? 'active' : ''}" onclick="galleryGoto(${i})"></button>`
      ).join('')}</div>` : ''}
    </div>`;
}

function galleryNav(dir) {
  galleryIndex = (galleryIndex + dir + galleryImages.length) % galleryImages.length;
  updateGalleryDisplay();
}

function galleryGoto(i) {
  galleryIndex = i;
  updateGalleryDisplay();
}

function selectMaterial(variacaoId) {
  const variacao = (currentProduct?.variacoes || []).find(v => v.id === variacaoId);
  if (!variacao?.disponivel || !variacao?.preco) return;
  currentVariacao = variacao;
  document.querySelectorAll('.material-option').forEach(el => {
    el.classList.toggle('selected', parseInt(el.dataset.variacao) === variacaoId);
  });
}

function closeModal() {
  document.getElementById('modal-overlay').classList.remove('open');
  document.body.style.overflow = '';
  currentProduct = null;
  currentVariacao = null;
}

function addToCart() {
  if (!currentProduct) return;
  if (!currentVariacao) { showToast('Selecione um material antes de adicionar.', 'error'); return; }
  const qty = parseInt(document.getElementById('modal-qty').value);
  if (!qty || qty < 1) { showToast('Informe a quantidade.', 'error'); return; }

  addItem({
    variacao_id: currentVariacao.id,
    produto_id: currentProduct.id,
    ref: currentProduct.ref,
    material: currentVariacao.material,
    material_nome: currentVariacao.material_nome,
    preco: currentVariacao.preco,
    quantidade: qty,
  });

  showToast(`${currentProduct.ref} (${currentVariacao.material_nome}) adicionado!`);
  closeModal();
}

// Escape para fechar modal
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });

loadCatalog();
