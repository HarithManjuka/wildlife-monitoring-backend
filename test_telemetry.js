// [IT23818620 - K.M.S.G.S.C. Karunanayake] - UC-02A: Monitor Live Animal Telemetry
// Interactive IoT Telemetry Testing Script for Viva Demonstration
// Supports testing: Valid, Duplicate, Invalid Coordinates, and Stale data.

require('dotenv').config();
const mongoose = require('mongoose');
const AnimalCollar = require('./models/AnimalCollar');
const axios = require('axios');

const API_URL = 'http://localhost:7050/api/telemetry/ingest';
const collarId = 'COLLAR-TEST-001';

async function seedCollar() {
  await AnimalCollar.findOneAndUpdate(
    { collarId },
    { 
      collarId,
      animalId: 'ELEPHANT-TUSKER-01',
      status: 'Active',
    },
    { upsert: true, returnDocument: 'after' }
  );
}

async function sendPing(label, payload) {
  console.log(`\n--------------------------------------------------`);
  console.log(`📡 Scenario: ${label}`);
  console.log(`   Payload:`, payload);

  try {
    const response = await axios.post(API_URL, payload);
    console.log(`   Status:  \x1b[32m${response.status} Created\x1b[0m`);
    console.log(`   Result:  \x1b[32m✅ ACCEPTED\x1b[0m - Telemetry saved & location updated!`);
    return response.data;
  } catch (error) {
    const status = error.response ? error.response.status : 'ERR';
    const errData = error.response ? error.response.data : {};
    const reason = errData.error || errData.message || (errData.success === false ? 'Rejected by telemetry business rules' : JSON.stringify(errData));
    console.log(`   Status:  \x1b[33m${status} Unprocessable Entity\x1b[0m`);
    console.log(`   Result:  \x1b[31m❌ BLOCKED BY SERVER\x1b[0m - Reason: "${reason}"`);
    return errData;
  }
}

async function runTest() {
  const mode = (process.argv[2] || 'all').toLowerCase();

  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/wildlife_monitoring');
    console.log('\n🌿 Connected to MongoDB');
    await seedCollar();
    console.log(`🏷️  Collar ready: ${collarId} (Animal: ELEPHANT-TUSKER-01)`);

    // 1. Valid Ping
    const validTimestamp = new Date().toISOString();
    const validPayload = {
      collarId,
      latitude: 6.9271 + (Math.random() * 0.005),
      longitude: 79.8612 + (Math.random() * 0.005),
      timestamp: validTimestamp
    };

    if (mode === 'valid' || mode === 'all') {
      await sendPing('1. VALID GPS Ping', validPayload);
    }

    // 2. Duplicate Ping (Replays the latest recorded timestamp)
    if (mode === 'duplicate' || mode === 'all') {
      const collarDoc = await AnimalCollar.findOne({ collarId });
      let dupTimestamp = collarDoc?.latestLocation?.timestamp;

      if (!dupTimestamp) {
        // If no location exists yet, send a baseline ping first
        await sendPing('Initial Baseline Ping', validPayload);
        const updatedDoc = await AnimalCollar.findOne({ collarId });
        dupTimestamp = updatedDoc?.latestLocation?.timestamp || validTimestamp;
      }

      const duplicatePayload = {
        collarId,
        latitude: 6.9280,
        longitude: 79.8620,
        timestamp: dupTimestamp // Replaying recorded timestamp
      };

      await sendPing('2. DUPLICATE Ping (Replaying same timestamp)', duplicatePayload);
    }

    // 3. Invalid Coordinates (Latitude > 90)
    const invalidPayload = {
      collarId,
      latitude: 999.0, // Invalid coordinate
      longitude: 79.8612,
      timestamp: new Date().toISOString()
    };

    if (mode === 'invalid' || mode === 'all') {
      await sendPing('3. INVALID GPS Coordinates (Lat: 999.0°)', invalidPayload);
    }

    // 4. Stale Ping (>24 hours old)
    const stalePayload = {
      collarId,
      latitude: 6.9275,
      longitude: 79.8615,
      timestamp: new Date(Date.now() - (48 * 60 * 60 * 1000)).toISOString() // 48h old
    };

    if (mode === 'stale' || mode === 'all') {
      await sendPing('4. STALE Ping (>24 hours old)', stalePayload);
    }

    console.log('\n==================================================');
    console.log('✨ Demonstration completed!');
    console.log('💡 Viva Command Options:');
    console.log('   node test_telemetry.js           (Runs all 4 scenarios)');
    console.log('   node test_telemetry.js valid     (Tests valid ping only)');
    console.log('   node test_telemetry.js duplicate (Tests duplicate rejection only)');
    console.log('   node test_telemetry.js invalid   (Tests invalid coordinate rejection only)');
    console.log('   node test_telemetry.js stale     (Tests stale telemetry detection only)');
    console.log('==================================================\n');

  } catch (error) {
    console.error('Fatal script error:', error.message);
  } finally {
    await mongoose.disconnect();
  }
}

runTest();
