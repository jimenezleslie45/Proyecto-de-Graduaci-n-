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

    // Insert persona real en dbo.persona: documento es una sola columna, sin tipo_documento/numero_documento ni telefono.
    const documento = `${tipo_documento || 'CI'} ${numero_documento}`;
    const personaResult = await db.query(`
      INSERT INTO dbo.persona (nombres, apellidos, documento, email)
      VALUES (@nombres, @apellidos, @documento, @email);
      SELECT SCOPE_IDENTITY() as id_persona;
    `, {
      nombres,
      apellidos,
      documento,
      email: email || ''
    });

    const idPersona = personaResult[0].id_persona;

    // Insert teléfono real en dbo.persona_telefono en caso de venir en el body.
    if (telefono) {
      await db.query(`
        INSERT INTO dbo.persona_telefono (id_persona, telefono, tipo, principal)
        VALUES (@id_persona, @telefono, @tipo, @principal);
      `, {
        id_persona: idPersona,
        telefono,
        tipo: 'celular',
        principal: 1
      });
    }

    // Insert huesped real en dbo.huesped: no tiene numero_huesped.
    const huespedResult = await db.query(`
      INSERT INTO dbo.huesped (id_persona, notas)
      VALUES (@id_persona, @notas);
      SELECT SCOPE_IDENTITY() as id_huesped;
    `, { id_persona: idPersona, notas: '' });

    const idHuesped = huespedResult[0].id_huesped;
    const numeroHuesped = `H${String(idHuesped).padStart(3, '0')}`;

    res.status(201).json({
      success: true,
      data: {
        id: idHuesped,
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
    res.status(500).json({ success: false, message: 'Error al crear huésped' });
  }
};

module.exports = {
  create
};
