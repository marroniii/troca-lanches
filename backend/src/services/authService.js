const supabase = require('../config/supabase');
const { createOrUpdateUser } = require('./usersService');

/**
 * Faz login ou cria conta com email/password via Supabase Auth
 * Retorna session com access_token para usar em requisições
 */
async function loginOrSignup(email, password, userData = {}) {
  try {
    // Tenta fazer login primeiro
    let result = await supabase.auth.signInWithPassword({ email, password });

    // Se falhar (usuário não existe), cria conta
    if (result.error?.status === 400) {
      result = await supabase.auth.signUp({ email, password });
    }

    if (result.error) {
      throw new Error(result.error.message);
    }

    const { user, session } = result.data;

    // Se cadastro novo ou dados faltam no banco, cria/atualiza perfil
    if (userData.nome || userData.local) {
      const profile = await createOrUpdateUser(user.id, userData.nome, userData.local);
      return {
        user,
        session,
        profile
      };
    }

    return { user, session };
  } catch (err) {
    console.error('[Login/Signup Error]', err.message);
    throw new Error(`Falha na autenticação: ${err.message}`);
  }
}

/**
 * Faz logout (invalidar token)
 * Nota: No Supabase, tokens expiram naturalmente
 * Este método é mais para limpeza no cliente
 */
async function logout(token) {
  try {
    // Com token, pode fazer logout do lado do cliente
    // Supabase auth handled automaticamente
    return { success: true };
  } catch (err) {
    console.error('[Logout Error]', err.message);
    throw err;
  }
}

/**
 * Valida token JWT e retorna dados do usuário
 */
async function verifyToken(token) {
  try {
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      throw new Error('Token inválido');
    }

    return user;
  } catch (err) {
    console.error('[Verify Token Error]', err.message);
    throw err;
  }
}

/**
 * Troca/refresh do access token usando refresh token
 */
async function refreshToken(refreshToken) {
  try {
    const { data: { session }, error } = await supabase.auth.refreshSession({
      refresh_token: refreshToken
    });

    if (error) {
      throw new Error('Falha ao renovar token');
    }

    return session;
  } catch (err) {
    console.error('[Refresh Token Error]', err.message);
    throw err;
  }
}

/**
 * Envia email de reset de senha
 */
async function sendPasswordReset(email) {
  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${process.env.FRONTEND_URL}/reset-password`
    });

    if (error) {
      throw error;
    }

    return { message: 'Email de reset enviado' };
  } catch (err) {
    console.error('[Password Reset Error]', err.message);
    throw err;
  }
}

/**
 * Atualiza senha com token de reset
 */
async function updatePasswordWithToken(token, newPassword) {
  try {
    const { error } = await supabase.auth.updateUser(
      { password: newPassword },
      { 
        headers: { 
          'X-Supabase-Auth-Token': token 
        } 
      }
    );

    if (error) {
      throw error;
    }

    return { message: 'Senha atualizada com sucesso' };
  } catch (err) {
    console.error('[Update Password Error]', err.message);
    throw err;
  }
}

module.exports = {
  loginOrSignup,
  logout,
  verifyToken,
  refreshToken,
  sendPasswordReset,
  updatePasswordWithToken
};
