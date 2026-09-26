const fs = require('fs');
const path = require('path');
const db = require('../config/database');
const logger = require('../middlewares/logger');
const { generarReporteYRegistrar } = require('../jobs/reportesCron');

const getDashboardKPIs = async (req, res) => {
  try {
    const query = `
      SELECT
        (SELECT COUNT(*) FROM dbo.habitacion) as habitaciones_totales,
        (SELECT COUNT(*) FROM dbo.habitacion h INNER JOIN dbo.estado_habitacion eh ON h.id_estado_actual = eh.id_estado WHERE UPPER(eh.nombre) = 'DISPONIBLE') as habitaciones_disponibles,
        (SELECT COUNT(*) FROM dbo.habitacion h INNER JOIN dbo.estado_habitacion eh ON h.id_estado_actual = eh.id_estado WHERE UPPER(eh.nombre) = 'OCUPADA') as habitaciones_ocupadas,
        (SELECT COUNT(*) FROM dbo.habitacion h INNER JOIN dbo.estado_habitacion eh ON h.id_estado_actual = eh.id_estado WHERE UPPER(eh.nombre) IN ('PENDIENTE_LIMPIEZA', 'SUCIA')) as habitaciones_limpieza,
        (SELECT COUNT(*) FROM dbo.habitacion h INNER JOIN dbo.estado_habitacion eh ON h.id_estado_actual = eh.id_estado WHERE UPPER(eh.nombre) = 'EN_MANTENIMIENTO') as habitaciones_mantenimiento,
        (SELECT COUNT(*) FROM dbo.estadia WHERE CAST(check_in AS DATE) = CAST(GETDATE() AS DATE)) as checkins_hoy,
        (SELECT COUNT(*) FROM dbo.estadia WHERE CAST(check_out AS DATE) = CAST(GETDATE() AS DATE)) as checkouts_hoy,
        (SELECT COUNT(*) FROM dbo.tarea_limpieza WHERE inicio IS NULL) as tareas_limpieza_pendientes,
        (SELECT COUNT(*) FROM dbo.tarea_limpieza WHERE fin IS NOT NULL AND CAST(fin AS DATE) = CAST(GETDATE() AS DATE)) as tareas_limpieza_completadas_hoy,
        (SELECT AVG(DATEDIFF(MINUTE, inicio, fin)) FROM dbo.tarea_limpieza WHERE inicio IS NOT NULL AND fin IS NOT NULL) as tiempo_promedio_limpieza
    `;

    const result = await db.query(query);
    const data = result[0];

    const totales = data.habitaciones_totales || 0;
    const ocupadas = data.habitaciones_ocupadas || 0;
    const porcentaje_ocupacion = totales > 0 ? Math.round((ocupadas / totales) * 1000) / 10 : 0;

    const mantenimientoQuery = `
      SELECT
        SUM(CASE WHEN UPPER(estado) = 'PENDIENTE' THEN 1 ELSE 0 END) as pendientes,
        SUM(CASE WHEN UPPER(estado) = 'EN_PROCESO' THEN 1 ELSE 0 END) as en_proceso,
        AVG(CASE WHEN inicio IS NOT NULL AND fin IS NOT NULL THEN DATEDIFF(MINUTE, inicio, fin) END) as tiempo_promedio
      FROM dbo.ticket_mantenimiento
    `;
    const mant = (await db.query(mantenimientoQuery))[0] || {};

    res.json({
      success: true,
      data: {
        ...data,
        porcentaje_ocupacion,
        tickets_mantenimiento_pendientes: mant.pendientes || 0,
        tickets_mantenimiento_en_proceso: mant.en_proceso || 0,
        tiempo_promedio_mantenimiento: mant.tiempo_promedio ? Math.round(mant.tiempo_promedio) : 0
      }
    });
  } catch (error) {
    logger.error('Error getting dashboard KPIs:', error);
    res.status(500).json({ success: false, message: 'Error al obtener KPIs del dashboard' });
  }
};

const getLimpiezaKPIs = async (req, res) => {
  try {
    const { fecha_inicio, fecha_fin } = req.query;

    const whereFecha = (fecha_inicio && fecha_fin)
      ? `WHERE CAST(t.created_at AS DATE) BETWEEN CAST(@fecha_inicio AS DATE) AND CAST(@fecha_fin AS DATE)`
      : '';

    const query = `
      SELECT
        COUNT(*) as total_tareas,
        SUM(CASE WHEN t.fin IS NOT NULL THEN 1 ELSE 0 END) as tareas_completadas,
        SUM(CASE WHEN t.inicio IS NULL THEN 1 ELSE 0 END) as tareas_pendientes,
        AVG(CASE WHEN t.inicio IS NOT NULL AND t.fin IS NOT NULL THEN DATEDIFF(MINUTE, t.inicio, t.fin) END) as tiempo_promedio
      FROM dbo.tarea_limpieza t
      ${whereFecha}
    `;

    const params = (fecha_inicio && fecha_fin) ? { fecha_inicio, fecha_fin } : {};
    const result = await db.query(query, params);
    const resumen = result[0] || {};

    const empleadosQuery = `
      SELECT ea.id_empleado as id, pa.nombres + ' ' + pa.apellidos as nombre,
             SUM(CASE WHEN t.fin IS NOT NULL THEN 1 ELSE 0 END) as tareas_completadas,
             AVG(CASE WHEN t.inicio IS NOT NULL AND t.fin IS NOT NULL THEN DATEDIFF(MINUTE, t.inicio, t.fin) END) as tiempo_promedio
      FROM dbo.tarea_limpieza t
      INNER JOIN dbo.empleado ea ON t.asignado_a = ea.id_empleado
      INNER JOIN dbo.persona pa ON ea.id_persona = pa.id_persona
      ${whereFecha}
      GROUP BY ea.id_empleado, pa.nombres, pa.apellidos
    `;
    const empleados = await db.query(empleadosQuery, params);

    res.json({
      success: true,
      data: {
        total_tareas: resumen.total_tareas || 0,
        tareas_completadas: resumen.tareas_completadas || 0,
        tareas_pendientes: resumen.tareas_pendientes || 0,
        tiempo_promedio: resumen.tiempo_promedio ? Math.round(resumen.tiempo_promedio) : 0,
        porcentaje_cumplimiento: resumen.total_tareas > 0
          ? Math.round((resumen.tareas_completadas / resumen.total_tareas) * 1000) / 10
          : 0,
        Empleados: empleados || []
      }
    });
  } catch (error) {
    logger.error('Error getting cleaning KPIs:', error);
    res.status(500).json({ success: false, message: 'Error al obtener KPIs de limpieza' });
  }
};

const getOcupacionReport = async (req, res) => {
  try {
    const { anio, mes } = req.query;
    const primerDia = anio && mes ? new Date(anio, mes - 1, 1) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const ultimoDia = new Date(primerDia.getFullYear(), primerDia.getMonth() + 1, 0);
    const diasDelMes = ultimoDia.getDate();

    const query = `
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

    const result = await db.query(query, { primerDia, ultimoDia });
    const data = (result || []).map(r => ({
      numero_habitacion: r.numero_habitacion,
      tipo: r.tipo,
      dias_ocupada: r.dias_ocupada || 0,
      porcentaje: Math.round(((r.dias_ocupada || 0) / diasDelMes) * 1000) / 10
    }));

    res.json({ success: true, data });
  } catch (error) {
    logger.error('Error getting occupation report:', error);
    res.status(500).json({ success: false, message: 'Error al obtener reporte de ocupación' });
  }
};

const getDailyReport = async (req, res) => {
  try {
    const { fecha } = req.query;
    const fechaConsulta = fecha ? new Date(fecha) : new Date();

    const query = `
      SELECT
        (SELECT COUNT(*) FROM dbo.estadia WHERE CAST(check_in AS DATE) = CAST(@fecha AS DATE)) as checkins,
        (SELECT COUNT(*) FROM dbo.estadia WHERE CAST(check_out AS DATE) = CAST(@fecha AS DATE)) as checkouts,
        (SELECT COUNT(*) FROM dbo.tarea_limpieza WHERE CAST(created_at AS DATE) = CAST(@fecha AS DATE)) as tareas_total,
        (SELECT COUNT(*) FROM dbo.tarea_limpieza WHERE fin IS NOT NULL AND CAST(fin AS DATE) = CAST(@fecha AS DATE)) as tareas_completadas
    `;

    const result = await db.query(query, { fecha: fechaConsulta });
    const resumen = result[0] || {};

    const porEstadoQuery = `
      SELECT eh.nombre as estado, COUNT(*) as cantidad
      FROM dbo.habitacion h
      INNER JOIN dbo.estado_habitacion eh ON h.id_estado_actual = eh.id_estado
      GROUP BY eh.nombre
    `;
    const porEstado = await db.query(porEstadoQuery);

    res.json({
      success: true,
      data: {
        fecha: fechaConsulta.toISOString().split('T')[0],
        checkins: resumen.checkins || 0,
        checkouts: resumen.checkouts || 0,
        tareas_limpieza: {
          total: resumen.tareas_total || 0,
          completadas: resumen.tareas_completadas || 0,
          pendientes: (resumen.tareas_total || 0) - (resumen.tareas_completadas || 0)
        },
        habitaciones_por_estado: porEstado || []
      }
    });
  } catch (error) {
    logger.error('Error getting daily report:', error);
    res.status(500).json({ success: false, message: 'Error al obtener reporte diario' });
  }
};

const getMantenimientoKPIs = async (req, res) => {
  try {
    const query = `
      SELECT
        COUNT(*) as total_tickets,
        SUM(CASE WHEN UPPER(estado) = 'PENDIENTE' THEN 1 ELSE 0 END) as pendientes,
        SUM(CASE WHEN UPPER(estado) = 'EN_PROCESO' THEN 1 ELSE 0 END) as en_proceso,
        SUM(CASE WHEN UPPER(estado) = 'COMPLETADO' THEN 1 ELSE 0 END) as completados,
        AVG(CASE WHEN inicio IS NOT NULL AND fin IS NOT NULL THEN DATEDIFF(MINUTE, inicio, fin) END) as tiempo_promedio,
        SUM(costo_materiales) as costo_total
      FROM dbo.ticket_mantenimiento
    `;
    const result = await db.query(query);
    const resumen = result[0] || {};

    const categoriaQuery = `
      SELECT c.nombre as categoria, COUNT(*) as cantidad,
             AVG(CASE WHEN t.inicio IS NOT NULL AND t.fin IS NOT NULL THEN DATEDIFF(MINUTE, t.inicio, t.fin) END) as tiempo_promedio
      FROM dbo.ticket_mantenimiento t
      LEFT JOIN dbo.categoria_mantenimiento c ON t.id_categoria = c.id_categoria
      GROUP BY c.nombre
    `;
    const porCategoria = await db.query(categoriaQuery);

    res.json({
      success: true,
      data: {
        total_tickets: resumen.total_tickets || 0,
        pendientes: resumen.pendientes || 0,
        en_proceso: resumen.en_proceso || 0,
        completados: resumen.completados || 0,
        tiempo_promedio: resumen.tiempo_promedio ? Math.round(resumen.tiempo_promedio) : 0,
        costo_total: resumen.costo_total || 0,
        por_categoria: (porCategoria || []).map(c => ({
          categoria: c.categoria || 'Sin categoría',
          cantidad: c.cantidad,
          tiempo_promedio: c.tiempo_promedio ? Math.round(c.tiempo_promedio) : 0
        }))
      }
    });
  } catch (error) {
    logger.error('Error getting maintenance KPIs:', error);
    res.status(500).json({ success: false, message: 'Error al obtener KPIs de mantenimiento' });
  }
};

const getHistorialReportes = async (req, res) => {
  try {
    const query = `
      SELECT id_reporte, tipo, fecha_reporte, formato, ruta_archivo, generado_por, created_at
      FROM dbo.reporte_generado
      ORDER BY created_at DESC
    `;
    const result = await db.query(query);
    res.json({ success: true, data: result || [] });
  } catch (error) {
    logger.error('Error getting report history:', error);
    res.status(500).json({ success: false, message: 'Error al obtener historial de reportes' });
  }
};

const descargarReporte = async (req, res) => {
  try {
    const { id } = req.params;
    const query = `
      SELECT TOP 1 id_reporte, tipo, fecha_reporte, formato, ruta_archivo
      FROM dbo.reporte_generado
      WHERE id_reporte = @id
    `;
    const result = await db.query(query, { id: parseInt(id) });
    if (!result || result.length === 0) {
      return res.status(404).json({ success: false, message: 'Reporte no encontrado' });
    }

    const reporte = result[0];
    let filePath = reporte.ruta_archivo;
    if (!path.isAbsolute(filePath)) {
      filePath = path.resolve(__dirname, '../../', filePath);
    }

    if (!fs.existsSync(filePath)) {
      logger.warn(`Report file not found on disk: ${filePath}`);
      return res.status(404).json({ success: false, message: 'El archivo físico del reporte no se encuentra en el servidor' });
    }

    const filename = path.basename(filePath);
    res.download(filePath, filename);
  } catch (error) {
    logger.error('Error downloading report:', error);
    res.status(500).json({ success: false, message: 'Error al descargar el reporte' });
  }
};

const generateReport = async (req, res) => {
  try {
    const { tipo = 'DIARIO', formato = 'PDF', fecha, anio, mes } = req.body || {};
    const resultado = await generarReporteYRegistrar({
      tipo,
      formato,
      fecha: fecha ? new Date(fecha) : new Date(),
      anio: anio ? parseInt(anio) : undefined,
      mes: mes ? parseInt(mes) : undefined,
      generado_por: 'MANUAL'
    });
    return res.json({ success: true, data: resultado, message: 'Reporte generado y guardado exitosamente' });
  } catch (error) {
    logger.error('Error generating report:', error);
    res.status(500).json({ success: false, message: 'Error al generar reporte' });
  }
};

const exportReport = async (req, res) => {
  try {
    const { formato } = req.body;
    return res.json({ success: true, message: `Reporte exportado como ${formato || 'pdf'}` });
  } catch (error) {
    logger.error('Error exporting report:', error);
    res.status(500).json({ success: false, message: 'Error al exportar reporte' });
  }
};

module.exports = {
  getDashboardKPIs,
  getLimpiezaKPIs,
  getOcupacionReport,
  getDailyReport,
  getMantenimientoKPIs,
  getHistorialReportes,
  descargarReporte,
  getKPIs: getDashboardKPIs,
  getOccupancyReport: getOcupacionReport,
  generateReport,
  exportReport
};
