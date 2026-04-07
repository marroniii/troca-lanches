#!/usr/bin/env node

// Script de teste do fluxo completo em Node.js

const http = require('http');
const fs = require('fs');

function request(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path,
      method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch {
          resolve(data);
        }
      });
    });

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

function requestWithAuth(method, path, body = null, token) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path,
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch {
          resolve(data);
        }
      });
    });

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function runTests() {
  console.log('\n════════════════════════════════════════');
  console.log('TESTE FLUXO COMPLETO - TROCA LANCHES');
  console.log('════════════════════════════════════════\n');

  try {
    // 1. Health Check
    console.log('1. HEALTH CHECK');
    const health = await request('GET', '/health');
    console.log('✓ Servidor OK:', health.status, '\n');

    // 2. Login Usuário 1
    console.log('2. LOGIN USUÁRIO 1');
    const user1 = await request('POST', '/auth/login', {
      nome: 'Ana Silva',
      local: 'São Paulo'
    });
    const user1Id = user1.id;
    const token1 = user1.token;
    console.log('✓ User ID:', user1Id);
    console.log('✓ Nome:', user1.nome, '\n');

    // 3. Criar Lanche
    console.log('3. CRIAR LANCHE');
    const lanche = await requestWithAuth('POST', '/lanches', {
      nome: 'Pizza Margherita',
      descricao: 'Pizza com mozzarella'
    }, token1);
    const propostaId = lanche.proposta.id;
    console.log('✓ Lanche criado');
    console.log('✓ Proposta ID:', propostaId, '\n');

    // 4. Login Usuário 2
    console.log('4. LOGIN USUÁRIO 2');
    const user2 = await request('POST', '/auth/login', {
      nome: 'Bruno Costa',
      local: 'Rio de Janeiro'
    });
    const user2Id = user2.id;
    const token2 = user2.token;
    console.log('✓ User 2 ID:', user2Id, '\n');

    // 5. Adicionar Interesse
    console.log('5. ADICIONAR INTERESSE');
    const interesse = await requestWithAuth('POST', `/propostas/${propostaId}/interesse`, {
      entrega: '🛵 Motoboy',
      mensagem: 'Tenho hambúrguer!'
    }, token2);
    console.log('✓ Interesse adicionado\n');

    // 6. NOVA ROTA - Adicionar Mensagem
    console.log('6. ADICIONAR MENSAGEM (NOVA ROTA)');
    const mensagem = await requestWithAuth('POST', `/propostas/${propostaId}/mensagem`, {
      interessadoId: user2Id,
      texto: 'Otimo! Quando vamos trocar?'
    }, token1);
    console.log('✓ Mensagem adicionada com SUCESSO!');
    console.log('✓ Status:', mensagem.status, '\n');

    // 7. Listar Propostas
    console.log('7. LISTAR PROPOSTAS');
    const propostas = await requestWithAuth('GET', '/propostas', null, token1);
    console.log('✓ Propostas carregadas:', propostas.length, '\n');

    // 8. Remover Interesse
    console.log('8. REMOVER INTERESSE');
    await requestWithAuth('POST', `/propostas/${propostaId}/remover-interesse`, {}, token2);
    console.log('✓ Interesse removido\n');

    console.log('════════════════════════════════════════');
    console.log('✅ FLUXO COMPLETO VALIDADO!');
    console.log('════════════════════════════════════════\n');

  } catch (err) {
    console.error('❌ ERRO:', err.message);
    process.exit(1);
  }
}

// Aguarda servidor iniciar
setTimeout(runTests, 2000);
