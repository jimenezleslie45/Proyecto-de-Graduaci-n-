const express = require('express');
const router = express.Router();
const monitorController = require('../controllers/monitorController');
const { authenticate } = require('../middlewares/auth');
const { isReceptionistOrAdmin, authorize } = require('../middlewares/roles');

// GET /api/monitor/estados - Get all room statuses
router.get('/estados', authenticate, authorize('admin', 'recepcion', 'limpieza', 'mantenimiento'), monitorController.getRoomStatuses);

// GET /api/monitor/resumen - Get status summary
router.get('/resumen', authenticate, isReceptionistOrAdmin, monitorController.getStatusSummary);

// GET /api/monitor/dashboard - Get dashboard data
router.get('/dashboard', authenticate, monitorController.getDashboard);

// GET /api/monitor/pendientes - Get pending tasks
router.get('/pendientes', authenticate, authorize('admin', 'recepcion', 'limpieza', 'mantenimiento'), monitorController.getPendingTasks);

module.exports = router;
