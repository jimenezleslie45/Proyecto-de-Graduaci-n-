const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');
const ExcelJS = require('exceljs');
const logger = require('../middlewares/logger');

/**
 * Asegura que el directorio exista
 */
const asegurarDirectorio = (rutaArchivo) => {
  const dir = path.dirname(rutaArchivo);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
};

/**
 * Genera un reporte en formato PDF
 * @param {Object} datos - Estructura del reporte { tipo, titulo, fecha, resumen, habitacionesPorEstado, habitacionesOcupacion, detalles }
 * @param {string} rutaDestino - Ruta completa donde se guardará el archivo PDF
 */
const generarReportePDF = (datos, rutaDestino) => {
  return new Promise((resolve, reject) => {
    try {
      asegurarDirectorio(rutaDestino);

      const doc = new PDFDocument({ margin: 50, size: 'LETTER' });
      const stream = fs.createWriteStream(rutaDestino);

      doc.pipe(stream);

      // --- Encabezado ---
      doc.rect(50, 45, 512, 4).fill('#0ea5e9'); // Línea decorativa superior
      doc.moveDown(0.8);

      doc.fontSize(20).font('Helvetica-Bold').fillColor('#0f172a').text('Sistema de Gestión Hotelera', { align: 'center' });
      doc.fontSize(14).font('Helvetica').fillColor('#334155').text(datos.titulo || `Reporte ${datos.tipo || 'Operativo'}`, { align: 'center' });
      doc.moveDown(0.3);

      doc.fontSize(10).font('Helvetica-Oblique').fillColor('#64748b').text(
        `Período / Fecha: ${datos.fecha || new Date().toISOString().split('T')[0]} | Generado: ${new Date().toLocaleString()} (${datos.generado_por || 'AUTOMATICO'})`,
        { align: 'center' }
      );
      doc.moveDown(1.5);

      // --- Resumen Ejecutivo ---
      doc.fontSize(12).font('Helvetica-Bold').fillColor('#0f172a').text('Resumen Operativo');
      doc.strokeColor('#cbd5e1').lineWidth(1).moveTo(50, doc.y + 4).lineTo(562, doc.y + 4).stroke();
      doc.moveDown(0.8);

      const resumen = datos.resumen || {};
      const resumenItems = [
        { label: 'Check-ins', val: resumen.checkins ?? '-' },
        { label: 'Check-outs', val: resumen.checkouts ?? '-' },
        { label: 'Tareas Limpieza Total', val: resumen.tareas_limpieza_total ?? resumen.tareas_total ?? '-' },
        { label: 'Tareas Limpieza Completadas', val: resumen.tareas_limpieza_completadas ?? resumen.tareas_completadas ?? '-' },
        { label: 'Tickets Mantenimiento', val: resumen.total_tickets ?? '-' },
        { label: 'Ocupación General', val: resumen.porcentaje_ocupacion ? `${resumen.porcentaje_ocupacion}%` : (resumen.ocupacion_promedio ? `${resumen.ocupacion_promedio}%` : '-') }
      ];

      // Dibujar métricas en cuadrícula 2 columnas
      let startY = doc.y;
      resumenItems.forEach((item, index) => {
        const col = index % 2;
        const row = Math.floor(index / 2);
        const x = col === 0 ? 60 : 310;
        const y = startY + (row * 24);

        doc.fontSize(10).font('Helvetica').fillColor('#475569').text(item.label + ':', x, y);
        doc.fontSize(10).font('Helvetica-Bold').fillColor('#0f172a').text(String(item.val), x + 150, y);
      });

      doc.y = startY + (Math.ceil(resumenItems.length / 2) * 24) + 15;

      // --- Sección Habitaciones por Estado (si aplica) ---
      if (datos.habitacionesPorEstado && datos.habitacionesPorEstado.length > 0) {
        doc.moveDown(0.5);
        doc.fontSize(12).font('Helvetica-Bold').fillColor('#0f172a').text('Estado de Habitaciones');
        doc.strokeColor('#cbd5e1').lineWidth(1).moveTo(50, doc.y + 4).lineTo(562, doc.y + 4).stroke();
        doc.moveDown(0.8);

        // Tabla simple
        let tablaY = doc.y;
        doc.fontSize(10).font('Helvetica-Bold').fillColor('#1e293b');
        doc.text('Estado', 70, tablaY);
        doc.text('Cantidad', 350, tablaY);
        doc.strokeColor('#e2e8f0').lineWidth(0.5).moveTo(60, tablaY + 14).lineTo(550, tablaY + 14).stroke();

        tablaY += 18;
        datos.habitacionesPorEstado.forEach((h) => {
          doc.fontSize(9).font('Helvetica').fillColor('#334155');
          doc.text(h.estado || '-', 70, tablaY);
          doc.text(String(h.cantidad || 0), 350, tablaY);
          tablaY += 16;
        });
        doc.y = tablaY + 10;
      }

      // --- Sección Desglose de Ocupación por Habitación (para mensual) ---
      if (datos.habitacionesOcupacion && datos.habitacionesOcupacion.length > 0) {
        if (doc.y > 600) doc.addPage();
        doc.moveDown(0.5);
        doc.fontSize(12).font('Helvetica-Bold').fillColor('#0f172a').text('Desglose de Ocupación por Habitación');
        doc.strokeColor('#cbd5e1').lineWidth(1).moveTo(50, doc.y + 4).lineTo(562, doc.y + 4).stroke();
        doc.moveDown(0.8);

        let tablaY = doc.y;
        doc.fontSize(9).font('Helvetica-Bold').fillColor('#1e293b');
        doc.text('N° Habitación', 60, tablaY);
        doc.text('Tipo', 180, tablaY);
        doc.text('Días Ocupada', 330, tablaY);
        doc.text('% Ocupación', 450, tablaY);
        doc.strokeColor('#e2e8f0').lineWidth(0.5).moveTo(50, tablaY + 14).lineTo(560, tablaY + 14).stroke();

        tablaY += 18;
        datos.habitacionesOcupacion.forEach((hab) => {
          if (tablaY > 720) {
            doc.addPage();
            tablaY = 50;
          }
          doc.fontSize(9).font('Helvetica').fillColor('#334155');
          doc.text(String(hab.numero_habitacion || '-'), 60, tablaY);
          doc.text(String(hab.tipo || '-'), 180, tablaY);
          doc.text(String(hab.dias_ocupada || 0), 330, tablaY);
          doc.text(`${hab.porcentaje || 0}%`, 450, tablaY);
          tablaY += 16;
        });
        doc.y = tablaY + 10;
      }

      // --- Pie de página ---
      doc.fontSize(8).font('Helvetica').fillColor('#94a3b8').text(
        'Este documento es generado automáticamente por el Sistema de Gestión Hotelera. Datos extraídos de la base de datos de producción.',
        50,
        740,
        { align: 'center', width: 512 }
      );

      doc.end();

      stream.on('finish', () => resolve(rutaDestino));
      stream.on('error', (err) => {
        logger.error('Error writing PDF file:', err);
        reject(err);
      });
    } catch (error) {
      logger.error('Error generating PDF report:', error);
      reject(error);
    }
  });
};

/**
 * Genera un reporte en formato Excel (.xlsx)
 * @param {Object} datos - Estructura del reporte
 * @param {string} rutaDestino - Ruta completa donde se guardará el archivo .xlsx
 */
const generarReporteExcel = async (datos, rutaDestino) => {
  try {
    asegurarDirectorio(rutaDestino);

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Sistema de Gestión Hotelera';
    workbook.created = new Date();

    const sheet = workbook.addWorksheet(datos.tipo || 'Reporte');

    // Título Principal
    sheet.mergeCells('A1:D1');
    const titleCell = sheet.getCell('A1');
    titleCell.value = 'Sistema de Gestión Hotelera';
    titleCell.font = { name: 'Arial', size: 16, bold: true, color: { argb: 'FFFFFFFF' } };
    titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0284C7' } };
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    sheet.getRow(1).height = 30;

    // Subtítulo
    sheet.mergeCells('A2:D2');
    const subTitle = sheet.getCell('A2');
    subTitle.value = `${datos.titulo || datos.tipo} - ${datos.fecha || new Date().toISOString().split('T')[0]}`;
    subTitle.font = { name: 'Arial', size: 12, bold: true, color: { argb: 'FF334155' } };
    subTitle.alignment = { horizontal: 'center', vertical: 'middle' };
    sheet.getRow(2).height = 22;

    sheet.addRow([]); // Fila vacía

    // Sección Resumen
    const headerResumen = sheet.addRow(['Métrica', 'Valor']);
    headerResumen.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };
    });

    const resumen = datos.resumen || {};
    sheet.addRow(['Check-ins', resumen.checkins ?? 0]);
    sheet.addRow(['Check-outs', resumen.checkouts ?? 0]);
    sheet.addRow(['Tareas Limpieza Total', resumen.tareas_limpieza_total ?? resumen.tareas_total ?? 0]);
    sheet.addRow(['Tareas Limpieza Completadas', resumen.tareas_limpieza_completadas ?? resumen.tareas_completadas ?? 0]);
    sheet.addRow(['Tickets Mantenimiento', resumen.total_tickets ?? 0]);
    sheet.addRow(['Ocupación (%)', resumen.porcentaje_ocupacion ?? resumen.ocupacion_promedio ?? 0]);

    sheet.addRow([]); // Fila vacía

    // Sección Estados de Habitación
    if (datos.habitacionesPorEstado && datos.habitacionesPorEstado.length > 0) {
      const headerEstado = sheet.addRow(['Estado de Habitación', 'Cantidad']);
      headerEstado.eachCell((cell) => {
        cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF334155' } };
      });
      datos.habitacionesPorEstado.forEach((h) => {
        sheet.addRow([h.estado, h.cantidad]);
      });
      sheet.addRow([]);
    }

    // Sección Ocupación por Habitación
    if (datos.habitacionesOcupacion && datos.habitacionesOcupacion.length > 0) {
      const headerOcupacion = sheet.addRow(['N° Habitación', 'Tipo', 'Días Ocupada', '% Ocupación']);
      headerOcupacion.eachCell((cell) => {
        cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0369A1' } };
      });
      datos.habitacionesOcupacion.forEach((hab) => {
        sheet.addRow([hab.numero_habitacion, hab.tipo, hab.dias_ocupada, `${hab.porcentaje}%`]);
      });
    }

    // Ajustar anchos de columnas
    sheet.columns = [
      { width: 30 },
      { width: 25 },
      { width: 20 },
      { width: 20 }
    ];

    await workbook.xlsx.writeFile(rutaDestino);
    return rutaDestino;
  } catch (error) {
    logger.error('Error generating Excel report:', error);
    throw error;
  }
};

module.exports = {
  generarReportePDF,
  generarReporteExcel
};

