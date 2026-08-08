-- =====================================================
-- SEED: Estados de Habitación
-- =====================================================
INSERT INTO EstadoHabitacion (nombre, descripcion, color, activo) VALUES
('Disponible', 'Habitación lista para Check-in', 'green', 1),
('Ocupada', 'Habitación con huésped', 'red', 1),
('Limpieza', 'En proceso de limpieza', 'yellow', 1),
('Mantenimiento', 'Requiere mantenimiento', 'orange', 1),
('Bloqueada', 'Bloqueada por diversas razones', 'gray', 1);

-- =====================================================
-- SEED: Tipos de Habitación
-- =====================================================
INSERT INTO TipoHabitacion (nombre, descripcion, capacidad, precio_base, activo) VALUES
('Individual', 'Habitación para una persona', 1, 50.00, 1),
('Doble', 'Habitación para dos personas', 2, 80.00, 1),
('Twin', 'Habitación con dos camas individuales', 2, 75.00, 1),
('Suite', 'Habitación de lujo con sala', 3, 150.00, 1),
('Suite Presidencial', 'Habitación de lujo premium', 4, 300.00, 1),
('Familiar', 'Habitación familiar grande', 5, 120.00, 1);

-- =====================================================
-- SEED: Roles
-- =====================================================
INSERT INTO Rol (nombre, descripcion, activo) VALUES
('Administrador', 'Acceso total al sistema', 1),
('Recepcionista', 'Gestión de check-in/check-out', 1),
('Limpieza', 'Gestión de tareas de limpieza', 1),
('Mantenimiento', 'Gestión de mantenimiento', 1);

-- =====================================================
-- SEED: Turnos
-- =====================================================
INSERT INTO Turno (nombre, hora_inicio, hora_fin, activo) VALUES
('Mañana', '06:00:00', '14:00:00', 1),
('Tarde', '14:00:00', '22:00:00', 1),
('Noche', '22:00:00', '06:00:00', 1);

-- =====================================================
-- SEED: Categorías de Mantenimiento
-- =====================================================
INSERT INTO CategoriaMantenimiento (nombre, descripcion, prioridad_default, tiempo_estimado_minutos, activo) VALUES
('Eléctrica', 'Problemas eléctricos', 1, 60, 1),
('Plomería', 'Problemas de tuberías y agua', 1, 45, 1),
('Aire Acondicionado', 'Sistema de climatización', 2, 90, 1),
('Mobiliario', 'Reparación de muebles', 3, 30, 1),
('Pintura', 'Pintura y acabados', 3, 120, 1),
('Limpieza Profunda', 'Limpieza especializada', 2, 180, 1),
('Seguridad', 'Cerraduras y sistemas de seguridad', 1, 30, 1),
('Otros', 'Otros tipos de mantenimiento', 2, 60, 1);

-- =====================================================
-- SEED: Estándares de Tiempo
-- =====================================================
INSERT INTO StandardTiempo (tipo_tarea, tipo_habitacion, tiempo_minutos, descripcion, activo) VALUES
('Limpieza', 'Individual', 20, 'Tiempo estándar limpieza habitación individual', 1),
('Limpieza', 'Doble', 25, 'Tiempo estándar limpieza habitación doble', 1),
('Limpieza', 'Twin', 25, 'Tiempo estándar limpieza habitación twin', 1),
('Limpieza', 'Suite', 40, 'Tiempo estándar limpieza suite', 1),
('Limpieza', 'Suite Presidencial', 60, 'Tiempo estándar limpieza suite presidencial', 1),
('Limpieza', 'Familiar', 35, 'Tiempo estándar limpieza habitación familiar', 1),
('Limpieza', NULL, 30, 'Tiempo estándar general limpieza', 1),
('Mantenimiento', 'Eléctrica', 60, 'Tiempo estándar mantenimiento eléctrico', 1),
('Mantenimiento', 'Plomería', 45, 'Tiempo estándar mantenimiento plomería', 1),
('Mantenimiento', 'Aire Acondicionado', 90, 'Tiempo estándar mantenimiento AA', 1),
('Mantenimiento', NULL, 60, 'Tiempo estándar general mantenimiento', 1);

-- =====================================================
-- SEED: Hotel
-- =====================================================
INSERT INTO Hotel (nombre, direccion, telefono, email, nit, fecha_fundacion, activo) VALUES
('Hotel Automatización', 'Av. Principal 123', '+591-3-123456', 'contacto@hotel.com', '123456789', '2020-01-01', 1);

PRINT 'Seed data inserted successfully.';
