const { validationResult, body, param, query } = require('express-validator');
const logger = require('./logger');

/**
 * Validation result handler middleware
 */
const validate = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    logger.warn('Validation failed', { errors: errors.array() });
    
    return res.status(400).json({
      success: false,
      message: 'Error de validación',
      errors: errors.array().map(err => ({
        field: err.path,
        message: err.msg
      }))
    });
  }
  
  next();
};

/**
 * Common validation rules
 */
const commonRules = {
  id: [
    param('id')
      .isInt({ min: 1 })
      .withMessage('ID debe ser un número entero positivo')
  ],
  
  page: [
    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Page debe ser un número entero positivo')
  ],
  
  limit: [
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit debe estar entre 1 y 100')
  ]
};

/**
 * Auth validation rules
 */
const authRules = {
  login: [
    body('username')
      .notEmpty()
      .withMessage('Username es requerido')
      .trim()
      .escape(),
    body('password')
      .notEmpty()
      .withMessage('Password es requerido')
  ]
};

/**
 * Room validation rules
 */
const roomRules = {
  create: [
    body('numero')
      .notEmpty()
      .withMessage('Número de habitación es requerido')
      .trim()
      .escape(),
    body('piso')
      .isInt({ min: 1, max: 20 })
      .withMessage('Piso debe estar entre 1 y 20'),
    body('id_tipo')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Tipo de habitación es requerido'),
    body('id_tipo_habitacion')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Tipo de habitación es requerido'),
    body('id_estado')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Estado de habitación inválido'),
    body('id_estado_actual')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Estado de habitación inválido'),
    body('capacidad')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Capacidad debe ser al menos 1 persona'),
    body('tarifa_base')
      .optional()
      .isFloat({ min: 0 })
      .withMessage('Tarifa base debe ser mayor o igual a 0'),
    body('descripcion')
      .optional()
      .trim()
      .escape()
  ],
  
  update: [
    param('id')
      .isInt({ min: 1 })
      .withMessage('ID de habitación inválido'),
    body('numero')
      .optional()
      .notEmpty()
      .withMessage('Número de habitación no puede estar vacío')
      .trim()
      .escape(),
    body('piso')
      .optional()
      .isInt({ min: 1, max: 20 })
      .withMessage('Piso debe estar entre 1 y 20'),
    body('id_tipo_habitacion')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Tipo de habitación inválido'),
    body('id_estado')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Estado de habitación inválido'),
    body('id_estado_actual')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Estado de habitación inválido'),
    body('capacidad')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Capacidad debe ser al menos 1 persona'),
    body('tarifa_base')
      .optional()
      .isFloat({ min: 0 })
      .withMessage('Tarifa base debe ser mayor o igual a 0')
  ]
};

/**
 * Check-in validation rules
 */
const checkinRules = {
  create: [
    body('id_habitacion')
      .isInt({ min: 1 })
      .withMessage('Habitación es requerida'),
    body('id_huesped')
      .isInt({ min: 1 })
      .withMessage('Huésped es requerido'),
    body('fecha_checkout_prevista')
      .notEmpty()
      .withMessage('Fecha de checkout prevista es requerida'),
    body('fecha_checkin')
      .optional()
      .notEmpty()
      .withMessage('Fecha de check-in inválida'),
    body('hora_checkin')
      .optional()
      .isString()
      .trim(),
    body('hora_checkout_prevista')
      .optional()
      .isString()
      .trim(),
    body('numero_adultos')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Número de adultos debe ser al menos 1'),
    body('numero_ninos')
      .optional()
      .isInt({ min: 0 })
      .withMessage('Número de niños no puede ser negativo'),
    body('biometria_verificada')
      .optional()
      .isBoolean()
      .withMessage('La verificación biométrica debe ser verdadera o falsa'),
    body('tipo_verificacion')
      .optional()
      .isString()
      .withMessage('El tipo de verificación es inválido')
      .trim()
  ]
};

/**
 * Check-out validation rules
 */
const checkoutRules = {
  update: [
    param('id')
      .isInt({ min: 1 })
      .withMessage('ID de estadía inválido'),
    body('metodo_pago')
      .optional()
      .isString()
      .withMessage('Método de pago inválido')
      .trim(),
    body('referencia')
      .optional()
      .isString()
      .withMessage('Referencia inválida')
      .trim(),
    body('observaciones')
      .optional()
      .isString()
      .withMessage('Observaciones inválidas')
      .trim(),
    body('fecha_salida')
      .optional()
      .isISO8601()
      .withMessage('Fecha de salida inválida'),
    body('hora_salida')
      .optional()
      .isString()
      .withMessage('Hora de salida inválida'),
    body('cargos_adicionales')
      .optional()
      .isArray()
      .withMessage('Cargos adicionales debe ser un arreglo'),
    body('genera_factura')
      .optional()
      .isBoolean()
      .withMessage('Indicador de factura inválido'),
    body('numero_factura')
      .optional()
      .isString()
      .withMessage('Número de factura inválido')
      .trim(),
    body('total')
      .optional()
      .isFloat({ min: 0 })
      .withMessage('Total inválido')
  ]
};

/**
 * Task validation rules
 */
const taskRules = {
  create: [
    body('id_habitacion')
      .isInt({ min: 1 })
      .withMessage('Habitación es requerida'),
    body('id_empleado_asignado')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Empleado inválido'),
    body('tipo_tarea')
      .optional()
      .isIn(['Rutinaria', 'CheckOut', 'Profunda'])
      .withMessage('Tipo de tarea inválido'),
    body('prioridad')
      .optional()
      .isIn(['Urgente', 'Normal', 'Baja'])
      .withMessage("Prioridad debe ser 'Urgente', 'Normal' o 'Baja'")
  ],
  
  update: [
    param('id')
      .isInt({ min: 1 })
      .withMessage('ID de tarea inválido'),
    body('estado')
      .optional()
      .isIn(['Pendiente', 'EnProceso', 'Completada', 'Cancelada'])
      .withMessage('Estado de tarea inválido'),
    body('tiempo_minutos')
      .optional()
      .isInt({ min: 0 })
      .withMessage('Tiempo en minutos no puede ser negativo')
  ]
};

/**
 * Maintenance ticket validation rules
 */
const maintenanceRules = {
  create: [
    body('id_habitacion')
      .isInt({ min: 1 })
      .withMessage('Habitación es requerida'),
    body('id_categoria')
      .isInt({ min: 1 })
      .withMessage('Categoría es requerida'),
    body('titulo')
      .notEmpty()
      .withMessage('Título es requerido')
      .trim()
      .escape(),
    body('descripcion')
      .notEmpty()
      .withMessage('Descripción es requerida')
      .trim(),
    body('prioridad')
      .optional()
      .isInt({ min: 1, max: 4 })
      .withMessage('Prioridad debe estar entre 1 y 4'),
    body('afecta_habitabilidad')
      .optional()
      .isBoolean()
      .withMessage('Indicador de habitabilidad inválido'),
    body('fotos')
      .optional()
      .isArray()
      .withMessage('Fotos debe ser un arreglo')
  ],
  update: [
    param('id')
      .isInt({ min: 1 })
      .withMessage('ID de ticket inválido'),
    body('estado')
      .optional()
      .isIn(['Pendiente', 'EnProceso', 'Completado', 'Cancelado'])
      .withMessage('Estado de ticket inválido'),
    body('id_empleado_asignado')
      .optional()
      .isInt({ min: 1 })
.withMessage('Empleado inválido'),
    body('tiempo_minutos')
      .optional()
      .isInt({ min: 0 })
      .withMessage('Tiempo en minutos no puede ser negativo'),
    body('costo_real')
      .optional()
      .isFloat({ min: 0 })
      .withMessage('Costo real debe ser positivo'),
    body('estado_posterior')
      .optional()
      .isIn(['Disponible', 'Limpieza'])
      .withMessage('Estado posterior debe ser Disponible o Limpieza'),
    body('materiales')
      .optional()
      .isArray()
      .withMessage('Materiales debe ser un arreglo'),
    body('materiales.*.nombre')
      .optional()
      .isString()
      .withMessage('Nombre de material inválido')
      .trim(),
    body('materiales.*.cantidad')
      .optional()
      .isInt({ min: 0 })
      .withMessage('Cantidad de material inválida'),
    body('materiales.*.costo_unitario')
      .optional()
      .isFloat({ min: 0 })
      .withMessage('Costo unitario de material inválido')
  ]
};

module.exports = {
  validate,
  commonRules,
  authRules,
  roomRules,
  checkinRules,
  checkoutRules,
  taskRules,
  maintenanceRules
};
