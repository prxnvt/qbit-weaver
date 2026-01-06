import { Complex } from '../types';
import { EPSILON } from './quantum';

/**
 * Parse a complex number expression like "1+2i", "1-i", "1/sqrt(2)", "pi/4", etc.
 * Returns null if parsing fails.
 */
export function parseComplexExpression(expr: string): Complex | null {
  if (!expr) return null;

  // Trim all whitespace
  const normalized = expr.replace(/\s+/g, '').toLowerCase();

  if (normalized === '') {
    return { re: 0, im: 0 };
  }

  // Helper to evaluate a real number expression
  const evalReal = (s: string): number | null => {
    if (!s || s === '' || s === '+' || s === '-') return null;

    let result = s;

    // Handle sqrt(...)
    result = result.replace(/sqrt\(([^)]+)\)/g, (_, inner) => {
      const innerVal = evalReal(inner);
      if (innerVal === null) return 'NaN';
      return String(Math.sqrt(innerVal));
    });

    // Handle pi
    result = result.replace(/pi/g, String(Math.PI));

    // Handle 1/sqrt(...) patterns that might remain
    result = result.replace(/(\d+)\/(\d+\.?\d*)/g, (_, num, den) => {
      return String(parseFloat(num) / parseFloat(den));
    });

    // Check if it's a valid numeric expression
    // Only allow: digits, decimal points, +, -, *, /, parentheses
    if (!/^[\d\.\+\-\*\/\(\)e]+$/.test(result)) {
      return null;
    }

    try {
      const val = new Function(`return ${result}`)();
      if (typeof val === 'number' && !isNaN(val) && isFinite(val)) {
        return val;
      }
    } catch {
      // Parse failed
    }

    return null;
  };

  // Check for pure imaginary: just "i", "-i", "2i", etc.
  if (/^[+-]?(\d*\.?\d*|\([^)]+\)|sqrt\([^)]+\)|pi|[\d\.]+\/[\d\.]+|[\d\.]+\/sqrt\([^)]+\))?i$/.test(normalized)) {
    let imPart = normalized.slice(0, -1); // Remove trailing 'i'
    if (imPart === '' || imPart === '+') imPart = '1';
    if (imPart === '-') imPart = '-1';

    const imVal = evalReal(imPart);
    if (imVal === null) return null;
    return { re: 0, im: imVal };
  }

  // Check for pure real (no 'i')
  if (!normalized.includes('i')) {
    const reVal = evalReal(normalized);
    if (reVal === null) return null;
    return { re: reVal, im: 0 };
  }

  // Complex: a+bi or a-bi format
  // Find the last + or - that separates real and imaginary parts
  // But not inside parentheses and not at the start

  let splitIdx = -1;
  let parenDepth = 0;

  for (let i = normalized.length - 1; i >= 0; i--) {
    const c = normalized[i];
    if (c === ')') parenDepth++;
    if (c === '(') parenDepth--;
    if (parenDepth === 0 && (c === '+' || c === '-') && i > 0) {
      // Check if this is an operator (not part of exponent like 1e-5)
      const prevChar = normalized[i - 1];
      if (prevChar !== 'e') {
        splitIdx = i;
        break;
      }
    }
  }

  if (splitIdx === -1) {
    return null;
  }

  const realPart = normalized.slice(0, splitIdx);
  let imPart = normalized.slice(splitIdx); // Includes the +/- sign

  // Remove trailing 'i' from imaginary part
  if (!imPart.endsWith('i')) return null;
  imPart = imPart.slice(0, -1);

  // Handle cases like "+i" -> "+1", "-i" -> "-1"
  if (imPart === '+' || imPart === '') imPart = '+1';
  if (imPart === '-') imPart = '-1';

  const reVal = evalReal(realPart);
  const imVal = evalReal(imPart);

  if (reVal === null || imVal === null) return null;

  return { re: reVal, im: imVal };
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
