const supabase = require('../config/supabase');

/**
 * Busca usuário por nome + local (para login)
 */
async function getUserByNomeLocal(nome, local) {
  const { data, error } = await supabase
    .from('usuarios')
    .select('*')
    .eq('nome', nome)
    .eq('local', local)
    .maybeSingle(); // maybeSingle não joga erro se não achar

  if (error) throw error;
  return data || null;
}

/**
 * Cria ou atualiza perfil de usuário
 */
async function createOrUpdateUser(id, nome, local) {
  const { data, error } = await supabase
    .from('usuarios')
    .upsert({ id, nome, local }, { onConflict: 'id' })
    .select()
    .single();

  if (error) {
    console.error('[Users Service Error]', error.message);
    throw new Error(`Erro ao criar/atualizar usuário: ${error.message}`);
  }
  return data;
}

/**
 * Busca usuário por ID
 */
async function getUserById(userId) {
  const { data, error } = await supabase
    .from('usuarios')
    .select('*')
    .eq('id', userId)
    .maybeSingle();

  if (error) throw error;
  return data || null;
}

// getUserProfile é alias de getUserById
const getUserProfile = getUserById;

/**
 * Busca todos os usuários
 */
async function getAllUsers() {
  const { data, error } = await supabase
    .from('usuarios')
    .select('id, nome, local, created_at')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

module.exports = {
  createOrUpdateUser,
  getUserByNomeLocal,
  getUserProfile,
  getUserById,
  getAllUsers
};