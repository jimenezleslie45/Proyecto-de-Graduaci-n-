from src.database.connection import execute_query, execute_stored_procedure
from datetime import datetime
import os

def generate_report(tipo, fecha_inicio, fecha_fin, formato='pdf'):
    """Generate a report based on type"""
    
    if tipo == 'limpieza':
        data = get_cleaning_report(fecha_inicio, fecha_fin)
    elif tipo == 'mantenimiento':
        data = get_maintenance_report(fecha_inicio, fecha_fin)
    elif tipo == 'ocupacion':
        data = get_occupancy_report(fecha_inicio, fecha_fin)
    else:
        data = {'error': 'Tipo de reporte no válido'}
    
    return {
        'tipo': tipo,
        'fecha_generacion': datetime.now().isoformat(),
        'formato': formato,
        'data': data
    }

def get_cleaning_report(fecha_inicio, fecha_fin):
    """Get cleaning report data"""
    query = """
    SELECT 
        CAST(tl.fecha_asignacion AS DATE) as fecha,
        COUNT(*) as total_tareas,
        SUM(CASE WHEN tl.estado = 'Completada' THEN 1 ELSE 0 END) as completadas,
        AVG(tl.tiempo_minutos) as tiempo_promedio
    FROM TareaLimpieza tl
    WHERE CAST(tl.fecha_asignacion AS DATE) BETWEEN ? AND ?
    AND tl.activo = 1
    GROUP BY CAST(tl.fecha_asignacion AS DATE)
    ORDER BY fecha
    """
    return execute_query(query, (fecha_inicio, fecha_fin))

def get_maintenance_report(fecha_inicio, fecha_fin):
    """Get maintenance report data"""
    query = """
    SELECT 
        CAST(tm.fecha_reportado AS DATE) as fecha,
        cm.nombre as categoria,
        COUNT(*) as total,
        SUM(CASE WHEN tm.estado = 'Pendiente' THEN 1 ELSE 0 END) as pendientes,
        SUM(CASE WHEN tm.estado = 'Completado' THEN 1 ELSE 0 END) as completados,
        SUM(ISNULL(tm.costo_real, 0)) as costo_total
    FROM TicketMantenimiento tm
    INNER JOIN CategoriaMantenimiento cm ON tm.id_categoria = cm.id
    WHERE CAST(tm.fecha_reportado AS DATE) BETWEEN ? AND ?
    AND tm.activo = 1
    GROUP BY CAST(tm.fecha_reportado AS DATE), cm.nombre
    ORDER BY fecha
    """
    return execute_query(query, (fecha_inicio, fecha_fin))

def get_occupancy_report(fecha_inicio, fecha_fin):
    """Get occupancy report data"""
    query = """
    SELECT 
        h.numero as habitacion,
        h.piso,
        th.nombre as tipo,
        COUNT(e.id) as dias_ocupada
    FROM Habitacion h
    INNER JOIN TipoHabitacion th ON h.id_tipo_habitacion = th.id
    LEFT JOIN Estadia e ON e.id_habitacion = h.id
        AND CAST(e.fecha_checkin AS DATE) <= ?
        AND (CAST(e.fecha_checkout AS DATE) >= ? OR e.fecha_checkout IS NULL)
        AND e.activo = 1
    WHERE h.activo = 1
    GROUP BY h.id, h.numero, h.piso, th.nombre
    ORDER BY h.piso, h.numero
    """
    return execute_query(query, (fecha_fin, fecha_inicio))

def generate_occupancy_report(año, mes):
    """Generate monthly occupancy report using stored procedure"""
    result = execute_stored_procedure('sp_reporte_ocupacion_mensual', (año, mes))
    return result if result else []
