-- =====================================================
-- HOTEL AUTOMATION SYSTEM - DATABASE SCHEMA
-- 23 Tables for Hotel Management
-- =====================================================

-- =====================================================
-- 1. HOTEL TABLE
-- =====================================================
CREATE TABLE Hotel (
    id INT PRIMARY KEY IDENTITY(1,1),
    nombre VARCHAR(100) NOT NULL,
    direccion VARCHAR(255) NOT NULL,
    telefono VARCHAR(20),
    email VARCHAR(100),
    nit VARCHAR(20),
    fecha_fundacion DATE,
    activo BIT DEFAULT 1,
    fecha_creacion DATETIME DEFAULT GETDATE(),
    fecha_actualizacion DATETIME DEFAULT GETDATE()
);

-- =====================================================
-- 2. TIPO_HABITACION TABLE
-- =====================================================
CREATE TABLE TipoHabitacion (
    id INT PRIMARY KEY IDENTITY(1,1),
    nombre VARCHAR(50) NOT NULL, -- Individual, Doble, Suite, etc.
    descripcion VARCHAR(255),
    capacidad INT NOT NULL,
    precio_base DECIMAL(10,2) NOT NULL,
    activo BIT DEFAULT 1,
    fecha_creacion DATETIME DEFAULT GETDATE()
);

-- =====================================================
-- 3. ESTADO_HABITACION TABLE
-- =====================================================
CREATE TABLE EstadoHabitacion (
    id INT PRIMARY KEY IDENTITY(1,1),
    nombre VARCHAR(50) NOT NULL, -- Disponible, Ocupada, Limpieza, Mantenimiento, Bloqueada
    descripcion VARCHAR(255),
    color VARCHAR(20), -- Para UI: green, yellow, red, gray
    activo BIT DEFAULT 1,
    fecha_creacion DATETIME DEFAULT GETDATE()
);

-- =====================================================
-- 4. HABITACION TABLE
-- =====================================================
CREATE TABLE Habitacion (
    id INT PRIMARY KEY IDENTITY(1,1),
    numero VARCHAR(10) NOT NULL,
    piso INT NOT NULL,
    id_tipo_habitacion INT NOT NULL,
    id_estado INT NOT NULL,
    descripcion VARCHAR(255),
    tiene_balcon BIT DEFAULT 0,
    tiene_vista BIT DEFAULT 0,
    activo BIT DEFAULT 1,
    fecha_creacion DATETIME DEFAULT GETDATE(),
    fecha_actualizacion DATETIME DEFAULT GETDATE(),
    FOREIGN KEY (id_tipo_habitacion) REFERENCES TipoHabitacion(id),
    FOREIGN KEY (id_estado) REFERENCES EstadoHabitacion(id),
    CONSTRAINT UQ_Habitacion_Numero UNIQUE (numero, piso)
);

-- =====================================================
-- 5. ROL TABLE
-- =====================================================
CREATE TABLE Rol (
    id INT PRIMARY KEY IDENTITY(1,1),
    nombre VARCHAR(50) NOT NULL, -- Administrador, Recepcionista, Limpieza, Mantenimiento
    descripcion VARCHAR(255),
    activo BIT DEFAULT 1,
    fecha_creacion DATETIME DEFAULT GETDATE()
);

-- =====================================================
-- 6. PERSONA TABLE
-- =====================================================
CREATE TABLE Persona (
    id INT PRIMARY KEY IDENTITY(1,1),
    nombres VARCHAR(100) NOT NULL,
    apellidos VARCHAR(100) NOT NULL,
    tipo_documento VARCHAR(10), -- CI, Pasaporte, etc.
    numero_documento VARCHAR(20),
    fecha_nacimiento DATE,
    genero VARCHAR(20),
    telefono VARCHAR(20),
    email VARCHAR(100),
    direccion VARCHAR(255),
    activo BIT DEFAULT 1,
    fecha_creacion DATETIME DEFAULT GETDATE(),
    fecha_actualizacion DATETIME DEFAULT GETDATE()
);

-- =====================================================
-- 7. EMPLEADO TABLE
-- =====================================================
CREATE TABLE Empleado (
    id INT PRIMARY KEY IDENTITY(1,1),
    id_persona INT NOT NULL,
    id_rol INT NOT NULL,
    codigo_empleado VARCHAR(20) NOT NULL,
    fecha_contratacion DATE NOT NULL,
    salario DECIMAL(10,2),
    activo BIT DEFAULT 1,
    fecha_creacion DATETIME DEFAULT GETDATE(),
    fecha_actualizacion DATETIME DEFAULT GETDATE(),
    FOREIGN KEY (id_persona) REFERENCES Persona(id),
    FOREIGN KEY (id_rol) REFERENCES Rol(id),
    CONSTRAINT UQ_Empleado_Codigo UNIQUE (codigo_empleado)
);

-- =====================================================
-- 8. TURNO TABLE
-- =====================================================
CREATE TABLE Turno (
    id INT PRIMARY KEY IDENTITY(1,1),
    nombre VARCHAR(50) NOT NULL, -- Mañana, Tarde, Noche
    hora_inicio TIME NOT NULL,
    hora_fin TIME NOT NULL,
    activo BIT DEFAULT 1,
    fecha_creacion DATETIME DEFAULT GETDATE()
);

-- =====================================================
-- 9. EMPLEADO_TURNO TABLE (Asignación de turnos)
-- =====================================================
CREATE TABLE EmpleadoTurno (
    id INT PRIMARY KEY IDENTITY(1,1),
    id_empleado INT NOT NULL,
    id_turno INT NOT NULL,
    dia_semana INT, -- 0=Domingo, 1=Lunes, etc.
    fecha_inicio DATE,
    fecha_fin DATE,
    activo BIT DEFAULT 1,
    FOREIGN KEY (id_empleado) REFERENCES Empleado(id),
    FOREIGN KEY (id_turno) REFERENCES Turno(id)
);

-- =====================================================
-- 10. USUARIO TABLE
-- =====================================================
CREATE TABLE Usuario (
    id INT PRIMARY KEY IDENTITY(1,1),
    id_empleado INT NOT NULL,
    username VARCHAR(50) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    ultimo_login DATETIME,
    intentos_fallidos INT DEFAULT 0,
    bloqueado BIT DEFAULT 0,
    activo BIT DEFAULT 1,
    fecha_creacion DATETIME DEFAULT GETDATE(),
    fecha_actualizacion DATETIME DEFAULT GETDATE(),
    FOREIGN KEY (id_empleado) REFERENCES Empleado(id),
    CONSTRAINT UQ_Usuario_Username UNIQUE (username)
);

-- =====================================================
-- 11. HUESPED TABLE
-- =====================================================
CREATE TABLE Huesped (
    id INT PRIMARY KEY IDENTITY(1,1),
    id_persona INT NOT NULL,
    numero_huesped VARCHAR(20) NOT NULL,
    puntos_fidelidad INT DEFAULT 0,
    preferences TEXT, -- JSON con preferencias
    activo BIT DEFAULT 1,
    fecha_creacion DATETIME DEFAULT GETDATE(),
    fecha_actualizacion DATETIME DEFAULT GETDATE(),
    FOREIGN KEY (id_persona) REFERENCES Persona(id),
    CONSTRAINT UQ_Huesped_Numero UNIQUE (numero_huesped)
);

-- =====================================================
-- 12. ESTADIA TABLE (Registro de estancia)
-- =====================================================
CREATE TABLE Estadia (
    id INT PRIMARY KEY IDENTITY(1,1),
    id_habitacion INT NOT NULL,
    id_huesped INT NOT NULL,
    id_empleado_checkin INT NOT NULL,
    numero_estadia VARCHAR(20) NOT NULL,
    fecha_checkin DATETIME NOT NULL,
    fecha_checkout_prevista DATETIME NOT NULL,
    fecha_checkout DATETIME,
    numero_adultos INT DEFAULT 1,
    numero_ninos INT DEFAULT 0,
    precio_noche DECIMAL(10,2) NOT NULL,
    descuento DECIMAL(10,2) DEFAULT 0,
    estado VARCHAR(20) DEFAULT 'Activa', -- Activa, CheckOut, Cancelada
    observaciones TEXT,
    activo BIT DEFAULT 1,
    fecha_creacion DATETIME DEFAULT GETDATE(),
    fecha_actualizacion DATETIME DEFAULT GETDATE(),
    FOREIGN KEY (id_habitacion) REFERENCES Habitacion(id),
    FOREIGN KEY (id_huesped) REFERENCES Huesped(id),
    FOREIGN KEY (id_empleado_checkin) REFERENCES Empleado(id),
    CONSTRAINT UQ_Estadia_Numero UNIQUE (numero_estadia)
);

-- =====================================================
-- 13. PAGO TABLE
-- =====================================================
CREATE TABLE Pago (
    id INT PRIMARY KEY IDENTITY(1,1),
    id_estadia INT NOT NULL,
    id_empleado INT NOT NULL,
    numero_pago VARCHAR(20) NOT NULL,
    monto DECIMAL(10,2) NOT NULL,
    metodo_pago VARCHAR(20), -- Efectivo, Tarjeta, Transferencia
    referencia VARCHAR(100),
    fecha_pago DATETIME NOT NULL,
    estado VARCHAR(20) DEFAULT 'Pendiente', -- Pendiente, Completado, Rechazado
    observaciones TEXT,
    activo BIT DEFAULT 1,
    fecha_creacion DATETIME DEFAULT GETDATE(),
    FOREIGN KEY (id_estadia) REFERENCES Estadia(id),
    FOREIGN KEY (id_empleado) REFERENCES Empleado(id),
    CONSTRAINT UQ_Pago_Numero UNIQUE (numero_pago)
);

-- =====================================================
-- 14. STANDARD_TIEMPO TABLE (Estándares de tiempo para KPIs)
-- =====================================================
CREATE TABLE StandardTiempo (
    id INT PRIMARY KEY IDENTITY(1,1),
    tipo_tarea VARCHAR(50) NOT NULL, -- Limpieza, Mantenimiento
    tipo_habitacion VARCHAR(50), -- Puede ser NULL para estándar general
    tiempo_minutos INT NOT NULL, -- Tiempo estándar en minutos
    descripcion VARCHAR(255),
    activo BIT DEFAULT 1,
    fecha_creacion DATETIME DEFAULT GETDATE(),
    fecha_actualizacion DATETIME DEFAULT GETDATE()
);

-- =====================================================
-- 15. TAREA_LIMPIEZA TABLE
-- =====================================================
CREATE TABLE TareaLimpieza (
    id INT PRIMARY KEY IDENTITY(1,1),
    id_habitacion INT NOT NULL,
    id_empleado_asignado INT,
    id_empleado_encargado INT, -- Quien creó la tarea
    numero_tarea VARCHAR(20) NOT NULL,
    tipo_tarea VARCHAR(20) NOT NULL, -- Rutinaria, CheckOut, Profunda
    prioridad INT DEFAULT 2, -- 1=Urgente, 2=Normal, 3=Baja
    fecha_asignacion DATETIME,
    fecha_inicio DATETIME,
    fecha_fin DATETIME,
    tiempo_minutos INT,
    estado VARCHAR(20) DEFAULT 'Pendiente', -- Pendiente, EnProceso, Completada, Cancelada
    observaciones TEXT,
    checklist TEXT, -- JSON con checklist de limpieza
    activo BIT DEFAULT 1,
    fecha_creacion DATETIME DEFAULT GETDATE(),
    fecha_actualizacion DATETIME DEFAULT GETDATE(),
    FOREIGN KEY (id_habitacion) REFERENCES Habitacion(id),
    FOREIGN KEY (id_empleado_asignado) REFERENCES Empleado(id),
    FOREIGN KEY (id_empleado_encargado) REFERENCES Empleado(id),
    CONSTRAINT UQ_TareaLimpieza_Numero UNIQUE (numero_tarea)
);

-- =====================================================
-- 16. CATEGORIA_MANTENIMIENTO TABLE
-- =====================================================
CREATE TABLE CategoriaMantenimiento (
    id INT PRIMARY KEY IDENTITY(1,1),
    nombre VARCHAR(50) NOT NULL, -- Eléctrica, Plomería, Aire Acondicionado, Mobiliario
    descripcion VARCHAR(255),
    prioridad_default INT DEFAULT 2,
    tiempo_estimado_minutos INT,
    activo BIT DEFAULT 1,
    fecha_creacion DATETIME DEFAULT GETDATE()
);

-- =====================================================
-- 17. TICKET_MANTENIMIENTO TABLE
-- =====================================================
CREATE TABLE TicketMantenimiento (
    id INT PRIMARY KEY IDENTITY(1,1),
    id_habitacion INT NOT NULL,
    id_categoria INT NOT NULL,
    id_empleado_reporta INT NOT NULL,
    id_empleado_asignado INT,
    numero_ticket VARCHAR(20) NOT NULL,
    titulo VARCHAR(100) NOT NULL,
    descripcion TEXT NOT NULL,
    prioridad INT DEFAULT 2, -- 1=Urgente, 2=Normal, 3=Baja
    fecha_reportado DATETIME NOT NULL,
    fecha_asignacion DATETIME,
    fecha_inicio DATETIME,
    fecha_fin DATETIME,
    tiempo_minutos INT,
    estado VARCHAR(20) DEFAULT 'Pendiente', -- Pendiente, EnProceso, Completado, Cancelado
    costo_estimado DECIMAL(10,2),
    costo_real DECIMAL(10,2),
    observaciones TEXT,
    activo BIT DEFAULT 1,
    fecha_creacion DATETIME DEFAULT GETDATE(),
    fecha_actualizacion DATETIME DEFAULT GETDATE(),
    FOREIGN KEY (id_habitacion) REFERENCES Habitacion(id),
    FOREIGN KEY (id_categoria) REFERENCES CategoriaMantenimiento(id),
    FOREIGN KEY (id_empleado_reporta) REFERENCES Empleado(id),
    FOREIGN KEY (id_empleado_asignado) REFERENCES Empleado(id),
    CONSTRAINT UQ_TicketMantenimiento_Numero UNIQUE (numero_ticket)
);

-- =====================================================
-- 18. TICKET_MATERIAL TABLE (Materiales usados en mantenimiento)
-- =====================================================
CREATE TABLE TicketMaterial (
    id INT PRIMARY KEY IDENTITY(1,1),
    id_ticket INT NOT NULL,
    nombre_material VARCHAR(100) NOT NULL,
    cantidad INT NOT NULL,
    costo_unitario DECIMAL(10,2),
    activo BIT DEFAULT 1,
    fecha_creacion DATETIME DEFAULT GETDATE(),
    FOREIGN KEY (id_ticket) REFERENCES TicketMantenimiento(id)
);

-- =====================================================
-- 19. NOTIFICACION TABLE
-- =====================================================
CREATE TABLE Notificacion (
    id INT PRIMARY KEY IDENTITY(1,1),
    id_usuario INT NOT NULL,
    titulo VARCHAR(100) NOT NULL,
    mensaje TEXT NOT NULL,
    tipo VARCHAR(20) NOT NULL, -- Info, Warning, Error, Success
    leida BIT DEFAULT 0,
    fecha_lectura DATETIME,
    fecha_creacion DATETIME DEFAULT GETDATE(),
    FOREIGN KEY (id_usuario) REFERENCES Usuario(id)
);

-- =====================================================
-- 20. AUDIT_LOG TABLE (Logs de auditoría)
-- =====================================================
CREATE TABLE AuditLog (
    id INT PRIMARY KEY IDENTITY(1,1),
    id_usuario INT,
    accion VARCHAR(50) NOT NULL,
    entidad VARCHAR(50) NOT NULL,
    id_registro INT,
    datos_anteriores TEXT, -- JSON
    datos_nuevos TEXT, -- JSON
    ip_address VARCHAR(45),
    user_agent VARCHAR(255),
    fecha_creacion DATETIME DEFAULT GETDATE(),
    FOREIGN KEY (id_usuario) REFERENCES Usuario(id)
);

-- =====================================================
-- 21. RESERVA TABLE (Sistema de reservas)
-- =====================================================
CREATE TABLE Reserva (
    id INT PRIMARY KEY IDENTITY(1,1),
    id_habitacion INT NOT NULL,
    id_huesped INT NOT NULL,
    numero_reserva VARCHAR(20) NOT NULL,
    fecha_entrada DATE NOT NULL,
    fecha_salida DATE NOT NULL,
    numero_adultos INT DEFAULT 1,
    numero_ninos INT DEFAULT 0,
    precio_total DECIMAL(10,2),
    estado VARCHAR(20) DEFAULT 'Confirmada', -- Pendiente, Confirmada, Cancelada, CheckIn
    observaciones TEXT,
    activo BIT DEFAULT 1,
    fecha_creacion DATETIME DEFAULT GETDATE(),
    fecha_actualizacion DATETIME DEFAULT GETDATE(),
    FOREIGN KEY (id_habitacion) REFERENCES Habitacion(id),
    FOREIGN KEY (id_huesped) REFERENCES Huesped(id),
    CONSTRAINT UQ_Reserva_Numero UNIQUE (numero_reserva)
);

-- =====================================================
-- 22. CONFIGURACION_SISTEMA TABLE
-- =====================================================
CREATE TABLE ConfiguracionSistema (
    id INT PRIMARY KEY IDENTITY(1,1),
    clave VARCHAR(50) NOT NULL,
    valor VARCHAR(255) NOT NULL,
    descripcion VARCHAR(255),
    activo BIT DEFAULT 1,
    fecha_creacion DATETIME DEFAULT GETDATE(),
    fecha_actualizacion DATETIME DEFAULT GETDATE(),
    CONSTRAINT UQ_ConfiguracionSistema_Clave UNIQUE (clave)
);

-- =====================================================
-- 23. REPORTE_PROGRAMADO TABLE
-- =====================================================
CREATE TABLE ReporteProgramado (
    id INT PRIMARY KEY IDENTITY(1,1),
    nombre VARCHAR(100) NOT NULL,
    tipo_reporte VARCHAR(50) NOT NULL, -- Diario, Semanal, Mensual
    frecuencia VARCHAR(20) NOT NULL, -- Daily, Weekly, Monthly
    hora_ejecucion TIME NOT NULL,
    dia_semana INT, -- 0=Domingo, para reportes semanales
    destinatarios TEXT, -- Emails separados por coma
    formato VARCHAR(20) DEFAULT 'PDF', -- PDF, Excel
    activo BIT DEFAULT 1,
    ultimo_envio DATETIME,
    fecha_creacion DATETIME DEFAULT GETDATE(),
    fecha_actualizacion DATETIME DEFAULT GETDATE()
);

PRINT 'Database schema created successfully with 23 tables.';
