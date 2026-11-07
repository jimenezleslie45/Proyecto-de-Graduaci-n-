const config = require('./env');
const logger = require('../middlewares/logger');

let pool = null;
let isDemoMode = false;

/**
 * Connect to SQL Server database
 */
const connect = async () => {
  if (config.nodeEnv === 'production' && (!config.db.user || !config.db.password)) {
    throw new Error('DB_USER and DB_PASSWORD must be configured in production.');
  }

  try {
    if (pool) {
      return pool;
    }

    const useSqlCredentials = Boolean(config.db.user && config.db.password);
    const sql = useSqlCredentials ? require('mssql') : require('mssql/msnodesqlv8');
    const serverName = config.db.instance
      ? `${config.db.server}\\${config.db.instance}`
      : config.db.server;
    const dbConfig = useSqlCredentials
      ? {
          server: serverName,
          port: config.db.port,
          database: config.db.database,
          user: config.db.user,
          password: config.db.password,
          options: {
            encrypt: config.db.encrypt,
            trustServerCertificate: config.db.trustCertificate
          }
        }
      : {
          server: serverName,
          database: config.db.database,
          driver: 'msnodesqlv8',
          options: {
            trustedConnection: true
          }
        };

    logger.info('Connecting to SQL Server...');
    pool = await sql.connect(dbConfig);
    
    logger.info('Connected to SQL Server successfully');
    
    pool.on('error', (err) => {
      logger.error('SQL Server connection error:', err);
      pool = null;
    });
    
    return pool;
  } catch (error) {
    logger.error('----------------------------------------------------');
    logger.error('FALLO LA CONEXIÓN A LA BASE DE DATOS - DETALLES:');
    logger.error(`Error: ${JSON.stringify(error, Object.getOwnPropertyNames(error))}`);
    logger.error('----------------------------------------------------');

    if (config.nodeEnv === 'production') {
      throw error;
    }

    isDemoMode = true;
    logger.warn('Running in demo mode - no database connection');
    return null;
  }
};

/**
 * Get database connection pool
 */
const getPool = () => {
  // Return null if in demo mode or no pool
  if (!pool || isDemoMode) {
    return null;
  }
  return pool;
};

/**
 * Check if database is connected
 */
const isConnected = () => {
  return pool && !isDemoMode && pool.connected;
};

/**
 * Execute a query
 */
const query = async (sql, params = {}) => {
  const pool = getPool();
  
  // If no pool (demo mode), return empty array
  if (!pool) {
    logger.warn('Database not connected - query skipped in demo mode');
    return [];
  }
  
  const request = pool.request();
  
  // Add parameters
  for (const [key, value] of Object.entries(params)) {
    request.input(key, value);
  }
  
  const result = await request.query(sql);
  return result.recordset;
};

/**
 * Execute a stored procedure
 */
const execute = async (procedureName, params = {}) => {
  const pool = getPool();
  
  // If no pool (demo mode), return empty array
  if (!pool) {
    logger.warn('Database not connected - execute skipped in demo mode');
    return [];
  }
  
  const request = pool.request();
  
  // Add parameters
  for (const [key, value] of Object.entries(params)) {
    request.input(key, value);
  }
  
  const result = await request.execute(procedureName);
  return result.recordset;
};

/**
 * Close database connection
 */
const close = async () => {
  if (pool) {
    await pool.close();
    pool = null;
    logger.info('Database connection closed');
  }
};

module.exports = {
  connect,
  getPool,
  isConnected,
  query,
  execute,
  close
};
