// ============================================================
// image-manager.js — Upload e gestão de imagens de produtos (Admin)
// ============================================================

const MAX_IMAGES = 5;
let currentProductId = null;
let currentImages = []; // [{id, url, r2_key, ordem}, ...]

// Inicializa o gerenciador de imagens para um produto
async function initImageManager(produtoId) {
  currentProductId = produtoId;
  currentImages = [];
  await loadImages();
  renderThumbnails();
}

// Carrega imagens do servidor
async function loadImages() {
  if (!currentProductId) return;
  try {
    const res = await apiFetch(`/api/admin/produto/${currentProductId}/imagens`);
    if (!res) return;
    currentImages = await res.json();
  } catch (e) {
    console.error('Erro ao carregar imagens:', e);
    currentImages = [];
  }
}

// Renderiza a grade de 5 slots
function renderThumbnails() {
  const container = document.getElementById('img-thumbnails');
  if (!container) return;

  const countEl = document.getElementById('img-count');
  if (countEl) countEl.textContent = `${currentImages.length}/${MAX_IMAGES}`;

  // Ocultar/mostrar dropzone
  const dropzone = document.getElementById('img-dropzone');
  if (dropzone) {
    dropzone.style.display = currentImages.length >= MAX_IMAGES ? 'none' : 'block';
  }

  container.innerHTML = currentImages.map((img, i) => `
    <div class="img-thumb" id="img-thumb-${img.id}">
      <img src="${img.url}" alt="Imagem ${i + 1}" loading="lazy">
      <span class="img-thumb__badge">${i === 0 ? '⭐ Capa' : `#${i + 1}`}</span>
      <button class="img-thumb__del" onclick="deleteImage(${img.id})" title="Remover imagem">✕</button>
    </div>
  `).join('') + Array(Math.max(0, MAX_IMAGES - currentImages.length)).fill(0).map((_, i) => `
    <div class="img-thumb img-thumb--empty" title="Slot vazio">+</div>
  `).join('');
}

// Upload via input file
async function handleImageUpload(input) {
  if (!input.files?.length || !currentProductId) return;
  const files = Array.from(input.files).slice(0, MAX_IMAGES - currentImages.length);

  for (const file of files) {
    await uploadSingleImage(file);
  }
  input.value = '';
}

async function uploadSingleImage(file) {
  if (currentImages.length >= MAX_IMAGES) {
    showToastAdmin(`Limite de ${MAX_IMAGES} imagens atingido.`, 'error');
    return;
  }

  // Mostrar slot de loading
  const container = document.getElementById('img-thumbnails');
  const loadingDiv = document.createElement('div');
  loadingDiv.className = 'img-thumb img-thumb--loading';
  loadingDiv.textContent = '⏳';
  container?.insertBefore(loadingDiv, container.children[currentImages.length]);

  const formData = new FormData();
  formData.append('imagem', file);

  try {
    const res = await fetch(`${API_URL}/api/admin/produto/${currentProductId}/imagem`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${getToken()}` },
      body: formData,
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);

    currentImages.push({ id: data.id, url: data.url, r2_key: data.r2_key, ordem: data.ordem });
    showToastAdmin('Imagem enviada!');
  } catch (e) {
    showToastAdmin(e.message || 'Erro ao enviar imagem.', 'error');
  } finally {
    loadingDiv.remove();
    renderThumbnails();
  }
}

// Deletar imagem
async function deleteImage(imgId) {
  if (!confirm('Remover esta imagem?')) return;
  try {
    const res = await apiFetch(`/api/admin/imagem/${imgId}`, { method: 'DELETE' });
    if (!res) return;
    currentImages = currentImages.filter(i => i.id !== imgId);
    renderThumbnails();
    showToastAdmin('Imagem removida.');
  } catch (e) {
    showToastAdmin('Erro ao remover imagem.', 'error');
  }
}

// Drag & drop no dropzone
function initDropzone() {
  const zone = document.getElementById('img-dropzone');
  if (!zone) return;
  zone.addEventListener('dragover', e => { e.preventDefault(); zone.classList.add('drag-over'); });
  zone.addEventListener('dragleave', () => zone.classList.remove('drag-over'));
  zone.addEventListener('drop', async e => {
    e.preventDefault();
    zone.classList.remove('drag-over');
    const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
    for (const file of files.slice(0, MAX_IMAGES - currentImages.length)) {
      await uploadSingleImage(file);
    }
  });
}
