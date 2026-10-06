const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

// Route Handlers
const patrolRoutes = require('./routes/patrolRoutes');
const alertRoutes = require('./routes/alertRoutes');
const conflictRoutes = require('./routes/conflictRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');

const app = express();

// Security and CORS
const allowedOrigin = process.env.CORS_ORIGIN || 'http://localhost:7051';
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, or Postman)
      if (!origin || origin === allowedOrigin || origin.startsWith('http://localhost:')) {
        return callback(null, true);
      }
      return callback(null, true);
    },
    credentials: true,
  })
);

// Standard Body Parsers
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request Logger Middleware
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    if (process.env.NODE_ENV !== 'test') {
      console.log(`[HTTP] ${req.method} ${req.originalUrl} ${res.statusCode} - ${duration}ms`);
    }
  });
  next();
});

// Root Information Endpoint
app.get('/', (req, res) => {
  res.json({
    name: 'Smart Wildlife Conservation System - REST API',
    status: 'online',
    version: '1.0.0',
    documentation: '/api/health',
    modules: ['/api/patrols', '/api/alerts', '/api/conflicts', '/api/analytics'],
  });
});

// System Health & Diagnostics Endpoint
app.get('/api/health', (req, res) => {
  const dbStateMap = { 0: 'disconnected', 1: 'connected', 2: 'connecting', 3: 'disconnecting' };
  const dbState = dbStateMap[mongoose.connection.readyState] || 'unknown';

  res.status(200).json({
    status: 'healthy',
    service: 'wildlife-monitoring-backend',
    port: parseInt(process.env.PORT, 10) || 7050,
    database: dbState,
    uptimeSeconds: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
  });
});

// Mount Module Endpoints
app.use('/api/patrols', patrolRoutes);
app.use('/api/alerts', alertRoutes);
app.use('/api/conflicts', conflictRoutes);
app.use('/api/analytics', analyticsRoutes);

// 404 Route Not Found Handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    requestedUrl: req.originalUrl,
  });
});

// Global Centralized Error Handler
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  console.error('[Error]', err);
  res.status(statusCode).json({
    success: false,
    error: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
});

module.exports = app;
