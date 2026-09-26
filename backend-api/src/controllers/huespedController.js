const db = require('../config/database');
const config = require('../config/env');
const logger = require('../middlewares/logger');

// Demo data for guests
const DEMO_HUESPEDES = [
  { id: 1, numero_huesped: 'H001', id_persona: 1, nombres: 'Pedro', apellidos: 'Gómez', tipo_documento: 'CI', numero_documento: '1234567', telefono: '+591-70123456', email: 'pedro@email.com' },
  { id: 2, numero_huesped: 'H002', id_persona: 2, nombres: 'Ana', apellidos: 'Martínez', tipo_documento: 'CI', numero_documento: '2345678', telefono: '591-71234567', email: 'ana@email.com' },
  { id: 3, numero_huesped: 'H003', id_persona: 3, nombres: 'Luis', apellidos: 'Rodríguez', tipo_documento: 'Pasaporte', numero_documento: 'AB123456', telefono: '+591-72345678', email: 'luis@email.com' }
];

/**
 * Obtiene las columnas reales de una tabla en la BD.
 * NOTA: SQL Server no permite parámetros en INFORMATION_SCHEMA, se interpola directamente.
 */
const getTableColumns = async (tableName) => {
  try {
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

/**
 * Create a new guest (person + huesped).
 * Lógica upsert: si la persona ya existe por documento, se reutiliza.
 * Si ya es huésped, se devuelve el registro existente sin error.
 */
const create = async (req, res) => {
  try {
    const { nombres, apellidos, tipo_documento, numero_documento, email, telefono } = req.body;
    const isDemoMode = !db.isConnected();

    if (!nombres || !apellidos || !numero_documento) {
      return res.status(400).json({ success: false, message: 'Nombres, apellidos y documento son obligatorios' });
    }

    if (isDemoMode) {
      const newId = DEMO_HUESPEDES.length + 1;
      const newHuesped = {
        id: newId,
        numero_huesped: `H${String(newId).padStart(3, '0')}`,
        id_persona: newId,
        nombres,
        apellidos,
        tipo_documento: tipo_documento || 'CI',
        numero_documento,
        telefono: telefono || '',
        email: email || ''
      };
      DEMO_HUESPEDES.push(newHuesped);
      return res.status(201).json({ success: true, data: newHuesped, message: 'Huésped creado exitosamente' });
    }

    // El documento se guarda como "TIPO NUMERO" en la columna única (ej: "CI 78658823")
    const documentoCompleto = `${tipo_documento || 'CI'} ${numero_documento}`;

    // -------------------------------------------------------
    // 1. Buscar si ya existe una persona con ese documento
    // -------------------------------------------------------
    const existePersonaResult = await db.query(`
      SELECT id_persona FROM dbo.persona WHERE documento = @documento
    `, { documento: documentoCompleto });

    let idPersona = null;

    if (existePersonaResult && existePersonaResult[0]) {
      // La persona ya existe — reutilizar su id
      idPersona = existePersonaResult[0].id_persona;
      logger.info(`[huesped.create] Persona ya existe con id_persona=${idPersona}, reutilizando.`);
    } else {
      // La persona NO existe — crearla
      const personaSQL = `
        INSERT INTO dbo.persona (nombres, apellidos, documento, email)
        VALUES (@nombres, @apellidos, @documento, @email);
        SELECT SCOPE_IDENTITY() as id_persona;
      `;
      logger.info(`[huesped.create] Creando nueva persona con documento: ${documentoCompleto}`);
      const personaResult = await db.query(personaSQL, {
        nombres,
        apellidos,
        documento: documentoCompleto,
        email: email || null
      });
      idPersona = personaResult && personaResult[0] ? personaResult[0].id_persona : null;

      if (!idPersona) {
        throw new Error('No se pudo obtener el ID de la persona insertada');
      }

      // Insertar teléfono en persona_telefono si existe la tabla
      if (telefono) {
        try {
          const telCols = await getTableColumns('persona_telefono');
          if (telCols.includes('id_persona') && telCols.includes('telefono')) {
            const telInsertCols = ['id_persona', 'telefono'];
            const telInsertVals = ['@id_persona_tel', '@telefono'];
            const telParams = { id_persona_tel: idPersona, telefono };

            if (telCols.includes('tipo')) { telInsertCols.push('tipo'); telInsertVals.push('@tipo'); telParams.tipo = 'celular'; }
            if (telCols.includes('principal')) { telInsertCols.push('principal'); telInsertVals.push('@principal'); telParams.principal = 1; }

            await db.query(`
              INSERT INTO dbo.persona_telefono (${telInsertCols.join(', ')})
              VALUES (${telInsertVals.join(', ')});
            `, telParams);
          }
        } catch (telError) {
          logger.warn(`[huesped.create] No se pudo insertar teléfono: ${telError.message}`);
        }
      }
    }

    // -------------------------------------------------------
    // 2. Verificar si ya existe un huesped para esa persona
    // -------------------------------------------------------
    const existeHuespedResult = await db.query(`
      SELECT id_huesped FROM dbo.huesped WHERE id_persona = @id_persona
    `, { id_persona: idPersona });

    let idHuesped = null;

    if (existeHuespedResult && existeHuespedResult[0]) {
      // Ya es huésped — devolver el existente sin error
      idHuesped = existeHuespedResult[0].id_huesped;
      logger.info(`[huesped.create] Huésped ya existe con id_huesped=${idHuesped}, reutilizando.`);
    } else {
      // Crear nuevo registro de huésped
      const huespedSQL = `
        INSERT INTO dbo.huesped (id_persona)
        VALUES (@id_persona_h);
        SELECT SCOPE_IDENTITY() as id_huesped;
      `;
      const huespedResult = await db.query(huespedSQL, { id_persona_h: idPersona });
      idHuesped = huespedResult && huespedResult[0] ? huespedResult[0].id_huesped : null;

      if (!idHuesped) {
        throw new Error('No se pudo obtener el ID del huésped insertado');
      }
    }

    const numeroHuesped = `H${String(idHuesped).padStart(3, '0')}`;

    res.status(201).json({
      success: true,
      data: {
        id: idHuesped,
        id_huesped: idHuesped,
        numero_huesped: numeroHuesped,
        id_persona: idPersona,
        nombres,
        apellidos,
        tipo_documento: tipo_documento || 'CI',
        numero_documento,
        telefono: telefono || '',
        email: email || ''
      },
      message: 'Huésped creado exitosamente'
    });
  } catch (error) {
    logger.error('Error creating guest:', error);
    res.status(500).json({ success: false, message: `Error al crear huésped: ${error.message}` });
  }
};

module.exports = {
  create
};
