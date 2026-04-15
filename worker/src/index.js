// ============================================================
// LUA ACESSÓRIOS — Cloudflare Worker (API Backend)
// ============================================================

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
  });
}

function err(msg, status = 400) {
  return json({ error: msg }, status);
}

// ── Simple JWT (HS256 com WebCrypto) ─────────────────────────
async function signJWT(payload, secret) {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = btoa(JSON.stringify(payload));
  const data = `${header}.${body}`;
  const key = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(data));
  const sigB64 = btoa(String.fromCharCode(...new Uint8Array(sig)));
  return `${data}.${sigB64}`;
}

async function verifyJWT(token, secret) {
  try {
    const [header, body, sig] = token.split('.');
    const data = `${header}.${body}`;
    const key = await crypto.subtle.importKey(
      'raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']
    );
    const sigBytes = Uint8Array.from(atob(sig), c => c.charCodeAt(0));
    const valid = await crypto.subtle.verify('HMAC', key, sigBytes, new TextEncoder().encode(data));
    if (!valid) return null;
    const payload = JSON.parse(atob(body));
    if (payload.exp && Date.now() / 1000 > payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
}

// ── bcrypt-lite (SHA-256 hash simples para senhas) ────────────
async function hashPassword(password) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(password));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function verifyPassword(password, hash) {
  const candidate = await hashPassword(password);
  return candidate === hash;
}

// ── Auth middleware ──────────────────────────────────────────
async function requireAuth(request, env) {
  const auth = request.headers.get('Authorization') || '';
  const token = auth.replace('Bearer ', '');
  if (!token) return null;
  return await verifyJWT(token, env.JWT_SECRET);
}

// ── Data/hora em UTC-3 (São Paulo) ───────────────────────────
function nowSP() {
  return new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
}

// ── Código de pedido ─────────────────────────────────────────
async function gerarCodigo(db) {
  const year = nowSP().getFullYear();
  const row = await db.prepare('SELECT COUNT(*) as cnt FROM pedidos WHERE codigo LIKE ?').bind(`LUA-${year}-%`).first();
  const num = String((row?.cnt || 0) + 1).padStart(3, '0');
  return `LUA-${year}-${num}`;
}

// ── Email via Resend ─────────────────────────────────────────
async function enviarEmailPedido(pedido, itens, env) {
  const itemsHtml = itens.map(it =>
    `<tr><td>${it.ref}</td><td>${it.material_nome}</td><td>${it.quantidade}</td><td>R$ ${it.preco_unitario.toFixed(2)}</td><td>R$ ${it.subtotal.toFixed(2)}</td></tr>`
  ).join('');

  const html = `
  <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
    <div style="background:#c8102e;padding:20px;border-radius:8px 8px 0 0">
      <h1 style="color:white;margin:0;font-size:22px">🛍️ Novo Pedido — Lua Acessórios</h1>
      <p style="color:#ffd0d8;margin:4px 0 0">Pedido ${pedido.codigo}</p>
    </div>
    <div style="border:1px solid #eee;border-top:none;padding:24px;border-radius:0 0 8px 8px">
      <h2 style="color:#333;font-size:16px;margin-top:0">📋 Dados do Cliente</h2>
      <table style="width:100%;border-collapse:collapse;margin-bottom:20px">
        <tr><td style="padding:6px;color:#666;width:140px">Nome</td><td style="padding:6px;font-weight:bold">${pedido.nome_cliente}</td></tr>
        <tr style="background:#f9f9f9"><td style="padding:6px;color:#666">WhatsApp</td><td style="padding:6px;font-weight:bold">${pedido.whatsapp}</td></tr>
        <tr><td style="padding:6px;color:#666">Cidade/Estado</td><td style="padding:6px;font-weight:bold">${pedido.cidade} / ${pedido.estado}</td></tr>
        ${pedido.endereco ? `<tr style="background:#f9f9f9"><td style="padding:6px;color:#666">Endereço</td><td style="padding:6px">${pedido.endereco}</td></tr>` : ''}
        ${pedido.observacoes ? `<tr><td style="padding:6px;color:#666">Obs.</td><td style="padding:6px">${pedido.observacoes}</td></tr>` : ''}
      </table>
      <h2 style="color:#333;font-size:16px">📦 Produtos Pedidos</h2>
      <table style="width:100%;border-collapse:collapse">
        <thead><tr style="background:#c8102e;color:white">
          <th style="padding:8px;text-align:left">REF</th>
          <th style="padding:8px;text-align:left">Material</th>
          <th style="padding:8px;text-align:center">Qtd</th>
          <th style="padding:8px;text-align:right">Unit.</th>
          <th style="padding:8px;text-align:right">Subtotal</th>
        </tr></thead>
        <tbody>${itemsHtml}</tbody>
        <tfoot><tr style="background:#f0f0f0;font-weight:bold">
          <td colspan="4" style="padding:10px;text-align:right">TOTAL</td>
          <td style="padding:10px;text-align:right;color:#c8102e">R$ ${pedido.total.toFixed(2)}</td>
        </tr></tfoot>
      </table>
      <div style="margin-top:24px;padding:16px;background:#fff8f8;border-left:4px solid #c8102e;border-radius:4px">
        <p style="margin:0;color:#666;font-size:14px">
          Entre em contato com o cliente pelo WhatsApp: 
          <a href="https://wa.me/55${pedido.whatsapp.replace(/\D/g,'')}" style="color:#c8102e;font-weight:bold">${pedido.whatsapp}</a>
        </p>
      </div>
    </div>
  </div>`;

  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'Lua Acessórios <onboarding@resend.dev>',
      to: [env.ADMIN_EMAIL],
      subject: `🛍️ Novo Pedido ${pedido.codigo} — ${pedido.nome_cliente}`,
      html,
    }),
  });
}

// ══════════════════════════════════════════════════════════════
// ROUTER PRINCIPAL
// ══════════════════════════════════════════════════════════════
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;

    if (method === 'OPTIONS') {
      return new Response(null, { headers: CORS_HEADERS });
    }

    // ── PUBLIC ROUTES ─────────────────────────────────────────

    // GET /api/categorias
    if (path === '/api/categorias' && method === 'GET') {
      const rows = await env.DB.prepare('SELECT * FROM categorias ORDER BY ordem').all();
      return json(rows.results);
    }

    // GET /api/produtos?categoria=chaveiros&q=PCH01
    if (path === '/api/produtos' && method === 'GET') {
      const cat = url.searchParams.get('categoria');
      const q = url.searchParams.get('q');
      let query = `
        SELECT p.*, c.nome as categoria_nome, c.slug as categoria_slug
        FROM produtos p
        LEFT JOIN categorias c ON c.id = p.categoria_id
        WHERE p.ativo = 1
      `;
      const params = [];
      if (cat) { query += ` AND c.slug = ?`; params.push(cat); }
      if (q) { query += ` AND (p.ref LIKE ? OR p.nome LIKE ?)`; params.push(`%${q}%`, `%${q}%`); }
      query += ' ORDER BY p.ref';

      const stmt = env.DB.prepare(query);
      const rows = params.length ? await stmt.bind(...params).all() : await stmt.all();

      const ids = rows.results.map(r => r.id);
      let variacoes = [];
      let todasImagens = [];

      if (ids.length > 0) {
        const inList = ids.join(',');
        const [vars, imgs] = await Promise.all([
          env.DB.prepare(`SELECT * FROM variacoes_produto WHERE produto_id IN (${inList})`).all(),
          env.DB.prepare(`SELECT produto_id, r2_key FROM imagens_produto WHERE produto_id IN (${inList}) ORDER BY ordem ASC`).all(),
        ]);
        variacoes = vars.results;
        todasImagens = imgs.results;
      }

      const baseUrl = new URL(request.url).origin;
      const produtos = rows.results.map(p => {
        const primeiraImg = todasImagens.find(img => img.produto_id === p.id);
        return {
          ...p,
          variacoes: variacoes.filter(v => v.produto_id === p.id),
          primeira_imagem_url: primeiraImg ? `${baseUrl}/api/imagem/${primeiraImg.r2_key}` : null,
        };
      });

      return json(produtos);
    }

    // GET /api/imagem/:key* — serve imagem do R2 (público)
    if (path.startsWith('/api/imagem/') && method === 'GET') {
      const key = decodeURIComponent(path.replace('/api/imagem/', ''));
      const obj = await env.IMAGES.get(key);
      if (!obj) return new Response('Not found', { status: 404 });
      const headers = new Headers();
      obj.writeHttpMetadata(headers);
      headers.set('Cache-Control', 'public, max-age=31536000');
      headers.set('Access-Control-Allow-Origin', '*');
      return new Response(obj.body, { headers });
    }

    // GET /api/produto/:ref
    if (path.startsWith('/api/produto/') && method === 'GET') {
      const ref = decodeURIComponent(path.split('/api/produto/')[1]);
      const produto = await env.DB.prepare(
        `SELECT p.*, c.nome as categoria_nome FROM produtos p LEFT JOIN categorias c ON c.id = p.categoria_id WHERE p.ref = ?`
      ).bind(ref).first();
      if (!produto) return err('Produto não encontrado', 404);
      const variacoes = await env.DB.prepare(
        'SELECT * FROM variacoes_produto WHERE produto_id = ?'
      ).bind(produto.id).all();
      const imagens = await env.DB.prepare(
        'SELECT * FROM imagens_produto WHERE produto_id = ? ORDER BY ordem ASC'
      ).bind(produto.id).all();
      const baseUrl = new URL(request.url).origin;
      const imagensComUrl = imagens.results.map(img => ({
        ...img,
        url: `${baseUrl}/api/imagem/${img.r2_key}`,
      }));
      return json({ ...produto, variacoes: variacoes.results, imagens: imagensComUrl });
    }

    // POST /api/pedido
    if (path === '/api/pedido' && method === 'POST') {
      let body;
      try { body = await request.json(); } catch { return err('JSON inválido'); }

      const { nome_cliente, whatsapp, cidade, estado, endereco, observacoes, itens } = body;
      if (!nome_cliente || !whatsapp || !cidade || !estado || !itens?.length) {
        return err('Campos obrigatórios: nome_cliente, whatsapp, cidade, estado, itens');
      }

      // Calcular total
      let total = 0;
      const itensProcessados = [];
      for (const item of itens) {
        const variacao = await env.DB.prepare(
          'SELECT v.*, p.ref FROM variacoes_produto v JOIN produtos p ON p.id = v.produto_id WHERE v.id = ?'
        ).bind(item.variacao_id).first();
        if (!variacao || !variacao.disponivel || !variacao.preco) {
          return err(`Variação ${item.variacao_id} indisponível`);
        }
        const subtotal = variacao.preco * item.quantidade;
        total += subtotal;
        itensProcessados.push({ variacao, quantidade: item.quantidade, subtotal });
      }

      const codigo = await gerarCodigo(env.DB);

      // Inserir pedido
      const pedidoResult = await env.DB.prepare(
        `INSERT INTO pedidos (codigo, nome_cliente, whatsapp, cidade, estado, endereco, observacoes, total)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(codigo, nome_cliente, whatsapp, cidade, estado, endereco || '', observacoes || '', total).run();

      const pedidoId = pedidoResult.meta.last_row_id;

      // Inserir itens
      for (const { variacao, quantidade, subtotal } of itensProcessados) {
        await env.DB.prepare(
          `INSERT INTO itens_pedido (pedido_id, produto_id, variacao_id, ref, material, material_nome, quantidade, preco_unitario, subtotal)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
        ).bind(pedidoId, variacao.produto_id, variacao.id, variacao.ref, variacao.material, variacao.material_nome, quantidade, variacao.preco, subtotal).run();
      }

      // Enviar email (não bloqueia a resposta)
      const pedidoObj = { codigo, nome_cliente, whatsapp, cidade, estado, endereco, observacoes, total };
      const itensEmail = itensProcessados.map(({ variacao, quantidade, subtotal }) => ({
        ref: variacao.ref, material_nome: variacao.material_nome,
        quantidade, preco_unitario: variacao.preco, subtotal,
      }));
      env.ctx?.waitUntil(enviarEmailPedido(pedidoObj, itensEmail, env).catch(console.error));

      return json({ success: true, codigo, total });
    }

    // POST /api/admin/login
    if (path === '/api/admin/login' && method === 'POST') {
      let body;
      try { body = await request.json(); } catch { return err('JSON inválido'); }
      const { email, senha } = body;
      if (!email || !senha) return err('Email e senha obrigatórios');

      const admin = await env.DB.prepare('SELECT * FROM admin_users WHERE email = ?').bind(email).first();
      if (!admin) return err('Credenciais inválidas', 401);

      const ok = await verifyPassword(senha, admin.senha_hash);
      if (!ok) return err('Credenciais inválidas', 401);

      const token = await signJWT(
        { sub: admin.id, email: admin.email, exp: Math.floor(Date.now() / 1000) + 86400 },
        env.JWT_SECRET
      );
      return json({ token, email: admin.email });
    }

    // POST /api/admin/setup (cria admin inicial — só funciona se não existe nenhum)
    if (path === '/api/admin/setup' && method === 'POST') {
      const existing = await env.DB.prepare('SELECT COUNT(*) as cnt FROM admin_users').first();
      if (existing?.cnt > 0) return err('Admin já configurado', 409);
      const body = await request.json();
      const { email, senha } = body;
      if (!email || !senha) return err('Email e senha obrigatórios');
      const hash = await hashPassword(senha);
      await env.DB.prepare('INSERT INTO admin_users (email, senha_hash) VALUES (?, ?)').bind(email, hash).run();
      return json({ success: true });
    }

    // ── ADMIN ROUTES (autenticadas) ───────────────────────────

    if (path.startsWith('/api/admin/')) {
      const payload = await requireAuth(request, env);
      if (!payload) return err('Não autorizado', 401);

      // GET /api/admin/pedidos
      if (path === '/api/admin/pedidos' && method === 'GET') {
        const status = url.searchParams.get('status');
        let q = 'SELECT * FROM pedidos';
        const params = [];
        if (status) { q += ' WHERE status = ?'; params.push(status); }
        q += ' ORDER BY criado_em DESC LIMIT 100';
        const stmt = env.DB.prepare(q);
        const rows = params.length ? await stmt.bind(...params).all() : await stmt.all();
        return json(rows.results);
      }

      // GET /api/admin/pedido/:id
      if (path.match(/^\/api\/admin\/pedido\/\d+$/) && method === 'GET') {
        const id = path.split('/').pop();
        const pedido = await env.DB.prepare('SELECT * FROM pedidos WHERE id = ?').bind(id).first();
        if (!pedido) return err('Pedido não encontrado', 404);
        const itens = await env.DB.prepare('SELECT * FROM itens_pedido WHERE pedido_id = ?').bind(id).all();
        return json({ ...pedido, itens: itens.results });
      }

      // PATCH /api/admin/pedido/:id
      if (path.match(/^\/api\/admin\/pedido\/\d+$/) && method === 'PATCH') {
        const id = path.split('/').pop();
        const body = await request.json();
        const { status } = body;
        const valid = ['pendente', 'confirmado', 'enviado', 'cancelado'];
        if (!valid.includes(status)) return err('Status inválido');
        await env.DB.prepare('UPDATE pedidos SET status = ? WHERE id = ?').bind(status, id).run();
        return json({ success: true });
      }

      // GET /api/admin/produtos
      if (path === '/api/admin/produtos' && method === 'GET') {
        const rows = await env.DB.prepare(
          `SELECT p.*, c.nome as categoria_nome FROM produtos p LEFT JOIN categorias c ON c.id = p.categoria_id ORDER BY p.ref`
        ).all();
        return json(rows.results);
      }

      // POST /api/admin/produto
      if (path === '/api/admin/produto' && method === 'POST') {
        const body = await request.json();
        const { ref, categoria_id, nome, tamanho, espessura, pedido_minimo, imagem_url, variacoes } = body;
        if (!ref || !categoria_id) return err('ref e categoria_id obrigatórios');

        const r = await env.DB.prepare(
          `INSERT INTO produtos (ref, categoria_id, nome, tamanho, espessura, pedido_minimo, imagem_url)
           VALUES (?, ?, ?, ?, ?, ?, ?)`
        ).bind(ref, categoria_id, nome || null, tamanho || '', espessura || '', pedido_minimo || 15, imagem_url || null).run();
        const pid = r.meta.last_row_id;

        if (variacoes?.length) {
          for (const v of variacoes) {
            await env.DB.prepare(
              `INSERT INTO variacoes_produto (produto_id, material, material_nome, preco, disponivel) VALUES (?, ?, ?, ?, ?)`
            ).bind(pid, v.material, v.material_nome, v.preco || null, v.disponivel ? 1 : 0).run();
          }
        }
        return json({ success: true, id: pid }, 201);
      }

      // PUT /api/admin/produto/:id
      if (path.match(/^\/api\/admin\/produto\/\d+$/) && method === 'PUT') {
        const id = path.split('/').pop();
        const body = await request.json();
        const { nome, tamanho, espessura, pedido_minimo, ativo, variacoes } = body;

        await env.DB.prepare(
          `UPDATE produtos SET nome=?, tamanho=?, espessura=?, pedido_minimo=?, ativo=? WHERE id=?`
        ).bind(nome || null, tamanho || '', espessura || '', pedido_minimo || 15, ativo ?? 1, id).run();

        if (variacoes?.length) {
          for (const v of variacoes) {
            if (v.id) {
              // Variação existente → UPDATE
              await env.DB.prepare(
                `UPDATE variacoes_produto SET preco=?, disponivel=? WHERE id=?`
              ).bind(v.preco || null, v.disponivel ? 1 : 0, v.id).run();
            } else {
              // Variação nova → INSERT
              await env.DB.prepare(
                `INSERT OR IGNORE INTO variacoes_produto (produto_id, material, material_nome, preco, disponivel) VALUES (?, ?, ?, ?, ?)`
              ).bind(id, v.material, v.material_nome, v.preco || null, v.disponivel ? 1 : 0).run();
            }
          }
        }
        return json({ success: true });
      }

      // POST /api/admin/produto/:id/imagem — upload de imagem
      if (path.match(/^\/api\/admin\/produto\/\d+\/imagem$/) && method === 'POST') {
        const produtoId = path.split('/')[4];

        // Verificar limite de 5 imagens
        const count = await env.DB.prepare(
          'SELECT COUNT(*) as cnt FROM imagens_produto WHERE produto_id = ?'
        ).bind(produtoId).first();
        if (count?.cnt >= 5) return err('Limite de 5 imagens por produto atingido', 400);

        const formData = await request.formData();
        const file = formData.get('imagem');
        if (!file || !file.size) return err('Arquivo não enviado');

        // Validar tipo
        const tiposPermitidos = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
        if (!tiposPermitidos.includes(file.type)) return err('Tipo de arquivo não permitido. Use JPG, PNG, WebP ou GIF.');

        // Validar tamanho (5MB)
        if (file.size > 5 * 1024 * 1024) return err('Arquivo muito grande. Máximo 5MB.');

        const ext = file.name.split('.').pop() || 'jpg';
        const key = `produtos/${produtoId}/${Date.now()}.${ext}`;

        await env.IMAGES.put(key, file.stream(), {
          httpMetadata: { contentType: file.type },
        });

        // Salvar no banco
        const ordem = count?.cnt || 0;
        const result = await env.DB.prepare(
          'INSERT INTO imagens_produto (produto_id, r2_key, ordem) VALUES (?, ?, ?)'
        ).bind(produtoId, key, ordem).run();

        const baseUrl = new URL(request.url).origin;
        return json({
          success: true,
          id: result.meta.last_row_id,
          url: `${baseUrl}/api/imagem/${key}`,
          r2_key: key,
          ordem,
        }, 201);
      }

      // GET /api/admin/produto/:id/imagens — lista imagens
      if (path.match(/^\/api\/admin\/produto\/\d+\/imagens$/) && method === 'GET') {
        const produtoId = path.split('/')[4];
        const imagens = await env.DB.prepare(
          'SELECT * FROM imagens_produto WHERE produto_id = ? ORDER BY ordem ASC'
        ).bind(produtoId).all();
        const baseUrl = new URL(request.url).origin;
        return json(imagens.results.map(img => ({
          ...img,
          url: `${baseUrl}/api/imagem/${img.r2_key}`,
        })));
      }

      // DELETE /api/admin/imagem/:id — remove imagem
      if (path.match(/^\/api\/admin\/imagem\/\d+$/) && method === 'DELETE') {
        const imgId = path.split('/').pop();
        const img = await env.DB.prepare('SELECT * FROM imagens_produto WHERE id = ?').bind(imgId).first();
        if (!img) return err('Imagem não encontrada', 404);
        // Remover do R2
        await env.IMAGES.delete(img.r2_key);
        // Remover do banco
        await env.DB.prepare('DELETE FROM imagens_produto WHERE id = ?').bind(imgId).run();
        return json({ success: true });
      }

      // PUT /api/admin/imagem/:id/ordem — reordenar
      if (path.match(/^\/api\/admin\/imagem\/\d+\/ordem$/) && method === 'PUT') {
        const imgId = path.split('/')[4];
        const { ordem } = await request.json();
        await env.DB.prepare('UPDATE imagens_produto SET ordem = ? WHERE id = ?').bind(ordem, imgId).run();
        return json({ success: true });
      }

      // POST /api/admin/setup — moved outside auth block

      return err('Rota não encontrada', 404);
    }

    return err('Rota não encontrada', 404);
  },
};
