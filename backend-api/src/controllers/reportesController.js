const db = require('../config/database');
const config = require('../config/env');
const logger = require('../middlewares/logger');

/**
 * Get dashboard KPIs
 */
const getDashboardKPIs = async (req, res) => {
  try {
    const isDemoMode = !db.isConnected();
    
    if (isDemoMode) {
      return res.json({
        success: true,
        data: {
          habitaciones_totales: 20,
          habitaciones_disponibles: 12,
          habitaciones_ocupadas: 5,
          habitaciones_limpieza: 2,
          habitaciones_mantenimiento: 1,
          porcentaje_ocupacion: 25,
          checkins_hoy: 3,
          checkouts_hoy: 2,
          tareas_limpieza_pendientes: 5,
          tareas_limpieza_completadas_hoy: 8,
          tickets_mantenimiento_pendientes: 3,
          tickets_mantenimiento_en_proceso: 1,
          tiempo_promedio_limpieza: 28,
          tiempo_promedio_mantenimiento: 55
        }
      });
    }

    // Query for KPIs from database
    const query = `
      SELECT 
        (SELECT COUNT(*) FROM Habitacion WHERE activo = 1) as habitaciones_totales,
        (SELECT COUNT(*) FROM Habitacion h INNER JOIN EstadoHabitacion eh ON h.id_estado = eh.id WHERE eh.nombre = 'Disponible' AND h.activo = 1) as habitaciones_disponibles,
        (SELECT COUNT(*) FROM Habitacion h INNER JOIN EstadoHabitacion eh ON h.id_estado = eh.id WHERE eh.nombre = 'Ocupada' AND h.activo = 1) as habitaciones_ocupadas
    `;
    
    const result = await db.query(query);
    res.json({ success: true, data: result[0] });
  } catch (error) {
    logger.error('Error getting dashboard KPIs:', error);
    res.status(500).json({ success: false, message: 'Error al obtener KPIs del dashboard' });
  }
};

/**
 * Get cleaning KPIs
 */
const getLimpiezaKPIs = async (req, res) => {
  try {
    const { fecha_inicio, fecha_fin } = req.query;
    const isDemoMode = !db.isConnected();
    
    if (isDemoMode) {
      return res.json({
        success: true,
        data: {
          total_tareas: 45,
          tareas_completadas: 38,
          tareas_pendientes: 7,
          tiempo_promedio: 28,
          tareas_fuera_estandar: 5,
          porcentaje_cumplimiento: 84.4,
          Empleados: [
            { id: 3, nombre: 'María García', tareas_completadas: 20, tiempo_promedio: 26 },
            { id: 5, nombre: 'Ana López', tareas_completadas: 18, tiempo_promedio: 30 }
          ]
        }
      });
    }

    // Query for cleaning KPIs
    const query = `
      EXEC sp_calcular_kpi_limpieza @fecha_inicio, @fecha_fin
    `;
    
    const result = await db.query(query, { 
      fecha_inicio: new Date(fecha_inicio), 
      fecha_fin: new Date(fecha_fin) 
    });
    res.json({ success: true, data: result });
  } catch (error) {
    logger.error('Error getting cleaning KPIs:', error);
    res.status(500).json({ success: false, message: 'Error al obtener KPIs de limpieza' });
  }
};

/**
 * Get occupation report
 */
const getOcupacionReport = async (req, res) => {
  try {
    const { año, mes } = req.query;
    const isDemoMode = !db.isConnected();
    
    if (isDemoMode) {
      return res.json({
        success: true,
        data: [
          { numero_habitacion: '101', tipo: 'Individual', dias_ocupada: 15, porcentaje: 50 },
          { numero_habitacion: '102', tipo: 'Doble', dias_ocupada: 22, porcentaje: 73.3 },
          { numero_habitacion: '103', tipo: 'Twin', dias_ocupada: 18, porcentaje: 60 },
          { numero_habitacion: '201', tipo: 'Suite', dias_ocupada: 10, porcentaje: 33.3 },
          { numero_habitacion: '301', tipo: 'Suite Presidencial', dias_ocupada: 5, porcentaje: 16.7 }
        ]
      });
    }

    const query = `EXEC sp_reporte_ocupacion_mensual @año, @mes`;
    const result = await db.query(query, { año: parseInt(año), mes: parseInt(mes) });
    res.json({ success: true, data: result });
  } catch (error) {
    logger.error('Error getting occupation report:', error);
    res.status(500).json({ success: false, message: 'Error al obtener reporte de ocupación' });
  }
};

/**
 * Get daily report
 */
const getDailyReport = async (req, res) => {
  try {
    const { fecha } = req.query;
    const isDemoMode = !db.isConnected();
    
    if (isDemoMode) {
      return res.json({
        success: true,
        data: {
          fecha: fecha || new Date().toISOString().split('T')[0],
          checkins: 3,
          checkouts: 2,
          tareas_limpieza: { total: 10, completadas: 8, pendientes: 2 },
          tickets_mantenimiento: { total: 4, pendientes: 3, en_proceso: 1, completados: 0 },
          habitaciones_por_estado: [
            { estado: 'Disponible', cantidad: 12 },
            { estado: 'Ocupada', cantidad: 5 },
            { estado: 'Limpieza', cantidad: 2 },
            { estado: 'Mantenimiento', cantidad: 1 }
          ]
        }
      });
    }

    const query = `EXEC sp_generar_reporte_diario @fecha`;
    const result = await db.query(query, { fecha: new Date(fecha) });
    res.json({ success: true, data: result });
  } catch (error) {
    logger.error('Error getting daily report:', error);
    res.status(500).json({ success: false, message: 'Error al obtener reporte diario' });
  }
};

/**
 * Get maintenance KPIs
 */
const getMantenimientoKPIs = async (req, res) => {
  try {
    const isDemoMode = !db.isConnected();
    
    if (isDemoMode) {
      return res.json({
        success: true,
        data: {
          total_tickets: 15,
          pendientes: 3,
          en_proceso: 2,
          completados: 10,
          tiempo_promedio: 55,
          costo_total: 1250,
          por_categoria: [
            { categoria: 'Eléctrica', cantidad: 5, tiempo_promedio: 45 },
            { categoria: 'Plomería', cantidad: 4, tiempo_promedio: 60 },
            { categoria: 'Aire Acondicionado', cantidad: 3, tiempo_promedio: 90 },
            { categoria: 'Mobiliario', cantidad: 3, tiempo_promedio: 30 }
          ]
        }
      });
    }

    const query = `
      SELECT 
        COUNT(*) as total_tickets,
        SUM(CASE WHEN estado = 'Pendiente' THEN 1 ELSE 0 END) as pendientes,
        SUM(CASE WHEN estado = 'EnProceso' THEN 1 ELSE 0 END) as en_proceso,
        SUM(CASE WHEN estado = 'Completado' THEN 1 ELSE 0 END) as completados,
        AVG(tiempo_minutos) as tiempo_promedio,
        SUM(costo_real) as costo_total
      FROM TicketMantenimiento
      WHERE activo = 1
    `;
    
    const result = await db.query(query);
    res.json({ success: true, data: result[0] });
  } catch (error) {
    logger.error('Error getting maintenance KPIs:', error);
    res.status(500).json({ success: false, message: 'Error al obtener KPIs de mantenimiento' });
  }
};

/**
 * Generate report
 */
const generateReport = async (req, res) => {
  try {
    const { tipo, fecha_inicio, fecha_fin } = req.body;
    const isDemoMode = !db.isConnected();

    if (isDemoMode) {
      return res.json({
        success: true,
        data: {
          tipo: tipo || 'general',
          fecha_inicio: fecha_inicio || new Date().toISOString().split('T')[0],
          fecha_fin: fecha_fin || new Date().toISOString().split('T')[0],
          resultados: []
        },
        message: 'Reporte generado en modo demo'
      });
    }

    // Placeholder: implement report generation logic here
    return res.json({ success: true, data: [], message: 'Reporte generado' });
  } catch (error) {
    logger.error('Error generating report:', error);
    res.status(500).json({ success: false, message: 'Error al generar reporte' });
  }
};

/**
 * Export report
 */
const exportReport = async (req, res) => {
  try {
    const { tipo, formato } = req.body;
    const isDemoMode = !db.isConnected();

    if (isDemoMode) {
      return res.json({ success: true, message: `Reporte exportado en modo demo como ${formato || 'pdf'}` });
    }

    // Placeholder: implement export logic here
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
  getKPIs: getDashboardKPIs,
  getOccupancyReport: getOcupacionReport,
  generateReport,
  exportReport
};
