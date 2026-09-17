const db = require('../config/database');
const config = require('../config/env');
const logger = require('../middlewares/logger');

// Demo data for check-in
const DEMO_HUESPEDES = [
  { id: 1, numero_huesped: 'H001', id_persona: 1, nombres: 'Pedro', apellidos: 'Gómez', tipo_documento: 'CI', numero_documento: '1234567', telefono: '+591-70123456', email: 'pedro@email.com' },
  { id: 2, numero_huesped: 'H002', id_persona: 2, nombres: 'Ana', apellidos: 'Martínez', tipo_documento: 'CI', numero_documento: '2345678', telefono: '591-71234567', email: 'ana@email.com' },
  { id: 3, numero_huesped: 'H003', id_persona: 3, nombres: 'Luis', apellidos: 'Rodríguez', tipo_documento: 'Pasaporte', numero_documento: 'AB123456', telefono: '+591-72345678', email: 'luis@email.com' }
];

const DEMO_ESTADIAS = [
  { id: 1, id_habitacion: 2, id_huesped: 1, numero_estadia: 'E001', fecha_checkin: new Date(), fecha_checkout_prevista: new Date(Date.now() + 2*24*60*60*1000), numero_adultos: 2, numero_ninos: 0, precio_noche: 80, estado: 'Activa' },
  { id: 2, id_habitacion: 8, id_huesped: 2, numero_estadia: 'E002', fecha_checkin: new Date(Date.now() - 24*60*60*1000), fecha_checkout_prevista: new Date(), numero_adultos: 2, numero_ninos: 1, precio_noche: 120, estado: 'Activa' }
];

let demoEstadias = [...DEMO_ESTADIAS];

const getActualColumns = async (tableName) => {
  try {
    const result = await db.query(`
      SELECT COLUMN_NAME
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = 'dbo' AND TABLE_NAME = @tableName
      ORDER BY ORDINAL_POSITION
    `, { tableName });
    return (result || []).map((row) => String(row.COLUMN_NAME || row.column_name || '').toLowerCase());
  } catch (error) {
    logger.warn(`No se pudieron leer columnas de ${tableName}: ${error.message}`);
    return [];
  }
};

const createEstadiaRecord = async ({
  id_habitacion,
  id_huesped,
  fecha_checkout_prevista,
  numero_adultos,
  numero_ninos,
  precio_noche,
  observaciones,
  metodo_pago,
  recepcionista_id,
  estado = 'ACTIVA',
  biometria_verificada = false,
  tipo_verificacion = null
}) => {
  const columns = await getActualColumns('estadia');

  const payload = {
    id_habitacion: Number(id_habitacion),
    id_huesped: Number(id_huesped),
    fecha_checkout_prevista: fecha_checkout_prevista ? new Date(fecha_checkout_prevista) : new Date(),
    cantidad_personas: Number(numero_adultos || 1) + Number(numero_ninos || 0),
    total_cargo: Number(precio_noche || 0),
    metodo_pago: metodo_pago || null,
    observaciones: observaciones || '',
    estado,
    recepcionista_id: recepcionista_id || null,
    numero_estadia: `E-${Date.now()}`,
    biometria_verificada: Boolean(biometria_verificada),
    tipo_verificacion: tipo_verificacion || null
  };

  const insertColumns = [];
  const insertValues = [];
  const params = { ...payload };

  if (columns.includes('id_habitacion')) {
    insertColumns.push('id_habitacion');
    insertValues.push('@id_habitacion');
  }
  if (columns.includes('id_huesped')) {
    insertColumns.push('id_huesped');
    insertValues.push('@id_huesped');
  }
  if (columns.includes('recepcionista_id')) {
    insertColumns.push('recepcionista_id');
    insertValues.push('@recepcionista_id');
  } else if (columns.includes('id_empleado_checkin')) {
    insertColumns.push('id_empleado_checkin');
    insertValues.push('@id_empleado_checkin');
    params.id_empleado_checkin = payload.recepcionista_id || 1;
  }
  if (columns.includes('numero_estadia')) {
    insertColumns.push('numero_estadia');
    insertValues.push('@numero_estadia');
  }
  const checkInColumn = columns.includes('check_in') ? 'check_in' : (columns.includes('fecha_checkin') ? 'fecha_checkin' : null);
  if (checkInColumn) {
    insertColumns.push(checkInColumn);
    insertValues.push('@check_in');
    params.check_in = new Date();
  }
  const checkOutColumn = columns.includes('check_out') ? 'check_out' : (columns.includes('fecha_checkout_prevista') ? 'fecha_checkout_prevista' : (columns.includes('fecha_checkout') ? 'fecha_checkout' : null));
  if (checkOutColumn) {
    insertColumns.push(checkOutColumn);
    insertValues.push('@fecha_checkout_prevista');
    params.fecha_checkout_prevista = payload.fecha_checkout_prevista;
  }
  if (columns.includes('numero_adultos')) {
    insertColumns.push('numero_adultos');
    insertValues.push('@numero_adultos');
    params.numero_adultos = Number(numero_adultos || 1);
  } else if (columns.includes('cantidad_personas')) {
    insertColumns.push('cantidad_personas');
    insertValues.push('@cantidad_personas');
    params.cantidad_personas = payload.cantidad_personas;
  }
  if (columns.includes('precio_noche')) {
    insertColumns.push('precio_noche');
    insertValues.push('@precio_noche');
    params.precio_noche = Number(precio_noche || 0);
  } else if (columns.includes('total_cargo')) {
    insertColumns.push('total_cargo');
    insertValues.push('@total_cargo');
    params.total_cargo = Number(precio_noche || 0);
  }
  if (columns.includes('estado')) {
    insertColumns.push('estado');
    insertValues.push('@estado');
    params.estado = estado;
  }
  if (columns.includes('observaciones')) {
    insertColumns.push('observaciones');
    insertValues.push('@observaciones');
    params.observaciones = payload.observaciones;
  }
  const biometricColumn = columns.find((column) => ['biometria_verificada', 'verificacion_biometrica'].includes(column));
  if (biometricColumn) {
    insertColumns.push(biometricColumn);
    insertValues.push('@biometria_verificada');
    params.biometria_verificada = payload.biometria_verificada ? 1 : 0;
  }
  const biometricTypeColumn = columns.find((column) => ['tipo_verificacion', 'metodo_verificacion', 'tipo_biometria'].includes(column));
  if (biometricTypeColumn) {
    insertColumns.push(biometricTypeColumn);
    insertValues.push('@tipo_verificacion');
    params.tipo_verificacion = payload.tipo_verificacion || 'opcional';
  }
  if (columns.includes('metodo_pago')) {
    insertColumns.push('metodo_pago');
    insertValues.push('@metodo_pago');
    params.metodo_pago = metodo_pago || null;
  }
  if (columns.includes('activo')) {
    insertColumns.push('activo');
    insertValues.push('@activo');
    params.activo = 1;
  }
  if (columns.includes('fecha_creacion')) {
    insertColumns.push('fecha_creacion');
    insertValues.push('@fecha_creacion');
    params.fecha_creacion = new Date();
  }

  if (insertColumns.length === 0) {
    throw new Error('No se encontró una estructura compatible para la tabla estadia');
  }

  const query = `
    INSERT INTO dbo.estadia (${insertColumns.join(', ')})
    VALUES (${insertValues.join(', ')});
    SELECT SCOPE_IDENTITY() AS id;
  `;

  const result = await db.query(query, params);
  const idEstadia = result && result[0] ? (result[0].id || result[0].id_estadia || result[0].ID) : null;
  return { id: idEstadia, numero_estadia: payload.numero_estadia };
};

/**
 * Get all active stays (check-in)
 */
const getAll = async (req, res) => {
  try {
    const isDemoMode = !db.isConnected();
    
    if (isDemoMode) {
      const estadias = demoEstadias.map(e => ({
        ...e,
        habitacion: { id: e.id_habitacion, numero: e.id_habitacion === 2 ? '102' : '302' },
        huesped: DEMO_HUESPEDES.find(h => h.id === e.id_huesped)
      }));
      return res.json({ success: true, data: estadias });
    }

    const query = `
      -- FIX: Consulta adaptada a la base de datos SIGOH
      SELECT e.*, h.numero as numero_habitacion, p.nombres, p.apellidos, p.documento as numero_documento, pt.telefono, p.email
      FROM estadia e
      INNER JOIN habitacion h ON e.id_habitacion = h.id_habitacion
      INNER JOIN huesped hs ON e.id_huesped = hs.id_huesped
      INNER JOIN persona p ON hs.id_persona = p.id_persona
      LEFT JOIN persona_telefono pt ON p.id_persona = pt.id_persona AND pt.principal = 1
      WHERE e.estado = 'ACTIVA' -- Se usa la columna correcta 'estado'
      ORDER BY e.check_in DESC
    `;
    
    const result = await db.query(query);
    res.json({ success: true, data: result });
  } catch (error) {
    logger.error('Error getting check-ins:', error);
    res.status(500).json({ success: false, message: 'Error al obtener check-ins' });
  }
};

/**
 * Get check-in details by ID
 */
const getById = async (req, res) => {
  try {
    const { id } = req.params;
    const isDemoMode = !db.isConnected();

    if (isDemoMode) {
      const estadia = demoEstadias.find(e => e.id === parseInt(id));
      if (!estadia) {
        return res.status(404).json({ success: false, message: 'Estadía no encontrada' });
      }
      return res.json({
        success: true,
        data: {
          ...estadia,
          habitacion: { id: estadia.id_habitacion, numero: estadia.id_habitacion === 2 ? '102' : '302' },
          huesped: DEMO_HUESPEDES.find(h => h.id === estadia.id_huesped)
        }
      });
    }

    const query = `
      -- FIX: Consulta adaptada a la base de datos SIGOH
      SELECT e.*, h.numero as numero_habitacion, p.nombres, p.apellidos, p.documento as numero_documento, pt.telefono, p.email
      FROM estadia e
      INNER JOIN habitacion h ON e.id_habitacion = h.id_habitacion
      INNER JOIN huesped hs ON e.id_huesped = hs.id_huesped
      INNER JOIN persona p ON hs.id_persona = p.id_persona
      LEFT JOIN persona_telefono pt ON p.id_persona = pt.id_persona AND pt.principal = 1
      WHERE e.id_estadia = @id
    `;

    const result = await db.query(query, { id });
    if (result.length === 0) {
      return res.status(404).json({ success: false, message: 'Estadía no encontrada' });
    }
    res.json({ success: true, data: result[0] });
  } catch (error) {
    logger.error('Error getting check-in details:', error);
    res.status(500).json({ success: false, message: 'Error al obtener detalles del check-in' });
  }
};

/**
 * Get available rooms for check-in
 */
const getAvailableRooms = async (req, res) => {
  try {
    const isDemoMode = !db.isConnected();
    
    if (isDemoMode) {
      const disponibles = [
        { id: 1, numero: '101', piso: 1, tipo: 'Individual', precio: 50 },
        { id: 3, numero: '103', piso: 1, tipo: 'Twin', precio: 75 },
        { id: 5, numero: '202', piso: 2, tipo: 'Doble', precio: 80 },
        { id: 7, numero: '301', piso: 3, tipo: 'Suite Presidencial', precio: 300 },
        { id: 9, numero: '303', piso: 3, tipo: 'Twin', precio: 75 },
        { id: 10, numero: '304', piso: 3, tipo: 'Suite', precio: 150 }
      ];
      return res.json({ success: true, data: disponibles });
    }

    const query = `
      -- FIX: Consulta adaptada a la base de datos SIGOH
      SELECT h.id_habitacion as id, h.numero, h.piso, th.nombre as tipo, th.tarifa_base as precio
      FROM habitacion h
      INNER JOIN tipo_habitacion th ON h.id_tipo = th.id_tipo
      INNER JOIN estado_habitacion eh ON h.id_estado_actual = eh.id_estado
      WHERE eh.permite_checkin = 1
      ORDER BY h.piso, h.numero
    `;
    
    const result = await db.query(query);
    res.json({ success: true, data: result });
  } catch (error) {
    logger.error('Error getting available rooms:', error);
    res.status(500).json({ success: false, message: 'Error al obtener habitaciones disponibles' });
  }
};

/**
 * Create check-in
 */
const create = async (req, res) => {
  try {
    const {
      id_habitacion,
      id_huesped,
      fecha_checkout_prevista,
      numero_adultos,
      numero_ninos,
      precio_noche,
      observaciones,
      metodo_pago,
      biometria_verificada = false,
      tipo_verificacion = null
    } = req.body;
    const recepcionista_id = req.user.id; // El ID del usuario logueado
    const isDemoMode = !db.isConnected();
    
    if (isDemoMode) {
      const newId = demoEstadias.length + 1;
      const numeroEstadia = `E${String(newId).padStart(3, '0')}`;
      const newEstadia = {
        id: newId,
        id_habitacion,
        id_huesped,
        numero_estadia: numeroEstadia,
        fecha_checkin: new Date(),
        fecha_checkout_prevista: new Date(fecha_checkout_prevista),
        numero_adultos: numero_adultos || 1,
        numero_ninos: numero_ninos || 0,
        precio_noche: precio_noche || 50,
        estado: 'Activa',
        observaciones: observaciones || '',
        biometria_verificada: Boolean(biometria_verificada),
        tipo_verificacion: tipo_verificacion || null
      };
      demoEstadias.push(newEstadia);
      return res.status(201).json({ success: true, data: newEstadia, message: 'Check-in realizado exitosamente' });
    }

    const result = await createEstadiaRecord({
      id_habitacion,
      id_huesped,
      fecha_checkout_prevista,
      numero_adultos,
      numero_ninos,
      precio_noche,
      observaciones,
      metodo_pago,
      recepcionista_id,
      biometria_verificada,
      tipo_verificacion
    });

    const idEstadia = result.id;
    const numeroEstadia = `E${String(idEstadia).padStart(4, '0')}`;
    
    // Update room state to Occupied
    await db.query(`
      UPDATE habitacion SET id_estado_actual = (SELECT id_estado FROM estado_habitacion WHERE nombre = 'OCUPADA') 
      WHERE id_habitacion = @id_habitacion`, { id_habitacion });
    
    res.status(201).json({ 
      success: true, 
      data: { id: idEstadia, numero_estadia: numeroEstadia },
      message: 'Check-in realizado exitosamente' 
    });
  } catch (error) {
    logger.error('Error creating check-in:', error);
    res.status(500).json({ success: false, message: 'Error al realizar check-in' });
  }
};

/**
 * Search guest
 */
const searchGuest = async (req, res) => {
  try {
    const { search } = req.query;
    const isDemoMode = !db.isConnected();
    
    if (isDemoMode) {
      const results = DEMO_HUESPEDES.filter(h => 
        h.nombres.toLowerCase().includes(search.toLowerCase()) ||
        h.apellidos.toLowerCase().includes(search.toLowerCase()) ||
        h.numero_documento.includes(search)
      );
      return res.json({ success: true, data: results });
    }

    const query = `
      -- FIX: Consulta adaptada a la base de datos SIGOH
      SELECT h.id_huesped as id, p.nombres, p.apellidos, p.documento as numero_documento, pt.telefono, p.email
      FROM huesped h
      INNER JOIN persona p ON h.id_persona = p.id_persona
      LEFT JOIN persona_telefono pt ON p.id_persona = pt.id_persona AND pt.principal = 1
      WHERE p.nombres LIKE @search OR p.apellidos LIKE @search OR p.documento LIKE @search
    `;
    
    const result = await db.query(query, { search: `%${search}%` });
    res.json({ success: true, data: result });
  } catch (error) {
    logger.error('Error searching guest:', error);
    res.status(500).json({ success: false, message: 'Error al buscar huésped' });
  }
};

module.exports = {
  getAll,
  getById,
  getAvailableRooms,
  create,
  searchGuest,
  createEstadiaRecord
};
