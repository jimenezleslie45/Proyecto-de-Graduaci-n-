-- =====================================================
-- SEED: Tickets de Mantenimiento (PANTALLA 9 - Ejecución)
-- Inserta tickets de ejemplo para que la pantalla de
-- ejecución de mantenimiento muestre datos.
-- Usa subconsultas para obtener IDs válidos existentes.
-- =====================================================

-- Solo inserta si no existen tickets
IF NOT EXISTS (SELECT 1 FROM TicketMantenimiento)
BEGIN
    -- Ticket 1: Pendiente (Eléctrico)
    INSERT INTO TicketMantenimiento (
        id_habitacion, id_categoria, id_empleado_reporta, id_empleado_asignado,
        numero_ticket, titulo, descripcion, prioridad, fecha_reportado,
        estado, costo_estimado, activo
    )
    VALUES (
        (SELECT TOP 1 id FROM Habitacion WHERE activo = 1),
        (SELECT TOP 1 id FROM CategoriaMantenimiento WHERE nombre = 'Eléctrica'),
        (SELECT TOP 1 e.id FROM Empleado e INNER JOIN Rol r ON e.id_rol = r.id WHERE r.nombre = 'Mantenimiento'),
        NULL,
        'TM001', 'Foco fundido', 'El foco del baño no funciona', 1,
        DATEADD(HOUR, -2, GETDATE()), 'Pendiente', 50, 1
    );

    -- Ticket 2: Pendiente (Plomería)
    INSERT INTO TicketMantenimiento (
        id_habitacion, id_categoria, id_empleado_reporta, id_empleado_asignado,
        numero_ticket, titulo, descripcion, prioridad, fecha_reportado,
        estado, costo_estimado, activo
    )
    VALUES (
        (SELECT TOP 1 id FROM Habitacion WHERE activo = 1),
        (SELECT TOP 1 id FROM CategoriaMantenimiento WHERE nombre = 'Plomería'),
        (SELECT TOP 1 e.id FROM Empleado e INNER JOIN Rol r ON e.id_rol = r.id WHERE r.nombre = 'Mantenimiento'),
        (SELECT TOP 1 e.id FROM Empleado e INNER JOIN Rol r ON e.id_rol = r.id WHERE r.nombre = 'Mantenimiento'),
        'TM002', 'Goteo en lavabo', 'El lavabo del baño tiene un goteo constante', 2,
        GETDATE(), 'Pendiente', NULL, 1
    );

    -- Ticket 3: En proceso (para probar el timer)
    INSERT INTO TicketMantenimiento (
        id_habitacion, id_categoria, id_empleado_reporta, id_empleado_asignado,
        numero_ticket, titulo, descripcion, prioridad, fecha_reportado, fecha_inicio,
        estado, costo_estimado, activo
    )
    VALUES (
        (SELECT TOP 1 id FROM Habitacion WHERE activo = 1),
        (SELECT TOP 1 id FROM CategoriaMantenimiento WHERE nombre = 'Aire Acondicionado'),
        (SELECT TOP 1 e.id FROM Empleado e INNER JOIN Rol r ON e.id_rol = r.id WHERE r.nombre = 'Mantenimiento'),
        (SELECT TOP 1 e.id FROM Empleado e INNER JOIN Rol r ON e.id_rol = r.id WHERE r.nombre = 'Mantenimiento'),
        'TM003', 'AC no enfría', 'El aire acondicionado no enfría correctamente', 1,
        DATEADD(HOUR, -1, GETDATE()), DATEADD(MINUTE, -10, GETDATE()),
        'EnProceso', NULL, 1
    );

    PRINT 'Tickets de mantenimiento de ejemplo insertados correctamente.';
END
ELSE
BEGIN
    PRINT 'Ya existen tickets de mantenimiento. No se insertaron datos.';
END
GO
