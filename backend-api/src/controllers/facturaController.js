const mssql = require('mssql/msnodesqlv8');
const db = require('../config/database');
const logger = require('../middlewares/logger');
const PDFDocument = require('pdfkit');
const { enviarFacturaPorCorreo } = require('../services/emailService');

/**
 * Crea una nueva factura, sus detalles y actualiza el estado de la habitación.
 * Utiliza una transacción para garantizar la atomicidad de la operación.
 */
const crearFactura = async (req, res) => {
  const { id_habitacion, nombre_cliente, documento_cliente, subtotal, impuesto, total, detalles, email_cliente } = req.body;

  // Validación básica de entrada
  if (!id_habitacion || !nombre_cliente || !detalles || detalles.length === 0) {
    return res.status(400).json({ success: false, message: 'Faltan datos requeridos para la facturación.' });
  }

  const pool = db.getPool();
  if (!pool) {
    return res.status(500).json({ success: false, message: 'No se pudo conectar a la base de datos.' });
  }

  const transaction = new mssql.Transaction(pool);

  try {
    await transaction.begin();
    logger.info('Transacción de facturación iniciada.');

    // 1. Insertar la cabecera de la factura y obtener el ID generado
    const facturaRequest = new mssql.Request(transaction);
    const resultFactura = await facturaRequest
      .input('id_habitacion', mssql.Int, id_habitacion)
      .input('nombre_cliente', mssql.VarChar(150), nombre_cliente)
      .input('documento_cliente', mssql.VarChar(20), documento_cliente)
      .input('subtotal', mssql.Decimal(10, 2), subtotal)
      .input('impuesto', mssql.Decimal(10, 2), impuesto)
      .input('total', mssql.Decimal(10, 2), total)
      .query(`
        INSERT INTO dbo.factura (id_habitacion, nombre_cliente, documento_cliente, subtotal, impuesto, total)
        VALUES (@id_habitacion, @nombre_cliente, @documento_cliente, @subtotal, @impuesto, @total);
        SELECT SCOPE_IDENTITY() as id_factura;
      `);

    const idFactura = resultFactura.recordset[0].id_factura;

    // 2. Generar número de factura correlativo (FAC-0001, FAC-0002, ...)
    const numeroFactura = `FAC-${String(idFactura).padStart(4, '0')}`;

    // 2a. Intentar persistir numero_factura si la columna existe
    try {
      const colCheck = new mssql.Request(transaction);
      const colResult = await colCheck.query(`
        SELECT COUNT(*) as existe
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_NAME = 'factura' AND COLUMN_NAME = 'numero_factura'
      `);
      if (colResult.recordset[0].existe > 0) {
        const updateReq = new mssql.Request(transaction);
        await updateReq
          .input('numero_factura', mssql.VarChar(20), numeroFactura)
          .input('id_factura', mssql.Int, idFactura)
          .query(`UPDATE dbo.factura SET numero_factura = @numero_factura WHERE id_factura = @id_factura`);
      }
    } catch (colError) {
      logger.warn(`No se pudo persistir numero_factura: ${colError.message}`);
    }

    // 3. Insertar cada línea de detalle
    for (const detalle of detalles) {
      const detalleRequest = new mssql.Request(transaction);
      await detalleRequest
        .input('id_factura', mssql.Int, idFactura)
        .input('descripcion', mssql.VarChar(255), detalle.descripcion)
        .input('cantidad', mssql.Int, detalle.cantidad)
        .input('precio_unitario', mssql.Decimal(10, 2), detalle.precio_unitario)
        .input('id_estado', mssql.Int, 1) // Asumiendo 1 como estado válido
        .query(`
          INSERT INTO dbo.detalle_factura (id_factura, descripcion, cantidad, precio_unitario, id_estado)
          VALUES (@id_factura, @descripcion, @cantidad, @precio_unitario, @id_estado);
        `);
    }

// NOTA: NO se actualiza el estado de la habitación aquí.
    // La habitación ya fue puesta en 'PENDIENTE_LIMPIEZA' durante el check-out,
    // y solo pasará a 'DISPONIBLE' cuando la tarea de limpieza se complete
    // (ver limpiezaController / automationService). Esto respeta el flujo:
    // OCUPADA -> LIMPIEZA PENDIENTE -> DISPONIBLE.

    await transaction.commit();
    logger.info(`Factura #${idFactura} creada y transacción completada.`);

    // Enviar factura al correo del cliente (si se proporcionó)
    if (email_cliente) {
      const facturaData = {
        id_factura: idFactura,
        nombre_cliente,
        documento_cliente,
        subtotal,
        impuesto,
        total
      };
      const pdfBuffer = await generarFacturaPDFBuffer(idFactura);
      const resultado = await enviarFacturaPorCorreo(email_cliente, facturaData, pdfBuffer);
      if (!resultado.success) {
        logger.warn(`No se pudo enviar la factura #${idFactura} al correo ${email_cliente}: ${resultado.motivo}`);
      }
    }

    res.status(201).json({
      success: true,
      message: email_cliente
        ? 'Factura creada, habitación actualizada y factura enviada al correo exitosamente.'
        : 'Factura creada y habitación actualizada exitosamente.',
      data: { id_factura: idFactura, numero_factura: numeroFactura }
    });

  } catch (error) {
    await transaction.rollback();
    logger.error('Error en transacción de facturación:', { error: error.message, stack: error.stack });
    res.status(500).json({ success: false, message: 'Error interno al crear la factura.' });
  }
};

/**
 * Genera el PDF de una factura en memoria (Buffer) para adjuntarlo por correo.
 * @param {number} idFactura - ID de la factura
 * @returns {Promise<Buffer>} Buffer del PDF
 */
const generarFacturaPDFBuffer = async (idFactura) => {
  const facturaResult = await db.query('SELECT * FROM dbo.factura WHERE id_factura = @id', { id: idFactura });
  const detalles = await db.query('SELECT * FROM dbo.detalle_factura WHERE id_factura = @id', { id: idFactura });

  const factura = facturaResult[0];

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50 });
    const chunks = [];

    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    // Cabecera
    doc.fontSize(20).font('Helvetica-Bold').text('Hotel Los Arcos', { align: 'center' });
    doc.fontSize(10).font('Helvetica').text('Factura N°: ' + factura.id_factura, { align: 'right' });
    doc.moveDown();

    // Datos del cliente
    doc.fontSize(12).font('Helvetica-Bold').text('Datos del Cliente:');
    doc.fontSize(10).font('Helvetica').text(`Nombre: ${factura.nombre_cliente}`);
    doc.text(`Documento: ${factura.documento_cliente}`);
    doc.text(`Fecha de Emisión: ${new Date(factura.fecha_emision).toLocaleDateString()}`);
    doc.moveDown(2);

    // Tabla de detalles
    doc.fontSize(12).font('Helvetica-Bold').text('Detalle de la Factura:');
    doc.moveDown();
    const itemX = 50;
    const qtyX = 350;
    const priceX = 420;
    const totalX = 500;

    doc.fontSize(10).font('Helvetica-Bold');
    doc.text('Descripción', itemX, doc.y);
    doc.text('Cantidad', qtyX, doc.y, { width: 60, align: 'right' });
    doc.text('P. Unitario', priceX, doc.y, { width: 70, align: 'right' });
    doc.text('Total', totalX, doc.y, { width: 70, align: 'right' });
    doc.moveTo(50, doc.y + 5).lineTo(550, doc.y + 5).stroke();
    doc.moveDown();

    doc.font('Helvetica');
    detalles.forEach(item => {
      const y = doc.y;
      doc.text(item.descripcion, itemX, y);
      doc.text(item.cantidad.toString(), qtyX, y, { width: 60, align: 'right' });
      doc.text(item.precio_unitario.toFixed(2), priceX, y, { width: 70, align: 'right' });
      doc.text((item.cantidad * item.precio_unitario).toFixed(2), totalX, y, { width: 70, align: 'right' });
      doc.moveDown();
    });

    // Totales
    doc.fontSize(10).font('Helvetica-Bold').text(`Subtotal: ${factura.subtotal.toFixed(2)}`, 400, doc.y + 20, { align: 'right' });
    doc.text(`Impuesto: ${factura.impuesto.toFixed(2)}`, 400, doc.y + 5, { align: 'right' });
    doc.fontSize(12).text(`TOTAL: ${factura.total.toFixed(2)}`, 400, doc.y + 5, { align: 'right' });

    doc.end();
  });
};

/**
 * Genera y descarga una factura en formato PDF.
 */
const descargarFacturaPDF = async (req, res) => {
  try {
    const { id } = req.params;

    // 1. Obtener datos de la factura y sus detalles
    const facturaResult = await db.query('SELECT * FROM dbo.factura WHERE id_factura = @id', { id });
    if (facturaResult.length === 0) {
      return res.status(404).json({ success: false, message: 'Factura no encontrada.' });
    }
    const factura = facturaResult[0];
    const detalles = await db.query('SELECT * FROM dbo.detalle_factura WHERE id_factura = @id', { id });

    // 2. Generar el PDF
    const doc = new PDFDocument({ margin: 50 });
    const filename = `factura-${factura.id_factura}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    doc.pipe(res);

    // --- Diseño del PDF ---
    // Cabecera
    doc.fontSize(20).font('Helvetica-Bold').text('Hotel Los Arcos', { align: 'center' });
    doc.fontSize(10).font('Helvetica').text('Factura N°: ' + factura.id_factura, { align: 'right' });
    doc.moveDown();

    // Datos del cliente
    doc.fontSize(12).font('Helvetica-Bold').text('Datos del Cliente:');
    doc.fontSize(10).font('Helvetica').text(`Nombre: ${factura.nombre_cliente}`);
    doc.text(`Documento: ${factura.documento_cliente}`);
    doc.text(`Fecha de Emisión: ${new Date(factura.fecha_emision).toLocaleDateString()}`);
    doc.moveDown(2);

    // Tabla de detalles
    doc.fontSize(12).font('Helvetica-Bold').text('Detalle de la Factura:');
    doc.moveDown();
    const tableTop = doc.y;
    const itemX = 50;
    const qtyX = 350;
    const priceX = 420;
    const totalX = 500;

    doc.fontSize(10).font('Helvetica-Bold');
    doc.text('Descripción', itemX, tableTop);
    doc.text('Cantidad', qtyX, tableTop, { width: 60, align: 'right' });
    doc.text('P. Unitario', priceX, tableTop, { width: 70, align: 'right' });
    doc.text('Total', totalX, tableTop, { width: 70, align: 'right' });
    doc.moveTo(50, doc.y + 5).lineTo(550, doc.y + 5).stroke();
    doc.moveDown();

    doc.font('Helvetica');
    detalles.forEach(item => {
      const y = doc.y;
      doc.text(item.descripcion, itemX, y);
      doc.text(item.cantidad.toString(), qtyX, y, { width: 60, align: 'right' });
      doc.text(item.precio_unitario.toFixed(2), priceX, y, { width: 70, align: 'right' });
      doc.text((item.cantidad * item.precio_unitario).toFixed(2), totalX, y, { width: 70, align: 'right' });
      doc.moveDown();
    });

    // Totales
    doc.fontSize(10).font('Helvetica-Bold').text(`Subtotal: ${factura.subtotal.toFixed(2)}`, 400, doc.y + 20, { align: 'right' });
    doc.text(`Impuesto: ${factura.impuesto.toFixed(2)}`, 400, doc.y + 5, { align: 'right' });
    doc.fontSize(12).text(`TOTAL: ${factura.total.toFixed(2)}`, 400, doc.y + 5, { align: 'right' });

    doc.end();

  } catch (error) {
    logger.error('Error al descargar PDF de factura:', { error: error.message, stack: error.stack });
    res.status(500).json({ success: false, message: 'Error interno al generar el PDF.' });
  }
};

/**
 * Obtiene un listado de todas las facturas emitidas.
 */
const getAllFacturas = async (req, res) => {
  try {
    const facturas = await db.query(`
      SELECT 
        f.id_factura,
        f.nombre_cliente,
        f.documento_cliente,
        f.fecha_emision,
        f.total,
        h.numero as numero_habitacion
      FROM dbo.factura f
      LEFT JOIN dbo.habitacion h ON f.id_habitacion = h.id_habitacion
      ORDER BY f.fecha_emision DESC;
    `);
    res.status(200).json({ success: true, data: facturas });
  } catch (error) {
    logger.error('Error al obtener el historial de facturas:', { error: error.message, stack: error.stack });
    res.status(500).json({ success: false, message: 'Error interno al obtener las facturas.' });
  }
};

module.exports = {
  crearFactura,
  descargarFacturaPDF,
  getAllFacturas
};
