const patrolService = require('../services/patrolService');

/**
 * Controller: Incident Logging & Updates (UC-01)
 * Author: M.U. Handaragama (IT23819092)
 */

exports.logIncident = async (req, res, next) => {
  try {
    const {
      patrolId,
      rangerId,
      rangerName,
      incidentType,
      severity,
      coordinates,
      landmark,
      description,
      photos,
      localId,
    } = req.body;

    const effectiveRangerId = rangerId || req.user?.userId || 'USR-8822';
    const effectiveRangerName = rangerName || req.user?.name || 'M.U. Handaragama';

    const incident = await patrolService.logIncident({
      patrolId,
      rangerId: effectiveRangerId,
      rangerName: effectiveRangerName,
      incidentType,
      severity,
      coordinates,
      landmark,
      description,
      photos,
      localId,
    });

    res.status(201).json({
      success: true,
      message: 'Incident reported and recorded successfully',
      incident,
    });
  } catch (err) {
    next(err);
  }
};

exports.updateIncident = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const updatedIncident = await patrolService.updateIncident(id, updateData);

    res.status(200).json({
      success: true,
      message: 'Incident updated successfully',
      incident: updatedIncident,
    });
  } catch (err) {
    next(err);
  }
};

exports.getAllIncidents = async (req, res, next) => {
  try {
    const { patrolId, incidentType, severity } = req.query;
    const incidents = await patrolService.getAllIncidents({ patrolId, incidentType, severity });
    res.status(200).json({
      success: true,
      count: incidents.length,
      incidents,
    });
  } catch (err) {
    next(err);
  }
};

exports.getIncidentById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const incident = await patrolService.getIncidentById(id);
    if (!incident) {
      return res.status(404).json({ success: false, error: `Incident not found with ID ${id}` });
    }
    res.status(200).json({ success: true, incident });
  } catch (err) {
    next(err);
  }
};
