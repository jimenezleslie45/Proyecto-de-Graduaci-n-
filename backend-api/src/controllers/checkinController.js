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
    // NOTE: SQL Server no permite parámetros (@param) en condiciones de INFORMATION_SCHEMA.
    // El nombre de tabla es un valor interno fijo, por lo que la interpolación directa es segura.
    const safeName = tableName.replace(/[^a-zA-Z0-9_]/g, '');
    const result = await db.query(`
      SELECT COLUMN_NAME
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = 'dbo' AND TABLE_NAME = '${safeName}'
      ORDER BY ORDINAL_POSITION
    `);
    return (result || []).map((row) => String(row.COLUMN_NAME || row.column_name || '').toLowerCase());
  } catch (error) {
    logger.warn(`No se pudieron leer columnas de ${tableName}: ${error.message}`);
    return [];
  }
};

const createEstadiaRecord = async ({
  id_habitacion,
  id_huesped,
  fecha_checkin,
  hora_checkin,
  fecha_checkout_prevista,
  hora_checkout_prevista,
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

  // Fallback: columnas reales de dbo.estadia (confirmadas por diagnóstico)
  const effectiveColumns = columns.length > 0
    ? columns
    : ['id_habitacion', 'id_huesped', 'recepcionista_id', 'check_in', 'check_out',
       'cantidad_personas', 'total_cargo', 'metodo_pago', 'estado'];

  let checkinDateTime = new Date();
  if (fecha_checkin) {
    if (hora_checkin && typeof fecha_checkin === 'string' && !fecha_checkin.includes('T')) {
      checkinDateTime = new Date(`${fecha_checkin}T${hora_checkin}`);
    } else {
      checkinDateTime = new Date(fecha_checkin);
    }
  }

  let checkoutDateTime = new Date(Date.now() + 24 * 60 * 60 * 1000);
  if (fecha_checkout_prevista) {
    if (hora_checkout_prevista && typeof fecha_checkout_prevista === 'string' && !fecha_checkout_prevista.includes('T')) {
      checkoutDateTime = new Date(`${fecha_checkout_prevista}T${hora_checkout_prevista}`);
    } else {
      checkoutDateTime = new Date(fecha_checkout_prevista);
    }
  }

  const payload = {
    id_habitacion: Number(id_habitacion),
    id_huesped: Number(id_huesped),
    fecha_checkin: checkinDateTime,
    fecha_checkout_prevista: checkoutDateTime,
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

  if (effectiveColumns.includes('id_habitacion')) {
    insertColumns.push('id_habitacion');
    insertValues.push('@id_habitacion');
  }
  if (effectiveColumns.includes('id_huesped')) {
    insertColumns.push('id_huesped');
    insertValues.push('@id_huesped');
  }
  // recepcionista_id apunta a usuario.id_usuario (NO a empleado),
  // por lo que se puede pasar directamente req.user.id.
  const recepcionistaColumns = ['recepcionista_id', 'id_empleado_checkin', 'id_recepcionista'];
  const recepcionistaColumn = effectiveColumns.find(c => recepcionistaColumns.includes(c));
  if (recepcionistaColumn && recepcionista_id) {
    insertColumns.push(recepcionistaColumn);
    insertValues.push('@recepcionista_id');
    params.recepcionista_id = Number(recepcionista_id);
  }
  if (effectiveColumns.includes('numero_estadia')) {
    insertColumns.push('numero_estadia');
    insertValues.push('@numero_estadia');
  }
  const checkInColumn = effectiveColumns.includes('check_in') ? 'check_in' : (effectiveColumns.includes('fecha_checkin') ? 'fecha_checkin' : null);
  if (checkInColumn) {
    insertColumns.push(checkInColumn);
    insertValues.push('@check_in');
    params.check_in = checkinDateTime;
  }
  const checkOutColumn = effectiveColumns.includes('check_out') ? 'check_out' : (effectiveColumns.includes('fecha_checkout_prevista') ? 'fecha_checkout_prevista' : (effectiveColumns.includes('fecha_checkout') ? 'fecha_checkout' : null));
  if (checkOutColumn) {
    insertColumns.push(checkOutColumn);
    insertValues.push('@fecha_checkout_prevista');
    params.fecha_checkout_prevista = checkoutDateTime;
  }
  if (effectiveColumns.includes('numero_adultos')) {
    insertColumns.push('numero_adultos');
    insertValues.push('@numero_adultos');
    params.numero_adultos = Number(numero_adultos || 1);
  } else if (effectiveColumns.includes('cantidad_personas')) {
    insertColumns.push('cantidad_personas');
    insertValues.push('@cantidad_personas');
    params.cantidad_personas = payload.cantidad_personas;
  }
  if (effectiveColumns.includes('precio_noche')) {
    insertColumns.push('precio_noche');
    insertValues.push('@precio_noche');
    params.precio_noche = Number(precio_noche || 0);
  } else if (effectiveColumns.includes('total_cargo')) {
    insertColumns.push('total_cargo');
    insertValues.push('@total_cargo');
    params.total_cargo = Number(precio_noche || 0);
  }
  if (effectiveColumns.includes('estado')) {
    insertColumns.push('estado');
    insertValues.push('@estado');
    params.estado = estado;
  }
  if (effectiveColumns.includes('observaciones')) {
    insertColumns.push('observaciones');
    insertValues.push('@observaciones');
    params.observaciones = payload.observaciones;
  }
  const biometricColumn = effectiveColumns.find((column) => ['biometria_verificada', 'verificacion_biometrica'].includes(column));
  if (biometricColumn) {
    insertColumns.push(biometricColumn);
    insertValues.push('@biometria_verificada');
    params.biometria_verificada = payload.biometria_verificada ? 1 : 0;
  }
  const biometricTypeColumn = effectiveColumns.find((column) => ['tipo_verificacion', 'metodo_verificacion', 'tipo_biometria'].includes(column));
  if (biometricTypeColumn) {
    insertColumns.push(biometricTypeColumn);
    insertValues.push('@tipo_verificacion');
    params.tipo_verificacion = payload.tipo_verificacion || 'opcional';
  }
  if (effectiveColumns.includes('metodo_pago')) {
    insertColumns.push('metodo_pago');
    insertValues.push('@metodo_pago');
    params.metodo_pago = metodo_pago || null;
  }
  if (effectiveColumns.includes('activo')) {
    insertColumns.push('activo');
    insertValues.push('@activo');
    params.activo = 1;
  }
  if (effectiveColumns.includes('fecha_creacion')) {
    insertColumns.push('fecha_creacion');
    insertValues.push('@fecha_creacion');
    params.fecha_creacion = new Date();
  }

  if (insertColumns.length === 0) {
    throw new Error('No se encontró una estructura compatible para la tabla estadia');
  }


  let result;
  try {
    const query = `
      INSERT INTO dbo.estadia (${insertColumns.join(', ')})
      OUTPUT INSERTED.id_estadia
      VALUES (${insertValues.join(', ')});
    `;
    result = await db.query(query, params);
  } catch (err) {
    logger.warn(`Error con OUTPUT INSERTED en estadia, intentando SCOPE_IDENTITY: ${err.message}`);
    const fallbackQuery = `
      SET NOCOUNT ON;
      INSERT INTO dbo.estadia (${insertColumns.join(', ')})
      VALUES (${insertValues.join(', ')});
      SELECT SCOPE_IDENTITY() AS id_estadia, SCOPE_IDENTITY() AS id;
    `;
    result = await db.query(fallbackQuery, params);
  }

  const idEstadia = result && result[0] ? (result[0].id_estadia || result[0].id || result[0].ID) : null;
  return { id: idEstadia, id_estadia: idEstadia, numero_estadia: payload.numero_estadia };
};

/**
 * Get all active stays (check-in)
 */
const getActiveStays = async (req, res) => {
  try {
    const isDemoMode = !db.isConnected();
    
    if (isDemoMode) {
      const estadias = demoEstadias.filter(e => e.estado === 'Activa' || e.estado === 'ACTIVA').map(e => {
        const guest = DEMO_HUESPEDES.find(h => h.id === e.id_huesped) || {};
        return {
          id_estadia: e.id,
          id: e.id,
          id_habitacion: e.id_habitacion,
          id_huesped: e.id_huesped,
          check_in: e.fecha_checkin,
          fecha_checkin: e.fecha_checkin,
          check_out: e.fecha_checkout_prevista,
          fecha_checkout_prevista: e.fecha_checkout_prevista,
          precio_noche: e.precio_noche || 80,
          total_cargo: e.total_cargo || (e.precio_noche ? e.precio_noche * 2 : 160),
          metodo_pago: e.metodo_pago || 'Efectivo',
          cantidad_personas: (e.numero_adultos || 1) + (e.numero_ninos || 0),
          estado: 'ACTIVA',
          numero_habitacion: e.id_habitacion === 2 ? '102' : '302',
          piso: e.id_habitacion === 2 ? 1 : 3,
          tipo_habitacion: e.id_habitacion === 2 ? 'Doble' : 'Familiar',
          nombres: guest.nombres || 'Huésped',
          apellidos: guest.apellidos || 'Demo',
          nombre_completo: `${guest.nombres || 'Huésped'} ${guest.apellidos || 'Demo'}`.trim(),
          documento: guest.numero_documento || '1234567',
          numero_documento: guest.numero_documento || '1234567',
          email: guest.email || '',
          telefono: guest.telefono || '',
          habitacion: { id: e.id_habitacion, numero: e.id_habitacion === 2 ? '102' : '302' },
          huesped: guest
        };
      });
      return res.json({ success: true, data: estadias });
    }

    const query = `
      SELECT 
        e.id_estadia,
        e.id_estadia as id,
        e.id_habitacion,
        e.id_huesped,
        e.recepcionista_id,
        e.check_in,
        e.check_in as fecha_checkin,
        e.check_out,
        e.check_out as fecha_checkout_prevista,
        e.total_cargo,
        COALESCE(th.tarifa_base, e.total_cargo) as precio_noche,
        e.metodo_pago,
        e.cantidad_personas,
        e.estado,
        h.numero as numero_habitacion,
        h.piso,
        th.nombre as tipo_habitacion,
        th.tarifa_base,
        p.nombres,
        p.apellidos,
        CONCAT(p.nombres, ' ', p.apellidos) as nombre_completo,
        p.documento,
        p.documento as numero_documento,
        p.email,
        pt.telefono
      FROM estadia e
      INNER JOIN habitacion h ON e.id_habitacion = h.id_habitacion
      LEFT JOIN tipo_habitacion th ON h.id_tipo = th.id_tipo
      INNER JOIN huesped hs ON e.id_huesped = hs.id_huesped
      INNER JOIN persona p ON hs.id_persona = p.id_persona
      LEFT JOIN persona_telefono pt ON p.id_persona = pt.id_persona AND pt.principal = 1
      WHERE e.estado = 'ACTIVA'
      ORDER BY e.check_in DESC
    `;
    
    const result = await db.query(query);
    res.json({ success: true, data: result });
  } catch (error) {
    logger.error('Error getting active stays:', error);
    res.status(500).json({ success: false, message: 'Error al obtener estadías activas' });
  }
};

const getAll = getActiveStays;

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

    let result;
    try {
      const query = `
        -- FIX: Consulta adaptada a la base de datos SIGOH
        SELECT h.id_habitacion as id, h.numero, h.piso, th.nombre as tipo, th.tarifa_base as precio
        FROM habitacion h
        INNER JOIN tipo_habitacion th ON h.id_tipo = th.id_tipo
        INNER JOIN estado_habitacion eh ON h.id_estado_actual = eh.id_estado
        WHERE eh.permite_checkin = 1 AND ISNULL(h.activo, 1) = 1
        ORDER BY th.id_tipo, h.piso, h.numero
      `;
      result = await db.query(query);
    } catch (queryErr) {
      if (queryErr.message && queryErr.message.includes('activo')) {
        const fallbackQuery = `
          SELECT h.id_habitacion as id, h.numero, h.piso, th.nombre as tipo, th.tarifa_base as precio
          FROM habitacion h
          INNER JOIN tipo_habitacion th ON h.id_tipo = th.id_tipo
          INNER JOIN estado_habitacion eh ON h.id_estado_actual = eh.id_estado
          WHERE eh.permite_checkin = 1
          ORDER BY th.id_tipo, h.piso, h.numero
        `;
        result = await db.query(fallbackQuery);
      } else {
        throw queryErr;
      }
    }
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
    // 1. Verificar que id_habitacion provenga correctamente del req.body
    const id_habitacion = req.body.id_habitacion || req.body.habitacion_id;

    if (!id_habitacion) {
      return res.status(400).json({
        success: false,
        message: 'Debe seleccionar una habitación válida para realizar el check-in.'
      });
    }

    const {
      id_huesped,
      fecha_checkin,
      hora_checkin,
      fecha_checkout_prevista,
      hora_checkout_prevista,
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

    let checkinDateTime = new Date();
    if (fecha_checkin) {
      if (hora_checkin && typeof fecha_checkin === 'string' && !fecha_checkin.includes('T')) {
        checkinDateTime = new Date(`${fecha_checkin}T${hora_checkin}`);
      } else {
        checkinDateTime = new Date(fecha_checkin);
      }
    }

    let checkoutDateTime = new Date(Date.now() + 24 * 60 * 60 * 1000);
    if (fecha_checkout_prevista) {
      if (hora_checkout_prevista && typeof fecha_checkout_prevista === 'string' && !fecha_checkout_prevista.includes('T')) {
        checkoutDateTime = new Date(`${fecha_checkout_prevista}T${hora_checkout_prevista}`);
      } else {
        checkoutDateTime = new Date(fecha_checkout_prevista);
      }
    }
    
    if (isDemoMode) {
      const newId = demoEstadias.length + 1;
      const numeroEstadia = `E${String(newId).padStart(3, '0')}`;
      const newEstadia = {
        id: newId,
        id_habitacion,
        id_huesped,
        numero_estadia: numeroEstadia,
        fecha_checkin: checkinDateTime,
        fecha_checkout_prevista: checkoutDateTime,
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
      fecha_checkin,
      hora_checkin,
      fecha_checkout_prevista,
      hora_checkout_prevista,
      numero_adultos,
      numero_ninos,
      precio_noche,
      observaciones,
      metodo_pago,
      recepcionista_id,
      biometria_verificada,
      tipo_verificacion
    });

    // EXTRAER EL ID CORRECTO (id_estadia)
    const idEstadia = result.id_estadia || result.id || (Array.isArray(result) ? result[0]?.id_estadia : null);

    if (!idEstadia) {
      throw new Error("No se pudo obtener el ID de la estadía creada.");
    }

    const numeroEstadia = `E${String(idEstadia).padStart(4, '0')}`;
    
    // Actualizar estado de habitación a Ocupada (no es fatal si falla)
    try {
      // Intentar encontrar el estado con variantes del nombre
      const estadoResult = await db.query(`
        SELECT TOP 1 id_estado FROM estado_habitacion 
        WHERE nombre IN ('OCUPADA', 'Ocupada', 'OCUPADO', 'Ocupado', 'OCCUPIED')
      `);
      if (estadoResult && estadoResult[0]) {
        await db.query(
          `UPDATE habitacion SET id_estado_actual = @id_estado WHERE id_habitacion = @id_habitacion`,
          { id_estado: estadoResult[0].id_estado, id_habitacion }
        );
      } else {
        logger.warn('[checkin] No se encontró estado "Ocupada" en estado_habitacion - se omite el UPDATE');
      }
    } catch (updateErr) {
      logger.warn('[checkin] No se pudo actualizar el estado de habitación:', updateErr.message);
    }
    
    res.status(201).json({ 
      success: true, 
      data: { id: idEstadia, id_estadia: idEstadia, numero_estadia: numeroEstadia },
      message: 'Check-in realizado exitosamente' 
    });
  } catch (error) {
    logger.error('Error creating check-in:', error);
    res.status(500).json({ success: false, message: `Error al realizar check-in: ${error.message}` });
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
  getActiveStays,
  getById,
  getAvailableRooms,
  create,
  searchGuest,
  createEstadiaRecord
};
