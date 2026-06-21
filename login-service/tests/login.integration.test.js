const test = require('node:test');
const assert = require('node:assert/strict');

const { startServer } = require('../src/server');

function startTestServer() {
  return new Promise((resolve) => {
    const server = startServer(0);

    server.once('listening', () => {
      const { port } = server.address();
      resolve({
        server,
        baseUrl: `http://127.0.0.1:${port}`
      });
    });
  });
}

test('POST /api/login returns the mock token for valid credentials', async () => {
  process.env.USE_AUTH_MOCK = 'true';

  const { server, baseUrl } = await startTestServer();

  try {
    const response = await fetch(`${baseUrl}/api/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: 'teste@email.com',
        senha: '123456'
      })
    });

    const body = await response.json();

    assert.equal(response.status, 200);
    assert.deepEqual(body, {
      accessToken: 'mock_access_token_123',
      tokenType: 'Bearer',
      expiresIn: 3600
    });
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test('POST /api/login returns 401 for invalid mock credentials', async () => {
  process.env.USE_AUTH_MOCK = 'true';

  const { server, baseUrl } = await startTestServer();

  try {
    const response = await fetch(`${baseUrl}/api/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: 'outro@email.com',
        senha: '123456'
      })
    });

    const body = await response.json();

    assert.equal(response.status, 401);
    assert.deepEqual(body, {
      message: 'Credenciais invalidas'
    });
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test('POST /api/login returns 400 when email is missing', async () => {
  process.env.USE_AUTH_MOCK = 'true';

  const { server, baseUrl } = await startTestServer();

  try {
    const response = await fetch(`${baseUrl}/api/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        senha: '123456'
      })
    });

    const body = await response.json();

    assert.equal(response.status, 400);
    assert.deepEqual(body, {
      message: 'O campo email e obrigatorio'
    });
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test('POST /api/login returns 404 for an unknown route', async () => {
  process.env.USE_AUTH_MOCK = 'true';

  const { server, baseUrl } = await startTestServer();

  try {
    const response = await fetch(`${baseUrl}/api/unknown`, {
      method: 'GET'
    });

    const body = await response.json();

    assert.equal(response.status, 404);
    assert.deepEqual(body, {
      message: 'Rota nao encontrada'
    });
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test('POST /api/login returns 400 for invalid JSON payloads', async () => {
  process.env.USE_AUTH_MOCK = 'true';

  const { server, baseUrl } = await startTestServer();

  try {
    const response = await fetch(`${baseUrl}/api/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: '{"email": "teste@email.com",'
    });

    const body = await response.json();

    assert.equal(response.status, 400);
    assert.deepEqual(body, {
      message: 'JSON invalido no corpo da requisicao'
    });
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});
