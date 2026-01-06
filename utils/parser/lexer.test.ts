import { describe, it, expect } from 'vitest';
import { tokenize } from './lexer';
import { TokenType } from './tokens';
import { ParseErrorCode } from './errors';

describe('Lexer', () => {
  describe('basic tokens', () => {
    it('should tokenize operators', () => {
      const result = tokenize('+');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value[0].type).toBe(TokenType.PLUS);
      }
    });

    it('should tokenize all operators', () => {
      const ops = ['+', '-', '*', '/'];
      const types = [TokenType.PLUS, TokenType.MINUS, TokenType.STAR, TokenType.SLASH];

      ops.forEach((op, i) => {
        const result = tokenize(op);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.value[0].type).toBe(types[i]);
        }
      });
    });

    it('should tokenize parentheses', () => {
      const result = tokenize('()');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value[0].type).toBe(TokenType.LPAREN);
        expect(result.value[1].type).toBe(TokenType.RPAREN);
      }
    });
  });

  describe('numbers', () => {
    it('should tokenize integers', () => {
      const result = tokenize('123');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value[0].type).toBe(TokenType.NUMBER);
        expect(result.value[0].value).toBe(123);
      }
    });

    it('should tokenize decimals', () => {
      const result = tokenize('3.14');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value[0].type).toBe(TokenType.NUMBER);
        expect(result.value[0].value).toBe(3.14);
      }
    });

    it('should tokenize leading decimal', () => {
      const result = tokenize('.5');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value[0].type).toBe(TokenType.NUMBER);
        expect(result.value[0].value).toBe(0.5);
      }
    });

    it('should tokenize scientific notation', () => {
      const testCases = [
        { input: '1e5', expected: 1e5 },
        { input: '1e-5', expected: 1e-5 },
        { input: '1e+5', expected: 1e5 },
        { input: '1.5e-3', expected: 0.0015 },
        { input: '2.5e+10', expected: 2.5e10 },
      ];

      testCases.forEach(({ input, expected }) => {
        const result = tokenize(input);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.value[0].type).toBe(TokenType.NUMBER);
          expect(result.value[0].value).toBeCloseTo(expected, 10);
        }
      });
    });
  });

  describe('keywords', () => {
    it('should tokenize pi', () => {
      const result = tokenize('pi');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value[0].type).toBe(TokenType.PI);
      }
    });

    it('should tokenize PI (uppercase)', () => {
      const result = tokenize('PI');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value[0].type).toBe(TokenType.PI);
      }
    });

    it('should tokenize unicode pi', () => {
      const result = tokenize('\u03c0');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value[0].type).toBe(TokenType.PI);
      }
    });

    it('should tokenize sqrt', () => {
      const result = tokenize('sqrt');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value[0].type).toBe(TokenType.SQRT);
      }
    });

    it('should tokenize SQRT (uppercase)', () => {
      const result = tokenize('SQRT');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value[0].type).toBe(TokenType.SQRT);
      }
    });

    it('should tokenize i', () => {
      const result = tokenize('i');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value[0].type).toBe(TokenType.I);
      }
    });

    it('should tokenize I (uppercase)', () => {
      const result = tokenize('I');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value[0].type).toBe(TokenType.I);
      }
    });
  });

  describe('whitespace handling', () => {
    it('should ignore whitespace', () => {
      const result = tokenize('  1 + 2  ');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value.length).toBe(4); // NUMBER, PLUS, NUMBER, EOF
        expect(result.value[0].value).toBe(1);
        expect(result.value[1].type).toBe(TokenType.PLUS);
        expect(result.value[2].value).toBe(2);
      }
    });

    it('should handle tabs and newlines', () => {
      const result = tokenize('\t1\n+\t2\n');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value.length).toBe(4);
      }
    });
  });

  describe('implicit multiplication', () => {
    it('should insert * between NUMBER and PI', () => {
      const result = tokenize('2pi');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value.map(t => t.type)).toEqual([
          TokenType.NUMBER,
          TokenType.STAR,
          TokenType.PI,
          TokenType.EOF,
        ]);
      }
    });

    it('should insert * between NUMBER and SQRT', () => {
      const result = tokenize('2sqrt(2)');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value[0].type).toBe(TokenType.NUMBER);
        expect(result.value[1].type).toBe(TokenType.STAR);
        expect(result.value[2].type).toBe(TokenType.SQRT);
      }
    });

    it('should insert * between NUMBER and LPAREN', () => {
      const result = tokenize('2(3)');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value[0].type).toBe(TokenType.NUMBER);
        expect(result.value[1].type).toBe(TokenType.STAR);
        expect(result.value[2].type).toBe(TokenType.LPAREN);
      }
    });

    it('should insert * between RPAREN and NUMBER', () => {
      const result = tokenize('(2)3');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value[2].type).toBe(TokenType.RPAREN);
        expect(result.value[3].type).toBe(TokenType.STAR);
        expect(result.value[4].type).toBe(TokenType.NUMBER);
      }
    });

    it('should insert * between RPAREN and LPAREN', () => {
      const result = tokenize('(2)(3)');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value[2].type).toBe(TokenType.RPAREN);
        expect(result.value[3].type).toBe(TokenType.STAR);
        expect(result.value[4].type).toBe(TokenType.LPAREN);
      }
    });

    it('should insert * between PI and SQRT', () => {
      const result = tokenize('pisqrt(2)');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value[0].type).toBe(TokenType.PI);
        expect(result.value[1].type).toBe(TokenType.STAR);
        expect(result.value[2].type).toBe(TokenType.SQRT);
      }
    });

    it('should NOT insert * between NUMBER and I (handled by parser)', () => {
      const result = tokenize('2i');
      expect(result.success).toBe(true);
      if (result.success) {
        // No star inserted - parser handles 2i as implicit multiplication
        expect(result.value.map(t => t.type)).toEqual([
          TokenType.NUMBER,
          TokenType.I,
          TokenType.EOF,
        ]);
      }
    });
  });

  describe('complex expressions', () => {
    it('should tokenize pi/4', () => {
      const result = tokenize('pi/4');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value.map(t => t.type)).toEqual([
          TokenType.PI,
          TokenType.SLASH,
          TokenType.NUMBER,
          TokenType.EOF,
        ]);
      }
    });

    it('should tokenize sqrt(2)', () => {
      const result = tokenize('sqrt(2)');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value.map(t => t.type)).toEqual([
          TokenType.SQRT,
          TokenType.LPAREN,
          TokenType.NUMBER,
          TokenType.RPAREN,
          TokenType.EOF,
        ]);
      }
    });

    it('should tokenize 1+2i', () => {
      const result = tokenize('1+2i');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value.map(t => t.type)).toEqual([
          TokenType.NUMBER,
          TokenType.PLUS,
          TokenType.NUMBER,
          TokenType.I,
          TokenType.EOF,
        ]);
      }
    });

    it('should tokenize 1/sqrt(2)+1/sqrt(2)i', () => {
      const result = tokenize('1/sqrt(2)+1/sqrt(2)i');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value.length).toBeGreaterThan(10);
        expect(result.value[result.value.length - 2].type).toBe(TokenType.I);
      }
    });
  });

  describe('error handling', () => {
    it('should return error for invalid character', () => {
      const result = tokenize('x');
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe(ParseErrorCode.UNEXPECTED_CHAR);
        expect(result.error.position).toBe(0);
      }
    });

    it('should return error for @ symbol', () => {
      const result = tokenize('1@2');
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe(ParseErrorCode.UNEXPECTED_CHAR);
        expect(result.error.message).toContain('@');
      }
    });

    it('should return error for $ symbol', () => {
      const result = tokenize('$5');
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe(ParseErrorCode.UNEXPECTED_CHAR);
      }
    });

    it('should return error for unknown identifier', () => {
      const result = tokenize('sin');
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe(ParseErrorCode.UNEXPECTED_CHAR);
      }
    });
  });

  describe('position tracking', () => {
    it('should track token positions correctly', () => {
      const result = tokenize('1+2');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value[0].position).toBe(0);
        expect(result.value[1].position).toBe(1);
        expect(result.value[2].position).toBe(2);
      }
    });

    it('should track positions after whitespace removal', () => {
      // After whitespace removal, positions are in the normalized string
      const result = tokenize('1 + 2');
      expect(result.success).toBe(true);
      if (result.success) {
        // Whitespace is stripped, so positions are 0, 1, 2
        expect(result.value[0].position).toBe(0);
        expect(result.value[1].position).toBe(1);
        expect(result.value[2].position).toBe(2);
      }
    });
  });

  describe('edge cases', () => {
    it('should handle empty string', () => {
      const result = tokenize('');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value.length).toBe(1);
        expect(result.value[0].type).toBe(TokenType.EOF);
      }
    });

    it('should handle multiple consecutive operators', () => {
      const result = tokenize('1++2');
      expect(result.success).toBe(true);
      if (result.success) {
        // This is valid tokenization - parser will handle the error
        expect(result.value.map(t => t.type)).toEqual([
          TokenType.NUMBER,
          TokenType.PLUS,
          TokenType.PLUS,
          TokenType.NUMBER,
          TokenType.EOF,
        ]);
      }
    });

    it('should handle very long numbers', () => {
      const result = tokenize('12345678901234567890');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value[0].type).toBe(TokenType.NUMBER);
      }
    });
  });
});
