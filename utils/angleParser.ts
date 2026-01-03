/**
 * Parses angle expressions like "pi/4", "2*pi", "pi", "0.5", etc.
 * Returns the angle in radians.
 */
export function parseAngleExpression(expr: string): number | null {
  if (!expr || expr.trim() === '') {
    return null;
  }

  const normalized = expr
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/π/g, 'pi');

  // Direct number
  const directNum = parseFloat(normalized);
  if (!isNaN(directNum) && !normalized.includes('pi')) {
    return directNum;
  }

  // Handle expressions with pi
  try {
    // Replace pi with Math.PI for evaluation
    let evalExpr = normalized
      .replace(/pi/g, String(Math.PI))
      .replace(/\*/g, '*')
      .replace(/\//g, '/');

    // Handle implicit multiplication: 2pi -> 2*pi
    evalExpr = evalExpr.replace(/(\d)(3\.14159)/g, '$1*$2');

    // Simple safe evaluation for basic math expressions
    // Only allow numbers, operators, parentheses, and decimal points
    if (!/^[\d\.\+\-\*\/\(\)\s]+$/.test(evalExpr)) {
      return null;
    }

    // Use Function constructor for safe evaluation of numeric expressions
    const result = new Function(`return ${evalExpr}`)();

    if (typeof result === 'number' && !isNaN(result) && isFinite(result)) {
      return result;
    }
  } catch {
    // Parse failed
  }

  return null;
}

/**
 * Formats an angle value for display
 */
export function formatAngle(radians: number): string {
  const piMultiple = radians / Math.PI;

  // Check for common fractions of pi
  const fractions: [number, string][] = [
    [2, '2π'],
    [1, 'π'],
    [0.5, 'π/2'],
    [0.25, 'π/4'],
    [0.125, 'π/8'],
    [-0.125, '-π/8'],
    [-0.25, '-π/4'],
    [-0.5, '-π/2'],
    [-1, '-π'],
    [-2, '-2π'],
    [1/3, 'π/3'],
    [2/3, '2π/3'],
    [1/6, 'π/6'],
    [5/6, '5π/6'],
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
