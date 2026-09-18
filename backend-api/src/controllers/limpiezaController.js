const db = require('../config/database');
const logger = require('../middlewares/logger');

// Deriva el estado de la tarea a partir de inicio/fin, ya que tarea_limpieza no tiene columna "estado"
const calcularEstado = (inicio, fin) => {
  if (fin) return 'Completada';
  if (inicio) return 'EnProceso';
  return 'Pendiente';
};

const mapRow = (row) => ({
  id: row.id_tarea_limp,
  id_habitacion: row.id_habitacion,
  numero_habitacion: row.numero,
  piso: row.piso,
  asignado_a: row.asignado_a,
  nombre_asignado: row.nombre_asignado || null,
  asignado_por: row.asignado_por,
  nombre_encargado: row.nombre_encargado || null,
  id_turno: row.id_turno,
  prioridad: row.prioridad,
  inicio: row.inicio,
  fin: row.fin,
  observaciones: row.observaciones,
  calificacion: row.calificacion,
  estado: calcularEstado(row.inicio, row.fin),
  created_at: row.created_at
});

const baseQuery = `
  SELECT t.*, h.numero, h.piso,
         pa.nombres + ' ' + pa.apellidos as nombre_asignado,
         pb.nombres + ' ' + pb.apellidos as nombre_encargado
  FROM dbo.tarea_limpieza t
  INNER JOIN dbo.habitacion h ON t.id_habitacion = h.id_habitacion
  LEFT JOIN dbo.empleado ea ON t.asignado_a = ea.id_empleado
  LEFT JOIN dbo.persona pa ON ea.id_persona = pa.id_persona
  LEFT JOIN dbo.empleado eb ON t.asignado_por = eb.id_empleado
  LEFT JOIN dbo.persona pb ON eb.id_persona = pb.id_persona
`;

const getEmpleadoIdFromUser = async (req) => {
  const idUsuario = req.user?.id || req.user?.id_usuario;
  if (!idUsuario) return null;
  const result = await db.query('SELECT id_empleado FROM dbo.usuario WHERE id_usuario = @id', { id: idUsuario });
  return result && result[0] ? result[0].id_empleado : null;
};

const getAll = async (req, res) => {
  try {
    const query = `${baseQuery} ORDER BY t.prioridad ASC, t.created_at DESC`;
    const result = await db.query(query);
    res.json({ success: true, data: (result || []).map(mapRow) });
  } catch (error) {
    logger.error('Error getting cleaning tasks:', error);
    res.status(500).json({ success: false, message: 'Error al obtener tareas de limpieza' });
  }
};

const getById = async (req, res) => {
  try {
    const { id } = req.params;
    const query = `${baseQuery} WHERE t.id_tarea_limp = @id`;
    const result = await db.query(query, { id });
    if (!result || result.length === 0) {
      return res.status(404).json({ success: false, message: 'Tarea no encontrada' });
    }
    res.json({ success: true, data: mapRow(result[0]) });
  } catch (error) {
    logger.error('Error getting cleaning task by ID:', error);
    res.status(500).json({ success: false, message: 'Error al obtener tarea de limpieza' });
  }
};

const getByStatus = async (req, res) => {
  try {
    const { status } = req.params;
    const result = await db.query(baseQuery);
    const filtradas = (result || []).map(mapRow).filter(t => t.estado === status);
    res.json({ success: true, data: filtradas });
  } catch (error) {
    logger.error('Error getting cleaning tasks by status:', error);
    res.status(500).json({ success: false, message: 'Error al obtener tareas de limpieza' });
  }
};

const getStaff = async (req, res) => {
  try {
    const query = `
      SELECT emp.id_empleado, p.nombres + ' ' + p.apellidos as nombre, r.nombre as rol
      FROM dbo.usuario u
      INNER JOIN dbo.rol r ON u.id_rol = r.id_rol
      INNER JOIN dbo.empleado emp ON u.id_empleado = emp.id_empleado
      INNER JOIN dbo.persona p ON emp.id_persona = p.id_persona
      WHERE UPPER(r.nombre) IN ('HOUSEKEEPING', 'LIMPIEZA')
        AND UPPER(emp.estado) = 'ACTIVO'
    `;
    const result = await db.query(query);
    res.json({ success: true, data: result || [] });
  } catch (error) {
    logger.error('Error getting cleaning staff:', error);
    res.status(500).json({ success: false, message: 'Error al obtener personal de limpieza' });
  }
};

const create = async (req, res) => {
  try {
    const { id_habitacion, id_empleado_asignado, prioridad, observaciones, id_turno } = req.body;

    if (!id_habitacion || !prioridad) {
      return res.status(400).json({ success: false, message: 'id_habitacion y prioridad son obligatorios' });
    }

    const idEmpleadoEncargado = await getEmpleadoIdFromUser(req);
    if (!idEmpleadoEncargado) {
      return res.status(400).json({ success: false, message: 'Tu usuario no tiene un empleado vinculado (id_empleado es NULL en dbo.usuario). No se puede crear la tarea.' });
    }

    const idAsignado = id_empleado_asignado || idEmpleadoEncargado;

    const query = `
      INSERT INTO dbo.tarea_limpieza (id_habitacion, asignado_a, asignado_por, id_turno, prioridad, observaciones)
      VALUES (@id_habitacion, @asignado_a, @asignado_por, @id_turno, @prioridad, @observaciones);
      SELECT SCOPE_IDENTITY() as id;
    `;

    const result = await db.query(query, {
      id_habitacion,
      asignado_a: idAsignado,
      asignado_por: idEmpleadoEncargado,
      id_turno: id_turno || null,
      prioridad,
      observaciones: observaciones || ''
    });

    res.status(201).json({
      success: true,
      data: { id: result[0].id },
      message: 'Tarea de limpieza creada exitosamente'
    });
  } catch (error) {
    logger.error('Error creating cleaning task:', error);
    res.status(500).json({ success: false, message: 'Error al crear tarea de limpieza' });
  }
};

const update = async (req, res) => {
  try {
    const { id } = req.params;
    const { accion, observaciones, calificacion } = req.body;

    let query = '';
    const params = { id };

    if (accion === 'iniciar') {
      query = `UPDATE dbo.tarea_limpieza SET inicio = GETDATE(), observaciones = @observaciones WHERE id_tarea_limp = @id`;
      params.observaciones = observaciones || '';
    } else if (accion === 'completar') {
      query = `UPDATE dbo.tarea_limpieza SET fin = GETDATE(), observaciones = @observaciones, calificacion = @calificacion WHERE id_tarea_limp = @id`;
      params.observaciones = observaciones || '';
      params.calificacion = calificacion || null;
    } else {
      query = `UPDATE dbo.tarea_limpieza SET observaciones = @observaciones WHERE id_tarea_limp = @id`;
      params.observaciones = observaciones || '';
    }

    await db.query(query, params);

    if (accion === 'completar') {
      const tarea = await db.query('SELECT id_habitacion FROM dbo.tarea_limpieza WHERE id_tarea_limp = @id', { id });
      if (tarea && tarea.length > 0) {
        await db.query(`
          UPDATE dbo.habitacion
          SET id_estado_actual = (SELECT id_estado FROM dbo.estado_habitacion WHERE UPPER(nombre) = 'DISPONIBLE')
          WHERE id_habitacion = @id_habitacion
        `, { id_habitacion: tarea[0].id_habitacion });
      }
    }

    res.json({ success: true, message: 'Tarea actualizada exitosamente' });
  } catch (error) {
    logger.error('Error updating cleaning task:', error);
    res.status(500).json({ success: false, message: 'Error al actualizar tarea de limpieza' });
  }
};

const assign = async (req, res) => {
  try {
    const { id } = req.params;
    const { id_empleado_asignado } = req.body;

    if (!id_empleado_asignado) {
      return res.status(400).json({ success: false, message: 'id_empleado_asignado es obligatorio' });
    }

    await db.query('UPDATE dbo.tarea_limpieza SET asignado_a = @asignado_a WHERE id_tarea_limp = @id', {
      id,
      asignado_a: id_empleado_asignado
    });

    res.json({ success: true, message: 'Tarea asignada exitosamente' });
  } catch (error) {
    logger.error('Error assigning cleaning task:', error);
    res.status(500).json({ success: false, message: 'Error al asignar tarea de limpieza' });
  }
};

const changePriority = async (req, res) => {
  try {
    const { id } = req.params;
    const { prioridad } = req.body;

    if (!prioridad || !['Urgente', 'Normal', 'Baja'].includes(prioridad)) {
      return res.status(400).json({ success: false, message: "Prioridad inválida. Use 'Urgente', 'Normal' o 'Baja'" });
    }

    await db.query('UPDATE dbo.tarea_limpieza SET prioridad = @prioridad WHERE id_tarea_limp = @id', { id, prioridad });
    res.json({ success: true, message: 'Prioridad actualizada exitosamente' });
  } catch (error) {
    logger.error('Error changing cleaning task priority:', error);
    res.status(500).json({ success: false, message: 'Error al cambiar prioridad de la tarea' });
  }
};

const remove = async (req, res) => {
  try {
    const { id } = req.params;
    await db.query('DELETE FROM dbo.tarea_limpieza WHERE id_tarea_limp = @id', { id });
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

