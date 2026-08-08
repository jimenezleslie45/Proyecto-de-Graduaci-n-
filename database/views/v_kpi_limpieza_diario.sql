-- =====================================================
-- VIEW: KPI de Limpieza Diario
-- =====================================================
CREATE VIEW v_kpi_limpieza_diario AS
SELECT 
    CAST(tl.fecha_asignacion AS DATE) AS fecha,
    COUNT(*) AS total_tareas,
    SUM(CASE WHEN tl.estado = 'Completada' THEN 1 ELSE 0 END) AS tareas_completadas,
    AVG(tl.tiempo_minutos) AS tiempo_promedio,
    SUM(CASE WHEN tl.tiempo_minutos > ISNULL(st.tiempo_minutos, 30) THEN 1 ELSE 0 END) AS tareas_fuera_estandar,
    e.codigo_empleado,
    p.nombres + ' ' + p.apellidos AS nombre_empleado
FROM TareaLimpieza tl
LEFT JOIN Empleado e ON tl.id_empleado_asignado = e.id
LEFT JOIN Persona p ON e.id_persona = p.id
LEFT JOIN StandardTiempo st ON st.tipo_tarea = 'Limpieza' 
    AND (st.tipo_habitacion IS NULL OR st.tipo_habitacion = (
        SELECT th.nombre FROM TipoHabitacion th 
        INNER JOIN Habitacion h ON h.id_tipo_habitacion = th.id 
        WHERE h.id = tl.id_habitacion
    ))
WHERE tl.activo = 1
GROUP BY CAST(tl.fecha_asignacion AS DATE), e.codigo_empleado, p.nombres, p.apellidos;
GO

-- =====================================================
-- VIEW: Estado de Habitaciones Resumen
-- =====================================================
CREATE VIEW v_estado_habitaciones_resumen AS
SELECT 
    h.id,
    h.numero,
    h.piso,
    th.nombre AS tipo_habitacion,
    eh.nombre AS estado,
    eh.color,
    CASE 
        WHEN eh.nombre = 'Disponible' THEN 0
        WHEN eh.nombre = 'Ocupada' THEN 1
        WHEN eh.nombre = 'Limpieza' THEN 2
        WHEN eh.nombre = 'Mantenimiento' THEN 3
        ELSE 4
    AS orden_estado
FROM Habitacion h
INNER JOIN TipoHabitacion th ON h.id_tipo_habitacion = th.id
INNER JOIN EstadoHabitacion eh ON h.id_estado = eh.id
WHERE h.activo = 1;
GO

-- =====================================================
-- VIEW: Mantenimiento Pendiente
-- =====================================================
CREATE VIEW v_mantenimiento_pendiente AS
SELECT 
    tm.id,
    tm.numero_ticket,
    tm.titulo,
    tm.descripcion,
    tm.prioridad,
    tm.fecha_reportado,
    tm.estado,
    h.numero AS numero_habitacion,
    h.piso,
    cm.nombre AS categoria,
    p.nombres + ' ' + p.apellidos AS reportado_por,
    pe.nombres + ' ' + pe.apellidos AS asignado_a,
    DATEDIFF(MINUTE, tm.fecha_reportado, GETDATE()) AS tiempo_espera_minutos
FROM TicketMantenimiento tm
INNER JOIN Habitacion h ON tm.id_habitacion = h.id
INNER JOIN CategoriaMantenimiento cm ON tm.id_categoria = cm.id
INNER JOIN Empleado empR ON tm.id_empleado_reporta = empR.id
INNER JOIN Persona p ON empR.id_persona = p.id
LEFT JOIN Empleado empA ON tm.id_empleado_asignado = empA.id
LEFT JOIN Persona pe ON empA.id_persona = pe.id
WHERE tm.activo = 1 
    AND tm.estado IN ('Pendiente', 'EnProceso')
ORDER BY tm.prioridad ASC, tm.fecha_reportado ASC;
GO

PRINT 'Views created successfully.';
