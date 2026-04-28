-- ============================================
-- LUA ACESSÓRIOS — Schema D1 (Cloudflare)
-- ============================================

CREATE TABLE IF NOT EXISTS categorias (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nome TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  ordem INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS produtos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ref TEXT UNIQUE NOT NULL,
  categoria_id INTEGER REFERENCES categorias(id),
  nome TEXT,
  tamanho TEXT,
  espessura TEXT,
  pedido_minimo INTEGER DEFAULT 15,
  imagem_url TEXT,
  ativo INTEGER DEFAULT 1,
  criado_em TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS variacoes_produto (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  produto_id INTEGER REFERENCES produtos(id),
  material TEXT NOT NULL,
  material_nome TEXT NOT NULL,
  preco REAL,
  disponivel INTEGER DEFAULT 1
);

CREATE TABLE IF NOT EXISTS pedidos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  codigo TEXT UNIQUE NOT NULL,
  nome_cliente TEXT NOT NULL,
  whatsapp TEXT NOT NULL,
  bairro TEXT,
  cidade TEXT NOT NULL,
  estado TEXT NOT NULL,
  cep TEXT,
  endereco TEXT,
  numero TEXT,
  documento TEXT,
  inscricao_estadual TEXT,
  observacoes TEXT,
  status TEXT DEFAULT 'pendente',
  total REAL,
  criado_em TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS itens_pedido (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  pedido_id INTEGER REFERENCES pedidos(id),
  produto_id INTEGER REFERENCES produtos(id),
  variacao_id INTEGER REFERENCES variacoes_produto(id),
  ref TEXT NOT NULL,
  material TEXT NOT NULL,
  material_nome TEXT NOT NULL,
  quantidade INTEGER NOT NULL,
  preco_unitario REAL NOT NULL,
  subtotal REAL NOT NULL
);

CREATE TABLE IF NOT EXISTS admin_users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  senha_hash TEXT NOT NULL,
  criado_em TEXT DEFAULT (datetime('now'))
);
