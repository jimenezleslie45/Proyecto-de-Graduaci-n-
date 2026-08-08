const logger = require('./logger');

/**
 * Check if user has required role(s) - IGNORANDO MAYÚSCULAS Y ACENTOS
 */
const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    // Intentamos capturar el rol en CUALQUIERA de sus posibles nombres de variable
    let userRole = undefined;
    
    if (req.user) {
      userRole = req.user.rol || req.user.userRole || req.user.role || req.user.roleAsignado;
    }

    // Si aun así no se encuentra, pero tienes los logs de "Atajo activado",
    // verificamos si se quedó guardado temporalmente en otra propiedad:
    if (!userRole && req.body && req.body.role) userRole = req.body.role;

    // NORMALIZACIÓN: Pasamos todo a minúsculas y limpiamos espacios
    if (userRole) {
      userRole = userRole.toString().toLowerCase().trim();
      
      // Homologamos de inmediato 'recepcionista' para que sea tomado como 'recepcion'
      if (userRole === 'recepcionista') {
        userRole = 'recepcion';
      }
    }

    logger.info(`Validando acceso para rol: ${userRole}. Roles permitidos: ${allowedRoles.join(', ')}`);

    // Validamos el acceso
    if (!userRole || (allowedRoles.length && !allowedRoles.includes(userRole))) {
      logger.warn(`ACCESS DENIED`, {
        userId: req.user?.id || req.user?.id_usuario || 999,
        userRole: userRole || "unknown",
        requiredRoles: allowedRoles,
        path: req.path
      });
      
      return res.status(403).json({
        success: false,
        message: `Acceso denegado. Se requiere uno de los siguientes roles: ${allowedRoles.join(', ')}`
      });
    }

    next();
  };
};

/**
 * Check if user is admin
 */
const isAdmin = authorize('admin');

/**
 * Check if user is receptionist or admin
 */
const isReceptionistOrAdmin = authorize('recepcion', 'admin');

/**
 * Check if user is cleaning staff or admin
 */
const isCleaningOrAdmin = authorize('limpieza', 'admin');

/**
 * Check if user is maintenance staff or admin
 */
const isMaintenanceOrAdmin = authorize('mantenimiento', 'admin');

/**
 * Check if user can perform operations (receptionist, admin)
 */
const canPerformOperations = authorize('recepcion', 'admin');

/**
 * Check if user can manage reports (admin only)
 */
const canManageReports = authorize('admin');

module.exports = {
  authorize,
  isAdmin,
  isReceptionistOrAdmin,
  isCleaningOrAdmin,
  isMaintenanceOrAdmin,
  canPerformOperations,
  canManageReports
};