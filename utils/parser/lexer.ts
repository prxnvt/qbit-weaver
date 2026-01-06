import { Token, TokenType } from './tokens';
import { ParseError, errors } from './errors';
import { ParseResult, success, failure } from './result';

/**
 * Lexer for mathematical expressions
 * Converts source string into tokens for the parser
 */
export class Lexer {
  private source: string;
  private tokens: Token[] = [];
  private start = 0;
  private current = 0;

  constructor(source: string) {
    // Normalize: lowercase, remove whitespace, convert unicode pi
    this.source = source
      .toLowerCase()
      .replace(/\s+/g, '')
      .replace(/\u03c0/g, 'pi'); // π → pi
  }

  /**
   * Tokenize the source and return tokens or an error
   */
  tokenize(): ParseResult<Token[]> {
    while (!this.isAtEnd()) {
      this.start = this.current;
      const result = this.scanToken();
      if (!result.success) {
        return result;
      }
    }

    this.tokens.push({
      type: TokenType.EOF,
      lexeme: '',
      position: this.current,
    });

    // Insert implicit multiplication tokens
    return success(this.insertImplicitMultiplication(this.tokens));
  }

  private scanToken(): ParseResult<void> {
    const c = this.advance();
    const position = this.start;

    switch (c) {
      case '+':
        this.addToken(TokenType.PLUS, c, position);
        break;
      case '-':
        this.addToken(TokenType.MINUS, c, position);
        break;
      case '*':
        this.addToken(TokenType.STAR, c, position);
        break;
      case '/':
        this.addToken(TokenType.SLASH, c, position);
        break;
      case '(':
        this.addToken(TokenType.LPAREN, c, position);
        break;
      case ')':
        this.addToken(TokenType.RPAREN, c, position);
        break;
      default:
        if (this.isDigit(c) || (c === '.' && this.isDigit(this.peek()))) {
          return this.number(position);
        }
        if (this.isAlpha(c)) {
          return this.identifier(position);
        }
        return failure(errors.unexpectedChar(c, position));
    }

    return success(undefined);
  }

  /**
   * Scan a number, including decimals and scientific notation
   */
  private number(startPosition: number): ParseResult<void> {
    // Move back to start of number
    this.current = startPosition;

    // Handle leading decimal: .5
    if (this.peek() === '.') {
      this.advance(); // consume '.'
      if (!this.isDigit(this.peek())) {
        return failure(errors.invalidNumber(startPosition));
      }
      while (this.isDigit(this.peek())) this.advance();
    } else {
      // Consume integer part
      while (this.isDigit(this.peek())) this.advance();

      // Consume decimal part if present
      if (this.peek() === '.' && this.isDigit(this.peekNext())) {
        this.advance(); // consume '.'
        while (this.isDigit(this.peek())) this.advance();
      }
    }

    // Consume exponent part: e+5, e-5, E10
    if (this.peek() === 'e') {
      const next = this.peekNext();
      if (this.isDigit(next)) {
        this.advance(); // consume 'e'
        while (this.isDigit(this.peek())) this.advance();
      } else if ((next === '+' || next === '-') && this.isDigit(this.peekAt(2))) {
        this.advance(); // consume 'e'
        this.advance(); // consume '+' or '-'
        while (this.isDigit(this.peek())) this.advance();
      }
      // Note: if 'e' is not followed by valid exponent, it stays as identifier 'e' later
      // But since we're in number mode, an invalid 'e' ending like "1e" should error
      // However, we've only consumed 'e' if followed by valid pattern, so we're safe
    }

    const lexeme = this.source.slice(startPosition, this.current);
    const value = parseFloat(lexeme);

    if (!isFinite(value)) {
      return failure(errors.invalidNumber(startPosition));
    }

    this.addToken(TokenType.NUMBER, lexeme, startPosition, value);
    return success(undefined);
  }

  /**
   * Scan an identifier: pi, sqrt, i
   * Uses prefix matching so "pisqrt" becomes "pi" + "sqrt"
   */
  private identifier(startPosition: number): ParseResult<void> {
    // Check for known keywords at current position
    // Order matters: longer keywords first, then shorter ones
    const keywords: Array<{ word: string; type: TokenType }> = [
      { word: 'sqrt', type: TokenType.SQRT },
      { word: 'pi', type: TokenType.PI },
      { word: 'i', type: TokenType.I },
    ];

    for (const { word, type } of keywords) {
      if (this.matchKeyword(word, startPosition)) {
        this.current = startPosition + word.length;
        this.addToken(type, word, startPosition);
        return success(undefined);
      }
    }

    // No keyword matched - consume all alphanumeric chars and report error
    while (this.isAlphaNumeric(this.peek())) {
      this.advance();
    }
    const lexeme = this.source.slice(startPosition, this.current);
    return failure(errors.unexpectedChar(lexeme, startPosition));
  }

  /**
   * Check if a keyword matches at the given position
   */
  private matchKeyword(keyword: string, startPosition: number): boolean {
    if (startPosition + keyword.length > this.source.length) {
      return false;
    }
    const substr = this.source.slice(startPosition, startPosition + keyword.length);
    if (substr !== keyword) {
      return false;
    }
    // Make sure the keyword is not followed by more alphanumeric chars
    // UNLESS it would form another valid keyword (e.g., "pisqrt" -> "pi" + "sqrt")
    // We allow continuation if next char starts another keyword
    const nextPos = startPosition + keyword.length;
    if (nextPos < this.source.length) {
      const nextChar = this.source[nextPos];
      if (this.isAlpha(nextChar)) {
        // Check if remaining chars could start a keyword
        const remaining = this.source.slice(nextPos);
        if (
          remaining.startsWith('sqrt') ||
          remaining.startsWith('pi') ||
          remaining.startsWith('i')
        ) {
          return true; // Allow split: "pisqrt" -> "pi" + "sqrt"
        }
        // Otherwise, this isn't a valid keyword boundary (e.g., "pie" is not "pi" + "e")
        return false;
      }
    }
    return true;
  }

  /**
   * Insert implicit multiplication tokens between adjacent values
   * Examples: 2pi → 2*pi, (2)(3) → (2)*(3), 2i → 2*i (handled by parser)
   */
  private insertImplicitMultiplication(tokens: Token[]): Token[] {
    const result: Token[] = [];

    for (let i = 0; i < tokens.length; i++) {
      result.push(tokens[i]);

      if (i < tokens.length - 1) {
        const current = tokens[i].type;
        const next = tokens[i + 1].type;

        // Insert * if needed
        if (this.needsImplicitMultiply(current, next)) {
          result.push({
            type: TokenType.STAR,
            lexeme: '*',
            position: tokens[i].position,
          });
        }
      }
    }

    return result;
  }

  /**
   * Check if implicit multiplication is needed between two token types
   */
  private needsImplicitMultiply(current: TokenType, next: TokenType): boolean {
    // Note: We do NOT insert * before I because 2i, sqrt(2)i, etc. are handled
    // as suffix in the parser's primary rule. The lexer just produces: NUMBER I
    // and the parser interprets NUMBER followed by I as multiplication.

    // After NUMBER: insert * before PI, SQRT, LPAREN
    if (current === TokenType.NUMBER) {
      return next === TokenType.PI || next === TokenType.SQRT || next === TokenType.LPAREN;
    }

    // After RPAREN: insert * before NUMBER, PI, SQRT, LPAREN
    if (current === TokenType.RPAREN) {
      return (
        next === TokenType.NUMBER ||
        next === TokenType.PI ||
        next === TokenType.SQRT ||
        next === TokenType.LPAREN
      );
    }

    // After PI: insert * before SQRT, LPAREN, NUMBER
    if (current === TokenType.PI) {
      return next === TokenType.SQRT || next === TokenType.LPAREN || next === TokenType.NUMBER;
    }

    // After I: insert * before NUMBER, PI, SQRT, LPAREN (rare: i2, ipi)
    if (current === TokenType.I) {
      return (
        next === TokenType.NUMBER ||
        next === TokenType.PI ||
        next === TokenType.SQRT ||
        next === TokenType.LPAREN
      );
    }

    return false;
  }

  private addToken(type: TokenType, lexeme: string, position: number, value?: number): void {
    this.tokens.push({ type, lexeme, position, value });
  }

  private isAtEnd(): boolean {
    return this.current >= this.source.length;
  }

  private advance(): string {
    return this.source[this.current++];
  }

  private peek(): string {
    if (this.isAtEnd()) return '\0';
    return this.source[this.current];
  }

  private peekNext(): string {
    if (this.current + 1 >= this.source.length) return '\0';
    return this.source[this.current + 1];
  }

  private peekAt(offset: number): string {
    if (this.current + offset >= this.source.length) return '\0';
    return this.source[this.current + offset];
  }

  private isDigit(c: string): boolean {
    return c >= '0' && c <= '9';
  }

  private isAlpha(c: string): boolean {
    return (c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z');
  }

  private isAlphaNumeric(c: string): boolean {
    return this.isAlpha(c) || this.isDigit(c);
  }
}

/**
 * Convenience function to tokenize a string
 */
export function tokenize(source: string): ParseResult<Token[]> {
  const lexer = new Lexer(source);
  return lexer.tokenize();
}
