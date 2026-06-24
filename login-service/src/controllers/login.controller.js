const { defaultAuthClient } = require('../services/authClient');
const { defaultOtpClient } = require('../services/otpClient');

function isEmpty(value) {
  return typeof value !== 'string' || value.trim() === '';
}

function createLoginController(dependencies = {}) {
  const authClient = dependencies.authClient || defaultAuthClient;
  const otpClient = dependencies.otpClient || defaultOtpClient;

  function getErrorStatusCode(error) {
    if (error && typeof error.statusCode === 'number') {
      return error.statusCode;
    }

    if (error && typeof error.status === 'number') {
      return error.status;
    }

    return null;
  }

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

      const normalizedEmail = email.trim().toLowerCase();

      // Ask the Auth Service for the token.
      const authResponse = await authClient.login({
        email: normalizedEmail,
        senha
      });

      if (!authResponse || typeof authResponse.status !== 'number') {
        return res.status(500).json({
          message: 'Erro interno no login-service'
        });
      }

      if (authResponse.status >= 400) {
        return res.status(authResponse.status).json(authResponse.data);
      }

      await otpClient.startLoginOtpFlow(normalizedEmail);

      return res.status(authResponse.status).json(authResponse.data);
    } catch (error) {
      const statusCode = getErrorStatusCode(error);

      if (statusCode) {
        return res.status(statusCode).json({
          message: error.message || 'Servico indisponivel no momento'
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
