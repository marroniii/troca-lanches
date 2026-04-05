const { validate: isUuid } = require('uuid');
const supabase = require('../config/supabase');
const { getUserById } = require('../services/usersService');
const { validarJWT } = require('../utils/jwt');

/**
 * Middleware de autenticação (obrigatória)
 * 
 * Ordem de tentativa:
 * 1. JWT (Authorization: Bearer <token>) - produção
 * 2. x-user-id (header customizado) - fallback desenvolvimento
 * 
 * Se nenhum funcionar, retorna 401
 */
async function authMiddleware(req, res, next) {
  try {
    let userId;

    // 1. Tenta JWT primeiro (Authorization: Bearer <token>)
    const authHeader = req.header('Authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7).trim();
      try {
        const jwtPayload = validarJWT(token);
        userId = jwtPayload.sub;
      } catch (jwtErr) {
        // JWT inválido - tenta fallback antes de falhar
        // console.debug('[Auth Debug] JWT inválido, tentando fallback x-user-id');
      }
    }
    
    // 2. Fallback para x-user-id (desenvolvimento e testes automatizados — nunca em produção)
    if (!userId && (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test')) {
      userId = req.header('x-user-id');
    }

    // 3. Se nenhum identificador foi fornecido
    if (!userId) {
      return res.status(401).json({ 
        error: 'Autenticação obrigatória',
        details: 'Envie: Authorization: Bearer <token> ou x-user-id: <seu-id>'
      });
    }

    if (!isUuid(userId)) {
      return res.status(401).json({
        error: 'Identificador de usuário inválido',
        details: 'Use um token JWT válido'
      });
    }

    // 4. Valida se usuário existe no banco
    const user = await getUserById(userId);
    if (!user) {
      return res.status(401).json({ 
        error: 'Usuário não encontrado',
        details: 'Faça login novamente ou configure seu perfil'
      });
    }

    // 5. Adiciona usuário ao request para uso posterior
    req.user = user;
    next();

  } catch (err) {
    console.error('[Auth Error]', err.message);
    res.status(500).json({ 
      error: 'Erro ao verificar autenticação',
      details: err.message 
    });
  }
}

/**
 * Middleware de autenticação opcional
 * 
 * Tenta validar JWT ou x-user-id, mas não falha se não encontrar
 * Útil para rotas que mostrem dados diferentes baseado no usuário autenticado
 */
async function optionalAuth(req, res, next) {
  try {
    let userId;

    // 1. Tenta JWT primeiro
    const authHeader = req.header('Authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7).trim();
      try {
        const jwtPayload = validarJWT(token);
        userId = jwtPayload.sub;
      } catch (jwtErr) {
        // JWT inválido, continua tentando fallback
      }
    }

    // 2. Fallback para x-user-id (desenvolvimento e testes automatizados)
    if (!userId && (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test')) {
      userId = req.header('x-user-id');
    }

    // 3. Se conseguiu um ID, carrega dados do usuário
    if (userId && !isUuid(userId)) {
      userId = null;
    }
    if (userId) {
      const user = await getUserById(userId);
      if (user) {
        req.user = user;
      }
    }

    // 4. Continua em qualquer caso (autenticado ou não)
    next();

  } catch (err) {
    console.error('[Optional Auth Error]', err.message);
    // Continua mesmo com erro - autenticação é opcional
    next();
  }
}

module.exports = {
  authMiddleware,
  optionalAuth
};
