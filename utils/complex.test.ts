import { describe, it, expect } from 'vitest';
import * as C from './complex';

describe('complex module', () => {
  describe('factory functions', () => {
    it('creates complex numbers with complex()', () => {
      expect(C.complex(1, 2)).toEqual({ re: 1, im: 2 });
      expect(C.complex(0, 0)).toEqual({ re: 0, im: 0 });
      expect(C.complex(-3.5, 4.5)).toEqual({ re: -3.5, im: 4.5 });
    });

    it('creates from polar form', () => {
      const c1 = C.fromPolar(1, 0);
      expect(c1.re).toBeCloseTo(1);
      expect(c1.im).toBeCloseTo(0);

      const c2 = C.fromPolar(1, Math.PI / 2);
      expect(c2.re).toBeCloseTo(0);
      expect(c2.im).toBeCloseTo(1);

      const c3 = C.fromPolar(2, Math.PI);
      expect(c3.re).toBeCloseTo(-2);
      expect(c3.im).toBeCloseTo(0);
    });
  });

  describe('arithmetic operations', () => {
    it('adds complex numbers', () => {
      expect(C.add({ re: 1, im: 2 }, { re: 3, im: 4 })).toEqual({ re: 4, im: 6 });
    });

    it('subtracts complex numbers', () => {
      expect(C.sub({ re: 5, im: 3 }, { re: 2, im: 1 })).toEqual({ re: 3, im: 2 });
    });

    it('multiplies complex numbers', () => {
      // (1+2i)(3+4i) = -5+10i
      expect(C.mul({ re: 1, im: 2 }, { re: 3, im: 4 })).toEqual({ re: -5, im: 10 });
      // i * i = -1
      expect(C.mul({ re: 0, im: 1 }, { re: 0, im: 1 })).toEqual({ re: -1, im: 0 });
    });

    it('scales by real scalar', () => {
      expect(C.scale({ re: 2, im: 3 }, 2)).toEqual({ re: 4, im: 6 });
    });

    it('negates complex numbers', () => {
      expect(C.neg({ re: 1, im: 2 })).toEqual({ re: -1, im: -2 });
    });
  });

  describe('unary operations', () => {
    it('computes conjugate', () => {
      expect(C.conj({ re: 1, im: 2 })).toEqual({ re: 1, im: -2 });
      expect(C.conj({ re: 0, im: -5 })).toEqual({ re: 0, im: 5 });
    });

    it('computes absolute value', () => {
      expect(C.abs({ re: 3, im: 4 })).toBe(5);
      expect(C.abs({ re: 0, im: 0 })).toBe(0);
    });

    it('computes absolute value squared', () => {
      expect(C.absSq({ re: 3, im: 4 })).toBe(25);
    });

    it('computes phase angle', () => {
      expect(C.arg({ re: 1, im: 0 })).toBe(0);
      expect(C.arg({ re: 0, im: 1 })).toBeCloseTo(Math.PI / 2);
      expect(C.arg({ re: -1, im: 0 })).toBeCloseTo(Math.PI);
    });
  });

  describe('predicates', () => {
    it('checks exact zero', () => {
      expect(C.isZero({ re: 0, im: 0 })).toBe(true);
      expect(C.isZero({ re: 1e-15, im: 0 })).toBe(false);
    });

    it('checks approximate zero', () => {
      expect(C.isNearZero({ re: 0, im: 0 })).toBe(true);
      expect(C.isNearZero({ re: 1e-11, im: 1e-11 })).toBe(true);
      expect(C.isNearZero({ re: 1e-9, im: 0 })).toBe(false);
    });

    it('checks approximate equality', () => {
      const a = { re: 1, im: 2 };
      const b = { re: 1 + 1e-11, im: 2 - 1e-11 };
      expect(C.equals(a, b)).toBe(true);
      expect(C.equals(a, { re: 1.1, im: 2 })).toBe(false);
    });
  });

  describe('constants', () => {
    it('has correct values', () => {
      expect(C.ZERO).toEqual({ re: 0, im: 0 });
      expect(C.ONE).toEqual({ re: 1, im: 0 });
      expect(C.I).toEqual({ re: 0, im: 1 });
      expect(C.INV_SQRT2.re).toBeCloseTo(1 / Math.sqrt(2));
    });

    it('constants are frozen', () => {
      expect(Object.isFrozen(C.ZERO)).toBe(true);
      expect(Object.isFrozen(C.ONE)).toBe(true);
    });
  });

  describe('EPSILON constant', () => {
    it('has expected value', () => {
      expect(C.EPSILON).toBe(1e-10);
    });
  });
});
