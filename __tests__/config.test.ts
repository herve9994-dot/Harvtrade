import { classifyDirection, clamp, formatPrice, formatPercentage, formatSignedPercentage } from '../src/domain/config';

describe('domain/config', () => {
  describe('classifyDirection', () => {
    it('classifies positive movement as UP', () => {
      expect(classifyDirection(0.001)).toBe('UP');
    });
    it('classifies negative movement as DOWN', () => {
      expect(classifyDirection(-0.001)).toBe('DOWN');
    });
    it('classifies small movement as FLAT', () => {
      expect(classifyDirection(0.00001)).toBe('FLAT');
      expect(classifyDirection(-0.00001)).toBe('FLAT');
    });
    it('respects custom threshold', () => {
      expect(classifyDirection(0.005, 0.01)).toBe('FLAT');
      expect(classifyDirection(0.02, 0.01)).toBe('UP');
    });
  });

  describe('clamp', () => {
    it('clamps below min', () => expect(clamp(-5, 0, 10)).toBe(0));
    it('clamps above max', () => expect(clamp(15, 0, 10)).toBe(10));
    it('keeps value in range', () => expect(clamp(5, 0, 10)).toBe(5));
  });

  describe('formatPrice', () => {
    it('formats BTC with 2 decimals', () => {
      expect(formatPrice(67000.5, 'BTC/USD')).toBe('67000.50');
    });
    it('formats EUR with 5 decimals', () => {
      expect(formatPrice(1.08567, 'EUR/USD')).toBe('1.08567');
    });
  });

  describe('formatPercentage', () => {
    it('formats as percentage', () => {
      expect(formatPercentage(0.634)).toBe('63.4%');
    });
  });

  describe('formatSignedPercentage', () => {
    it('adds + sign for positive', () => {
      expect(formatSignedPercentage(0.004)).toBe('+0.400%');
    });
    it('adds - sign for negative', () => {
      expect(formatSignedPercentage(-0.003)).toBe('-0.300%');
    });
  });
});
