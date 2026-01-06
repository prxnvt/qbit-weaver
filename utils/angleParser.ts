import { parseReal, ParseResult, ParseErrorCode } from './parser';

/**
 * Parses angle expressions like "pi/4", "sqrt(2)", "2*pi", "0.5", etc.
 * Returns the angle in radians, or null on failure (backward compatible).
 */
export function parseAngleExpression(expr: string): number | null {
  if (!expr || expr.trim() === '') {
    return null;
  }

  const result = parseReal(expr);
  return result.success ? result.value : null;
}

/**
 * Parses angle expressions with detailed error reporting.
 * Returns { success: true, value: number } or { success: false, error: ParseError }
 */
export function parseAngleExpressionDetailed(expr: string): ParseResult<number> {
  if (!expr || expr.trim() === '') {
    return {
      success: false,
      error: {
        code: ParseErrorCode.EMPTY_EXPRESSION,
        message: 'Expression cannot be empty',
      },
    };
  }

  return parseReal(expr);
}

/**
 * Formats an angle value for display
 */
export function formatAngle(radians: number): string {
  const piMultiple = radians / Math.PI;

  // Check for common fractions of pi
  const fractions: [number, string][] = [
    [2, '2\u03c0'],
    [1, '\u03c0'],
    [0.5, '\u03c0/2'],
    [0.25, '\u03c0/4'],
    [0.125, '\u03c0/8'],
    [-0.125, '-\u03c0/8'],
    [-0.25, '-\u03c0/4'],
    [-0.5, '-\u03c0/2'],
    [-1, '-\u03c0'],
    [-2, '-2\u03c0'],
    [1 / 3, '\u03c0/3'],
    [2 / 3, '2\u03c0/3'],
    [1 / 6, '\u03c0/6'],
    [5 / 6, '5\u03c0/6'],
  ];

  for (const [mult, label] of fractions) {
    if (Math.abs(piMultiple - mult) < 0.0001) {
      return label;
    }
  }

  // For other values, show as decimal with 2 decimal places
  if (Math.abs(radians) < 0.01) {
    return '0';
  }

  return radians.toFixed(2);
}
