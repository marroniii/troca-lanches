const supabase = require('../config/supabase');

/**
 * Busca todas as propostas abertas com detalhes do dono, lanche e interessados
 */
async function getPropostasAbertas() {
  try {
    const { data, error } = await supabase
      .from('propostas')
      .select(`
        *,
        lanches:lanche_id(*),
        usuario:dono_id(id, nome, local),
        interessados(
          *,
          usuarios ( id, nome, local )
        )
      `)
      .eq('status', 'aberta')
      .order('created_at', { ascending: false });

    if (error) throw error;

    return (data || []).map(mapPropostaParaFront);
  } catch (err) {
    console.error('[Get Propostas Abertas Error]', err.message);
    throw err;
  }
}

/**
 * Busca propostas de um usuário (suas propostas)
 */
async function getPropostasDoUsuario(donoId) {
  try {
    const { data, error } = await supabase
      .from('propostas')
      .select(`
        *,
        lanches:lanche_id(*),
        usuario:dono_id(id, nome, local),
        interessados(
          *,
          usuarios ( id, nome, local )
        )
      `)
      .eq('dono_id', donoId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return (data || []).map(mapPropostaParaFront);
  } catch (err) {
    console.error('[Get Propostas do Usuário Error]', err.message);
    throw err;
  }
}

/**
 * Busca uma proposta pelo ID
 */
async function getPropostaById(propostaId) {
  try {
    const { data, error } = await supabase
      .from('propostas')
      .select(`
        *,
        lanches:lanche_id(*),
        usuario:dono_id(id, nome, local),
        interessados(
          *,
          usuarios ( id, nome, local )
        )
      `)
      .eq('id', propostaId)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    return data ? mapPropostaParaFront(data) : null;
  } catch (err) {
    console.error('[Get Proposta By ID Error]', err.message);
    throw err;
  }
}

/**
 * Adiciona interesse em uma proposta
 */
async function adicionarInteresse(propostaId, usuarioId, entrega, mensagem = '') {
  try {
    // Verifica se já tem interesse
    const { data: existente } = await supabase
      .from('interessados')
      .select('*')
      .eq('proposta_id', propostaId)
      .eq('usuario_id', usuarioId)
      .single();

    if (existente) {
      throw new Error('Você já tem interesse nesta proposta');
    }

    // Adiciona novo interesse
    const { data, error } = await supabase
      .from('interessados')
      .insert([{
        proposta_id: propostaId,
        usuario_id: usuarioId,
        entrega,
        mensagens: mensagem ? [{ texto: mensagem, timestamp: new Date().toISOString() }] : []
      }])
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (err) {
    console.error('[Adicionar Interesse Error]', err.message);
    throw err;
  }
}

/**
 * Remove interesse em uma proposta
 */
async function removerInteresse(propostaId, usuarioId) {
  try {
    const { error } = await supabase
      .from('interessados')
      .delete()
      .eq('proposta_id', propostaId)
      .eq('usuario_id', usuarioId);

    if (error) throw error;
    return true;
  } catch (err) {
    console.error('[Remover Interesse Error]', err.message);
    throw err;
  }
}

/**
 * Aceita um interesse e move para trocas (feed)
 */
async function aceitarInteresse(propostaId, donoId, usuarioInteressadoId) {
  try {
    // 1. Busca proposta e verifica permissões
    const { data: proposta, error: getError } = await supabase
      .from('propostas')
      .select('dono_id, lanche_id, status')
      .eq('id', propostaId)
      .single();

    if (getError) throw getError;
    if (proposta.dono_id !== donoId) {
      throw new Error('Permissão negada: apenas o dono pode aceitar');
    }

    // 2. Busca o interesse
    const { data: interesse, error: intError } = await supabase
      .from('interessados')
      .select('*')
      .eq('proposta_id', propostaId)
      .eq('usuario_id', usuarioInteressadoId)
      .single();

    if (intError) throw new Error('Interesse não encontrado');

    // 3. Cria troca no feed
    const { data: troca, error: trocaError } = await supabase
      .from('trocas')
      .insert([{
        a_id: donoId,
        b_id: usuarioInteressadoId,
        lanche_id: proposta.lanche_id,
        entrega: interesse.entrega
      }])
      .select()
      .single();

    if (trocaError) throw trocaError;

    // 4. Atualiza proposta para aceita
    const { error: updateError } = await supabase
      .from('propostas')
      .update({ status: 'aceita' })
      .eq('id', propostaId);

    if (updateError) throw updateError;

    // 5. Deleta interesse (não precisa mais)
    await supabase
      .from('interessados')
      .delete()
      .eq('proposta_id', propostaId)
      .eq('usuario_id', usuarioInteressadoId);

    const { getTrocaById } = require('./trocaService');
    return await getTrocaById(troca.id);
  } catch (err) {
    console.error('[Aceitar Interesse Error]', err.message);
    throw err;
  }
}

/**
 * Rejeita um interesse
 */
async function rejeitarInteresse(propostaId, donoId, usuarioInteressadoId) {
  try {
    const { data: proposta, error: getError } = await supabase
      .from('propostas')
      .select('dono_id')
      .eq('id', propostaId)
      .single();

    if (getError) throw getError;
    if (proposta.dono_id !== donoId) {
      throw new Error('Permissão negada');
    }

    // Remove interesse
    const { error } = await supabase
      .from('interessados')
      .delete()
      .eq('proposta_id', propostaId)
      .eq('usuario_id', usuarioInteressadoId);

    if (error) throw error;
    return true;
  } catch (err) {
    console.error('[Rejeitar Interesse Error]', err.message);
    throw err;
  }
}

/**
 * Mapeia proposta para formato frontend
 */
function mapPropostaParaFront(p) {
  const dono = p.usuario || {};
  const lanche = p.lanches || {};

  return {
    id: p.id,
    donoId: p.dono_id,
    lancheId: p.lanche_id,
    autorNome: dono.nome || 'Desconhecido',
    autorLocal: dono.local || '',
    lanche: lanche.nome || '',
    desc: lanche.descricao || '',
    foto: lanche.foto || null,
    entregaOpts: ['🛵 Motoboy', '🚶 Deslocamento'],
    status: p.status,
    interessados: (p.interessados || []).map((row) => {
      const perfil = row.usuarios || {};
      const textoMsg = row.mensagens?.[0]?.texto || '';
      return {
        usuarioId: row.usuario_id,
        nome: perfil.nome || 'Desconhecido',
        entrega: row.entrega,
        mensagem: textoMsg,
        msg: textoMsg,
        data: row.created_at
      };
    }),
    data: new Date(p.created_at).toLocaleDateString('pt-BR')
  };
}

/**
 * Adiciona mensagem a uma proposta
 */
async function adicionarMensagem(propostaId, remetenteId, interessadoId, texto) {
  const proposta = await getPropostaById(propostaId);
  if (!proposta) throw new Error('Proposta não encontrada');
  const isDono = proposta.donoId === remetenteId;
  const isInteressado = interessadoId === remetenteId;
  if (!isDono && !isInteressado) throw new Error('Permissão negada');
  const { error } = await supabase.from('mensagens').insert({
    proposta_id: propostaId,
    remetente_id: remetenteId,
    interessado_id: interessadoId,
    texto,
    created_at: new Date().toISOString()
  });
  if (error) throw error;
  return getPropostaById(propostaId);
}

module.exports = {
  getPropostasAbertas,
  getPropostasDoUsuario,
  getPropostaById,
  adicionarInteresse,
  removerInteresse,
  aceitarInteresse,
  rejeitarInteresse,
  adicionarMensagem,
  mapPropostaParaFront
};