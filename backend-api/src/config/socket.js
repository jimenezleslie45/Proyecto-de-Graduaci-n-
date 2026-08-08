const { Server } = require('socket.io');
const config = require('./env');
const logger = require('../middlewares/logger');

let io = null;

/**
 * Initialize Socket.io server
 */
const initSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: config.socket.corsOrigin,
      methods: ['GET', 'POST'],
      credentials: true
    },
    pingTimeout: 60000,
    pingInterval: 25000
  });

  // Connection handling
  io.on('connection', (socket) => {
    logger.info(`Client connected: ${socket.id}`);

    // Join rooms based on user role
    socket.on('join:room', (room) => {
      socket.join(room);
      logger.info(`Client ${socket.id} joined room: ${room}`);
    });

    // Handle disconnect
    socket.on('disconnect', (reason) => {
      logger.info(`Client disconnected: ${socket.id}, reason: ${reason}`);
    });

    // Handle errors
    socket.on('error', (error) => {
      logger.error(`Socket error for ${socket.id}:`, error);
    });
  });

  logger.info('Socket.io server initialized');
  return io;
};

/**
 * Get Socket.io instance
 */
const getIO = () => {
  if (!io) {
    throw new Error('Socket.io not initialized. Call initSocket() first.');
  }
  return io;
};

/**
 * Emit event to specific room
 */
const emitToRoom = (room, event, data) => {
  if (io) {
    io.to(room).emit(event, data);
  }
};

/**
 * Emit event to all connected clients
 */
const emitToAll = (event, data) => {
  if (io) {
    io.emit(event, data);
  }
};

module.exports = {
  initSocket,
  getIO,
  emitToRoom,
  emitToAll
};
