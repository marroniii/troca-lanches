const supabase = require('../config/supabase');

/**
 * Busca todas as trocas (feed)
 */
async function getTrocas() {
  try {
    const { data, error } = await supabase
      .from('trocas')
      .select(`
        *,
        lancheData:lanches(*),
        participanteA:a_id(id, nome, local),
        participanteB:b_id(id, nome, local)
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return (data || []).map(mapTrocaParaFront);
  } catch (err) {
    console.error('[Get Trocas Error]', err.message);
    throw err;
  }
}

/**
 * Busca uma troca específica
 */
async function getTrocaById(trocaId) {
  try {
    const { data, error } = await supabase
      .from('trocas')
      .select(`
        *,
        lancheData:lanches(*),
        participanteA:a_id(id, nome, local),
        participanteB:b_id(id, nome, local)
      `)
      .eq('id', trocaId)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    return data ? mapTrocaParaFront(data) : null;
  } catch (err) {
    console.error('[Get Troca By ID Error]', err.message);
    throw err;
  }
}

/**
 * Busca trocas do usuário (como participante)
 */
async function getTrocasDoUsuario(usuarioId) {
  try {
    const { data, error } = await supabase
      .from('trocas')
      .select(`
        *,
        lancheData:lanches(*),
        participanteA:a_id(id, nome, local),
        participanteB:b_id(id, nome, local)
      `)
      .or(`a_id.eq.${usuarioId},b_id.eq.${usuarioId}`)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return (data || []).map(mapTrocaParaFront);
  } catch (err) {
    console.error('[Get Trocas do Usuário Error]', err.message);
    throw err;
  }
}

/**
 * Adiciona reação a uma troca (emoji)
 */
async function adicionarReacao(trocaId, usuarioId, emoji) {
  try {
    const { data: troca, error: getError } = await supabase
      .from('trocas')
      .select('reacoes')
      .eq('id', trocaId)
      .single();

    if (getError) throw getError;

    const reacoes = troca.reacoes || {};
    if (!reacoes[emoji]) {
      reacoes[emoji] = [];
    }

    // Evita duplicatas
    if (!reacoes[emoji].includes(usuarioId)) {
      reacoes[emoji].push(usuarioId);
    }

    const { error } = await supabase
      .from('trocas')
      .update({ reacoes })
      .eq('id', trocaId);

    if (error) throw error;
    return await getTrocaById(trocaId);
  } catch (err) {
    console.error('[Adicionar Reacao Error]', err.message);
    throw err;
  }
}

/**
 * Remove reação de uma troca
 */
async function removerReacao(trocaId, usuarioId, emoji) {
  try {
    const { data: troca, error: getError } = await supabase
      .from('trocas')
      .select('reacoes')
      .eq('id', trocaId)
      .single();

    if (getError) throw getError;

    const reacoes = troca.reacoes || {};
    if (reacoes[emoji]) {
      reacoes[emoji] = reacoes[emoji].filter(id => id !== usuarioId);
    }

    const { data, error } = await supabase
      .from('trocas')
      .update({ reacoes })
      .eq('id', trocaId)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (err) {
    console.error('[Remover Reacao Error]', err.message);
    throw err;
  }
}

/**
 * Adiciona comentário a uma troca (apenas participantes)
 */
async function adicionarComentario(trocaId, usuarioId, texto) {
  try {
    // Verifica se é participante
    const { data: troca, error: getError } = await supabase
      .from('trocas')
      .select('a_id, b_id, comentarios')
      .eq('id', trocaId)
      .single();

    if (getError) throw getError;

    const isParticipante = troca.a_id === usuarioId || troca.b_id === usuarioId;
    if (!isParticipante) {
      throw new Error('Permissão negada: apenas participantes podem comentar');
    }

    const comentarios = troca.comentarios || [];
    comentarios.push({
      usuario_id: usuarioId,
      texto,
      timestamp: new Date().toISOString()
    });

    const { data, error } = await supabase
      .from('trocas')
      .update({ comentarios })
      .eq('id', trocaId)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (err) {
    console.error('[Adicionar Comentario Error]', err.message);
    throw err;
  }
}

/**
 * Remove comentário de uma troca
 */
async function removerComentario(trocaId, usuarioId, timestamp) {
  try {
    const { data: troca, error: getError } = await supabase
      .from('trocas')
      .select('comentarios')
      .eq('id', trocaId)
      .single();

    if (getError) throw getError;

    const comentarios = (troca.comentarios || []).filter(c => 
      !(c.usuario_id === usuarioId && c.timestamp === timestamp)
    );

    const { data, error } = await supabase
      .from('trocas')
      .update({ comentarios })
      .eq('id', trocaId)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (err) {
    console.error('[Remover Comentario Error]', err.message);
    throw err;
  }
}

/**
 * Mapeia troca para formato frontend
 */
function mapTrocaParaFront(t) {
  const dono = t.participanteA || {};
  const interessado = t.participanteB || {};
  const lanche = t.lancheData || {};

  return {
    id: t.id,
    a: dono.nome || 'Desconhecido',
    aLocal: dono.local || '',
    aId: dono.id,
    b: interessado.nome || 'Desconhecido',
    bLocal: interessado.local || '',
    bId: interessado.id,
    lanche: lanche.nome || '',
    desc: lanche.descricao || '',
    foto: lanche.foto || null,
    entrega: t.entrega,
    data: new Date(t.created_at).toLocaleDateString('pt-BR'),
    reacoes: t.reacoes || {},
    comentarios: (t.comentarios || []).map((c) => {
      const uid = c.usuario_id;
      let autor = 'Usuário';
      if (uid === dono.id) autor = dono.nome || autor;
      else if (uid === interessado.id) autor = interessado.nome || autor;
      return {
        usuarioId: uid,
        autor,
        texto: c.texto,
        data: c.timestamp
      };
    })
  };
}

module.exports = {
  getTrocas,
  getTrocaById,
  getTrocasDoUsuario,
  adicionarReacao,
  removerReacao,
  adicionarComentario,
  removerComentario,
  mapTrocaParaFront
};