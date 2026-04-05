module.exports = function lanchesRouter({ lanches, propostas, gerarId, authMiddleware, mapPropostaParaFront, createLanche }) {
  const router = require('express').Router();

  router.get('/lanches', authMiddleware, (req, res) => {
    const meus = lanches.filter(l => l.donoId === req.user.id);
    res.json(meus);
  });

  router.post('/lanches', authMiddleware, (req, res) => {
    const { nome, desc, foto } = req.body || {};
    const { lanche, proposta } = createLanche(req.user.id, nome, desc, foto, lanches, propostas, gerarId, mapPropostaParaFront);
    res.status(201).json({ lanche, proposta });
  });

  router.put('/lanches/:id', authMiddleware, (req, res) => {
    const lanche = lanches.find(l => l.id === req.params.id && l.donoId === req.user.id);
    if (!lanche) return res.status(404).json({ error: 'Lanche não encontrado' });
    const { nome, desc, foto } = req.body || {};
    if (!nome) return res.status(400).json({ error: 'nome é obrigatório' });
    lanche.nome = nome;
    lanche.desc = desc || '';
    lanche.foto = foto || null;
    const prop = propostas.find(p => p.lancheId === lanche.id && p.donoId === req.user.id);
    if (prop) {
      prop.status = 'aberta';
      prop.data = new Date().toLocaleDateString('pt-BR');
    }
    res.json(lanche);
  });

  router.delete('/lanches/:id', authMiddleware, (req, res) => {
    const before = lanches.length;
    for (let i = lanches.length - 1; i >= 0; i--) {
      if (lanches[i].id === req.params.id && lanches[i].donoId === req.user.id) {
        lanches.splice(i, 1);
      }
    }
    for (let i = propostas.length - 1; i >= 0; i--) {
      if (propostas[i].lancheId === req.params.id && propostas[i].donoId === req.user.id) {
        propostas.splice(i, 1);
      }
    }
    if (lanches.length === before) return res.status(404).json({ error: 'Lanche não encontrado' });
    res.status(204).end();
  });

  return router;
};