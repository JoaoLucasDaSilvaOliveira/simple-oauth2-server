const express = require('express');
const { createLoginController } = require('../controllers/login.controller');

function createLoginRoutes(dependencies = {}) {
  const router = express.Router();

  // Single responsibility: expose the login endpoint.
  router.post('/login', createLoginController(dependencies));

  return router;
}

module.exports = createLoginRoutes;
module.exports.createLoginRoutes = createLoginRoutes;
