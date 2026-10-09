// [IT23818620 - K.M.S.G.S.C. Karunanayake] - UC-02A: Monitor Live Animal Telemetry
// Unit Tests for Validation Service
// Covers: Positive cases, negative cases, edge cases, and error cases (as per rubric).

const { validateTelemetry } = require('../services/validationService');

describe('[IT23818620] UC-02A: Telemetry Validation Service Tests', () => {
  
  describe('Coordinate Validation', () => {
    it('should pass for valid GPS coordinates', () => {
      const telemetry = { latitude: 6.9271, longitude: 79.8612, timestamp: new Date().toISOString() };
      const collar = { status: 'Active' };
      const result = validateTelemetry(telemetry, collar);
      expect(result.isValid).toBe(true);
    });

    it('should fail if latitude is out of bounds (> 90)', () => {
      const telemetry = { latitude: 91, longitude: 79.8612, timestamp: new Date().toISOString() };
      const collar = { status: 'Active' };
      const result = validateTelemetry(telemetry, collar);
      expect(result.isValid).toBe(false);
      expect(result.reason).toBe('Invalid coordinates');
    });

    it('should fail if longitude is out of bounds (< -180)', () => {
      const telemetry = { latitude: 6.9271, longitude: -181, timestamp: new Date().toISOString() };
      const collar = { status: 'Active' };
      const result = validateTelemetry(telemetry, collar);
      expect(result.isValid).toBe(false);
      expect(result.reason).toBe('Invalid coordinates');
    });
  });

  describe('Collar Status Validation', () => {
    it('should fail if collar data is null (Unknown collar)', () => {
      const telemetry = { latitude: 6.9271, longitude: 79.8612, timestamp: new Date().toISOString() };
      const collar = null;
      const result = validateTelemetry(telemetry, collar);
      expect(result.isValid).toBe(false);
      expect(result.reason).toBe('Unknown or inactive collar');
    });

    it('should fail if collar status is Inactive', () => {
      const telemetry = { latitude: 6.9271, longitude: 79.8612, timestamp: new Date().toISOString() };
      const collar = { status: 'Inactive' };
      const result = validateTelemetry(telemetry, collar);
      expect(result.isValid).toBe(false);
      expect(result.reason).toBe('Unknown or inactive collar');
    });
  });

});
