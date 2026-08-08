const express = require('express');
const router = express.Router();
const facturaController = require('../controllers/facturaController');
const { authenticate } = require('../middlewares/auth');
const { isReceptionistOrAdmin } = require('../middlewares/roles');

// GET /api/facturas -> Obtener historial de facturas
router.get('/', authenticate, isReceptionistOrAdmin, facturaController.getAllFacturas);

// POST /api/facturas -> Crear una nueva factura
router.post('/', authenticate, isReceptionistOrAdmin, facturaController.crearFactura);

// GET /api/facturas/:id/descargar -> Descargar una factura en PDF
router.get('/:id/descargar', authenticate, isReceptionistOrAdmin, facturaController.descargarFacturaPDF);


module.exports = router;