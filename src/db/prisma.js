const { PrismaClient } = require('@prisma/client');

// Create a singleton PrismaClient instance with optimized configuration
const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  errorFormat: 'pretty',
  // Optimize connection pool for Neon
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  }
});

// Connection state
let isConnected = false;

// Test database connection
async function connectDatabase() {
  if (isConnected) {
    return true;
  }

  try {
    await prisma.$connect();
    isConnected = true;
    console.log('✅ Database connected successfully');
    return true;
  } catch (error) {
    isConnected = false;
    console.error('❌ Database connection failed:', error.message);
    return false;
  }
}

// Retry wrapper for database operations
async function withRetry(operation, maxRetries = 3, delay = 1000) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      // Ensure connection is active
      if (!isConnected) {
        await connectDatabase();
      }
      return await operation();
    } catch (error) {
      // Check if it's a connection error
      const isConnectionError = 
        error.code === 'P1001' || 
        error.code === 'P1000' ||
        error.message?.includes("Can't reach database server") ||
        error.message?.includes("Connection") ||
        error.message?.includes("timeout");

      if (isConnectionError && i < maxRetries - 1) {
        console.log(`⚠️ Connection error, retrying... (${i + 1}/${maxRetries})`);
        isConnected = false;
        
        // Reconnect before retry
        try {
          await prisma.$disconnect().catch(() => {});
          await new Promise(resolve => setTimeout(resolve, delay * (i + 1)));
          await prisma.$connect();
          isConnected = true;
        } catch (reconnectError) {
          console.error('Reconnection failed:', reconnectError.message);
        }
        continue;
      }
      throw error;
    }
  }
}

// Handle Prisma errors
prisma.$on('error', (e) => {
  console.error('Prisma Client Error:', e);
  isConnected = false;
});

// Handle process termination
process.on('beforeExit', async () => {
  await prisma.$disconnect();
});

module.exports = { 
  prisma, 
  connectDatabase, 
  withRetry 
};

