const API_BASE = 'http://localhost:3000';

let D = { perfil:null, lanches:[], propostas:[], feed:[] };
let eSel = null, propSel = null, lancheEditId = null, fotoB64 = null, fotoLoadPromise = null;

/* ── PERSIST / API ── */
function saveLocalUser(user){
  if(user){
    localStorage.setItem('tl_user', JSON.stringify(user));
  } else {
    localStorage.removeItem('tl_user');
  }
}

function loadLocalUser(){
  const s = localStorage.getItem('tl_user');
  if(!s) return null;
  try { return JSON.parse(s); } catch { return null; }
}

async function apiFetch(path, options = {}) {
  const user = D.perfil || loadLocalUser();
  const headers = { 'Content-Type':'application/json', ...(options.headers||{}) };
  if(user?.id){
    headers['x-user-id'] = user.id;
  }
  let res;
  try {
    res = await fetch(API_BASE + path, { ...options, headers });
  } catch (e) {
    const err = new Error('Não foi possível conectar ao backend. Execute: npm run start:backend');
    err.original = e;
    err.status = 0;
    throw err;
  }
  if(!res.ok){
    const text = await res.text();
    let msg = text;
    try {
      const j = JSON.parse(text);
      if (j.error) msg = j.error;
    } catch (_) {}
    const err = new Error(msg || ('Erro HTTP ' + res.status));
    err.status = res.status;
    throw err;
  }
  const ct = res.headers.get('content-type') || '';
  return ct.includes('application/json') ? res.json() : res.text();
}

async function loadFromApi(){
  const user = loadLocalUser();
  if(user){
    D.perfil = user;
  }
  try{
    const [propostas, feed, lanches] = await Promise.all([
      apiFetch('/propostas'),
      apiFetch('/feed'),
      user ? apiFetch('/lanches') : Promise.resolve([])
    ]);
    D.propostas = propostas;
    D.feed = feed;
    D.lanches = lanches;
  }catch(e){
    console.error('Falha ao carregar dados da API', e);
  }
}

/* ── NAV ── */
async function irPara(t){
  document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(b=>b.classList.remove('active'));
  document.getElementById('screen-'+t).classList.add('active');
  document.getElementById('tab-'+t).classList.add('active');
  if(t==='propostas'){ await recarregarPropostasFeed(); renderPropostas(); }
  else if(t==='feed'){ await recarregarPropostasFeed(); renderFeed(); }
  else if(t==='perfil'){ await recarregarPropostasFeed(); renderPerfil(); }
  atualizarBadgeFeed();
}

async function recarregarPropostasFeed(){
  try{
    const [props, feed] = await Promise.all([ apiFetch('/propostas'), apiFetch('/feed') ]);
    D.propostas = props;
    D.feed = feed;
  }catch(e){ console.warn('Falha ao recarregar dados', e); }
}

function atualizarBadgeFeed(){
  const eu = D.perfil?.nome;
  if(!eu){ document.getElementById('bdot-feed').style.display='none'; return; }
  const n = D.feed.filter(f=> (f.a===eu||f.b===eu) && f.comentarios.some(c=>c.autor!==eu) ).length;
  const b = document.getElementById('bdot-feed');
  b.style.display = n>0?'inline-flex':'none'; b.textContent=n;
}

/* ── PERFIL ── */
async function salvarPerfil(){
  const nome = document.getElementById('inp-nome').value.trim();
  const local = document.getElementById('inp-local').value;
  if(!nome){ alert('Preencha seu nome'); return; }
  try{
    const user = await apiFetch('/auth/login',{
      method:'POST',
      body:JSON.stringify({ nome, local })
    });
    D.perfil = user;
    saveLocalUser(user);
    atualizarHeader(); renderPerfil(); renderPropostas(); renderFeed(); atualizarBadgeFeed();
    alert('Perfil salvo!');
  }catch(e){
    console.error(e);
    alert('Erro ao salvar perfil na API');
  }
}

function atualizarHeader(){
  if(!D.perfil) return;
  document.getElementById('h-nm').textContent = D.perfil.nome.split(' ')[0];
  document.getElementById('h-av').textContent = D.perfil.nome.charAt(0).toUpperCase();
}

function renderPerfil(){
  if(D.perfil){
    document.getElementById('inp-nome').value = D.perfil.nome;
    document.getElementById('inp-local').value = D.perfil.local;
    document.getElementById('perfil-banner').innerHTML = `
      <div class="pbanner">
        <div class="pavatar">${D.perfil.nome.charAt(0).toUpperCase()}</div>
        <div>
          <div class="pname">${D.perfil.nome}</div>
          <div class="plocal">📍 ${D.perfil.local} · ${D.lanches.length} lanche(s) cadastrado(s)</div>
        </div>
      </div>`;
  } else {
    document.getElementById('perfil-banner').innerHTML='';
  }

  const el = document.getElementById('lista-lanches-perfil');
  if(!D.lanches.length){
    el.innerHTML='<div class="empty"><div class="ei">🍱</div><div class="et">Nenhum lanche cadastrado</div><div class="es">Adicione seus lanches para aparecer em Propostas</div></div>';
    return;
  }
  el.innerHTML = D.lanches.map(l=>`
    <div class="lanche-edit-card">
      ${l.foto
        ? `<div class="lanche-edit-img"><img src="${l.foto}" alt="${l.nome}" onerror="this.parentElement.innerHTML='<div style=width:100%;height:140px;background:var(--s2);display:flex;align-items:center;justify-content:center;font-size:.85rem;color:var(--ink-light)>Sem imagem</div>'"></div>`
        : `<div class="lanche-edit-img" style="height:80px;display:flex;align-items:center;justify-content:center;font-size:.85rem;color:var(--ink-light)">Sem foto</div>`}
      <div class="lanche-edit-body">
        <div class="lanche-edit-name">${l.nome}</div>
        ${l.desc?`<div class="lanche-edit-desc">${l.desc}</div>`:''}
        <div class="btn-row">
          <button class="btn btn-ghost btn-sm" onclick="editarLanche('${escId(l.id)}')">Editar</button>
          <button class="btn btn-danger btn-sm" onclick="removerLanche('${escId(l.id)}')">Remover</button>
        </div>
      </div>
    </div>`).join('');

  const pedidosEl = document.getElementById('lista-pedidos-perfil');
  const minhasPropostasComInteresse = (D.perfil && D.propostas) ? D.propostas.filter(p =>
    p.status === 'aberta' && p.autorNome === D.perfil.nome && (p.interessados?.length || 0) > 0
  ) : [];
  if (!minhasPropostasComInteresse.length) {
    pedidosEl.innerHTML = '<div class="empty" style="min-height:80px"><div class="ei">📩</div><div class="et">Nenhum pedido de troca no momento</div><div class="es">Quando alguém demonstrar interesse nos seus lanches, aparecerá aqui</div></div>';
  } else {
    pedidosEl.innerHTML = minhasPropostasComInteresse.map(p => `
      <div class="pcard" style="margin-bottom:12px">
        <div style="display:flex;align-items:center;gap:12px;padding:12px">
          ${p.foto ? `<img src="${p.foto}" style="width:48px;height:48px;border-radius:8px;object-fit:cover" onerror="this.style.display='none'">` : '<div style="width:48px;height:48px;border-radius:8px;background:var(--s2);display:flex;align-items:center;justify-content:center">🍽️</div>'}
          <div style="flex:1">
            <div style="font-weight:700;font-size:.95rem">${p.lanche}</div>
            <div style="font-size:.8rem;color:var(--ink-mid)">${p.interessados.length} pessoa(s) interessada(s)</div>
          </div>
          <button class="btn btn-primary btn-sm" onclick="verInteressados('${escId(p.id)}')">Ver interessados</button>
        </div>
      </div>`).join('');
  }
}

/* ── MODAL LANCHE ── */
function abrirModalLanche(id){
  lancheEditId = id || null; fotoB64 = null; fotoLoadPromise = null;
  document.getElementById('ml-titulo').textContent = id ? 'Editar lanche' : 'Novo lanche';
  const l = id ? D.lanches.find(x=>x.id===id) : null;
  document.getElementById('ml-nome').value = l?.nome||'';
  document.getElementById('ml-desc').value = l?.desc||'';
  document.getElementById('foto-url').value = (l?.foto&&!l.foto.startsWith('data:'))?l.foto:'';
  const prev = document.getElementById('foto-preview-img');
  const ph = document.getElementById('foto-placeholder');
  if(l?.foto){ prev.src=l.foto; prev.style.display='block'; ph.style.display='none'; }
  else { prev.style.display='none'; ph.style.display='block'; }
  am('modal-lanche');
}

function editarLanche(id){ abrirModalLanche(id); }

function comprimirImagem(base64, maxLado = 600, qualidade = 0.7) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const c = document.createElement('canvas');
      let w = img.width, h = img.height;
      if (w > maxLado || h > maxLado) {
        if (w > h) { h = (h / w) * maxLado; w = maxLado; }
        else { w = (w / h) * maxLado; h = maxLado; }
      }
      c.width = w; c.height = h;
      c.getContext('2d').drawImage(img, 0, 0, w, h);
      resolve(c.toDataURL('image/jpeg', qualidade));
    };
    img.onerror = () => resolve(base64);
    img.src = base64;
  });
}

function onFotoChange(e){
  const f = e.target.files[0]; if(!f) return;
  fotoLoadPromise = new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = async ev => {
      try {
        let b64 = ev.target.result;
        if (b64.length > 150000) b64 = await comprimirImagem(b64);
        fotoB64 = b64;
        document.getElementById('foto-url').value='';
        const prev = document.getElementById('foto-preview-img');
        prev.src = fotoB64; prev.style.display='block';
        document.getElementById('foto-placeholder').style.display='none';
        resolve(b64);
      } catch (err) { reject(err); }
    };
    r.onerror = () => reject(new Error('Erro ao carregar imagem'));
    r.readAsDataURL(f);
  });
}

function onFotoUrl(v){
  if(!v) return;
  fotoB64 = null; fotoLoadPromise = null;
  const prev = document.getElementById('foto-preview-img');
  prev.src = v; prev.style.display='block';
  document.getElementById('foto-placeholder').style.display='none';
}

async function salvarLanche(){
  const nome = document.getElementById('ml-nome').value.trim();
  const desc = document.getElementById('ml-desc').value.trim();
  const urlFoto = document.getElementById('foto-url').value.trim();
  if (fotoLoadPromise) await fotoLoadPromise; fotoLoadPromise = null;
  const foto = fotoB64 || urlFoto || null;
  if(!nome){ alert('Informe o nome do lanche'); return; }
  if(!D.perfil){ alert('Salve seu perfil primeiro'); return; }
  try{
    if(lancheEditId){
      await apiFetch('/lanches/'+encodeURIComponent(lancheEditId),{
        method:'PUT',
        body:JSON.stringify({ nome, desc, foto })
      });
    }else{
      const res = await apiFetch('/lanches',{
        method:'POST',
        body:JSON.stringify({ nome, desc, foto })
      });
      // res.lanche já estará refletido no GET /lanches
    }
    const novos = await apiFetch('/lanches');
    D.lanches = novos;
    const props = await apiFetch('/propostas');
    D.propostas = props;
    fm('modal-lanche'); renderPerfil(); renderPropostas();
  }catch(e){
    console.error(e);
    let msg = 'Erro ao salvar lanche na API';
    if (e.status === 0) msg = 'Backend não está rodando. Execute: npm run start:backend';
    else if (e.status === 401 || (e.message && e.message.includes('Usuário não encontrado')))
      msg = 'Sessão expirada. Salve seu perfil novamente antes de adicionar lanches.';
    else if (e.status === 413 || (e.message && e.message.includes('muito grande')))
      msg = 'Imagem muito grande. Use uma foto menor ou cole uma URL de imagem.';
    else if (e.message) msg = e.message;
    alert(msg);
  }
}

async function removerLanche(id){
  if(!confirm('Remover este lanche?')) return;
  try{
    await apiFetch('/lanches/'+encodeURIComponent(id),{ method:'DELETE' });
    D.lanches = await apiFetch('/lanches');
    D.propostas = await apiFetch('/propostas');
    renderPerfil(); renderPropostas();
  }catch(e){
    console.error(e);
    alert('Erro ao remover lanche na API');
  }
}

/* ── PROPOSTAS ── */
function getBuscaPropostas(){
  const inp = document.getElementById('busca-propostas');
  return inp ? inp.value.trim().toLowerCase() : '';
}

function propostasFiltradas(){
  const lista = D.propostas.filter(p=>p.status==='aberta');
  const q = getBuscaPropostas();
  if(!q) return lista;
  return lista.filter(p=>{
    const local = (p.autorLocal||'').toLowerCase();
    const lanche = (p.lanche||'').toLowerCase();
    const desc = (p.desc||'').toLowerCase();
    const autor = (p.autorNome||'').toLowerCase();
    const termo = q;
    return local.includes(termo) || lanche.includes(termo) || desc.includes(termo) || autor.includes(termo);
  });
}

function filtrarPropostas(){
  renderPropostas();
}

function renderPropostas(){
  const el = document.getElementById('lista-propostas');
  const lista = propostasFiltradas();
  const total = D.propostas.filter(p=>p.status==='aberta').length;
  if(!total){
    el.innerHTML='<div class="empty"><div class="ei">🍽️</div><div class="et">Nenhuma proposta aberta</div><div class="es">Cadastre um lanche no seu perfil para aparecer aqui</div></div>';
    return;
  }
  if(!lista.length){
    el.innerHTML='<div class="empty"><div class="ei">🔍</div><div class="et">Nenhuma proposta encontrada</div><div class="es">Tente outro termo de busca (local, lanche, descrição)</div></div>';
    return;
  }
  el.innerHTML = lista.map(p=>cardProposta(p)).join('');
}

function escId(id){ return String(id).replace(/\\/g,'\\\\').replace(/'/g,"\\'"); }
function safeId(id){ return String(id).replace(/[^a-zA-Z0-9_-]/g,'_'); }

function cardProposta(p){
  const eu = D.perfil?.nome;
  const ehMinha = p.autorNome===eu;
  const jaTenhoInteresse = p.interessados.some(i=>i.nome===eu);
  const ni = p.interessados.length;

  let acoes = '';
  if(!eu){
    acoes = `<button class="btn btn-ghost btn-sm" onclick="irPara('perfil')">Configure seu perfil para trocar</button>`;
  } else if(ehMinha){
    acoes = ni>0
      ? `<button class="btn btn-primary btn-sm" onclick="verInteressados('${escId(p.id)}')">${ni} interesse(s) — responder</button>`
      : `<span class="chip chip-gray">Aguardando interesse</span>`;
  } else if(jaTenhoInteresse){
    acoes = `<button class="btn btn-ghost btn-sm" onclick="abrirModalConversa('${escId(p.id)}')">💬 Ver conversa</button>`;
  } else {
    acoes = `<button class="btn btn-success btn-sm" onclick="abrirModalProp('${escId(p.id)}')">✓ Tenho interesse</button>`;
  }

  return `
    <div class="pcard">
      ${p.foto
        ? `<img class="pcard-img" src="${p.foto}" alt="${p.lanche}" onerror="this.outerHTML='<div class=pcard-img-placeholder>🍽️</div>'">`
        : `<div class="pcard-img-placeholder">🍽️</div>`}
      <div class="pcard-body">
        <div class="pcard-header">
          <div>
            <div class="pcard-autor">${p.autorNome}</div>
            <div class="pcard-restaurante">📍 ${p.autorLocal}</div>
          </div>
          ${ehMinha&&ni>0?`<span class="chip chip-brand">${ni} 🔔</span>`:''}
        </div>
        <div class="pcard-nome">${p.lanche}</div>
        ${p.desc?`<div class="pcard-desc">${p.desc}</div>`:''}
        <div class="pcard-meta">
          ${p.entregaOpts.map(e=>`<span class="pcard-entrega">${e}</span>`).join('')}
          <span style="font-size:.75rem;color:var(--ink-light);margin-left:auto">${p.data}</span>
        </div>
        <div class="pcard-actions">${acoes}</div>
      </div>
    </div>`;
}

/* ── MODAL PROPOSTA (interesse) ── */
function abrirModalProp(id){
  if(!D.perfil){ alert('Configure seu perfil primeiro'); irPara('perfil'); return; }
  propSel = id; eSel = null;
  const p = D.propostas.find(x=>x.id===id);
  document.getElementById('mp-titulo').textContent = `Trocar com ${p.autorNome}`;
  document.getElementById('mp-msg').value = '';
  document.querySelectorAll('.eopt').forEach(o=>o.classList.remove('sel'));

  /* preview do lanche */
  document.getElementById('mp-lanche-preview').innerHTML = `
    <div style="background:var(--s2);border-radius:var(--rsm);padding:12px 14px;display:flex;gap:12px;align-items:center">
      ${p.foto?`<img src="${p.foto}" style="width:56px;height:56px;border-radius:8px;object-fit:cover" onerror="this.style.display='none'">`:'<div style="width:56px;height:56px;border-radius:8px;background:var(--s3);display:flex;align-items:center;justify-content:center;font-size:1.4rem">🍽️</div>'}
      <div>
        <div style="font-family:'Syne',sans-serif;font-weight:700;font-size:.95rem">${p.lanche}</div>
        <div style="font-size:.8rem;color:var(--ink-mid)">${p.autorNome} · ${p.autorLocal}</div>
      </div>
    </div>`;

  am('modal-prop');
}

function selE(tipo){
  eSel=tipo;
  document.querySelectorAll('.eopt').forEach(o=>o.classList.remove('sel'));
  document.getElementById('eopt-'+tipo).classList.add('sel');
}

async function confirmarInteresse(){
  if(!eSel){ alert('Escolha a forma de entrega'); return; }
  try{
    await apiFetch('/propostas/'+encodeURIComponent(propSel)+'/interesse',{
      method:'POST',
      body:JSON.stringify({
        entrega: eSel==='motoboy'?'🛵 Motoboy':'🚶 Deslocamento',
        msg: document.getElementById('mp-msg').value.trim()
      })
    });
    D.propostas = await apiFetch('/propostas');
    fm('modal-prop'); renderPropostas(); atualizarBadgeFeed();
  }catch(e){
    console.error(e);
    alert('Erro ao registrar interesse na API');
  }
}

/* ── VER INTERESSADOS (dono do lanche) ── */
function verInteressados(id){
  const p = D.propostas.find(x=>x.id===id);
  if(!p) return;
  propSel = id;
  const msgs = (i) => (i.mensagens || (i.msg ? [{ autor: i.nome, texto: i.msg, data: '' }] : []));
  document.getElementById('mi-body').innerHTML = p.interessados.map(i=>{
    const thread = msgs(i);
    return `
    <div class="interessado-card" style="border:1px solid var(--s3);border-radius:var(--rsm);padding:14px;margin-bottom:12px">
      <div style="font-family:'Syne',sans-serif;font-weight:700;font-size:.95rem;margin-bottom:3px">${i.nome}</div>
      <div style="font-size:.8rem;color:var(--ink-mid);margin-bottom:10px">📍 ${i.local} · ${i.entrega}</div>
      <div class="msg-thread" style="max-height:140px;overflow-y:auto;margin-bottom:10px;padding:8px;background:var(--s2);border-radius:var(--rsm)">
        ${thread.map(m=>`<div class="msg-item" style="margin-bottom:8px"><span style="font-size:.72rem;font-weight:600;color:var(--ink-mid)">${escHtml(m.autor||'?')}:</span> <span style="font-size:.85rem">${escHtml(m.texto||'')}</span>${m.data?` <span style="font-size:.7rem;color:var(--ink-light)">${escHtml(m.data)}</span>`:''}</div>`).join('')}
      </div>
      <div class="com-input-row" style="display:flex;gap:8px;margin-bottom:10px">
        <input class="fi" id="msg-inp-${safeId(id)}-${safeId(i.usuarioId)}" type="text" placeholder="Responder a ${escHtml(i.nome)}..." style="flex:1" onkeydown="if(event.key==='Enter')enviarMensagemInteresse('${escId(id)}','${escId(i.usuarioId)}')">
        <button class="btn btn-primary btn-sm" onclick="enviarMensagemInteresse('${escId(id)}','${escId(i.usuarioId)}')">Enviar</button>
      </div>
      <div class="btn-row" style="margin-top:8px">
        <button class="btn btn-success btn-sm" onclick="aceitarTroca('${escId(id)}','${escId(i.usuarioId)}')">✓ Aceitar troca</button>
        <button class="btn btn-ghost btn-sm" onclick="recusarInteresse('${escId(id)}','${escId(i.usuarioId)}')">Recusar</button>
      </div>
    </div>`;
  }).join('');
  am('modal-interesse');
}

function escHtml(s){ return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

async function abrirModalConversa(propId){
  try { D.propostas = await apiFetch('/propostas'); } catch(_) {}
  const p = D.propostas.find(x=>x.id===propId);
  if(!p || !D.perfil) return;
  const eu = D.perfil;
  const meuInteresse = p.interessados.find(i=>i.usuarioId===eu.id);
  if(!meuInteresse){ alert('Interesse não encontrado'); return; }
  propSel = propId;
  document.getElementById('mc-titulo').textContent = `Conversa com ${p.autorNome}`;
  document.getElementById('mc-preview').innerHTML = `
    <div style="background:var(--s2);border-radius:var(--rsm);padding:12px 14px;display:flex;gap:12px;align-items:center">
      ${p.foto?`<img src="${p.foto}" style="width:48px;height:48px;border-radius:8px;object-fit:cover" onerror="this.style.display='none'">`:'<div style="width:48px;height:48px;border-radius:8px;background:var(--s3);display:flex;align-items:center;justify-content:center;font-size:1.2rem">🍽️</div>'}
      <div>
        <div style="font-weight:700;font-size:.95rem">${p.lanche}</div>
        <div style="font-size:.8rem;color:var(--ink-mid)">${p.autorNome} · ${p.autorLocal}</div>
      </div>
    </div>`;
  const msgs = meuInteresse.mensagens || (meuInteresse.msg ? [{ autor: meuInteresse.nome, texto: meuInteresse.msg, data: '' }] : []);
  document.getElementById('mc-thread').innerHTML = msgs.map(m=>`
    <div class="msg-item" style="margin-bottom:8px">
      <span style="font-size:.72rem;font-weight:600;color:var(--ink-mid)">${escHtml(m.autor||'?')}:</span>
      <span style="font-size:.85rem">${escHtml(m.texto||'')}</span>
      ${m.data?` <span style="font-size:.7rem;color:var(--ink-light)">${escHtml(m.data)}</span>`:''}
    </div>`).join('');
  document.getElementById('mc-input').value = '';
  document.getElementById('mc-input').focus();
  am('modal-conversa');
}

async function enviarMensagemComoInteressado(){
  if(!propSel || !D.perfil) return;
  const inp = document.getElementById('mc-input');
  const txt = inp?.value.trim(); if(!txt) return;
  try{
    await apiFetch('/propostas/'+encodeURIComponent(propSel)+'/mensagem',{
      method:'POST',
      body:JSON.stringify({ interessadoId: D.perfil.id, texto: txt })
    });
    inp.value = '';
    D.propostas = await apiFetch('/propostas');
    abrirModalConversa(propSel);
  }catch(e){
    console.error(e);
    alert('Erro ao enviar mensagem');
  }
}

async function enviarMensagemInteresse(propId, interessadoId){
  const inp = document.getElementById('msg-inp-'+safeId(propId)+'-'+safeId(interessadoId));
  if(!inp) return;
  const txt = inp.value.trim(); if(!txt) return;
  try{
    await apiFetch('/propostas/'+encodeURIComponent(propId)+'/mensagem',{
      method:'POST',
      body:JSON.stringify({ interessadoId, texto: txt })
    });
    inp.value='';
    D.propostas = await apiFetch('/propostas');
    verInteressados(propId);
  }catch(e){
    console.error(e);
    alert('Erro ao enviar mensagem');
  }
}

async function recusarInteresse(propId, interessadoUsuarioId){
  const p = D.propostas.find(x=>x.id===propId);
  if(!p) return;
  try{
    await apiFetch('/propostas/'+encodeURIComponent(propId)+'/recusar',{
      method:'POST',
      body:JSON.stringify({ interessadoId: interessadoUsuarioId })
    });
    D.propostas = await apiFetch('/propostas');
    verInteressados(propId);
    const atualizada = D.propostas.find(x=>x.id===propId);
    if(!atualizada || !atualizada.interessados.length) fm('modal-interesse');
    renderPropostas(); renderPerfil();
  }catch(e){
    console.error(e);
    alert('Erro ao recusar interesse na API');
  }
}

async function aceitarTroca(propId, interessadoUsuarioId){
  const p = D.propostas.find(x=>x.id===propId);
  if(!p) return;
  try{
    await apiFetch('/propostas/'+encodeURIComponent(propId)+'/aceitar',{
      method:'POST',
      body:JSON.stringify({ interessadoId: interessadoUsuarioId })
    });
    D.propostas = await apiFetch('/propostas');
    D.feed = await apiFetch('/feed');
    fm('modal-interesse');
    renderPropostas(); renderFeed(); renderPerfil(); atualizarBadgeFeed();
    alert(`Troca confirmada! Aparece no Feed agora 🎉`);
  }catch(e){
    console.error(e);
    alert('Erro ao aceitar troca na API');
  }
}

/* ── FEED ── */
function renderFeed(){
  const el = document.getElementById('lista-feed');
  if(!D.feed.length){
    el.innerHTML='<div class="empty"><div class="ei">💬</div><div class="et">Nenhuma troca concluída ainda</div><div class="es">As trocas confirmadas aparecem aqui</div></div>';
    return;
  }
  el.innerHTML = D.feed.map(f=>cardFeed(f)).join('');
}

function cardFeed(f){
  const eu = D.perfil?.nome;
  const euId = D.perfil?.id;
  const participa = eu && (f.a===eu||f.b===eu);

  /* reações (backend guarda userIds nas listas) */
  const reacoes = Object.entries(f.reacoes || {}).map(([emoji,lista])=>{
    const ativa = euId && (Array.isArray(lista)?lista:[]).includes(euId) ? 'ativa' : '';
    return `<button class="reacao-btn ${ativa}" onclick="reagir('${escId(f.id)}','${String(emoji).replace(/'/g,"\\'")}')">${emoji} <span class="reacao-count">${(lista&&lista.length)||''}</span></button>`;
  }).join('');

  /* comentários */
  const coms = f.comentarios.map(c=>`
    <div class="comentario-item">
      <div class="com-avatar">${c.autor.charAt(0).toUpperCase()}</div>
      <div class="com-bubble">
        <div class="com-autor">${c.autor}</div>
        <div class="com-texto">${c.texto}</div>
        <div class="com-data">${c.data}</div>
      </div>
    </div>`).join('');

  const comInput = participa
    ? `<div class="com-input-row">
        <input class="fi" id="ci-${String(f.id).replace(/["'<>]/g,'')}" type="text" placeholder="Escreva um comentário..." onkeydown="if(event.key==='Enter')comentar('${escId(f.id)}')">
        <button class="btn btn-primary btn-sm" onclick="comentar('${escId(f.id)}')">Enviar</button>
       </div>`
    : `<div class="com-locked">Só os participantes da troca podem comentar</div>`;

  return `
    <div class="feed-card">
      <div class="feed-header">
        <div class="feed-avatar">${f.a.charAt(0).toUpperCase()}</div>
        <div class="feed-troca-info">
          <div class="feed-troca-title">${f.a} ⇄ ${f.b}</div>
          <div class="feed-troca-sub">${f.aLocal} · ${f.bLocal} · ${f.entrega} · ${f.data}</div>
        </div>
      </div>
      ${f.foto?`<img class="feed-img" src="${f.foto}" alt="${f.lanche}" onerror="this.style.display='none'">`:''}
      <div class="feed-body">
        <div class="feed-lanche-nome">${f.lanche}</div>
        ${f.desc?`<div class="feed-lanche-desc">${f.desc}</div>`:''}
      </div>
      <div class="reacoes-bar">${reacoes}</div>
      <div class="comentarios">
        ${coms}
        ${comInput}
      </div>
    </div>`;
}

async function reagir(feedId, emoji){
  if(!D.perfil){ alert('Configure seu perfil para reagir'); return; }
  try{
    const atualizado = await apiFetch('/feed/'+encodeURIComponent(feedId)+'/reagir',{
      method:'POST',
      body:JSON.stringify({ emoji })
    });
    D.feed = D.feed.map(f=>f.id===atualizado.id?atualizado:f);
    renderFeed();
  }catch(e){
    console.error(e);
    alert('Erro ao reagir na API');
  }
}

async function comentar(feedId){
  if(!D.perfil) return;
  const inp = document.getElementById('ci-'+feedId);
  const txt = inp.value.trim();
  if(!txt) return;
  try{
    const atualizado = await apiFetch('/feed/'+encodeURIComponent(feedId)+'/comentar',{
      method:'POST',
      body:JSON.stringify({ texto: txt })
    });
    inp.value='';
    D.feed = D.feed.map(f=>f.id===atualizado.id?atualizado:f);
    renderFeed(); atualizarBadgeFeed();
  }catch(e){
    console.error(e);
    alert('Erro ao comentar na API');
  }
}

/* ── MODAL UTILS ── */
function am(id){ document.getElementById(id).classList.add('open'); }
function fm(id){ document.getElementById(id).classList.remove('open'); }
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.mwrap').forEach(m=>{
    m.addEventListener('click',e=>{ if(e.target===m) m.classList.remove('open'); });
  });
  /* ── INIT ── */
  loadFromApi().then(()=>{
    atualizarHeader();
    renderPropostas();
    renderPerfil();
    renderFeed();
    atualizarBadgeFeed();
  });
});

