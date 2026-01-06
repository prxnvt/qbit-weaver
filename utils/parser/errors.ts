/**
 * Error codes for parse errors - allows programmatic error handling
 */
export enum ParseErrorCode {
  /** Expression is empty or only whitespace */
  EMPTY_EXPRESSION = 'EMPTY_EXPRESSION',
  /** Unexpected character encountered during lexing */
  UNEXPECTED_CHAR = 'UNEXPECTED_CHAR',
  /** Unexpected token during parsing */
  UNEXPECTED_TOKEN = 'UNEXPECTED_TOKEN',
  /** Expected an expression but found something else */
  EXPECTED_EXPRESSION = 'EXPECTED_EXPRESSION',
  /** Missing closing parenthesis */
  EXPECTED_RPAREN = 'EXPECTED_RPAREN',
  /** sqrt must be followed by ( */
  EXPECTED_LPAREN_AFTER_SQRT = 'EXPECTED_LPAREN_AFTER_SQRT',
  /** Division by zero attempted */
  DIVISION_BY_ZERO = 'DIVISION_BY_ZERO',
  /** Square root of negative number (real parser only) */
  NEGATIVE_SQRT = 'NEGATIVE_SQRT',
  /** Invalid number format (e.g., 1e-) */
  INVALID_NUMBER = 'INVALID_NUMBER',
  /** Imaginary unit not allowed (real parser only) */
  IMAGINARY_NOT_ALLOWED = 'IMAGINARY_NOT_ALLOWED',
}

/**
 * Structured parse error with code, message, and optional position
 */
export interface ParseError {
  /** Machine-readable error code */
  code: ParseErrorCode;
  /** Human-readable error message */
  message: string;
  /** Character position where the error occurred (0-indexed) */
  position?: number;
}

/**
 * Create a parse error with consistent formatting
 */
export function createError(
  code: ParseErrorCode,
  message: string,
  position?: number
): ParseError {
  return { code, message, position };
}

/**
 * Helper functions to create specific error types
 */
export const errors = {
  emptyExpression: () =>
    createError(ParseErrorCode.EMPTY_EXPRESSION, 'Expression cannot be empty'),

  unexpectedChar: (char: string, position: number) =>
    createError(
      ParseErrorCode.UNEXPECTED_CHAR,
      `Unexpected character '${char}' at position ${position}`,
      position
    ),

  unexpectedToken: (lexeme: string, position: number) =>
    createError(
      ParseErrorCode.UNEXPECTED_TOKEN,
      `Unexpected '${lexeme}' at position ${position}`,
      position
    ),

  expectedExpression: (position: number) =>
    createError(
      ParseErrorCode.EXPECTED_EXPRESSION,
      `Expected expression at position ${position}`,
      position
    ),

  expectedRParen: (position: number) =>
    createError(
      ParseErrorCode.EXPECTED_RPAREN,
      `Expected ')' at position ${position}`,
      position
    ),

  expectedLParenAfterSqrt: (position: number) =>
    createError(
      ParseErrorCode.EXPECTED_LPAREN_AFTER_SQRT,
      `Expected '(' after 'sqrt' at position ${position}`,
      position
    ),

  divisionByZero: (position: number) =>
    createError(
      ParseErrorCode.DIVISION_BY_ZERO,
      'Cannot divide by zero',
      position
    ),

  negativeSqrt: (position: number) =>
    createError(
      ParseErrorCode.NEGATIVE_SQRT,
      'Cannot take square root of negative number',
      position
    ),

  invalidNumber: (position: number) =>
    createError(
      ParseErrorCode.INVALID_NUMBER,
      `Invalid number format at position ${position}`,
      position
    ),

  imaginaryNotAllowed: (position: number) =>
    createError(
      ParseErrorCode.IMAGINARY_NOT_ALLOWED,
      `Imaginary unit 'i' not allowed in angle expressions`,
      position
    ),
};
