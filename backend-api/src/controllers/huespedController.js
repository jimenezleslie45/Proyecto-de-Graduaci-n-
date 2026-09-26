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
 * Create a new guest (person + huesped)
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

    // -------------------------------------------------------
    // 1. Leer columnas reales de dbo.persona
    // -------------------------------------------------------
    const personaCols = await getTableColumns('persona');
    logger.info(`[huesped.create] Columnas de persona: ${personaCols.join(', ')}`);

    // Construir INSERT dinámico para dbo.persona
    const personaInsertCols = [];
    const personaInsertVals = [];
    const personaParams = {};

    // nombres / primer_nombre
    if (personaCols.includes('nombres')) {
      personaInsertCols.push('nombres'); personaInsertVals.push('@nombres');
      personaParams.nombres = nombres;
    } else if (personaCols.includes('primer_nombre')) {
      personaInsertCols.push('primer_nombre'); personaInsertVals.push('@nombres');
      personaParams.nombres = nombres;
    }

    // apellidos / primer_apellido
    if (personaCols.includes('apellidos')) {
      personaInsertCols.push('apellidos'); personaInsertVals.push('@apellidos');
      personaParams.apellidos = apellidos;
    } else if (personaCols.includes('primer_apellido')) {
      personaInsertCols.push('primer_apellido'); personaInsertVals.push('@apellidos');
      personaParams.apellidos = apellidos;
    }

    // documento (columna única que combina tipo + número)
    if (personaCols.includes('documento')) {
      personaInsertCols.push('documento'); personaInsertVals.push('@documento');
      personaParams.documento = `${tipo_documento || 'CI'} ${numero_documento}`;
    }

    // numero_documento / nro_documento por separado
    if (personaCols.includes('numero_documento')) {
      personaInsertCols.push('numero_documento'); personaInsertVals.push('@numero_documento');
      personaParams.numero_documento = numero_documento;
    }
    if (personaCols.includes('tipo_documento')) {
      personaInsertCols.push('tipo_documento'); personaInsertVals.push('@tipo_documento');
      personaParams.tipo_documento = tipo_documento || 'CI';
    }

    // email / correo
    if (personaCols.includes('email')) {
      personaInsertCols.push('email'); personaInsertVals.push('@email');
      personaParams.email = email || '';
    } else if (personaCols.includes('correo')) {
      personaInsertCols.push('correo'); personaInsertVals.push('@email');
      personaParams.email = email || '';
    }

    // telefono (si está en persona directamente)
    if (personaCols.includes('telefono') && telefono) {
      personaInsertCols.push('telefono'); personaInsertVals.push('@telefono_p');
      personaParams.telefono_p = telefono;
    }

    if (personaInsertCols.length === 0) {
      throw new Error('No se pudo determinar la estructura de la tabla persona');
    }

    const personaSQL = `
      INSERT INTO dbo.persona (${personaInsertCols.join(', ')})
      VALUES (${personaInsertVals.join(', ')});
      SELECT SCOPE_IDENTITY() as id_persona;
    `;
    logger.info(`[huesped.create] SQL persona: ${personaSQL}`);

    const personaResult = await db.query(personaSQL, personaParams);
    const idPersona = personaResult && personaResult[0] ? personaResult[0].id_persona : null;

    if (!idPersona) {
      throw new Error('No se pudo obtener el ID de la persona insertada');
    }

    // -------------------------------------------------------
    // 2. Insertar teléfono en persona_telefono (si existe la tabla)
    // -------------------------------------------------------
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
        // No es fatal si el teléfono falla
        logger.warn(`[huesped.create] No se pudo insertar teléfono: ${telError.message}`);
      }
    }

    // -------------------------------------------------------
    // 3. Insertar en dbo.huesped
    // -------------------------------------------------------
    const huespedCols = await getTableColumns('huesped');
    logger.info(`[huesped.create] Columnas de huesped: ${huespedCols.join(', ')}`);

    const huespedInsertCols = [];
    const huespedInsertVals = [];
    const huespedParams = {};

    if (huespedCols.includes('id_persona')) {
      huespedInsertCols.push('id_persona'); huespedInsertVals.push('@id_persona_h');
      huespedParams.id_persona_h = idPersona;
    }
    if (huespedCols.includes('notas')) {
      huespedInsertCols.push('notas'); huespedInsertVals.push('@notas');
      huespedParams.notas = '';
    }
    if (huespedCols.includes('observaciones')) {
      huespedInsertCols.push('observaciones'); huespedInsertVals.push('@observaciones_h');
      huespedParams.observaciones_h = '';
    }

    if (huespedInsertCols.length === 0) {
      throw new Error('No se pudo determinar la estructura de la tabla huesped');
    }

    const huespedSQL = `
      INSERT INTO dbo.huesped (${huespedInsertCols.join(', ')})
      VALUES (${huespedInsertVals.join(', ')});
      SELECT SCOPE_IDENTITY() as id_huesped;
    `;
    logger.info(`[huesped.create] SQL huesped: ${huespedSQL}`);

    const huespedResult = await db.query(huespedSQL, huespedParams);
    const idHuesped = huespedResult && huespedResult[0] ? huespedResult[0].id_huesped : null;

    if (!idHuesped) {
      throw new Error('No se pudo obtener el ID del huésped insertado');
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
