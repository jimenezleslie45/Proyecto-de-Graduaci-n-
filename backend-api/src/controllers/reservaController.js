const db = require('../config/database');
const logger = require('../middlewares/logger');
const { createEstadiaRecord } = require('./checkinController');

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
    logger.warn(`No se pudieron leer las columnas de ${tableName}: ${error.message}`);
    return [];
  }
};

const normalizeDateOnly = (value) => {
  if (!value) return null;
  const dt = new Date(value);
  if (Number.isNaN(dt.getTime())) return null;
  return dt;
};

const overlaps = (startA, endA, startB, endB) => {
  if (!startA || !endA || !startB || !endB) return false;
  return new Date(startA) < new Date(endB) && new Date(endA) > new Date(startB);
};

const buildReservationPayload = (body, reqUser) => {
  const fechaEntrada = normalizeDateOnly(body.fecha_entrada || body.fechaEntrada);
  const fechaSalida = normalizeDateOnly(body.fecha_salida || body.fechaSalida);

  if (!body.id_habitacion || !body.id_huesped || !fechaEntrada || !fechaSalida) {
    return {
      error: 'Faltan campos obligatorios: id_habitacion, id_huesped, fecha_entrada y fecha_salida'
    };
  }

  const cantidadPersonas = Number(body.cantidad_personas || body.numero_adultos || 1);
  const totalEstimado = Number(body.total_estimado ?? body.precio_total ?? 0);

  return {
    id_habitacion: Number(body.id_habitacion),
    id_huesped: Number(body.id_huesped),
    recepcionista_id: reqUser?.id || reqUser?.id_usuario || reqUser?.userId || null,
    fecha_entrada: fechaEntrada,
    fecha_salida: fechaSalida,
    cantidad_personas: Number.isFinite(cantidadPersonas) ? cantidadPersonas : 1,
    metodo_pago: body.metodo_pago || null,
    monto_adelanto: body.monto_adelanto != null ? Number(body.monto_adelanto) : null,
    total_estimado: Number.isFinite(totalEstimado) ? totalEstimado : 0,
    observaciones: body.observaciones || '',
    estado: 'CONFIRMADA'
  };
};

const getReservaTableMeta = async () => {
  const columns = await getActualColumns('reserva');

  return {
    id: columns.includes('id_reserva') ? 'id_reserva' : 'id',
    habitacion: 'id_habitacion',
    huesped: 'id_huesped',
    recepcionista_id: columns.includes('recepcionista_id') ? 'recepcionista_id' : null,
    fecha_reserva: columns.includes('fecha_reserva') ? 'fecha_reserva' : (columns.includes('fecha_creacion') ? 'fecha_creacion' : 'fecha_creacion'),
    fecha_entrada: columns.includes('fecha_entrada') ? 'fecha_entrada' : 'fecha_entrada',
    fecha_salida: columns.includes('fecha_salida') ? 'fecha_salida' : 'fecha_salida',
    cantidad_personas: columns.includes('cantidad_personas') ? 'cantidad_personas' : 'numero_adultos',
    metodo_pago: columns.includes('metodo_pago') ? 'metodo_pago' : null,
    monto_adelanto: columns.includes('monto_adelanto') ? 'monto_adelanto' : null,
    total_estimado: columns.includes('total_estimado') ? 'total_estimado' : (columns.includes('precio_total') ? 'precio_total' : 'precio_total'),
    estado: 'estado',
    id_estadia_generada: columns.includes('id_estadia_generada') ? 'id_estadia_generada' : null,
    observaciones: 'observaciones',
    created_at: columns.includes('created_at') ? 'created_at' : (columns.includes('fecha_creacion') ? 'fecha_creacion' : 'fecha_creacion'),
    numero_reserva: columns.includes('numero_reserva') ? 'numero_reserva' : null
  };
};

const getEstadiaTableMeta = async () => {
  const columns = await getActualColumns('estadia');

  return {
    id: columns.includes('id_estadia') ? 'id_estadia' : 'id',
    habitacion: 'id_habitacion',
    huesped: 'id_huesped',
    recepcionista_id: columns.includes('recepcionista_id') ? 'recepcionista_id' : 'id_empleado_checkin',
    check_in: columns.includes('check_in') ? 'check_in' : (columns.includes('fecha_checkin') ? 'fecha_checkin' : 'fecha_checkin'),
    check_out: columns.includes('check_out') ? 'check_out' : (columns.includes('fecha_checkout_prevista') ? 'fecha_checkout_prevista' : 'fecha_checkout_prevista'),
    cantidad_personas: columns.includes('cantidad_personas') ? 'cantidad_personas' : 'numero_adultos',
    estado: 'estado',
    total_cargo: columns.includes('total_cargo') ? 'total_cargo' : (columns.includes('precio_total') ? 'precio_total' : 'precio_total'),
    metodo_pago: columns.includes('metodo_pago') ? 'metodo_pago' : null,
    numero_estadia: columns.includes('numero_estadia') ? 'numero_estadia' : null
  };
};

const getActiveRoomConflicts = async (idHabitacion, fechaEntrada, fechaSalida, excludeReservaId = null, excludeEstadiaId = null) => {
  const reservaMeta = await getReservaTableMeta();
  const estadiaMeta = await getEstadiaTableMeta();

  const reservaQuery = `
    SELECT TOP 1 r.*
    FROM dbo.reserva r
    WHERE r.id_habitacion = @id_habitacion
      AND UPPER(COALESCE(r.estado, '')) <> 'CANCELADA'
      AND UPPER(COALESCE(r.estado, '')) <> 'CONVERTIDA'
      ${excludeReservaId ? 'AND r.' + reservaMeta.id + ' <> @excludeReservaId' : ''}
      AND CAST(r.${reservaMeta.fecha_entrada} AS DATE) < CAST(@fecha_salida AS DATE)
      AND CAST(r.${reservaMeta.fecha_salida} AS DATE) > CAST(@fecha_entrada AS DATE)
  `;

  const reservaConflict = await db.query(reservaQuery, {
    id_habitacion: Number(idHabitacion),
    fecha_entrada: fechaEntrada,
    fecha_salida: fechaSalida,
    ...(excludeReservaId ? { excludeReservaId } : {})
  });

  if (reservaConflict && reservaConflict.length > 0) {
    return { type: 'reserva', item: reservaConflict[0] };
  }

  const estadiaQuery = `
    SELECT TOP 1 e.*
    FROM dbo.estadia e
    WHERE e.id_habitacion = @id_habitacion
      AND UPPER(COALESCE(e.estado, '')) = 'ACTIVA'
      ${excludeEstadiaId ? 'AND e.' + estadiaMeta.id + ' <> @excludeEstadiaId' : ''}
      AND CAST(e.${estadiaMeta.check_in} AS DATE) < CAST(@fecha_salida AS DATE)
      AND CAST(COALESCE(e.${estadiaMeta.check_out}, e.${estadiaMeta.check_in}) AS DATE) > CAST(@fecha_entrada AS DATE)
  `;

  const estadiaConflict = await db.query(estadiaQuery, {
    id_habitacion: Number(idHabitacion),
    fecha_entrada: fechaEntrada,
    fecha_salida: fechaSalida,
    ...(excludeEstadiaId ? { excludeEstadiaId } : {})
  });

  if (estadiaConflict && estadiaConflict.length > 0) {
    return { type: 'estadia', item: estadiaConflict[0] };
  }

  return null;
};

const getAll = async (req, res) => {
  try {
    const { estado, fecha_desde, fecha_hasta } = req.query;

    const isDemoMode = !db.isConnected();
    if (isDemoMode) {
      return res.json({
        success: true,
        data: []
      });
    }

    const reservaMeta = await getReservaTableMeta();
    const whereClauses = [];
    const params = {};

    if (estado) {
      whereClauses.push(`UPPER(r.estado) = @estado`);
      params.estado = String(estado).toUpperCase();
    }

    if (fecha_desde) {
      whereClauses.push(`CAST(r.${reservaMeta.fecha_entrada} AS DATE) >= CAST(@fecha_desde AS DATE)`);
      params.fecha_desde = fecha_desde;
    }

    if (fecha_hasta) {
      whereClauses.push(`CAST(r.${reservaMeta.fecha_salida} AS DATE) <= CAST(@fecha_hasta AS DATE)`);
      params.fecha_hasta = fecha_hasta;
    }

    const personaCols = await getActualColumns('persona');
    const docField = personaCols.includes('documento') ? 'p.documento' : (personaCols.includes('numero_documento') ? 'p.numero_documento' : "''");
    const hasTelCol = personaCols.includes('telefono');
    const whereSql = whereClauses.length ? `WHERE ${whereClauses.join(' AND ')}` : '';

    const query = `
      SELECT r.*, h.numero as numero_habitacion, p.nombres, p.apellidos, 
             ${docField} as numero_documento, 
             ${hasTelCol ? 'p.telefono' : 'COALESCE(pt.telefono, \'\')'} as telefono, 
             p.email
      FROM dbo.reserva r
      INNER JOIN dbo.habitacion h ON h.id_habitacion = r.id_habitacion
      INNER JOIN dbo.huesped hu ON hu.id_huesped = r.id_huesped
      INNER JOIN dbo.persona p ON p.id_persona = hu.id_persona
      ${!hasTelCol ? 'LEFT JOIN dbo.persona_telefono pt ON p.id_persona = pt.id_persona AND pt.principal = 1' : ''}
      ${whereSql}
      ORDER BY r.${reservaMeta.fecha_entrada} ASC
    `;

    const result = await db.query(query, params);
    return res.json({ success: true, data: result || [] });
  } catch (error) {
    logger.error('Error al listar reservas:', error);
    return res.status(500).json({ success: false, message: 'Error al listar reservas' });
  }
};

const create = async (req, res) => {
  try {
    const payload = buildReservationPayload(req.body, req.user);
    if (payload.error) {
      return res.status(400).json({ success: false, message: payload.error });
    }

    if (payload.fecha_salida <= payload.fecha_entrada) {
      return res.status(400).json({ success: false, message: 'La fecha de salida debe ser posterior a la fecha de entrada' });
    }

    const conflict = await getActiveRoomConflicts(payload.id_habitacion, payload.fecha_entrada, payload.fecha_salida);
    if (conflict) {
      const label = conflict.type === 'reserva' ? 'una reserva confirmada' : 'una estadía activa';
      return res.status(409).json({
        success: false,
        message: `La habitación ya tiene ${label} en ese rango de fechas.`
      });
    }

    const reservaMeta = await getReservaTableMeta();
    const columns = [];
    const values = [];
    const params = {
      id_habitacion: payload.id_habitacion,
      id_huesped: payload.id_huesped,
      fecha_entrada: payload.fecha_entrada,
      fecha_salida: payload.fecha_salida,
      cantidad_personas: payload.cantidad_personas,
      total_estimado: payload.total_estimado,
      estado: payload.estado,
      observaciones: payload.observaciones,
      fecha_reserva: new Date()
    };

    if (payload.recepcionista_id !== null) {
      if (reservaMeta.recepcionista_id) {
        columns.push(reservaMeta.recepcionista_id);
        values.push('@recepcionista_id');
        params.recepcionista_id = payload.recepcionista_id;
      }
    }

    if (reservaMeta.numero_reserva) {
      columns.push(reservaMeta.numero_reserva);
      values.push('@numero_reserva');
      params.numero_reserva = `R-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Date.now()}`;
    }

    columns.push('id_habitacion', 'id_huesped', reservaMeta.fecha_entrada, reservaMeta.fecha_salida, reservaMeta.cantidad_personas, reservaMeta.total_estimado, reservaMeta.estado, reservaMeta.observaciones);
    values.push('@id_habitacion', '@id_huesped', '@fecha_entrada', '@fecha_salida', '@cantidad_personas', '@total_estimado', '@estado', '@observaciones');

    if (payload.metodo_pago && reservaMeta.metodo_pago) {
      columns.push(reservaMeta.metodo_pago);
      values.push('@metodo_pago');
      params.metodo_pago = payload.metodo_pago;
    }

    if (payload.monto_adelanto !== null && reservaMeta.monto_adelanto) {
      columns.push(reservaMeta.monto_adelanto);
      values.push('@monto_adelanto');
      params.monto_adelanto = payload.monto_adelanto;
    }

    if (reservaMeta.id_estadia_generada) {
      columns.push(reservaMeta.id_estadia_generada);
      values.push('@id_estadia_generada');
      params.id_estadia_generada = null;
    }

    if (reservaMeta.fecha_reserva) {
      columns.push(reservaMeta.fecha_reserva);
      values.push('@fecha_reserva');
      params.fecha_reserva = new Date();
    }

    if (reservaMeta.created_at) {
      columns.push(reservaMeta.created_at);
      values.push('@created_at');
      params.created_at = new Date();
    }

    const query = `
      INSERT INTO dbo.reserva (${columns.join(', ')})
      VALUES (${values.join(', ')});
      SELECT SCOPE_IDENTITY() AS id;
    `;

    const result = await db.query(query, params);
    const idReserva = result && result[0] ? (result[0].id || result[0].id_reserva || result[0].ID) : null;

    return res.status(201).json({
      success: true,
      data: { id: idReserva, ...payload, estado: payload.estado },
      message: 'Reserva creada correctamente'
    });
  } catch (error) {
    logger.error('Error creando reserva:', error);
    return res.status(500).json({ success: false, message: 'Error al crear la reserva' });
  }
};

const convertir = async (req, res) => {
  try {
    const { id } = req.params;
    const reservaMeta = await getReservaTableMeta();
    const estadiaMeta = await getEstadiaTableMeta();

    const reservaQuery = `
      SELECT TOP 1 r.*
      FROM dbo.reserva r
      WHERE r.${reservaMeta.id} = @id
    `;

    const reservas = await db.query(reservaQuery, { id: Number(id) });
    const reserva = reservas && reservas[0];

    if (!reserva) {
      return res.status(404).json({ success: false, message: 'Reserva no encontrada' });
    }

    if (String(reserva.estado || '').toUpperCase() !== 'CONFIRMADA') {
      return res.status(400).json({ success: false, message: 'Solo se pueden convertir reservas en estado CONFIRMADA' });
    }

    const conflict = await getActiveRoomConflicts(
      reserva.id_habitacion,
      reserva[reservaMeta.fecha_entrada],
      reserva[reservaMeta.fecha_salida],
      reserva[reservaMeta.id],
      null
    );

    if (conflict) {
      const label = conflict.type === 'reserva' ? 'otra reserva' : 'una estadía activa';
      return res.status(409).json({ success: false, message: `No se puede convertir la reserva porque ya existe ${label} en el rango.` });
    }

    const checkInDate = reserva[reservaMeta.fecha_entrada];
    const checkOutDate = reserva[reservaMeta.fecha_salida];
    const cantidadPersonas = Number(reserva[reservaMeta.cantidad_personas] || 1);
    const totalCargo = Number(reserva[reservaMeta.total_estimado] || 0);
    const metodoPago = reserva[reservaMeta.metodo_pago] || 'Efectivo';
    const recepcionistaId = req.user?.id || req.user?.id_usuario || req.user?.userId || 1;

    const estadiaResult = await createEstadiaRecord({
      id_habitacion: reserva.id_habitacion,
      id_huesped: reserva.id_huesped,
      fecha_checkout_prevista: checkOutDate,
      numero_adultos: cantidadPersonas,
      numero_ninos: 0,
      precio_noche: totalCargo,
      observaciones: reserva[reservaMeta.observaciones] || '',
      metodo_pago: metodoPago,
      recepcionista_id: recepcionistaId,
      estado: 'ACTIVA'
    });
    const idEstadia = estadiaResult && estadiaResult.id;

    await db.query(`
      UPDATE dbo.reserva
      SET estado = 'CONVERTIDA', id_estadia_generada = @id_estadia
      WHERE ${reservaMeta.id} = @id
    `, {
      id_estadia: idEstadia,
      id: Number(id)
    });

    await db.query(`
      UPDATE dbo.habitacion
      SET id_estado = (SELECT id FROM dbo.estado_habitacion WHERE UPPER(nombre) = 'OCUPADA')
      WHERE id_habitacion = @id_habitacion
    `, { id_habitacion: reserva.id_habitacion });

    return res.status(200).json({
      success: true,
      data: { id_estadia: idEstadia, id_reserva: Number(id), estado: 'CONVERTIDA' },
      message: 'Reserva convertida a estadía correctamente'
    });
  } catch (error) {
    logger.error('Error convirtiendo reserva:', error);
    return res.status(500).json({ success: false, message: 'Error al convertir la reserva a check-in' });
  }
};

const cancelar = async (req, res) => {
  try {
    const { id } = req.params;
    const reservaMeta = await getReservaTableMeta();

    const existing = await db.query(`
      SELECT TOP 1 *
      FROM dbo.reserva
      WHERE ${reservaMeta.id} = @id
    `, { id: Number(id) });

    if (!existing || existing.length === 0) {
      return res.status(404).json({ success: false, message: 'Reserva no encontrada' });
    }

    await db.query(`
      UPDATE dbo.reserva
      SET estado = 'CANCELADA'
      WHERE ${reservaMeta.id} = @id
    `, { id: Number(id) });

    return res.json({
      success: true,
      message: 'Reserva cancelada correctamente'
    });
  } catch (error) {
    logger.error('Error cancelando reserva:', error);
    return res.status(500).json({ success: false, message: 'Error al cancelar la reserva' });
  }
};

module.exports = {
  getAll,
  create,
  convertir,
  cancelar
};
