const express = require('express');
const router = express.Router();
const patrolController = require('../controllers/patrolController');
const incidentController = require('../controllers/incidentController');

/**
 * Routes: Field Patrols & Incidents (UC-01)
 * Author: M.U. Handaragama (IT23819092)
 */

// Overview & predefined routes
router.get('/', patrolController.getOverview);
router.get('/routes', patrolController.getRoutes);

// Patrol CRUD & lifecycle
router.get('/list', patrolController.getAllPatrols);
router.post('/start', patrolController.startPatrol);
router.get('/:id', patrolController.getPatrolById);
router.post('/:id/waypoint', patrolController.addWaypoint);
router.post('/:id/end', patrolController.endPatrol);

// Batch offline synchronization endpoint
router.post('/sync', patrolController.syncBatch);

// Incidents sub-routes
router.get('/incidents/all', incidentController.getAllIncidents);
router.post('/incidents', incidentController.logIncident);
router.put('/incidents/:id', incidentController.updateIncident);
router.get('/incidents/:id', incidentController.getIncidentById);

module.exports = router;
