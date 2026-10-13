const patrolService = require('../services/patrolService');

/**
 * Controller: Field Patrols Management (UC-01)
 * Author: M.U. Handaragama (IT23819092)
 */

exports.getOverview = (req, res) => {
  res.status(200).json({
    module: 'Field Patrols & Incidents',
    code: 'UC-01',
    author: 'M.U. Handaragama (IT23819092)',
    status: 'active',
    description: 'Manages ranger patrol lifecycle, GPS waypoint tracking, offline incident logging, and synchronization.',
    predefinedRoutes: patrolService.getAvailableRoutes(),
  });
};

exports.getRoutes = (req, res) => {
  const routes = patrolService.getAvailableRoutes();
  res.status(200).json({ success: true, routes });
};

exports.startPatrol = async (req, res, next) => {
  try {
    const { rangerId, rangerName, routeId, routeName, initialBattery, localId } = req.body;
    const effectiveRangerId = rangerId || req.user?.userId || 'USR-8822';
    const effectiveRangerName = rangerName || req.user?.name || 'M.U. Handaragama';

    const patrol = await patrolService.startPatrol({
      rangerId: effectiveRangerId,
      rangerName: effectiveRangerName,
      routeId,
      routeName,
      initialBattery,
      localId,
    });

    res.status(201).json({
      success: true,
      message: 'Patrol session initialized successfully',
      patrol,
    });
  } catch (err) {
    next(err);
  }
};

exports.addWaypoint = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { latitude, longitude, accuracyMeters, isManual, note } = req.body;

    const updatedPatrol = await patrolService.addWaypoint(id, {
      latitude,
      longitude,
      accuracyMeters,
      isManual,
      note,
    });

    res.status(200).json({
      success: true,
      message: isManual ? 'Manual point of interest waypoint added' : 'GPS breadcrumb waypoint recorded',
      patrol: updatedPatrol,
    });
  } catch (err) {
    next(err);
  }
};

exports.endPatrol = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { batteryLevel, summaryNotes } = req.body;

    const finalizedPatrol = await patrolService.endPatrol(id, {
      batteryLevel,
      summaryNotes,
    });

    res.status(200).json({
      success: true,
      message: 'Patrol session marked as completed',
      patrol: finalizedPatrol,
    });
  } catch (err) {
    next(err);
  }
};

exports.getAllPatrols = async (req, res, next) => {
  try {
    const { rangerId, status } = req.query;
    const patrols = await patrolService.getAllPatrols({ rangerId, status });
    res.status(200).json({
      success: true,
      count: patrols.length,
      patrols,
    });
  } catch (err) {
    next(err);
  }
};

exports.getPatrolById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const patrol = await patrolService.getPatrolById(id);
    if (!patrol) {
      return res.status(404).json({ success: false, error: `Patrol not found with ID ${id}` });
    }
    res.status(200).json({ success: true, patrol });
  } catch (err) {
    next(err);
  }
};

exports.syncBatch = async (req, res, next) => {
  try {
    const { patrols = [], incidents = [] } = req.body;
    const syncResult = await patrolService.syncBatch({ patrols, incidents });
    res.status(200).json(syncResult);
  } catch (err) {
    next(err);
  }
};

exports.createRoute = async (req, res, next) => {
  try {
    const { name, sector, targetDistanceKm, description, riskLevel } = req.body;
    const createdBy = req.user?.name || req.body.createdBy || 'Park Manager';
    const newRoute = await patrolService.createRoute({
      name,
      sector,
      targetDistanceKm,
      description,
      riskLevel,
      createdBy,
    });
    res.status(201).json({
      success: true,
      message: 'Patrol route created successfully',
      route: newRoute,
    });
  } catch (err) {
    next(err);
  }
};

exports.deleteRoute = async (req, res, next) => {
  try {
    const { id } = req.params;
    const deleted = await patrolService.deleteRoute(id);
    res.status(200).json({
      success: true,
      message: 'Patrol route removed successfully',
      route: deleted,
    });
  } catch (err) {
    next(err);
  }
};

exports.shareLiveGps = (req, res, next) => {
  try {
    const {
      rangerId,
      rangerName,
      latitude,
      longitude,
      accuracyMeters,
      batteryLevel,
      routeId,
      routeName,
      status,
      note,
    } = req.body;

    const effectiveRangerId = rangerId || req.user?.userId || 'USR-8822';
    const effectiveRangerName = rangerName || req.user?.name || 'M.U. Handaragama';

    const telemetry = patrolService.shareLiveGps({
      rangerId: effectiveRangerId,
      rangerName: effectiveRangerName,
      latitude,
      longitude,
      accuracyMeters,
      batteryLevel,
      routeId,
      routeName,
      status,
      note,
    });

    res.status(200).json({
      success: true,
      message: 'Live GPS telemetry shared with Liaison Officer & HQ',
      telemetry,
    });
  } catch (err) {
    next(err);
  }
};

exports.getActiveRangersGps = (req, res) => {
  const activeRangers = patrolService.getActiveRangersGps();
  res.status(200).json({
    success: true,
    count: activeRangers.length,
    rangers: activeRangers,
  });
};
