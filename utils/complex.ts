/**
 * Complex number utilities for quantum circuit simulation.
 *
 * PERFORMANCE NOTE: In hot simulation loops, inline the multiplication formula
 * directly rather than calling mul() to avoid function call overhead:
 *
 *   // Instead of: const result = mul(a, b);
 *   const resultRe = a.re * b.re - a.im * b.im;
 *   const resultIm = a.re * b.im + a.im * b.re;
 */

// ============================================================================
// Constants
// ============================================================================

/** Epsilon for floating-point comparisons */
export const EPSILON = 1e-10;

// ============================================================================
// Type Definition
// ============================================================================

/** Complex number represented as real and imaginary parts */
export type Complex = {
  readonly re: number;
  readonly im: number;
};

// ============================================================================
// Factory Functions
// ============================================================================

/** Create a complex number */
export const complex = (re: number, im: number): Complex => ({ re, im });

/** Create a complex number from polar form (r, theta) */
export const fromPolar = (r: number, theta: number): Complex => ({
  re: r * Math.cos(theta),
  im: r * Math.sin(theta),
});

// ============================================================================
// Arithmetic Operations
// ============================================================================

/** Add two complex numbers */
export const add = (a: Complex, b: Complex): Complex => ({
  re: a.re + b.re,
  im: a.im + b.im,
});

/** Subtract two complex numbers */
export const sub = (a: Complex, b: Complex): Complex => ({
  re: a.re - b.re,
  im: a.im - b.im,
});

/** Multiply two complex numbers */
export const mul = (a: Complex, b: Complex): Complex => ({
  re: a.re * b.re - a.im * b.im,
  im: a.re * b.im + a.im * b.re,
});

/** Scale a complex number by a real scalar */
export const scale = (a: Complex, s: number): Complex => ({
  re: a.re * s,
  im: a.im * s,
});

/** Negate a complex number */
export const neg = (a: Complex): Complex => ({ re: -a.re, im: -a.im });

// ============================================================================
// Unary Operations
// ============================================================================

/** Complex conjugate */
export const conj = (a: Complex): Complex => ({ re: a.re, im: -a.im });

/** Absolute value (magnitude) */
export const abs = (a: Complex): number =>
  Math.sqrt(a.re * a.re + a.im * a.im);

/** Absolute value squared (avoids sqrt for performance) */
export const absSq = (a: Complex): number => a.re * a.re + a.im * a.im;

/** Phase angle (argument) in radians */
export const arg = (a: Complex): number => Math.atan2(a.im, a.re);

// ============================================================================
// Predicates
// ============================================================================

/** Check if complex number is exactly zero */
export const isZero = (a: Complex): boolean => a.re === 0 && a.im === 0;

/** Check if complex number is approximately zero */
export const isNearZero = (a: Complex, epsilon = EPSILON): boolean =>
  Math.abs(a.re) < epsilon && Math.abs(a.im) < epsilon;

/** Check if two complex numbers are approximately equal */
export const equals = (a: Complex, b: Complex, epsilon = EPSILON): boolean =>
  Math.abs(a.re - b.re) < epsilon && Math.abs(a.im - b.im) < epsilon;

// ============================================================================
// Pre-defined Constants (frozen to prevent mutation)
// ============================================================================

export const ZERO: Complex = Object.freeze({ re: 0, im: 0 });
export const ONE: Complex = Object.freeze({ re: 1, im: 0 });
export const NEG_ONE: Complex = Object.freeze({ re: -1, im: 0 });
export const I: Complex = Object.freeze({ re: 0, im: 1 });
export const NEG_I: Complex = Object.freeze({ re: 0, im: -1 });
export const INV_SQRT2: Complex = Object.freeze({
  re: 1 / Math.sqrt(2),
  im: 0,
});
export const NEG_INV_SQRT2: Complex = Object.freeze({
  re: -1 / Math.sqrt(2),
  im: 0,
});
export const T_PHASE: Complex = Object.freeze({
  re: 1 / Math.sqrt(2),
  im: 1 / Math.sqrt(2),
});
