require('dotenv').config();
const mongoose = require('mongoose');
const AnimalCollar = require('./models/AnimalCollar');
const axios = require('axios');

async function testTelemetry() {
  try {
    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/wildlife_monitoring');
    console.log('Connected to DB');

    // 1. Seed a Collar
    const collarId = 'COLLAR-TEST-001';
    await AnimalCollar.findOneAndUpdate(
      { collarId },
      { 
        collarId,
        animalId: 'ELEPHANT-TUSKER-01',
        status: 'Active',
      },
      { upsert: true, new: true }
    );
    console.log('Seeded Collar:', collarId);

    // 2. Test the Ingest API (Randomize location slightly to see multiple dots)
    const lat = 6.9271 + (Math.random() * 0.005);
    const lon = 79.8612 + (Math.random() * 0.005);
    
    const payload = {
      collarId,
      latitude: lat,
      longitude: lon,
      timestamp: new Date().toISOString()
    };

    console.log('Sending Telemetry:', payload);
    const response = await axios.post('http://localhost:7050/api/telemetry/ingest', payload);
    
    console.log('Response Status:', response.status);
    console.log('Response Data:', response.data);
    console.log('\n✅ Ping sent successfully! Check your frontend dashboard.');

  } catch (error) {
    console.error('Test failed:', error.response ? error.response.data : error.message);
  } finally {
    mongoose.disconnect();
  }
}

testTelemetry();
