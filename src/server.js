require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { prisma, connectDatabase } = require('./db/prisma');

const linkRoutes = require('./routes/links');
const analyticsRoutes = require('./routes/analytics');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoints
app.get('/health', (req, res) => {
  res.json({ ok: true, version: '1.0' });
});

app.get('/healthz', (req, res) => {
  res.json({ ok: true, version: '1.0' });
});

// Routes
app.use('/api/links', linkRoutes);
app.use('/api/analytics', analyticsRoutes);

// Redirect route (must be after API routes)
const redirectHandler = require('./routes/redirect');
app.get('/:shortCode', redirectHandler);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

const PORT = process.env.PORT || 3000;

// Start server and test database connection
app.listen(PORT, async () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  
  // Test database connection
  await connectDatabase();
  
  // Periodic connection health check (every 30 seconds)
  setInterval(async () => {
    try {
      await prisma.$queryRaw`SELECT 1`;
    } catch (error) {
      console.error('⚠️ Database health check failed:', error.message);
      // Attempt reconnection
      await connectDatabase();
    }
  }, 30000);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  await prisma.$disconnect();
  process.exit(0);
});

module.exports = app;

