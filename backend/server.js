require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { gerarJWT } = require('./src/utils/jwt');

// Serviços Supabase
const { authMiddleware, optionalAuth } = require('./src/middlewares/auth');
const { createOrUpdateUser, getUserProfile, getUserById, getUserByNomeLocal } = require('./src/services/usersService');
const { createLanche, getLanchesByUser, getLancheById, updateLanche, deleteLanche, getAllLanches } = require('./src/services/lanchesService');
const { 
  getPropostasAbertas, 
  getPropostasDoUsuario, 
  getPropostaById,
  adicionarInteresse,
  removerInteresse,
  aceitarInteresse,
  rejeitarInteresse,
  adicionarMensagem 
} = require('./src/services/propostaService');
const {
  getTrocas,
  getTrocaById,
  getTrocasDoUsuario,
  adicionarReacao,
  removerReacao,
  adicionarComentario,
  removerComentario
} = require('./src/services/trocaService');

const app = express();
const PORT = process.env.PORT || 3000;

// ====== MIDDLEWARE ======
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Trata erro de payload muito grande
app.use((err, req, res, next) => {
  if (err.type === 'entity.too.large' || err.status === 413 || (err.message && err.message.includes('entity too large'))) {
    return res.status(413).json({ error: 'Imagem muito grande. Tente uma foto menor ou use uma URL.' });
  }
  next(err);
});

// ====== HEALTH CHECK ======
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'TrocaLanches API (Supabase)', 
    timestamp: new Date().toISOString() 
  });
});

// ====== AUTH ======
/**
 * POST /auth/login
 * Body: { nome, local }
 * Retorna: { id, nome, local, token }
 */
app.post('/auth/login', async (req, res) => {
  try {
    const { nome, local } = req.body || {};
    
    if (!nome || !local) {
      return res.status(400).json({ error: 'Nome e local são obrigatórios' });
    }

    const nomeTrim = nome.trim();
    const localTrim = local.trim();
    const existente = await getUserByNomeLocal(nomeTrim, localTrim);
    const userId = existente ? existente.id : uuidv4();

    const user = await createOrUpdateUser(userId, nomeTrim, localTrim);
    
    // Gera JWT para produção
    const token = gerarJWT(userId);
    
    res.status(201).json({
      ...user,
      token // Retorna token JWT
    });
  } catch (err) {
    console.error('[Login Error]', err);
    res.status(500).json({ error: err.message || 'Erro ao fazer login' });
  }
});

/**
 * POST /auth/refresh
 * Requer: Authorization: Bearer <token>
 * Retorna: { token: <novo-token> }
 */
app.post('/auth/refresh', authMiddleware, (req, res) => {
  try {
    const newToken = gerarJWT(req.user.id);
    res.json({ token: newToken });
  } catch (err) {
    console.error('[Refresh Error]', err);
    res.status(500).json({ error: 'Erro ao renovar token' });
  }
});

/**
 * GET /me
 * Requer: x-user-id header
 * Retorna: Dados do usuário autenticado
 */
app.get('/me', authMiddleware, (req, res) => {
  res.json(req.user);
});

// ====== LANCHES ======
/**
 * GET /lanches
 * Lista todos os lanches do usuário autenticado
 */
app.get('/lanches', authMiddleware, async (req, res) => {
  try {
    const lanches = await getLanchesByUser(req.user.id);
    res.json(lanches);
  } catch (err) {
    console.error('[Get Lanches Error]', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /lanches
 * Cria novo lanche (e proposta automaticamente)
 * Body: { nome, descricao?, foto? }
 */
app.post('/lanches', authMiddleware, async (req, res) => {
  try {
    const { nome, descricao, foto, desc } = req.body || {};
    const descricaoFinal = descricao ?? desc;
    
    if (!nome) {
      return res.status(400).json({ error: 'Nome é obrigatório' });
    }

    const { lanche, proposta } = await createLanche(
      req.user.id,
      nome,
      descricaoFinal,
      foto
    );

    res.status(201).json({ lanche, proposta });
  } catch (err) {
    console.error('[Create Lanche Error]', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * PUT /lanches/:id
 * Atualiza lanche (apenas o dono)
 */
app.put('/lanches/:id', authMiddleware, async (req, res) => {
  try {
    const { nome, descricao, foto, desc } = req.body || {};
    const descricaoFinal = descricao ?? desc;
    
    if (!nome) {
      return res.status(400).json({ error: 'Nome é obrigatório' });
    }

    const lanche = await updateLanche(req.params.id, req.user.id, {
      nome,
      descricao: descricaoFinal,
      foto
    });

    res.json(lanche);
  } catch (err) {
    console.error('[Update Lanche Error]', err);
    
    if (err.message.includes('não encontrado')) {
      return res.status(404).json({ error: err.message });
    }
    if (err.message.includes('Permissão')) {
      return res.status(403).json({ error: err.message });
    }
    
    res.status(500).json({ error: err.message });
  }
});

/**
 * DELETE /lanches/:id
 * Deleta lanche (apenas o dono)
 */
app.delete('/lanches/:id', authMiddleware, async (req, res) => {
  try {
    await deleteLanche(req.params.id, req.user.id);
    res.status(204).end();
  } catch (err) {
    console.error('[Delete Lanche Error]', err);
    
    if (err.message.includes('não encontrado')) {
      return res.status(404).json({ error: err.message });
    }
    if (err.message.includes('Permissão')) {
      return res.status(403).json({ error: err.message });
    }
    
    res.status(500).json({ error: err.message });
  }
});

// ====== PROPOSTAS ======
/**
 * GET /propostas
 * Lista todas as propostas abertas
 */
app.get('/propostas', optionalAuth, async (req, res) => {
  try {
    const propostas = await getPropostasAbertas();
    res.json(propostas);
  } catch (err) {
    console.error('[Get Propostas Error]', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /propostas/:id/interesse
 * Adiciona interesse em uma proposta
 * Body: { entrega, mensagem? }
 */
app.post('/propostas/:id/interesse', authMiddleware, async (req, res) => {
  try {
    const { entrega, mensagem, msg } = req.body || {};
    const mensagemFinal = mensagem ?? msg ?? '';
    
    if (!entrega) {
      return res.status(400).json({ error: 'Forma de entrega é obrigatória' });
    }

    await adicionarInteresse(req.params.id, req.user.id, entrega, mensagemFinal);
    const proposta = await getPropostaById(req.params.id);

    res.status(201).json(proposta);
  } catch (err) {
    console.error('[Add Interesse Error]', err);
    
    if (err.message.includes('já tem interesse')) {
      return res.status(400).json({ error: err.message });
    }
    
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /propostas/:id/remover-interesse
 * Remove interesse em uma proposta
 */
app.post('/propostas/:id/remover-interesse', authMiddleware, async (req, res) => {
  try {
    await removerInteresse(req.params.id, req.user.id);
    const proposta = await getPropostaById(req.params.id);
    res.json(proposta);
  } catch (err) {
    console.error('[Remove Interesse Error]', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /propostas/:id/mensagem
 * Adiciona mensagem a uma proposta
 * Body: { interessadoId, texto }
 */
app.post('/propostas/:id/mensagem', authMiddleware, async (req, res) => {
  try {
    const { interessadoId, texto } = req.body || {};
    if (!interessadoId || !texto?.trim()) {
      return res.status(400).json({ error: 'interessadoId e texto são obrigatórios' });
    }
    const proposta = await adicionarMensagem(req.params.id, req.user.id, interessadoId, texto.trim());
    res.json(proposta);
  } catch (err) {
    console.error('[Add Mensagem Error]', err);
    if (err.message.includes('Permissão')) return res.status(403).json({ error: err.message });
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /propostas/:id/aceitar
 * Aceita um interesse (apenas dono da proposta)
 * Body: { interessadoId }
 */
app.post('/propostas/:id/aceitar', authMiddleware, async (req, res) => {
  try {
    const { interessadoId } = req.body || {};
    
    if (!interessadoId) {
      return res.status(400).json({ error: 'interessadoId é obrigatório' });
    }

    const troca = await aceitarInteresse(req.params.id, req.user.id, interessadoId);

    res.status(201).json(troca);
  } catch (err) {
    console.error('[Accept Interesse Error]', err);
    
    if (err.message.includes('Permissão')) {
      return res.status(403).json({ error: err.message });
    }
    
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /propostas/:id/rejeitar
 * Rejeita um interesse (apenas dono da proposta)
 * Body: { interessadoId }
 */
app.post('/propostas/:id/rejeitar', authMiddleware, async (req, res) => {
  try {
    const { interessadoId } = req.body || {};
    
    if (!interessadoId) {
      return res.status(400).json({ error: 'interessadoId é obrigatório' });
    }

    await rejeitarInteresse(req.params.id, req.user.id, interessadoId);
    const proposta = await getPropostaById(req.params.id);

    res.json(proposta);
  } catch (err) {
    console.error('[Reject Interesse Error]', err);
    res.status(500).json({ error: err.message });
  }
});

// ====== FEED / TROCAS ======
/**
 * GET /feed
 * Lista todas as trocas (feed)
 */
app.get('/feed', optionalAuth, async (req, res) => {
  try {
    const trocas = await getTrocas();
    res.json(trocas);
  } catch (err) {
    console.error('[Get Feed Error]', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /feed/:id/reagir
 * Adiciona reação a uma troca
 * Body: { emoji }
 */
app.post('/feed/:id/reagir', authMiddleware, async (req, res) => {
  try {
    const { emoji } = req.body || {};
    
    if (!emoji) {
      return res.status(400).json({ error: 'Emoji é obrigatório' });
    }

    const troca = await adicionarReacao(req.params.id, req.user.id, emoji);
    res.json(troca);
  } catch (err) {
    console.error('[Add Reacao Error]', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /feed/:id/comentar
 * Adiciona comentário a uma troca (apenas participantes)
 * Body: { texto }
 */
app.post('/feed/:id/comentar', authMiddleware, async (req, res) => {
  try {
    const { texto } = req.body || {};
    
    if (!texto) {
      return res.status(400).json({ error: 'Texto é obrigatório' });
    }

    await adicionarComentario(req.params.id, req.user.id, texto);
    const troca = await getTrocaById(req.params.id);

    res.status(201).json(troca);
  } catch (err) {
    console.error('[Add Comentario Error]', err);
    
    if (err.message.includes('Permissão')) {
      return res.status(403).json({ error: err.message });
    }
    
    res.status(500).json({ error: err.message });
  }
});

// ====== STATIC FILES ======
// Serve frontend
app.use(express.static(path.join(__dirname, '..')));

// ====== ERROR HANDLER ======
app.use((req, res) => {
  res.status(404).json({ error: 'Rota não encontrada' });
});

// ====== START SERVER ======
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`🚀 TrocaLanches API rodando em http://localhost:${PORT}`);
    console.log(`📦 Supabase conectado: ${process.env.SUPABASE_URL}`);
  });
}

// Export app para testes
module.exports = app;

