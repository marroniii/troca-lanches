/**
 * Testes de API — TrocaLanches
 * Garantem usabilidade, segurança e que o app entrega o que promete.
 */
const { describe, it, before, after } = require('node:test');
const assert = require('node:assert');
const request = require('supertest');

process.env.NODE_ENV = 'test';
const app = require('../backend/server');
const resetState = app.resetState;

describe('TrocaLanches API', () => {
  before(() => resetState());
  after(() => resetState());

  describe('1. Health / Raiz', () => {
    it('GET / retorna status ok', async () => {
      const res = await request(app).get('/');
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.status, 'ok');
      assert.ok(res.body.message?.includes('TrocaLanches'));
    });
  });

  describe('2. Autenticação (Auth)', () => {
    it('POST /auth/login cria usuário com nome e local válidos', async () => {
      const res = await request(app)
        .post('/auth/login')
        .send({ nome: 'João Silva', local: 'Hamburgueria' });
      assert.strictEqual(res.status, 200);
      assert.ok(res.body.id);
      assert.strictEqual(res.body.nome, 'João Silva');
      assert.strictEqual(res.body.local, 'Hamburgueria');
    });

    it('POST /auth/login rejeita sem nome', async () => {
      const res = await request(app)
        .post('/auth/login')
        .send({ local: 'Pizzaria' });
      assert.strictEqual(res.status, 400);
      assert.ok(res.body.error);
    });

    it('POST /auth/login rejeita sem local', async () => {
      const res = await request(app)
        .post('/auth/login')
        .send({ nome: 'Maria' });
      assert.strictEqual(res.status, 400);
    });

    it('POST /auth/login reutiliza usuário existente (mesmo nome+local)', async () => {
      await request(app).post('/auth/login').send({ nome: 'Ana Costa', local: 'Padaria' });
      const res = await request(app).post('/auth/login').send({ nome: 'Ana Costa', local: 'Padaria' });
      assert.strictEqual(res.status, 200);
      assert.ok(res.body.id);
    });
  });

  describe('3. Segurança — rotas autenticadas', () => {
    it('GET /lanches sem x-user-id retorna 401', async () => {
      const res = await request(app).get('/lanches');
      assert.strictEqual(res.status, 401);
      assert.ok(res.body.error);
    });

    it('GET /lanches com user-id inexistente retorna 401', async () => {
      const res = await request(app)
        .get('/lanches')
        .set('x-user-id', 'id-que-nao-existe');
      assert.strictEqual(res.status, 401);
    });

    it('GET /me sem x-user-id retorna 401', async () => {
      const res = await request(app).get('/me');
      assert.strictEqual(res.status, 401);
    });
  });

  describe('4. Lanches — CRUD completo', () => {
    let userA, userB;
    before(async () => {
      resetState();
      const rA = await request(app).post('/auth/login').send({ nome: 'Dono A', local: 'Hamburgueria' });
      const rB = await request(app).post('/auth/login').send({ nome: 'Dono B', local: 'Pizzaria' });
      userA = rA.body;
      userB = rB.body;
    });

    it('POST /lanches cria lanche e proposta associada', async () => {
      const res = await request(app)
        .post('/lanches')
        .set('x-user-id', userA.id)
        .send({ nome: 'X-Burger Especial', desc: 'Com queijo', foto: null });
      assert.strictEqual(res.status, 201);
      assert.ok(res.body.lanche?.id);
      assert.strictEqual(res.body.lanche.nome, 'X-Burger Especial');
      assert.ok(res.body.proposta?.id);
      assert.strictEqual(res.body.proposta.lanche, 'X-Burger Especial');
      assert.strictEqual(res.body.proposta.status, 'aberta');
    });

    it('GET /lanches retorna só os lanches do usuário', async () => {
      const res = await request(app).get('/lanches').set('x-user-id', userA.id);
      assert.strictEqual(res.status, 200);
      assert.ok(Array.isArray(res.body));
      assert.ok(res.body.length >= 1);
      assert.ok(res.body.every(l => l.donoId === userA.id));
    });

    it('PUT /lanches atualiza lanche (apenas dono)', async () => {
      const lanches = (await request(app).get('/lanches').set('x-user-id', userA.id)).body;
      const id = lanches[0].id;
      const res = await request(app)
        .put(`/lanches/${id}`)
        .set('x-user-id', userA.id)
        .send({ nome: 'X-Burger Atualizado', desc: 'Nova descrição', foto: null });
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.nome, 'X-Burger Atualizado');
    });

    it('PUT /lanches rejeita se não for dono (segurança)', async () => {
      const lanches = (await request(app).get('/lanches').set('x-user-id', userA.id)).body;
      const id = lanches[0].id;
      const res = await request(app)
        .put(`/lanches/${id}`)
        .set('x-user-id', userB.id)
        .send({ nome: 'Tentativa Hack', desc: '', foto: null });
      assert.strictEqual(res.status, 404);
    });

    it('DELETE /lanches rejeita se não for dono (segurança)', async () => {
      const lanches = (await request(app).get('/lanches').set('x-user-id', userA.id)).body;
      const id = lanches[0].id;
      const res = await request(app)
        .delete(`/lanches/${id}`)
        .set('x-user-id', userB.id);
      assert.strictEqual(res.status, 404);
    });
  });

  describe('5. Propostas — fluxo completo', () => {
    let userDono, userInteressado;
    let propId;
    before(async () => {
      resetState();
      const rD = await request(app).post('/auth/login').send({ nome: 'Dono Proposta', local: 'Padaria' });
      const rI = await request(app).post('/auth/login').send({ nome: 'Interessado', local: 'Lanchonete' });
      userDono = rD.body;
      userInteressado = rI.body;
      const rL = await request(app)
        .post('/lanches')
        .set('x-user-id', userDono.id)
        .send({ nome: 'Pão de Queijo', desc: 'Recém-assado', foto: null });
      propId = rL.body.proposta.id;
    });

    it('GET /propostas retorna propostas abertas (sem auth)', async () => {
      const res = await request(app).get('/propostas');
      assert.strictEqual(res.status, 200);
      assert.ok(Array.isArray(res.body));
      const p = res.body.find(x => x.id === propId);
      assert.ok(p);
      assert.strictEqual(p.status, 'aberta');
      assert.strictEqual(p.lanche, 'Pão de Queijo');
      assert.deepStrictEqual(p.interessados, []);
    });

    it('POST /propostas/:id/interesse registra interesse com entrega', async () => {
      const res = await request(app)
        .post(`/propostas/${propId}/interesse`)
        .set('x-user-id', userInteressado.id)
        .send({ entrega: '🛵 Motoboy', msg: 'Posso amanhã!' });
      assert.strictEqual(res.status, 201);
      assert.strictEqual(res.body.interessados.length, 1);
      assert.strictEqual(res.body.interessados[0].nome, 'Interessado');
      assert.strictEqual(res.body.interessados[0].entrega, '🛵 Motoboy');
      assert.strictEqual(res.body.interessados[0].msg, 'Posso amanhã!');
      assert.ok(res.body.interessados[0].usuarioId, 'deve incluir usuarioId para aceitar/recusar');
    });

    it('POST /propostas/:id/interesse rejeita duplicado', async () => {
      const res = await request(app)
        .post(`/propostas/${propId}/interesse`)
        .set('x-user-id', userInteressado.id)
        .send({ entrega: '🚶 Deslocamento' });
      assert.strictEqual(res.status, 400);
      assert.ok(res.body.error?.includes('Já existe'));
    });

    it('POST /propostas/:id/aceitar cria troca no feed', async () => {
      const props = (await request(app).get('/propostas')).body;
      const p = props.find(x => x.id === propId);
      const interessadoId = p.interessados[0].usuarioId;
      const res = await request(app)
        .post(`/propostas/${propId}/aceitar`)
        .set('x-user-id', userDono.id)
        .send({ interessadoId });
      assert.strictEqual(res.status, 201);
      assert.ok(res.body.id);
      assert.strictEqual(res.body.a, 'Dono Proposta');
      assert.strictEqual(res.body.b, 'Interessado');
      assert.ok(res.body.reacoes);
      assert.ok(Array.isArray(res.body.comentarios));
    });

    it('Proposta aceita sai da lista de abertas', async () => {
      const res = await request(app).get('/propostas');
      const aindaAberta = res.body.find(p => p.id === propId);
      assert.strictEqual(aindaAberta, undefined);
    });
  });

  describe('6. Feed — reações e comentários', () => {
    let userA, userB, userC, trocaId;
    before(async () => {
      resetState();
      const rA = await request(app).post('/auth/login').send({ nome: 'Alice', local: 'Restaurante A' });
      const rB = await request(app).post('/auth/login').send({ nome: 'Bob', local: 'Restaurante B' });
      const rC = await request(app).post('/auth/login').send({ nome: 'Carol', local: 'Restaurante C' });
      userA = rA.body;
      userB = rB.body;
      userC = rC.body;
      const rL = await request(app).post('/lanches').set('x-user-id', userA.id).send({ nome: 'Lanche X', desc: '', foto: null });
      const propId = rL.body.proposta.id;
      await request(app).post(`/propostas/${propId}/interesse`).set('x-user-id', userB.id).send({ entrega: '🚶 Deslocamento' });
      const props = (await request(app).get('/propostas')).body;
      const prop = props.find(p => p.id === propId);
      const interessadoId = prop.interessados[0].usuarioId;
      await request(app).post(`/propostas/${propId}/aceitar`).set('x-user-id', userA.id).send({ interessadoId });
      trocaId = (await request(app).get('/feed')).body[0].id;
    });

    it('GET /feed retorna trocas concluídas (sem auth)', async () => {
      const res = await request(app).get('/feed');
      assert.strictEqual(res.status, 200);
      assert.ok(Array.isArray(res.body));
      assert.ok(res.body.length >= 1);
    });

    it('POST /feed/:id/reagir alterna reação', async () => {
      const res = await request(app)
        .post(`/feed/${trocaId}/reagir`)
        .set('x-user-id', userC.id)
        .send({ emoji: '😍' });
      assert.strictEqual(res.status, 200);
      assert.ok(res.body.reacoes['😍']?.length >= 1);
    });

    it('Participante pode comentar', async () => {
      const res = await request(app)
        .post(`/feed/${trocaId}/comentar`)
        .set('x-user-id', userA.id)
        .send({ texto: 'Foi ótima a troca!' });
      assert.strictEqual(res.status, 201);
      assert.ok(res.body.comentarios?.some(c => c.texto === 'Foi ótima a troca!' && c.autor === 'Alice'));
    });

    it('Não-participante NÃO pode comentar (segurança)', async () => {
      const res = await request(app)
        .post(`/feed/${trocaId}/comentar`)
        .set('x-user-id', userC.id)
        .send({ texto: 'Tentando comentar sem participar' });
      assert.strictEqual(res.status, 403);
      assert.ok(res.body.error?.includes('participantes'));
    });
  });

  describe('7. Validação de entrada (segurança)', () => {
    let userId;
    before(async () => {
      resetState();
      const r = await request(app).post('/auth/login').send({ nome: 'Teste', local: 'Outro' });
      userId = r.body.id;
    });

    it('POST /lanches sem nome retorna 400', async () => {
      const res = await request(app)
        .post('/lanches')
        .set('x-user-id', userId)
        .send({ desc: 'Só descrição' });
      assert.strictEqual(res.status, 400);
    });

    it('POST /propostas/:id/interesse sem entrega retorna 400', async () => {
      const rL = await request(app).post('/lanches').set('x-user-id', userId).send({ nome: 'L', desc: '', foto: null });
      const propId = rL.body.proposta.id;
      const res = await request(app)
        .post(`/propostas/${propId}/interesse`)
        .set('x-user-id', userId)
        .send({ msg: 'Só mensagem' });
      assert.strictEqual(res.status, 400);
    });

    it('POST /feed/:id/reagir sem emoji retorna 400', async () => {
      const feed = (await request(app).get('/feed')).body;
      const id = feed[0]?.id;
      if (!id) return;
      const res = await request(app).post(`/feed/${id}/reagir`).set('x-user-id', userId).send({});
      assert.strictEqual(res.status, 400);
    });
  });
});
