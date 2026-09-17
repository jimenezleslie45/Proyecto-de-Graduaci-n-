const express = require('express');
const router = express.Router();
const reservaController = require('../controllers/reservaController');
const { authenticate } = require('../middlewares/auth');
const { canPerformOperations } = require('../middlewares/roles');

router.get('/', authenticate, canPerformOperations, reservaController.getAll);
router.post('/', authenticate, canPerformOperations, reservaController.create);
router.post('/:id/convertir', authenticate, canPerformOperations, reservaController.convertir);
router.put('/:id/cancelar', authenticate, canPerformOperations, reservaController.cancelar);

module.exports = router;
