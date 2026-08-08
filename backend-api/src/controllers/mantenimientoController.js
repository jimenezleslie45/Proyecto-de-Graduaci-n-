const db = require('../config/database');
const config = require('../config/env');
const logger = require('../middlewares/logger');

let demoTickets = [
  { id: 1, id_habitacion: 6, id_categoria: 1, id_empleado_reporta: 4, id_empleado_asignado: 4, numero_ticket: 'TM001', titulo: 'Foco fundido', descripcion: 'El foco del baño no funciona', prioridad: 2, fecha_reportado: new Date(Date.now() - 2*24*60*60*1000), estado: 'Pendiente', costo_estimado: 50, tiempo_minutos: 30 },
  { id: 2, id_habitacion: 3, id_categoria: 2, id_empleado_reporta: 2, id_empleado_asignado: null, numero_ticket: 'TM002', titulo: 'Goteo en lavabo', descripcion: 'El lavabo del baño tiene un goteo constante', prioridad: 3, fecha_reportado: new Date(), estado: 'Pendiente', costo_estimado: null, tiempo_minutos: null }
];

// Categorías fijas requeridas en PANTALLA 8
const DEMO_CATEGORIAS = [
  { id: 1, nombre: 'Eléctrico', descripcion: 'Problemas eléctricos', prioridad_default: 2, tiempo_estimado_minutos: 60 },
  { id: 2, nombre: 'Plomería', descripcion: 'Problemas de tuberías y agua', prioridad_default: 2, tiempo_estimado_minutos: 45 },
  { id: 3, nombre: 'Mobiliario', descripcion: 'Reparación de muebles', prioridad_default: 3, tiempo_estimado_minutos: 30 },
  { id: 4, nombre: 'AC', descripcion: 'Sistema de climatización', prioridad_default: 2, tiempo_estimado_minutos: 90 },
  { id: 5, nombre: 'Electrodomésticos', descripcion: 'Aparatos eléctricos de la habitación', prioridad_default: 2, tiempo_estimado_minutos: 45 },
  { id: 6, nombre: 'Cerrajería', descripcion: 'Cerraduras y llaves', prioridad_default: 3, tiempo_estimado_minutos: 30 }
];

// Notificaciones demo (CRÍTICA)
let demoNotificaciones = [];

/**
 * Get all maintenance tickets
 */
const getAll = async (req, res) => {
  try {
    const isDemoMode = !db.isConnected();
    
    if (isDemoMode) {
      const tickets = demoTickets.map(t => ({
        ...t,
        habitacion: { id: t.id_habitacion, numero: t.id_habitacion === 6 ? '203' : '103', piso: Math.ceil(t.id_habitacion / 3) },
        categoria: DEMO_CATEGORIAS.find(c => c.id === t.id_categoria)
      }));
      return res.json({ success: true, data: tickets });
}

    const query = `
      SELECT tm.*, h.numero as numero_habitacion, h.piso, cm.nombre as categoria_nombre,
             p1.nombres + ' ' + p1.apellidos as reporta_por,
             p2.nombres + ' ' + p2.apellidos as asignado_a
      FROM TicketMantenimiento tm
      INNER JOIN Habitacion h ON tm.id_habitacion = h.id
      INNER JOIN CategoriaMantenimiento cm ON tm.id_categoria = cm.id
      INNER JOIN Empleado e1 ON tm.id_empleado_reporta = e1.id
      INNER JOIN Persona p1 ON e1.id_persona = p1.id
      LEFT JOIN Empleado e2 ON tm.id_empleado_asignado = e2.id
      LEFT JOIN Persona p2 ON e2.id_persona = p2.id
      WHERE tm.activo = 1
      ORDER BY tm.prioridad ASC, tm.fecha_reportado DESC
    `;
    
    const result = await db.query(query);
    // Si la consulta devuelve vacío (BD sin datos), usar tickets demo para que la pantalla muestre contenido
    if (!result || result.length === 0) {
      logger.warn('No hay tickets en BD - usando tickets demo de respaldo');
      const demo = demoTickets.map(t => ({
        ...t,
        habitacion: { id: t.id_habitacion, numero: t.id_habitacion === 6 ? '203' : '103', piso: Math.ceil(t.id_habitacion / 3) },
        categoria: DEMO_CATEGORIAS.find(c => c.id === t.id_categoria)
      }));
      return res.json({ success: true, data: demo });
    }
    res.json({ success: true, data: result });
  } catch (error) {
    logger.error('Error getting maintenance tickets:', error);
    res.status(500).json({ success: false, message: 'Error al obtener tickets de mantenimiento' });
  }
};

/**
 * Get maintenance ticket by ID
 */
const getById = async (req, res) => {
  try {
    const { id } = req.params;
    const isDemoMode = !db.isConnected();

    if (isDemoMode) {
      const ticket = demoTickets.find(t => t.id === parseInt(id));
      if (!ticket) {
        return res.status(404).json({ success: false, message: 'Ticket no encontrado' });
      }
      return res.json({
        success: true,
        data: {
          ...ticket,
          habitacion: { id: ticket.id_habitacion, numero: ticket.id_habitacion === 6 ? '203' : '103', piso: Math.ceil(ticket.id_habitacion / 3) },
          categoria: DEMO_CATEGORIAS.find(c => c.id === ticket.id_categoria)
        }
      });
    }

    const query = `
      SELECT tm.*, h.numero as numero_habitacion, h.piso, cm.nombre as categoria_nombre,
             p1.nombres + ' ' + p1.apellidos as reporta_por,
             p2.nombres + ' ' + p2.apellidos as asignado_a
      FROM TicketMantenimiento tm
      INNER JOIN Habitacion h ON tm.id_habitacion = h.id
      INNER JOIN CategoriaMantenimiento cm ON tm.id_categoria = cm.id
      INNER JOIN Empleado e1 ON tm.id_empleado_reporta = e1.id
      INNER JOIN Persona p1 ON e1.id_persona = p1.id
      LEFT JOIN Empleado e2 ON tm.id_empleado_asignado = e2.id
      LEFT JOIN Persona p2 ON e2.id_persona = p2.id
      WHERE tm.id = @id AND tm.activo = 1
    `;

    const result = await db.query(query, { id });
    if (result.length === 0) {
      return res.status(404).json({ success: false, message: 'Ticket no encontrado' });
    }
    res.json({ success: true, data: result[0] });
  } catch (error) {
    logger.error('Error getting maintenance ticket by ID:', error);
    res.status(500).json({ success: false, message: 'Error al obtener ticket de mantenimiento' });
  }
};

/**
 * Get maintenance tickets by status
 */
const getByStatus = async (req, res) => {
  try {
    const { status } = req.params;
    const isDemoMode = !db.isConnected();
    
    if (isDemoMode) {
      const tickets = demoTickets.filter(t => t.estado === status).map(t => ({
        ...t,
        habitacion: { id: t.id_habitacion, numero: t.id_habitacion === 6 ? '203' : '103', piso: Math.ceil(t.id_habitacion / 3) }
      }));
      return res.json({ success: true, data: tickets });
    }

    const query = `
      SELECT tm.*, h.numero as numero_habitacion, h.piso
      FROM TicketMantenimiento tm
      INNER JOIN Habitacion h ON tm.id_habitacion = h.id
      WHERE tm.estado = @status AND tm.activo = 1
      ORDER BY tm.prioridad ASC, tm.fecha_reportado DESC
    `;
    
    const result = await db.query(query, { status });
    res.json({ success: true, data: result });
  } catch (error) {
    logger.error('Error getting maintenance tickets by status:', error);
    res.status(500).json({ success: false, message: 'Error al obtener tickets de mantenimiento' });
  }
};

/**
 * Get categories
 */
const getCategories = async (req, res) => {
  try {
    const isDemoMode = !db.isConnected();
    
    if (isDemoMode) {
      return res.json({ success: true, data: DEMO_CATEGORIAS });
    }

    const result = await db.query('SELECT * FROM CategoriaMantenimiento WHERE activo = 1');
    res.json({ success: true, data: result });
  } catch (error) {
    logger.error('Error getting categories:', error);
    res.status(500).json({ success: false, message: 'Error al obtener categorías' });
  }
};

/**
 * Get maintenance staff list
 */
const getStaff = async (req, res) => {
  try {
    const isDemoMode = !db.isConnected();

    if (isDemoMode) {
      const staff = [
        { id: 1, nombre: 'Juan López', rol: 'Mantenimiento' },
        { id: 2, nombre: 'Carla Rojas', rol: 'Mantenimiento' },
        { id: 3, nombre: 'Diego Martínez', rol: 'Mantenimiento' }
      ];
      return res.json({ success: true, data: staff });
    }

    const query = `
      SELECT e.id, p.nombres + ' ' + p.apellidos as nombre, r.nombre as rol
      FROM Empleado e
      INNER JOIN Persona p ON e.id_persona = p.id
      INNER JOIN Rol r ON e.id_rol = r.id
      WHERE r.nombre = 'Mantenimiento' AND e.activo = 1
    `;

    const result = await db.query(query);
    res.json({ success: true, data: result });
  } catch (error) {
    logger.error('Error getting maintenance staff:', error);
    res.status(500).json({ success: false, message: 'Error al obtener personal de mantenimiento' });
  }
};

/**
 * Create maintenance ticket
 */
const create = async (req, res) => {
  try {
    const { id_habitacion, id_categoria, titulo, descripcion, prioridad, costo_estimado, afecta_habitabilidad, fotos } = req.body;
    const id_empleado_reporta = req.user.empleado_id;
    const isDemoMode = !db.isConnected();
    // Normalizar prioridad a entero, default Media (2)
    const prioridadFinal = parseInt(prioridad) || 2;
    // Normalizar afecta_habitabilidad a 0/1
    const afectaHabitabilidad = afecta_habitabilidad ? 1 : 0;
    // Normalizar fotos a array
    const fotosArray = Array.isArray(fotos) ? fotos.slice(0, 3) : [];
    
    if (isDemoMode) {
      const newId = demoTickets.length + 1;
      const numeroTicket = `TM${String(newId).padStart(3, '0')}`;
      const newTicket = {
        id: newId,
        id_habitacion,
        id_categoria,
        id_empleado_reporta,
        id_empleado_asignado: null,
        numero_ticket: numeroTicket,
        titulo,
        descripcion,
        prioridad: prioridadFinal,
        fecha_reportado: new Date(),
        estado: 'ABIERTO',
        costo_estimado,
        tiempo_minutos: null,
        afecta_habitabilidad: afectaHabitabilidad,
        fotos: fotosArray
      };
      demoTickets.push(newTicket);
      
      // Notificación si prioridad = CRÍTICA (4)
      if (prioridadFinal === 4) {
        const notif = {
          id: demoNotificaciones.length + 1,
          titulo: '⚠️ Reporte CRÍTICO de mantenimiento',
          mensaje: `Se reportó un problema CRÍTICO en la habitación #${id_habitacion}: ${titulo || 'sin título'}`,
          tipo: 'Critical',
          fecha: new Date()
        };
        demoNotificaciones.unshift(notif);
        logger.warn('Notificación CRÍTICA generada', notif);
      }
      
      return res.status(201).json({ success: true, data: newTicket, message: 'Ticket de mantenimiento creado exitosamente' });
    }

    const query = `
      INSERT INTO TicketMantenimiento (id_habitacion, id_categoria, id_empleado_reporta, numero_ticket, titulo, descripcion, prioridad, fecha_reportado, estado, costo_estimado, afecta_habitabilidad, activo)
      VALUES (@id_habitacion, @id_categoria, @id_empleado_reporta, @numero_ticket, @titulo, @descripcion, @prioridad, GETDATE(), 'ABIERTO', @costo_estimado, @afecta_habitabilidad, 1);
      SELECT SCOPE_IDENTITY() as id;
    `;
    
    const numeroTicket = `TM${Date.now()}`;
    
    const result = await db.query(query, { 
      id_habitacion, 
      id_categoria,
      id_empleado_reporta,
      numero_ticket: numeroTicket,
      titulo,
      descripcion,
      prioridad: prioridadFinal,
      costo_estimado: costo_estimado || null,
      afecta_habitabilidad: afectaHabitabilidad
    });
    
    // Update room state to Mantenimiento
    await db.query('UPDATE Habitacion SET id_estado = (SELECT id FROM EstadoHabitacion WHERE nombre = "Mantenimiento") WHERE id = @id', { id: id_habitacion });
    
    // Notificación si prioridad = CRÍTICA (4)
    if (prioridadFinal === 4) {
      try {
        await db.query(`
          INSERT INTO Notificacion (id_usuario, titulo, mensaje, tipo, fecha_creacion)
          VALUES (
            (SELECT TOP 1 id_usuario FROM Usuario WHERE id_rol = (SELECT id FROM Rol WHERE nombre = 'Mantenimiento')),
            @titulo,
            @mensaje,
            'Error',
            GETDATE()
          )
        `, {
          titulo: 'Reporte CRÍTICO de mantenimiento',
          mensaje: `Se reportó un problema CRÍTICO en la habitación: ${descripcion || ''}`
        });
        logger.warn('Notificación CRÍTICA creada en BD');
      } catch (notifError) {
        logger.error('Error creando notificación CRÍTICA:', notifError);
      }
    }
    
    res.status(201).json({ 
      success: true, 
      data: { id: result[0].id, numero_ticket: numeroTicket },
      message: 'Ticket de mantenimiento creado exitosamente' 
    });
  } catch (error) {
    logger.error('Error creating maintenance ticket:', error);
    res.status(500).json({ success: false, message: 'Error al crear ticket de mantenimiento' });
  }
};

/**
 * Get maintenance tickets by habitación (historial)
 */
const getByHabitacion = async (req, res) => {
  try {
    const { id } = req.params;
    const isDemoMode = !db.isConnected();
    
    if (isDemoMode) {
      const tickets = demoTickets
        .filter(t => t.id_habitacion === parseInt(id))
        .map(t => ({
          ...t,
          categoria: DEMO_CATEGORIAS.find(c => c.id === t.id_categoria)
        }))
        .reverse();
      return res.json({ success: true, data: tickets });
    }

    const query = `
      SELECT tm.*, cm.nombre as categoria_nombre
      FROM TicketMantenimiento tm
      INNER JOIN CategoriaMantenimiento cm ON tm.id_categoria = cm.id
      WHERE tm.id_habitacion = @id AND tm.activo = 1
      ORDER BY tm.fecha_reportado DESC
    `;
    
    const result = await db.query(query, { id: parseInt(id) });
    res.json({ success: true, data: result });
  } catch (error) {
    logger.error('Error getting tickets by habitacion:', error);
    res.status(500).json({ success: false, message: 'Error al obtener historial de mantenimiento' });
  }
};

/**
 * Get notifications (CRÍTICAS)
 */
const getNotificaciones = async (req, res) => {
  try {
    const isDemoMode = !db.isConnected();
    
    if (isDemoMode) {
      return res.json({ success: true, data: demoNotificaciones });
    }

    const result = await db.query(`
      SELECT id, titulo, mensaje, tipo, fecha_creacion, leida
      FROM Notificacion
      WHERE tipo = 'Error'
      ORDER BY fecha_creacion DESC
    `);
    res.json({ success: true, data: result });
  } catch (error) {
    logger.error('Error getting notifications:', error);
    res.status(500).json({ success: false, message: 'Error al obtener notificaciones' });
  }
};

/**
 * Update maintenance ticket
 */
const update = async (req, res) => {
  try {
    const { id } = req.params;
    const { id_empleado_asignado, estado, tiempo_minutos, costo_real, observaciones, materiales, estado_posterior } = req.body;
    const isDemoMode = !db.isConnected();
    
    // Normalizar materiales recibidos
    const materialesArray = Array.isArray(materiales)
      ? materiales
          .filter(m => m && (m.nombre || m.cantidad))
          .map(m => ({
            nombre: m.nombre || '',
            cantidad: parseInt(m.cantidad) || 1,
            costo_unitario: parseFloat(m.costo_unitario) || 0
          }))
      : [];

    // Calcular costo real = suma de subtotales (Nombre x Costo unitario)
    const costoRealCalculado = materialesArray.length > 0
      ? materialesArray.reduce((sum, m) => sum + (m.cantidad * m.costo_unitario), 0)
      : parseFloat(costo_real) || 0;

    if (isDemoMode) {
      const index = demoTickets.findIndex(t => t.id === parseInt(id));
      if (index === -1) {
        return res.status(404).json({ success: false, message: 'Ticket no encontrado' });
      }
      
      if (id_empleado_asignado) demoTickets[index].id_empleado_asignado = id_empleado_asignado;
      if (estado) demoTickets[index].estado = estado;
      if (estado === 'EnProceso' && !demoTickets[index].fecha_inicio) {
        demoTickets[index].fecha_inicio = new Date();
      }
      if (estado === 'Completado') {
        demoTickets[index].fecha_fin = new Date();
        demoTickets[index].tiempo_minutos = tiempo_minutos || demoTickets[index].tiempo_minutos;
        demoTickets[index].costo_real = costoRealCalculado || demoTickets[index].costo_estimado;
        demoTickets[index].materiales = materialesArray;
        demoTickets[index].estado_posterior = estado_posterior || 'Disponible';
      }
      if (observaciones) demoTickets[index].observaciones = observaciones;
      
      return res.json({ success: true, data: demoTickets[index], message: 'Ticket actualizado exitosamente' });
    }

    let query = '';
    let params = { id };
    
    if (estado === 'EnProceso') {
      query = `
        UPDATE TicketMantenimiento 
        SET estado = 'EnProceso', fecha_inicio = GETDATE(), observaciones = @observaciones
        WHERE id = @id
      `;
    } else if (estado === 'Completado') {
      query = `
        UPDATE TicketMantenimiento 
        SET estado = 'Completado', fecha_fin = GETDATE(), tiempo_minutos = CASE WHEN fecha_inicio IS NOT NULL THEN DATEDIFF(MINUTE, fecha_inicio, GETDATE()) ELSE 0 END, costo_real = @costo_real, observaciones = @observaciones
        WHERE id = @id
      `;
      params.costo_real = costoRealCalculado;
    } else if (id_empleado_asignado) {
      query = `
        UPDATE TicketMantenimiento 
        SET id_empleado_asignado = @id_empleado_asignado, fecha_asignacion = GETDATE()
        WHERE id = @id
      `;
      params.id_empleado_asignado = id_empleado_asignado;
    }
    
    params.observaciones = observaciones || '';
    
    await db.query(query, params);

    // Si el ticket se completó → persistir materiales y aplicar automatización de estado
    if (estado === 'Completado') {
      // 1. Persistir materiales en TicketMaterial
      if (materialesArray.length > 0) {
        // Eliminar materiales previos del ticket (por si se re-completa)
        await db.query('DELETE FROM TicketMaterial WHERE id_ticket = @id', { id });
        for (const m of materialesArray) {
          await db.query(`
            INSERT INTO TicketMaterial (id_ticket, nombre_material, cantidad, costo_unitario, activo, fecha_creacion)
            VALUES (@id, @nombre, @cantidad, @costo_unitario, 1, GETDATE())
          `, {
            id,
            nombre: m.nombre,
            cantidad: m.cantidad,
            costo_unitario: m.costo_unitario
          });
        }
      }

      // 2. Obtener la habitación del ticket
      const ticket = await db.query('SELECT id_habitacion FROM TicketMantenimiento WHERE id = @id', { id });
      if (ticket.length > 0) {
        const idHabitacion = ticket[0].id_habitacion;
        const estadoFinal = estado_posterior || 'Disponible';

        // 3. Actualizar estado de la habitación según estado posterior
        await db.query('UPDATE Habitacion SET id_estado = (SELECT id FROM EstadoHabitacion WHERE nombre = @estado) WHERE id = @id_habitacion', {
          estado: estadoFinal,
          id_habitacion: idHabitacion
        });

        // 4. Si requiere limpieza → crear tarea de limpieza automáticamente
        if (estadoFinal === 'Limpieza') {
          try {
            const automation = require('../services/automationService');
            await automation.createCleaningTask(idHabitacion, null, 'Rutinaria');
            logger.info('Tarea de limpieza creada automáticamente tras mantenimiento', { idHabitacion });
          } catch (autoError) {
            logger.error('Error creando tarea de limpieza automática:', autoError);
          }
        }
      }
    }
    
    res.json({ success: true, message: 'Ticket actualizado exitosamente' });
  } catch (error) {
    logger.error('Error updating maintenance ticket:', error);
    res.status(500).json({ success: false, message: 'Error al actualizar ticket de mantenimiento' });
  }
};

module.exports = {
  getAll,
  getById,
  getByStatus,
  getCategories,
  getStaff,
  create,
  getByHabitacion,
  getNotificaciones,
  update
};
