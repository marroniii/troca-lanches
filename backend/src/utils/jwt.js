/**
 * JWT Utilities
 * Usa jsonwebtoken library para segurança profissional
 */
require('dotenv').config();
const jwt = require('jsonwebtoken');

const jwtSecret = process.env.JWT_SECRET || 'insecure-dev-secret-change-in-production';
const jwtExpiry = process.env.JWT_EXPIRY || '24h'; // 24 horas por padrão

/**
 * Gera JWT para um usuário
 * @param {string} userId - ID único do usuário
 * @returns {string} Token JWT assinado
 */
function gerarJWT(userId) {
  try {
    const token = jwt.sign(
      { sub: userId },
      jwtSecret,
      { 
        algorithm: 'HS256',
        expiresIn: jwtExpiry
      }
    );
    return token;
  } catch (err) {
    throw new Error(`Erro ao gerar JWT: ${err.message}`);
  }
}

/**
 * Valida JWT e retorna payload
 * @param {string} token - Token JWT a validar
 * @returns {object} Payload decodificado (contém { sub: userId, iat, exp })
 * @throws {Error} Se token inválido ou expirado
 */
function validarJWT(token) {
  try {
    const payload = jwt.verify(token, jwtSecret, {
      algorithms: ['HS256']
    });
    return payload;
  } catch (err) {
    // jsonwebtoken lança TokenExpiredError, JsonWebTokenError, etc
    throw new Error(`JWT inválido: ${err.message}`);
  }
}

module.exports = {
  gerarJWT,
  validarJWT,
  jwtSecret
};
