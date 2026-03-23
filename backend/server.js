const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
// Limite de 50MB para suportar fotos em base64
app.use(express.json({ limit: '50mb' }));

// Trata erro de payload muito grande com mensagem clara (evita stack trace no frontend)
app.use((err, req, res, next) => {
  if (err.type === 'entity.too.large' || err.status === 413 || (err.message && err.message.includes('entity too large'))) {
    return res.status(413).json({ error: 'Imagem muito grande. Tente uma foto menor ou use uma URL.' });
  }
  next(err);
});

// Estado em memória para piloto
let usuarios = []; // { id, nome, local }
let lanches = [];  // { id, donoId, nome, desc, foto }
let propostas = []; // { id, lancheId, donoId, entregaOpts, status, interessados: [], data }
let trocas = [];   // { id, aId, bId, lancheId, entrega, data, reacoes, comentarios }

function gerarId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

function acharUsuario(id) {
  return usuarios.find(u => u.id === id);
}

// Middleware de autenticação simples via cabeçalho x-user-id
function auth(req, res, next) {
  const userId = req.header('x-user-id');
  if (!userId) return res.status(401).json({ error: 'x-user-id obrigatório' });
  const user = acharUsuario(userId);
  if (!user) return res.status(401).json({ error: 'Usuário não encontrado' });
  req.user = user;
  next();
}

// --- Auth ---
app.post('/auth/login', (req, res) => {
  const { nome, local } = req.body || {};
  if (!nome || !local) {
    return res.status(400).json({ error: 'nome e local são obrigatórios' });
  }
  let user = usuarios.find(u => u.nome === nome && u.local === local);
  if (!user) {
    user = { id: gerarId(), nome, local };
    usuarios.push(user);
  } else {
    user.local = local;
  }
  res.json(user);
});

app.get('/me', auth, (req, res) => {
  res.json(req.user);
});

// --- Lanches ---
app.get('/lanches', auth, (req, res) => {
  const meus = lanches.filter(l => l.donoId === req.user.id);
  res.json(meus);
});

app.post('/lanches', auth, (req, res) => {
  const { nome, desc, foto } = req.body || {};
  if (!nome) return res.status(400).json({ error: 'nome é obrigatório' });
  const lanche = {
    id: gerarId(),
    donoId: req.user.id,
    nome,
    desc: desc || '',
    foto: foto || null
  };
  lanches.push(lanche);
  // cria proposta aberta para este lanche
  const prop = {
    id: gerarId(),
    lancheId: lanche.id,
    donoId: req.user.id,
    entregaOpts: ['🛵 Motoboy', '🚶 Deslocamento'],
    status: 'aberta',
    interessados: [],
    data: new Date().toLocaleDateString('pt-BR')
  };
  propostas.push(prop);
  res.status(201).json({ lanche, proposta: mapPropostaParaFront(prop) });
});

app.put('/lanches/:id', auth, (req, res) => {
  const lanche = lanches.find(l => l.id === req.params.id && l.donoId === req.user.id);
  if (!lanche) return res.status(404).json({ error: 'Lanche não encontrado' });
  const { nome, desc, foto } = req.body || {};
  if (!nome) return res.status(400).json({ error: 'nome é obrigatório' });
  lanche.nome = nome;
  lanche.desc = desc || '';
  lanche.foto = foto || null;
  // sincroniza proposta vinculada
  const prop = propostas.find(p => p.lancheId === lanche.id && p.donoId === req.user.id);
  if (prop) {
    prop.status = 'aberta';
    prop.data = new Date().toLocaleDateString('pt-BR');
  }
  res.json(lanche);
});

app.delete('/lanches/:id', auth, (req, res) => {
  const before = lanches.length;
  lanches = lanches.filter(l => !(l.id === req.params.id && l.donoId === req.user.id));
  propostas = propostas.filter(p => !(p.lancheId === req.params.id && p.donoId === req.user.id));
  if (lanches.length === before) return res.status(404).json({ error: 'Lanche não encontrado' });
  res.status(204).end();
});

// --- Propostas ---
function mapPropostaParaFront(p) {
  const dono = acharUsuario(p.donoId);
  const lanche = lanches.find(l => l.id === p.lancheId);
  return {
    id: p.id,
    lancheId: p.lancheId,
    autorNome: dono?.nome || 'Desconhecido',
    autorLocal: dono?.local || '',
    lanche: lanche?.nome || '',
    desc: lanche?.desc || '',
    foto: lanche?.foto || null,
    entregaOpts: p.entregaOpts,
    status: p.status,
    interessados: p.interessados.map(i => ({
      usuarioId: i.usuarioId,
      nome: acharUsuario(i.usuarioId)?.nome || i.nomeAnon || 'Desconhecido',
      local: acharUsuario(i.usuarioId)?.local || '',
      entrega: i.entrega,
      msg: i.msg || '',
      mensagens: (() => {
        const msgs = i.mensagens || [];
        const arr = msgs.length ? msgs : (i.msg ? [{ usuarioId: i.usuarioId, texto: i.msg, data: '' }] : []);
        return arr.map(m => ({
          usuarioId: m.usuarioId,
          autor: acharUsuario(m.usuarioId)?.nome || 'Desconhecido',
          texto: m.texto,
          data: m.data || ''
        }));
      })()
    })),
    data: p.data
  };
}

app.get('/propostas', (req, res) => {
  const abertas = propostas.filter(p => p.status === 'aberta');
  res.json(abertas.map(mapPropostaParaFront));
});

app.post('/propostas/:id/interesse', auth, (req, res) => {
  const prop = propostas.find(p => p.id === req.params.id && p.status === 'aberta');
  if (!prop) return res.status(404).json({ error: 'Proposta não encontrada' });
  const { entrega, msg } = req.body || {};
  if (!entrega) return res.status(400).json({ error: 'entrega é obrigatória' });
  // evita duplicado
  if (prop.interessados.some(i => i.usuarioId === req.user.id)) {
    return res.status(400).json({ error: 'Já existe interesse deste usuário' });
  }
  prop.interessados.push({
    usuarioId: req.user.id,
    entrega,
    msg: msg || '',
    mensagens: (msg ? [{ usuarioId: req.user.id, texto: msg, data: new Date().toLocaleString('pt-BR') }] : [])
  });
  res.status(201).json(mapPropostaParaFront(prop));
});

app.post('/propostas/:id/mensagem', auth, (req, res) => {
  const prop = propostas.find(p => p.id === req.params.id && p.status === 'aberta');
  if (!prop) return res.status(404).json({ error: 'Proposta não encontrada' });
  const { interessadoId, texto } = req.body || {};
  if (!interessadoId || !texto || !texto.trim()) {
    return res.status(400).json({ error: 'interessadoId e texto são obrigatórios' });
  }
  const interessado = prop.interessados.find(i => i.usuarioId === interessadoId);
  if (!interessado) return res.status(400).json({ error: 'Interessado inválido' });
  const isDono = prop.donoId === req.user.id;
  const isInteressado = interessado.usuarioId === req.user.id;
  if (!isDono && !isInteressado) {
    return res.status(403).json({ error: 'Apenas o dono ou o interessado podem enviar mensagens' });
  }
  if (!interessado.mensagens) interessado.mensagens = [];
  if (interessado.mensagens.length === 0 && interessado.msg) {
    interessado.mensagens.push({ usuarioId: interessado.usuarioId, texto: interessado.msg, data: new Date().toLocaleString('pt-BR') });
  }
  interessado.mensagens.push({
    usuarioId: req.user.id,
    texto: texto.trim(),
    data: new Date().toLocaleString('pt-BR')
  });
  res.json(mapPropostaParaFront(prop));
});

app.post('/propostas/:id/recusar', auth, (req, res) => {
  const prop = propostas.find(p => p.id === req.params.id && p.donoId === req.user.id);
  if (!prop) return res.status(404).json({ error: 'Proposta não encontrada' });
  const { interessadoId } = req.body || {};
  prop.interessados = prop.interessados.filter(i => i.usuarioId !== interessadoId);
  res.json(mapPropostaParaFront(prop));
});

app.post('/propostas/:id/aceitar', auth, (req, res) => {
  const prop = propostas.find(p => p.id === req.params.id && p.donoId === req.user.id);
  if (!prop) return res.status(404).json({ error: 'Proposta não encontrada' });
  const { interessadoId } = req.body || {};
  const interessado = prop.interessados.find(i => i.usuarioId === interessadoId);
  if (!interessado) return res.status(400).json({ error: 'Interessado inválido' });
  const lanche = lanches.find(l => l.id === prop.lancheId);
  const troca = {
    id: gerarId(),
    aId: req.user.id,
    bId: interessadoId,
    lancheId: prop.lancheId,
    entrega: interessado.entrega,
    data: new Date().toLocaleDateString('pt-BR'),
    reacoes: { '😍': [], '👏': [], '🔥': [], '😋': [] },
    comentarios: []
  };
  trocas.unshift(troca);
  prop.status = 'fechada';
  res.status(201).json(mapTrocaParaFront(troca, lanche));
});

// --- Feed / Trocas ---
function mapTrocaParaFront(t, lancheOpt) {
  const a = acharUsuario(t.aId);
  const b = acharUsuario(t.bId);
  const lanche = lancheOpt || lanches.find(l => l.id === t.lancheId);
  return {
    id: t.id,
    a: a?.nome || 'Desconhecido',
    aLocal: a?.local || '',
    b: b?.nome || 'Desconhecido',
    bLocal: b?.local || '',
    lanche: lanche?.nome || '',
    desc: lanche?.desc || '',
    foto: lanche?.foto || null,
    entrega: t.entrega,
    data: t.data,
    reacoes: t.reacoes,
    comentarios: t.comentarios.map(c => ({
      autor: acharUsuario(c.usuarioId)?.nome || 'Desconhecido',
      texto: c.texto,
      data: c.data
    }))
  };
}

app.get('/feed', (req, res) => {
  const lista = trocas.map(t => mapTrocaParaFront(t));
  res.json(lista);
});

app.post('/feed/:id/reagir', auth, (req, res) => {
  const { emoji } = req.body || {};
  if (!emoji) return res.status(400).json({ error: 'emoji é obrigatório' });
  const t = trocas.find(x => x.id === req.params.id);
  if (!t) return res.status(404).json({ error: 'Troca não encontrada' });
  if (!t.reacoes[emoji]) t.reacoes[emoji] = [];
  const lista = t.reacoes[emoji];
  const idx = lista.indexOf(req.user.id);
  if (idx >= 0) lista.splice(idx, 1);
  else lista.push(req.user.id);
  res.json(mapTrocaParaFront(t));
});

app.post('/feed/:id/comentar', auth, (req, res) => {
  const { texto } = req.body || {};
  if (!texto) return res.status(400).json({ error: 'texto é obrigatório' });
  const t = trocas.find(x => x.id === req.params.id);
  if (!t) return res.status(404).json({ error: 'Troca não encontrada' });
  if (req.user.id !== t.aId && req.user.id !== t.bId) {
    return res.status(403).json({ error: 'Apenas participantes podem comentar' });
  }
  t.comentarios.push({
    usuarioId: req.user.id,
    texto,
    data: new Date().toLocaleDateString('pt-BR')
  });
  res.status(201).json(mapTrocaParaFront(t));
});

app.get('/', (req, res) => {
  res.json({ status: 'ok', message: 'TrocaLanches API' });
});

// Serve frontend (index.html e assets) para E2E e desenvolvimento
app.use(express.static(path.join(__dirname, '..')));

function resetState() {
  usuarios.length = 0;
  lanches.length = 0;
  propostas.length = 0;
  trocas.length = 0;
}

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`TrocaLanches API ouvindo em http://localhost:${PORT}`);
  });
}

module.exports = app;
module.exports.resetState = resetState;

