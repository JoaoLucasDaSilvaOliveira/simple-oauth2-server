const test = require('node:test');
const assert = require('node:assert/strict');

const { createOtpClient } = require('../src/services/otpClient');

function createFakeTransport({ validateResult, createResult, publishError } = {}) {
  const calls = [];

  return {
    calls,
    publish: async (exchange, routingKey, payload) => {
      calls.push({ kind: 'publish', exchange, routingKey, payload });

      if (publishError) {
        throw publishError;
      }
    },
    waitForResult: async (queueName, requestId, timeoutMs) => {
      calls.push({ kind: 'waitForResult', queueName, requestId, timeoutMs });

      if (queueName === 'email.validate.result.queue') {
        return validateResult;
      }

      if (queueName === 'otp.create.result.queue') {
        return createResult;
      }

      throw new Error(`Unexpected queue: ${queueName}`);
    }
  };
}

test('starts the email validation and OTP creation flow using the same request_id', async () => {
  const transport = createFakeTransport({
    validateResult: {
      request_id: 'request-id-123',
      email: 'usuario@email.com',
      hash: 'hash-123'
    },
    createResult: {
      request_id: 'request-id-123',
      otp_hash: 'otp-hash-123',
      expiration: 1719160000
    }
  });

  const otpClient = createOtpClient({
    transport,
    requestIdFactory: () => 'request-id-123'
  });

  const result = await otpClient.startLoginOtpFlow('usuario@email.com');

  assert.deepEqual(result, {
    requestId: 'request-id-123',
    email: 'usuario@email.com',
    otpHash: 'otp-hash-123',
    expiration: 1719160000
  });

  assert.deepEqual(transport.calls, [
    {
      kind: 'publish',
      exchange: 'email',
      routingKey: 'validate',
      payload: {
        request_id: 'request-id-123',
        email: 'usuario@email.com'
      }
    },
    {
      kind: 'waitForResult',
      queueName: 'email.validate.result.queue',
      requestId: 'request-id-123',
      timeoutMs: 5000
    },
    {
      kind: 'publish',
      exchange: 'otp',
      routingKey: 'create',
      payload: {
        request_id: 'request-id-123',
        email: 'usuario@email.com',
        hash: 'hash-123'
      }
    },
    {
      kind: 'waitForResult',
      queueName: 'otp.create.result.queue',
      requestId: 'request-id-123',
      timeoutMs: 5000
    }
  ]);
});

test('surfaces validation errors from the OTP service as a client error', async () => {
  const transport = createFakeTransport({
    validateResult: {
      request_id: 'request-id-123',
      email: 'email-invalido',
      error_message: 'email invalido'
    }
  });

  const otpClient = createOtpClient({
    transport,
    requestIdFactory: () => 'request-id-123'
  });

  await assert.rejects(
    otpClient.startLoginOtpFlow('email-invalido'),
    (error) => {
      assert.equal(error.statusCode, 400);
      assert.equal(error.message, 'email invalido');
      return true;
    }
  );
});

test('surfaces create errors from the OTP service as a client error', async () => {
  const transport = createFakeTransport({
    validateResult: {
      request_id: 'request-id-123',
      email: 'usuario@email.com',
      hash: 'hash-123'
    },
    createResult: {
      request_id: 'request-id-123',
      error_message: 'email não validado por essa aplicação, por favor valide o email primeiro'
    }
  });

  const otpClient = createOtpClient({
    transport,
    requestIdFactory: () => 'request-id-123'
  });

  await assert.rejects(
    otpClient.startLoginOtpFlow('usuario@email.com'),
    (error) => {
      assert.equal(error.statusCode, 400);
      assert.equal(error.message, 'email não validado por essa aplicação, por favor valide o email primeiro');
      return true;
    }
  );
});

test('surfaces transport failures as service unavailable errors', async () => {
  const transport = createFakeTransport({
    validateResult: {
      request_id: 'request-id-123',
      email: 'usuario@email.com',
      hash: 'hash-123'
    },
    publishError: new Error('broker down')
  });

  const otpClient = createOtpClient({
    transport,
    requestIdFactory: () => 'request-id-123'
  });

  await assert.rejects(
    otpClient.startLoginOtpFlow('usuario@email.com'),
    (error) => {
      assert.equal(error.statusCode, 503);
      assert.equal(error.message, 'OTP Service indisponivel no momento');
      return true;
    }
  );
});
