// [IT23818620 - K.M.S.G.S.C. Karunanayake] - UC-02A: Monitor Live Animal Telemetry
// SOLID Principle: SRP - Routes handle route definitions and mapping to controllers only.

const express = require('express');
const router = express.Router();
const telemetryController = require('../controllers/telemetryController');

// POST route for Sensor Gateway to send telemetry data
router.post('/ingest', telemetryController.ingestTelemetry);

// GET route for the Dashboard to retrieve live data
router.get('/live', telemetryController.getLiveTelemetry);

module.exports = router;
