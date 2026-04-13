-- Migração: tabela de imagens por produto
CREATE TABLE IF NOT EXISTS imagens_produto (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  produto_id INTEGER NOT NULL REFERENCES produtos(id) ON DELETE CASCADE,
  r2_key TEXT NOT NULL,
  ordem INTEGER DEFAULT 0,
  criado_em DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_imagens_produto_id ON imagens_produto(produto_id);
