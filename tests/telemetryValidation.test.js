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

  describe('Freshness Validation (Edge Cases)', () => {
    it('should pass if timestamp is current', () => {
      const telemetry = { latitude: 0, longitude: 0, timestamp: new Date().toISOString() };
      const collar = { status: 'Active' };
      const result = validateTelemetry(telemetry, collar);
      expect(result.isValid).toBe(true);
    });

    it('should fail if timestamp is older than 24 hours (Stale Data)', () => {
      const staleDate = new Date(Date.now() - (25 * 60 * 60 * 1000)).toISOString();
      const telemetry = { latitude: 0, longitude: 0, timestamp: staleDate };
      const collar = { status: 'Active' };
      const result = validateTelemetry(telemetry, collar);
      expect(result.isValid).toBe(false);
      expect(result.reason).toBe('Stale telemetry data');
    });
  });

  describe('Duplicate Data Validation', () => {
    it('should fail if new timestamp is exactly the same as latest location timestamp', () => {
      const sameTime = new Date().toISOString();
      const telemetry = { latitude: 0, longitude: 0, timestamp: sameTime };
      const collar = { status: 'Active', latestLocation: { timestamp: sameTime } };
      
      const result = validateTelemetry(telemetry, collar);
      
      expect(result.isValid).toBe(false);
      expect(result.reason).toBe('Duplicate telemetry data');
    });

    it('should pass if new timestamp is strictly greater than latest location timestamp', () => {
      const oldTime = new Date(Date.now() - 5000).toISOString();
      const newTime = new Date().toISOString();
      
      const telemetry = { latitude: 0, longitude: 0, timestamp: newTime };
      const collar = { status: 'Active', latestLocation: { timestamp: oldTime } };
      
      const result = validateTelemetry(telemetry, collar);
      
      expect(result.isValid).toBe(true);
    });
  });
});
