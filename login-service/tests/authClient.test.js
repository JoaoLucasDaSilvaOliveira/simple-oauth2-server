const test = require('node:test');
const assert = require('node:assert/strict');

const { createAuthClient } = require('../src/services/authClient');

test('returns the mock token for the expected credentials', async () => {
  const authClient = createAuthClient({
    env: {
      USE_AUTH_MOCK: 'true'
    }
  });

  const response = await authClient.login({
    email: 'teste@email.com',
    senha: '123456'
  });

  assert.equal(response.status, 200);
  assert.deepEqual(response.data, {
    accessToken: 'mock_access_token_123',
    tokenType: 'Bearer',
    expiresIn: 3600
  });
});

test('returns 401 in mock mode for invalid credentials', async () => {
  const authClient = createAuthClient({
    env: {
      USE_AUTH_MOCK: 'true'
    }
  });

  const response = await authClient.login({
    email: 'outro@email.com',
    senha: 'errada'
  });

  assert.equal(response.status, 401);
  assert.deepEqual(response.data, {
    message: 'Credenciais invalidas'
  });
});

test('passes through the real Auth Service response when mock mode is off', async () => {
  const calls = [];
  const fakeAxios = {
    post: async (url, body, options) => {
      calls.push({ url, body, options });

      return {
        status: 201,
        data: {
          accessToken: 'real_access_token',
          tokenType: 'Bearer',
          expiresIn: 7200
        }
      };
    }
  };

  const authClient = createAuthClient({
    env: {
      USE_AUTH_MOCK: 'false',
      AUTH_SERVICE_URL: 'http://localhost:4000'
    },
    axiosClient: fakeAxios
  });

  const response = await authClient.login({
    email: 'usuario@email.com',
    senha: '123456'
  });

  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, 'http://localhost:4000/api/auth/login');
  assert.deepEqual(calls[0].body, {
    email: 'usuario@email.com',
    senha: '123456'
  });
  assert.equal(calls[0].options.timeout, 5000);
  assert.equal(response.status, 201);
  assert.deepEqual(response.data, {
    accessToken: 'real_access_token',
    tokenType: 'Bearer',
    expiresIn: 7200
  });
});

test('throws a service unavailable error when the real Auth Service is not reachable', async () => {
  const authClient = createAuthClient({
    env: {
      USE_AUTH_MOCK: 'false',
      AUTH_SERVICE_URL: 'http://localhost:4000'
    },
    axiosClient: {
      post: async () => {
        throw Object.assign(new Error('connect ECONNREFUSED'), {
          code: 'ECONNREFUSED'
        });
      }
    }
  });

  await assert.rejects(
    authClient.login({
      email: 'usuario@email.com',
      senha: '123456'
    }),
    (error) => {
      assert.equal(error.status, 503);
      assert.equal(error.code, 'AUTH_SERVICE_UNAVAILABLE');
      assert.equal(error.message, 'Auth Service indisponivel no momento');
      return true;
    }
  );
});
