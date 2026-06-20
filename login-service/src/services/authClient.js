const DEFAULT_AUTH_SERVICE_URL = 'http://localhost:4000';
const DEFAULT_TIMEOUT_MS = 5000;

function createServiceUnavailableError(cause) {
  const error = new Error('Auth Service indisponivel no momento');
  error.status = 503;
  error.code = 'AUTH_SERVICE_UNAVAILABLE';
  error.cause = cause;
  return error;
}

function isMockMode(env) {
  return String(env.USE_AUTH_MOCK || '').toLowerCase() === 'true';
}

function normalizeBaseUrl(value) {
  return String(value || DEFAULT_AUTH_SERVICE_URL).replace(/\/+$/, '');
}

async function loginMock(credentials) {
  const { email, senha } = credentials;

  if (email === 'teste@email.com' && senha === '123456') {
    return {
      status: 200,
      data: {
        accessToken: 'mock_access_token_123',
        tokenType: 'Bearer',
        expiresIn: 3600
      }
    };
  }

  return {
    status: 401,
    data: {
      message: 'Credenciais invalidas'
    }
  };
}

async function loginReal(credentials, options) {
  const axiosClient = options.axiosClient || require('axios');
  const baseUrl = normalizeBaseUrl(options.env.AUTH_SERVICE_URL);

  try {
    const response = await axiosClient.post(
      `${baseUrl}/api/auth/login`,
      {
        email: credentials.email,
        senha: credentials.senha
      },
      {
        timeout: DEFAULT_TIMEOUT_MS,
        validateStatus: () => true
      }
    );

    return {
      status: response.status,
      data: response.data
    };
  } catch (error) {
    throw createServiceUnavailableError(error);
  }
}

function createAuthClient(dependencies = {}) {
  const env = dependencies.env || process.env;
  const axiosClient = dependencies.axiosClient;

  async function login(credentials) {
    if (isMockMode(env)) {
      return loginMock(credentials);
    }

    return loginReal(credentials, {
      env,
      axiosClient
    });
  }

  return {
    login
  };
}

const defaultAuthClient = createAuthClient();

module.exports = {
  createAuthClient,
  defaultAuthClient
};
