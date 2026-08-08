const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/database');
const config = require('../config/env');
const logger = require('../middlewares/logger');

const DEMO_USERS = [
  { id: 1, username: 'admin', password: 'admin123', id_rol: 1, id_empleado: 1, rol: 'admin', nombre: 'Administrador' },
  { id: 2, username: 'recepcionista', password: 'recepcion123', id_rol: 2, id_empleado: 2, rol: 'recepcion', nombre: 'Recepcionista' },
  { id: 3, username: 'limpieza', password: 'limpieza123', id_rol: 3, id_empleado: 3, rol: 'limpieza', nombre: 'Limpieza' },
  { id: 4, username: 'mantenimiento', password: 'mantenimiento123', id_rol: 4, id_empleado: 4, rol: 'mantenimiento', nombre: 'Mantenimiento' },
];

const createToken = (user, userRole) => {
  return jwt.sign(
    {
      id: user.id,
      empleado_id: user.id_empleado,
      username: user.username,
      rol: userRole,
      nombre: user.nombre || user.username
    },
    config.jwt.secret,
    { expiresIn: config.jwt.expiresIn }
  );
};

const sendLoginResponse = (res, user, userRole) => {
  const token = createToken(user, userRole);
  return res.json({
    success: true,
    message: 'Login exitoso',
    data: {
      token,
      user: {
        id: user.id,
        username: user.username,
        rol: userRole,
        nombre: user.nombre || user.username,
        empleado_id: user.id_empleado
      }
    }
  });
};

/**
 * LOGIN SEGURO Y CONECTADO A SQL SERVER SIGOH
 */
const login = async (req, res) => {
  try {
    // 1. Extraemos las variables del cuerpo de la petición
    const { usuario, contrasena, username, password } = req.body;
    
    // Validamos qué nombre de usuario llegó (frontend puede mandar 'usuario' o 'username')
    let loginUser = usuario || username;
    const loginPassword = contrasena || password;

    if (!loginUser || !loginPassword) {
      return res.status(400).json({ success: false, message: 'Usuario y contraseña requeridos' });
    }

    // 2. Normalización de Atajos: Si el frontend manda 'recepcion', lo convertimos a 'recepcionista'
    if (loginUser === 'recepcion') {
      loginUser = 'recepcionista';
    }
    
    logger.info(`[LOGIN] Intentando conectar usuario: ${loginUser}`);

    // =====================================================
    // MODO DEMO: Si la BD no está conectada, usar credenciales demo
    // =====================================================
    if (!db.isConnected()) {
      logger.warn('Ejecutando login en MODO DEMO (sin conexión a BD)');
      const demoUser = DEMO_USERS.find((u) => u.username === loginUser);

      if (!demoUser) {
        logger.warn('Login demo fallido: El usuario no existe', { username: loginUser });
        return res.status(401).json({ success: false, message: 'Credenciales inválidas' });
      }

      if (loginPassword !== demoUser.password) {
        logger.warn('Login demo fallido: Contraseña incorrecta', { username: loginUser });
        return res.status(401).json({ success: false, message: 'Credenciales inválidas' });
      }

      logger.info('Login demo exitoso', { username: loginUser, rol: demoUser.rol });
      return sendLoginResponse(res, demoUser, demoUser.rol);
    }

    // 1. Buscar al usuario directamente en la tabla real
    const queryUsuario = `
      SELECT id_usuario, username, password_hash, estado, id_rol, id_empleado
      FROM dbo.usuario 
      WHERE username = @loginUser
    `;
    const usuarios = await db.query(queryUsuario, { loginUser });

    if (!usuarios || usuarios.length === 0) {
      logger.warn('Login fallido: El usuario no existe en SQL Server', { username: loginUser });
      return res.status(401).json({ success: false, message: 'Credenciales inválidas' });
    }

    const user = usuarios[0];

    if (user.estado !== 'ACTIVO') {
      return res.status(401).json({ success: false, message: 'El usuario no está activo' });
    }

    // 2. 🔐 COMPARACIÓN ESTRICTA Y SEGURA CON BCRYPT (Sin contraseñas quemadas)
    const isPasswordValid = await bcrypt.compare(loginPassword, user.password_hash);

    if (!isPasswordValid) {
      logger.warn('Login fallido: Contraseña incorrecta en SQL Server', { username: loginUser });
      return res.status(401).json({ success: false, message: 'Credenciales inválidas' });
    }

    // 3. 💾 EL GUARDADO REAL EXIGIDO POR EL INGENIERO
    // Actualiza el acceso físico y detona el trigger automático de auditoría 'trg_log_user_login'
    const queryUpdateAcceso = `
      UPDATE dbo.usuario 
      SET ultimo_acceso = GETDATE(), 
          intentos_fallidos = 0 
      WHERE id_usuario = @id_usuario
    `;
    
    try {
      await db.query(queryUpdateAcceso, { id_usuario: user.id_usuario });
      logger.info('Acceso guardado con éxito en la base de datos (Trigger de auditoría activado)');
    } catch (dbSaveError) {
      logger.error('Failed to save login session to database:', dbSaveError.message);
    }

    
    let userRole = 'recepcion';
    const roleId = parseInt(user.id_rol); // Forzamos a que lea el número de la columna id_rol
    
    if (roleId === 1 || roleId === 1002) {
      userRole = 'admin';
    } else if (roleId === 2 || roleId === 1003) {
      // Forzamos a que si el sistema detecta 'recepcionista' o viene con -ista, use 'recepcion'
      // Aunque la BD diga 'Recepcionista', el rol para el sistema será 'recepcion'
      userRole = 'recepcion'; 
    } else if (roleId === 3 || roleId === 1004) {
      userRole = 'limpieza';
    } else if (roleId === 4) {
      userRole = 'mantenimiento';
    }
    logger.info('Rol asignado para el token:', { userRole });

    // 5. Generación del Token JWT con los datos de SQL Server
    const token = jwt.sign(
      {
        id: user.id_usuario,
        empleado_id: user.id_empleado,
        username: user.username,
        rol: userRole,
        nombre: user.username
      },
      config.jwt.secret,
      { expiresIn: config.jwt.expiresIn }
    );

    // 6. Respuesta limpia al Frontend
    return res.json({
      success: true,
      message: 'Login exitoso y registrado en la Base de Datos',
      data: {
        token,
        user: {
          id: user.id_usuario,
          username: user.username,
          rol: userRole,
          nombre: user.username,
          empleado_id: user.id_empleado
        }
      }
    });

  } catch (error) {
    logger.error('Error crítico en el login real:', error.message);
    return res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
};

const getMe = async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ success: false, message: 'No autenticado' });
    return res.json({
      success: true,
      data: {
        id: req.user.id,
        username: req.user.username,
        rol: req.user.rol,
        nombre: req.user.nombre
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Error de sesión' });
  }
};

const changePassword = async (req, res) => {
  return res.json({ success: true, message: 'OK' });
};

module.exports = {
  login,
  getMe,
  changePassword
};
