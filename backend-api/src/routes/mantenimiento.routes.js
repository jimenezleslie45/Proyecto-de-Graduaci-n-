const express = require('express');
const router = express.Router();
const mantenimientoController = require('../controllers/mantenimientoController');
const { authenticate } = require('../middlewares/auth');
const { isMaintenanceOrAdmin } = require('../middlewares/roles');
const { validate, commonRules, maintenanceRules } = require('../middlewares/validator');

// GET /api/mantenimiento/tickets - Get all maintenance tickets (todos los roles autenticados)
router.get('/tickets', authenticate, mantenimientoController.getAll);

// GET /api/mantenimiento/tickets/:id - Get maintenance ticket by ID
router.get('/tickets/:id', authenticate, commonRules.id, validate, mantenimientoController.getById);

// GET /api/mantenimiento/habitaciones/:id - Historial de reportes de una habitación
router.get('/habitaciones/:id', authenticate, commonRules.id, validate, mantenimientoController.getByHabitacion);

// GET /api/mantenimiento/notificaciones - Notificaciones CRÍTICAS
router.get('/notificaciones', authenticate, mantenimientoController.getNotificaciones);

// GET /api/mantenimiento/categorias - Get maintenance categories (todos los roles autenticados)
router.get('/categorias', authenticate, mantenimientoController.getCategories);

// GET /api/mantenimiento/staff - Get maintenance staff
router.get('/staff', authenticate, isMaintenanceOrAdmin, mantenimientoController.getStaff);

// POST /api/mantenimiento/tickets - Create new maintenance ticket (todos los roles autenticados)
router.post('/tickets', authenticate, maintenanceRules.create, validate, mantenimientoController.create);

// PUT /api/mantenimiento/tickets/:id - Update maintenance ticket
router.put('/tickets/:id', authenticate, isMaintenanceOrAdmin, maintenanceRules.update, validate, mantenimientoController.update);

module.exports = router;
