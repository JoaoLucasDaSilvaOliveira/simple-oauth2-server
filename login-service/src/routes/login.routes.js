const express = require('express');
const { login } = require('../controllers/login.controller');

const router = express.Router();

// Single responsibility: expose the login endpoint.
router.post('/login', login);

module.exports = router;
