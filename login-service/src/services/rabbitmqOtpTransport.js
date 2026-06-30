const { once } = require('node:events');

const DEFAULT_TIMEOUT_MS = 5000;
const REQUEST_EXCHANGE = 'email';
const OTP_EXCHANGE = 'otp';
const DLX_EMAIL_EXCHANGE = 'email.dlx';
const DLX_OTP_EXCHANGE = 'otp.dlx';

const TOPIC_DEFINITIONS = {
  exchanges: [
    { name: REQUEST_EXCHANGE, type: 'direct' },
    { name: OTP_EXCHANGE, type: 'direct' },
    { name: DLX_EMAIL_EXCHANGE, type: 'direct' },
    { name: DLX_OTP_EXCHANGE, type: 'direct' }
  ],
  queues: [
    {
      name: 'email.validate.queue',
      args: deadLetterArgs(DLX_EMAIL_EXCHANGE)
    },
    {
      name: 'email.validate.result.queue',
      args: deadLetterArgs(DLX_EMAIL_EXCHANGE)
    },
    {
      name: 'otp.create.queue',
      args: deadLetterArgs(DLX_OTP_EXCHANGE)
    },
    {
      name: 'otp.create.result.queue',
      args: deadLetterArgs(DLX_OTP_EXCHANGE)
    }
  ],
  bindings: [
    {
      exchange: REQUEST_EXCHANGE,
      routingKey: 'validate',
      queue: 'email.validate.queue'
    },
    {
      exchange: REQUEST_EXCHANGE,
      routingKey: 'validate.result',
      queue: 'email.validate.result.queue'
    },
    {
      exchange: OTP_EXCHANGE,
      routingKey: 'create',
      queue: 'otp.create.queue'
    },
    {
      exchange: OTP_EXCHANGE,
      routingKey: 'create.result',
      queue: 'otp.create.result.queue'
    }
  ]
};

function deadLetterArgs(exchange) {
  return {
    'x-dead-letter-exchange': exchange,
    'x-dead-letter-routing-key': 'dlq'
  };
}

function createOtpTransportError(message, statusCode, code, cause) {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.code = code;
  if (cause) {
    error.cause = cause;
  }
  return error;
}

function normalizeQueueName(queueName) {
  return String(queueName || '').trim();
}

function getRequestId(message) {
  if (!message || typeof message.request_id !== 'string') {
    return '';
  }

  return message.request_id.trim();
}

function createRabbitMqOtpTransport(dependencies = {}) {
  const env = {
    ...(dependencies.env || process.env)
  };
  const timeoutMs =
    Number(dependencies.timeoutMs || env.OTP_FLOW_TIMEOUT_MS || DEFAULT_TIMEOUT_MS) ||
    DEFAULT_TIMEOUT_MS;
  const amqpLib = dependencies.amqpLib;

  let connection = null;
  let channel = null;
  let topologyPrepared = false;
  const pendingByQueue = new Map();
  const bufferedByQueue = new Map();
  const consumersStarted = new Set();

  async function connect() {
    if (connection && channel) {
      return;
    }

    const url = env.RABBITMQ_URL;
    if (!url) {
      throw createOtpTransportError(
        'RABBITMQ_URL nao configurada',
        503,
        'OTP_RABBITMQ_URL_MISSING'
      );
    }

    const rabbitmq = amqpLib || require('amqplib');

    connection = await rabbitmq.connect(url);
    channel = await connection.createChannel();

    await prepareTopology();
  }

  async function prepareTopology() {
    if (topologyPrepared) {
      return;
    }

    for (const exchange of TOPIC_DEFINITIONS.exchanges) {
      await channel.assertExchange(exchange.name, exchange.type, {
        durable: true
      });
    }

    for (const queue of TOPIC_DEFINITIONS.queues) {
      await channel.assertQueue(queue.name, {
        durable: true,
        arguments: queue.args
      });
    }

    for (const binding of TOPIC_DEFINITIONS.bindings) {
      await channel.bindQueue(binding.queue, binding.exchange, binding.routingKey);
    }

    topologyPrepared = true;
  }

  async function publish(exchange, routingKey, payload) {
    await connect();

    const body = Buffer.from(JSON.stringify(payload));
    const published = channel.publish(exchange, routingKey, body, {
      contentType: 'application/json'
    });

    if (!published) {
      await once(channel, 'drain');
    }
  }

  async function close() {
    const currentChannel = channel;
    const currentConnection = connection;

    try {
      if (currentChannel && typeof currentChannel.close === 'function') {
        await currentChannel.close();
      }
    } finally {
      try {
        if (currentConnection && typeof currentConnection.close === 'function') {
          await currentConnection.close();
        }
      } finally {
        channel = null;
        connection = null;
        topologyPrepared = false;
        consumersStarted.clear();
        pendingByQueue.clear();
        bufferedByQueue.clear();
      }
    }
  }

  async function waitForResult(queueName, requestId, timeout = timeoutMs) {
    await connect();

    const normalizedQueueName = normalizeQueueName(queueName);
    const normalizedRequestId = normalizeQueueName(requestId);

    const bufferedResult = takeBufferedResult(normalizedQueueName, normalizedRequestId);
    if (bufferedResult) {
      return bufferedResult;
    }

    startConsumer(normalizedQueueName);

    return new Promise((resolve, reject) => {
      const queuePending = getPendingQueue(normalizedQueueName);
      const pending = {
        resolve: (message) => {
          clearTimeout(timer);
          removePending(normalizedQueueName, normalizedRequestId);
          resolve(message);
        },
        reject: (error) => {
          clearTimeout(timer);
          removePending(normalizedQueueName, normalizedRequestId);
          reject(error);
        }
      };

      queuePending.set(normalizedRequestId, pending);

      const timer = setTimeout(() => {
        pending.reject(
          createOtpTransportError(
            `Timeout aguardando resposta da fila ${normalizedQueueName}`,
            503,
            'OTP_RESPONSE_TIMEOUT'
          )
        );
      }, timeout);

      const immediateBufferedResult = takeBufferedResult(
        normalizedQueueName,
        normalizedRequestId
      );

      if (immediateBufferedResult) {
        pending.resolve(immediateBufferedResult);
      }
    });
  }

  function startConsumer(queueName) {
    if (consumersStarted.has(queueName)) {
      return;
    }

    consumersStarted.add(queueName);

    void channel.consume(
      queueName,
      (msg) => {
        if (!msg) {
          return;
        }

        let parsed;
        try {
          parsed = JSON.parse(msg.content.toString('utf8'));
        } catch (error) {
          channel.ack(msg);
          handleInvalidMessage(queueName, error);
          return;
        }

        routeMessage(queueName, parsed);
        channel.ack(msg);
      },
      { noAck: false }
    );
  }

  function routeMessage(queueName, payload) {
    const requestId = getRequestId(payload);
    const queuePending = getPendingQueue(queueName);
    const pending = queuePending.get(requestId);

    if (pending) {
      pending.resolve(payload);
      return;
    }

    const queueBuffered = getBufferedQueue(queueName);
    queueBuffered.set(requestId, payload);
  }

  function handleInvalidMessage(queueName, cause) {
    const queuePending = getPendingQueue(queueName);

    if (queuePending.size === 0) {
      return;
    }

    const error = createOtpTransportError(
      'Resposta invalida recebida do OTP Service',
      502,
      'OTP_INVALID_RESPONSE',
      cause
    );

    for (const pending of queuePending.values()) {
      pending.reject(error);
    }
  }

  function takeBufferedResult(queueName, requestId) {
    const queueBuffered = getBufferedQueue(queueName);
    if (!queueBuffered.has(requestId)) {
      return null;
    }

    const payload = queueBuffered.get(requestId);
    queueBuffered.delete(requestId);
    return payload;
  }

  function getPendingQueue(queueName) {
    if (!pendingByQueue.has(queueName)) {
      pendingByQueue.set(queueName, new Map());
    }

    return pendingByQueue.get(queueName);
  }

  function getBufferedQueue(queueName) {
    if (!bufferedByQueue.has(queueName)) {
      bufferedByQueue.set(queueName, new Map());
    }

    return bufferedByQueue.get(queueName);
  }

  function removePending(queueName, requestId) {
    const queuePending = getPendingQueue(queueName);
    queuePending.delete(requestId);
  }

  return {
    publish,
    waitForResult,
    close
  };
}

module.exports = {
  createRabbitMqOtpTransport,
  TOPIC_DEFINITIONS,
  createOtpTransportError,
  deadLetterArgs
};
