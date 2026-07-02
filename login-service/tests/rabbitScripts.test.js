const test = require('node:test');
const assert = require('node:assert/strict');

const { createEmailValidatePublishOnlyRunner } = require('../scripts/send-email-publish-only');

test('email validate publish-only script publishes without consuming the result queue', async () => {
  const calls = [];
  const runner = createEmailValidatePublishOnlyRunner({
    env: {
      RABBITMQ_URL: 'amqp://example'
    },
    requestIdFactory: () => 'request-id-123',
    transportFactory: () => ({
      publish: async (exchange, routingKey, payload) => {
        calls.push({ kind: 'publish', exchange, routingKey, payload });
      },
      waitForResult: async () => {
        calls.push({ kind: 'waitForResult' });
      },
      close: async () => {
        calls.push({ kind: 'close' });
      }
    }),
    log: () => {}
  });

  await runner(['usuario@email.com']);

  assert.deepEqual(calls, [
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
      kind: 'close'
    }
  ]);
});
