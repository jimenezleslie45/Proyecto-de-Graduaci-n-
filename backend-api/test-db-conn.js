const mssql = require('mssql');
require('dotenv').config();

const config = {
  server: process.env.DB_SERVER || 'localhost',
  port: parseInt(process.env.DB_PORT) || 1433,
  database: process.env.DB_NAME || 'HotelAutomation',
  user: process.env.DB_USER || 'sa',
  password: process.env.DB_PASSWORD || '',
  options: {
    encrypt: process.env.DB_ENCRYPT === 'true',
    trustServerCertificate: process.env.DB_TRUST_CERTIFICATE === 'true',
    enableArithAbort: true
  }
};

(async () => {
  try {
    console.log('Intentando conectar a SQL Server con:', {
      server: config.server,
      port: config.port,
      database: config.database,
      user: config.user,
      encrypt: config.options.encrypt,
      trustServerCertificate: config.options.trustServerCertificate
    });

    const pool = await mssql.connect(config);
    console.log('Conectado correctamente. Version:', pool ? pool.config.serverVersion : 'desconocida');
    await pool.close();
    process.exit(0);
  } catch (err) {
    console.error('Error al conectar:', err && err.message ? err.message : err);
    if (err && err.originalError) console.error('Detalle original:', err.originalError);
    process.exit(1);
  }
})();
