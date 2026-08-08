const db = require('../config/database');
const logger = require('../middlewares/logger');

/**
 * Create cleaning task after check-out
 */
const createCleaningTask = async (idHabitacion, idEmpleadoEncargado, tipoTarea = 'CheckOut') => {
  try {
    // Generate task number
    const numeroTarea = 'TL-' + Date.now();

    // Get default priority
    const prioridad = tipoTarea === 'CheckOut' ? 1 : 2; // Urgent for checkout

    const result = await db.query(`
      INSERT INTO TareaLimpieza (id_habitacion, id_empleado_encargado, numero_tarea, tipo_tarea, 
                                prioridad, fecha_asignacion, estado, activo, fecha_creacion, fecha_actualizacion)
      VALUES (@id_habitacion, @id_empleado_encargado, @numero_tarea, @tipo_tarea,
              @prioridad, GETDATE(), 'Pendiente', 1, GETDATE(), GETDATE());
      SELECT SCOPE_IDENTITY() as id;
    `, {
      id_habitacion: idHabitacion,
      id_empleado_encargado: idEmpleadoEncargado,
      numero_tarea: numeroTarea,
      tipo_tarea: tipoTarea,
      prioridad
    });

    logger.info('Cleaning task created automatically', {
      taskId: result[0].id,
      habitacionId: idHabitacion,
      tipo: tipoTarea
    });

    return result[0].id;
  } catch (error) {
    logger.error('Error creating cleaning task:', { error: error.message });
    throw error;
  }
};

/**
 * Update room status based on task completion
 */
const updateRoomStatus = async (idHabitacion, nuevoEstado) => {
  try {
    const estados = await db.query(`
      SELECT id FROM EstadoHabitacion WHERE nombre = @nombre
    `, { nombre: nuevoEstado });

    if (estados.length === 0) {
      throw new Error(`Estado '${nuevoEstado}' no encontrado`);
    }

    await db.query(`
      UPDATE Habitacion SET id_estado = @id_estado, fecha_actualizacion = GETDATE()
      WHERE id = @id_habitacion
    `, { id_estado: estados[0].id, id_habitacion: idHabitacion });

    logger.info('Room status updated', { habitacionId: idHabitacion, nuevoEstado });
  } catch (error) {
    logger.error('Error updating room status:', { error: error.message });
    throw error;
  }
};

/**
 * Check for overdue tasks and create alerts
 */
const checkOverdueTasks = async () => {
  try {
    const overdueLimpieza = await db.query(`
      SELECT tl.id, tl.numero_tarea, tl.fecha_asignacion, h.numero as numero_habitacion
      FROM TareaLimpieza tl
      INNER JOIN Habitacion h ON tl.id_habitacion = h.id
      WHERE tl.estado IN ('Pendiente', 'EnProceso')
        AND tl.activo = 1
        AND DATEDIFF(MINUTE, tl.fecha_asignacion, GETDATE()) > 120
    `);

    const overdueMantenimiento = await db.query(`
      SELECT tm.id, tm.numero_ticket, tm.fecha_reportado, h.numero as numero_habitacion
      FROM TicketMantenimiento tm
      INNER JOIN Habitacion h ON tm.id_habitacion = h.id
      WHERE tm.estado IN ('Pendiente', 'EnProceso')
        AND tm.activo = 1
        AND DATEDIFF(MINUTE, tm.fecha_reportado, GETDATE()) > 240
    `);

    if (overdueLimpieza.length > 0) {
      logger.warn('Overdue cleaning tasks found', { count: overdueLimpieza.length });
    }

    if (overdueMantenimiento.length > 0) {
      logger.warn('Overdue maintenance tickets found', { count: overdueMantenimiento.length });
    }

    return {
      limpieza: overdueLimpieza,
      mantenimiento: overdueMantenimiento
    };
  } catch (error) {
    logger.error('Error checking overdue tasks:', { error: error.message });
    throw error;
  }
};

module.exports = {
  createCleaningTask,
  updateRoomStatus,
  checkOverdueTasks
};
