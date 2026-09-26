const cron = require('node-cron');
const path = require('path');
const fs = require('fs');
const db = require('../config/database');
const logger = require('../middlewares/logger');
const { generarReportePDF, generarReporteExcel } = require('../services/reporteGenerador');

const REPORTES_DIR = path.resolve(__dirname, '../../reportes-generados');

/**
 * Asegura la carpeta de reportes generados
 */
if (!fs.existsSync(REPORTES_DIR)) {
  fs.mkdirSync(REPORTES_DIR, { recursive: true });
}

/**
 * Obtiene los datos operativos para un reporte diario
 */
const recolectarDatosDiario = async (fecha = new Date()) => {
  const fechaObj = new Date(fecha);
  const fechaStr = fechaObj.toISOString().split('T')[0];

  const queryResumen = `
    SELECT
      (SELECT COUNT(*) FROM dbo.estadia WHERE CAST(check_in AS DATE) = CAST(@fecha AS DATE)) as checkins,
      (SELECT COUNT(*) FROM dbo.estadia WHERE CAST(check_out AS DATE) = CAST(@fecha AS DATE)) as checkouts,
      (SELECT COUNT(*) FROM dbo.tarea_limpieza WHERE CAST(created_at AS DATE) = CAST(@fecha AS DATE)) as tareas_total,
      (SELECT COUNT(*) FROM dbo.tarea_limpieza WHERE fin IS NOT NULL AND CAST(fin AS DATE) = CAST(@fecha AS DATE)) as tareas_completadas,
      (SELECT COUNT(*) FROM dbo.ticket_mantenimiento WHERE CAST(created_at AS DATE) = CAST(@fecha AS DATE)) as total_tickets
  `;
  const resultResumen = await db.query(queryResumen, { fecha: fechaObj });
  const resumen = resultResumen[0] || {};

  const queryHabitaciones = `
    SELECT eh.nombre as estado, COUNT(*) as cantidad
    FROM dbo.habitacion h
    INNER JOIN dbo.estado_habitacion eh ON h.id_estado_actual = eh.id_estado
    GROUP BY eh.nombre
  `;
  const habitacionesPorEstado = await db.query(queryHabitaciones);

  // Ocupación del día
  const queryOcupacion = `
    SELECT
      (SELECT COUNT(*) FROM dbo.habitacion) as total,
      (SELECT COUNT(*) FROM dbo.habitacion h INNER JOIN dbo.estado_habitacion eh ON h.id_estado_actual = eh.id_estado WHERE UPPER(eh.nombre) = 'OCUPADA') as ocupadas
  `;
  const ocRes = (await db.query(queryOcupacion))[0] || {};
  const pctOcupacion = ocRes.total > 0 ? Math.round((ocRes.ocupadas / ocRes.total) * 1000) / 10 : 0;

  return {
    tipo: 'DIARIO',
    titulo: 'Reporte Diario de Operaciones',
    fecha: fechaStr,
    resumen: {
      checkins: resumen.checkins || 0,
      checkouts: resumen.checkouts || 0,
      tareas_total: resumen.tareas_total || 0,
      tareas_completadas: resumen.tareas_completadas || 0,
      total_tickets: resumen.total_tickets || 0,
      porcentaje_ocupacion: pctOcupacion
    },
    habitacionesPorEstado: habitacionesPorEstado || []
  };
};

/**
 * Obtiene los datos operativos para un reporte semanal
 */
const recolectarDatosSemanal = async (fechaFin = new Date()) => {
  const fin = new Date(fechaFin);
  const inicio = new Date(fin);
  inicio.setDate(fin.getDate() - 6);

  const queryResumen = `
    SELECT
      (SELECT COUNT(*) FROM dbo.estadia WHERE CAST(check_in AS DATE) BETWEEN CAST(@inicio AS DATE) AND CAST(@fin AS DATE)) as checkins,
      (SELECT COUNT(*) FROM dbo.estadia WHERE CAST(check_out AS DATE) BETWEEN CAST(@inicio AS DATE) AND CAST(@fin AS DATE)) as checkouts,
      (SELECT COUNT(*) FROM dbo.tarea_limpieza WHERE CAST(created_at AS DATE) BETWEEN CAST(@inicio AS DATE) AND CAST(@fin AS DATE)) as tareas_total,
      (SELECT COUNT(*) FROM dbo.tarea_limpieza WHERE fin IS NOT NULL AND CAST(fin AS DATE) BETWEEN CAST(@inicio AS DATE) AND CAST(@fin AS DATE)) as tareas_completadas,
      (SELECT COUNT(*) FROM dbo.ticket_mantenimiento WHERE CAST(created_at AS DATE) BETWEEN CAST(@inicio AS DATE) AND CAST(@fin AS DATE)) as total_tickets
  `;
  const resultResumen = await db.query(queryResumen, { inicio, fin });
  const resumen = resultResumen[0] || {};

  const queryHabitaciones = `
    SELECT eh.nombre as estado, COUNT(*) as cantidad
    FROM dbo.habitacion h
    INNER JOIN dbo.estado_habitacion eh ON h.id_estado_actual = eh.id_estado
    GROUP BY eh.nombre
  `;
  const habitacionesPorEstado = await db.query(queryHabitaciones);

  const fechaTexto = `${inicio.toISOString().split('T')[0]} al ${fin.toISOString().split('T')[0]}`;

  return {
    tipo: 'SEMANAL',
    titulo: 'Reporte Semanal de Operaciones',
    fecha: fechaTexto,
    resumen: {
      checkins: resumen.checkins || 0,
      checkouts: resumen.checkouts || 0,
      tareas_total: resumen.tareas_total || 0,
      tareas_completadas: resumen.tareas_completadas || 0,
      total_tickets: resumen.total_tickets || 0
    },
    habitacionesPorEstado: habitacionesPorEstado || []
  };
};

/**
 * Obtiene los datos para un reporte mensual
 */
const recolectarDatosMensual = async (anio, mes) => {
  const d = new Date();
  const year = anio || (mes ? d.getFullYear() : (d.getMonth() === 0 ? d.getFullYear() - 1 : d.getFullYear()));
  const month = mes || (d.getMonth() === 0 ? 12 : d.getMonth()); // Mes anterior por defecto

  const primerDia = new Date(year, month - 1, 1);
  const ultimoDia = new Date(year, month, 0);
  const diasDelMes = ultimoDia.getDate();

  const queryOcupacion = `
    SELECT h.numero as numero_habitacion, th.nombre as tipo,
           SUM(DATEDIFF(DAY,
             CASE WHEN e.check_in < @primerDia THEN @primerDia ELSE e.check_in END,
             CASE WHEN e.check_out IS NULL OR e.check_out > @ultimoDia THEN @ultimoDia ELSE e.check_out END
           )) as dias_ocupada
    FROM dbo.habitacion h
    INNER JOIN dbo.tipo_habitacion th ON h.id_tipo = th.id_tipo
    LEFT JOIN dbo.estadia e ON e.id_habitacion = h.id_habitacion
      AND e.check_in <= @ultimoDia AND (e.check_out IS NULL OR e.check_out >= @primerDia)
    GROUP BY h.numero, th.nombre
    ORDER BY h.numero
  `;

  const habitaciones = await db.query(queryOcupacion, { primerDia, ultimoDia });
  const habitacionesOcupacion = (habitaciones || []).map(r => ({
    numero_habitacion: r.numero_habitacion,
    tipo: r.tipo,
    dias_ocupada: r.dias_ocupada || 0,
    porcentaje: Math.round(((r.dias_ocupada || 0) / diasDelMes) * 1000) / 10
  }));

  const queryResumen = `
    SELECT
      (SELECT COUNT(*) FROM dbo.estadia WHERE CAST(check_in AS DATE) BETWEEN CAST(@primerDia AS DATE) AND CAST(@ultimoDia AS DATE)) as checkins,
      (SELECT COUNT(*) FROM dbo.estadia WHERE CAST(check_out AS DATE) BETWEEN CAST(@primerDia AS DATE) AND CAST(@ultimoDia AS DATE)) as checkouts,
      (SELECT COUNT(*) FROM dbo.tarea_limpieza WHERE CAST(created_at AS DATE) BETWEEN CAST(@primerDia AS DATE) AND CAST(@ultimoDia AS DATE)) as tareas_total,
      (SELECT COUNT(*) FROM dbo.tarea_limpieza WHERE fin IS NOT NULL AND CAST(fin AS DATE) BETWEEN CAST(@primerDia AS DATE) AND CAST(@ultimoDia AS DATE)) as tareas_completadas,
      (SELECT COUNT(*) FROM dbo.ticket_mantenimiento WHERE CAST(created_at AS DATE) BETWEEN CAST(@primerDia AS DATE) AND CAST(@ultimoDia AS DATE)) as total_tickets
  `;
  const resultResumen = await db.query(queryResumen, { primerDia, ultimoDia });
  const resumen = resultResumen[0] || {};

  const ocupacionPromedio = habitacionesOcupacion.length > 0
    ? Math.round(habitacionesOcupacion.reduce((acc, h) => acc + h.porcentaje, 0) / habitacionesOcupacion.length * 10) / 10
    : 0;

  return {
    tipo: 'MENSUAL',
    titulo: `Reporte Mensual de Ocupación (${month}/${year})`,
    fecha: `${year}-${String(month).padStart(2, '0')}`,
    resumen: {
      checkins: resumen.checkins || 0,
      checkouts: resumen.checkouts || 0,
      tareas_total: resumen.tareas_total || 0,
      tareas_completadas: resumen.tareas_completadas || 0,
      total_tickets: resumen.total_tickets || 0,
      ocupacion_promedio: ocupacionPromedio
    },
    habitacionesOcupacion
  };
};

/**
 * Genera el archivo físico y registra la fila en dbo.reporte_generado
 */
const generarReporteYRegistrar = async ({
  tipo = 'DIARIO',
  formato = 'PDF',
  fecha = new Date(),
  anio,
  mes,
  generado_por = 'AUTOMATICO'
}) => {
  try {
    const tipoUpper = tipo.toUpperCase();
    const formatoUpper = formato.toUpperCase();

    // 1. Recolectar datos reales según el tipo
    let datos;
    if (tipoUpper === 'DIARIO') {
      datos = await recolectarDatosDiario(fecha);
    } else if (tipoUpper === 'SEMANAL') {
      datos = await recolectarDatosSemanal(fecha);
    } else if (tipoUpper === 'MENSUAL') {
      datos = await recolectarDatosMensual(anio, mes);
    } else {
      datos = await recolectarDatosDiario(fecha);
    }

    datos.generado_por = generado_por;

    // 2. Definir rutas y nombre de archivo
    const timestamp = Date.now();
    const fechaRef = new Date(fecha).toISOString().split('T')[0];
    const extension = formatoUpper === 'EXCEL' ? 'xlsx' : 'pdf';
    const filename = `reporte_${tipoUpper.toLowerCase()}_${fechaRef}_${timestamp}.${extension}`;
    const rutaAbsoluta = path.join(REPORTES_DIR, filename);
    const rutaRelativa = path.join('reportes-generados', filename).replace(/\\/g, '/');

    // 3. Crear archivo físico
    if (formatoUpper === 'EXCEL') {
      await generarReporteExcel(datos, rutaAbsoluta);
    } else {
      await generarReportePDF(datos, rutaAbsoluta);
    }

    // 4. Insertar fila en dbo.reporte_generado
    const insertQuery = `
      INSERT INTO dbo.reporte_generado (tipo, fecha_reporte, formato, ruta_archivo, generado_por, created_at)
      OUTPUT INSERTED.id_reporte
      VALUES (@tipo, CAST(@fecha_reporte AS DATE), @formato, @ruta_archivo, @generado_por, GETDATE())
    `;

    const insertResult = await db.query(insertQuery, {
      tipo: tipoUpper,
      fecha_reporte: new Date(fecha),
      formato: formatoUpper,
      ruta_archivo: rutaRelativa,
      generado_por: generado_por
    });

    const idInsertado = insertResult && insertResult[0] ? insertResult[0].id_reporte : null;

    logger.info(`Reporte ${tipoUpper} (${formatoUpper}) generado exitosamente: ${filename} (ID: ${idInsertado})`);

    return {
      success: true,
      id_reporte: idInsertado,
      tipo: tipoUpper,
      formato: formatoUpper,
      ruta_archivo: rutaRelativa,
      filename
    };
  } catch (error) {
    logger.error('Error al generar y registrar reporte:', error);
    throw error;
  }
};

/**
 * Inicializa y arranca todos los cron jobs de reportes automáticos
 */
const iniciarCronJobs = () => {
  // 1. Cron diario: Todos los días a las 23:59
  cron.schedule('59 23 * * *', async () => {
    logger.info('Ejecutando Cron Diario: Generación automática de reporte...');
    try {
      await generarReporteYRegistrar({
        tipo: 'DIARIO',
        formato: 'PDF',
        fecha: new Date(),
        generado_por: 'AUTOMATICO'
      });
    } catch (err) {
      logger.error('Fallo en Cron Diario:', err);
    }
  });

  // 2. Cron semanal: Lunes a las 00:05
  cron.schedule('5 0 * * 1', async () => {
    logger.info('Ejecutando Cron Semanal: Generación automática de reporte...');
    try {
      await generarReporteYRegistrar({
        tipo: 'SEMANAL',
        formato: 'PDF',
        fecha: new Date(),
        generado_por: 'AUTOMATICO'
      });
    } catch (err) {
      logger.error('Fallo en Cron Semanal:', err);
    }
  });

  // 3. Cron mensual: Día 1 de cada mes a las 00:10
  cron.schedule('10 0 1 * *', async () => {
    logger.info('Ejecutando Cron Mensual: Generación automática de reporte...');
    try {
      await generarReporteYRegistrar({
        tipo: 'MENSUAL',
        formato: 'PDF',
        fecha: new Date(),
        generado_por: 'AUTOMATICO'
      });
    } catch (err) {
      logger.error('Fallo en Cron Mensual:', err);
    }
  });

  logger.info('Cron jobs de reportes automáticos inicializados correctamente (Diario 23:59, Semanal Lunes 00:05, Mensual Día 1 00:10).');
};

module.exports = {
  iniciarCronJobs,
  generarReporteYRegistrar,
  recolectarDatosDiario,
  recolectarDatosSemanal,
  recolectarDatosMensual
};

