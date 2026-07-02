const dotenv = require('dotenv');
const { randomUUID } = require('node:crypto');
const { createRabbitMqOtpTransport } = require('../src/services/rabbitmqOtpTransport');

const DEFAULT_TEST_EMAIL = 'teste@email.com';

function getTestEmail(args = process.argv.slice(2), env = process.env) {
  const providedEmail = args[0] || env.TEST_EMAIL || DEFAULT_TEST_EMAIL;
  return String(providedEmail).trim();
}

function createEmailValidatePublishOnlyRunner(dependencies = {}) {
  const env = dependencies.env || process.env;
  const requestIdFactory = dependencies.requestIdFactory || randomUUID;
  const transportFactory =
    dependencies.transportFactory ||
    ((transportEnv) =>
      createRabbitMqOtpTransport({
        env: transportEnv
      }));
  const log = dependencies.log || console.log;

  return async function run(args = process.argv.slice(2)) {
    const email = getTestEmail(args, env);
    const requestId = requestIdFactory();
    const transport = transportFactory(env);

    try {
      log(
        `[rabbit:email-publish-only] publish email.validate -> request_id=${requestId} email=${email}`
      );

      await transport.publish('email', 'validate', {
        request_id: requestId,
        email
      });

      log('[rabbit:email-publish-only] published to email.validate.queue');
    } finally {
      if (typeof transport.close === 'function') {
        await transport.close();
      }
    }
  };
}

if (require.main === module) {
  dotenv.config();

  createEmailValidatePublishOnlyRunner()().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}

module.exports = {
  createEmailValidatePublishOnlyRunner,
  getTestEmail
};
