const test = require('node:test');
const assert = require('node:assert/strict');

const { createLoginController } = require('../src/controllers/login.controller');

function createMockResponse() {
  return {
    statusCode: null,
    payload: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.payload = body;
      return this;
    }
  };
}

test('returns 400 when email is missing', async () => {
  let called = false;
  const controller = createLoginController({
    authClient: {
      login: async () => {
        called = true;
      }
    }
  });

  const req = {
    body: {
      senha: '123456'
    }
  };
  const res = createMockResponse();

  await controller(req, res);

  assert.equal(called, false);
  assert.equal(res.statusCode, 400);
  assert.deepEqual(res.payload, {
    message: 'O campo email e obrigatorio'
  });
});

test('returns 400 when email is blank', async () => {
  let called = false;
  const controller = createLoginController({
    authClient: {
      login: async () => {
        called = true;
      }
    }
  });

  const req = {
    body: {
      email: '   ',
      senha: '123456'
    }
  };
  const res = createMockResponse();

  await controller(req, res);

  assert.equal(called, false);
  assert.equal(res.statusCode, 400);
  assert.deepEqual(res.payload, {
    message: 'O campo email e obrigatorio'
  });
});

test('returns 400 when senha is missing', async () => {
  let called = false;
  const controller = createLoginController({
    authClient: {
      login: async () => {
        called = true;
      }
    }
  });

  const req = {
    body: {
      email: 'usuario@email.com'
    }
  };
  const res = createMockResponse();

  await controller(req, res);

  assert.equal(called, false);
  assert.equal(res.statusCode, 400);
  assert.deepEqual(res.payload, {
    message: 'O campo senha e obrigatorio'
  });
});

test('returns 400 when senha is blank', async () => {
  let called = false;
  const controller = createLoginController({
    authClient: {
      login: async () => {
        called = true;
      }
    }
  });

  const req = {
    body: {
      email: 'usuario@email.com',
      senha: '   '
    }
  };
  const res = createMockResponse();

  await controller(req, res);

  assert.equal(called, false);
  assert.equal(res.statusCode, 400);
  assert.deepEqual(res.payload, {
    message: 'O campo senha e obrigatorio'
  });
});

test('passes through a successful Auth Service response', async () => {
  const controller = createLoginController({
    authClient: {
      login: async () => ({
        status: 200,
        data: {
          accessToken: 'token',
          tokenType: 'Bearer',
          expiresIn: 3600
        }
      })
    }
  });

  const req = {
    body: {
      email: 'usuario@email.com',
      senha: '123456'
    }
  };
  const res = createMockResponse();

  await controller(req, res);

  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.payload, {
    accessToken: 'token',
    tokenType: 'Bearer',
    expiresIn: 3600
  });
});

test('passes through a 401 response from the Auth Service', async () => {
  const controller = createLoginController({
    authClient: {
      login: async () => ({
        status: 401,
        data: {
          message: 'Credenciais invalidas'
        }
      })
    }
  });

  const req = {
    body: {
      email: 'usuario@email.com',
      senha: '123456'
    }
  };
  const res = createMockResponse();

  await controller(req, res);

  assert.equal(res.statusCode, 401);
  assert.deepEqual(res.payload, {
    message: 'Credenciais invalidas'
  });
});

test('returns 503 when the Auth Service is unavailable', async () => {
  const controller = createLoginController({
    authClient: {
      login: async () => {
        const error = new Error('Auth Service indisponivel no momento');
        error.status = 503;
        return Promise.reject(error);
      }
    }
  });

  const req = {
    body: {
      email: 'usuario@email.com',
      senha: '123456'
    }
  };
  const res = createMockResponse();

  await controller(req, res);

  assert.equal(res.statusCode, 503);
  assert.deepEqual(res.payload, {
    message: 'Auth Service indisponivel no momento'
  });
});

test('returns 500 for unexpected errors', async () => {
  const controller = createLoginController({
    authClient: {
      login: async () => {
        throw new Error('boom');
      }
    }
  });

  const req = {
    body: {
      email: 'usuario@email.com',
      senha: '123456'
    }
  };
  const res = createMockResponse();

  await controller(req, res);

  assert.equal(res.statusCode, 500);
  assert.deepEqual(res.payload, {
    message: 'Erro interno no login-service'
  });
});

test('returns 500 when the Auth Service response is malformed', async () => {
  const controller = createLoginController({
    authClient: {
      login: async () => ({
        data: {
          message: 'resposta sem status'
        }
      })
    }
  });

  const req = {
    body: {
      email: 'usuario@email.com',
      senha: '123456'
    }
  };
  const res = createMockResponse();

  await controller(req, res);

  assert.equal(res.statusCode, 500);
  assert.deepEqual(res.payload, {
    message: 'Erro interno no login-service'
  });
});
