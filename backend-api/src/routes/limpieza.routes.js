const express = require('express');
const router = express.Router();
const limpiezaController = require('../controllers/limpiezaController');
const { authenticate } = require('../middlewares/auth');
const { authorize } = require('../middlewares/roles');
const { validate, commonRules, taskRules } = require('../middlewares/validator');

// Roles permitidos en la pantalla 6: Admin, Recepción, Housekeeping (limpieza)
const canAccessCleaning = authorize('admin', 'recepcion', 'limpieza');
const canManageCleaning = authorize('admin', 'recepcion');

// GET /api/limpieza/tareas - Get all cleaning tasks
router.get('/tareas', authenticate, canAccessCleaning, limpiezaController.getAll);

// GET /api/limpieza/tareas/:id - Get cleaning task by ID
router.get('/tareas/:id', authenticate, canAccessCleaning, commonRules.id, validate, limpiezaController.getById);

// GET /api/limpieza/staff - Get cleaning staff
router.get('/staff', authenticate, canAccessCleaning, limpiezaController.getStaff);

// POST /api/limpieza/tareas - Create new cleaning task
router.post('/tareas', authenticate, canManageCleaning, taskRules.create, validate, limpiezaController.create);

// PUT /api/limpieza/tareas/:id - Update cleaning task (start, complete)
router.put('/tareas/:id', authenticate, canAccessCleaning, taskRules.update, validate, limpiezaController.update);

// PUT /api/limpieza/tareas/:id/prioridad - Change task priority (Admin/Recepción)
router.put('/tareas/:id/prioridad', authenticate, canManageCleaning, limpiezaController.changePriority);

// POST /api/limpieza/tareas/:id/asignar - Assign task to employee (Admin/Recepción)
router.post('/tareas/:id/asignar', authenticate, canManageCleaning, limpiezaController.assign);

// DELETE /api/limpieza/tareas/:id - Delete task (Admin/Recepción)
router.delete('/tareas/:id', authenticate, canManageCleaning, limpiezaController.remove);

module.exports = router;
