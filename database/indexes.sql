-- =====================================================
-- DATABASE INDEXES FOR PERFORMANCE
-- =====================================================

-- Habitacion indexes
CREATE INDEX idx_habitacion_estado ON Habitacion(id_estado);
CREATE INDEX idx_habitacion_tipo ON Habitacion(id_tipo_habitacion);
CREATE INDEX idx_habitacion_piso ON Habitacion(piso);

-- Empleado indexes
CREATE INDEX idx_empleado_rol ON Empleado(id_rol);
CREATE INDEX idx_empleado_persona ON Empleado(id_persona);
CREATE INDEX idx_empleado_codigo ON Empleado(codigo_empleado);

-- Persona indexes
CREATE INDEX idx_persona_documento ON Persona(tipo_documento, numero_documento);
CREATE INDEX idx_persona_email ON Persona(email);

-- Usuario indexes
CREATE INDEX idx_usuario_username ON Usuario(username);
CREATE INDEX idx_usuario_empleado ON Usuario(id_empleado);

-- Huesped indexes
CREATE INDEX idx_huesped_persona ON Huesped(id_persona);
CREATE INDEX idx_huesped_numero ON Huesped(numero_huesped);

-- Estadia indexes
CREATE INDEX idx_estadia_habitacion ON Estadia(id_habitacion);
CREATE INDEX idx_estadia_huesped ON Estadia(id_huesped);
CREATE INDEX idx_estadia_checkin ON Estadia(fecha_checkin);
CREATE INDEX idx_estadia_checkout ON Estadia(fecha_checkout);
CREATE INDEX idx_estadia_estado ON Estadia(estado);

-- Pago indexes
CREATE INDEX idx_pago_estadia ON Pago(id_estadia);
CREATE INDEX idx_pago_fecha ON Pago(fecha_pago);

-- TareaLimpieza indexes
CREATE INDEX idx_tarea_habitacion ON TareaLimpieza(id_habitacion);
CREATE INDEX idx_tarea_empleado ON TareaLimpieza(id_empleado_asignado);
CREATE INDEX idx_tarea_estado ON TareaLimpieza(estado);
CREATE INDEX idx_tarea_fecha ON TareaLimpieza(fecha_asignacion);

-- TicketMantenimiento indexes
CREATE INDEX idx_ticket_habitacion ON TicketMantenimiento(id_habitacion);
CREATE INDEX idx_ticket_categoria ON TicketMantenimiento(id_categoria);
CREATE INDEX idx_ticket_empleado_reporta ON TicketMantenimiento(id_empleado_reporta);
CREATE INDEX idx_ticket_empleado_asignado ON TicketMantenimiento(id_empleado_asignado);
CREATE INDEX idx_ticket_estado ON TicketMantenimiento(estado);
CREATE INDEX idx_ticket_fecha ON TicketMantenimiento(fecha_reportado);

-- Reserva indexes
CREATE INDEX idx_reserva_habitacion ON Reserva(id_habitacion);
CREATE INDEX idx_reserva_huesped ON Reserva(id_huesped);
CREATE INDEX idx_reserva_fecha_entrada ON Reserva(fecha_entrada);
CREATE INDEX idx_reserva_estado ON Reserva(estado);

-- Notificacion indexes
CREATE INDEX idx_notificacion_usuario ON Notificacion(id_usuario);
CREATE INDEX idx_notificacion_leida ON Notificacion(leida);
CREATE INDEX idx_notificacion_fecha ON Notificacion(fecha_creacion);

-- AuditLog indexes
CREATE INDEX idx_audit_usuario ON AuditLog(id_usuario);
CREATE INDEX idx_audit_fecha ON AuditLog(fecha_creacion);
CREATE INDEX idx_audit_entidad ON AuditLog(entidad, id_registro);

PRINT 'Database indexes created successfully.';
