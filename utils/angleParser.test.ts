import { describe, it, expect } from 'vitest';
import { parseAngleExpression, formatAngle } from './angleParser';

describe('angleParser', () => {
  describe('parseAngleExpression', () => {
    it('should parse direct numeric values', () => {
      expect(parseAngleExpression('0.5')).toBe(0.5);
      expect(parseAngleExpression('1.5708')).toBe(1.5708);
      expect(parseAngleExpression('3.14')).toBe(3.14);
    });

    it('should parse pi expressions', () => {
      const piValue = Math.PI;
      expect(parseAngleExpression('pi')).toBeCloseTo(piValue, 5);
      expect(parseAngleExpression('π')).toBeCloseTo(piValue, 5);
      expect(parseAngleExpression('2*pi')).toBeCloseTo(2 * piValue, 5);
      expect(parseAngleExpression('pi/2')).toBeCloseTo(piValue / 2, 5);
      expect(parseAngleExpression('pi/4')).toBeCloseTo(piValue / 4, 5);
    });

    it('should handle whitespace', () => {
      expect(parseAngleExpression(' pi / 4 ')).toBeCloseTo(Math.PI / 4, 5);
      expect(parseAngleExpression('  2 * pi  ')).toBeCloseTo(2 * Math.PI, 5);
    });

    it('should return null for empty or invalid input', () => {
      expect(parseAngleExpression('')).toBeNull();
      expect(parseAngleExpression('   ')).toBeNull();
      expect(parseAngleExpression('invalid')).toBeNull();
      expect(parseAngleExpression('abc123')).toBeNull();
    });

    it('should handle negative values', () => {
      expect(parseAngleExpression('-1.5')).toBe(-1.5);
      expect(parseAngleExpression('-pi')).toBeCloseTo(-Math.PI, 5);
      expect(parseAngleExpression('-pi/2')).toBeCloseTo(-Math.PI / 2, 5);
    });

    it('should handle complex expressions', () => {
      expect(parseAngleExpression('pi/2+pi/4')).toBeCloseTo(
        Math.PI / 2 + Math.PI / 4,
        5
      );
    });
  });

  describe('formatAngle', () => {
    it('should format common pi fractions', () => {
      expect(formatAngle(Math.PI)).toBe('π');
      expect(formatAngle(Math.PI / 2)).toBe('π/2');
      expect(formatAngle(Math.PI / 4)).toBe('π/4');
      expect(formatAngle(2 * Math.PI)).toBe('2π');
    });

    it('should format negative angles', () => {
      expect(formatAngle(-Math.PI)).toBe('-π');
      expect(formatAngle(-Math.PI / 2)).toBe('-π/2');
      expect(formatAngle(-Math.PI / 4)).toBe('-π/4');
    });

    it('should format zero', () => {
      expect(formatAngle(0)).toBe('0');
      expect(formatAngle(0.001)).toBe('0');
    });

    it('should format uncommon angles as decimals', () => {
      expect(formatAngle(1.23)).toBe('1.23');
      expect(formatAngle(2.71)).toBe('2.71');
    });

    it('should format pi thirds and sixths', () => {
      expect(formatAngle(Math.PI / 3)).toBe('π/3');
      expect(formatAngle((2 * Math.PI) / 3)).toBe('2π/3');
      expect(formatAngle(Math.PI / 6)).toBe('π/6');
      expect(formatAngle((5 * Math.PI) / 6)).toBe('5π/6');
    });
  });
});
