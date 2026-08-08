const cors = require('cors');
const config = require('./env');

const corsOptions = {
  origin: config.frontend.url,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  credentials: true,
  maxAge: 86400 // 24 hours
};

module.exports = cors(corsOptions);
