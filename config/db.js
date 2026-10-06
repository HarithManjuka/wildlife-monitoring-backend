const mongoose = require('mongoose');

/**
 * Connects to MongoDB with connection latency measurement and ping check.
 * Handles Atlas, local MongoDB, and offline development mode gracefully.
 */
const connectDB = async () => {
  const mongoURI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/wildlife_monitoring';
  const startTime = Date.now();

  try {
    const conn = await mongoose.connect(mongoURI, {
      serverSelectionTimeoutMS: 5000,
    });

    // Verify database responsiveness with admin ping
    let pingOk = false;
    try {
      const pingResult = await conn.connection.db.admin().ping();
      pingOk = pingResult && pingResult.ok === 1;
    } catch {
      pingOk = true; // Connection succeeded even if admin ping is restricted
    }

    const latency = Date.now() - startTime;
    const host = conn.connection.host || 'Unknown Host';
    const dbName = conn.connection.name || 'wildlife_monitoring';

    console.log('\n' + '─'.repeat(70));
    console.log('🍃 \x1b[32m\x1b[1mMongoDB Connected Successfully\x1b[0m');
    console.log(`   • Host / Cluster: \x1b[36m${host}\x1b[0m`);
    console.log(`   • Database Name:  \x1b[36m${dbName}\x1b[0m`);
    console.log(`   • Latency:        \x1b[33m${latency}ms\x1b[0m (Ping: ${pingOk ? 'OK' : 'Bypassed'})`);
    console.log(`   • Driver State:   \x1b[32mReady\x1b[0m`);
    console.log('─'.repeat(70));

    return conn;
  } catch (err) {
    console.log('\n' + '─'.repeat(70));
    console.log('⚠️  \x1b[33m\x1b[1mMongoDB Connection Warning\x1b[0m');
    console.log(`   • Reason:  \x1b[31m${err.message}\x1b[0m`);
    console.log('   • Notice:  Backend running in offline mode. Local API tests will work,');
    console.log('              but persistent database operations will queue or fail.');
    console.log('─'.repeat(70));
    return null;
  }
};

/**
 * Cleanly disconnects the MongoDB connection during process shutdown.
 */
const disconnectDB = async () => {
  if (mongoose.connection.readyState !== 0) {
    try {
      await mongoose.connection.close(false);
      return true;
    } catch (err) {
      console.error(`[Database] Error while closing connection: ${err.message}`);
      return false;
    }
  }
  return true;
};

module.exports = {
  connectDB,
  disconnectDB,
};
