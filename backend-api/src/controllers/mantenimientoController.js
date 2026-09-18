const db = require('../config/database');
const config = require('../config/env');
const logger = require('../middlewares/logger');

let demoTickets = [
  { id_ticket: 1, id_habitacion: 6, id_categoria: 1, creado_por: 4, asignado_a: 4, tipo_falla: 'Foco fundido', descripcion: 'El foco del baño no funciona', prioridad: 2, created_at: new Date(Date.now() - 2*24*60*60*1000), estado: 'Pendiente', costo_material: 50 },
  { id_ticket: 2, id_habitacion: 3, id_categoria: 2, creado_por: 2, asignado_a: null, tipo_falla: 'Goteo en lavabo', descripcion: 'El lavabo del baño tiene un goteo constante', prioridad: 3, created_at: new Date(), estado: 'Pendiente', costo_material: null }
];

// Categorías fijas requeridas en PANTALLA 8
const DEMO_CATEGORIAS = [
  { id_categoria: 1, nombre: 'Eléctrico', descripcion: 'Problemas eléctricos', prioridad_default: 2 },
  { id_categoria: 2, nombre: 'Plomería', descripcion: 'Problemas de tuberías y agua', prioridad_default: 2 },
  { id_categoria: 3, nombre: 'Mobiliario', descripcion: 'Reparación de muebles', prioridad_default: 3 },
  { id_categoria: 4, nombre: 'AC', descripcion: 'Sistema de climatización', prioridad_default: 2 },
  { id_categoria: 5, nombre: 'Electrodomésticos', descripcion: 'Aparatos eléctricos de la habitación', prioridad_default: 2 },
  { id_categoria: 6, nombre: 'Cerrajería', descripcion: 'Cerraduras y llaves', prioridad_default: 3 }
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
        numero_habitacion: t.id_habitacion,
        categoria_nombre: (DEMO_CATEGORIAS.find(c => c.id_categoria === t.id_categoria) || {}).nombre || 'Sin categoría'
      }));
      return res.json({ success: true, data: tickets });
    }

    const query = `
      SELECT tm.*,
             h.numero as numero_habitacion, h.piso,
             cm.nombre as categoria_nombre,
             p1.nombres + ' ' + p1.apellidos as reporta_por_nombre,
             p2.nombres + ' ' + p2.apellidos as asignado_a_nombre
      FROM dbo.ticket_mantenimiento tm
      INNER JOIN dbo.habitacion h ON tm.id_habitacion = h.id_habitacion
      INNER JOIN dbo.categoria_mantenimiento cm ON tm.id_categoria = cm.id_categoria
      LEFT JOIN dbo.empleado e1 ON tm.creado_por = e1.id_empleado
      LEFT JOIN dbo.persona p1 ON e1.id_persona = p1.id_persona
      LEFT JOIN dbo.empleado e2 ON tm.asignado_a = e2.id_empleado
      LEFT JOIN dbo.persona p2 ON e2.id_persona = p2.id_persona
      ORDER BY tm.prioridad ASC, tm.created_at DESC
    `;

    const result = await db.query(query);
    if (!result || result.length === 0) {
      logger.warn('No hay tickets en BD - usando tickets demo de respaldo');
      const demo = demoTickets.map(t => ({
        ...t,
        numero_habitacion: t.id_habitacion,
        categoria_nombre: (DEMO_CATEGORIAS.find(c => c.id_categoria === t.id_categoria) || {}).nombre || 'Sin categoría'
      }));
      return res.json({ success: true, data: demo });
    }
    res.json({ success: true, data: result });
  } catch (error) {
    logger.error('Error getting maintenance tickets:', error);
    // Fallback a demo si la query falla
    const demo = demoTickets.map(t => ({
      ...t,
      numero_habitacion: t.id_habitacion,
      categoria_nombre: (DEMO_CATEGORIAS.find(c => c.id_categoria === t.id_categoria) || {}).nombre || 'Sin categoría'
    }));
    res.json({ success: true, data: demo });
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
      const ticket = demoTickets.find(t => t.id_ticket === parseInt(id));
      if (!ticket) {
        return res.status(404).json({ success: false, message: 'Ticket no encontrado' });
      }
      return res.json({ success: true, data: ticket });
    }

    const query = `
      SELECT tm.*,
             h.numero as numero_habitacion, h.piso,
             cm.nombre as categoria_nombre,
             p1.nombres + ' ' + p1.apellidos as reporta_por_nombre,
             p2.nombres + ' ' + p2.apellidos as asignado_a_nombre
      FROM dbo.ticket_mantenimiento tm
      INNER JOIN dbo.habitacion h ON tm.id_habitacion = h.id_habitacion
      INNER JOIN dbo.categoria_mantenimiento cm ON tm.id_categoria = cm.id_categoria
      LEFT JOIN dbo.empleado e1 ON tm.creado_por = e1.id_empleado
      LEFT JOIN dbo.persona p1 ON e1.id_persona = p1.id_persona
      LEFT JOIN dbo.empleado e2 ON tm.asignado_a = e2.id_empleado
      LEFT JOIN dbo.persona p2 ON e2.id_persona = p2.id_persona
      WHERE tm.id_ticket = @id
    `;

    const result = await db.query(query, { id });
    if (!result || result.length === 0) {
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
      const tickets = demoTickets.filter(t => t.estado === status);
      return res.json({ success: true, data: tickets });
    }

    const query = `
      SELECT tm.*, h.numero as numero_habitacion, h.piso
      FROM dbo.ticket_mantenimiento tm
      INNER JOIN dbo.habitacion h ON tm.id_habitacion = h.id_habitacion
      WHERE tm.estado = @status
      ORDER BY tm.prioridad ASC, tm.created_at DESC
    `;

    const result = await db.query(query, { status });
    res.json({ success: true, data: result || [] });
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

    const result = await db.query('SELECT * FROM dbo.categoria_mantenimiento');
    if (!result || result.length === 0) {
      return res.json({ success: true, data: DEMO_CATEGORIAS });
    }
    res.json({ success: true, data: result });
  } catch (error) {
    logger.error('Error getting categories:', error);
    res.json({ success: true, data: DEMO_CATEGORIAS });
  }
};

/**
 * Get maintenance staff list
 */
const getStaff = async (req, res) => {
  try {
    const isDemoMode = !db.isConnected();

    if (isDemoMode) {
      return res.json({ success: true, data: [
        { id_empleado: 1, nombre: 'Juan López', rol: 'Mantenimiento' },
        { id_empleado: 2, nombre: 'Carla Rojas', rol: 'Mantenimiento' },
        { id_empleado: 3, nombre: 'Diego Martínez', rol: 'Mantenimiento' }
      ]});
    }

    const query = `
      SELECT e.id_empleado, p.nombres + ' ' + p.apellidos as nombre, r.nombre as rol
      FROM dbo.empleado e
      INNER JOIN dbo.persona p ON e.id_persona = p.id_persona
      INNER JOIN dbo.rol r ON e.id_rol = r.id_rol
      WHERE UPPER(r.nombre) IN ('MANTENIMIENTO') AND UPPER(e.estado) = 'ACTIVO'
    `;

    const result = await db.query(query);
    res.json({ success: true, data: result || [] });
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
    const { id_habitacion, id_categoria, titulo, descripcion, prioridad, costo_estimado, afecta_habitabilidad } = req.body;
    const creado_por = req.user?.empleado_id || null;
    const isDemoMode = !db.isConnected();

    // Normalizar prioridad a entero, default Media (2)
    const prioridadFinal = parseInt(prioridad) || 2;
    const tipo_falla = titulo || descripcion || 'Reporte de mantenimiento';

    if (isDemoMode) {
      const newId = demoTickets.length + 1;
      const newTicket = {
        id_ticket: newId,
        id_habitacion,
        id_categoria,
        creado_por,
        asignado_a: null,
        tipo_falla,
        descripcion,
        prioridad: prioridadFinal,
        created_at: new Date(),
        estado: 'Pendiente',
        costo_material: costo_estimado || null
      };
      demoTickets.push(newTicket);

      if (prioridadFinal === 4) {
        demoNotificaciones.unshift({
          id: demoNotificaciones.length + 1,
          titulo: '⚠️ Reporte CRÍTICO de mantenimiento',
          mensaje: `Problema CRÍTICO en habitación #${id_habitacion}: ${tipo_falla}`,
          tipo: 'Critical',
          fecha: new Date()
        });
      }

      return res.status(201).json({ success: true, data: newTicket, message: 'Ticket de mantenimiento creado exitosamente' });
    }

    const query = `
      INSERT INTO dbo.ticket_mantenimiento
        (id_habitacion, id_categoria, creado_por, tipo_falla, prioridad, estado, observaciones)
      VALUES
        (@id_habitacion, @id_categoria, @creado_por, @tipo_falla, @prioridad, 'Pendiente', @observaciones);
      SELECT SCOPE_IDENTITY() as id_ticket;
    `;

    const result = await db.query(query, {
      id_habitacion,
      id_categoria,
      creado_por,
      tipo_falla,
      prioridad: prioridadFinal,
      observaciones: descripcion || ''
    });

    const newId = result && result[0] ? result[0].id_ticket : null;

    // Si prioridad CRÍTICA → insertar notificación
    if (prioridadFinal === 4) {
      try {
        await db.query(`
          INSERT INTO dbo.notificacion (id_usuario, titulo, mensaje, tipo)
          VALUES (
            (SELECT TOP 1 id_usuario FROM dbo.usuario WHERE id_empleado = @creado_por),
            @titulo,
            @mensaje,
            'Error'
          )
        `, {
          creado_por: creado_por || 1,
          titulo: 'Reporte CRÍTICO de mantenimiento',
          mensaje: `Problema CRÍTICO reportado: ${tipo_falla}`
        });
      } catch (notifError) {
        logger.error('Error creando notificación CRÍTICA:', notifError);
      }
    }

    res.status(201).json({
      success: true,
      data: { id_ticket: newId },
      message: 'Ticket de mantenimiento creado exitosamente'
    });
  } catch (error) {
    logger.error('Error creating maintenance ticket:', error);
    res.status(500).json({ success: false, message: 'Error al crear ticket de mantenimiento: ' + error.message });
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
          categoria_nombre: (DEMO_CATEGORIAS.find(c => c.id_categoria === t.id_categoria) || {}).nombre || 'Sin categoría'
        }))
        .reverse();
      return res.json({ success: true, data: tickets });
    }

    const query = `
      SELECT tm.*, cm.nombre as categoria_nombre
      FROM dbo.ticket_mantenimiento tm
      LEFT JOIN dbo.categoria_mantenimiento cm ON tm.id_categoria = cm.id_categoria
      WHERE tm.id_habitacion = @id
      ORDER BY tm.created_at DESC
    `;

    const result = await db.query(query, { id: parseInt(id) });
    res.json({ success: true, data: result || [] });
  } catch (error) {
    logger.error('Error getting tickets by habitacion:', error);
    res.json({ success: true, data: [] });
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
      SELECT id_notificacion as id, titulo, mensaje, tipo, created_at as fecha_creacion, leida
      FROM dbo.notificacion
      WHERE tipo = 'Error'
      ORDER BY created_at DESC
    `);
    res.json({ success: true, data: result || [] });
  } catch (error) {
    logger.error('Error getting notifications:', error);
    // No lanzar 500, devolver lista vacía para no romper la UI
    res.json({ success: true, data: [] });
  }
};

/**
 * Update maintenance ticket
 */
const update = async (req, res) => {
  try {
    const { id } = req.params;
    const { id_empleado_asignado, estado, observaciones, materiales, estado_posterior } = req.body;
    const isDemoMode = !db.isConnected();

    const materialesArray = Array.isArray(materiales)
      ? materiales
          .filter(m => m && (m.nombre || m.cantidad))
          .map(m => ({
            nombre: m.nombre || '',
            cantidad: parseInt(m.cantidad) || 1,
            costo_unitario: parseFloat(m.costo_unitario) || 0
          }))
      : [];

    const costoMaterial = materialesArray.length > 0
      ? materialesArray.reduce((sum, m) => sum + (m.cantidad * m.costo_unitario), 0)
      : 0;

    if (isDemoMode) {
      const index = demoTickets.findIndex(t => t.id_ticket === parseInt(id));
      if (index === -1) {
        return res.status(404).json({ success: false, message: 'Ticket no encontrado' });
      }
      if (id_empleado_asignado) demoTickets[index].asignado_a = id_empleado_asignado;
      if (estado) demoTickets[index].estado = estado;
      if (estado === 'EnProceso' && !demoTickets[index].inicio) {
        demoTickets[index].inicio = new Date();
      }
      if (estado === 'Completado') {
        demoTickets[index].fin = new Date();
        if (costoMaterial > 0) demoTickets[index].costo_material = costoMaterial;
      }
      if (observaciones) demoTickets[index].observaciones = observaciones;
      return res.json({ success: true, data: demoTickets[index], message: 'Ticket actualizado exitosamente' });
    }

    let query = '';
    let params = { id };

    if (estado === 'EnProceso') {
      query = `
        UPDATE dbo.ticket_mantenimiento
        SET estado = 'EnProceso', inicio = GETDATE(), observaciones = @observaciones
        WHERE id_ticket = @id
      `;
      params.observaciones = observaciones || '';
    } else if (estado === 'Completado') {
      query = `
        UPDATE dbo.ticket_mantenimiento
        SET estado = 'Completado', fin = GETDATE(),
            costo_material = @costo_material, observaciones = @observaciones
        WHERE id_ticket = @id
      `;
      params.costo_material = costoMaterial;
      params.observaciones = observaciones || '';
    } else if (id_empleado_asignado) {
      query = `
        UPDATE dbo.ticket_mantenimiento
        SET asignado_a = @asignado_a
        WHERE id_ticket = @id
      `;
      params.asignado_a = id_empleado_asignado;
    } else {
      // Solo observaciones
      query = `
        UPDATE dbo.ticket_mantenimiento
        SET observaciones = @observaciones
        WHERE id_ticket = @id
      `;
      params.observaciones = observaciones || '';
    }

    await db.query(query, params);

    // Si se completó → persistir materiales y actualizar estado habitación
    if (estado === 'Completado') {
      // Guardar materiales en dbo.ticket_mantenimiento_mate
      if (materialesArray.length > 0) {
        try {
          await db.query('DELETE FROM dbo.ticket_mantenimiento_mate WHERE id_ticket = @id', { id });
          for (const m of materialesArray) {
            await db.query(`
              INSERT INTO dbo.ticket_mantenimiento_mate (id_ticket, material, cantidad, costo_unitario)
              VALUES (@id, @nombre, @cantidad, @costo_unitario)
            `, { id, nombre: m.nombre, cantidad: m.cantidad, costo_unitario: m.costo_unitario });
          }
        } catch (matError) {
          logger.error('Error guardando materiales:', matError);
        }
      }

      // Actualizar estado de habitación
      try {
        const ticketRow = await db.query('SELECT id_habitacion FROM dbo.ticket_mantenimiento WHERE id_ticket = @id', { id });
        if (ticketRow && ticketRow.length > 0) {
          const idHabitacion = ticketRow[0].id_habitacion;
          const estadoFinal = estado_posterior || 'disponible';
          await db.query(`
            UPDATE dbo.habitacion
            SET id_estado_actual = (SELECT id_estado FROM dbo.estado_habitacion WHERE UPPER(nombre) = UPPER(@estado))
            WHERE id_habitacion = @id_habitacion
          `, { estado: estadoFinal, id_habitacion: idHabitacion });
        }
      } catch (habError) {
        logger.error('Error actualizando estado habitación:', habError);
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
