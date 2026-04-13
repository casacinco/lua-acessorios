# 🌙 Lua Acessórios — Site de Pedidos Atacado

Site completo de catálogo e pedidos atacado, hospedado 100% no Cloudflare.

## Stack
- **Frontend**: HTML/CSS/JS puro → Cloudflare Pages (deploy automático via GitHub)
- **Backend**: Cloudflare Workers (API)
- **Banco de dados**: Cloudflare D1 (SQLite)
- **E-mail**: Resend (notificações de pedido)
- **Código**: GitHub

---

## 🚀 Configuração Inicial (passo a passo)

### 1. Pré-requisitos
```bash
npm install -g wrangler
wrangler login
```

### 2. Criar o banco D1
```bash
wrangler d1 create lua-acessorios-db
```
Copie o `database_id` gerado e cole em `wrangler.toml`.

### 3. Aplicar o schema e dados iniciais
```bash
wrangler d1 execute lua-acessorios-db --file=schema.sql
wrangler d1 execute lua-acessorios-db --file=seed.sql
```

### 4. Configurar secrets
```bash
wrangler secret put RESEND_API_KEY
# Cole sua API key do resend.com

wrangler secret put JWT_SECRET
# Cole uma string aleatória longa (ex: gerada em https://generate-secret.vercel.app/64)
```

### 5. Deploy do Worker
```bash
cd worker
npm install
wrangler deploy
```
Anote a URL do Worker (ex: `https://lua-acessorios-api.SEU.workers.dev`).

### 6. Atualizar URL do Worker no frontend
Em `public/js/cart.js`, substitua `SEU_SUBDOMINIO` pela URL real do seu Worker.

### 7. Criar sua conta de admin
Após o deploy do Worker, chame uma vez:
```bash
curl -X POST https://SUA-WORKER-URL/api/admin/setup \
  -H "Content-Type: application/json" \
  -d '{"email":"luafotocorrosao@hotmail.com","senha":"SUA_SENHA_AQUI"}'
```
⚠️ Só funciona uma vez (se não houver admin cadastrado).

### 8. Conectar ao Cloudflare Pages via GitHub
1. Acesse [pages.cloudflare.com](https://pages.cloudflare.com)
2. "Create application" → "Connect to Git" → selecione este repositório
3. Build settings:
   - **Framework**: None
   - **Build command**: (deixe vazio)
   - **Build output**: `public`
4. Deploy!

A cada `git push` na branch `main`, o site atualiza automaticamente. ✅

---

## 📁 Estrutura do Projeto

```
├── public/               # Frontend (Cloudflare Pages)
│   ├── index.html        # Catálogo
│   ├── pedido.html       # Formulário de pedido
│   ├── obrigado.html     # Confirmação
│   ├── admin/
│   │   ├── login.html    # Login admin
│   │   ├── index.html    # Dashboard
│   │   ├── pedidos.html  # Gestão de pedidos
│   │   └── produtos.html # Gestão de produtos
│   ├── css/style.css     # Design system
│   └── js/
│       ├── cart.js       # Carrinho (localStorage)
│       ├── catalog.js    # Lógica do catálogo
│       └── admin.js      # Utilitários admin
├── worker/
│   └── src/index.js      # API (Cloudflare Worker)
├── schema.sql            # Schema do banco D1
├── seed.sql              # Dados iniciais (117 produtos)
└── wrangler.toml         # Configuração Cloudflare
```

---

## 📧 Configuração do Resend (e-mail)

1. Crie conta gratuita em [resend.com](https://resend.com)
2. Crie uma API Key
3. Configure via `wrangler secret put RESEND_API_KEY`

**Plano gratuito**: 3.000 e-mails/mês, 100/dia.

Para enviar do seu próprio domínio, adicione e verifique o domínio no Resend e altere o campo `from` em `worker/src/index.js`.

---

## 🔐 Área Admin

- URL: `https://seu-site.pages.dev/admin/login.html`
- E-mail: `luafotocorrosao@hotmail.com`
- Senha: a que você definiu no passo 7

**Funcionalidades:**
- Dashboard com contagem de pedidos por status
- Listagem de pedidos com detalhe e atualização de status
- Gestão de produtos (criar, editar, desativar)
- Importação em lote via CSV

---

## 📞 Contato

WhatsApp: (19) 98835-2022
