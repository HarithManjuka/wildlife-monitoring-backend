const mongoose = require('mongoose');

/**
 * CommunityReport Mongoose Schema
 * Domain: Community Conflict Triage (UC-03)
 * Implements persistent data structure for community incident reports,
 * SMS gateway webhook ingestion, threat classification, and ranger dispatch.
 */
const communityReportSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
    },
    source: {
      type: String,
      enum: ['SMS Gateway', 'Community Hotline', 'Mobile App', 'Manual Entry'],
      default: 'SMS Gateway',
      index: true,
    },
    sender: {
      type: String,
      default: 'Anonymous',
      trim: true,
    },
    contact: {
      type: String,
      trim: true,
      default: '',
    },
    village: {
      type: String,
      required: [true, 'Village or community sector is required'],
      trim: true,
      index: true,
    },
    conflictType: {
      type: String,
      enum: ['ELEPHANT_SIGHTING', 'CROP_RAIDING', 'PROPERTY_DAMAGE', 'HUMAN_CASUALTY', 'OTHER', null],
      default: 'OTHER',
      index: true,
    },
    locationDescription: {
      type: String,
      trim: true,
      default: '',
    },
    senderPhone: {
      type: String,
      trim: true,
      default: '',
    },
    coordinates: {
      latitude: {
        type: Number,
        min: -90,
        max: 90,
        default: null,
      },
      longitude: {
        type: Number,
        min: -180,
        max: 180,
        default: null,
      },
    },
    threatLevel: {
      type: String,
      enum: ['Low', 'Medium', 'High', 'Critical', 'Pending Triage'],
      default: 'Pending Triage',
      index: true,
    },
    status: {
      type: String,
      enum: [
        'Pending Triage',
        'Pending Dispatch',
        'Triaged',
        'Ranger Assigned',
        'Resolved',
        'Dismissed',
      ],
      default: 'Pending Dispatch',
      index: true,
    },
    description: {
      type: String,
      required: [true, 'Incident description is required'],
      trim: true,
    },
    dispatchedRanger: {
      type: String,
      default: null,
    },
    assignedBy: {
      type: String,
      default: null,
    },
    assignedAt: {
      type: Date,
      default: null,
    },
    reportedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    isDuplicate: {
      type: Boolean,
      default: false,
      index: true,
    },
    duplicateOf: {
      type: String,
      default: null,
    },
    triageNotes: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

// Prevent re-compilation error in Jest or hot-reload
const CommunityReport =
  mongoose.models.CommunityReport ||
  mongoose.model('CommunityReport', communityReportSchema);

module.exports = CommunityReport;
