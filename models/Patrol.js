const mongoose = require('mongoose');
const { PATROL_STATUSES, SYNC_STATUSES } = require('../config/patrolConstants');

/**
 * Patrol Mongoose Schema
 * Domain: Field Patrols & Incidents (UC-01)
 * Author: M.U. Handaragama (IT23819092)
 */
const waypointSchema = new mongoose.Schema(
  {
    latitude: {
      type: Number,
      required: true,
      min: -90,
      max: 90,
    },
    longitude: {
      type: Number,
      required: true,
      min: -180,
      max: 180,
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
    accuracyMeters: {
      type: Number,
      default: 5.0,
    },
    isManual: {
      type: Boolean,
      default: false,
    },
    note: {
      type: String,
      trim: true,
      default: '',
    },
  },
  { _id: false }
);

const patrolSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
    },
    localId: {
      type: String,
      trim: true,
      index: true,
    },
    rangerId: {
      type: String,
      required: [true, 'Ranger ID is required'],
      trim: true,
      index: true,
    },
    rangerName: {
      type: String,
      required: [true, 'Ranger Name is required'],
      trim: true,
    },
    routeId: {
      type: String,
      required: [true, 'Route ID is required'],
      trim: true,
    },
    routeName: {
      type: String,
      required: [true, 'Route Name is required'],
      trim: true,
    },
    status: {
      type: String,
      enum: Object.values(PATROL_STATUSES),
      default: PATROL_STATUSES.IN_PROGRESS,
      index: true,
    },
    startTime: {
      type: Date,
      required: true,
      default: Date.now,
    },
    endTime: {
      type: Date,
      default: null,
    },
    durationMinutes: {
      type: Number,
      default: 0,
    },
    distanceKm: {
      type: Number,
      default: 0,
    },
    batteryLevel: {
      type: Number,
      default: 100,
    },
    waypoints: [waypointSchema],
    incidentsCount: {
      type: Number,
      default: 0,
    },
    syncStatus: {
      type: String,
      enum: Object.values(SYNC_STATUSES),
      default: SYNC_STATUSES.SYNCED,
      index: true,
    },
    lastSyncedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Patrol', patrolSchema);
