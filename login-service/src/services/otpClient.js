const { randomUUID } = require('node:crypto');
const { createRabbitMqOtpTransport } = require('./rabbitmqOtpTransport');

const DEFAULT_TIMEOUT_MS = 5000;

function createOtpClientError(message, statusCode, code, cause) {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.code = code;
  if (cause) {
    error.cause = cause;
  }
  return error;
}

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function isEmpty(value) {
  return typeof value !== 'string' || value.trim() === '';
}

function getTimeoutMs(dependencies, env) {
  const rawTimeout =
    dependencies.timeoutMs ?? env.OTP_FLOW_TIMEOUT_MS ?? DEFAULT_TIMEOUT_MS;
  const parsedTimeout = Number(rawTimeout);

  if (!Number.isFinite(parsedTimeout) || parsedTimeout <= 0) {
    return DEFAULT_TIMEOUT_MS;
  }

  return parsedTimeout;
}

function createOtpClient(dependencies = {}) {
  const env = {
    ...(dependencies.env || process.env)
  };
  const timeoutMs = getTimeoutMs(dependencies, env);
  const requestIdFactory = dependencies.requestIdFactory || randomUUID;
  const transport =
    dependencies.transport ||
    createRabbitMqOtpTransport({
      env,
      timeoutMs,
      amqpLib: dependencies.amqpLib
    });

  async function startLoginOtpFlow(email) {
    const normalizedEmail = normalizeEmail(email);

    if (isEmpty(normalizedEmail)) {
      throw createOtpClientError('Email invalido', 400, 'OTP_INVALID_EMAIL');
    }

    const requestId = requestIdFactory();

    try {
      await transport.publish('email', 'validate', {
        request_id: requestId,
        email: normalizedEmail
      });

      const validationResult = await transport.waitForResult(
        'email.validate.result.queue',
        requestId,
        timeoutMs
      );

      if (!validationResult || typeof validationResult !== 'object') {
        throw createOtpClientError(
          'Resposta invalida do OTP Service',
          502,
          'OTP_INVALID_RESPONSE'
        );
      }

      if (typeof validationResult.error_message === 'string') {
        throw createOtpClientError(
          validationResult.error_message,
          400,
          'OTP_EMAIL_VALIDATION_FAILED'
        );
      }

      if (typeof validationResult.hash !== 'string' || validationResult.hash.trim() === '') {
        throw createOtpClientError(
          'Resposta invalida do OTP Service',
          502,
          'OTP_INVALID_RESPONSE'
        );
      }

      await transport.publish('otp', 'create', {
        request_id: requestId,
        email: validationResult.email || normalizedEmail,
        hash: validationResult.hash
      });

      const createResult = await transport.waitForResult(
        'otp.create.result.queue',
        requestId,
        timeoutMs
      );

      if (!createResult || typeof createResult !== 'object') {
        throw createOtpClientError(
          'Resposta invalida do OTP Service',
          502,
          'OTP_INVALID_RESPONSE'
        );
      }

      if (typeof createResult.error_message === 'string') {
        throw createOtpClientError(
          createResult.error_message,
          400,
          'OTP_CREATE_FAILED'
        );
      }

      if (
        typeof createResult.otp_hash !== 'string' ||
        createResult.otp_hash.trim() === '' ||
        typeof createResult.expiration !== 'number'
      ) {
        throw createOtpClientError(
          'Resposta invalida do OTP Service',
          502,
          'OTP_INVALID_RESPONSE'
        );
      }

      return {
        requestId,
        email: createResult.email || normalizedEmail,
        otpHash: createResult.otp_hash,
        expiration: createResult.expiration
      };
    } catch (error) {
      if (error && typeof error.statusCode === 'number') {
        throw error;
      }

      throw createOtpClientError(
        'OTP Service indisponivel no momento',
        503,
        'OTP_SERVICE_UNAVAILABLE',
        error
      );
    }
  }

  return {
    startLoginOtpFlow
  };
}

const defaultOtpClient = createOtpClient();

module.exports = {
  createOtpClient,
  defaultOtpClient
};
