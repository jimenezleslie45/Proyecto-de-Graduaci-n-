const express = require('express');
const router = express.Router();
const usuariosController = require('../controllers/usuariosController');
const { authenticate } = require('../middlewares/auth');
const { isAdmin } = require('../middlewares/roles');
const { validate, commonRules } = require('../middlewares/validator');

// GET /api/usuarios - Get all users
router.get('/', authenticate, isAdmin, usuariosController.getAll);

// GET /api/usuarios/roles - Get all roles
router.get('/roles', authenticate, isAdmin, usuariosController.getRoles);

// GET /api/usuarios/empleados - Get all employees
router.get('/empleados', authenticate, isAdmin, usuariosController.getEmployees);

// GET /api/usuarios/:id - Get user by ID
router.get('/:id', authenticate, isAdmin, commonRules.id, validate, usuariosController.getById);

// POST /api/usuarios - Create new user
router.post('/', authenticate, isAdmin, usuariosController.create);

// PUT /api/usuarios/:id - Update user
router.put('/:id', authenticate, isAdmin, commonRules.id, validate, usuariosController.update);

// DELETE /api/usuarios/:id - Delete user
router.delete('/:id', authenticate, isAdmin, commonRules.id, validate, usuariosController.remove);

module.exports = router;
