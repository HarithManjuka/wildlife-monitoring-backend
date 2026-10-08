const express = require('express');
const router = express.Router();
const incidentController = require('../controllers/incidentController');

/**
 * Routes: Incident Management (UC-01)
 * Author: M.U. Handaragama (IT23819092)
 */

router.get('/', incidentController.getAllIncidents);
router.post('/', incidentController.logIncident);
router.get('/:id', incidentController.getIncidentById);
router.put('/:id', incidentController.updateIncident);

module.exports = router;
