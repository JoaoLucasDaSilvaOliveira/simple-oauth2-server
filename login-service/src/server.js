const express = require('express');
const dotenv = require('dotenv');
const loginRoutes = require('./routes/login.routes');

dotenv.config();

function createApp() {
  const app = express();

  app.use(express.json());

  app.use('/api', loginRoutes);

  app.use((req, res) => {
    res.status(404).json({
      message: 'Rota nao encontrada'
    });
  });

  app.use((error, req, res, next) => {
    if (error && error.type === 'entity.parse.failed') {
      return res.status(400).json({
        message: 'JSON invalido no corpo da requisicao'
      });
    }

    console.error('[login-service] unexpected error:', error);

    return res.status(500).json({
      message: 'Erro interno no servidor'
    });
  });

  return app;
}

function startServer(port = process.env.PORT || 3000) {
  const app = createApp();

  return app.listen(port, () => {
    console.log(`login-service running on port ${port}`);
  });
}

if (require.main === module) {
  startServer();
}

module.exports = {
  createApp,
  startServer
};
