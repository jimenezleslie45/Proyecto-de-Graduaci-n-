const express = require('express');
const router = express.Router();
const reportesController = require('../controllers/reportesController');
const { authenticate } = require('../middlewares/auth');
const { canManageReports, isAdmin } = require('../middlewares/roles');

// GET /api/reportes/kpis - Get KPIs dashboard
router.get('/kpis', authenticate, canManageReports, reportesController.getKPIs);

// GET /api/reportes/ocupacion - Get occupancy report
router.get('/ocupacion', authenticate, canManageReports, reportesController.getOccupancyReport);

// POST /api/reportes/generar - Generate report
router.post('/generar', authenticate, canManageReports, reportesController.generateReport);

// POST /api/reportes/exportar - Export report
router.post('/exportar', authenticate, canManageReports, reportesController.exportReport);

module.exports = router;
