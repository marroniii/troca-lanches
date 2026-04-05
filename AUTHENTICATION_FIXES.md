# Correções de Autenticação - Opção B

## ✅ O Que Foi Feito

### 1. Instalado `jsonwebtoken`
- Substituir JWT manual por library profissional
- Mais seguro e confiável

### 2. Reescrito `backend/src/utils/jwt.js`
**Mudanças:**
- De: JWT manual com base64 (vulnerável a timing attack)
- Para: `jsonwebtoken` library (HS256, profissional)
- Função `gerarJWT(userId)` - retorna token válido por 24h
- Função `validarJWT(token)` - valida usando crypto profissional

### 3. Corrigido `backend/src/middlewares/auth.js`
**Problem: Fallback confuso**
```javascript
// ANTES: Se JWT inválido, retornava 401 direto
try {
  const jwtPayload = validarJWT(token);
} catch (jwtErr) {
  return res.status(401).json({ error: 'Token JWT inválido' }); // ❌ Não tenta fallback
}
```

**DEPOIS: Tenta fallback para x-user-id**
```javascript
try {
  const jwtPayload = validarJWT(token);
  userId = jwtPayload.sub;
} catch (jwtErr) {
  // Não retorna erro aqui - tenta fallback
}

// Tenta x-user-id se JWT falhou
if (!userId) {
  userId = req.header('x-user-id');
}
```

### 4. Corrigido `optionalAuth` 
**ANTES:** Só validava `x-user-id`, não tentava JWT

**DEPOIS:** 
- Tenta JWT primeiro
- Fallback para `x-user-id`
- Não falha se nenhum funcionar (é opcional)

### 5. Consolidado Rotas de Auth
- `backend/src/routes/auth.js` antigo → renomeado para `auth.js.old`
- Todas as rotas agora em `backend/server.js`
- Sem conflitos duplicados

## 🔄 Fluxo Esperado (Após Correções)

```
POST /auth/login { nome, local }
  ↓
Cria usuário no Supabase
  ↓
Gera JWT com jsonwebtoken
  ↓
Retorna: { id, nome, local, token }

Requisição posterior com token:
Authorization: Bearer <token>
  ↓
authMiddleware valida JWT
  ↓
Se JWT falhar, tenta fallback x-user-id
  ↓
Carrega user do banco
  ↓
Executa rota protegida
```

## ❌ Problema Encontrado

Ao testar:
```bash
node backend/server.js
```

✓ Servidor inicia sem erros
✓ Health check funciona
❌ **Requisição POST /auth/login não retorna resposta (fica travada)**

Sintoma: 
- Terminal não mostra erro
- Request fica pendente
- Nenhuma saída de log visível

## 📋 Informações para Debug

**Arquivos Modificados:**
- `backend/src/utils/jwt.js` - Reescrito com jsonwebtoken
- `backend/src/middlewares/auth.js` - Fallback corrigido
- `backend/src/routes/auth.js` - Renomeado para .old

**Nova Dependência:**
- `jsonwebtoken` instalado

**Possíveis Causas do Error:**
1. Erro silencioso no `createOrUpdateUser()` quando cria user no Supabase
2. Promise não resolvida de forma correta
3. Erro de conexão Supabase não capturado
4. Worker threads bloqueadas

## 🧪 Como Testar (Quando Fizer Debug)

```bash
# Terminal 1
node backend/server.js

# Terminal 2
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"nome":"TestUser","local":"TestLocal"}'

# Esperado: { id, nome, local, token }
```

## 📝 Checklist Para Próximos Passos

- [ ] Adicionar logs detalhados em `createOrUpdateUser()`
- [ ] Verificar se Promise está resolvendo
- [ ] Testar conexão Supabase direto
- [ ] Verificar se há erro 500 silencioso
- [ ] Considerar usar `npm run test:api` para testar

---

**Status:** Opção B implementada, porém necessário debug do fluxo de dados
