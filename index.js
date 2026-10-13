require('dotenv').config();
const http = require('http');
const readline = require('readline');
const app = require('./app');
const { connectDB, disconnectDB } = require('./config/db');

// Unique port configuration (defaults to 7050)
const PORT = parseInt(process.env.PORT, 10) || 7050;
const NODE_ENV = process.env.NODE_ENV || 'development';
const CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:7051';

// Cross-platform Windows Ctrl+C bridge
if (process.platform === 'win32') {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  rl.on('SIGINT', () => {
    process.emit('SIGINT');
  });
}

async function startServer() {
  // 1. Initialize Database
  await connectDB();

  // 2. Create HTTP Server
  const server = http.createServer(app);

  server.listen(PORT, () => {
    const divider = '═'.repeat(72);
    console.log('\n' + divider);
    console.log('🌿 \x1b[1m\x1b[32mSMART WILDLIFE CONSERVATION SYSTEM - BACKEND REST API\x1b[0m');
    console.log(divider);
    console.log(`🚀 \x1b[1mService URL:\x1b[0m       \x1b[36mhttp://localhost:${PORT}\x1b[0m`);
    console.log(`🩺 \x1b[1mHealth Check:\x1b[0m      \x1b[36mhttp://localhost:${PORT}/api/health\x1b[0m`);
    console.log(`🌐 \x1b[1mAllowed Origin:\x1b[0m    \x1b[35m${CORS_ORIGIN}\x1b[0m`);
    console.log(`⚙️  \x1b[1mEnvironment:\x1b[0m       \x1b[33m${NODE_ENV}\x1b[0m`);
    console.log(`📦 \x1b[1mProcess PID:\x1b[0m       \x1b[90m${process.pid} (Node ${process.version})\x1b[0m`);
    console.log('─'.repeat(72));
    console.log('📡 \x1b[1mActive Domain Modules:\x1b[0m');
    console.log('   • \x1b[35m/api/auth\x1b[0m       - Authentication & Team Access');
    console.log('   • \x1b[32m/api/patrols\x1b[0m    - Field Patrols & Incident Sync (Handaragama)');
    console.log('   • \x1b[33m/api/alerts\x1b[0m     - Sensor & Geofence Breaches (Karunanayake)');
    console.log('   • \x1b[31m/api/conflicts\x1b[0m  - Community Conflict Triage (Abeykoon)');
    console.log('   • \x1b[34m/api/analytics\x1b[0m  - Hotspot Intelligence & Reports (Jayakody)');
    console.log(divider);
    console.log('✨ \x1b[90mServer is actively accepting requests. Press \x1b[1m[Ctrl+C]\x1b[0m\x1b[90m to stop.\x1b[0m\n');
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`\n❌ \x1b[31mPort ${PORT} is currently in use by another process.\x1b[0m`);
      console.error('   Please stop the conflicting process or change PORT in .env.\n');
    } else {
      console.error(`\n❌ Server error: ${err.message}\n`);
    }
    process.exit(1);
  });

  // Graceful Shutdown Coordinator
  let isShuttingDown = false;

  const handleGracefulShutdown = async (signal) => {
    if (isShuttingDown) return;
    isShuttingDown = true;

    console.log(`\n\n🛑 \x1b[33m[Shutdown]\x1b[0m Received \x1b[1m${signal}\x1b[0m. Initiating graceful shutdown...`);

    // Safety timeout: force exit if resources hang for > 5 seconds
    const forceExitTimer = setTimeout(() => {
      console.error('⚠️  \x1b[31m[Shutdown]\x1b[0m Forcing shutdown after timeout limit.');
      process.exit(1);
    }, 5000);
    forceExitTimer.unref();

    try {
      // Step 1: Stop accepting new HTTP requests and drain active ones
      console.log('   ⏳ 1/2 Closing HTTP server connections...');
      await new Promise((resolve) => {
        server.close((err) => {
          if (err) {
            console.error(`   ❌ Error closing HTTP server: ${err.message}`);
          } else {
            console.log('   ✔  \x1b[32mHTTP server closed successfully.\x1b[0m');
          }
          resolve();
        });
      });

      // Step 2: Close MongoDB Mongoose connection cleanly
      console.log('   ⏳ 2/2 Closing MongoDB database connection...');
      await disconnectDB();
      console.log('   ✔  \x1b[32mMongoDB connection closed cleanly.\x1b[0m');

      console.log('\n🌿 \x1b[32mAll backend services stopped safely. Goodbye!\x1b[0m 👋\n');

      if (signal === 'SIGUSR2') {
        // Nodemon restart signal
        process.kill(process.pid, 'SIGUSR2');
      } else {
        process.exit(0);
      }
    } catch (shutdownErr) {
      console.error(`❌ Error during shutdown: ${shutdownErr.message}`);
      process.exit(1);
    }
  };

  // Signal handlers
  process.on('SIGINT', () => handleGracefulShutdown('SIGINT (Ctrl+C)'));
  process.on('SIGTERM', () => handleGracefulShutdown('SIGTERM'));
  process.once('SIGUSR2', () => handleGracefulShutdown('SIGUSR2'));
}

startServer();
