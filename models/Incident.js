const mongoose = require('mongoose');
const { INCIDENT_TYPES, INCIDENT_SEVERITY, SYNC_STATUSES } = require('../config/patrolConstants');

/**
 * Incident Mongoose Schema
 * Domain: Field Patrols & Incidents (UC-01)
 * Author: M.U. Handaragama (IT23819092)
 */
const incidentSchema = new mongoose.Schema(
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
    patrolId: {
      type: String,
      required: [true, 'Patrol ID is required'],
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
    incidentType: {
      type: String,
      enum: Object.values(INCIDENT_TYPES),
      required: [true, 'Incident Type is required'],
      index: true,
    },
    severity: {
      type: String,
      enum: Object.values(INCIDENT_SEVERITY),
      default: INCIDENT_SEVERITY.MEDIUM,
      index: true,
    },
    coordinates: {
      latitude: {
        type: Number,
        required: [true, 'Latitude is required'],
        min: -90,
        max: 90,
      },
      longitude: {
        type: Number,
        required: [true, 'Longitude is required'],
        min: -180,
        max: 180,
      },
      accuracyMeters: {
        type: Number,
        default: 5.0,
      },
    },
    landmark: {
      type: String,
      trim: true,
      default: '',
    },
    description: {
      type: String,
      required: [true, 'Incident description is required'],
      trim: true,
    },
    photos: {
      type: [String],
      default: [],
    },
    status: {
      type: String,
      enum: ['OPEN', 'UNDER_INVESTIGATION', 'RESOLVED', 'CLOSED'],
      default: 'OPEN',
      index: true,
    },
    syncStatus: {
      type: String,
      enum: Object.values(SYNC_STATUSES),
      default: SYNC_STATUSES.SYNCED,
      index: true,
    },
    reportedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Incident', incidentSchema);
