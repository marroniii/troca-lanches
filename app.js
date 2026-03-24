import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getAuth, onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup, GoogleAuthProvider,
  signOut
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import {
  getFirestore, doc, getDoc, setDoc, updateDoc,
  collection, addDoc, getDocs, deleteDoc,
  query, where, orderBy, onSnapshot, serverTimestamp, arrayUnion, arrayRemove
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

/* ── FIREBASE INIT ── */
const firebaseConfig = {
  apiKey: "AIzaSyB-hWZwhO9X1n9d0fv69HX_3nO-fK8p9lY",
  authDomain: "troca-lanches.firebaseapp.com",
  projectId: "troca-lanches",
  storageBucket: "troca-lanches.firebasestorage.app",
  messagingSenderId: "782131299687",
  appId: "1:782131299687:web:15403c503db731aaf39bc2"
};

const app  = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db   = getFirestore(app);
const googleProvider = new GoogleAuthProvider();

/* ── ESTADO GLOBAL ── */
let D = { perfil: null, lanches: [], propostas: [], feed: [] };
let eSel = null, propSel = null, lancheEditId = null, fotoB64 = null, fotoLoadPromise = null;
let unsubPropostas = null, unsubFeed = null;

/* ══════════════════════════════════════════
   AUTH
══════════════════════════════════════════ */
function mostrarAba(aba) {
  document.getElementById('form-login').style.display    = aba === 'login'    ? 'block' : 'none';
  document.getElementById('form-cadastro').style.display = aba === 'cadastro' ? 'block' : 'none';
  const baseStyle = 'flex:1;padding:10px;border:none;background:none;font-family:Syne,sans-serif;font-weight:700;font-size:.9rem;cursor:pointer;';
  document.getElementById('aba-login').style.cssText    = baseStyle + (aba==='login'    ? 'color:var(--brand);border-bottom:2px solid var(--brand);margin-bottom:-2px;' : 'color:var(--ink-light);');
  document.getElementById('aba-cadastro').style.cssText = baseStyle + (aba==='cadastro' ? 'color:var(--brand);border-bottom:2px solid var(--brand);margin-bottom:-2px;' : 'color:var(--ink-light);');
}
window.mostrarAba = mostrarAba;

async function fazerLogin() {
  const email  = document.getElementById('login-email').value.trim();
  const senha  = document.getElementById('login-senha').value;
  const erroEl = document.getElementById('login-erro');
  erroEl.style.display = 'none';
  if (!email || !senha) { erroEl.textContent = 'Preencha e-mail e senha.'; erroEl.style.display = 'block'; return; }
  try {
    await signInWithEmailAndPassword(auth, email, senha);
  } catch (e) {
    erroEl.textContent = traduzirErroAuth(e.code);
    erroEl.style.display = 'block';
  }
}
window.fazerLogin = fazerLogin;

async function fazerCadastro() {
  const nome   = document.getElementById('cad-nome').value.trim();
  const local  = document.getElementById('cad-local').value;
  const email  = document.getElementById('cad-email').value.trim();
  const senha  = document.getElementById('cad-senha').value;
  const erroEl = document.getElementById('cad-erro');
  erroEl.style.display = 'none';
  if (!nome)        { erroEl.textContent = 'Informe seu nome.'; erroEl.style.display = 'block'; return; }
  if (!email)       { erroEl.textContent = 'Informe seu e-mail.'; erroEl.style.display = 'block'; return; }
  if (senha.length < 6) { erroEl.textContent = 'Senha deve ter ao menos 6 caracteres.'; erroEl.style.display = 'block'; return; }
  try {
    const cred = await createUserWithEmailAndPassword(auth, email, senha);
    await setDoc(doc(db, 'usuarios', cred.user.uid), { nome, local, email, criadoEm: serverTimestamp() });
  } catch (e) {
    erroEl.textContent = traduzirErroAuth(e.code);
    erroEl.style.display = 'block';
  }
}
window.fazerCadastro = fazerCadastro;

async function loginGoogle() {
  try {
    await signInWithPopup(auth, googleProvider);
  } catch (e) {
    alert('Erro ao entrar com Google: ' + e.message);
  }
}
window.loginGoogle = loginGoogle;

async function fazerLogout() {
  if (!confirm('Deseja sair da sua conta?')) return;
  if (unsubPropostas) unsubPropostas();
  if (unsubFeed)      unsubFeed();
  await signOut(auth);
}
window.fazerLogout = fazerLogout;

async function salvarPerfilCompleto() {
  const nome  = document.getElementById('cp-nome').value.trim();
  const local = document.getElementById('cp-local').value;
  if (!nome) { alert('Informe seu nome.'); return; }
  const uid = auth.currentUser.uid;
  await setDoc(doc(db, 'usuarios', uid), { nome, local, email: auth.currentUser.email || '', criadoEm: serverTimestamp() });
  fm('modal-completar-perfil');
  await carregarPerfil(uid);
}
window.salvarPerfilCompleto = salvarPerfilCompleto;

function traduzirErroAuth(code) {
  const erros = {
    'auth/user-not-found':      'Usuário não encontrado.',
    'auth/wrong-password':      'Senha incorreta.',
    'auth/email-already-in-use':'Este e-mail já está em uso.',
    'auth/invalid-email':       'E-mail inválido.',
    'auth/weak-password':       'Senha muito fraca (mínimo 6 caracteres).',
    'auth/too-many-requests':   'Muitas tentativas. Aguarde um momento.',
    'auth/invalid-credential':  'E-mail ou senha incorretos.',
  };
  return erros[code] || 'Erro ao autenticar. Tente novamente.';
}

/* ══════════════════════════════════════════
   AUTH STATE
══════════════════════════════════════════ */
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    document.getElementById('tela-auth').style.display = 'block';
    D = { perfil: null, lanches: [], propostas: [], feed: [] };
    if (unsubPropostas) { unsubPropostas(); unsubPropostas = null; }
    if (unsubFeed)      { unsubFeed();      unsubFeed = null;      }
    return;
  }
  document.getElementById('tela-auth').style.display = 'none';
  const perfilDoc = await getDoc(doc(db, 'usuarios', user.uid));
  if (!perfilDoc.exists()) {
    document.getElementById('cp-nome').value = user.displayName || '';
    am('modal-completar-perfil');
    return;
  }
  await carregarPerfil(user.uid);
});

async function carregarPerfil(uid) {
  const perfilDoc = await getDoc(doc(db, 'usuarios', uid));
  if (!perfilDoc.exists()) return;
  D.perfil = { id: uid, ...perfilDoc.data() };
  atualizarHeader();
  await carregarLanches();
  iniciarListeners();
  renderPropostas();
  renderPerfil();
  renderFeed();
  atualizarBadgeFeed();
}

/* ══════════════════════════════════════════
   LISTENERS EM TEMPO REAL
══════════════════════════════════════════ */
function iniciarListeners() {
  if (unsubPropostas) unsubPropostas();
  const qProp = query(collection(db, 'propostas'), where('status', '==', 'aberta'), orderBy('criadoEm', 'desc'));
  unsubPropostas = onSnapshot(qProp, snap => {
    D.propostas = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    renderPropostas();
    renderPerfil();
    atualizarBadgeFeed();
  });

  if (unsubFeed) unsubFeed();
  const qFeed = query(collection(db, 'feed'), orderBy('criadoEm', 'desc'));
  unsubFeed = onSnapshot(qFeed, snap => {
    D.feed = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    renderFeed();
    atualizarBadgeFeed();
  });
}

async function carregarLanches() {
  if (!D.perfil) return;
  const q = query(collection(db, 'lanches'), where('autorId', '==', D.perfil.id));
  const snap = await getDocs(q);
  D.lanches = snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

/* ══════════════════════════════════════════
   NAV
══════════════════════════════════════════ */
async function irPara(t) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('screen-' + t).classList.add('active');
  document.getElementById('tab-' + t).classList.add('active');
  if (t === 'propostas') renderPropostas();
  if (t === 'feed')      renderFeed();
  if (t === 'perfil')    renderPerfil();
  atualizarBadgeFeed();
}
window.irPara = irPara;

function atualizarBadgeFeed() {
  const eu = D.perfil?.nome;
  if (!eu) { document.getElementById('bdot-feed').style.display = 'none'; return; }
  const n = D.feed.filter(f => (f.a === eu || f.b === eu) && (f.comentarios || []).some(c => c.autor !== eu)).length;
  const b = document.getElementById('bdot-feed');
  b.style.display = n > 0 ? 'inline-flex' : 'none';
  b.textContent = n;
}

/* ══════════════════════════════════════════
   PERFIL
══════════════════════════════════════════ */
async function salvarPerfil() {
  const nome  = document.getElementById('inp-nome').value.trim();
  const local = document.getElementById('inp-local').value;
  if (!nome) { alert('Preencha seu nome'); return; }
  try {
    await setDoc(doc(db, 'usuarios', D.perfil.id), { nome, local, email: D.perfil.email || '', criadoEm: D.perfil.criadoEm || serverTimestamp() });
    D.perfil = { ...D.perfil, nome, local };
    const qProp = query(collection(db, 'propostas'), where('autorId', '==', D.perfil.id));
    const snap  = await getDocs(qProp);
    for (const d of snap.docs) await updateDoc(d.ref, { autorNome: nome, autorLocal: local });
    atualizarHeader(); renderPerfil();
    alert('Perfil salvo!');
  } catch (e) { console.error(e); alert('Erro ao salvar perfil.'); }
}
window.salvarPerfil = salvarPerfil;

function atualizarHeader() {
  if (!D.perfil) return;
  document.getElementById('h-nm').textContent = D.perfil.nome.split(' ')[0];
  document.getElementById('h-av').textContent = D.perfil.nome.charAt(0).toUpperCase();
}

function renderPerfil() {
  if (!D.perfil) return;
  document.getElementById('inp-nome').value  = D.perfil.nome;
  document.getElementById('inp-local').value = D.perfil.local;
  document.getElementById('perfil-banner').innerHTML = `
    <div class="pbanner">
      <div class="pavatar">${D.perfil.nome.charAt(0).toUpperCase()}</div>
      <div>
        <div class="pname">${escHtml(D.perfil.nome)}</div>
        <div class="plocal">📍 ${escHtml(D.perfil.local)} · ${D.lanches.length} lanche(s) cadastrado(s)</div>
      </div>
    </div>`;

  const el = document.getElementById('lista-lanches-perfil');
  if (!D.lanches.length) {
    el.innerHTML = '<div class="empty"><div class="ei">🍱</div><div class="et">Nenhum lanche cadastrado</div><div class="es">Adicione seus lanches para aparecer em Propostas</div></div>';
  } else {
    el.innerHTML = D.lanches.map(l => `
      <div class="lanche-edit-card">
        ${l.foto
          ? `<div class="lanche-edit-img"><img src="${l.foto}" alt="${escHtml(l.nome)}" onerror="this.parentElement.innerHTML='<div style=width:100%;height:140px;background:var(--s2);display:flex;align-items:center;justify-content:center;font-size:.85rem;color:var(--ink-light)>Sem imagem</div>'"></div>`
          : `<div class="lanche-edit-img" style="height:80px;display:flex;align-items:center;justify-content:center;font-size:.85rem;color:var(--ink-light)">Sem foto</div>`}
        <div class="lanche-edit-body">
          <div class="lanche-edit-name">${escHtml(l.nome)}</div>
          ${l.desc ? `<div class="lanche-edit-desc">${escHtml(l.desc)}</div>` : ''}
          <div class="btn-row">
            <button class="btn btn-ghost btn-sm" onclick="editarLanche('${escId(l.id)}')">Editar</button>
            <button class="btn btn-danger btn-sm" onclick="removerLanche('${escId(l.id)}')">Remover</button>
          </div>
        </div>
      </div>`).join('');
  }

  const pedidosEl = document.getElementById('lista-pedidos-perfil');
  const minhas = D.propostas.filter(p => p.autorId === D.perfil.id && (p.interessados?.length || 0) > 0);
  if (!minhas.length) {
    pedidosEl.innerHTML = '<div class="empty" style="min-height:80px"><div class="ei">📩</div><div class="et">Nenhum pedido de troca no momento</div><div class="es">Quando alguém demonstrar interesse nos seus lanches, aparecerá aqui</div></div>';
  } else {
    pedidosEl.innerHTML = minhas.map(p => `
      <div class="pcard" style="margin-bottom:12px">
        <div style="display:flex;align-items:center;gap:12px;padding:12px">
          ${p.foto ? `<img src="${p.foto}" style="width:48px;height:48px;border-radius:8px;object-fit:cover" onerror="this.style.display='none'">` : '<div style="width:48px;height:48px;border-radius:8px;background:var(--s2);display:flex;align-items:center;justify-content:center">🍽️</div>'}
          <div style="flex:1">
            <div style="font-weight:700;font-size:.95rem">${escHtml(p.lanche)}</div>
            <div style="font-size:.8rem;color:var(--ink-mid)">${p.interessados.length} pessoa(s) interessada(s)</div>
          </div>
          <button class="btn btn-primary btn-sm" onclick="verInteressados('${escId(p.id)}')">Ver</button>
        </div>
      </div>`).join('');
  }
}

/* ══════════════════════════════════════════
   LANCHES
══════════════════════════════════════════ */
function abrirModalLanche(id) {
  lancheEditId = id || null; fotoB64 = null; fotoLoadPromise = null;
  document.getElementById('ml-titulo').textContent = id ? 'Editar lanche' : 'Novo lanche';
  const l = id ? D.lanches.find(x => x.id === id) : null;
  document.getElementById('ml-nome').value = l?.nome || '';
  document.getElementById('ml-desc').value = l?.desc || '';
  document.getElementById('foto-url').value = (l?.foto && !l.foto.startsWith('data:')) ? l.foto : '';
  const prev = document.getElementById('foto-preview-img');
  const ph   = document.getElementById('foto-placeholder');
  if (l?.foto) { prev.src = l.foto; prev.style.display = 'block'; ph.style.display = 'none'; }
  else         { prev.style.display = 'none'; ph.style.display = 'block'; }
  am('modal-lanche');
}
window.abrirModalLanche = abrirModalLanche;
window.editarLanche = (id) => abrirModalLanche(id);

function comprimirImagem(base64, maxLado = 600, qualidade = 0.7) {
  return new Promise(resolve => {
    const img = new Image();
    img.onload = () => {
      const c = document.createElement('canvas');
      let w = img.width, h = img.height;
      if (w > maxLado || h > maxLado) {
        if (w > h) { h = (h / w) * maxLado; w = maxLado; }
        else       { w = (w / h) * maxLado; h = maxLado; }
      }
      c.width = w; c.height = h;
      c.getContext('2d').drawImage(img, 0, 0, w, h);
      resolve(c.toDataURL('image/jpeg', qualidade));
    };
    img.onerror = () => resolve(base64);
    img.src = base64;
  });
}

function onFotoChange(e) {
  const f = e.target.files[0]; if (!f) return;
  fotoLoadPromise = new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = async ev => {
      try {
        let b64 = ev.target.result;
        if (b64.length > 150000) b64 = await comprimirImagem(b64);
        fotoB64 = b64;
        document.getElementById('foto-url').value = '';
        const prev = document.getElementById('foto-preview-img');
        prev.src = fotoB64; prev.style.display = 'block';
        document.getElementById('foto-placeholder').style.display = 'none';
        resolve(b64);
      } catch (err) { reject(err); }
    };
    r.onerror = () => reject(new Error('Erro ao carregar imagem'));
    r.readAsDataURL(f);
  });
}
window.onFotoChange = onFotoChange;

function onFotoUrl(v) {
  if (!v) return;
  fotoB64 = null; fotoLoadPromise = null;
  const prev = document.getElementById('foto-preview-img');
  prev.src = v; prev.style.display = 'block';
  document.getElementById('foto-placeholder').style.display = 'none';
}
window.onFotoUrl = onFotoUrl;

async function salvarLanche() {
  const nome    = document.getElementById('ml-nome').value.trim();
  const desc    = document.getElementById('ml-desc').value.trim();
  const urlFoto = document.getElementById('foto-url').value.trim();
  if (fotoLoadPromise) await fotoLoadPromise; fotoLoadPromise = null;
  const foto = fotoB64 || urlFoto || null;
  if (!nome)     { alert('Informe o nome do lanche'); return; }
  if (!D.perfil) { alert('Salve seu perfil primeiro'); return; }
  try {
    const dados = {
      autorId: D.perfil.id, autorNome: D.perfil.nome, autorLocal: D.perfil.local,
      nome, desc, foto, entregaOpts: ['🛵 Motoboy', '🚶 Deslocamento'],
      atualizadoEm: serverTimestamp()
    };
    if (lancheEditId) {
      await updateDoc(doc(db, 'lanches', lancheEditId), dados);
      const qProp = query(collection(db, 'propostas'), where('lancheId', '==', lancheEditId));
      const snap  = await getDocs(qProp);
      for (const d of snap.docs) await updateDoc(d.ref, { lanche: nome, desc, foto });
    } else {
      const lancheRef = await addDoc(collection(db, 'lanches'), { ...dados, criadoEm: serverTimestamp() });
      await addDoc(collection(db, 'propostas'), {
        autorId: D.perfil.id, autorNome: D.perfil.nome, autorLocal: D.perfil.local,
        lancheId: lancheRef.id, lanche: nome, desc, foto,
        entregaOpts: ['🛵 Motoboy', '🚶 Deslocamento'],
        status: 'aberta', interessados: [],
        data: new Date().toLocaleDateString('pt-BR'),
        criadoEm: serverTimestamp()
      });
    }
    await carregarLanches();
    fm('modal-lanche'); renderPerfil();
  } catch (e) {
    console.error(e);
    alert(e.message?.includes('grande') ? 'Imagem muito grande. Use uma URL de imagem.' : 'Erro ao salvar lanche.');
  }
}
window.salvarLanche = salvarLanche;

async function removerLanche(id) {
  if (!confirm('Remover este lanche?')) return;
  try {
    await deleteDoc(doc(db, 'lanches', id));
    const qProp = query(collection(db, 'propostas'), where('lancheId', '==', id));
    const snap  = await getDocs(qProp);
    for (const d of snap.docs) await deleteDoc(d.ref);
    await carregarLanches(); renderPerfil();
  } catch (e) { console.error(e); alert('Erro ao remover lanche.'); }
}
window.removerLanche = removerLanche;

/* ══════════════════════════════════════════
   PROPOSTAS
══════════════════════════════════════════ */
function getBuscaPropostas() {
  const inp = document.getElementById('busca-propostas');
  return inp ? inp.value.trim().toLowerCase() : '';
}

function propostasFiltradas() {
  const lista = D.propostas.filter(p => p.status === 'aberta');
  const q = getBuscaPropostas();
  if (!q) return lista;
  return lista.filter(p =>
    (p.autorLocal || '').toLowerCase().includes(q) ||
    (p.lanche     || '').toLowerCase().includes(q) ||
    (p.desc       || '').toLowerCase().includes(q) ||
    (p.autorNome  || '').toLowerCase().includes(q)
  );
}

function filtrarPropostas() { renderPropostas(); }
window.filtrarPropostas = filtrarPropostas;

function renderPropostas() {
  const el    = document.getElementById('lista-propostas');
  const lista = propostasFiltradas();
  const total = D.propostas.filter(p => p.status === 'aberta').length;
  if (!total) {
    el.innerHTML = '<div class="empty"><div class="ei">🍽️</div><div class="et">Nenhuma proposta aberta</div><div class="es">Cadastre um lanche no seu perfil para aparecer aqui</div></div>';
    return;
  }
  if (!lista.length) {
    el.innerHTML = '<div class="empty"><div class="ei">🔍</div><div class="et">Nenhuma proposta encontrada</div><div class="es">Tente outro termo de busca</div></div>';
    return;
  }
  el.innerHTML = lista.map(p => cardProposta(p)).join('');
}

function cardProposta(p) {
  const eu      = D.perfil?.nome;
  const meuId   = D.perfil?.id;
  const ehMinha = p.autorId === meuId;
  const jaTenho = (p.interessados || []).some(i => i.usuarioId === meuId);
  const ni      = (p.interessados || []).length;

  let acoes = '';
  if (!eu) {
    acoes = `<button class="btn btn-ghost btn-sm" onclick="irPara('perfil')">Configure seu perfil para trocar</button>`;
  } else if (ehMinha) {
    acoes = ni > 0
      ? `<button class="btn btn-primary btn-sm" onclick="verInteressados('${escId(p.id)}')">${ni} interesse(s) — responder</button>`
      : `<span class="chip chip-gray">Aguardando interesse</span>`;
  } else if (jaTenho) {
    acoes = `<button class="btn btn-ghost btn-sm" onclick="abrirModalConversa('${escId(p.id)}')">💬 Ver conversa</button>`;
  } else {
    acoes = `<button class="btn btn-success btn-sm" onclick="abrirModalProp('${escId(p.id)}')">✓ Tenho interesse</button>`;
  }

  return `
    <div class="pcard">
      ${p.foto
        ? `<img class="pcard-img" src="${p.foto}" alt="${escHtml(p.lanche)}" onerror="this.outerHTML='<div class=pcard-img-placeholder>🍽️</div>'">`
        : `<div class="pcard-img-placeholder">🍽️</div>`}
      <div class="pcard-body">
        <div class="pcard-header">
          <div>
            <div class="pcard-autor">${escHtml(p.autorNome)}</div>
            <div class="pcard-restaurante">📍 ${escHtml(p.autorLocal)}</div>
          </div>
          ${ehMinha && ni > 0 ? `<span class="chip chip-brand">${ni} 🔔</span>` : ''}
        </div>
        <div class="pcard-nome">${escHtml(p.lanche)}</div>
        ${p.desc ? `<div class="pcard-desc">${escHtml(p.desc)}</div>` : ''}
        <div class="pcard-meta">
          ${(p.entregaOpts || []).map(e => `<span class="pcard-entrega">${e}</span>`).join('')}
          <span style="font-size:.75rem;color:var(--ink-light);margin-left:auto">${p.data || ''}</span>
        </div>
        <div class="pcard-actions">${acoes}</div>
      </div>
    </div>`;
}

function abrirModalProp(id) {
  if (!D.perfil) { alert('Configure seu perfil primeiro'); irPara('perfil'); return; }
  propSel = id; eSel = null;
  const p = D.propostas.find(x => x.id === id);
  if (!p) return;
  document.getElementById('mp-titulo').textContent = `Trocar com ${p.autorNome}`;
  document.getElementById('mp-msg').value = '';
  document.querySelectorAll('.eopt').forEach(o => o.classList.remove('sel'));
  document.getElementById('mp-lanche-preview').innerHTML = `
    <div style="background:var(--s2);border-radius:var(--rsm);padding:12px 14px;display:flex;gap:12px;align-items:center">
      ${p.foto ? `<img src="${p.foto}" style="width:56px;height:56px;border-radius:8px;object-fit:cover" onerror="this.style.display='none'">` : '<div style="width:56px;height:56px;border-radius:8px;background:var(--s3);display:flex;align-items:center;justify-content:center;font-size:1.4rem">🍽️</div>'}
      <div>
        <div style="font-weight:700;font-size:.95rem">${escHtml(p.lanche)}</div>
        <div style="font-size:.8rem;color:var(--ink-mid)">${escHtml(p.autorNome)} · ${escHtml(p.autorLocal)}</div>
      </div>
    </div>`;
  am('modal-prop');
}
window.abrirModalProp = abrirModalProp;

function selE(tipo) {
  eSel = tipo;
  document.querySelectorAll('.eopt').forEach(o => o.classList.remove('sel'));
  document.getElementById('eopt-' + tipo).classList.add('sel');
}
window.selE = selE;

async function confirmarInteresse() {
  if (!eSel) { alert('Escolha a forma de entrega'); return; }
  try {
    await updateDoc(doc(db, 'propostas', propSel), {
      interessados: arrayUnion({
        usuarioId: D.perfil.id,
        nome:      D.perfil.nome,
        local:     D.perfil.local,
        entrega:   eSel === 'motoboy' ? '🛵 Motoboy' : '🚶 Deslocamento',
        msg:       document.getElementById('mp-msg').value.trim(),
        mensagens: []
      })
    });
    fm('modal-prop');
  } catch (e) { console.error(e); alert('Erro ao registrar interesse.'); }
}
window.confirmarInteresse = confirmarInteresse;

function verInteressados(id) {
  const p = D.propostas.find(x => x.id === id);
  if (!p) return;
  propSel = id;
  document.getElementById('mi-body').innerHTML = (p.interessados || []).map(i => {
    const thread = i.mensagens || (i.msg ? [{ autor: i.nome, texto: i.msg, data: '' }] : []);
    return `
      <div style="border:1px solid var(--s3);border-radius:var(--rsm);padding:14px;margin-bottom:12px">
        <div style="font-family:'Syne',sans-serif;font-weight:700;font-size:.95rem;margin-bottom:3px">${escHtml(i.nome)}</div>
        <div style="font-size:.8rem;color:var(--ink-mid);margin-bottom:10px">📍 ${escHtml(i.local)} · ${escHtml(i.entrega)}</div>
        <div style="max-height:140px;overflow-y:auto;margin-bottom:10px;padding:8px;background:var(--s2);border-radius:var(--rsm)">
          ${thread.map(m => `<div style="margin-bottom:8px"><span style="font-size:.72rem;font-weight:600;color:var(--ink-mid)">${escHtml(m.autor||'?')}:</span> <span style="font-size:.85rem">${escHtml(m.texto||'')}</span></div>`).join('')}
        </div>
        <div style="display:flex;gap:8px;margin-bottom:10px">
          <input class="fi" id="msg-inp-${safeId(id)}-${safeId(i.usuarioId)}" type="text" placeholder="Responder a ${escHtml(i.nome)}..." style="flex:1" onkeydown="if(event.key==='Enter')enviarMensagemInteresse('${escId(id)}','${escId(i.usuarioId)}')">
          <button class="btn btn-primary btn-sm" onclick="enviarMensagemInteresse('${escId(id)}','${escId(i.usuarioId)}')">Enviar</button>
        </div>
        <div class="btn-row">
          <button class="btn btn-success btn-sm" onclick="aceitarTroca('${escId(id)}','${escId(i.usuarioId)}')">✓ Aceitar troca</button>
          <button class="btn btn-ghost btn-sm" onclick="recusarInteresse('${escId(id)}','${escId(i.usuarioId)}')">Recusar</button>
        </div>
      </div>`;
  }).join('');
  am('modal-interesse');
}
window.verInteressados = verInteressados;

async function enviarMensagemInteresse(propId, interessadoId) {
  const inp = document.getElementById('msg-inp-' + safeId(propId) + '-' + safeId(interessadoId));
  if (!inp) return;
  const txt = inp.value.trim(); if (!txt) return;
  try {
    const propRef = doc(db, 'propostas', propId);
    const snap    = await getDoc(propRef);
    const novos   = (snap.data().interessados || []).map(i => {
      if (i.usuarioId !== interessadoId) return i;
      return { ...i, mensagens: [...(i.mensagens || []), { autor: D.perfil.nome, texto: txt, data: new Date().toLocaleDateString('pt-BR') }] };
    });
    await updateDoc(propRef, { interessados: novos });
    inp.value = '';
    const propAtual = D.propostas.find(x => x.id === propId);
    if (propAtual) { propAtual.interessados = novos; verInteressados(propId); }
  } catch (e) { console.error(e); alert('Erro ao enviar mensagem.'); }
}
window.enviarMensagemInteresse = enviarMensagemInteresse;

async function recusarInteresse(propId, interessadoId) {
  const p = D.propostas.find(x => x.id === propId);
  if (!p) return;
  const interesse = (p.interessados || []).find(i => i.usuarioId === interessadoId);
  if (!interesse) return;
  try {
    await updateDoc(doc(db, 'propostas', propId), { interessados: arrayRemove(interesse) });
    fm('modal-interesse');
  } catch (e) { console.error(e); alert('Erro ao recusar interesse.'); }
}
window.recusarInteresse = recusarInteresse;

async function aceitarTroca(propId, interessadoId) {
  const p = D.propostas.find(x => x.id === propId);
  if (!p) return;
  const i = (p.interessados || []).find(x => x.usuarioId === interessadoId);
  if (!i) return;
  try {
    await addDoc(collection(db, 'feed'), {
      a: D.perfil.nome, aLocal: D.perfil.local,
      b: i.nome,        bLocal: i.local,
      lanche: p.lanche, desc: p.desc || '', foto: p.foto || null,
      entrega: i.entrega, data: new Date().toLocaleDateString('pt-BR'),
      reacoes: { '😍': [], '👏': [], '🔥': [], '😋': [] },
      comentarios: [],
      participantes: [D.perfil.id, interessadoId],
      criadoEm: serverTimestamp()
    });
    await updateDoc(doc(db, 'propostas', propId), { status: 'concluida' });
    fm('modal-interesse');
    alert('Troca confirmada! Aparece no Feed agora 🎉');
  } catch (e) { console.error(e); alert('Erro ao aceitar troca.'); }
}
window.aceitarTroca = aceitarTroca;

async function abrirModalConversa(propId) {
  const p = D.propostas.find(x => x.id === propId);
  if (!p || !D.perfil) return;
  const meuInteresse = (p.interessados || []).find(i => i.usuarioId === D.perfil.id);
  if (!meuInteresse) { alert('Interesse não encontrado'); return; }
  propSel = propId;
  document.getElementById('mc-titulo').textContent = `Conversa com ${p.autorNome}`;
  document.getElementById('mc-preview').innerHTML = `
    <div style="background:var(--s2);border-radius:var(--rsm);padding:12px 14px;display:flex;gap:12px;align-items:center">
      ${p.foto ? `<img src="${p.foto}" style="width:48px;height:48px;border-radius:8px;object-fit:cover" onerror="this.style.display='none'">` : '<div style="width:48px;height:48px;border-radius:8px;background:var(--s3);display:flex;align-items:center;justify-content:center;font-size:1.2rem">🍽️</div>'}
      <div>
        <div style="font-weight:700;font-size:.95rem">${escHtml(p.lanche)}</div>
        <div style="font-size:.8rem;color:var(--ink-mid)">${escHtml(p.autorNome)} · ${escHtml(p.autorLocal)}</div>
      </div>
    </div>`;
  const msgs = meuInteresse.mensagens || (meuInteresse.msg ? [{ autor: meuInteresse.nome, texto: meuInteresse.msg, data: '' }] : []);
  document.getElementById('mc-thread').innerHTML = msgs.map(m => `
    <div style="margin-bottom:8px">
      <span style="font-size:.72rem;font-weight:600;color:var(--ink-mid)">${escHtml(m.autor || '?')}:</span>
      <span style="font-size:.85rem">${escHtml(m.texto || '')}</span>
    </div>`).join('');
  document.getElementById('mc-input').value = '';
  am('modal-conversa');
}
window.abrirModalConversa = abrirModalConversa;

async function enviarMensagemComoInteressado() {
  if (!propSel || !D.perfil) return;
  const inp = document.getElementById('mc-input');
  const txt = inp?.value.trim(); if (!txt) return;
  try {
    const propRef = doc(db, 'propostas', propSel);
    const snap    = await getDoc(propRef);
    const novos   = (snap.data().interessados || []).map(i => {
      if (i.usuarioId !== D.perfil.id) return i;
      return { ...i, mensagens: [...(i.mensagens || []), { autor: D.perfil.nome, texto: txt, data: new Date().toLocaleDateString('pt-BR') }] };
    });
    await updateDoc(propRef, { interessados: novos });
    inp.value = '';
    abrirModalConversa(propSel);
  } catch (e) { console.error(e); alert('Erro ao enviar mensagem.'); }
}
window.enviarMensagemComoInteressado = enviarMensagemComoInteressado;

/* ══════════════════════════════════════════
   FEED
══════════════════════════════════════════ */
function renderFeed() {
  const el = document.getElementById('lista-feed');
  if (!D.feed.length) {
    el.innerHTML = '<div class="empty"><div class="ei">💬</div><div class="et">Nenhuma troca concluída ainda</div><div class="es">As trocas confirmadas aparecem aqui</div></div>';
    return;
  }
  el.innerHTML = D.feed.map(f => cardFeed(f)).join('');
}

function cardFeed(f) {
  const eu      = D.perfil?.nome;
  const euId    = D.perfil?.id;
  const participa = eu && (f.a === eu || f.b === eu);

  const reacoes = Object.entries(f.reacoes || {}).map(([emoji, lista]) => {
    const ativa = euId && Array.isArray(lista) && lista.includes(euId) ? 'ativa' : '';
    return `<button class="reacao-btn ${ativa}" onclick="reagir('${escId(f.id)}','${String(emoji).replace(/'/g,"\\'")}')">${emoji} <span class="reacao-count">${lista?.length || ''}</span></button>`;
  }).join('');

  const coms = (f.comentarios || []).map(c => `
    <div class="comentario-item">
      <div class="com-avatar">${c.autor.charAt(0).toUpperCase()}</div>
      <div class="com-bubble">
        <div class="com-autor">${escHtml(c.autor)}</div>
        <div class="com-texto">${escHtml(c.texto)}</div>
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
          <div class="feed-troca-title">${escHtml(f.a)} ⇄ ${escHtml(f.b)}</div>
          <div class="feed-troca-sub">${escHtml(f.aLocal)} · ${escHtml(f.bLocal)} · ${escHtml(f.entrega)} · ${f.data}</div>
        </div>
      </div>
      ${f.foto ? `<img class="feed-img" src="${f.foto}" alt="${escHtml(f.lanche)}" onerror="this.style.display='none'">` : ''}
      <div class="feed-body">
        <div class="feed-lanche-nome">${escHtml(f.lanche)}</div>
        ${f.desc ? `<div class="feed-lanche-desc">${escHtml(f.desc)}</div>` : ''}
      </div>
      <div class="reacoes-bar">${reacoes}</div>
      <div class="comentarios">${coms}${comInput}</div>
    </div>`;
}

async function reagir(feedId, emoji) {
  if (!D.perfil) { alert('Configure seu perfil para reagir'); return; }
  try {
    const feedRef = doc(db, 'feed', feedId);
    const snap    = await getDoc(feedRef);
    const reacoes = snap.data().reacoes || {};
    const lista   = [...(reacoes[emoji] || [])];
    const idx     = lista.indexOf(D.perfil.id);
    if (idx >= 0) lista.splice(idx, 1); else lista.push(D.perfil.id);
    reacoes[emoji] = lista;
    await updateDoc(feedRef, { reacoes });
  } catch (e) { console.error(e); alert('Erro ao reagir.'); }
}
window.reagir = reagir;

async function comentar(feedId) {
  if (!D.perfil) return;
  const inp = document.getElementById('ci-' + feedId);
  const txt = inp?.value.trim(); if (!txt) return;
  try {
    await updateDoc(doc(db, 'feed', feedId), {
      comentarios: arrayUnion({ autor: D.perfil.nome, texto: txt, data: new Date().toLocaleDateString('pt-BR') })
    });
    if (inp) inp.value = '';
  } catch (e) { console.error(e); alert('Erro ao comentar.'); }
}
window.comentar = comentar;

/* ══════════════════════════════════════════
   UTILS
══════════════════════════════════════════ */
function escHtml(s) { return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
function escId(id)  { return String(id).replace(/\\/g,'\\\\').replace(/'/g,"\\'"); }
function safeId(id) { return String(id).replace(/[^a-zA-Z0-9_-]/g,'_'); }

function am(id) { document.getElementById(id).classList.add('open'); }
function fm(id) { document.getElementById(id).classList.remove('open'); }
window.fm = fm;

document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.mwrap').forEach(m => {
    m.addEventListener('click', e => { if (e.target === m) m.classList.remove('open'); });
  });
});
