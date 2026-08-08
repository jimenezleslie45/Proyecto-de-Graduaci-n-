const bcrypt = require('bcryptjs');
const db = require('../config/database');
const logger = require('../middlewares/logger');
const config = require('../config/env');

const DEMO_ROLES = [
  { id: 1, nombre: 'Administrador', descripcion: 'Acceso total' },
  { id: 2, nombre: 'Recepcionista', descripcion: 'Gestión de check-in y check-out' },
  { id: 3, nombre: 'Limpieza', descripcion: 'Gestión de limpieza' },
  { id: 4, nombre: 'Mantenimiento', descripcion: 'Gestión de mantenimiento' }
];

const DEMO_EMPLOYEES = [
  { id: 1, codigo_empleado: 'EMP001', nombres: 'Admin', apellidos: 'Demo', email: 'admin@demo.hotel', telefono: '0000000000', rol: 'Administrador' },
  { id: 2, codigo_empleado: 'EMP002', nombres: 'Juan', apellidos: 'Pérez', email: 'recepcionista@demo.hotel', telefono: '0000000000', rol: 'Recepcionista' },
  { id: 3, codigo_empleado: 'EMP003', nombres: 'María', apellidos: 'García', email: 'limpieza@demo.hotel', telefono: '0000000000', rol: 'Limpieza' },
  { id: 4, codigo_empleado: 'EMP004', nombres: 'Carlos', apellidos: 'López', email: 'mantenimiento@demo.hotel', telefono: '0000000000', rol: 'Mantenimiento' }
];

const DEMO_USERS = [
  { id: 1, username: 'admin', ultimo_login: null, bloqueado: 0, activo: 1, fecha_creacion: new Date().toISOString(), empleado_id: 1, codigo_empleado: 'EMP001', rol_id: 1, rol: 'Administrador', nombre_empleado: 'Admin Demo' },
  { id: 2, username: 'recepcionista', ultimo_login: null, bloqueado: 0, activo: 1, fecha_creacion: new Date().toISOString(), empleado_id: 2, codigo_empleado: 'EMP002', rol_id: 2, rol: 'Recepcionista', nombre_empleado: 'Juan Pérez' },
  { id: 3, username: 'limpieza', ultimo_login: null, bloqueado: 0, activo: 1, fecha_creacion: new Date().toISOString(), empleado_id: 3, codigo_empleado: 'EMP003', rol_id: 3, rol: 'Limpieza', nombre_empleado: 'María García' },
  { id: 4, username: 'mantenimiento', ultimo_login: null, bloqueado: 0, activo: 1, fecha_creacion: new Date().toISOString(), empleado_id: 4, codigo_empleado: 'EMP004', rol_id: 4, rol: 'Mantenimiento', nombre_empleado: 'Carlos López' }
];

/**
 * Get all users with pagination
 */
const getAll = async (req, res) => {
  try {
    const isDemoMode = !db.isConnected();
    const { rol, activo } = req.query;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    if (isDemoMode) {
      let users = DEMO_USERS;
      if (rol) {
        users = users.filter((user) => user.rol === rol);
      }
      if (activo !== undefined) {
        const activoBool = activo === 'true';
        users = users.filter((user) => (user.activo === 1) === activoBool);
      }

      const total = users.length;
      const pagedUsers = users.slice(offset, offset + limit);

      return res.json({
        success: true,
        data: {
          users: pagedUsers,
          pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit)
          }
        }
      });
    }

    let whereConditions = [];
    let params = {};

    if (rol) {
      whereConditions.push('r.nombre = @rol');
      params.rol = rol;
    }

    if (activo !== undefined) {
      whereConditions.push('u.activo = @activo');
      params.activo = activo === 'true' ? 1 : 0;
    }

    const whereClause = whereConditions.length > 0 
      ? 'WHERE ' + whereConditions.join(' AND ')
      : '';

    const countResult = await db.query(`
      SELECT COUNT(*) as total
      FROM usuario u
      LEFT JOIN empleado e ON u.id_empleado = e.id_empleado
      LEFT JOIN rol r ON u.id_rol = r.id_rol
      LEFT JOIN persona p ON e.id_persona = p.id_persona
      ${whereClause}
    `, params);

    const users = await db.query(`
      SELECT u.id_usuario as id, u.username, u.ultimo_acceso, u.bloqueado_hasta, u.estado as activo, u.created_at as fecha_creacion,
             e.id_empleado,
             r.id_rol, r.nombre as rol,
             p.nombres, p.apellidos, p.email
      FROM usuario u
      LEFT JOIN empleado e ON u.id_empleado = e.id_empleado
      LEFT JOIN rol r ON u.id_rol = r.id_rol
      LEFT JOIN persona p ON e.id_persona = p.id_persona
      ${whereClause}
      ORDER BY p.apellidos, p.nombres
      OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
    `, { ...params, offset, limit });

    res.json({
      success: true,
      data: {
        users,
        pagination: {
          page,
          limit,
          total: countResult[0].total,
          pages: Math.ceil(countResult[0].total / limit)
        }
      }
    });
  } catch (error) {
    logger.error('Get users error:', { error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      message: 'Error al obtener usuarios',
      error: config.nodeEnv === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get user by ID
 */
const getById = async (req, res) => {
  try {
    const { id } = req.params;
    const isDemoMode = !db.isConnected();

    if (isDemoMode) {
      const user = DEMO_USERS.find((u) => u.id === parseInt(id, 10));
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'Usuario no encontrado'
        });
      }

      return res.json({
        success: true,
        data: user
      });
    }

    const users = await db.query(`
      SELECT u.id_usuario as id, u.username, u.ultimo_acceso, u.bloqueado_hasta, u.estado, u.created_at as fecha_creacion,
             e.id_empleado as empleado_id, e.fecha_ingreso,
             r.id_rol, r.nombre as rol,
             p.nombres, p.apellidos, p.documento, p.email
      FROM usuario u
      LEFT JOIN empleado e ON u.id_empleado = e.id_empleado
      LEFT JOIN rol r ON u.id_rol = r.id_rol
      LEFT JOIN persona p ON e.id_persona = p.id_persona
      WHERE u.id_usuario = @id
    `, { id });

    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    res.json({
      success: true,
      data: users[0]
    });
  } catch (error) {
    logger.error('Get user error:', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Error al obtener usuario',
      error: config.nodeEnv === 'development' ? error.message : undefined
    });
  }
};

/**
 * Create new user
 */
const create = async (req, res) => {
  try {
    const { username, password, id_empleado } = req.body;

    // Check if username already exists
    const existingUser = await db.query(`
      SELECT id_usuario FROM usuario WHERE username = @username
    `, { username });

    if (existingUser.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'El nombre de usuario ya está en uso'
      });
    }

    // Check if employee already has a user
    const existingEmployeeUser = await db.query(`
      SELECT id_usuario FROM usuario WHERE id_empleado = @id_empleado AND estado = 'ACTIVO'
    `, { id_empleado });

    if (existingEmployeeUser.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'El empleado ya tiene un usuario asociado'
      });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const result = await db.query(`
      INSERT INTO usuario (id_empleado, id_rol, username, password_hash, estado)
      VALUES (@id_empleado, @id_rol, @username, @password_hash, 'ACTIVO');
      SELECT SCOPE_IDENTITY() as id;
    `, {
      id_empleado,
      id_rol: req.body.id_rol,
      username,
      password_hash: passwordHash
    });

    logger.info('User created', { userId: result[0].id, username });

    res.status(201).json({
      success: true,
      message: 'Usuario creado exitosamente',
      data: { id: result[0].id }
    });
  } catch (error) {
    logger.error('Create user error:', { error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      message: 'Error al crear usuario',
      error: config.nodeEnv === 'development' ? error.message : undefined
    });
  }
};

/**
 * Update user
 */
const update = async (req, res) => {
  try {
    const { id } = req.params;
    const { username, password, activo, bloqueado } = req.body;

    // Check if user exists
    const existing = await db.query(`
      SELECT id_usuario FROM usuario WHERE id_usuario = @id
    `, { id });

    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    // Check if username is taken by another user
    if (username) {
      const duplicateUsername = await db.query(`
        SELECT id_usuario FROM usuario WHERE username = @username AND id_usuario != @id
      `, { username, id });

      if (duplicateUsername.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'El nombre de usuario ya está en uso'
        });
      }
    }

    // Build update query
    let updateFields = [];
    let params = { id };

    if (username) {
      updateFields.push('username = @username');
      params.username = username;
    }

    if (password) {
      const salt = await bcrypt.genSalt(10);
      params.password_hash = await bcrypt.hash(password, salt);
      updateFields.push('password_hash = @password_hash');
    }

    if (activo !== undefined) {
      updateFields.push('estado = @estado');
      params.estado = activo ? 'ACTIVO' : 'INACTIVO';
    }

    if (bloqueado !== undefined) {
      updateFields.push('bloqueado_hasta = @bloqueado_hasta');
      params.bloqueado_hasta = bloqueado ? new Date(Date.now() + 24 * 60 * 60 * 1000) : null;
      // Reset failed attempts when unblocking
      if (!bloqueado) {
        updateFields.push('intentos_fallidos = 0');
      }
    }
    if (updateFields.length === 0) return res.json({ success: true, message: 'Nada que actualizar' });
    await db.query(`
      UPDATE usuario SET ${updateFields.join(', ')} WHERE id_usuario = @id
    `, params);

    logger.info('User updated', { userId: id });

    res.json({
      success: true,
      message: 'Usuario actualizado exitosamente'
    });
  } catch (error) {
    logger.error('Update user error:', { error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      message: 'Error al actualizar usuario',
      error: config.nodeEnv === 'development' ? error.message : undefined
    });
  }
};

/**
 * Delete (deactivate) user
 */
const remove = async (req, res) => {
  try {
    const { id } = req.params;

    const existing = await db.query(`
      SELECT id_usuario FROM usuario WHERE id_usuario = @id
    `, { id });

    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    await db.query(`
      UPDATE usuario SET estado = 'INACTIVO' WHERE id_usuario = @id
    `, { id });

    logger.info('User deactivated', { userId: id });

    res.json({
      success: true,
      message: 'Usuario eliminado exitosamente'
    });
  } catch (error) {
    logger.error('Delete user error:', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Error al eliminar usuario',
      error: config.nodeEnv === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get all roles
 */
const getRoles = async (req, res) => {
  try {
    if (!db.isConnected()) {
      return res.json({
        success: true,
        data: DEMO_ROLES
      });
    }

    const roles = await db.query(`
      -- FIX: Consulta adaptada a la base de datos SIGOH
      SELECT id_rol, nombre, descripcion
      FROM rol
      ORDER BY nombre
    `);

    res.json({
      success: true,
      data: roles
    });
  } catch (error) {
    logger.error('Get roles error:', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Error al obtener roles',
      error: config.nodeEnv === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get all employees
 */
const getEmployees = async (req, res) => {
  try {
    const { rol } = req.query;

    if (!db.isConnected()) {
      let employees = DEMO_EMPLOYEES;
      if (rol) {
        employees = employees.filter((e) => e.rol === rol);
      }
      return res.json({
        success: true,
        data: employees
      });
    }

    let whereCondition = '1=1'; // Se elimina el filtro 'e.activo = 1' que causaba error
    let params = {};

    if (rol) {
      whereCondition += ' AND r.nombre = @rol';
      params.rol = rol;
    }

    const employees = await db.query(`
      SELECT e.id_empleado as id, e.fecha_ingreso,
             p.nombres, p.apellidos, p.email,
             pu.nombre as puesto
      FROM empleado e
      INNER JOIN persona p ON e.id_persona = p.id_persona
      INNER JOIN puesto pu ON e.id_puesto = pu.id_puesto
      WHERE ${whereCondition}
      ORDER BY p.apellidos, p.nombres
    `, params);
    const usersWithEmployees = await db.query(`
      SELECT id_empleado FROM usuario WHERE estado = 'ACTIVO'
    `);

    const usedEmployeeIds = new Set(usersWithEmployees.map(u => u.id_empleado));

    const availableEmployees = employees.filter(e => !usedEmployeeIds.has(e.id));

    res.json({
      success: true,
      data: availableEmployees
    });
  } catch (error) {
    logger.error('Get employees error:', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Error al obtener empleados',
      error: config.nodeEnv === 'development' ? error.message : undefined
    });
  }
};

module.exports = {
  getAll,
  getById,
  create,
  update,
  remove,
  getRoles,
  getEmployees
};
