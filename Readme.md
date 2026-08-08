hotel-automation-system/
│
├── 📄 README.md # Documentación principal
├── 📄 LICENSE # Licencia del proyecto
├── 📄 .gitignore # Archivos ignorados por Git
├── 📄 docker-compose.yml # Orquestación de contenedores (opcional)
│
├── 📂 backend-api/ # API Principal (Node.js + Express)
│ ├── 📄 package.json
│ ├── 📄 .env
│ ├── 📄 server.js # Entry point del servidor
│ │
│ ├── 📂 src/
│ │ ├── 📂 config/
│ │ │ ├── database.js # Conexión a SQL Server
│ │ │ ├── env.js # Variables de entorno
│ │ │ ├── cors.js # Configuración CORS
│ │ │ └── socket.js # Configuración Socket.io
│ │ │
│ │ ├── 📂 controllers/ # Lógica de negocio (10 pantallas)
│ │ │ ├── authController.js # Pantalla 1: Acceso al Sistema
│ │ │ ├── habitacionesController.js # Pantalla 2: Configuración Habitaciones
│ │ │ ├── checkinController.js # Pantalla 3: Registro Check-in
│ │ │ ├── checkoutController.js # Pantalla 4: Registro Check-out
│ │ │ ├── monitorController.js # Pantalla 5: Monitor Estados
│ │ │ ├── limpiezaController.js # Pantallas 6-7: Gestión/Ejecución Limpieza
│ │ │ ├── mantenimientoController.js# Pantallas 8-9: Reporte/Ejecución Mantenimiento
│ │ │ ├── reportesController.js # Pantalla 10: Reportes Automatizados
│ │ │ └── usuariosController.js # Gestión de roles y usuarios
│ │ │
│ │ ├── 📂 models/ # Modelos de base de datos (23 tablas)
│ │ │ ├── Hotel.js
│ │ │ ├── Habitacion.js
│ │ │ ├── EstadoHabitacion.js
│ │ │ ├── TipoHabitacion.js
│ │ │ ├── Persona.js
│ │ │ ├── Empleado.js
│ │ │ ├── Usuario.js
│ │ │ ├── Rol.js
│ │ │ ├── Turno.js
│ │ │ ├── Huesped.js
│ │ │ ├── Estadia.js
│ │ │ ├── Pago.js
│ │ │ ├── TareaLimpieza.js # ⏱️ Medición de tiempos
│ │ │ ├── StandardTiempo.js # 📊 Estándares para KPIs
│ │ │ ├── TicketMantenimiento.js # 🔧 Medición de tiempos
│ │ │ ├── CategoriaMantenimiento.js
│ │ │ ├── TicketMaterial.js
│ │ │ ├── Notificacion.js
│ │ │ └── AuditLog.js
│ │ │
│ │ ├── 📂 routes/ # Endpoints de la API
│ │ │ ├── auth.routes.js # POST /api/auth/login
│ │ │ ├── habitaciones.routes.js # CRUD /api/habitaciones
│ │ │ ├── operaciones.routes.js # POST /api/checkin, /api/checkout
│ │ │ ├── monitor.routes.js # GET /api/monitor/estados
│ │ │ ├── limpieza.routes.js # GET/PUT /api/limpieza/tareas
│ │ │ ├── mantenimiento.routes.js # GET/PUT /api/mantenimiento/tickets
│ │ │ ├── reportes.routes.js # GET /api/reportes/kpis
│ │ │ └── usuarios.routes.js # CRUD /api/usuarios
│ │ │
│ │ ├── 📂 middlewares/ # Middleware de seguridad y validación
│ │ │ ├── auth.js # Validación JWT
│ │ │ ├── roles.js # Control RBAC (4 roles)
│ │ │ ├── validator.js # Validación de datos de entrada
│ │ │ ├── upload.js # Manejo de archivos (fotos)
│ │ │ └── logger.js # Logging de peticiones
│ │ │
│ │ ├── 📂 services/ # Servicios externos y automatización
│ │ │ ├── emailService.js # Envío de emails automáticos
│ │ │ ├── notificationService.js # Notificaciones push en tiempo real
│ │ │ ├── pythonService.js # Comunicación con motor Python (reportes)
│ │ │ ├── automationService.js # 🔄 Automatizaciones:
│ │ │ │ ├── postCheckout.js # Check-out → Crea tarea limpieza
│ │ │ │ ├── updateRoomStatus.js # Cambia estado de habitación
│ │ │ │ └── scheduledReports.js # Programación de reportes
│ │ │ └── kpiCalculator.js # Cálculo de métricas en tiempo real
│ │ │
│ │ ├── 📂 utils/ # Utilidades compartidas
│ │ │ ├── calculateDuration.js # ⏱️ Calcula: fin - inicio
│ │ │ ├── compareWithStandard.js # 📊 Compara vs estándar (30/60 min)
│ │ │ ├── generatePDF.js # Generación de reportes PDF
│ │ │ ├── exportExcel.js # Exportación a Excel/CSV
│ │ │ └── formatDate.js # Formateo de fechas
│ │ │
│ │ └── 📂 events/ # Eventos en tiempo real (Socket.io)
│ │ ├── roomStatusEvents.js # Emite cambios de estado de habitación
│ │ ├── taskAssignedEvents.js # Notifica nuevas tareas asignadas
│ │ └── alertEvents.js # Emite alertas por tiempos excesivos
│ │
│ ├── 📂 tests/ # Pruebas unitarias y de integración
│ │ ├── unit/
│ │ ├── integration/
│ │ └── fixtures/
│ │
│ └── 📂 scripts/ # Scripts de utilidad
│ ├── seed.js # Datos iniciales
│ ├── migrate.js # Migraciones de BD
│ └── backup.js # Backup automático
│
├── 📂 backend-analytics/ # Motor Analítico (Python + Flask)
│ ├── 📄 requirements.txt
│ ├── 📄 config.py
│ ├── 📄 app.py # Entry point Flask
│ │
│ ├── 📂 src/
│ │ ├── 📂 analytics/ # Cálculo de KPIs y métricas
│ │ │ ├── kpi_calculator.py # ⏱️ Tiempos promedio, eficiencia
│ │ │ ├── ocupacion_analyzer.py # 📈 Tasa de ocupación, proyecciones
│ │ │ ├── productividad_analyzer.py # 👥 Productividad por empleado
│ │ │ ├── costos_analyzer.py # 💰 Costos de mantenimiento
│ │ │ └── alert_generator.py # 🔔 Genera alertas por métricas
│ │ │
│ │ ├── 📂 reports/ # Generación de reportes automatizados
│ │ │ ├── report_generator.py # Orquestador de reportes
│ │ │ ├── daily_report.py # Reporte diario (cierre de turno)
│ │ │ ├── weekly_report.py # Reporte semanal (resumen operativo)
│ │ │ ├── monthly_report.py # Reporte mensual (gerencial)
│ │ │ ├── pdf_exporter.py # Exportación a PDF
│ │ │ ├── excel_exporter.py # Exportación a Excel/CSV
│ │ │ └── email_sender.py # Envío automático por email
│ │ │
│ │ ├── 📂 database/ # Conexión y consultas a SQL Server
│ │ │ ├── connection.py
│ │ │ ├── queries.py # Stored procedures y vistas
│ │ │ └── models.py # Modelos SQLAlchemy
│ │ │
│ │ ├── 📂 api/ # API Flask para comunicación con Node.js
│ │ │ ├── routes.py # Endpoints: /api/kpis, /api/reports
│ │ │ └── handlers.py # Manejadores de peticiones
│ │ │
│ │ └── 📂 scheduler/ # Tareas programadas (cron jobs)
│ │ ├── daily_tasks.py # Ejecuta reportes diarios 23:59
│ │ ├── weekly_tasks.py # Ejecuta reportes semanales domingo
│ │ └── alert_checker.py # Verifica alertas cada 5 min
│ │
│ └── 📂 notebooks/ # Jupyter notebooks para análisis (dev)
│ └── kpi_analysis.ipynb
│
├── 📂 frontend-web/ # Interfaz de Usuario (React + Vite)
│ ├── 📄 package.json
│ ├── 📄 vite.config.js
│ ├── 📄 index.html
│ ├── 📄 .env
│ │
│ ├── 📂 public/
│ │ ├── favicon.ico
│ │ ├── logo.svg
│ │ └── manifest.json
│ │
│ ├── 📂 src/
│ │ ├── 📂 assets/ # Recursos estáticos
│ │ │ ├── images/
│ │ │ ├── icons/
│ │ │ └── styles/
│ │ │
│ │ ├── 📂 components/ # Componentes reutilizables
│ │ │ ├── 📂 common/
│ │ │ │ ├── Button.jsx
│ │ │ │ ├── Input.jsx
│ │ │ │ ├── Modal.jsx
│ │ │ │ ├── Table.jsx
│ │ │ │ ├── Card.jsx
│ │ │ │ ├── Loading.jsx
│ │ │ │ ├── Badge.jsx # 🟢🟡🔴⚫ Estados de habitación
│ │ │ │ └── Timer.jsx # ⏱️ Cronómetro para tareas
│ │ │ │
│ │ │ ├── 📂 layout/
│ │ │ │ ├── Header.jsx
│ │ │ │ ├── Sidebar.jsx # Menú lateral por rol
│ │ │ │ ├── Footer.jsx
│ │ │ │ └── MainLayout.jsx
│ │ │ │
│ │ │ ├── 📂 rooms/
│ │ │ │ ├── RoomCard.jsx
│ │ │ │ ├── RoomGrid.jsx # 📊 Vista de pisos (Monitor)
│ │ │ │ └── RoomStatusBadge.jsx
│ │ │ │
│ │ │ ├── 📂 tasks/
│ │ │ │ ├── TaskCard.jsx
│ │ │ │ ├── TaskList.jsx
│ │ │ │ ├── TaskTimer.jsx # ⏱️ Timer para limpieza/mantenimiento
│ │ │ │ └── PriorityBadge.jsx
│ │ │ │
│ │ │ ├── 📂 reports/
│ │ │ │ ├── KpiCard.jsx # 📈 Tarjeta de KPI
│ │ │ │ ├── Chart.jsx # Gráficos (Chart.js o Recharts)
│ │ │ │ ├── DataTable.jsx
│ │ │ │ └── ExportButtons.jsx # 📄📊 Botones PDF/Excel
│ │ │ │
│ │ │ └── 📂 maintenance/
│ │ │ ├── TicketCard.jsx
│ │ │ ├── MaterialList.jsx
│ │ │ └── CategorySelector.jsx
│ │ │
│ │ ├── 📂 contexts/ # Context API (Estado global)
│ │ │ ├── AuthContext.jsx # Usuario autenticado + rol
│ │ │ ├── RoomContext.jsx # Estados de habitaciones en tiempo real
│ │ │ ├── TaskContext.jsx # Tareas asignadas al usuario
│ │ │ └── NotificationContext.jsx # Notificaciones push
│ │ │
│ │ ├── 📂 hooks/ # Custom Hooks
│ │ │ ├── useAuth.js # Lógica de autenticación
│ │ │ ├── useRooms.js # Fetch y actualización de habitaciones
│ │ │ ├── useTasks.js # Gestión de tareas de limpieza
│ │ │ ├── useTimer.js # ⏱️ Hook para medir tiempos
│ │ │ ├── useSocket.js # Conexión WebSocket en tiempo real
│ │ │ └── useReports.js # Fetch y exportación de reportes
│ │ │
│ │ ├── 📂 pages/ # 🖥️ LAS 10 PANTALLAS DEL SISTEMA
│ │ │ ├── 📂 Auth/
│ │ │ │ └── Login.jsx # 🔐 Pantalla 1: Acceso al Sistema
│ │ │ │
│ │ │ ├── 📂 Habitaciones/
│ │ │ │ └── ConfiguracionHabitaciones.jsx # 🏨 Pantalla 2
│ │ │ │
│ │ │ ├── 📂 Operaciones/
│ │ │ │ ├── CheckIn.jsx # 📝 Pantalla 3: Registro Check-in
│ │ │ │ └── CheckOut.jsx # 📝 Pantalla 4: Registro Check-out
│ │ │ │
│ │ │ ├── 📂 Monitor/
│ │ │ │ └── MonitorEstados.jsx # 📊 Pantalla 5: Monitor en Tiempo Real
│ │ │ │
│ │ │ ├── 📂 Limpieza/
│ │ │ │ ├── GestionTareasLimpieza.jsx # 🧹 Pantalla 6
│ │ │ │ └── EjecucionLimpieza.jsx # ⏱️ Pantalla 7
│ │ │ │
│ │ │ ├── 📂 Mantenimiento/
│ │ │ │ ├── ReporteMantenimiento.jsx # 🔧 Pantalla 8
│ │ │ │ └── EjecucionMantenimiento.jsx # ⏱️ Pantalla 9
│ │ │ │
│ │ │ ├── 📂 Reportes/
│ │ │ │ └── ReportesAutomatizados.jsx # 📈 Pantalla 10: KPIs y Exportación
│ │ │ │
│ │ │ └── 📂 Admin/
│ │ │ ├── GestionUsuarios.jsx # Gestión de roles (solo Admin)
│ │ │ └── ConfiguracionSistema.jsx
│ │ │
│ │ ├── 📂 services/ # Llamadas a API
│ │ │ ├── api.js # Configuración Axios + interceptores
│ │ │ ├── authService.js
│ │ │ ├── roomService.js
│ │ │ ├── operationService.js
│ │ │ ├── taskService.js
│ │ │ ├── maintenanceService.js
│ │ │ ├── reportService.js
│ │ │ └── socketService.js # Conexión WebSocket
│ │ │
│ │ ├── 📂 utils/ # Utilidades frontend
│ │ │ ├── formatDate.js
│ │ │ ├── calculateTime.js
│ │ │ ├── validators.js
│ │ │ ├── permissions.js # Verifica permisos por rol
│ │ │ └── constants.js # Constantes: estados, prioridades, roles
│ │ │
│ │ ├── 📂 styles/ # Estilos globales
│ │ │ ├── global.css
│ │ │ ├── variables.css # Colores, espaciados, tipografía
│ │ │ ├── responsive.css # Media queries para mobile
│ │ │ └── animations.css # Animaciones y transiciones
│ │ │
│ │ ├── 📂 routes/ # Configuración de rutas
│ │ │ ├── AppRoutes.jsx # Rutas principales
│ │ │ ├── ProtectedRoute.jsx # Wrapper para rutas protegidas
│ │ │ └── RoleBasedRoute.jsx # Control de acceso por rol (RBAC)
│ │ │
│ │ ├── App.jsx # Componente raíz
│ │ ├── main.jsx # Entry point React
│ │ └── index.css # Estilos base
│ │
│ └── 📂 tests/ # Pruebas de componentes
│ ├── components/
│ └── pages/
│
├── 📂 database/ # Scripts de base de datos SQL Server
│ ├── 📄 schema.sql # DER completo (23 tablas)
│ ├── 📄 indexes.sql # Índices para performance
│ ├── 📄 stored_procedures/
│ │ ├── sp_calcular_kpi_limpieza.sql
│ │ ├── sp_reporte_ocupacion_mensual.sql
│ │ └── sp_generar_reporte_diario.sql
│ ├── 📄 views/
│ │ ├── v_kpi_limpieza_diario.sql
│ │ ├── v_estado_habitaciones_resumen.sql
│ │ └── v_mantenimiento_pendiente.sql
│ ├── 📄 triggers/
│ │ ├── trg_after_checkout_create_task.sql
│ │ └── trg_log_user_activity.sql
│ ├── 📄 seeds/
│ │ ├── seed_estados_habitacion.sql
│ │ ├── seed_turnos.sql
│ │ ├── seed_roles.sql
│ │ ├── seed_categorias_mantenimiento.sql
│ │ └── seed_standards_tiempo.sql
│ └── 📄 backup/
│ └── backup_procedure.sql
│
├── 📂 docs/ # Documentación del proyecto
│ ├── 📄 API.md # Documentación de endpoints (Swagger)
│ ├── 📄 DER.md # Diagrama Entidad-Relación
│ ├── 📄 MANUAL_USUARIO/
│ │ ├── 01_acceso_sistema.md # Pantalla 1
│ │ ├── 02_configuracion_habitaciones.md # Pantalla 2
│ │ ├── 03_checkin.md # Pantalla 3
│ │ ├── 04_checkout.md # Pantalla 4
│ │ ├── 05_monitor_estados.md # Pantalla 5
│ │ ├── 06_gestion_limpieza.md # Pantalla 6
│ │ ├── 07_ejecucion_limpieza.md # Pantalla 7
│ │ ├── 08_reporte_mantenimiento.md # Pantalla 8
│ │ ├── 09_ejecucion_mantenimiento.md # Pantalla 9
│ │ └── 10_reportes_automatizados.md # Pantalla 10
│ ├── 📄 ROLES_Y_PERMISOS.md # Matriz de acceso por rol
│ ├── 📄 AUTOMATIZACIONES.md # Descripción de procesos automáticos
│ ├── 📄 KPIS_Y_METRICAS.md # Definición de indicadores
│ └── 📄 DESPLIEGUE.md # Guía de deployment
│
├── 📂 docker/ # Configuración Docker (opcional)
│ ├── 📄 Dockerfile.node
│ ├── 📄 Dockerfile.python
│ ├── 📄 Dockerfile.react
│ ├── 📄 docker-compose.yml
│ └── 📄 nginx.conf
│
├── 📂 scripts/ # Scripts de automatización del proyecto
│ ├── 📄 setup.sh # Instalación completa del proyecto
│ ├── 📄 deploy.sh # Script de despliegue
│ ├── 📄 test.sh # Ejecución de pruebas
│ └── 📄 backup_db.sh # Backup automático de BD
│
└── 📄 .github/
    └── 📂 workflows/
        ├── 📄 ci.yml # Integración continua
        └── 📄 deploy.yml # Deploy automático
