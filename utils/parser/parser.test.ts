import { describe, it, expect } from 'vitest';
import { parseReal } from './realParser';
import { parseComplex } from './complexExprParser';
import { ParseErrorCode } from './errors';

describe('RealExpressionParser', () => {
  describe('basic numbers', () => {
    it('should parse integers', () => {
      expect(parseReal('42')).toEqual({ success: true, value: 42 });
      expect(parseReal('0')).toEqual({ success: true, value: 0 });
      expect(parseReal('123')).toEqual({ success: true, value: 123 });
    });

    it('should parse decimals', () => {
      const result = parseReal('3.14');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toBeCloseTo(3.14, 10);
      }
    });

    it('should parse leading decimal', () => {
      const result = parseReal('.5');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toBeCloseTo(0.5, 10);
      }
    });

    it('should parse scientific notation', () => {
      const result = parseReal('1e-5');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toBeCloseTo(1e-5, 15);
      }
    });
  });

  describe('pi constant', () => {
    it('should parse pi', () => {
      const result = parseReal('pi');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toBeCloseTo(Math.PI, 10);
      }
    });

    it('should parse unicode pi', () => {
      const result = parseReal('\u03c0');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toBeCloseTo(Math.PI, 10);
      }
    });
  });

  describe('sqrt function', () => {
    it('should parse sqrt(4)', () => {
      const result = parseReal('sqrt(4)');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toBeCloseTo(2, 10);
      }
    });

    it('should parse sqrt(2)', () => {
      const result = parseReal('sqrt(2)');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toBeCloseTo(Math.sqrt(2), 10);
      }
    });

    it('should parse nested sqrt', () => {
      const result = parseReal('sqrt(sqrt(16))');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toBeCloseTo(2, 10);
      }
    });

    it('should error on negative sqrt', () => {
      const result = parseReal('sqrt(-1)');
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe(ParseErrorCode.NEGATIVE_SQRT);
      }
    });
  });

  describe('arithmetic operators', () => {
    it('should parse addition', () => {
      const result = parseReal('1+2');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toBe(3);
      }
    });

    it('should parse subtraction', () => {
      const result = parseReal('5-3');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toBe(2);
      }
    });

    it('should parse multiplication', () => {
      const result = parseReal('2*3');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toBe(6);
      }
    });

    it('should parse division', () => {
      const result = parseReal('6/2');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toBe(3);
      }
    });
  });

  describe('operator precedence', () => {
    it('should respect multiplication over addition', () => {
      const result = parseReal('1+2*3');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toBe(7); // Not 9
      }
    });

    it('should respect parentheses', () => {
      const result = parseReal('(1+2)*3');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toBe(9);
      }
    });

    it('should handle complex precedence', () => {
      const result = parseReal('2+3*4-5');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toBe(9); // 2+12-5 = 9
      }
    });
  });

  describe('unary operators', () => {
    it('should parse unary minus', () => {
      const result = parseReal('-5');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toBe(-5);
      }
    });

    it('should reject unary plus (to prevent 1++2 ambiguity)', () => {
      const result = parseReal('+5');
      expect(result.success).toBe(false);
    });

    it('should parse negative pi', () => {
      const result = parseReal('-pi');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toBeCloseTo(-Math.PI, 10);
      }
    });
  });

  describe('implicit multiplication', () => {
    it('should handle 2pi', () => {
      const result = parseReal('2pi');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toBeCloseTo(2 * Math.PI, 10);
      }
    });

    it('should handle 2sqrt(2)', () => {
      const result = parseReal('2sqrt(2)');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toBeCloseTo(2 * Math.sqrt(2), 10);
      }
    });

    it('should handle 2(3)', () => {
      const result = parseReal('2(3)');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toBe(6);
      }
    });
  });

  describe('common expressions', () => {
    it('should parse pi/4', () => {
      const result = parseReal('pi/4');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toBeCloseTo(Math.PI / 4, 10);
      }
    });

    it('should parse pi/2', () => {
      const result = parseReal('pi/2');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toBeCloseTo(Math.PI / 2, 10);
      }
    });

    it('should parse 1/sqrt(2)', () => {
      const result = parseReal('1/sqrt(2)');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toBeCloseTo(1 / Math.sqrt(2), 10);
      }
    });

    it('should parse pi/2+pi/4', () => {
      const result = parseReal('pi/2+pi/4');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toBeCloseTo(Math.PI / 2 + Math.PI / 4, 10);
      }
    });
  });

  describe('error handling', () => {
    it('should error on empty expression', () => {
      const result = parseReal('');
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe(ParseErrorCode.EMPTY_EXPRESSION);
      }
    });

    it('should error on division by zero', () => {
      const result = parseReal('1/0');
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe(ParseErrorCode.DIVISION_BY_ZERO);
      }
    });

    it('should error on imaginary unit', () => {
      const result = parseReal('2i');
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe(ParseErrorCode.IMAGINARY_NOT_ALLOWED);
      }
    });

    it('should error on unmatched parenthesis', () => {
      const result = parseReal('(1+2');
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe(ParseErrorCode.EXPECTED_RPAREN);
      }
    });

    it('should error on missing lparen after sqrt', () => {
      const result = parseReal('sqrt 2');
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe(ParseErrorCode.EXPECTED_LPAREN_AFTER_SQRT);
      }
    });
  });
});

describe('ComplexExpressionParser', () => {
  describe('pure real numbers', () => {
    it('should parse integers', () => {
      expect(parseComplex('42')).toEqual({ success: true, value: { re: 42, im: 0 } });
    });

    it('should parse decimals', () => {
      const result = parseComplex('3.14');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value.re).toBeCloseTo(3.14, 10);
        expect(result.value.im).toBe(0);
      }
    });

    it('should parse pi', () => {
      const result = parseComplex('pi');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value.re).toBeCloseTo(Math.PI, 10);
        expect(result.value.im).toBe(0);
      }
    });
  });

  describe('pure imaginary numbers', () => {
    it('should parse i', () => {
      expect(parseComplex('i')).toEqual({ success: true, value: { re: 0, im: 1 } });
    });

    it('should parse -i', () => {
      expect(parseComplex('-i')).toEqual({ success: true, value: { re: 0, im: -1 } });
    });

    it('should parse 2i', () => {
      expect(parseComplex('2i')).toEqual({ success: true, value: { re: 0, im: 2 } });
    });

    it('should parse -2i', () => {
      expect(parseComplex('-2i')).toEqual({ success: true, value: { re: 0, im: -2 } });
    });

    it('should parse sqrt(2)i', () => {
      const result = parseComplex('sqrt(2)i');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value.re).toBeCloseTo(0, 10);
        expect(result.value.im).toBeCloseTo(Math.sqrt(2), 10);
      }
    });
  });

  describe('complex numbers (a+bi)', () => {
    it('should parse 1+2i', () => {
      expect(parseComplex('1+2i')).toEqual({ success: true, value: { re: 1, im: 2 } });
    });

    it('should parse 1-2i', () => {
      expect(parseComplex('1-2i')).toEqual({ success: true, value: { re: 1, im: -2 } });
    });

    it('should parse 3+i', () => {
      expect(parseComplex('3+i')).toEqual({ success: true, value: { re: 3, im: 1 } });
    });

    it('should parse 3-i', () => {
      expect(parseComplex('3-i')).toEqual({ success: true, value: { re: 3, im: -1 } });
    });

    it('should parse -1+2i', () => {
      expect(parseComplex('-1+2i')).toEqual({ success: true, value: { re: -1, im: 2 } });
    });

    it('should parse -3-4i', () => {
      expect(parseComplex('-3-4i')).toEqual({ success: true, value: { re: -3, im: -4 } });
    });
  });

  describe('complex with sqrt', () => {
    it('should parse sqrt(2)+i', () => {
      const result = parseComplex('sqrt(2)+i');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value.re).toBeCloseTo(Math.sqrt(2), 10);
        expect(result.value.im).toBe(1);
      }
    });

    it('should parse 1+sqrt(2)i', () => {
      const result = parseComplex('1+sqrt(2)i');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value.re).toBe(1);
        expect(result.value.im).toBeCloseTo(Math.sqrt(2), 10);
      }
    });

    it('should parse sqrt(2)+sqrt(3)i', () => {
      const result = parseComplex('sqrt(2)+sqrt(3)i');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value.re).toBeCloseTo(Math.sqrt(2), 10);
        expect(result.value.im).toBeCloseTo(Math.sqrt(3), 10);
      }
    });
  });

  describe('quantum state expressions', () => {
    it('should parse 1/sqrt(2)+1/sqrt(2)i', () => {
      const result = parseComplex('1/sqrt(2)+1/sqrt(2)i');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value.re).toBeCloseTo(1 / Math.sqrt(2), 10);
        expect(result.value.im).toBeCloseTo(1 / Math.sqrt(2), 10);
      }
    });

    it('should parse 1/sqrt(2)-1/sqrt(2)i', () => {
      const result = parseComplex('1/sqrt(2)-1/sqrt(2)i');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value.re).toBeCloseTo(1 / Math.sqrt(2), 10);
        expect(result.value.im).toBeCloseTo(-1 / Math.sqrt(2), 10);
      }
    });
  });

  describe('sqrt of negative (gives imaginary)', () => {
    it('should parse sqrt(-1) as i', () => {
      const result = parseComplex('sqrt(-1)');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value.re).toBeCloseTo(0, 10);
        expect(result.value.im).toBeCloseTo(1, 10);
      }
    });

    it('should parse sqrt(-4) as 2i', () => {
      const result = parseComplex('sqrt(-4)');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value.re).toBeCloseTo(0, 10);
        expect(result.value.im).toBeCloseTo(2, 10);
      }
    });
  });

  describe('complex multiplication', () => {
    it('should compute (1+i)*(1-i) = 2', () => {
      const result = parseComplex('(1+i)*(1-i)');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value.re).toBeCloseTo(2, 10);
        expect(result.value.im).toBeCloseTo(0, 10);
      }
    });

    it('should compute i*i = -1', () => {
      const result = parseComplex('i*i');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value.re).toBeCloseTo(-1, 10);
        expect(result.value.im).toBeCloseTo(0, 10);
      }
    });
  });

  describe('arithmetic without i', () => {
    it('should parse 1+2 as real 3', () => {
      const result = parseComplex('1+2');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value.re).toBe(3);
        expect(result.value.im).toBe(0);
      }
    });

    it('should parse 2*3 as real 6', () => {
      const result = parseComplex('2*3');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value.re).toBe(6);
        expect(result.value.im).toBe(0);
      }
    });
  });

  describe('error handling', () => {
    it('should error on empty expression', () => {
      const result = parseComplex('');
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe(ParseErrorCode.EMPTY_EXPRESSION);
      }
    });

    it('should error on division by zero', () => {
      const result = parseComplex('1/0');
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe(ParseErrorCode.DIVISION_BY_ZERO);
      }
    });

    it('should error on unmatched parenthesis', () => {
      const result = parseComplex('(1+2i');
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe(ParseErrorCode.EXPECTED_RPAREN);
      }
    });
  });

  describe('edge cases', () => {
    it('should handle 0i', () => {
      const result = parseComplex('0i');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value.re).toBe(0);
        expect(result.value.im).toBe(0);
      }
    });

    it('should handle 0+0i', () => {
      const result = parseComplex('0+0i');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value.re).toBe(0);
        expect(result.value.im).toBe(0);
      }
    });

    it('should handle scientific notation 1.5e-3', () => {
      const result = parseComplex('1.5e-3');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value.re).toBeCloseTo(0.0015, 10);
        expect(result.value.im).toBe(0);
      }
    });
  });
});
