// [IT23818620 - K.M.S.G.S.C. Karunanayake] - UC-02A: Monitor Live Animal Telemetry
// Unit Tests for Telemetry Service using Mongoose Mocks
// Covers: positive logic flows, and service orchestration.

const telemetryService = require('../services/telemetryService');
const AnimalCollar = require('../models/AnimalCollar');
const Telemetry = require('../models/Telemetry');
const sensorHealthService = require('../services/sensorHealthService');
const geofenceEvaluationService = require('../services/geofenceEvaluationService');

// Mock Mongoose models and sub-services
jest.mock('../models/AnimalCollar');
jest.mock('../models/Telemetry');
jest.mock('../services/sensorHealthService');
jest.mock('../services/geofenceEvaluationService');

describe('[IT23818620] UC-02A: Telemetry Service Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should successfully process valid telemetry and trigger down-stream services', async () => {
    // Arrange
    const mockTelemetryData = {
      collarId: 'COL-001',
      latitude: 7.0,
      longitude: 80.0,
      timestamp: new Date().toISOString()
    };

    const mockCollarData = {
      collarId: 'COL-001',
      animalId: 'ELE-1',
      status: 'Active',
      save: jest.fn().mockResolvedValue(true)
    };

    AnimalCollar.findOne.mockResolvedValue(mockCollarData);
    
    // Mock Telemetry.prototype.save
    const mockSave = jest.fn().mockResolvedValue(true);
    Telemetry.mockImplementation(() => ({
      save: mockSave
    }));

    sensorHealthService.updateHealth.mockResolvedValue(true);
    geofenceEvaluationService.provideValidLocation.mockResolvedValue({ isWithinGeofence: true });

    // Act
    const result = await telemetryService.processTelemetry(mockTelemetryData);

    // Assert
    expect(result.success).toBe(true);
    expect(AnimalCollar.findOne).toHaveBeenCalledWith({ collarId: 'COL-001' });
    
    // Check if down-stream updates occurred (SRP and Flow verification)
    expect(mockCollarData.save).toHaveBeenCalled();
    expect(mockCollarData.latestLocation.latitude).toBe(7.0);
    
    expect(sensorHealthService.updateHealth).toHaveBeenCalledWith('COL-001', 'Online');
    
    expect(geofenceEvaluationService.provideValidLocation).toHaveBeenCalledWith(
      'ELE-1',
      { latitude: 7.0, longitude: 80.0 },
      mockTelemetryData.timestamp
    );
  });

  it('should reject and record stale telemetry without saving to DB', async () => {
    // Arrange
    const staleTime = new Date(Date.now() - (48 * 60 * 60 * 1000)).toISOString();
    const mockTelemetryData = { collarId: 'COL-001', latitude: 7.0, longitude: 80.0, timestamp: staleTime };
    
    AnimalCollar.findOne.mockResolvedValue({
      collarId: 'COL-001',
      status: 'Active',
      save: jest.fn()
    });

    // Act
    const result = await telemetryService.processTelemetry(mockTelemetryData);

    // Assert
    expect(result.success).toBe(false);
    expect(result.reason).toBe('Stale telemetry data');
    
    // Should update health to stale, but NOT save telemetry ping
    expect(sensorHealthService.updateHealth).toHaveBeenCalledWith('COL-001', 'Stale');
    expect(Telemetry).not.toHaveBeenCalled();
  });

  it('should reject invalid telemetry when coordinates are out of bounds', async () => {
    // Arrange: Latitude > 90 is invalid
    const invalidTelemetry = {
      collarId: 'COL-001',
      latitude: 999.0,
      longitude: 80.0,
      timestamp: new Date().toISOString()
    };

    // Act
    const result = await telemetryService.processTelemetry(invalidTelemetry);

    // Assert
    expect(result.success).toBe(false);
    expect(result.reason).toBe('Invalid coordinates');
    expect(AnimalCollar.findOne).not.toHaveBeenCalled();
    expect(Telemetry).not.toHaveBeenCalled();
  });

  it('should reject duplicate telemetry when timestamp is equal or older than latest location', async () => {
    // Arrange: latest location timestamp is newer or equal
    const existingTimestamp = '2026-10-13T08:00:00.000Z';
    const duplicateTelemetry = {
      collarId: 'COL-001',
      latitude: 7.0,
      longitude: 80.0,
      timestamp: existingTimestamp // duplicate timestamp
    };

    AnimalCollar.findOne.mockResolvedValue({
      collarId: 'COL-001',
      status: 'Active',
      latestLocation: {
        latitude: 7.0,
        longitude: 80.0,
        timestamp: existingTimestamp
      },
      save: jest.fn()
    });

    // Act
    const result = await telemetryService.processTelemetry(duplicateTelemetry);

    // Assert
    expect(result.success).toBe(false);
    expect(result.reason).toBe('Duplicate telemetry data');
    expect(Telemetry).not.toHaveBeenCalled();
  });

  it('should reject telemetry when collar is unknown or inactive', async () => {
    // Arrange: collar status is Inactive
    const telemetryData = {
      collarId: 'COL-INACTIVE',
      latitude: 7.0,
      longitude: 80.0,
      timestamp: new Date().toISOString()
    };

    AnimalCollar.findOne.mockResolvedValue({
      collarId: 'COL-INACTIVE',
      status: 'Inactive'
    });

    // Act
    const result = await telemetryService.processTelemetry(telemetryData);

    // Assert
    expect(result.success).toBe(false);
    expect(result.reason).toBe('Unknown or inactive collar');
    expect(Telemetry).not.toHaveBeenCalled();
  });
});

