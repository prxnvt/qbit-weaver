import { Token, TokenType } from './tokens';
import { ParseError, errors } from './errors';
import { ParseResult, success, failure } from './result';
import { tokenize } from './lexer';

/**
 * Recursive descent parser for real number expressions
 *
 * Grammar:
 *   expression = term ( ( "+" | "-" ) term )* ;
 *   term       = unary ( ( "*" | "/" ) unary )* ;
 *   unary      = ( "-" | "+" )? primary ;
 *   primary    = NUMBER | PI | SQRT "(" expression ")" | "(" expression ")" ;
 */
export class RealExpressionParser {
  private tokens: Token[] = [];
  private current = 0;

  /**
   * Parse a real number expression from source string
   */
  parse(source: string): ParseResult<number> {
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
  private expression(): ParseResult<number> {
    let result = this.term();
    if (!result.success) return result;

    let value = result.value;

    while (this.match(TokenType.PLUS, TokenType.MINUS)) {
      const operator = this.previous();
      const right = this.term();
      if (!right.success) return right;

      if (operator.type === TokenType.PLUS) {
        value = value + right.value;
      } else {
        value = value - right.value;
      }
    }

    return success(value);
  }

  /**
   * term = unary ( ( "*" | "/" ) unary )*
   * In real parser, trailing I tokens are rejected
   */
  private term(): ParseResult<number> {
    let result = this.unary();
    if (!result.success) return result;

    let value = result.value;

    while (this.match(TokenType.STAR, TokenType.SLASH)) {
      const operator = this.previous();
      const right = this.unary();
      if (!right.success) return right;

      if (operator.type === TokenType.STAR) {
        value = value * right.value;
      } else {
        // Check for division by zero
        if (right.value === 0) {
          return failure(errors.divisionByZero(operator.position));
        }
        value = value / right.value;
      }
    }

    // Reject imaginary unit in real parser (e.g., 2i)
    if (this.check(TokenType.I)) {
      return failure(errors.imaginaryNotAllowed(this.peek().position));
    }

    return success(value);
  }

  /**
   * unary = "-"? primary
   * Note: unary + is NOT supported to reject expressions like "1++2"
   */
  private unary(): ParseResult<number> {
    if (this.match(TokenType.MINUS)) {
      const result = this.primary();
      if (!result.success) return result;
      return success(-result.value);
    }

    return this.primary();
  }

  /**
   * primary = NUMBER | PI | I (error) | SQRT "(" expression ")" | "(" expression ")"
   */
  private primary(): ParseResult<number> {
    // NUMBER
    if (this.match(TokenType.NUMBER)) {
      return success(this.previous().value!);
    }

    // PI
    if (this.match(TokenType.PI)) {
      return success(Math.PI);
    }

    // I (imaginary unit - not allowed in real parser)
    if (this.check(TokenType.I)) {
      const token = this.peek();
      return failure(errors.imaginaryNotAllowed(token.position));
    }

    // SQRT "(" expression ")"
    if (this.match(TokenType.SQRT)) {
      const sqrtToken = this.previous();

      if (!this.match(TokenType.LPAREN)) {
        return failure(errors.expectedLParenAfterSqrt(this.peek().position));
      }

      const arg = this.expression();
      if (!arg.success) return arg;

      if (!this.match(TokenType.RPAREN)) {
        return failure(errors.expectedRParen(this.peek().position));
      }

      // Check for negative sqrt
      if (arg.value < 0) {
        return failure(errors.negativeSqrt(sqrtToken.position));
      }

      return success(Math.sqrt(arg.value));
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
 * Convenience function to parse a real number expression
 */
export function parseReal(source: string): ParseResult<number> {
  const parser = new RealExpressionParser();
  return parser.parse(source);
}
