import { Complex } from '../types';
import { parseComplex as parseComplexExpr, ParseResult, ParseErrorCode, Complex as ParserComplex } from './parser';
import { EPSILON } from './quantum';

/**
 * Parse a complex number expression like "1+2i", "sqrt(-1)", "1/sqrt(2)", etc.
 * Returns Complex or null on failure (backward compatible).
 */
export function parseComplexExpression(expr: string): Complex | null {
  if (!expr) return null;

  const trimmed = expr.trim();
  if (trimmed === '') {
    // Quirk: whitespace-only returns zero (backward compatibility)
    return { re: 0, im: 0 };
  }

  const result = parseComplexExpr(trimmed);
  return result.success ? result.value : null;
}

/**
 * Parse a complex expression with detailed error reporting.
 */
export function parseComplexExpressionDetailed(expr: string): ParseResult<Complex> {
  if (!expr) {
    return {
      success: false,
      error: {
        code: ParseErrorCode.EMPTY_EXPRESSION,
        message: 'Expression cannot be empty',
      },
    };
  }

  const trimmed = expr.trim();
  if (trimmed === '') {
    // Quirk: whitespace-only returns zero (backward compatibility)
    return { success: true, value: { re: 0, im: 0 } };
  }

  return parseComplexExpr(trimmed);
}

/**
 * Format a complex number for display
 */
export function formatComplex(c: Complex): string {
  const re = c.re;
  const im = c.im;

  if (Math.abs(re) < EPSILON && Math.abs(im) < EPSILON) return '0';

  const formatNum = (n: number): string => {
    if (Math.abs(n - Math.round(n)) < EPSILON) {
      return String(Math.round(n));
    }
    return n.toFixed(3).replace(/\.?0+$/, '');
  };

  if (Math.abs(im) < EPSILON) return formatNum(re);
  if (Math.abs(re) < EPSILON) {
    if (Math.abs(im - 1) < EPSILON) return 'i';
    if (Math.abs(im + 1) < EPSILON) return '-i';
    return `${formatNum(im)}i`;
  }

  const imSign = im >= 0 ? '+' : '';
  if (Math.abs(im - 1) < EPSILON) return `${formatNum(re)}+i`;
  if (Math.abs(im + 1) < EPSILON) return `${formatNum(re)}-i`;
  return `${formatNum(re)}${imSign}${formatNum(im)}i`;
}
