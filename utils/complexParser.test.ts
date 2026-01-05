import { describe, it, expect } from 'vitest';
import { parseComplexExpression, formatComplex } from './complexParser';
import type { Complex } from '../types';

describe('complexParser', () => {
  describe('parseComplexExpression', () => {
    describe('pure real numbers', () => {
      it('should parse positive integers', () => {
        expect(parseComplexExpression('0')).toEqual({ re: 0, im: 0 });
        expect(parseComplexExpression('1')).toEqual({ re: 1, im: 0 });
        expect(parseComplexExpression('42')).toEqual({ re: 42, im: 0 });
      });

      it('should parse negative integers', () => {
        expect(parseComplexExpression('-1')).toEqual({ re: -1, im: 0 });
        expect(parseComplexExpression('-3')).toEqual({ re: -3, im: 0 });
        expect(parseComplexExpression('-100')).toEqual({ re: -100, im: 0 });
      });

      it('should parse decimal numbers', () => {
        expect(parseComplexExpression('2.5')).toEqual({ re: 2.5, im: 0 });
        expect(parseComplexExpression('0.5')).toEqual({ re: 0.5, im: 0 });
        expect(parseComplexExpression('-3.14')).toEqual({ re: -3.14, im: 0 });
      });

      it('should parse numeric fractions', () => {
        const result = parseComplexExpression('3/2');
        expect(result).not.toBeNull();
        if (result) {
          expect(result.re).toBeCloseTo(1.5, 10);
          expect(result.im).toBe(0);
        }
      });

      it('should parse sqrt expressions', () => {
        const sqrt2 = parseComplexExpression('sqrt(2)');
        expect(sqrt2).not.toBeNull();
        expect(sqrt2?.re).toBeCloseTo(Math.sqrt(2), 10);
        expect(sqrt2?.im).toBe(0);

        const sqrt3 = parseComplexExpression('sqrt(3)');
        expect(sqrt3).not.toBeNull();
        expect(sqrt3?.re).toBeCloseTo(Math.sqrt(3), 10);
        expect(sqrt3?.im).toBe(0);
      });

      it('should parse fractions with sqrt', () => {
        const oneOverSqrt2 = parseComplexExpression('1/sqrt(2)');
        expect(oneOverSqrt2).not.toBeNull();
        expect(oneOverSqrt2?.re).toBeCloseTo(1 / Math.sqrt(2), 10);
        expect(oneOverSqrt2?.im).toBe(0);
      });
    });

    describe('pure imaginary numbers', () => {
      it('should parse "i" as 1i', () => {
        expect(parseComplexExpression('i')).toEqual({ re: 0, im: 1 });
      });

      it('should parse "-i" as -1i', () => {
        expect(parseComplexExpression('-i')).toEqual({ re: 0, im: -1 });
      });

      it('should parse positive imaginary integers', () => {
        expect(parseComplexExpression('2i')).toEqual({ re: 0, im: 2 });
        expect(parseComplexExpression('5i')).toEqual({ re: 0, im: 5 });
      });

      it('should parse negative imaginary integers', () => {
        expect(parseComplexExpression('-2i')).toEqual({ re: 0, im: -2 });
        expect(parseComplexExpression('-3.5i')).toEqual({ re: 0, im: -3.5 });
      });

      it('should parse imaginary decimals', () => {
        expect(parseComplexExpression('1.5i')).toEqual({ re: 0, im: 1.5 });
        expect(parseComplexExpression('0.5i')).toEqual({ re: 0, im: 0.5 });
      });

      it('should parse imaginary with sqrt', () => {
        const result = parseComplexExpression('sqrt(2)i');
        expect(result).not.toBeNull();
        expect(result?.re).toBe(0);
        expect(result?.im).toBeCloseTo(Math.sqrt(2), 10);
      });

      it('should parse imaginary with fractions', () => {
        const result = parseComplexExpression('1/sqrt(2)i');
        expect(result).not.toBeNull();
        expect(result?.re).toBe(0);
        expect(result?.im).toBeCloseTo(1 / Math.sqrt(2), 10);
      });
    });

    describe('complex numbers (a+bi format)', () => {
      it('should parse basic complex numbers with +', () => {
        expect(parseComplexExpression('1+2i')).toEqual({ re: 1, im: 2 });
        expect(parseComplexExpression('3+4i')).toEqual({ re: 3, im: 4 });
      });

      it('should parse basic complex numbers with -', () => {
        expect(parseComplexExpression('1-2i')).toEqual({ re: 1, im: -2 });
        expect(parseComplexExpression('5-3i')).toEqual({ re: 5, im: -3 });
      });

      it('should parse complex with imaginary coefficient of 1', () => {
        expect(parseComplexExpression('3+i')).toEqual({ re: 3, im: 1 });
        expect(parseComplexExpression('3-i')).toEqual({ re: 3, im: -1 });
      });

      it('should parse complex with decimals', () => {
        expect(parseComplexExpression('1.5+2.5i')).toEqual({ re: 1.5, im: 2.5 });
        expect(parseComplexExpression('0.5-0.25i')).toEqual({ re: 0.5, im: -0.25 });
      });

      it('should parse complex with negative real part', () => {
        expect(parseComplexExpression('-1+2i')).toEqual({ re: -1, im: 2 });
        expect(parseComplexExpression('-3-4i')).toEqual({ re: -3, im: -4 });
      });

      it('should parse complex with sqrt in real part', () => {
        const result = parseComplexExpression('sqrt(2)+i');
        expect(result).not.toBeNull();
        expect(result?.re).toBeCloseTo(Math.sqrt(2), 10);
        expect(result?.im).toBe(1);
      });

      it('should parse complex with sqrt in imaginary part', () => {
        const result = parseComplexExpression('1+sqrt(2)i');
        expect(result).not.toBeNull();
        expect(result?.re).toBe(1);
        expect(result?.im).toBeCloseTo(Math.sqrt(2), 10);
      });

      it('should parse complex with sqrt in both parts', () => {
        const result = parseComplexExpression('sqrt(2)+sqrt(3)i');
        expect(result).not.toBeNull();
        expect(result?.re).toBeCloseTo(Math.sqrt(2), 10);
        expect(result?.im).toBeCloseTo(Math.sqrt(3), 10);
      });

      it('should parse complex with fractions', () => {
        const result = parseComplexExpression('1/2+1/3i');
        expect(result).not.toBeNull();
        expect(result?.re).toBeCloseTo(0.5, 10);
        expect(result?.im).toBeCloseTo(1/3, 10);
      });

      it('should parse quantum states like 1/sqrt(2)+1/sqrt(2)i', () => {
        const result = parseComplexExpression('1/sqrt(2)+1/sqrt(2)i');
        expect(result).not.toBeNull();
        expect(result?.re).toBeCloseTo(1 / Math.sqrt(2), 10);
        expect(result?.im).toBeCloseTo(1 / Math.sqrt(2), 10);
      });

      it('should parse quantum states like 1/sqrt(2)-1/sqrt(2)i', () => {
        const result = parseComplexExpression('1/sqrt(2)-1/sqrt(2)i');
        expect(result).not.toBeNull();
        expect(result?.re).toBeCloseTo(1 / Math.sqrt(2), 10);
        expect(result?.im).toBeCloseTo(-1 / Math.sqrt(2), 10);
      });

      it('should parse fraction-based complex numbers', () => {
        const result = parseComplexExpression('3/4+1/2i');
        expect(result).not.toBeNull();
        if (result) {
          expect(result.re).toBeCloseTo(0.75, 10);
          expect(result.im).toBeCloseTo(0.5, 10);
        }
      });
    });

    describe('whitespace handling', () => {
      it('should ignore whitespace', () => {
        expect(parseComplexExpression(' 1 + 2i ')).toEqual({ re: 1, im: 2 });
        expect(parseComplexExpression('  3 - 4i  ')).toEqual({ re: 3, im: -4 });
        expect(parseComplexExpression(' 1 / sqrt(2) + i ')).not.toBeNull();
      });

      it('should handle whitespace-only strings', () => {
        expect(parseComplexExpression('   ')).toEqual({ re: 0, im: 0 });
        expect(parseComplexExpression('\t\n')).toEqual({ re: 0, im: 0 });
      });
    });

    describe('edge cases', () => {
      it('should return null for empty string', () => {
        expect(parseComplexExpression('')).toBeNull();
      });

      it('should handle zero', () => {
        expect(parseComplexExpression('0')).toEqual({ re: 0, im: 0 });
        expect(parseComplexExpression('0+0i')).toEqual({ re: 0, im: 0 });
      });

      it('should handle 0i', () => {
        expect(parseComplexExpression('0i')).toEqual({ re: 0, im: 0 });
      });

      it('should handle scientific notation carefully', () => {
        // Should handle 1e-5 without treating 'e-' as a separator
        const result = parseComplexExpression('1.5e-3');
        expect(result).not.toBeNull();
        expect(result?.re).toBeCloseTo(0.0015, 10);
        expect(result?.im).toBe(0);
      });
    });

    describe('invalid inputs', () => {
      it('should return null for gibberish', () => {
        expect(parseComplexExpression('abc')).toBeNull();
        expect(parseComplexExpression('xyz123')).toBeNull();
        expect(parseComplexExpression('hello')).toBeNull();
      });

      it('should return null for malformed expressions', () => {
        expect(parseComplexExpression('1++2i')).toBeNull();
        expect(parseComplexExpression('1+2ii')).toBeNull();
        expect(parseComplexExpression('++i')).toBeNull();
        expect(parseComplexExpression('1i2')).toBeNull(); // Invalid: no proper separator
      });

      it('should return null for incomplete expressions', () => {
        expect(parseComplexExpression('sqrt()')).toBeNull();
        expect(parseComplexExpression('1/')).toBeNull();
      });

      it('should return null for unmatched parentheses', () => {
        expect(parseComplexExpression('sqrt(2')).toBeNull();
        expect(parseComplexExpression('sqrt2)')).toBeNull();
      });

      it('should parse arithmetic expressions without i as real numbers', () => {
        // These are valid arithmetic expressions and should parse as real numbers
        expect(parseComplexExpression('1+2')).toEqual({ re: 3, im: 0 });
        expect(parseComplexExpression('2*3')).toEqual({ re: 6, im: 0 });
      });
    });

    describe('case insensitivity', () => {
      it('should handle uppercase I', () => {
        expect(parseComplexExpression('I')).toEqual({ re: 0, im: 1 });
        expect(parseComplexExpression('2I')).toEqual({ re: 0, im: 2 });
        expect(parseComplexExpression('1+2I')).toEqual({ re: 1, im: 2 });
      });

      it('should handle mixed case input', () => {
        const result = parseComplexExpression('SQRT(4)');
        expect(result).not.toBeNull();
        if (result) {
          expect(result.re).toBeCloseTo(2, 10);
        }
      });

      it('should handle uppercase SQRT', () => {
        const result = parseComplexExpression('SQRT(2)');
        expect(result).not.toBeNull();
        expect(result?.re).toBeCloseTo(Math.sqrt(2), 10);
      });
    });

    describe('complex mathematical expressions', () => {
      it('should parse sqrt of simple values', () => {
        const result = parseComplexExpression('sqrt(16)');
        expect(result).not.toBeNull();
        if (result) {
          expect(result.re).toBeCloseTo(4, 10);
          expect(result.im).toBe(0);
        }
      });

      it('should parse multiple fractions', () => {
        const result = parseComplexExpression('1/2/2');
        expect(result).not.toBeNull();
        expect(result?.re).toBeCloseTo(0.25, 10);
      });

      it('should handle basic multiplication', () => {
        const result = parseComplexExpression('2*3');
        expect(result).not.toBeNull();
        if (result) {
          expect(result.re).toBeCloseTo(6, 10);
        }
      });
    });
  });

  describe('formatComplex', () => {
    describe('zero handling', () => {
      it('should format zero', () => {
        expect(formatComplex({ re: 0, im: 0 })).toBe('0');
      });

      it('should treat near-zero as zero', () => {
        expect(formatComplex({ re: 1e-11, im: 1e-11 })).toBe('0');
        expect(formatComplex({ re: 1e-12, im: 1e-12 })).toBe('0');
        expect(formatComplex({ re: -1e-11, im: -1e-11 })).toBe('0');
      });
    });

    describe('pure real numbers', () => {
      it('should format positive real numbers', () => {
        expect(formatComplex({ re: 5, im: 0 })).toBe('5');
        expect(formatComplex({ re: 42, im: 0 })).toBe('42');
      });

      it('should format negative real numbers', () => {
        expect(formatComplex({ re: -5, im: 0 })).toBe('-5');
        expect(formatComplex({ re: -3, im: 0 })).toBe('-3');
      });

      it('should format decimal real numbers', () => {
        expect(formatComplex({ re: 2.5, im: 0 })).toBe('2.5');
        expect(formatComplex({ re: 1.123, im: 0 })).toBe('1.123');
      });

      it('should round near-integers', () => {
        expect(formatComplex({ re: 1.0000000001, im: 0 })).toBe('1');
        expect(formatComplex({ re: 2.9999999999, im: 0 })).toBe('3');
      });

      it('should remove trailing zeros', () => {
        expect(formatComplex({ re: 1.500, im: 0 })).toBe('1.5');
        expect(formatComplex({ re: 2.100, im: 0 })).toBe('2.1');
      });

      it('should handle near-zero imaginary part', () => {
        expect(formatComplex({ re: 5, im: 1e-11 })).toBe('5');
      });
    });

    describe('pure imaginary numbers', () => {
      it('should format i', () => {
        expect(formatComplex({ re: 0, im: 1 })).toBe('i');
      });

      it('should format -i', () => {
        expect(formatComplex({ re: 0, im: -1 })).toBe('-i');
      });

      it('should format positive imaginary numbers', () => {
        expect(formatComplex({ re: 0, im: 2 })).toBe('2i');
        expect(formatComplex({ re: 0, im: 3.5 })).toBe('3.5i');
      });

      it('should format negative imaginary numbers', () => {
        expect(formatComplex({ re: 0, im: -2 })).toBe('-2i');
        expect(formatComplex({ re: 0, im: -3.5 })).toBe('-3.5i');
      });

      it('should handle near-1 imaginary values', () => {
        expect(formatComplex({ re: 0, im: 1 + 1e-11 })).toBe('i');
        expect(formatComplex({ re: 0, im: -1 - 1e-11 })).toBe('-i');
      });

      it('should handle near-zero real part', () => {
        expect(formatComplex({ re: 1e-11, im: 2 })).toBe('2i');
      });
    });

    describe('complex numbers', () => {
      it('should format basic complex numbers', () => {
        expect(formatComplex({ re: 1, im: 2 })).toBe('1+2i');
        expect(formatComplex({ re: 3, im: 4 })).toBe('3+4i');
      });

      it('should format complex with negative imaginary', () => {
        expect(formatComplex({ re: 1, im: -2 })).toBe('1-2i');
        expect(formatComplex({ re: 5, im: -3 })).toBe('5-3i');
      });

      it('should format complex with imaginary = 1', () => {
        expect(formatComplex({ re: 3, im: 1 })).toBe('3+i');
        expect(formatComplex({ re: 2, im: 1 + 1e-11 })).toBe('2+i');
      });

      it('should format complex with imaginary = -1', () => {
        expect(formatComplex({ re: 3, im: -1 })).toBe('3-i');
        expect(formatComplex({ re: 2, im: -1 - 1e-11 })).toBe('2-i');
      });

      it('should format complex with decimals', () => {
        expect(formatComplex({ re: 1.5, im: 2.5 })).toBe('1.5+2.5i');
        expect(formatComplex({ re: 0.707, im: 0.707 })).toBe('0.707+0.707i');
      });

      it('should format complex with negative real', () => {
        expect(formatComplex({ re: -1, im: 2 })).toBe('-1+2i');
        expect(formatComplex({ re: -3, im: -4 })).toBe('-3-4i');
      });

      it('should limit precision to 3 decimal places', () => {
        expect(formatComplex({ re: 1.234567, im: 2.345678 })).toBe('1.235+2.346i');
      });

      it('should remove trailing zeros from formatted decimals', () => {
        expect(formatComplex({ re: 1.5, im: 2.5 })).toBe('1.5+2.5i');
        // 1.500 -> 1.5 after removing trailing zeros
      });
    });

    describe('quantum states formatting', () => {
      it('should format |+⟩ state correctly', () => {
        const val = 1 / Math.sqrt(2);
        const formatted = formatComplex({ re: val, im: 0 });
        // Should be approximately 0.707
        expect(formatted).toMatch(/0\.707/);
      });

      it('should format |i⟩ state correctly', () => {
        const val = 1 / Math.sqrt(2);
        const formatted = formatComplex({ re: 0, im: val });
        expect(formatted).toMatch(/0\.707i/);
      });

      it('should format phase states correctly', () => {
        const val = 1 / Math.sqrt(2);
        const formatted = formatComplex({ re: val, im: val });
        expect(formatted).toMatch(/0\.707\+0\.707i/);
      });
    });

    describe('edge cases for formatting', () => {
      it('should handle very small numbers correctly', () => {
        expect(formatComplex({ re: 0.001, im: 0 })).toBe('0.001');
        expect(formatComplex({ re: 0.0001, im: 0 })).toBe('0');
      });

      it('should handle rounding near boundaries', () => {
        // Number very close to 1
        expect(formatComplex({ re: 1.0000000001, im: 0 })).toBe('1');
        // Number very close to 0
        expect(formatComplex({ re: 0.0000000001, im: 0 })).toBe('0');
      });

      it('should handle large numbers', () => {
        expect(formatComplex({ re: 1000, im: 0 })).toBe('1000');
        expect(formatComplex({ re: 0, im: 1000 })).toBe('1000i');
        expect(formatComplex({ re: 1000, im: 2000 })).toBe('1000+2000i');
      });
    });
  });

  describe('round-trip testing', () => {
    it('should parse and format simple numbers consistently', () => {
      const testCases = [
        { input: '1', expected: '1' },
        { input: 'i', expected: 'i' },
        { input: '1+i', expected: '1+i' },
        { input: '1-i', expected: '1-i' },
        { input: '2+3i', expected: '2+3i' },
      ];

      testCases.forEach(({ input, expected }) => {
        const parsed = parseComplexExpression(input);
        expect(parsed).not.toBeNull();
        const formatted = formatComplex(parsed!);
        expect(formatted).toBe(expected);
      });
    });

    it('should handle sqrt expressions in round-trip', () => {
      const parsed = parseComplexExpression('1/sqrt(2)+1/sqrt(2)i');
      expect(parsed).not.toBeNull();
      const formatted = formatComplex(parsed!);
      // Should format to approximately 0.707+0.707i
      expect(formatted).toMatch(/0\.707\+0\.707i/);
    });
  });
});
