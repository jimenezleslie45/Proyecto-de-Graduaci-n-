const db = require('../config/database');
const logger = require('../middlewares/logger');
const config = require('../config/env');
const { emitToAll } = require('../config/socket');

// Demo data for monitor
const DEMO_HABITACIONES = [
  { id: 1, numero: '101', piso: 1, id_tipo_habitacion: 1, id_estado: 1, descripcion: 'Habitación individual', tipo_habitacion: 'Individual', capacidad: 1, estado: 'Disponible', color: 'green', huesped_actual: null },
  { id: 2, numero: '102', piso: 1, id_tipo_habitacion: 2, id_estado: 2, descripcion: 'Habitación doble', tipo_habitacion: 'Doble', capacidad: 2, estado: 'Ocupada', color: 'red', huesped_actual: 'Pedro Gómez' },
  { id: 3, numero: '103', piso: 1, id_tipo_habitacion: 3, id_estado: 1, descripcion: 'Habitación twin', tipo_habitacion: 'Twin', capacidad: 2, estado: 'Disponible', color: 'green', huesped_actual: null },
  { id: 4, numero: '201', piso: 2, id_tipo_habitacion: 4, id_estado: 3, descripcion: 'Suite junior', tipo_habitacion: 'Suite', capacidad: 3, estado: 'Limpieza', color: 'yellow', huesped_actual: null },
  { id: 5, numero: '202', piso: 2, id_tipo_habitacion: 2, id_estado: 1, descripcion: 'Habitación doble estándar', tipo_habitacion: 'Doble', capacidad: 2, estado: 'Disponible', color: 'green', huesped_actual: null },
  { id: 6, numero: '203', piso: 2, id_tipo_habitacion: 1, id_estado: 4, descripcion: 'Habitación individual en mantenimiento', tipo_habitacion: 'Individual', capacidad: 1, estado: 'Mantenimiento', color: 'orange', huesped_actual: null },
  { id: 7, numero: '301', piso: 3, id_tipo_habitacion: 5, id_estado: 1, descripcion: 'Suite presidencial', tipo_habitacion: 'Suite Presidencial', capacidad: 4, estado: 'Disponible', color: 'green', huesped_actual: null },
  { id: 8, numero: '302', piso: 3, id_tipo_habitacion: 6, id_estado: 2, descripcion: 'Habitación familiar', tipo_habitacion: 'Familiar', capacidad: 5, estado: 'Ocupada', color: 'red', huesped_actual: 'Ana Martínez' },
  { id: 9, numero: '303', piso: 3, id_tipo_habitacion: 3, id_estado: 1, descripcion: 'Habitación twin', tipo_habitacion: 'Twin', capacidad: 2, estado: 'Disponible', color: 'green', huesped_actual: null },
  { id: 10, numero: '304', piso: 3, id_tipo_habitacion: 4, id_estado: 1, descripcion: 'Suite estándar', tipo_habitacion: 'Suite', capacidad: 3, estado: 'Disponible', color: 'green', huesped_actual: null }
];

/**
 * Get all room statuses in real-time
 */
const getRoomStatuses = async (req, res) => {
  try {
    const { piso } = req.query;
    const isDemoMode = !db.isConnected();

    if (isDemoMode) {
      let rooms = DEMO_HABITACIONES;
      if (piso) {
        rooms = rooms.filter(r => r.piso === parseInt(piso));
      }
      
      // Group by floor
      const floors = {};
      rooms.forEach(room => {
        if (!floors[room.piso]) {
          floors[room.piso] = [];
        }
        floors[room.piso].push(room);
      });

      return res.json({
        success: true,
        data: { rooms, floors }
      });
    }

    let whereCondition = '1=1'; // Condición inicial para poder añadir más filtros
    let params = {};

    if (piso) {
      whereCondition += ' AND h.piso = @piso';
      params.piso = piso;
    }

    const rooms = await db.query(`
      SELECT h.id_habitacion as id, h.numero, h.piso, th.nombre as descripcion,
             th.nombre as tipo_habitacion, th.capacidad,
             eh.id_estado as id_estado, eh.nombre as estado, eh.codigo_color as color,
             CASE 
               WHEN e.estado = 'ACTIVA' THEN CONCAT(p.nombres, ' ', p.apellidos)
               ELSE NULL
             END as huesped_actual,
             e.check_in as fecha_checkin,
             e.check_out as fecha_checkout_prevista
      FROM habitacion h
      LEFT JOIN tipo_habitacion th ON h.id_tipo = th.id_tipo
      INNER JOIN estado_habitacion eh ON h.id_estado_actual = eh.id_estado
      LEFT JOIN estadia e ON h.id_habitacion = e.id_habitacion AND e.estado = 'ACTIVA'
      LEFT JOIN huesped hu ON e.id_huesped = hu.id_huesped
      LEFT JOIN persona p ON hu.id_persona = p.id_persona
      WHERE ${whereCondition} AND ISNULL(h.activo, 1) = 1
      ORDER BY h.piso, h.numero
    `, params);

    // Group by floor
    const floors = {};
    rooms.forEach(room => {
      if (!floors[room.piso]) {
        floors[room.piso] = [];
      }
      floors[room.piso].push(room);
    });

    // Emitir actualización en tiempo real a todos los clientes conectados
    try {
      emitToAll('monitor:update', { rooms, floors, timestamp: new Date() });
    } catch (emitError) {
      logger.warn('Error al emitir evento WebSocket monitor:update:', { error: emitError.message });
    }

    res.json({
      success: true,
      data: { rooms, floors }
    });
  } catch (error) {
    logger.error('Get room statuses error:', { error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      message: 'Error al obtener estados de habitaciones',
      error: config.nodeEnv === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get room status summary (counts by state)
 */
const getStatusSummary = async (req, res) => {
  try {
    const isDemoMode = !db.isConnected();

    if (isDemoMode) {
      const summary = [
        { estado: 'Disponible', color: 'green', cantidad: 6 },
        { estado: 'Ocupada', color: 'red', cantidad: 2 },
        { estado: 'Limpieza', color: 'yellow', cantidad: 1 },
        { estado: 'Mantenimiento', color: 'orange', cantidad: 1 }
      ];
      const total = summary.reduce((sum, item) => sum + item.cantidad, 0);

      return res.json({
        success: true,
        data: { summary, total }
      });
    }

    const summary = await db.query(`
      SELECT eh.nombre as estado, eh.codigo_color as color, COUNT(h.id_habitacion) as cantidad
      FROM habitacion h
      INNER JOIN estado_habitacion eh ON h.id_estado_actual = eh.id_estado
      WHERE ISNULL(h.activo, 1) = 1
      GROUP BY eh.nombre, eh.codigo_color
      ORDER BY eh.nombre
    `);

    const total = summary.reduce((sum, item) => sum + item.cantidad, 0);

    res.json({
      success: true,
      data: { summary, total }
    });
  } catch (error) {
    logger.error('Get status summary error:', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Error al obtener resumen de estados',
      error: config.nodeEnv === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get real-time dashboard data
 */
const getDashboard = async (req, res) => {
  try {
    const isDemoMode = !db.isConnected();

    if (isDemoMode) {
      const roomSummary = [
        { estado: 'Disponible', color: 'green', cantidad: 6 },
        { estado: 'Ocupada', color: 'red', cantidad: 2 },
        { estado: 'Limpieza', color: 'yellow', cantidad: 1 },
        { estado: 'Mantenimiento', color: 'orange', cantidad: 1 }
      ];

      const total = 10;
      const ocupacion = Math.round((2 / total) * 100);

      return res.json({
        success: true,
        data: {
          habitaciones: {
            summary: roomSummary,
            total: total,
            ocupacion: ocupacion
          },
          hoy: {
            checkins_hoy: 3,
            checkouts_hoy: 2,
            tareas_limpieza_hoy: 5,
            tareas_completadas_hoy: 3,
            tickets_mantenimiento_hoy: 2,
            tickets_pendientes: 3
          },
          huespedes_activos: 2
        }
      });
    }

    // Get room summary
    const roomSummary = await db.query(`
      SELECT eh.nombre as estado, eh.codigo_color as color, COUNT(h.id_habitacion) as cantidad
      FROM dbo.habitacion h
      INNER JOIN estado_habitacion eh ON h.id_estado_actual = eh.id_estado
      WHERE ISNULL(h.activo, 1) = 1
      GROUP BY eh.nombre, eh.codigo_color
    `);

    // Get today's stats
    const today = new Date().toISOString().split('T')[0];

    const todayStats = await db.query(`
      SELECT 
        (SELECT COUNT(*) FROM estadia WHERE CAST(check_in AS DATE) = @today) as checkins_hoy,
        (SELECT COUNT(*) FROM estadia WHERE CAST(check_out AS DATE) = @today) as checkouts_hoy,
        (SELECT COUNT(*) FROM tarea_limpieza WHERE CAST(created_at AS DATE) = @today) as tareas_limpieza_hoy,
        (SELECT COUNT(*) FROM tarea_limpieza WHERE CAST(fin AS DATE) = @today) as tareas_completadas_hoy,
        (SELECT COUNT(*) FROM ticket_mantenimiento WHERE CAST(created_at AS DATE) = @today) as tickets_mantenimiento_hoy,
        (SELECT COUNT(*) FROM ticket_mantenimiento WHERE estado = 'ABIERTO') as tickets_pendientes
    `, { today });

    // Get active stays
    const activeStays = await db.query(`
      SELECT COUNT(*) as cantidad
      FROM estadia
      WHERE estado = 'ACTIVA'
    `);

    // Calculate occupancy rate
    const totalRooms = await db.query(`
      SELECT COUNT(*) as total FROM habitacion WHERE ISNULL(activo, 1) = 1
    `);

    const ocuppedRooms = roomSummary.find(r => r.estado === 'OCUPADA')?.cantidad || 0;
    const occupancyRate = totalRooms[0].total > 0 
      ? Math.round((ocuppedRooms / totalRooms[0].total) * 100) 
      : 0;

    res.json({
      success: true,
      data: {
        habitaciones: {
          summary: roomSummary,
          total: totalRooms[0].total,
          ocupacion: occupancyRate
        },
        hoy: todayStats[0],
        huespedes_activos: activeStays[0].cantidad
      }
    });
  } catch (error) {
    logger.error('Get dashboard error:', { error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      message: 'Error al obtener datos del dashboard',
      error: config.nodeEnv === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get pending tasks summary
 */
const getPendingTasks = async (req, res) => {
  try {
    const { tipo } = req.query;
    const isDemoMode = !db.isConnected();

    if (isDemoMode) {
      const limpieza = [
        { id: 1, numero: 'TL001', tipo: 'limpieza', tipo_tarea: 'CheckOut', prioridad: 2, fecha_asignacion: new Date(), estado: 'Pendiente', numero_habitacion: '201', piso: 2, empleado_asignado: null },
        { id: 2, numero: 'TL003', tipo: 'limpieza', tipo_tarea: 'Rutinaria', prioridad: 3, fecha_asignacion: new Date(), estado: 'Pendiente', numero_habitacion: '103', piso: 1, empleado_asignado: null }
      ];

      const mantenimiento = [
        { id: 1, numero: 'TM001', tipo: 'mantenimiento', tipo_tarea: 'Eléctrica', prioridad: 2, fecha_asignacion: new Date(Date.now() - 2*24*60*60*1000), estado: 'Pendiente', numero_habitacion: '203', piso: 2, empleado_asignado: 'Carlos López' },
        { id: 2, numero: 'TM002', tipo: 'mantenimiento', tipo_tarea: 'Plomería', prioridad: 3, fecha_asignacion: new Date(), estado: 'Pendiente', numero_habitacion: '103', piso: 1, empleado_asignado: null }
      ];

      if (tipo === 'limpieza') {
        return res.json({ success: true, data: { tasks: limpieza, total: limpieza.length } });
      } else if (tipo === 'mantenimiento') {
        return res.json({ success: true, data: { tasks: mantenimiento, total: mantenimiento.length } });
      }

      return res.json({
        success: true,
        data: {
          limpieza,
          mantenimiento,
          total_pendientes: limpieza.length + mantenimiento.length
        }
      });
    }

    let query = '';
    let params = {};

    if (tipo === 'limpieza') {
      query = `
        SELECT tl.id, tl.numero_tarea, tl.tipo_tarea, tl.prioridad, tl.fecha_asignacion, tl.estado,
               h.numero as numero_habitacion, h.piso,
               p.nombres + ' ' + p.apellidos as empleado_asignado
        FROM TareaLimpieza tl
        INNER JOIN Habitacion h ON tl.id_habitacion = h.id
        LEFT JOIN Empleado e ON tl.id_empleado_asignado = e.id
        LEFT JOIN Persona p ON e.id_persona = p.id
        WHERE tl.estado IN ('Pendiente', 'EnProceso') AND tl.activo = 1
        ORDER BY tl.prioridad ASC, tl.fecha_asignacion ASC
      `;
    } else if (tipo === 'mantenimiento') {
      query = `
        SELECT tm.id, tm.numero_ticket, tm.titulo, tm.prioridad, tm.fecha_reportado, tm.estado,
               h.numero as numero_habitacion, h.piso,
               cm.nombre as categoria,
               p.nombres + ' ' + p.apellidos as reportado_por
        FROM TicketMantenimiento tm
        INNER JOIN Habitacion h ON tm.id_habitacion = h.id
        INNER JOIN CategoriaMantenimiento cm ON tm.id_categoria = cm.id
        INNER JOIN Empleado e ON tm.id_empleado_reporta = e.id
        INNER JOIN Persona p ON e.id_persona = p.id
        WHERE tm.estado IN ('Pendiente', 'EnProceso') AND tm.activo = 1
        ORDER BY tm.prioridad ASC, tm.fecha_reportado ASC
      `;
    } else {
      // Get both
      const limpieza = await db.query(`
        SELECT tl.id, tl.numero_tarea as numero, 'limpieza' as tipo, tl.tipo_tarea, tl.prioridad, tl.fecha_asignacion, tl.estado,
               h.numero as numero_habitacion, h.piso,
               p.nombres + ' ' + p.apellidos as empleado_asignado
        FROM TareaLimpieza tl
        INNER JOIN Habitacion h ON tl.id_habitacion = h.id
        LEFT JOIN Empleado e ON tl.id_empleado_asignado = e.id
        LEFT JOIN Persona p ON e.id_persona = p.id
        WHERE tl.estado IN ('Pendiente', 'EnProceso') AND tl.activo = 1
      `);

      const mantenimiento = await db.query(`
        SELECT tm.id, tm.numero_ticket as numero, 'mantenimiento' as tipo, tm.titulo as tipo_tarea, tm.prioridad, tm.fecha_reportado as fecha_asignacion, tm.estado,
               h.numero as numero_habitacion, h.piso,
               p.nombres + ' ' + p.apellidos as empleado_asignado
        FROM TicketMantenimiento tm
        INNER JOIN Habitacion h ON tm.id_habitacion = h.id
        LEFT JOIN Empleado e ON tm.id_empleado_asignado = e.id
        LEFT JOIN Persona p ON e.id_persona = p.id
        WHERE tm.estado IN ('Pendiente', 'EnProceso') AND tm.activo = 1
      `);

      return res.json({
        success: true,
        data: {
          limpieza,
          mantenimiento,
          total_pendientes: limpieza.length + mantenimiento.length
        }
      });
    }

    const tasks = await db.query(query, params);

    res.json({
      success: true,
      data: {
        tasks,
        total: tasks.length
      }
    });
  } catch (error) {
    logger.error('Get pending tasks error:', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Error al obtener tareas pendientes',
      error: config.nodeEnv === 'development' ? error.message : undefined
    });
  }
};

module.exports = {
  getRoomStatuses,
  getStatusSummary,
  getDashboard,
  getPendingTasks
};
