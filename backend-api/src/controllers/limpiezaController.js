const db = require('../config/database');
const config = require('../config/env');
const logger = require('../middlewares/logger');

let demoTareas = [
  { id: 1, id_habitacion: 4, id_empleado_asignado: 3, numero_tarea: 'TL001', tipo_tarea: 'CheckOut', prioridad: 2, fecha_asignacion: new Date(), estado: 'Pendiente', tiempo_minutos: null, observaciones: '' },
  { id: 2, id_habitacion: 1, id_empleado_asignado: 3, numero_tarea: 'TL002', tipo_tarea: 'Rutinaria', prioridad: 3, fecha_asignacion: new Date(Date.now() - 24*60*60*1000), estado: 'Completada', tiempo_minutos: 25, observaciones: '' },
  { id: 3, id_habitacion: 3, id_empleado_asignado: null, numero_tarea: 'TL003', tipo_tarea: 'Rutinaria', prioridad: 3, fecha_asignacion: new Date(), estado: 'Pendiente', tiempo_minutos: null, observaciones: '' }
];

/**
 * Get all cleaning tasks
 */
const getAll = async (req, res) => {
  try {
    const isDemoMode = !db.isConnected();
    
    if (isDemoMode) {
      const tareas = demoTareas.map(t => ({
        ...t,
        habitacion: { id: t.id_habitacion, numero: t.id_habitacion === 4 ? '201' : t.id_habitacion === 1 ? '101' : '103', piso: Math.ceil(t.id_habitacion / 3) },
        empleado_asignado: t.id_empleado_asignado ? { id: t.id_empleado_asignado, nombre: 'María García' } : null
      }));
      return res.json({ success: true, data: tareas });
    }

    const query = `
      SELECT t.*, h.numero as numero_habitacion, h.piso,
             e.codigo_empleado, p.nombres + ' ' + p.apellidos as nombre_empleado
      FROM TareaLimpieza t
      INNER JOIN Habitacion h ON t.id_habitacion = h.id
      LEFT JOIN Empleado e ON t.id_empleado_asignado = e.id
      LEFT JOIN Persona p ON e.id_persona = p.id
      WHERE t.activo = 1
      ORDER BY t.prioridad ASC, t.fecha_asignacion DESC
    `;
    
    const result = await db.query(query);
    res.json({ success: true, data: result });
  } catch (error) {
    logger.error('Error getting cleaning tasks:', error);
    res.json({ success: false, message: 'Error al obtener tareas de limpieza' });
  }
};

/**
 * Get cleaning task by ID
 */
const getById = async (req, res) => {
  try {
    const { id } = req.params;
    const isDemoMode = !db.isConnected();

    if (isDemoMode) {
      const tarea = demoTareas.find(t => t.id === parseInt(id));
      if (!tarea) {
        return res.status(404).json({ success: false, message: 'Tarea no encontrada' });
      }
      return res.json({
        success: true,
        data: {
          ...tarea,
          habitacion: { id: tarea.id_habitacion, numero: tarea.id_habitacion === 4 ? '201' : tarea.id_habitacion === 1 ? '101' : '103', piso: Math.ceil(tarea.id_habitacion / 3) },
          empleado_asignado: tarea.id_empleado_asignado ? { id: tarea.id_empleado_asignado, nombre: 'María García' } : null
        }
      });
    }

    const query = `
      SELECT t.*, h.numero as numero_habitacion, h.piso,
             e.codigo_empleado, p.nombres + ' ' + p.apellidos as nombre_empleado
      FROM TareaLimpieza t
      INNER JOIN Habitacion h ON t.id_habitacion = h.id
      LEFT JOIN Empleado e ON t.id_empleado_asignado = e.id
      LEFT JOIN Persona p ON e.id_persona = p.id
      WHERE t.id = @id AND t.activo = 1
    `;

    const result = await db.query(query, { id });
    if (result.length === 0) {
      return res.status(404).json({ success: false, message: 'Tarea no encontrada' });
    }
    res.json({ success: true, data: result[0] });
  } catch (error) {
    logger.error('Error getting cleaning task by ID:', error);
    res.status(500).json({ success: false, message: 'Error al obtener tarea de limpieza' });
  }
};

/**
 * Get cleaning tasks by status
 */
const getByStatus = async (req, res) => {
  try {
    const { status } = req.params;
    const isDemoMode = !db.isConnected();
    
    if (isDemoMode) {
      const tareas = demoTareas.filter(t => t.estado === status).map(t => ({
        ...t,
        habitacion: { id: t.id_habitacion, numero: t.id_habitacion === 4 ? '201' : t.id_habitacion === 1 ? '101' : '103', piso: Math.ceil(t.id_habitacion / 3) }
      }));
      return res.json({ success: true, data: tareas });
    }

    const query = `
      SELECT t.*, h.numero as numero_habitacion, h.piso
      FROM TareaLimpieza t
      INNER JOIN Habitacion h ON t.id_habitacion = h.id
      WHERE t.estado = @status AND t.activo = 1
      ORDER BY t.prioridad ASC, t.fecha_asignacion DESC
    `;
    
    const result = await db.query(query, { status });
    res.json({ success: true, data: result });
  } catch (error) {
    logger.error('Error getting cleaning tasks by status:', error);
    res.status(500).json({ success: false, message: 'Error al obtener tareas de limpieza' });
  }
};

/**
 * Get cleaning staff list
 */
const getStaff = async (req, res) => {
  try {
    const isDemoMode = !db.isConnected();

    if (isDemoMode) {
      const staff = [
        { id: 1, nombre: 'María García', rol: 'Limpieza' },
        { id: 2, nombre: 'Carlos Pérez', rol: 'Limpieza' },
        { id: 3, nombre: 'Luisa Fernández', rol: 'Limpieza' }
      ];
      return res.json({ success: true, data: staff });
    }

    const query = `
      SELECT e.id, p.nombres + ' ' + p.apellidos as nombre, r.nombre as rol
      FROM Empleado e
      INNER JOIN Persona p ON e.id_persona = p.id
      INNER JOIN Rol r ON e.id_rol = r.id
      WHERE r.nombre = 'Limpieza' AND e.activo = 1
    `;

    const result = await db.query(query);
    res.json({ success: true, data: result });
  } catch (error) {
    logger.error('Error getting cleaning staff:', error);
    res.status(500).json({ success: false, message: 'Error al obtener personal de limpieza' });
  }
};

/**
 * Create cleaning task
 */
const create = async (req, res) => {
  try {
    const { id_habitacion, id_empleado_asignado, tipo_tarea, prioridad, observaciones } = req.body;
    const id_empleado_encargado = req.user.empleado_id;
    const isDemoMode = !db.isConnected();
    
    if (isDemoMode) {
      const newId = demoTareas.length + 1;
      const numeroTarea = `TL${String(newId).padStart(3, '0')}`;
      const newTarea = {
        id: newId,
        id_habitacion,
        id_empleado_asignado,
        id_empleado_encargado,
        numero_tarea: numeroTarea,
        tipo_tarea: tipo_tarea || 'Rutinaria',
        prioridad: prioridad || 2,
        fecha_asignacion: new Date(),
        estado: 'Pendiente',
        tiempo_minutos: null,
        observaciones: observaciones || ''
      };
      demoTareas.push(newTarea);
      return res.status(201).json({ success: true, data: newTarea, message: 'Tarea de limpieza creada exitosamente' });
    }

    const query = `
      INSERT INTO TareaLimpieza (id_habitacion, id_empleado_asignado, id_empleado_encargado, numero_tarea, tipo_tarea, prioridad, fecha_asignacion, estado, observaciones, activo)
      VALUES (@id_habitacion, @id_empleado_asignado, @id_empleado_encargado, @numero_tarea, @tipo_tarea, @prioridad, GETDATE(), 'Pendiente', @observaciones, 1);
      SELECT SCOPE_IDENTITY() as id;
    `;
    
    const numeroTarea = `TL${Date.now()}`;
    
    const result = await db.query(query, { 
      id_habitacion, 
      id_empleado_asignado: id_empleado_asignado || null,
      id_empleado_encargado,
      numero_tarea: numeroTarea,
      tipo_tarea: tipo_tarea || 'Rutinaria',
      prioridad: prioridad || 2,
      observaciones: observaciones || ''
    });
    
    // Update room state to Limpieza
    await db.query('UPDATE Habitacion SET id_estado = (SELECT id FROM EstadoHabitacion WHERE nombre = "Limpieza") WHERE id = @id', { id: id_habitacion });
    
    res.status(201).json({ 
      success: true, 
      data: { id: result[0].id, numero_tarea: numeroTarea },
      message: 'Tarea de limpieza creada exitosamente' 
    });
  } catch (error) {
    logger.error('Error creating cleaning task:', error);
    res.status(500).json({ success: false, message: 'Error al crear tarea de limpieza' });
  }
};

/**
 * Update cleaning task (start, complete)
 */
const update = async (req, res) => {
  try {
    const { id } = req.params;
    const { estado, tiempo_minutos, observaciones } = req.body;
    const isDemoMode = !db.isConnected();
    
    if (isDemoMode) {
      const index = demoTareas.findIndex(t => t.id === parseInt(id));
      if (index === -1) {
        return res.status(404).json({ success: false, message: 'Tarea no encontrada' });
      }
      
      if (estado) demoTareas[index].estado = estado;
      if (estado === 'EnProceso' && !demoTareas[index].fecha_inicio) {
        demoTareas[index].fecha_inicio = new Date();
      }
      if (estado === 'Completada') {
        demoTareas[index].fecha_fin = new Date();
        demoTareas[index].tiempo_minutos = tiempo_minutos || Math.floor(Math.random() * 30) + 15;
      }
      if (observaciones) demoTareas[index].observaciones = observaciones;
      
      return res.json({ success: true, data: demoTareas[index], message: 'Tarea actualizada exitosamente' });
    }

    let query = '';
    let params = { id };
    
    if (estado === 'EnProceso') {
      query = `
        UPDATE TareaLimpieza 
        SET estado = 'EnProceso', fecha_inicio = GETDATE(), observaciones = @observaciones
        WHERE id = @id
      `;
    } else if (estado === 'Completada') {
      query = `
        UPDATE TareaLimpieza 
        SET estado = 'Completada', fecha_fin = GETDATE(), tiempo_minutos = CASE WHEN fecha_inicio IS NOT NULL THEN DATEDIFF(MINUTE, fecha_inicio, GETDATE()) ELSE 0 END, observaciones = @observaciones
        WHERE id = @id
      `;
    } else {
      query = `
        UPDATE TareaLimpieza 
        SET estado = @estado, observaciones = @observaciones
        WHERE id = @id
      `;
      params.estado = estado;
    }
    
    params.observaciones = observaciones || '';
    
    await db.query(query, params);
    
    // If task is completed, update room state to Disponible
    if (estado === 'Completada') {
      const tarea = await db.query('SELECT id_habitacion FROM TareaLimpieza WHERE id = @id', { id });
      if (tarea.length > 0) {
        await db.query('UPDATE Habitacion SET id_estado = (SELECT id FROM EstadoHabitacion WHERE nombre = "Disponible") WHERE id = @id_habitacion', { id_habitacion: tarea[0].id_habitacion });
      }
    }
    
    res.json({ success: true, message: 'Tarea actualizada exitosamente' });
  } catch (error) {
    logger.error('Error updating cleaning task:', error);
    res.status(500).json({ success: false, message: 'Error al actualizar tarea de limpieza' });
  }
};

/**
 * Assign cleaning task to employee
 */
const assign = async (req, res) => {
  try {
    const { id } = req.params;
    const { id_empleado_asignado } = req.body;
    const isDemoMode = !db.isConnected();
    
    if (isDemoMode) {
      const index = demoTareas.findIndex(t => t.id === parseInt(id));
      if (index === -1) {
        return res.status(404).json({ success: false, message: 'Tarea no encontrada' });
      }
      demoTareas[index].id_empleado_asignado = id_empleado_asignado;
      demoTareas[index].fecha_asignacion = new Date();
      return res.json({ success: true, data: demoTareas[index], message: 'Tarea asignada exitosamente' });
    }

    const query = `
      UPDATE TareaLimpieza 
      SET id_empleado_asignado = @id_empleado_asignado, fecha_asignacion = GETDATE()
      WHERE id = @id
    `;
    
    await db.query(query, { id, id_empleado_asignado });
    res.json({ success: true, message: 'Tarea asignada exitosamente' });
  } catch (error) {
    logger.error('Error assigning cleaning task:', error);
    res.status(500).json({ success: false, message: 'Error al asignar tarea de limpieza' });
  }
};

/**
 * Change task priority (Admin/Recepción)
 */
const changePriority = async (req, res) => {
  try {
    const { id } = req.params;
    const { prioridad } = req.body;
    const isDemoMode = !db.isConnected();

    if (!prioridad || ![1, 2, 3].includes(parseInt(prioridad))) {
      return res.status(400).json({ success: false, message: 'Prioridad inválida. Use 1 (Urgente), 2 (Normal) o 3 (Baja)' });
    }

    if (isDemoMode) {
      const index = demoTareas.findIndex(t => t.id === parseInt(id));
      if (index === -1) {
        return res.status(404).json({ success: false, message: 'Tarea no encontrada' });
      }
      demoTareas[index].prioridad = parseInt(prioridad);
      return res.json({ success: true, data: demoTareas[index], message: 'Prioridad actualizada exitosamente' });
    }

    const query = `
      UPDATE TareaLimpieza 
      SET prioridad = @prioridad
      WHERE id = @id AND activo = 1
    `;

    const result = await db.query(query, { id, prioridad: parseInt(prioridad) });
    if (result.rowsAffected && result.rowsAffected[0] === 0) {
      return res.status(404).json({ success: false, message: 'Tarea no encontrada' });
    }
    res.json({ success: true, message: 'Prioridad actualizada exitosamente' });
  } catch (error) {
    logger.error('Error changing cleaning task priority:', error);
    res.status(500).json({ success: false, message: 'Error al cambiar prioridad de la tarea' });
  }
};

/**
 * Delete (soft) cleaning task (Admin/Recepción)
 */
const remove = async (req, res) => {
  try {
    const { id } = req.params;
    const isDemoMode = !db.isConnected();

    if (isDemoMode) {
      const index = demoTareas.findIndex(t => t.id === parseInt(id));
      if (index === -1) {
        return res.status(404).json({ success: false, message: 'Tarea no encontrada' });
      }
      demoTareas.splice(index, 1);
      return res.json({ success: true, message: 'Tarea eliminada exitosamente' });
    }

    const query = `
      UPDATE TareaLimpieza 
      SET activo = 0
      WHERE id = @id AND activo = 1
    `;

    const result = await db.query(query, { id });
    if (result.rowsAffected && result.rowsAffected[0] === 0) {
      return res.status(404).json({ success: false, message: 'Tarea no encontrada' });
    }
    res.json({ success: true, message: 'Tarea eliminada exitosamente' });
  } catch (error) {
    logger.error('Error deleting cleaning task:', error);
    res.status(500).json({ success: false, message: 'Error al eliminar tarea de limpieza' });
  }
};

module.exports = {
  getAll,
  getById,
  getByStatus,
  getStaff,
  create,
  update,
  assign,
  changePriority,
  remove
};
