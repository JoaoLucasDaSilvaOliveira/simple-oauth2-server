const test = require('node:test');
const assert = require('node:assert/strict');

const { TOPIC_DEFINITIONS, createRabbitMqOtpTransport } = require('../src/services/rabbitmqOtpTransport');

function createFakeAmqpLib() {
  const calls = [];
  const consumers = new Map();

  const channel = {
    calls,
    assertExchange: async (...args) => {
      calls.push({ kind: 'assertExchange', args });
    },
    assertQueue: async (...args) => {
      calls.push({ kind: 'assertQueue', args });
    },
    bindQueue: async (...args) => {
      calls.push({ kind: 'bindQueue', args });
    },
    publish: (exchange, routingKey, body, options) => {
      calls.push({
        kind: 'publish',
        exchange,
        routingKey,
        body: body.toString('utf8'),
        options
      });

      return true;
    },
    consume: async (queueName, handler, options) => {
      calls.push({
        kind: 'consume',
        queueName,
        options
      });

      consumers.set(queueName, handler);
      return { consumerTag: `consumer-${queueName}` };
    },
    ack: (msg) => {
      calls.push({
        kind: 'ack',
        payload: msg.content.toString('utf8')
      });
    },
    close: async () => {
      calls.push({ kind: 'channel.close' });
    }
  };

  const connection = {
    createChannel: async () => channel,
    close: async () => {
      calls.push({ kind: 'connection.close' });
    }
  };

  return {
    calls,
    channel,
    amqpLib: {
      connect: async (url) => {
        calls.push({
          kind: 'connect',
          url
        });

        return connection;
      }
    },
    emit(queueName, payload) {
      const handler = consumers.get(queueName);

      if (!handler) {
        throw new Error(`No consumer registered for ${queueName}`);
      }

      handler({
        content: Buffer.from(JSON.stringify(payload))
      });
    }
  };
}

test('publishes login OTP requests after preparing the RabbitMQ topology', async () => {
  const fakeAmqp = createFakeAmqpLib();
  const transport = createRabbitMqOtpTransport({
    env: {
      RABBITMQ_URL: 'amqp://example'
    },
    amqpLib: fakeAmqp.amqpLib,
    timeoutMs: 1000
  });

  await transport.publish('email', 'validate', {
    request_id: 'request-id-123',
    email: 'usuario@email.com'
  });

  assert.deepEqual(fakeAmqp.calls[0], {
    kind: 'connect',
    url: 'amqp://example'
  });

  assert.deepEqual(
    fakeAmqp.calls.filter((call) => call.kind === 'assertExchange').map((call) => call.args),
    TOPIC_DEFINITIONS.exchanges.map((exchange) => [
      exchange.name,
      exchange.type,
      { durable: true }
    ])
  );

  assert.deepEqual(
    fakeAmqp.calls.filter((call) => call.kind === 'assertQueue').map((call) => call.args),
    TOPIC_DEFINITIONS.queues.map((queue) => [
      queue.name,
      {
        durable: true,
        arguments: queue.args
      }
    ])
  );

  assert.deepEqual(
    fakeAmqp.calls.filter((call) => call.kind === 'bindQueue').map((call) => call.args),
    TOPIC_DEFINITIONS.bindings.map((binding) => [
      binding.queue,
      binding.exchange,
      binding.routingKey
    ])
  );

  assert.deepEqual(
    fakeAmqp.calls.find((call) => call.kind === 'publish'),
    {
      kind: 'publish',
      exchange: 'email',
      routingKey: 'validate',
      body: JSON.stringify({
        request_id: 'request-id-123',
        email: 'usuario@email.com'
      }),
      options: {
        contentType: 'application/json'
      }
    }
  );
});

test('waits for the OTP result queue and resolves matching messages', async () => {
  const fakeAmqp = createFakeAmqpLib();
  const transport = createRabbitMqOtpTransport({
    env: {
      RABBITMQ_URL: 'amqp://example'
    },
    amqpLib: fakeAmqp.amqpLib,
    timeoutMs: 1000
  });

  const pending = transport.waitForResult(
    'email.validate.result.queue',
    'request-id-123',
    1000
  );

  await new Promise((resolve) => setImmediate(resolve));

  fakeAmqp.emit('email.validate.result.queue', {
    request_id: 'request-id-123',
    email: 'usuario@email.com',
    hash: 'hash-123'
  });

  const result = await pending;

  assert.deepEqual(result, {
    request_id: 'request-id-123',
    email: 'usuario@email.com',
    hash: 'hash-123'
  });

  assert.equal(
    fakeAmqp.calls.some((call) => call.kind === 'consume' && call.queueName === 'email.validate.result.queue'),
    true
  );

  assert.equal(
    fakeAmqp.calls.some((call) => call.kind === 'ack'),
    true
  );
});

test('closes the RabbitMQ resources when requested', async () => {
  const fakeAmqp = createFakeAmqpLib();
  const transport = createRabbitMqOtpTransport({
    env: {
      RABBITMQ_URL: 'amqp://example'
    },
    amqpLib: fakeAmqp.amqpLib,
    timeoutMs: 1000
  });

  await transport.publish('email', 'validate', {
    request_id: 'request-id-123',
    email: 'usuario@email.com'
  });

  await transport.close();

  assert.equal(
    fakeAmqp.calls.some((call) => call.kind === 'channel.close'),
    true
  );

  assert.equal(
    fakeAmqp.calls.some((call) => call.kind === 'connection.close'),
    true
  );
});
