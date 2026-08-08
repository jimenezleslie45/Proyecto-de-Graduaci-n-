-- =====================================================
-- Stored Procedure: Calcular KPI de Limpieza
-- =====================================================
CREATE PROCEDURE sp_calcular_kpi_limpieza
    @fecha_inicio DATE,
    @fecha_fin DATE
AS
BEGIN
    SET NOCOUNT ON;
    
    SELECT 
        COUNT(*) AS total_tareas,
        SUM(CASE WHEN estado = 'Completada' THEN 1 ELSE 0 END) AS tareas_completadas,
        AVG(tiempo_minutos) AS tiempo_promedio_minutos,
        SUM(CASE WHEN tiempo_minutos > st.tiempo_minutos THEN 1 ELSE 0 END) AS tareas_fuera_estandar,
        (SUM(CASE WHEN tiempo_minutos > st.tiempo_minutos THEN 1 ELSE 0 END) * 100.0 / COUNT(*)) AS porcentaje_fuera_estandar
    FROM TareaLimpieza tl
    CROSS APPLY (
        SELECT TOP 1 tiempo_minutos 
        FROM StandardTiempo 
        WHERE tipo_tarea = 'Limpieza' 
        AND (tipo_habitacion IS NULL OR tipo_habitacion = (
            SELECT th.nombre 
            FROM TipoHabitacion th 
            INNER JOIN Habitacion h ON h.id_tipo_habitacion = th.id 
            WHERE h.id = tl.id_habitacion
        ))
    ) st
    WHERE CAST(fecha_asignacion AS DATE) BETWEEN @fecha_inicio AND @fecha_fin
    AND tl.activo = 1;
END;
GO

-- =====================================================
-- Stored Procedure: Reporte de Ocupación Mensual
-- =====================================================
CREATE PROCEDURE sp_reporte_ocupacion_mensual
    @año INT,
    @mes INT
AS
BEGIN
    SET NOCOUNT ON;
    
    DECLARE @fecha_inicio DATE = DATEFROMPARTS(@año, @mes, 1);
    DECLARE @fecha_fin DATE = EOMONTH(@fecha_inicio);
    
    SELECT 
        h.numero AS numero_habitacion,
        h.piso,
        th.nombre AS tipo_habitacion,
        COUNT(e.id) AS dias_ocupada,
        DATEDIFF(DAY, @fecha_inicio, @fecha_fin) + 1 AS dias_del_mes,
        (COUNT(e.id) * 100.0 / (DATEDIFF(DAY, @fecha_inicio, @fecha_fin) + 1)) AS porcentaje_ocupacion
    FROM Habitacion h
    INNER JOIN TipoHabitacion th ON h.id_tipo_habitacion = th.id
    LEFT JOIN Estadia e ON e.id_habitacion = h.id
        AND CAST(e.fecha_checkin AS DATE) <= @fecha_fin
        AND (CAST(e.fecha_checkout AS DATE) >= @fecha_inicio OR e.fecha_checkout IS NULL)
        AND e.activo = 1
    WHERE h.activo = 1
    GROUP BY h.id, h.numero, h.piso, th.nombre
    ORDER BY h.piso, h.numero;
END;
GO

-- =====================================================
-- Stored Procedure: Generar Reporte Diario
-- =====================================================
CREATE PROCEDURE sp_generar_reporte_diario
    @fecha DATE
AS
BEGIN
    SET NOCOUNT ON;
    
    -- Resumen de check-ins y check-outs
    SELECT 
        'Check-ins' AS tipo_operacion,
        COUNT(*) AS cantidad
    FROM Estadia
    WHERE CAST(fecha_checkin AS DATE) = @fecha AND activo = 1
    UNION ALL
    SELECT 
        'Check-outs' AS tipo_operacion,
        COUNT(*) AS cantidad
    FROM Estadia
    WHERE CAST(fecha_checkout AS DATE) = @fecha AND activo = 1;
    
    -- Tareas de limpieza del día
    SELECT 
        COUNT(*) AS total_tareas,
        SUM(CASE WHEN estado = 'Completada' THEN 1 ELSE 0 END) AS completadas,
        SUM(CASE WHEN estado = 'Pendiente' THEN 1 ELSE 0 END) AS pendientes,
        SUM(CASE WHEN estado = 'EnProceso' THEN 1 ELSE 0 END) AS en_proceso
    FROM TareaLimpieza
    WHERE CAST(fecha_asignacion AS DATE) = @fecha AND activo = 1;
    
    -- Tickets de mantenimiento
    SELECT 
        COUNT(*) AS total_tickets,
        SUM(CASE WHEN estado = 'Pendiente' THEN 1 ELSE 0 END) AS pendientes,
        SUM(CASE WHEN estado = 'EnProceso' THEN 1 ELSE 0 END) AS en_proceso,
        SUM(CASE WHEN estado = 'Completado' THEN 1 ELSE 0 END) AS completados
    FROM TicketMantenimiento
    WHERE CAST(fecha_reportado AS DATE) = @fecha AND activo = 1;
    
    -- Estado de habitaciones
    SELECT 
        eh.nombre AS estado,
        COUNT(*) AS cantidad
    FROM Habitacion h
    INNER JOIN EstadoHabitacion eh ON h.id_estado = eh.id
    WHERE h.activo = 1
    GROUP BY eh.nombre;
END;
GO

PRINT 'Stored procedures created successfully.';
