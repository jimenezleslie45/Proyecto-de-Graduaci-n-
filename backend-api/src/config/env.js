require('dotenv').config();

module.exports = {
  port: process.env.PORT || 3002,
  nodeEnv: process.env.NODE_ENV || 'development',
  
  db: {
    server: process.env.DB_SERVER || 'localhost',
    port: parseInt(process.env.DB_PORT) || 1433,
    database: process.env.DB_DATABASE || 'SIGOH',
    user: process.env.DB_USER || undefined, // Usar undefined para Windows Auth
    instance: process.env.DB_INSTANCE || undefined, // La instancia es opcional y no se asume 'SQLEXPRESS'
    password: process.env.DB_PASSWORD || undefined, // Usar undefined para Windows Auth
    encrypt: process.env.DB_ENCRYPT === 'true',
    trustCertificate: process.env.DB_TRUST_CERTIFICATE === 'true'
  },
  
  jwt: {
    secret: process.env.JWT_SECRET || 'default_secret_change_me',
    expiresIn: process.env.JWT_EXPIRES_IN || '24h'
  },
  
  email: {
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT) || 587,
    user: process.env.SMTP_USER || '',
    password: process.env.SMTP_PASSWORD || '',
    from: process.env.EMAIL_FROM || 'noreply@hotel.com'
  },
  
  pythonApi: {
    url: process.env.PYTHON_API_URL || 'http://localhost:5000',
    key: process.env.PYTHON_API_KEY || ''
  },
  
  frontend: {
    url: process.env.FRONTEND_URL || 'http://localhost:5173'
  },
  
  socket: {
    corsOrigin: process.env.SOCKET_CORS_ORIGIN || 'http://localhost:5173'
  },
  
  upload: {
    path: process.env.UPLOAD_PATH || './uploads',
    maxSize: parseInt(process.env.MAX_FILE_SIZE) || 10485760
  },
  
  log: {
    level: process.env.LOG_LEVEL || 'info'
  }
};
