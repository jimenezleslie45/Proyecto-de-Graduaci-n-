const express = require('express');
const router = express.Router();
const habitacionesController = require('../controllers/habitacionesController');
const { authenticate } = require('../middlewares/auth');
const { isAdmin, isReceptionistOrAdmin } = require('../middlewares/roles');
const { validate, commonRules, roomRules } = require('../middlewares/validator');

// GET /api/habitaciones - Get all rooms
router.get('/', authenticate, habitacionesController.getAll);

// GET /api/habitaciones/disponibles - Get available rooms only
router.get('/disponibles', authenticate, habitacionesController.getAvailableRooms);

// GET /api/habitaciones/tipos - Get room types
router.get('/tipos', authenticate, habitacionesController.getTypes);

// GET /api/habitaciones/estados - Get room states
router.get('/estados', authenticate, habitacionesController.getStates);

// GET /api/habitaciones/:id - Get room by ID
router.get('/:id', authenticate, commonRules.id, validate, habitacionesController.getById);

// POST /api/habitaciones - Create new room
router.post('/', authenticate, isAdmin, roomRules.create, validate, habitacionesController.create);

// PUT /api/habitaciones/:id - Update room
router.put('/:id', authenticate, isAdmin, roomRules.update, validate, habitacionesController.update);

// DELETE /api/habitaciones/:id - Delete room
router.delete('/:id', authenticate, isAdmin, commonRules.id, validate, habitacionesController.remove);

module.exports = router;
