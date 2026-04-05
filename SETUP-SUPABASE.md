# SETUP SUPABASE - Guia Passo a Passo

## 1️⃣ OBTER CREDENCIAIS SUPABASE

1. Acesse: https://app.supabase.com/
2. Clique no seu projeto: `dergtdpqjczigbvvsbzu`
3. Vá para **Settings** → **API**
4. Copie:
   - **Project URL**: `https://dergtdpqjczigbvvsbzu.supabase.co`
   - **Anon Key** (pública): `eyJhbG...` (commanda com `eyJ`)
   - **Service Role Key** (privada): `eyJhbG...` (comando com `eyJ`, role maior)
5. Vá para **Settings** → **Database** → Copie a senha do banco

## 2️⃣ CONFIGURAR .env

1. Crie o arquivo `.env` na raiz do projeto (copie de `.env.example`)
2. Preencha com seus dados:
   ```
   SUPABASE_URL=https://dergtdpqjczigbvvsbzu.supabase.co
   SUPABASE_ANON_KEY=eyJhbG...seu-anon-key...
   SUPABASE_SERVICE_ROLE_KEY=eyJhbG...seu-service-role-key...
   DATABASE_URL=postgresql://postgres:SUA_SENHA@db.dergtdpqjczigbvvsbzu.supabase.co:5432/postgres
   NODE_ENV=development
   PORT=3000
   ```

## 3️⃣ CRIAR TABELAS NO SUPABASE

1. No Dashboard Supabase, vá para **SQL Editor**
2. Clique em **New Query**
3. Copie TODO o conteúdo de `scripts/00-init-database.sql`
4. Cole no editor
5. Clique em **RUN**
6. Aguarde até aparecer ✅ (deve levar 10-30 segundos)

### ✅ Se tudo OK:
- Você verá os nomes das tabelas criadas
- Acesse **Database** → **Tables** e verá:
  - `public.users`
  - `public.lanches`
  - `public.propostas`
  - `public.trocas`
  - `public.audit_logs`

## 4️⃣ CONFIGURAR STORAGE PARA FOTOS (Opcional por enquanto)

1. Vá para **Storage** → **New Bucket**
2. Nome: `lanches-fotos`
3. Marque: **Public bucket** ✅
4. Click **Create bucket**

## 5️⃣ TESTAR CONEXÃO

Depois de instalar `npm install`, rode:

```bash
npm run test:supabase
```

Ou manualmente com Node.js:

```bash
node -e "
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);
supabase.from('users').select('*').then(r => console.log(r));
"
```

---

## PRÓXIMOS PASSOS

Depois que confirmar que as tabelas foram criadas:
1. Instalar dependências: `npm install`
2. Refatorar backend para usar Supabase
3. Implementar autenticação com JWT
4. Testar tudo

---

## 🆘 Troubleshooting

### Erro: "relation does not exist"
→ Reexecute o SQL, certifique-se de que rode até o final

### Erro: "permission denied"
→ Use **Service Role Key** em vez de Anon Key

### Erro: "invalid JWT"
→ Chave copiada errado, copie novamente do Dashboard

### Dados não aparecem em Tables
→ Atualize a página (F5) e volte para SQL Editor
