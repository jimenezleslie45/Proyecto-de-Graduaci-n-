const db = require('../config/database');
const config = require('../config/env');
const logger = require('../middlewares/logger');

// Demo data for rooms
const DEMO_HABITACIONES = [
  { id: 1, numero: '101', piso: 1, id_tipo_habitacion: 1, id_estado: 1, descripcion: 'Habitación individual con vista a la ciudad', tiene_balcon: 0, tiene_vista: 1 },
  { id: 2, numero: '102', piso: 1, id_tipo_habitacion: 2, id_estado: 2, descripcion: 'Habitación doble', tiene_balcon: 0, tiene_vista: 0 },
  { id: 3, numero: '103', piso: 1, id_tipo_habitacion: 3, id_estado: 1, descripcion: 'Habitación twin', tiene_balcon: 1, tiene_vista: 1 },
  { id: 4, numero: '201', piso: 2, id_tipo_habitacion: 4, id_estado: 3, descripcion: 'Suite junior', tiene_balcon: 1, tiene_vista: 1 },
  { id: 5, numero: '202', piso: 2, id_tipo_habitacion: 2, id_estado: 1, descripcion: 'Habitación doble estándar', tiene_balcon: 0, tiene_vista: 0 },
  { id: 6, numero: '203', piso: 2, id_tipo_habitacion: 1, id_estado: 4, descripcion: 'Habitación individual en mantenimiento', tiene_balcon: 0, tiene_vista: 0 },
  { id: 7, numero: '301', piso: 3, id_tipo_habitacion: 5, id_estado: 1, descripcion: 'Suite presidencial', tiene_balcon: 1, tiene_vista: 1 },
  { id: 8, numero: '302', piso: 3, id_tipo_habitacion: 6, id_estado: 2, descripcion: 'Habitación familiar', tiene_balcon: 1, tiene_vista: 1 },
  { id: 9, numero: '303', piso: 3, id_tipo_habitacion: 3, id_estado: 1, descripcion: 'Habitación twin', tiene_balcon: 0, tiene_vista: 0 },
  { id: 10, numero: '304', piso: 3, id_tipo_habitacion: 4, id_estado: 1, descripcion: 'Suite estándar', tiene_balcon: 1, tiene_vista: 1 }
];

const DEMO_TIPOS = [
  { id: 1, nombre: 'Individual', descripcion: 'Habitación para una persona', capacidad: 1, precio_base: 50.00 },
  { id: 2, nombre: 'Doble', descripcion: 'Habitación para dos personas', capacidad: 2, precio_base: 80.00 },
  { id: 3, nombre: 'Twin', descripcion: 'Habitación con dos camas individuales', capacidad: 2, precio_base: 75.00 },
  { id: 4, nombre: 'Suite', descripcion: 'Habitación de lujo con sala', capacidad: 3, precio_base: 150.00 },
  { id: 5, nombre: 'Suite Presidencial', descripcion: 'Habitación de lujo premium', capacidad: 4, precio_base: 300.00 },
  { id: 6, nombre: 'Familiar', descripcion: 'Habitación familiar grande', capacidad: 5, precio_base: 120.00 }
];

const DEMO_ESTADOS = [
  { id: 1, nombre: 'DISPONIBLE', descripcion: 'Habitación lista para check-in', color: '#22c55e' },
  { id: 2, nombre: 'OCUPADA', descripcion: 'Habitación con huésped actualmente', color: '#ef4444' },
  { id: 3, nombre: 'PENDIENTE_LIMPIEZA', descripcion: 'Habitación que necesita limpieza post check-out', color: '#f59e0b' },
  { id: 4, nombre: 'EN_MANTENIMIENTO', descripcion: 'Habitación no disponible por reparaciones', color: '#f97316' },
  { id: 5, nombre: 'SUCIA', descripcion: 'Habitación que requiere limpieza', color: '#a16207' },
  { id: 6, nombre: 'INSPECCION', descripcion: 'Habitación en proceso de inspección', color: '#64748b' }
];

/**
 * Get all rooms
 */
const getAll = async (req, res) => {
  try {
    const isDemoMode = !db.isConnected();
    
    if (isDemoMode) {
      const habitaciones = DEMO_HABITACIONES.map(h => ({
        ...h,
        tipo_habitacion: DEMO_TIPOS.find(t => t.id === h.id_tipo_habitacion),
        estado: DEMO_ESTADOS.find(e => e.id === h.id_estado)
      }));
      return res.json({ success: true, data: habitaciones });
    }

    const query = `
      -- FIX: Consulta adaptada a la base de datos SIGOH
      SELECT h.id_habitacion as id, h.numero, h.piso,
             th.id_tipo as tipo_id, th.nombre as tipo_nombre, th.capacidad, th.tarifa_base as precio_base,
             eh.id_estado as estado_id, eh.nombre as estado_nombre, eh.codigo_color as color, eh.descripcion as estado_descripcion
      FROM habitacion h
      LEFT JOIN tipo_habitacion th ON h.id_tipo = th.id_tipo
      LEFT JOIN estado_habitacion eh ON h.id_estado_actual = eh.id_estado
      ORDER BY h.piso, h.numero
    `;
    const rawResult = await db.query(query);
    // FIX: Normalizar la respuesta de la BD para que coincida con la estructura del modo Demo
    const data = rawResult.map(h => ({
      id: h.id, numero: h.numero, piso: h.piso, descripcion: h.tipo_nombre, tiene_balcon: 0, tiene_vista: 0,
      tipo_habitacion: { id: h.tipo_id, nombre: h.tipo_nombre, descripcion: h.tipo_nombre, capacidad: h.capacidad, precio_base: h.precio_base },
      estado: { id: h.estado_id, nombre: h.estado_nombre, descripcion: h.estado_descripcion, color: h.color }
    }));

    res.json({ success: true, data });
  } catch (error) {
    logger.error('Error getting rooms:', error);
    res.status(500).json({ success: false, message: 'Error al obtener habitaciones' });
  }
};

/**
 * Get room types
 */
const getTypes = async (req, res) => {
  try {
    const isDemoMode = !db.isConnected();
    
    if (isDemoMode) {
      return res.json({ success: true, data: DEMO_TIPOS });
    }

    // FIX: Consulta adaptada a la base de datos SIGOH
    const result = await db.query('SELECT id_tipo as id, nombre, capacidad, tarifa_base FROM tipo_habitacion');
    res.json({ success: true, data: result });
  } catch (error) {
    logger.error('Error getting room types:', error);
    res.status(500).json({ success: false, message: 'Error al obtener tipos de habitación' });
  }
};

/**
 * Get available rooms only
 */
const getAvailableRooms = async (req, res) => {
  try {
    const isDemoMode = !db.isConnected();
    
    if (isDemoMode) {
      const disponibles = DEMO_HABITACIONES
        .filter(h => h.id_estado === 1) // 1 = Disponible
        .map(h => ({
          id: h.id,
          numero: h.numero,
          piso: h.piso,
          id_tipo_habitacion: h.id_tipo_habitacion,
          id_estado: h.id_estado,
          descripcion: h.descripcion,
          tiene_balcon: h.tiene_balcon,
          tiene_vista: h.tiene_vista,
          tipo_habitacion: DEMO_TIPOS.find(t => t.id === h.id_tipo_habitacion),
          estado: DEMO_ESTADOS.find(e => e.id === h.id_estado)
        }));
      return res.json({ success: true, data: disponibles });
    }

    const query = `
      -- FIX: Consulta adaptada a la base de datos SIGOH
      SELECT h.id_habitacion as id, h.numero, h.piso,
             th.id_tipo as tipo_id, th.nombre as tipo_nombre, th.capacidad, th.tarifa_base as precio_base,
             eh.id_estado as estado_id, eh.nombre as estado_nombre, eh.codigo_color as color, eh.descripcion as estado_descripcion
      FROM habitacion h
      LEFT JOIN tipo_habitacion th ON h.id_tipo = th.id_tipo
      LEFT JOIN estado_habitacion eh ON h.id_estado_actual = eh.id_estado
      WHERE eh.permite_checkin = 1
      ORDER BY h.piso, h.numero
    `;
    const rawResult = await db.query(query);
    // FIX: Normalizar la respuesta de la BD para que coincida con la estructura del modo Demo
    const data = rawResult.map(h => ({
      id: h.id, numero: h.numero, piso: h.piso, descripcion: h.tipo_nombre, tiene_balcon: 0, tiene_vista: 0,
      tipo_habitacion: { id: h.tipo_id, nombre: h.tipo_nombre, descripcion: h.tipo_nombre, capacidad: h.capacidad, precio_base: h.precio_base },
      estado: { id: h.estado_id, nombre: h.estado_nombre, descripcion: h.estado_descripcion, color: h.color }
    }));


    res.json({ success: true, data });
  } catch (error) {
    logger.error('Error getting available rooms:', error);
    res.status(500).json({ success: false, message: 'Error al obtener habitaciones disponibles' });
  }
};

/**
 * Get room states
 */
const getStates = async (req, res) => {
  try {
    const isDemoMode = !db.isConnected();
    
    if (isDemoMode) {
      return res.json({ success: true, data: DEMO_ESTADOS });
    }

    // FIX: Consulta adaptada a la base de datos SIGOH
    const result = await db.query('SELECT id_estado as id, nombre, codigo_color as color, descripcion, permite_checkin FROM estado_habitacion');
    res.json({ success: true, data: result });
  } catch (error) {
    logger.error('Error getting room states:', error);
    res.status(500).json({ success: false, message: 'Error al obtener estados de habitación' });
  }
};

/**
 * Get room by ID
 */
const getById = async (req, res) => {
  try {
    const { id } = req.params;
    const isDemoMode = !db.isConnected();
    
    if (isDemoMode) {
      const habitacion = DEMO_HABITACIONES.find(h => h.id === parseInt(id));
      if (!habitacion) {
        return res.status(404).json({ success: false, message: 'Habitación no encontrada' });
      }
      return res.json({ 
        success: true, 
        data: {
          ...habitacion,
          tipo_habitacion: DEMO_TIPOS.find(t => t.id === habitacion.id_tipo_habitacion),
          estado: DEMO_ESTADOS.find(e => e.id === habitacion.id_estado)
        }
      });
    }

    const query = `
      -- FIX: Consulta adaptada a la base de datos SIGOH
      SELECT h.id_habitacion as id, h.numero, h.piso,
             th.id_tipo as tipo_id, th.nombre as tipo_nombre, th.capacidad, th.tarifa_base as precio_base,
             eh.id_estado as estado_id, eh.nombre as estado_nombre, eh.codigo_color as color, eh.descripcion as estado_descripcion
      FROM habitacion h
      LEFT JOIN tipo_habitacion th ON h.id_tipo = th.id_tipo
      LEFT JOIN estado_habitacion eh ON h.id_estado_actual = eh.id_estado
      WHERE h.id_habitacion = @id
    `;
    
    const result = await db.query(query, { id: parseInt(id) });
    
    if (result.length === 0) {
      return res.status(404).json({ success: false, message: 'Habitación no encontrada' });
    }
    const h = result[0];
    // FIX: Normalizar la respuesta de la BD para que coincida con la estructura del modo Demo
    const data = {
      id: h.id, numero: h.numero, piso: h.piso, descripcion: h.tipo_nombre, tiene_balcon: 0, tiene_vista: 0,
      tipo_habitacion: { id: h.tipo_id, nombre: h.tipo_nombre, descripcion: h.tipo_nombre, capacidad: h.capacidad, precio_base: h.precio_base },
      estado: { id: h.estado_id, nombre: h.estado_nombre, descripcion: h.estado_descripcion, color: h.color }
    };
    res.json({ success: true, data });
  } catch (error) {
    logger.error('Error getting room:', error);
    res.status(500).json({ success: false, message: 'Error al obtener habitación' });
  }
};

/**
 * Create new room
 */
const create = async (req, res) => {
  try {
    const { numero, piso, id_tipo, descripcion, tiene_balcon, tiene_vista, id_estado_actual, capacidad, tarifa_base } = req.body;
    const isDemoMode = !db.isConnected();

    // Normalizar valores
    const nuevoNumero = (numero || '').toString().trim();
    const nuevoPiso = parseInt(piso) || 1;
    const nuevoTipo = id_tipo || req.body.id_tipo_habitacion || 1;
    const nuevoEstado = id_estado_actual || req.body.id_estado || 1;
    const nuevaCapacidad = capacidad != null ? parseInt(capacidad) : null;
    const nuevaTarifa = tarifa_base != null ? parseFloat(tarifa_base) : null;

    if (!nuevoNumero) {
      return res.status(400).json({ success: false, message: 'El número de habitación es requerido' });
    }

    if (isDemoMode) {
      // Validación de número único por hotel (demo)
      const duplicado = DEMO_HABITACIONES.find(h => h.numero.toString() === nuevoNumero && h.piso === nuevoPiso);
      if (duplicado) {
        return res.status(400).json({ success: false, message: 'Ya existe una habitación con ese número' });
      }

      const newId = DEMO_HABITACIONES.length + 1;
      const newHabitacion = {
        id: newId,
        numero: nuevoNumero,
        piso: nuevoPiso,
        id_tipo_habitacion: nuevoTipo,
        id_estado: nuevoEstado,
        descripcion,
        tiene_balcon: tiene_balcon || 0,
        tiene_vista: tiene_vista || 0,
        capacidad: nuevaCapacidad,
        precio_base: nuevaTarifa
      };
      DEMO_HABITACIONES.push(newHabitacion);
      return res.status(201).json({ success: true, data: newHabitacion, message: 'Habitación creada exitosamente' });
    }

    // Validación de número único por hotel (BD)
    const checkQuery = 'SELECT COUNT(*) as total FROM habitacion WHERE numero = @numero AND piso = @piso AND id_hotel = 1';
    const checkResult = await db.query(checkQuery, { numero: nuevoNumero, piso: nuevoPiso });
    if (checkResult[0] && checkResult[0].total > 0) {
      return res.status(400).json({ success: false, message: 'Ya existe una habitación con ese número en el hotel' });
    }

    const query = `
      INSERT INTO habitacion (id_hotel, id_tipo, numero, piso, estado_actual, capacidad, tarifa_base)
      VALUES (1, @id_tipo, @numero, @piso, @id_estado_actual, @capacidad, @tarifa_base);
      SELECT SCOPE_IDENTITY() as id;
    `;
    
    const result = await db.query(query, { 
      numero: nuevoNumero, 
      piso: nuevoPiso, 
      id_tipo: nuevoTipo,
      id_estado_actual: nuevoEstado,
      capacidad: nuevaCapacidad,
      tarifa_base: nuevaTarifa
    });
    
    res.status(201).json({ 
      success: true, 
      data: { id: result[0].id, numero: nuevoNumero, piso: nuevoPiso, id_tipo_habitacion: nuevoTipo, id_estado: nuevoEstado, capacidad: nuevaCapacidad, tarifa_base: nuevaTarifa },
      message: 'Habitación creada exitosamente' 
    });
  } catch (error) {
    logger.error('Error creating room:', error);
    res.status(500).json({ success: false, message: 'Error al crear habitación' });
  }
};

/**
 * Update room
 */
const update = async (req, res) => {
  try {
    const { id } = req.params;
    const { numero, piso, id_tipo_habitacion, id_estado_actual, capacidad, tarifa_base } = req.body;
    const isDemoMode = !db.isConnected();

    // Normalizar
    const nuevoNumero = numero != null ? (numero || '').toString().trim() : null;
    const nuevoPiso = piso != null ? parseInt(piso) : null;
    const nuevoTipo = id_tipo_habitacion != null ? parseInt(id_tipo_habitacion) : null;
    const nuevoEstado = id_estado_actual != null ? parseInt(id_estado_actual) : null;
    const nuevaCapacidad = capacidad != null ? parseInt(capacidad) : null;
    const nuevaTarifa = tarifa_base != null ? parseFloat(tarifa_base) : null;

    if (isDemoMode) {
      const index = DEMO_HABITACIONES.findIndex(h => h.id === parseInt(id));
      if (index === -1) {
        return res.status(404).json({ success: false, message: 'Habitación no encontrada' });
      }
      // Validación de número único por hotel (demo)
      if (nuevoNumero) {
        const duplicado = DEMO_HABITACIONES.find(h => h.id !== parseInt(id) && h.numero.toString() === nuevoNumero && h.piso === (nuevoPiso ?? DEMO_HABITACIONES[index].piso));
        if (duplicado) {
          return res.status(400).json({ success: false, message: 'Ya existe una habitación con ese número' });
        }
      }
      if (nuevoNumero) DEMO_HABITACIONES[index].numero = nuevoNumero;
      if (nuevoPiso) DEMO_HABITACIONES[index].piso = nuevoPiso;
      if (nuevoTipo) DEMO_HABITACIONES[index].id_tipo_habitacion = nuevoTipo;
      if (nuevoEstado) DEMO_HABITACIONES[index].id_estado = nuevoEstado;
      if (nuevaCapacidad != null) DEMO_HABITACIONES[index].capacidad = nuevaCapacidad;
      if (nuevaTarifa != null) DEMO_HABITACIONES[index].precio_base = nuevaTarifa;
      return res.json({ success: true, data: DEMO_HABITACIONES[index], message: 'Habitación actualizada exitosamente' });
    }

    // Validación de número único por hotel (BD) - excluyendo el registro actual
    if (nuevoNumero) {
      const checkQuery = 'SELECT COUNT(*) as total FROM habitacion WHERE numero = @numero AND piso = @piso AND id_hotel = 1 AND id_habitacion != @id';
      const checkResult = await db.query(checkQuery, { numero: nuevoNumero, piso: nuevoPiso ?? 0, id: parseInt(id) });
      if (checkResult[0] && checkResult[0].total > 0) {
        return res.status(400).json({ success: false, message: 'Ya existe una habitación con ese número en el hotel' });
      }
    }

    const query = `
      UPDATE habitacion 
      SET numero = @numero, piso = @piso, id_tipo = @id_tipo_habitacion, id_estado_actual = @id_estado_actual,
          capacidad = @capacidad, tarifa_base = @tarifa_base
      WHERE id_habitacion = @id
    `;
    
    await db.query(query, { 
      id: parseInt(id),
      numero: nuevoNumero ?? '', 
      piso: nuevoPiso ?? 0, 
      id_tipo_habitacion: nuevoTipo ?? 0, 
      id_estado_actual: nuevoEstado ?? 0,
      capacidad: nuevaCapacidad,
      tarifa_base: nuevaTarifa
    });
    
    res.json({ success: true, message: 'Habitación actualizada exitosamente' });
  } catch (error) {
    logger.error('Error updating room:', error);
    res.status(500).json({ success: false, message: 'Error al actualizar habitación' });
  }
};

/**
 * Delete room
 */
const remove = async (req, res) => {
  try {
    const { id } = req.params;
    const isDemoMode = !db.isConnected();
    
    if (isDemoMode) {
      const index = DEMO_HABITACIONES.findIndex(h => h.id === parseInt(id));
      if (index === -1) {
        return res.status(404).json({ success: false, message: 'Habitación no encontrada' });
      }
      DEMO_HABITACIONES.splice(index, 1);
      return res.json({ success: true, message: 'Habitación eliminada exitosamente' });
    }

    await db.query('DELETE FROM habitacion WHERE id_habitacion = @id', { id });
    res.json({ success: true, message: 'Habitación eliminada exitosamente' });
  } catch (error) {
    logger.error('Error deleting room:', error);
    res.status(500).json({ success: false, message: 'Error al eliminar habitación' });
  }
};

module.exports = {
  getAll,
  getTypes,
  getAvailableRooms,
  getStates,
  getById,
  create,
  update,
  remove
};
