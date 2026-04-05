module.exports = function propostasRouter({ propostas, trocas, lanches, gerarId, authMiddleware, mapPropostaParaFront, mapTrocaParaFront, acharUsuario }) {
  const router = require('express').Router();

  router.get('/propostas', (req, res) => {
    const abertas = propostas.filter(p => p.status === 'aberta');
    res.json(abertas.map(p => mapPropostaParaFront(p, acharUsuario, lanches)));
  });

  router.post('/propostas/:id/interesse', authMiddleware, (req, res) => {
    const prop = propostas.find(p => p.id === req.params.id && p.status === 'aberta');
    if (!prop) return res.status(404).json({ error: 'Proposta não encontrada' });
    const { entrega, msg } = req.body || {};
    if (!entrega) return res.status(400).json({ error: 'entrega é obrigatória' });
    if (prop.interessados.some(i => i.usuarioId === req.user.id)) {
      return res.status(400).json({ error: 'Já existe interesse deste usuário' });
    }
    prop.interessados.push({
      usuarioId: req.user.id,
      entrega,
      msg: msg || '',
      mensagens: (msg ? [{ usuarioId: req.user.id, texto: msg, data: new Date().toLocaleString('pt-BR') }] : [])
    });
    res.status(201).json(mapPropostaParaFront(prop, acharUsuario, lanches));
  });

  router.post('/propostas/:id/mensagem', authMiddleware, (req, res) => {
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
      data: new Date().toLocaleDateString('pt-BR')
    });
    res.json(mapPropostaParaFront(prop, acharUsuario, lanches));
  });

  router.post('/propostas/:id/recusar', authMiddleware, (req, res) => {
    const prop = propostas.find(p => p.id === req.params.id && p.donoId === req.user.id);
    if (!prop) return res.status(404).json({ error: 'Proposta não encontrada' });
    const { interessadoId } = req.body || {};
    prop.interessados = prop.interessados.filter(i => i.usuarioId !== interessadoId);
    res.json(mapPropostaParaFront(prop, acharUsuario, lanches));
  });

  router.post('/propostas/:id/aceitar', authMiddleware, (req, res) => {
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
    res.status(201).json(mapTrocaParaFront(troca, acharUsuario, lanches, lanche));
  });

  return router;
};