from src.database.connection import execute_query, execute_stored_procedure
from datetime import datetime, timedelta

def get_cleaning_kpis(fecha_inicio, fecha_fin):
    """Calculate cleaning KPIs"""
    query = """
    SELECT 
        COUNT(*) as total_tareas,
        SUM(CASE WHEN estado = 'Completada' THEN 1 ELSE 0 END) as tareas_completadas,
        AVG(tiempo_minutos) as tiempo_promedio_minutos,
        SUM(CASE WHEN tiempo_minutos > ISNULL(st.tiempo_minutos, 30) THEN 1 ELSE 0 END) as tareas_fuera_estandar
    FROM TareaLimpieza tl
    LEFT JOIN StandardTiempo st ON st.tipo_tarea = 'Limpieza' AND st.tipo_habitacion IS NULL
    WHERE CAST(tl.fecha_asignacion AS DATE) BETWEEN ? AND ?
    AND tl.activo = 1
    """
    return execute_query(query, (fecha_inicio, fecha_fin))

def get_maintenance_kpis(fecha_inicio, fecha_fin):
    """Calculate maintenance KPIs"""
    query = """
    SELECT 
        COUNT(*) as total_tickets,
        SUM(CASE WHEN estado = 'Pendiente' THEN 1 ELSE 0 END) as pendientes,
        SUM(CASE WHEN estado = 'EnProceso' THEN 1 ELSE 0 END) as en_proceso,
        SUM(CASE WHEN estado = 'Completado' THEN 1 ELSE 0 END) as completados,
        AVG(tiempo_minutos) as tiempo_promedio_minutos,
        SUM(ISNULL(costo_real, 0)) as costo_total
    FROM TicketMantenimiento
    WHERE CAST(fecha_reportado AS DATE) BETWEEN ? AND ?
    AND activo = 1
    """
    return execute_query(query, (fecha_inicio, fecha_fin))

def get_occupancy_kpis(fecha_inicio, fecha_fin):
    """Calculate occupancy KPIs"""
    query = """
    SELECT 
        COUNT(DISTINCT id_habitacion) as habitaciones_ocupadas,
        (SELECT COUNT(*) FROM Habitacion WHERE activo = 1) as total_habitaciones
    FROM Estadia
    WHERE estado = 'Activa' 
    AND activo = 1
    """
    result = execute_query(query)
    if result and len(result) > 0:
        total = result[0]['total_habitaciones'] or 1
        occupied = result[0]['habitaciones_ocupadas'] or 0
        return {
            'tasa_ocupacion': round((occupied / total) * 100, 2),
            'habitaciones_ocupadas': occupied,
            'total_habitaciones': total
        }
    return {'tasa_ocupacion': 0, 'habitaciones_ocupadas': 0, 'total_habitaciones': 0}

def get_all_kpis(fecha_inicio=None, fecha_fin=None):
    """Get all KPIs for dashboard"""
    if not fecha_inicio:
        fecha_inicio = (datetime.now() - timedelta(days=30)).strftime('%Y-%m-%d')
    if not fecha_fin:
        fecha_fin = datetime.now().strftime('%Y-%m-%d')
    
    cleaning = get_cleaning_kpis(fecha_inicio, fecha_fin)
    maintenance = get_maintenance_kpis(fecha_inicio, fecha_fin)
    occupancy = get_occupancy_kpis(fecha_inicio, fecha_fin)
    
    return {
        'limpieza': cleaning[0] if cleaning else {},
        'mantenimiento': maintenance[0] if maintenance else {},
        'ocupacion': occupancy,
        'periodo': {
            'inicio': fecha_inicio,
            'fin': fecha_fin
        }
    }
