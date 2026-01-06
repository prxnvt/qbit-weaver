import { Token, TokenType } from './tokens';
import { errors } from './errors';
import { ParseResult, success, failure } from './result';
import { tokenize } from './lexer';

/**
 * Complex number type
 */
export interface Complex {
  re: number;
  im: number;
}

// Complex number arithmetic helpers
const cZero: Complex = { re: 0, im: 0 };
const cOne: Complex = { re: 1, im: 0 };
const cI: Complex = { re: 0, im: 1 };

function cAdd(a: Complex, b: Complex): Complex {
  return { re: a.re + b.re, im: a.im + b.im };
}

function cSub(a: Complex, b: Complex): Complex {
  return { re: a.re - b.re, im: a.im - b.im };
}

function cMul(a: Complex, b: Complex): Complex {
  // (a+bi)(c+di) = (ac-bd) + (ad+bc)i
  const re = a.re * b.re - a.im * b.im;
  const im = a.re * b.im + a.im * b.re;
  // Normalize -0 to 0
  return {
    re: re === 0 ? 0 : re,
    im: im === 0 ? 0 : im,
  };
}

function cDiv(a: Complex, b: Complex): Complex | null {
  // (a+bi)/(c+di) = [(ac+bd) + (bc-ad)i] / (c²+d²)
  const denom = b.re * b.re + b.im * b.im;
  if (denom === 0) return null;
  const re = (a.re * b.re + a.im * b.im) / denom;
  const im = (a.im * b.re - a.re * b.im) / denom;
  // Normalize -0 to 0
  return {
    re: re === 0 ? 0 : re,
    im: im === 0 ? 0 : im,
  };
}

function cNeg(a: Complex): Complex {
  // Normalize -0 to 0
  const re = -a.re;
  const im = -a.im;
  return { re: re === 0 ? 0 : re, im: im === 0 ? 0 : im };
}

function cSqrt(a: Complex): Complex {
  // For pure real positive: sqrt(x) = sqrt(x) + 0i
  // For pure real negative: sqrt(-x) = 0 + sqrt(x)i
  // For general complex: use polar form, but for simplicity we handle common cases
  if (a.im === 0) {
    if (a.re >= 0) {
      return { re: Math.sqrt(a.re), im: 0 };
    } else {
      // sqrt of negative real number gives pure imaginary
      return { re: 0, im: Math.sqrt(-a.re) };
    }
  }
  // General complex sqrt using polar form
  const r = Math.sqrt(a.re * a.re + a.im * a.im);
  const theta = Math.atan2(a.im, a.re);
  const sqrtR = Math.sqrt(r);
  return {
    re: sqrtR * Math.cos(theta / 2),
    im: sqrtR * Math.sin(theta / 2),
  };
}

function cFromReal(n: number): Complex {
  return { re: n, im: 0 };
}

/**
 * Recursive descent parser for complex number expressions
 *
 * Grammar:
 *   expression = term ( ( "+" | "-" ) term )* ;
 *   term       = unary ( ( "*" | "/" ) unary )* ;
 *   unary      = ( "-" | "+" )? primary ;
 *   primary    = NUMBER [ I ] | I | PI [ I ] | SQRT "(" expression ")" [ I ] | "(" expression ")" [ I ] ;
 */
export class ComplexExpressionParser {
  private tokens: Token[] = [];
  private current = 0;

  /**
   * Parse a complex number expression from source string
   */
  parse(source: string): ParseResult<Complex> {
    // Tokenize
    const tokenResult = tokenize(source);
    if (!tokenResult.success) {
      return tokenResult;
    }

    this.tokens = tokenResult.value;
    this.current = 0;

    // Check for empty expression
    if (this.isAtEnd()) {
      return failure(errors.emptyExpression());
    }

    // Parse expression
    const result = this.expression();
    if (!result.success) {
      return result;
    }

    // Check for trailing tokens
    if (!this.isAtEnd()) {
      const token = this.peek();
      return failure(errors.unexpectedToken(token.lexeme, token.position));
    }

    return result;
  }

  /**
   * expression = term ( ( "+" | "-" ) term )*
   */
  private expression(): ParseResult<Complex> {
    let result = this.term();
    if (!result.success) return result;

    let value = result.value;

    while (this.match(TokenType.PLUS, TokenType.MINUS)) {
      const operator = this.previous();
      const right = this.term();
      if (!right.success) return right;

      if (operator.type === TokenType.PLUS) {
        value = cAdd(value, right.value);
      } else {
        value = cSub(value, right.value);
      }
    }

    return success(value);
  }

  /**
   * term = unary ( ( "*" | "/" ) unary )* [ I ]
   * The trailing I makes the entire term imaginary: 1/sqrt(2)i = (1/sqrt(2)) * i
   */
  private term(): ParseResult<Complex> {
    let result = this.unary();
    if (!result.success) return result;

    let value = result.value;

    while (this.match(TokenType.STAR, TokenType.SLASH)) {
      const operator = this.previous();
      const right = this.unary();
      if (!right.success) return right;

      if (operator.type === TokenType.STAR) {
        value = cMul(value, right.value);
      } else {
        const divResult = cDiv(value, right.value);
        if (divResult === null) {
          return failure(errors.divisionByZero(operator.position));
        }
        value = divResult;
      }
    }

    // Check for trailing I that makes the entire term imaginary
    // This handles cases like: 1/sqrt(2)i, 2*3i, sqrt(2)i when used with operators
    if (this.match(TokenType.I)) {
      value = cMul(value, cI);
    }

    return success(value);
  }

  /**
   * unary = "-"? primary
   * Note: unary + is NOT supported to reject expressions like "1++2i"
   */
  private unary(): ParseResult<Complex> {
    if (this.match(TokenType.MINUS)) {
      const result = this.primary();
      if (!result.success) return result;
      return success(cNeg(result.value));
    }

    return this.primary();
  }

  /**
   * primary = NUMBER | I | PI | SQRT "(" expression ")" | "(" expression ")"
   * Note: Trailing I is handled at term level to support expressions like 1/sqrt(2)i
   */
  private primary(): ParseResult<Complex> {
    // NUMBER
    if (this.match(TokenType.NUMBER)) {
      const num = this.previous().value!;
      return success(cFromReal(num));
    }

    // I (standalone)
    if (this.match(TokenType.I)) {
      return success(cI);
    }

    // PI
    if (this.match(TokenType.PI)) {
      return success(cFromReal(Math.PI));
    }

    // SQRT "(" expression ")"
    if (this.match(TokenType.SQRT)) {
      if (!this.match(TokenType.LPAREN)) {
        return failure(errors.expectedLParenAfterSqrt(this.peek().position));
      }

      const arg = this.expression();
      if (!arg.success) return arg;

      if (!this.match(TokenType.RPAREN)) {
        return failure(errors.expectedRParen(this.peek().position));
      }

      return success(cSqrt(arg.value));
    }

    // "(" expression ")"
    if (this.match(TokenType.LPAREN)) {
      const expr = this.expression();
      if (!expr.success) return expr;

      if (!this.match(TokenType.RPAREN)) {
        return failure(errors.expectedRParen(this.peek().position));
      }

      return expr;
    }

    // Unexpected token
    const token = this.peek();
    if (token.type === TokenType.EOF) {
      return failure(errors.expectedExpression(token.position));
    }
    return failure(errors.unexpectedToken(token.lexeme, token.position));
  }

  // Helper methods

  private match(...types: TokenType[]): boolean {
    for (const type of types) {
      if (this.check(type)) {
        this.advance();
        return true;
      }
    }
    return false;
  }

  private check(type: TokenType): boolean {
    if (this.isAtEnd()) return false;
    return this.peek().type === type;
  }

  private advance(): Token {
    if (!this.isAtEnd()) this.current++;
    return this.previous();
  }

  private isAtEnd(): boolean {
    return this.peek().type === TokenType.EOF;
  }

  private peek(): Token {
    return this.tokens[this.current];
  }

  private previous(): Token {
    return this.tokens[this.current - 1];
  }
}

/**
 * Convenience function to parse a complex number expression
 */
export function parseComplex(source: string): ParseResult<Complex> {
  const parser = new ComplexExpressionParser();
  return parser.parse(source);
}
