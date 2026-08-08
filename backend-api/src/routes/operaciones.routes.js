const express = require('express');
const router = express.Router();
const checkinController = require('../controllers/checkinController');
const checkoutController = require('../controllers/checkoutController');
const huespedController = require('../controllers/huespedController');
const { authenticate } = require('../middlewares/auth');
const { canPerformOperations, authorize } = require('../middlewares/roles');
const { validate, checkinRules, checkoutRules, commonRules } = require('../middlewares/validator');

// POST /api/operaciones/huesped - Create new guest
router.post('/huesped', authenticate, canPerformOperations, huespedController.create);

// Check-in routes
// GET /api/operaciones/checkin - Get all check-ins
router.get('/checkin', authenticate, canPerformOperations, checkinController.getAll);

// GET /api/operaciones/checkin/:id - Get check-in by ID
router.get('/checkin/:id', authenticate, canPerformOperations, commonRules.id, validate, checkinController.getById);

// GET /api/operaciones/huesped/buscar - Search guest
router.get('/huesped/buscar', authenticate, authorize('admin', 'recepcion', 'limpieza', 'mantenimiento'), checkinController.searchGuest);

// GET /api/operaciones/habitaciones-disponibles - Get available rooms
router.get('/habitaciones-disponibles', authenticate, canPerformOperations, checkinController.getAvailableRooms);

// POST /api/operaciones/checkin - Create new check-in
router.post('/checkin', authenticate, canPerformOperations, checkinRules.create, validate, checkinController.create);

// Check-out routes
// GET /api/operaciones/checkout - Get all check-outs
router.get('/checkout', authenticate, canPerformOperations, checkoutController.getAll);

// GET /api/operaciones/checkout/:id - Get check-out by ID
router.get('/checkout/:id', authenticate, canPerformOperations, commonRules.id, validate, checkoutController.getById);

// PUT /api/operaciones/checkout/:id - Perform check-out
router.put('/checkout/:id', authenticate, canPerformOperations, checkoutRules.update, validate, checkoutController.checkout);

module.exports = router;
