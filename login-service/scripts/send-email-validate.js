const { randomUUID } = require('node:crypto');
const { createRabbitMqOtpTransport } = require('../src/services/rabbitmqOtpTransport');

const DEFAULT_TEST_EMAIL = 'teste@email.com';

function getTestEmail() {
  const providedEmail = process.argv[2] || process.env.TEST_EMAIL || DEFAULT_TEST_EMAIL;
  return String(providedEmail).trim();
}

async function main() {
  const email = getTestEmail();
  const transport = createRabbitMqOtpTransport({
    env: process.env
  });
  const requestId = randomUUID();

  try {
    console.log(
      `[rabbit:email-validate] publish email.validate -> request_id=${requestId} email=${email}`
    );

    await transport.publish('email', 'validate', {
      request_id: requestId,
      email
    });

    const validation = await transport.waitForResult(
      'email.validate.result.queue',
      requestId
    );

    console.log(
      '[rabbit:email-validate] email.validate.result.queue:',
      JSON.stringify(validation, null, 2)
    );
  } finally {
    if (typeof transport.close === 'function') {
      await transport.close();
    }
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
