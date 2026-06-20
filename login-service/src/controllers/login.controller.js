const { defaultAuthClient, createAuthClient } = require('../services/authClient');

function isEmpty(value) {
  return typeof value !== 'string' || value.trim() === '';
}

function createLoginController(dependencies = {}) {
  const authClient = dependencies.authClient || defaultAuthClient;

  return async function loginController(req, res) {
    try {
      const body = req.body || {};
      const { email, senha } = body;

      // Validate input before contacting the external service.
      if (isEmpty(email)) {
        return res.status(400).json({
          message: 'O campo email e obrigatorio'
        });
      }

      if (isEmpty(senha)) {
        return res.status(400).json({
          message: 'O campo senha e obrigatorio'
        });
      }

      // Ask the Auth Service for the token.
      const authResponse = await authClient.login({ email, senha });

      if (!authResponse || typeof authResponse.status !== 'number') {
        return res.status(500).json({
          message: 'Erro interno no login-service'
        });
      }

      return res.status(authResponse.status).json(authResponse.data);
    } catch (error) {
      if (error && error.status === 503) {
        return res.status(503).json({
          message: error.message || 'Auth Service indisponivel no momento'
        });
      }

      return res.status(500).json({
        message: 'Erro interno no login-service'
      });
    }
  };
}

const login = createLoginController();

module.exports = {
  createLoginController,
  login
};
