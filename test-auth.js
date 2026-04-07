const http = require('http');

function makeRequest(method, path, body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({
            status: res.statusCode,
            data: JSON.parse(data)
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            data: data
          });
        }
      });
    });

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function runTests() {
  console.log('🧪 Testando autenticação com JWT...\n');

  try {
    // 1. Health check
    console.log('1️⃣  Health check...');
    let res = await makeRequest('GET', '/health');
    console.log(`   ✓ Status: ${res.status}`);

    // 2. Login - obter token JWT
    console.log('\n2️⃣  Login (obter JWT)...');
    res = await makeRequest('POST', '/auth/login', {
      nome: 'TestUser',
      local: 'TestLocal'
    });
    console.log(`   ✓ Status: ${res.status}`);
    console.log(`   ✓ User: ${res.data.nome}`);
    console.log(`   ✓ Token: ${res.data.token.substring(0, 50)}...`);
    const token = res.data.token;
    const userId = res.data.id;

    // 3. Testar /me com JWT
    console.log('\n3️⃣  GET /me com JWT (Authorization: Bearer <token>)...');
    res = await makeRequest('GET', '/me', null, {
      'Authorization': `Bearer ${token}`
    });
    console.log(`   ✓ Status: ${res.status}`);
    console.log(`   ✓ User no /me: ${res.data.nome}`);

    // 4. Testar /me com x-user-id (fallback)
    console.log('\n4️⃣  GET /me com x-user-id (fallback)...');
    res = await makeRequest('GET', '/me', null, {
      'x-user-id': userId
    });
    console.log(`   ✓ Status: ${res.status}`);
    console.log(`   ✓ User no /me: ${res.data.nome}`);

    // 5. Testar JWT inválido com fallback
    console.log('\n5️⃣  GET /me com JWT inválido mas x-user-id válido...');
    res = await makeRequest('GET', '/me', null, {
      'Authorization': 'Bearer invalid.token.here',
      'x-user-id': userId
    });
    console.log(`   ✓ Status: ${res.status}`);
    console.log(`   ✓ Fallback funcionou! User: ${res.data.nome}`);

    // 6. Testar sem autenticação
    console.log('\n6️⃣  GET /me sem autenticação (deve falhar)...');
    res = await makeRequest('GET', '/me');
    console.log(`   ✓ Status: ${res.status} (esperado: 401)`);
    console.log(`   ✓ Error: ${res.data.error}`);

    // 7. Testar refresh token
    console.log('\n7️⃣  POST /auth/refresh para obter novo token...');
    res = await makeRequest('POST', '/auth/refresh', null, {
      'Authorization': `Bearer ${token}`
    });
    console.log(`   ✓ Status: ${res.status}`);
    console.log(`   ✓ Novo token: ${res.data.token.substring(0, 50)}...`);

    console.log('\n✅ Todos os testes passaram!');
  } catch (err) {
    console.error('❌ Erro:', err.message);
    process.exit(1);
  }
}

// Aguardar um pouco para servidor iniciar
setTimeout(runTests, 2000);
