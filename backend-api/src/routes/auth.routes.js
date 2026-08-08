const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticate } = require('../middlewares/auth');
const { validate, authRules } = require('../middlewares/validator');

// POST /api/auth/login
router.post('/login', authRules.login, validate, authController.login);

// GET /api/auth/me - Get current user
router.get('/me', authenticate, authController.getMe);

// POST /api/auth/change-password
router.post('/change-password', authenticate, authController.changePassword);

module.exports = router;
