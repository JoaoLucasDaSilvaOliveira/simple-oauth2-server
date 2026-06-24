const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');

const { createAuthClient } = require('../src/services/authClient');
const { startServer } = require('../src/server');

async function startLoginServer(dependencies = {}) {
  return new Promise((resolve) => {
    const server = startServer(0, dependencies);

    server.once('listening', () => {
      const address = server.address();

      resolve({
        server,
        baseUrl: `http://127.0.0.1:${address.port}`
      });
    });
  });
}

async function startFakeAuthService(responder) {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      void (async () => {
        const chunks = [];

        for await (const chunk of req) {
          chunks.push(chunk);
        }

        const rawBody = Buffer.concat(chunks).toString('utf8');
        const body = rawBody ? JSON.parse(rawBody) : {};

        await responder({ req, res, body, rawBody });
      })().catch((error) => {
        res.statusCode = 500;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ message: error.message }));
      });
    });

    server.listen(0, '127.0.0.1', () => {
      const address = server.address();

      resolve({
        server,
        baseUrl: `http://127.0.0.1:${address.port}`
      });
    });
  });
}

async function getClosedPortUrl() {
  return new Promise((resolve) => {
    const server = http.createServer(() => {});

    server.listen(0, '127.0.0.1', () => {
      const address = server.address();

      server.close(() => {
        resolve(`http://127.0.0.1:${address.port}`);
      });
    });
  });
}

async function closeServer(server) {
  await new Promise((resolve) => server.close(resolve));
}

function createFakeOtpClient({ shouldFail = false } = {}) {
  const calls = [];

  return {
    calls,
    startLoginOtpFlow: async (email) => {
      calls.push(email);

      if (shouldFail) {
        const error = new Error('OTP Service indisponivel no momento');
        error.statusCode = 503;
        throw error;
      }

      return {
        requestId: 'request-id-123',
        email,
        otpHash: 'otp-hash-123',
        expiration: 1719160000
      };
    }
  };
}

test('POST /api/login proxies successful responses from Auth Service and starts the OTP flow', async () => {
  const fakeAuthService = await startFakeAuthService(async ({ req, res, body }) => {
    assert.equal(req.method, 'POST');
    assert.equal(req.url, '/api/auth/login');
    assert.deepEqual(body, {
      email: 'usuario@email.com',
      senha: '123456'
    });

    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(
      JSON.stringify({
        accessToken: 'real_access_token',
        tokenType: 'Bearer',
        expiresIn: 7200
      })
    );
  });

  const authClient = createAuthClient({
    env: {
      AUTH_SERVICE_URL: fakeAuthService.baseUrl
    }
  });
  const otpClient = createFakeOtpClient();
  const { server, baseUrl } = await startLoginServer({
    authClient,
    otpClient
  });

  try {
    const response = await fetch(`${baseUrl}/api/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: 'usuario@email.com',
        senha: '123456'
      })
    });

    const body = await response.json();

    assert.equal(response.status, 200);
    assert.deepEqual(body, {
      accessToken: 'real_access_token',
      tokenType: 'Bearer',
      expiresIn: 7200
    });
    assert.deepEqual(otpClient.calls, ['usuario@email.com']);
  } finally {
    await Promise.all([closeServer(server), closeServer(fakeAuthService.server)]);
  }
});

test('POST /api/login returns 503 when the OTP flow cannot be started after a successful auth login', async () => {
  const fakeAuthService = await startFakeAuthService(async ({ res }) => {
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(
      JSON.stringify({
        accessToken: 'real_access_token',
        tokenType: 'Bearer',
        expiresIn: 7200
      })
    );
  });

  const authClient = createAuthClient({
    env: {
      AUTH_SERVICE_URL: fakeAuthService.baseUrl
    }
  });
  const otpClient = createFakeOtpClient({ shouldFail: true });
  const { server, baseUrl } = await startLoginServer({
    authClient,
    otpClient
  });

  try {
    const response = await fetch(`${baseUrl}/api/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: 'usuario@email.com',
        senha: '123456'
      })
    });

    const body = await response.json();

    assert.equal(response.status, 503);
    assert.deepEqual(body, {
      message: 'OTP Service indisponivel no momento'
    });
    assert.deepEqual(otpClient.calls, ['usuario@email.com']);
  } finally {
    await Promise.all([closeServer(server), closeServer(fakeAuthService.server)]);
  }
});

test('POST /api/login returns 503 when Auth Service is unavailable', async () => {
  const closedAuthServiceUrl = await getClosedPortUrl();

  const authClient = createAuthClient({
    env: {
      AUTH_SERVICE_URL: closedAuthServiceUrl
    }
  });
  const otpClient = createFakeOtpClient();
  const { server, baseUrl } = await startLoginServer({
    authClient,
    otpClient
  });

  try {
    const response = await fetch(`${baseUrl}/api/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: 'usuario@email.com',
        senha: '123456'
      })
    });

    const body = await response.json();

    assert.equal(response.status, 503);
    assert.deepEqual(body, {
      message: 'Auth Service indisponivel no momento'
    });
    assert.deepEqual(otpClient.calls, []);
  } finally {
    await closeServer(server);
  }
});

test('POST /api/login returns 400 when email is missing', async () => {
  const authClient = createAuthClient({
    env: {
      AUTH_SERVICE_URL: 'http://127.0.0.1:1'
    }
  });
  const otpClient = createFakeOtpClient();
  const { server, baseUrl } = await startLoginServer({
    authClient,
    otpClient
  });

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
    assert.deepEqual(otpClient.calls, []);
  } finally {
    await closeServer(server);
  }
});

test('POST /api/login returns 404 for an unknown route', async () => {
  const authClient = createAuthClient({
    env: {
      AUTH_SERVICE_URL: 'http://127.0.0.1:1'
    }
  });
  const otpClient = createFakeOtpClient();
  const { server, baseUrl } = await startLoginServer({
    authClient,
    otpClient
  });

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
    await closeServer(server);
  }
});

test('POST /api/login returns 400 for invalid JSON payloads', async () => {
  const authClient = createAuthClient({
    env: {
      AUTH_SERVICE_URL: 'http://127.0.0.1:1'
    }
  });
  const otpClient = createFakeOtpClient();
  const { server, baseUrl } = await startLoginServer({
    authClient,
    otpClient
  });

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
    await closeServer(server);
  }
});
