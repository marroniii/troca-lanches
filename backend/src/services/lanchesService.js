const supabase = require('../config/supabase');
const { getUserById } = require('./usersService');

/**
 * Cria um novo lanche e automaticamente cria uma proposta aberta
 */
async function createLanche(donoId, nome, descricao, fotoUrl) {
  try {
    if (!nome?.trim()) {
      throw new Error('Nome do lanche é obrigatório');
    }

    if (!donoId) {
      throw new Error('ID do dono é obrigatório');
    }

    // 1. Criar lanche
    const { data: lanche, error: lanchError } = await supabase
      .from('lanches')
      .insert([{
        dono_id: donoId,
        nome: nome.trim(),
        descricao: descricao?.trim() || '',
        foto: fotoUrl || null
      }])
      .select('id, nome, descricao, foto, dono_id, created_at')
      .single();

    if (lanchError) {
      throw new Error(`Erro ao criar lanche: ${lanchError.message}`);
    }

    // 2. Criar proposta aberta automaticamente
    const { data: proposta, error: propostaError } = await supabase
      .from('propostas')
      .insert([{
        lanche_id: lanche.id,
        dono_id: donoId,
        status: 'aberta'
      }])
      .select()
      .single();

    if (propostaError) {
      // Se falhar, deleta o lanche criado
      await supabase.from('lanches').delete().eq('id', lanche.id);
      throw new Error(`Erro ao criar proposta: ${propostaError.message}`);
    }

    return {
      lanche,
      proposta: mapPropostaParaFront(proposta, lanche)
    };
  } catch (err) {
    console.error('[Create Lanche Error]', err.message);
    throw err;
  }
}

/**
 * Busca todos os lanches do usuário
 */
async function getLanchesByUser(donoId) {
  try {
    const { data, error } = await supabase
      .from('lanches')
      .select('*')
      .eq('dono_id', donoId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error('[Get Lanches Error]', err.message);
    throw err;
  }
}

/**
 * Busca um lanche específico
 */
async function getLancheById(lanceId) {
  try {
    const { data, error } = await supabase
      .from('lanches')
      .select('*')
      .eq('id', lanceId)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    return data || null;
  } catch (err) {
    console.error('[Get Lanche By ID Error]', err.message);
    throw err;
  }
}

/**
 * Atualiza um lanche (apenas o dono)
 */
async function updateLanche(lanceId, donoId, updates) {
  try {
    // Verifica se é o dono
    const lanche = await getLancheById(lanceId);
    if (!lanche) {
      throw new Error('Lanche não encontrado');
    }
    if (lanche.dono_id !== donoId) {
      throw new Error('Permissão negada: você não é o dono deste lanche');
    }

    const { data, error } = await supabase
      .from('lanches')
      .update(updates)
      .eq('id', lanceId)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (err) {
    console.error('[Update Lanche Error]', err.message);
    throw err;
  }
}

/**
 * Deleta um lanche (cascata: proposta, trocas, etc)
 */
async function deleteLanche(lanceId, donoId) {
  try {
    // Verifica permissão
    const lanche = await getLancheById(lanceId);
    if (!lanche) {
      throw new Error('Lanche não encontrado');
    }
    if (lanche.dono_id !== donoId) {
      throw new Error('Permissão negada');
    }

    const { error } = await supabase
      .from('lanches')
      .delete()
      .eq('id', lanceId);

    if (error) throw error;
    return true;
  } catch (err) {
    console.error('[Delete Lanche Error]', err.message);
    throw err;
  }
}

/**
 * Busca todos os lanches com informações do dono (para feed/listagem pública)
 */
async function getAllLanches() {
  try {
    const { data, error } = await supabase
      .from('lanches')
      .select('*, dono:dono_id(id, nome, local)')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error('[Get All Lanches Error]', err.message);
    throw err;
  }
}

/**
 * Mapeia proposta para formato frontend (compatibilidade com propostaService: campo `lanche` = nome do prato)
 * @param {object} proposta - linha em `propostas`
 * @param {object|null} lancheRow - linha em `lanches` (obrigatório após criar lanche)
 */
function mapPropostaParaFront(proposta, lancheRow = null) {
  const base = {
    ...proposta,
    entregaOpts: ['🛵 Motoboy', '🚶 Deslocamento']
  };
  if (lancheRow) {
    base.lanche = lancheRow.nome || '';
    base.desc = lancheRow.descricao || '';
    base.foto = lancheRow.foto ?? null;
  }
  return base;
}

/**
 * Comprime imagem base64 para envio (cliente-side)
 */
function comprimirImagem(imgBase64, maxWidth = 600, maxHeight = 600) {
  return new Promise((resolve, reject) => {
    try {
      const img = new Image();
      img.onload = function () {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        resolve(canvas.toDataURL('image/jpeg', 0.8));
      };
      img.onerror = () => reject(new Error('Erro ao processar imagem'));
      img.src = imgBase64;
    } catch (err) {
      reject(err);
    }
  });
}

module.exports = {
  createLanche,
  getLanchesByUser,
  getLancheById,
  updateLanche,
  deleteLanche,
  getAllLanches,
  comprimirImagem,
  mapPropostaParaFront
};