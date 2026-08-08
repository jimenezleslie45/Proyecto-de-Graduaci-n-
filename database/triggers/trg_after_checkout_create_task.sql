-- =====================================================
-- TRIGGER: After CheckOut - Create Cleaning Task
-- =====================================================
CREATE TRIGGER trg_after_checkout_create_task
ON Estadia
AFTER UPDATE
AS
BEGIN
    SET NOCOUNT ON;
    
    -- Only proceed if checkout date was set
    IF UPDATE(fecha_checkout)
    BEGIN
        INSERT INTO TareaLimpieza (
            id_habitacion,
            id_empleado_encargado,
            numero_tarea,
            tipo_tarea,
            prioridad,
            fecha_asignacion,
            estado,
            activo,
            fecha_creacion,
            fecha_actualizacion
        )
        SELECT 
            i.id_habitacion,
            i.id_empleado_checkin,
            'TL-' + CONVERT(VARCHAR(10), GETDATE(), 112) + '-' + RIGHT('000' + CAST((SELECT COUNT(*) FROM TareaLimpieza WHERE CAST(fecha_creacion AS DATE) = CAST(GETDATE() AS DATE)) + 1 AS VARCHAR(3)), 3),
            'CheckOut',
            2, -- Normal priority
            GETDATE(),
            'Pendiente',
            1,
            GETDATE(),
            GETDATE()
        FROM inserted i
        INNER JOIN deleted d ON i.id = d.id
        WHERE i.fecha_checkout IS NOT NULL 
            AND d.fecha_checkout IS NULL
            AND i.estado = 'CheckOut';
        
        -- Update room status to Limpieza
        UPDATE Habitacion
        SET id_estado = (SELECT id FROM EstadoHabitacion WHERE nombre = 'Limpieza'),
            fecha_actualizacion = GETDATE()
        WHERE id IN (SELECT id_habitacion FROM inserted WHERE fecha_checkout IS NOT NULL);
    END
END;
GO

-- =====================================================
-- TRIGGER: Log User Activity
-- =====================================================
CREATE TRIGGER trg_log_user_activity
ON Usuario
AFTER INSERT, UPDATE, DELETE
AS
BEGIN
    SET NOCOUNT ON;
    
    DECLARE @id_usuario INT;
    DECLARE @accion VARCHAR(50);
    DECLARE @datos_anteriores TEXT;
    DECLARE @datos_nuevos TEXT;
    
    IF EXISTS (SELECT 1 FROM inserted)
    BEGIN
        IF EXISTS (SELECT 1 FROM deleted)
        BEGIN
            -- Update operation
            SET @accion = 'UPDATE';
            SET @id_usuario = (SELECT id FROM inserted);
            
            -- Log would be created for actual user activity in production
            INSERT INTO AuditLog (id_usuario, accion, entidad, id_registro, datos_anteriores, datos_nuevos)
            SELECT 
                @id_usuario,
                @accion,
                'Usuario',
                id,
                (SELECT username FROM deleted FOR JSON PATH),
                (SELECT username FROM inserted FOR JSON PATH),
                'SYSTEM',
                'SYSTEM',
                GETDATE()
            FROM inserted;
        END
        ELSE
        BEGIN
            -- Insert operation
            SET @accion = 'INSERT';
            
            INSERT INTO AuditLog (id_usuario, accion, entidad, id_registro, datos_nuevos)
            SELECT 
                id,
                @accion,
                'Usuario',
                id,
                (SELECT username FROM inserted FOR JSON PATH),
                'SYSTEM',
                'SYSTEM',
                GETDATE()
            FROM inserted;
        END
    END
    ELSE IF EXISTS (SELECT 1 FROM deleted)
    BEGIN
        -- Delete operation
        SET @accion = 'DELETE';
        
        INSERT INTO AuditLog (id_usuario, accion, entidad, id_registro, datos_anteriores)
        SELECT 
            id,
            @accion,
            'Usuario',
            id,
            (SELECT username FROM deleted FOR JSON PATH),
            'SYSTEM',
            'SYSTEM',
            GETDATE()
        FROM deleted;
    END
END;
GO

PRINT 'Triggers created successfully.';
