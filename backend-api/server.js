const express = require('express');
const http = require('http');
const config = require('./src/config/env');
const cors = require('./src/config/cors');
const { initSocket } = require('./src/config/socket');
const { connect, close } = require('./src/config/database');
const logger = require('./src/middlewares/logger');
const { requestLogger } = require('./src/middlewares/logger');

// Import routes
const authRoutes = require('./src/routes/auth.routes');
const habitacionesRoutes = require('./src/routes/habitaciones.routes');
const operacionesRoutes = require('./src/routes/operaciones.routes');
const monitorRoutes = require('./src/routes/monitor.routes');
const limpiezaRoutes = require('./src/routes/limpieza.routes');
const mantenimientoRoutes = require('./src/routes/mantenimiento.routes');
const reportesRoutes = require('./src/routes/reportes.routes');
const usuariosRoutes = require('./src/routes/usuarios.routes');
const facturaRoutes = require('./src/routes/factura.routes');

// Initialize Express app
const app = express();
const server = http.createServer(app);

// Middlewares
app.use(cors);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(requestLogger);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    service: 'hotel-automation-backend'
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/habitaciones', habitacionesRoutes);
app.use('/api/operaciones', operacionesRoutes);
app.use('/api/monitor', monitorRoutes);
app.use('/api/limpieza', limpiezaRoutes);
app.use('/api/mantenimiento', mantenimientoRoutes);
app.use('/api/reportes', reportesRoutes);
app.use('/api/usuarios', usuariosRoutes);
app.use('/api/facturas', facturaRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Ruta no encontrada'
  });
});

// Error handler
app.use((err, req, res, next) => {
  logger.error('Unhandled error:', { error: err.message, stack: err.stack });
  res.status(500).json({
    success: false,
    message: 'Error interno del servidor',
    error: config.nodeEnv === 'development' ? err.message : undefined
  });
});

// Start server
const startServer = async () => {
  try {
    // Try to connect to database (optional - server can start without it)
    const pool = await connect();
    if (pool) {
      logger.info('Database connected successfully');
    } else {
      logger.warn('Database connection failed - running in demo mode');
    }

    // Initialize Socket.io
    initSocket(server);
    logger.info('Socket.io initialized');

    // Start listening
    server.listen(config.port, () => {
      logger.info(`Server running on port ${config.port}`);
      logger.info(`Environment: ${config.nodeEnv}`);
      logger.info('API ready at http://localhost:' + config.port);
    });
  } catch (error) {
    logger.error('Failed to start server:', { error: error.message, stack: error.stack });
    process.exit(1);
  }
};

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received. Shutting down gracefully...');
  server.close(async () => {
    try { await close(); } catch(e) {}
    logger.info('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received. Shutting down gracefully...');
  server.close(async () => {
    try { await close(); } catch(e) {}
    logger.info('Server closed');
    process.exit(0);
  });
});

// Export for testing
module.exports = { app, server, startServer };

// Start server if run directly
if (require.main === module) {
  startServer();
}
