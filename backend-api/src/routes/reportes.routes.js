const express = require('express');
const router = express.Router();
const reportesController = require('../controllers/reportesController');
const { authenticate } = require('../middlewares/auth');
const { authorize, canManageReports } = require('../middlewares/roles');

// Basic room KPIs are available to reception; full reporting stays admin-only.
router.get('/kpis/basicos', authenticate, authorize('admin', 'recepcion'), reportesController.getBasicKPIs);

// GET /api/reportes/kpis - Get full KPIs dashboard
router.get('/kpis', authenticate, canManageReports, reportesController.getKPIs);

// GET /api/reportes/ocupacion - Get occupancy report
router.get('/ocupacion', authenticate, canManageReports, reportesController.getOccupancyReport);

// POST /api/reportes/generar - Generate report
router.post('/generar', authenticate, canManageReports, reportesController.generateReport);

// POST /api/reportes/exportar - Export report
router.post('/exportar', authenticate, canManageReports, reportesController.exportReport);

// GET /api/reportes/historial - Get generated reports history
router.get('/historial', authenticate, canManageReports, reportesController.getHistorialReportes);

// GET /api/reportes/:id/descargar - Download generated report file
router.get('/:id/descargar', authenticate, canManageReports, reportesController.descargarReporte);

module.exports = router;
