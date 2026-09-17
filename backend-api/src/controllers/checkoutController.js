const db = require('../config/database');
const config = require('../config/env');
const logger = require('../middlewares/logger');

let demoEstadias = [
  { id: 1, id_habitacion: 2, id_huesped: 1, numero_estadia: 'E001', fecha_checkin: new Date(), fecha_checkout_prevista: new Date(Date.now() + 2*24*60*60*1000), numero_adultos: 2, numero_ninos: 0, precio_noche: 80, estado: 'Activa' },
  { id: 2, id_habitacion: 8, id_huesped: 2, numero_estadia: 'E002', fecha_checkin: new Date(Date.now() - 24*60*60*1000), fecha_checkout_prevista: new Date(), fecha_checkout: new Date(), numero_adultos: 2, numero_ninos: 1, precio_noche: 120, estado: 'CheckOut' }
];

/**
 * Get all check-outs for today
 */
const getAll = async (req, res) => {
  try {
    const isDemoMode = !db.isConnected();
    
    if (isDemoMode) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const checkouts = demoEstadias.filter(e => {
        const checkoutDate = e.fecha_checkout ? new Date(e.fecha_checkout) : new Date(e.fecha_checkout_prevista);
        checkoutDate.setHours(0, 0, 0, 0);
        return e.estado === 'CheckOut' || checkoutDate.getTime() === today.getTime();
      }).map(e => ({
        ...e,
        habitacion: { id: e.id_habitacion, numero: e.id_habitacion === 2 ? '102' : '302' },
        huesped: { nombres: 'Demo', apellidos: 'Huésped', numero_documento: '1234567' }
      }));
      return res.json({ success: true, data: checkouts });
    }

    const query = `
      -- FIX: Consulta adaptada a la base de datos SIGOH
      SELECT e.*, h.numero as numero_habitacion, p.nombres, p.apellidos, p.documento as numero_documento
      FROM estadia e
      INNER JOIN habitacion h ON e.id_habitacion = h.id_habitacion
      INNER JOIN huesped hs ON e.id_huesped = hs.id_huesped
      INNER JOIN persona p ON hs.id_persona = p.id_persona
      WHERE e.estado = 'CERRADA'
      ORDER BY e.fecha_checkout DESC
    `;
    
    const result = await db.query(query);
    res.json({ success: true, data: result });
  } catch (error) {
    logger.error('Error getting check-outs:', error);
    res.status(500).json({ success: false, message: 'Error al obtener check-outs' });
  }
};

/**
 * Get checkout details
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
          huesped: { nombres: 'Demo', apellidos: 'Huésped', numero_documento: '1234567' }
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
    logger.error('Error getting checkout details:', error);
    res.status(500).json({ success: false, message: 'Error al obtener detalles de check-out' });
  }
};

/**
 * Process check-out
 */
const extenderEstadia = async (req, res) => {
  try {
    const { id } = req.params;
    const { nueva_fecha_check_out } = req.body;

    if (!nueva_fecha_check_out) {
      return res.status(400).json({ success: false, message: 'Se requiere la nueva fecha de salida' });
    }

    const columns = await (async () => {
      try {
        const result = await db.query(`
          SELECT COLUMN_NAME
          FROM INFORMATION_SCHEMA.COLUMNS
          WHERE TABLE_SCHEMA = 'dbo' AND TABLE_NAME = 'estadia'
          ORDER BY ORDINAL_POSITION
        `);
        return (result || []).map((row) => String(row.COLUMN_NAME || row.column_name || '').toLowerCase());
      } catch (error) {
        return [];
      }
    })();

    const actualId = columns.includes('id_estadia') ? 'id_estadia' : 'id';
    const checkInColumn = columns.includes('check_in') ? 'check_in' : (columns.includes('fecha_checkin') ? 'fecha_checkin' : 'fecha_checkin');
    const checkOutColumn = columns.includes('check_out') ? 'check_out' : (columns.includes('fecha_checkout_prevista') ? 'fecha_checkout_prevista' : 'fecha_checkout_prevista');
    const totalCargoColumn = columns.includes('total_cargo') ? 'total_cargo' : (columns.includes('precio_noche') ? 'precio_noche' : 'precio_total');
    const precioNocheColumn = columns.includes('precio_noche') ? 'precio_noche' : (columns.includes('precio_total') ? 'precio_total' : null);

    const estadia = await db.query(`SELECT TOP 1 * FROM dbo.estadia WHERE ${actualId} = @id`, { id: Number(id) });
    if (!estadia || estadia.length === 0) {
      return res.status(404).json({ success: false, message: 'Estadía no encontrada' });
    }

    const currentStays = estadia[0];
    const nuevaFecha = new Date(nueva_fecha_check_out);
    const currentCheckout = currentStays[checkOutColumn] ? new Date(currentStays[checkOutColumn]) : new Date(currentStays[checkInColumn]);

    if (nuevaFecha <= currentCheckout) {
      return res.status(400).json({ success: false, message: 'La nueva fecha de salida debe ser posterior a la actual' });
    }

    const overlapQuery = `
      SELECT TOP 1 e.*
      FROM dbo.estadia e
      WHERE e.id_habitacion = @id_habitacion
        AND e.${actualId} <> @id
        AND UPPER(COALESCE(e.estado, '')) = 'ACTIVA'
        AND CAST(COALESCE(e.${checkOutColumn}, e.${checkInColumn}) AS DATE) > CAST(@nueva_fecha_entrada AS DATE)
        AND CAST(e.${checkInColumn} AS DATE) < CAST(@nueva_fecha_salida AS DATE)
    `;

    const overlap = await db.query(overlapQuery, {
      id_habitacion: currentStays.id_habitacion,
      id: Number(id),
      nueva_fecha_entrada: currentCheckout,
      nueva_fecha_salida: nuevaFecha
    });

    if (overlap && overlap.length > 0) {
      return res.status(409).json({ success: false, message: 'La habitación ya tiene otra estadía o reserva que se traslapa con la nueva fecha de salida.' });
    }

    const additionalDays = Math.max(1, Math.round((nuevaFecha - currentCheckout) / 86400000));
    const precioNoche = Number(currentStays[precioNocheColumn] || currentStays[totalCargoColumn] || 0);
    const newTotal = Number(currentStays[totalCargoColumn] || 0) + (additionalDays * precioNoche);

    await db.query(`
      UPDATE dbo.estadia
      SET ${checkOutColumn} = @nueva_fecha_check_out,
          ${totalCargoColumn} = @nuevo_total
      WHERE ${actualId} = @id
    `, {
      nueva_fecha_check_out: nuevaFecha,
      nuevo_total: newTotal,
      id: Number(id)
    });

    return res.json({
      success: true,
      data: {
        id: Number(id),
        nueva_fecha_check_out: nuevaFecha,
        total_cargo: newTotal,
        dias_adicionales: additionalDays
      },
      message: 'Estadía extendida correctamente'
    });
  } catch (error) {
    logger.error('Error extendiendo estadía:', error);
    return res.status(500).json({ success: false, message: 'Error al extender la estadía' });
  }
};

const checkout = async (req, res) => {
  try {
    const { id } = req.params;
    const { metodo_pago, referencia, observaciones, fecha_salida, hora_salida, cargos_adicionales, total } = req.body;
    const creado_por = req.user.id; // ID del usuario logueado
    const isDemoMode = !db.isConnected();
    
    if (isDemoMode) {
      const index = demoEstadias.findIndex(e => e.id === parseInt(id));
      if (index === -1) {
        return res.status(404).json({ success: false, message: 'Estadía no encontrada' });
      }
      
      demoEstadias[index].estado = 'CheckOut';
      demoEstadias[index].fecha_checkout = new Date(fecha_salida ? `${fecha_salida}T${hora_salida || '12:00'}` : new Date());
      
      return res.json({ 
        success: true, 
        data: demoEstadias[index],
        message: 'Check-out realizado exitosamente' 
      });
    }

    // Build checkout datetime from fecha_salida + hora_salida (or now)
    let fechaCheckout = new Date();
    if (fecha_salida) {
      fechaCheckout = new Date(`${fecha_salida}T${hora_salida || '12:00'}`);
    }

    // Update stay
    const query = `
      -- FIX: Consulta adaptada a la base de datos SIGOH
      UPDATE estadia 
      SET estado = 'CERRADA', check_out = @fecha_checkout
      WHERE id_estadia = @id
    `;
    
    await db.query(query, { id, fecha_checkout: fechaCheckout });
    
    // Get stay info and calculate payment amount
    const estadia = await db.query('SELECT id_estadia, id_habitacion, total_cargo, check_in, id_empleado_checkin FROM estadia WHERE id_estadia = @id', { id });
    if (estadia.length === 0) {
      return res.status(404).json({ success: false, message: 'Estadía no encontrada' });
    }

    // Update room state to Limpieza PENDIENTE (AUTOMATIZACIÓN)
    await db.query(`
      UPDATE habitacion SET id_estado_actual = (SELECT id_estado FROM estado_habitacion WHERE nombre = 'PENDIENTE_LIMPIEZA') 
      WHERE id_habitacion = @id_habitacion`, { id_habitacion: estadia[0].id_habitacion });
    
    // AUTOMATIZACIÓN: Crear tarea de limpieza tipo CheckOut automáticamente
    try {
      const fechaHoy = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      const tareasCount = await db.query('SELECT COUNT(*) as total FROM tarea_limpieza', {});
      const secuencial = (tareasCount[0]?.total || 0) + 1;
      const numeroTarea = `TL-${fechaHoy}-${String(secuencial).padStart(3, '0')}`;

      await db.query(`
        INSERT INTO tarea_limpieza (id_habitacion, id_empleado_encargado, numero_tarea, tipo_tarea, prioridad, fecha_asignacion, estado, observaciones, activo)
        VALUES (@id_habitacion, @id_empleado_encargado, @numero_tarea, 'CheckOut', 2, GETDATE(), 'Pendiente', @observaciones, 1)
      `, {
        id_habitacion: estadia[0].id_habitacion,
        id_empleado_encargado: estadia[0].id_empleado_checkin || creado_por,
        numero_tarea: numeroTarea,
        observaciones: `Limpieza automática generada por check-out. ${observaciones || ''}`.trim()
      });
      logger.info(`Tarea de limpieza ${numeroTarea} creada automáticamente para la habitación ${estadia[0].id_habitacion}`);
    } catch (taskError) {
      logger.warn('No se pudo crear la tarea de limpieza automática:', { error: taskError.message });
    }
    
    // Calcular monto total a pagar: se prioriza el total enviado desde el frontend,
    // de lo contrario se usa el total_cargo de la estadía + cargos adicionales.
    const cargosTotal = Array.isArray(cargos_adicionales)
      ? cargos_adicionales.reduce((sum, c) => sum + (Number(c.cantidad) || 0) * (Number(c.precio_unitario) || 0), 0)
      : 0;
    const montoTotal = total != null
      ? Number(total)
      : Number(estadia[0].total_cargo || 0) + cargosTotal;

    // Create payment record
    const pagoQuery = `
      -- FIX: Consulta adaptada a la base de datos SIGOH
      INSERT INTO pago (id_estadia, monto, metodo_pago, referencia_transaccion, fecha_pago, creado_por, estado)
      VALUES (@id_estadia, @monto, @metodo_pago, @referencia, @fecha_pago, @creado_por, 'PAGADO')
    `;
    
    await db.query(pagoQuery, { 
      id_estadia: id, 
      monto: montoTotal,
      metodo_pago: metodo_pago || 'Efectivo',
      referencia: referencia || '',
      fecha_pago: fechaCheckout,
      creado_por
    });
    
    res.json({ 
      success: true, 
      message: 'Check-out realizado exitosamente. Habitación enviada a limpieza y tarea creada automáticamente.' 
    });
  } catch (error) {
    logger.error('Error processing check-out:', error);
    res.status(500).json({ success: false, message: 'Error al procesar check-out' });
  }
};

module.exports = {
  getAll,
  getById,
  checkout,
  extenderEstadia
};
