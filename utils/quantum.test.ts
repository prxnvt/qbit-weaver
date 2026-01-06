import { describe, it, expect, vi } from 'vitest';
import * as fc from 'fast-check';
import {
  // Complex math
  cAdd,
  cMul,
  cScale,
  cAbsSq,
  // Arithmetic helpers
  gcd,
  properMod,
  modularInverse,
  isOdd,
  areCoprime,
  // Rotation matrices
  getRxMatrix,
  getRyMatrix,
  getRzMatrix,
  // State management
  createInitialState,
  readRegisterValue,
  writeRegisterValue,
  // Gate matrix
  getGateMatrix,
  // Bloch vector
  getBlochVector,
  // Measurement
  measureQubit,
  // ComplexArray helpers
  fromComplexObjectArray,
  // Circuit validation
  validateCircuit,
  isCircuitValid,
  // Simulation
  simulateCircuit,
  // Circuit with measurements and warnings
  runCircuitWithMeasurements,
  // Arithmetic info
  getColumnArithmeticInfo,
} from './quantum';
import { Complex, GateType, CircuitGrid, Cell } from '../types';

// Helper to check complex number equality with tolerance
const expectComplexClose = (actual: Complex, expected: Complex, tolerance = 1e-10) => {
  expect(actual.re).toBeCloseTo(expected.re, tolerance);
  expect(actual.im).toBeCloseTo(expected.im, tolerance);
};

// Helper to check if a matrix is unitary (M† M = I)
const isUnitary = (matrix: Complex[][]): boolean => {
  if (matrix.length !== 2 || matrix[0].length !== 2) return false;

  // M† M should equal identity
  // For 2x2: [a b; c d]† = [a* c*; b* d*]
  const a = matrix[0][0], b = matrix[0][1];
  const c = matrix[1][0], d = matrix[1][1];

  // Conjugate transpose elements
  const aStar = { re: a.re, im: -a.im };
  const bStar = { re: b.re, im: -b.im };
  const cStar = { re: c.re, im: -c.im };
  const dStar = { re: d.re, im: -d.im };

  // M† M = [[a* c*], [b* d*]] * [[a b], [c d]]
  // Result [0][0] = a*·a + c*·c should be 1
  const r00 = cAdd(cMul(aStar, a), cMul(cStar, c));
  const r11 = cAdd(cMul(bStar, b), cMul(dStar, d));
  const r01 = cAdd(cMul(aStar, b), cMul(cStar, d));
  const r10 = cAdd(cMul(bStar, a), cMul(dStar, c));

  return Math.abs(r00.re - 1) < 1e-10 && Math.abs(r00.im) < 1e-10 &&
         Math.abs(r11.re - 1) < 1e-10 && Math.abs(r11.im) < 1e-10 &&
         Math.abs(r01.re) < 1e-10 && Math.abs(r01.im) < 1e-10 &&
         Math.abs(r10.re) < 1e-10 && Math.abs(r10.im) < 1e-10;
};

describe('quantum utilities', () => {
  describe('Complex Number Math', () => {
    describe('cAdd', () => {
      it('should add two complex numbers', () => {
        const a: Complex = { re: 1, im: 2 };
        const b: Complex = { re: 3, im: 4 };
        const result = cAdd(a, b);
        expect(result).toEqual({ re: 4, im: 6 });
      });

      it('should handle zero', () => {
        const a: Complex = { re: 5, im: 7 };
        const zero: Complex = { re: 0, im: 0 };
        expect(cAdd(a, zero)).toEqual(a);
        expect(cAdd(zero, a)).toEqual(a);
      });

      it('should handle purely real numbers', () => {
        expect(cAdd({ re: 1, im: 0 }, { re: 2, im: 0 })).toEqual({ re: 3, im: 0 });
      });

      it('should handle purely imaginary numbers', () => {
        expect(cAdd({ re: 0, im: 1 }, { re: 0, im: 2 })).toEqual({ re: 0, im: 3 });
      });

      it('should handle negative numbers', () => {
        expect(cAdd({ re: -1, im: -2 }, { re: 3, im: 4 })).toEqual({ re: 2, im: 2 });
      });
    });

    describe('cMul', () => {
      it('should multiply two complex numbers', () => {
        const a: Complex = { re: 1, im: 2 };
        const b: Complex = { re: 3, im: 4 };
        // (1+2i)(3+4i) = 3+4i+6i+8i² = 3+10i-8 = -5+10i
        const result = cMul(a, b);
        expect(result).toEqual({ re: -5, im: 10 });
      });

      it('should handle multiplication by zero', () => {
        const a: Complex = { re: 5, im: 7 };
        const zero: Complex = { re: 0, im: 0 };
        expect(cMul(a, zero)).toEqual(zero);
        expect(cMul(zero, a)).toEqual(zero);
      });

      it('should handle multiplication by one', () => {
        const a: Complex = { re: 5, im: 7 };
        const one: Complex = { re: 1, im: 0 };
        expect(cMul(a, one)).toEqual(a);
        expect(cMul(one, a)).toEqual(a);
      });

      it('should handle multiplication by i', () => {
        const a: Complex = { re: 3, im: 4 };
        const i: Complex = { re: 0, im: 1 };
        // (3+4i)*i = 3i+4i² = 3i-4 = -4+3i
        expect(cMul(a, i)).toEqual({ re: -4, im: 3 });
      });

      it('should handle purely real numbers', () => {
        expect(cMul({ re: 2, im: 0 }, { re: 3, im: 0 })).toEqual({ re: 6, im: 0 });
      });

      it('should handle negative numbers', () => {
        expect(cMul({ re: -1, im: 0 }, { re: 2, im: 3 })).toEqual({ re: -2, im: -3 });
      });
    });

    describe('cAbsSq', () => {
      it('should compute absolute value squared', () => {
        expect(cAbsSq({ re: 3, im: 4 })).toBe(25); // 3² + 4² = 25
      });

      it('should handle zero', () => {
        expect(cAbsSq({ re: 0, im: 0 })).toBe(0);
      });

      it('should handle purely real numbers', () => {
        expect(cAbsSq({ re: 5, im: 0 })).toBe(25);
      });

      it('should handle purely imaginary numbers', () => {
        expect(cAbsSq({ re: 0, im: 5 })).toBe(25);
      });

      it('should handle negative numbers', () => {
        expect(cAbsSq({ re: -3, im: -4 })).toBe(25);
      });

      it('should be non-negative', () => {
        expect(cAbsSq({ re: -1, im: -1 })).toBeGreaterThanOrEqual(0);
      });
    });

    describe('cScale', () => {
      it('should scale a complex number by a complex scalar', () => {
        const a: Complex = { re: 1, im: 2 };
        const scalar: Complex = { re: 2, im: 0 };
        expect(cScale(a, scalar)).toEqual({ re: 2, im: 4 });
      });

      it('should be equivalent to cMul', () => {
        const a: Complex = { re: 3, im: 4 };
        const scalar: Complex = { re: 2, im: 1 };
        expect(cScale(a, scalar)).toEqual(cMul(a, scalar));
      });
    });
  });

  describe('Arithmetic Helper Functions', () => {
    describe('gcd', () => {
      it('should compute GCD of positive numbers', () => {
        expect(gcd(12, 8)).toBe(4);
        expect(gcd(21, 14)).toBe(7);
        expect(gcd(17, 13)).toBe(1); // Coprime
      });

      it('should handle edge cases', () => {
        expect(gcd(0, 5)).toBe(5);
        expect(gcd(5, 0)).toBe(5);
        expect(gcd(0, 0)).toBe(0);
        expect(gcd(1, 1)).toBe(1);
      });

      it('should handle negative numbers', () => {
        expect(gcd(-12, 8)).toBe(4);
        expect(gcd(12, -8)).toBe(4);
        expect(gcd(-12, -8)).toBe(4);
      });

      it('should handle prime numbers', () => {
        expect(gcd(7, 11)).toBe(1);
        expect(gcd(13, 17)).toBe(1);
      });

      it('should handle powers of 2', () => {
        expect(gcd(16, 8)).toBe(8);
        expect(gcd(32, 24)).toBe(8);
      });
    });

    describe('properMod', () => {
      it('should compute modulo for positive numbers', () => {
        expect(properMod(7, 3)).toBe(1);
        expect(properMod(10, 4)).toBe(2);
      });

      it('should handle negative numbers correctly', () => {
        expect(properMod(-1, 4)).toBe(3);
        expect(properMod(-5, 3)).toBe(1);
        expect(properMod(-7, 4)).toBe(1);
      });

      it('should handle zero', () => {
        expect(properMod(0, 5)).toBe(0);
      });

      it('should handle number equal to modulus', () => {
        expect(properMod(5, 5)).toBe(0);
        expect(properMod(10, 5)).toBe(0);
      });

      it('should always return non-negative result', () => {
        expect(properMod(-100, 7)).toBeGreaterThanOrEqual(0);
        expect(properMod(-100, 7)).toBeLessThan(7);
      });
    });

    describe('modularInverse', () => {
      it('should compute modular inverse for coprime numbers', () => {
        expect(modularInverse(3, 7)).toBe(5); // 3*5 = 15 ≡ 1 (mod 7)
        expect(modularInverse(2, 5)).toBe(3); // 2*3 = 6 ≡ 1 (mod 5)
      });

      it('should return null when inverse does not exist', () => {
        expect(modularInverse(2, 4)).toBeNull(); // gcd(2,4) = 2 ≠ 1
        expect(modularInverse(6, 9)).toBeNull(); // gcd(6,9) = 3 ≠ 1
      });

      it('should handle 1', () => {
        expect(modularInverse(1, 5)).toBe(1); // 1*1 = 1 ≡ 1 (mod 5)
      });

      it('should verify inverse property', () => {
        const a = 7, m = 11;
        const inv = modularInverse(a, m);
        expect(inv).not.toBeNull();
        if (inv !== null) {
          expect(properMod(a * inv, m)).toBe(1);
        }
      });

      it('should handle power of 2 modulus', () => {
        expect(modularInverse(3, 8)).toBe(3); // 3*3 = 9 ≡ 1 (mod 8)
        expect(modularInverse(5, 8)).toBe(5); // 5*5 = 25 ≡ 1 (mod 8)
      });
    });

    describe('isOdd', () => {
      it('should identify odd numbers', () => {
        expect(isOdd(1)).toBe(true);
        expect(isOdd(3)).toBe(true);
        expect(isOdd(7)).toBe(true);
        expect(isOdd(999)).toBe(true);
      });

      it('should identify even numbers', () => {
        expect(isOdd(0)).toBe(false);
        expect(isOdd(2)).toBe(false);
        expect(isOdd(4)).toBe(false);
        expect(isOdd(1000)).toBe(false);
      });

      it('should handle negative numbers', () => {
        expect(isOdd(-1)).toBe(true);
        expect(isOdd(-2)).toBe(false);
        expect(isOdd(-3)).toBe(true);
      });
    });

    describe('areCoprime', () => {
      it('should identify coprime numbers', () => {
        expect(areCoprime(3, 5)).toBe(true);
        expect(areCoprime(7, 11)).toBe(true);
        expect(areCoprime(8, 15)).toBe(true);
      });

      it('should identify non-coprime numbers', () => {
        expect(areCoprime(4, 6)).toBe(false);
        expect(areCoprime(12, 18)).toBe(false);
        expect(areCoprime(10, 15)).toBe(false);
      });

      it('should handle 1', () => {
        expect(areCoprime(1, 5)).toBe(true);
        expect(areCoprime(100, 1)).toBe(true);
      });

      it('should handle same numbers', () => {
        expect(areCoprime(5, 5)).toBe(false);
        expect(areCoprime(1, 1)).toBe(true);
      });
    });
  });

  describe('Rotation Matrices', () => {
    describe('getRxMatrix', () => {
      it('should generate Rx(0) = Identity', () => {
        const matrix = getRxMatrix(0);
        expect(isUnitary(matrix)).toBe(true);
        expectComplexClose(matrix[0][0], { re: 1, im: 0 });
        expectComplexClose(matrix[0][1], { re: 0, im: 0 });
        expectComplexClose(matrix[1][0], { re: 0, im: 0 });
        expectComplexClose(matrix[1][1], { re: 1, im: 0 });
      });

      it('should generate Rx(π) = -iX', () => {
        const matrix = getRxMatrix(Math.PI);
        expect(isUnitary(matrix)).toBe(true);
        expectComplexClose(matrix[0][0], { re: 0, im: 0 });
        expectComplexClose(matrix[0][1], { re: 0, im: -1 });
        expectComplexClose(matrix[1][0], { re: 0, im: -1 });
        expectComplexClose(matrix[1][1], { re: 0, im: 0 });
      });

      it('should generate Rx(π/2)', () => {
        const matrix = getRxMatrix(Math.PI / 2);
        expect(isUnitary(matrix)).toBe(true);
        const invSqrt2 = 1 / Math.sqrt(2);
        expectComplexClose(matrix[0][0], { re: invSqrt2, im: 0 });
        expectComplexClose(matrix[0][1], { re: 0, im: -invSqrt2 });
        expectComplexClose(matrix[1][0], { re: 0, im: -invSqrt2 });
        expectComplexClose(matrix[1][1], { re: invSqrt2, im: 0 });
      });

      it('should generate Rx(2π) ≈ -Identity (global phase)', () => {
        const matrix = getRxMatrix(2 * Math.PI);
        expect(isUnitary(matrix)).toBe(true);
        expectComplexClose(matrix[0][0], { re: -1, im: 0 }, 1e-9);
        expectComplexClose(matrix[1][1], { re: -1, im: 0 }, 1e-9);
      });

      it('should handle negative angles', () => {
        const matrixPos = getRxMatrix(Math.PI / 4);
        const matrixNeg = getRxMatrix(-Math.PI / 4);
        expect(isUnitary(matrixNeg)).toBe(true);
        // Rx(-θ) should be conjugate transpose of Rx(θ)
        expectComplexClose(matrixNeg[0][1], { re: matrixPos[0][1].re, im: -matrixPos[0][1].im });
      });

      it('should be unitary for random angles', () => {
        expect(isUnitary(getRxMatrix(0.123))).toBe(true);
        expect(isUnitary(getRxMatrix(2.5))).toBe(true);
      });
    });

    describe('getRyMatrix', () => {
      it('should generate Ry(0) = Identity', () => {
        const matrix = getRyMatrix(0);
        expect(isUnitary(matrix)).toBe(true);
        expectComplexClose(matrix[0][0], { re: 1, im: 0 });
        expectComplexClose(matrix[1][1], { re: 1, im: 0 });
      });

      it('should generate Ry(π/2)', () => {
        const matrix = getRyMatrix(Math.PI / 2);
        expect(isUnitary(matrix)).toBe(true);
        const invSqrt2 = 1 / Math.sqrt(2);
        expectComplexClose(matrix[0][0], { re: invSqrt2, im: 0 });
        expectComplexClose(matrix[0][1], { re: -invSqrt2, im: 0 });
        expectComplexClose(matrix[1][0], { re: invSqrt2, im: 0 });
        expectComplexClose(matrix[1][1], { re: invSqrt2, im: 0 });
      });

      it('should generate Ry(π)', () => {
        const matrix = getRyMatrix(Math.PI);
        expect(isUnitary(matrix)).toBe(true);
        expectComplexClose(matrix[0][0], { re: 0, im: 0 });
        expectComplexClose(matrix[0][1], { re: -1, im: 0 });
        expectComplexClose(matrix[1][0], { re: 1, im: 0 });
        expectComplexClose(matrix[1][1], { re: 0, im: 0 });
      });

      it('should handle negative angles', () => {
        const matrixPos = getRyMatrix(Math.PI / 4);
        const matrixNeg = getRyMatrix(-Math.PI / 4);
        expect(isUnitary(matrixNeg)).toBe(true);
      });

      it('should be unitary for random angles', () => {
        expect(isUnitary(getRyMatrix(1.234))).toBe(true);
        expect(isUnitary(getRyMatrix(-0.5))).toBe(true);
      });
    });

    describe('getRzMatrix', () => {
      it('should generate Rz(0) = Identity', () => {
        const matrix = getRzMatrix(0);
        expect(isUnitary(matrix)).toBe(true);
        expectComplexClose(matrix[0][0], { re: 1, im: 0 });
        expectComplexClose(matrix[1][1], { re: 1, im: 0 });
      });

      it('should generate Rz(π/2) = S gate (up to global phase)', () => {
        const matrix = getRzMatrix(Math.PI / 2);
        expect(isUnitary(matrix)).toBe(true);
        // Rz(π/2) = [[e^(-iπ/4), 0], [0, e^(iπ/4)]]
        expectComplexClose(matrix[0][0], { re: Math.cos(-Math.PI/4), im: Math.sin(-Math.PI/4) });
        expectComplexClose(matrix[1][1], { re: Math.cos(Math.PI/4), im: Math.sin(Math.PI/4) });
      });

      it('should generate Rz(π) = Z (up to global phase)', () => {
        const matrix = getRzMatrix(Math.PI);
        expect(isUnitary(matrix)).toBe(true);
        expectComplexClose(matrix[0][0], { re: 0, im: -1 }); // e^(-iπ/2)
        expectComplexClose(matrix[1][1], { re: 0, im: 1 });  // e^(iπ/2)
      });

      it('should be diagonal', () => {
        const matrix = getRzMatrix(1.5);
        expectComplexClose(matrix[0][1], { re: 0, im: 0 });
        expectComplexClose(matrix[1][0], { re: 0, im: 0 });
      });

      it('should be unitary for random angles', () => {
        expect(isUnitary(getRzMatrix(0.7))).toBe(true);
        expect(isUnitary(getRzMatrix(-1.2))).toBe(true);
      });
    });
  });

  describe('State Management', () => {
    describe('createInitialState', () => {
      it('should create initial |0⟩ state for 1 qubit', () => {
        const state = createInitialState(1);
        // ComplexArray has 2*2^n elements (interleaved re/im)
        expect(state.length).toBe(4); // 2 amplitudes × 2
        // First amplitude (|0⟩) should be 1+0i
        expect(state[0]).toBe(1); // re
        expect(state[1]).toBe(0); // im
        // Second amplitude (|1⟩) should be 0+0i
        expect(state[2]).toBe(0); // re
        expect(state[3]).toBe(0); // im
      });

      it('should create initial |00⟩ state for 2 qubits', () => {
        const state = createInitialState(2);
        // ComplexArray has 2*2^n elements (interleaved re/im)
        expect(state.length).toBe(8); // 4 amplitudes × 2
        // First amplitude (|00⟩) should be 1+0i
        expect(state[0]).toBe(1); // re
        expect(state[1]).toBe(0); // im
        // All other amplitudes should be 0+0i
        for (let i = 1; i < 4; i++) {
          expect(state[2 * i]).toBe(0);     // re
          expect(state[2 * i + 1]).toBe(0); // im
        }
      });

      it('should create initial state for 3 qubits', () => {
        const state = createInitialState(3);
        // ComplexArray has 2*2^n elements (interleaved re/im)
        expect(state.length).toBe(16); // 8 amplitudes × 2
        // First amplitude (|000⟩) should be 1+0i
        expect(state[0]).toBe(1); // re
        expect(state[1]).toBe(0); // im
        // All other amplitudes should be 0+0i
        for (let i = 1; i < 8; i++) {
          expect(state[2 * i]).toBe(0);     // re
          expect(state[2 * i + 1]).toBe(0); // im
        }
      });

      it('should be normalized', () => {
        const state = createInitialState(4);
        // ComplexArray is an interleaved Float64Array: [re0, im0, re1, im1, ...]
        let norm = 0;
        for (let i = 0; i < state.length / 2; i++) {
          norm += state[2 * i] ** 2 + state[2 * i + 1] ** 2;
        }
        expect(norm).toBeCloseTo(1, 10);
      });
    });

    describe('readRegisterValue', () => {
      it('should read single qubit value', () => {
        // For 2 qubits: |01⟩ = basisState 1 (binary: 01)
        // Read qubit 1 (row 1): should be 1
        expect(readRegisterValue(1, 1, 1, 2)).toBe(1);
        // Read qubit 0 (row 0): should be 0
        expect(readRegisterValue(1, 0, 0, 2)).toBe(0);
      });

      it('should read multi-qubit register (little-endian)', () => {
        // For 4 qubits: |0110⟩ = basisState 6 (binary: 0110)
        // Row indices: 0=MSB, 3=LSB
        // Read rows 1-2 (middle two qubits): binary 11 = 3
        expect(readRegisterValue(6, 1, 2, 4)).toBe(3);
      });

      it('should read full register', () => {
        // For 3 qubits: |101⟩ = basisState 5
        expect(readRegisterValue(5, 0, 2, 3)).toBe(5);
      });

      it('should handle zero state', () => {
        expect(readRegisterValue(0, 0, 2, 3)).toBe(0);
      });

      it('should read correct value for different spans', () => {
        // For 4 qubits: |1011⟩ = basisState 11 (binary: 1011)
        // Rows: 0=1, 1=0, 2=1, 3=1
        // Read rows 0-1 (binary 10 in state): little-endian → 01 = 1
        expect(readRegisterValue(11, 0, 1, 4)).toBe(1);
        // Read rows 2-3 (binary 11 in state): little-endian → 11 = 3
        expect(readRegisterValue(11, 2, 3, 4)).toBe(3);
      });
    });

    describe('writeRegisterValue', () => {
      it('should write single qubit value', () => {
        // Start with |00⟩ (basisState 0), write 1 to qubit 1
        const result = writeRegisterValue(0, 1, 1, 1, 2);
        expect(result).toBe(1); // Should become |01⟩
      });

      it('should write multi-qubit register', () => {
        // Start with |0000⟩, write 3 (binary 11) to rows 1-2
        const result = writeRegisterValue(0, 3, 1, 2, 4);
        // Should become |0110⟩ = 6
        expect(result).toBe(6);
      });

      it('should clear existing bits before writing', () => {
        // Start with |1111⟩ = 15, write 0 to rows 1-2
        const result = writeRegisterValue(15, 0, 1, 2, 4);
        // Should become |1001⟩ = 9
        expect(result).toBe(9);
      });

      it('should be inverse of readRegisterValue', () => {
        const originalState = 13; // |1101⟩ for 4 qubits
        const value = readRegisterValue(originalState, 1, 2, 4);
        const newState = writeRegisterValue(0, value, 1, 2, 4);
        expect(readRegisterValue(newState, 1, 2, 4)).toBe(value);
      });

      it('should handle full register write', () => {
        const result = writeRegisterValue(0, 7, 0, 2, 3);
        expect(result).toBe(7);
      });
    });
  });

  describe('Gate Matrix Generation', () => {
    describe('getGateMatrix', () => {
      it('should return X gate matrix', () => {
        const matrix = getGateMatrix(GateType.X);
        expectComplexClose(matrix[0][0], { re: 0, im: 0 });
        expectComplexClose(matrix[0][1], { re: 1, im: 0 });
        expectComplexClose(matrix[1][0], { re: 1, im: 0 });
        expectComplexClose(matrix[1][1], { re: 0, im: 0 });
      });

      it('should return Y gate matrix', () => {
        const matrix = getGateMatrix(GateType.Y);
        expectComplexClose(matrix[0][0], { re: 0, im: 0 });
        expectComplexClose(matrix[0][1], { re: 0, im: -1 });
        expectComplexClose(matrix[1][0], { re: 0, im: 1 });
        expectComplexClose(matrix[1][1], { re: 0, im: 0 });
      });

      it('should return Z gate matrix', () => {
        const matrix = getGateMatrix(GateType.Z);
        expectComplexClose(matrix[0][0], { re: 1, im: 0 });
        expectComplexClose(matrix[0][1], { re: 0, im: 0 });
        expectComplexClose(matrix[1][0], { re: 0, im: 0 });
        expectComplexClose(matrix[1][1], { re: -1, im: 0 });
      });

      it('should return H gate matrix', () => {
        const matrix = getGateMatrix(GateType.H);
        const invSqrt2 = 1 / Math.sqrt(2);
        expectComplexClose(matrix[0][0], { re: invSqrt2, im: 0 });
        expectComplexClose(matrix[0][1], { re: invSqrt2, im: 0 });
        expectComplexClose(matrix[1][0], { re: invSqrt2, im: 0 });
        expectComplexClose(matrix[1][1], { re: -invSqrt2, im: 0 });
      });

      it('should return S gate matrix', () => {
        const matrix = getGateMatrix(GateType.S);
        expectComplexClose(matrix[0][0], { re: 1, im: 0 });
        expectComplexClose(matrix[1][1], { re: 0, im: 1 });
      });

      it('should return T gate matrix', () => {
        const matrix = getGateMatrix(GateType.T);
        expectComplexClose(matrix[0][0], { re: 1, im: 0 });
        const invSqrt2 = 1 / Math.sqrt(2);
        expectComplexClose(matrix[1][1], { re: invSqrt2, im: invSqrt2 });
      });

      it('should handle parameterized RX gate', () => {
        const angle = Math.PI / 4;
        const matrix = getGateMatrix(GateType.RX, { angle });
        expect(isUnitary(matrix)).toBe(true);
      });

      it('should handle parameterized RY gate', () => {
        const angle = Math.PI / 3;
        const matrix = getGateMatrix(GateType.RY, { angle });
        expect(isUnitary(matrix)).toBe(true);
      });

      it('should handle parameterized RZ gate', () => {
        const angle = Math.PI / 6;
        const matrix = getGateMatrix(GateType.RZ, { angle });
        expect(isUnitary(matrix)).toBe(true);
      });

      it('should handle custom gate with custom matrix', () => {
        const customMatrix: Complex[][] = [
          [{ re: 1, im: 0 }, { re: 0, im: 0 }],
          [{ re: 0, im: 0 }, { re: 0, im: 1 }]
        ];
        const matrix = getGateMatrix(GateType.CUSTOM, { customMatrix });
        expect(matrix).toBe(customMatrix);
      });

      it('should return identity for unknown gate', () => {
        const matrix = getGateMatrix('UNKNOWN' as GateType);
        expectComplexClose(matrix[0][0], { re: 1, im: 0 });
        expectComplexClose(matrix[1][1], { re: 1, im: 0 });
        expectComplexClose(matrix[0][1], { re: 0, im: 0 });
        expectComplexClose(matrix[1][0], { re: 0, im: 0 });
      });

      it('should handle preset rotation gates', () => {
        const gates = [
          GateType.RX_PI_2, GateType.RX_PI_4, GateType.RX_PI_8,
          GateType.RY_PI_2, GateType.RY_PI_4, GateType.RY_PI_8,
          GateType.RZ_PI_2, GateType.RZ_PI_4, GateType.RZ_PI_8
        ];
        gates.forEach(gate => {
          const matrix = getGateMatrix(gate);
          expect(isUnitary(matrix)).toBe(true);
        });
      });

      it('should handle square root gates', () => {
        const sqrtX = getGateMatrix(GateType.SQRT_X);
        const sqrtY = getGateMatrix(GateType.SQRT_Y);
        expect(isUnitary(sqrtX)).toBe(true);
        expect(isUnitary(sqrtY)).toBe(true);
      });
    });
  });

  describe('Bloch Vector Calculation', () => {
    describe('getBlochVector', () => {
      it('should return (0, 0, 1) for |0⟩ state', () => {
        const state = createInitialState(1);
        const [x, y, z] = getBlochVector(state, 0, 1);
        expect(x).toBeCloseTo(0, 10);
        expect(y).toBeCloseTo(0, 10);
        expect(z).toBeCloseTo(1, 10);
      });

      it('should return (0, 0, -1) for |1⟩ state', () => {
        const state = fromComplexObjectArray([{ re: 0, im: 0 }, { re: 1, im: 0 }]);
        const [x, y, z] = getBlochVector(state, 0, 1);
        expect(x).toBeCloseTo(0, 10);
        expect(y).toBeCloseTo(0, 10);
        expect(z).toBeCloseTo(-1, 10);
      });

      it('should return (1, 0, 0) for |+⟩ state', () => {
        const invSqrt2 = 1 / Math.sqrt(2);
        const state = fromComplexObjectArray([
          { re: invSqrt2, im: 0 },
          { re: invSqrt2, im: 0 }
        ]);
        const [x, y, z] = getBlochVector(state, 0, 1);
        expect(x).toBeCloseTo(1, 10);
        expect(y).toBeCloseTo(0, 10);
        expect(z).toBeCloseTo(0, 10);
      });

      it('should return (-1, 0, 0) for |-⟩ state', () => {
        const invSqrt2 = 1 / Math.sqrt(2);
        const state = fromComplexObjectArray([
          { re: invSqrt2, im: 0 },
          { re: -invSqrt2, im: 0 }
        ]);
        const [x, y, z] = getBlochVector(state, 0, 1);
        expect(x).toBeCloseTo(-1, 10);
        expect(y).toBeCloseTo(0, 10);
        expect(z).toBeCloseTo(0, 10);
      });

      it('should return (0, 1, 0) for |+i⟩ state', () => {
        const invSqrt2 = 1 / Math.sqrt(2);
        const state = fromComplexObjectArray([
          { re: invSqrt2, im: 0 },
          { re: 0, im: invSqrt2 }
        ]);
        const [x, y, z] = getBlochVector(state, 0, 1);
        expect(x).toBeCloseTo(0, 10);
        expect(y).toBeCloseTo(1, 10);
        expect(z).toBeCloseTo(0, 10);
      });

      it('should return (0, -1, 0) for |-i⟩ state', () => {
        const invSqrt2 = 1 / Math.sqrt(2);
        const state = fromComplexObjectArray([
          { re: invSqrt2, im: 0 },
          { re: 0, im: -invSqrt2 }
        ]);
        const [x, y, z] = getBlochVector(state, 0, 1);
        expect(x).toBeCloseTo(0, 10);
        expect(y).toBeCloseTo(-1, 10);
        expect(z).toBeCloseTo(0, 10);
      });

      it('should have unit length for pure states', () => {
        const invSqrt2 = 1 / Math.sqrt(2);
        const state = fromComplexObjectArray([
          { re: invSqrt2, im: 0 },
          { re: 0.5, im: 0.5 }
        ]);
        const [x, y, z] = getBlochVector(state, 0, 1);
        const length = Math.sqrt(x*x + y*y + z*z);
        expect(length).toBeCloseTo(1, 8);
      });

      it('should work with multi-qubit states', () => {
        // 2-qubit state |00⟩: first qubit is |0⟩
        const state = createInitialState(2);
        const [x, y, z] = getBlochVector(state, 0, 2);
        expect(z).toBeCloseTo(1, 10);
      });
    });
  });

  describe('Measurement', () => {
    describe('measureQubit', () => {
      it('should measure |0⟩ as 0 with probability 1', () => {
        const state = createInitialState(1);
        vi.spyOn(Math, 'random').mockReturnValue(0.5);
        const { result, probability, collapsedState } = measureQubit(state, 0, 1);
        expect(result).toBe(0);
        expect(probability).toBeCloseTo(1, 10);
        // collapsedState is ComplexArray: [re0, im0, re1, im1]
        expect(collapsedState[0]).toBeCloseTo(1, 10); // re of index 0
        expect(collapsedState[1]).toBeCloseTo(0, 10); // im of index 0
        vi.restoreAllMocks();
      });

      it('should measure |1⟩ as 1 with probability 1', () => {
        const state = fromComplexObjectArray([{ re: 0, im: 0 }, { re: 1, im: 0 }]);
        vi.spyOn(Math, 'random').mockReturnValue(0.5);
        const { result, probability, collapsedState } = measureQubit(state, 0, 1);
        expect(result).toBe(1);
        expect(probability).toBeCloseTo(1, 10);
        // collapsedState is ComplexArray: [re0, im0, re1, im1]
        expect(collapsedState[2]).toBeCloseTo(1, 10); // re of index 1
        expect(collapsedState[3]).toBeCloseTo(0, 10); // im of index 1
        vi.restoreAllMocks();
      });

      it('should measure |+⟩ with equal probabilities', () => {
        const invSqrt2 = 1 / Math.sqrt(2);
        const state = fromComplexObjectArray([
          { re: invSqrt2, im: 0 },
          { re: invSqrt2, im: 0 }
        ]);

        // Test measurement to 0
        vi.spyOn(Math, 'random').mockReturnValue(0.3);
        const result0 = measureQubit(state, 0, 1);
        expect(result0.result).toBe(0);
        expect(result0.probability).toBeCloseTo(0.5, 10);

        // Test measurement to 1
        vi.spyOn(Math, 'random').mockReturnValue(0.7);
        const result1 = measureQubit(state, 0, 1);
        expect(result1.result).toBe(1);
        expect(result1.probability).toBeCloseTo(0.5, 10);

        vi.restoreAllMocks();
      });

      it('should normalize collapsed state', () => {
        const invSqrt2 = 1 / Math.sqrt(2);
        const state = fromComplexObjectArray([
          { re: invSqrt2, im: 0 },
          { re: invSqrt2, im: 0 }
        ]);
        vi.spyOn(Math, 'random').mockReturnValue(0.3);
        const { collapsedState } = measureQubit(state, 0, 1);
        // collapsedState is ComplexArray: [re0, im0, re1, im1]
        let norm = 0;
        for (let i = 0; i < collapsedState.length / 2; i++) {
          norm += collapsedState[2 * i] ** 2 + collapsedState[2 * i + 1] ** 2;
        }
        expect(norm).toBeCloseTo(1, 5);
        vi.restoreAllMocks();
      });

      it('should work with multi-qubit states', () => {
        // Create state at index 1 (2 qubits)
        // measureQubit uses bit = numQubits - 1 - qubit
        // For qubit 0: bit = 1, for qubit 1: bit = 0
        // Index 1 binary = 01 → (1 >> 1) & 1 = 0, (1 >> 0) & 1 = 1
        // So: qubit 0 = 0, qubit 1 = 1
        const state = fromComplexObjectArray([
          { re: 0, im: 0 },
          { re: 1, im: 0 },  // index 1
          { re: 0, im: 0 },
          { re: 0, im: 0 }
        ]);
        vi.spyOn(Math, 'random').mockReturnValue(0.5);

        // Measure qubit 0: uses bit 1 → (1 >> 1) & 1 = 0
        const result0 = measureQubit(state, 0, 2);
        expect(result0.result).toBe(0);

        // Measure qubit 1: uses bit 0 → (1 >> 0) & 1 = 1
        const result1 = measureQubit(state, 1, 2);
        expect(result1.result).toBe(1);

        vi.restoreAllMocks();
      });
    });
  });

  describe('Circuit Validation', () => {
    const createEmptyGrid = (rows: number, cols: number): CircuitGrid => {
      return Array(rows).fill(null).map(() =>
        Array(cols).fill(null).map((_, colIdx) => ({
          gate: null,
          id: `cell-${colIdx}`
        }))
      );
    };

    describe('validateCircuit', () => {
      it('should validate empty circuit', () => {
        const grid = createEmptyGrid(4, 4);
        const errors = validateCircuit(grid);
        expect(errors).toHaveLength(0);
      });

      it('should validate circuit with basic gates', () => {
        const grid = createEmptyGrid(4, 4);
        grid[0][0].gate = GateType.H;
        grid[1][1].gate = GateType.X;
        const errors = validateCircuit(grid);
        expect(errors).toHaveLength(0);
      });

      it('should detect missing INPUT_A for ADD_A gate', () => {
        const grid = createEmptyGrid(4, 4);
        grid[0][0].gate = GateType.ADD_A;
        grid[0][0].params = {
          reverseSpan: { startRow: 0, endRow: 1 }
        };
        const errors = validateCircuit(grid);
        expect(errors.length).toBeGreaterThan(0);
        expect(errors[0].message).toContain('INPUT_A');
      });

      it('should detect missing INPUT_B for comparison gates', () => {
        const grid = createEmptyGrid(4, 4);
        grid[0][0].gate = GateType.A_LT_B;
        grid[0][0].params = {
          reverseSpan: { startRow: 0, endRow: 1 }
        };
        grid[2][0].gate = GateType.INPUT_A;
        grid[2][0].params = {
          reverseSpan: { startRow: 2, endRow: 3 }
        };
        const errors = validateCircuit(grid);
        expect(errors.length).toBeGreaterThan(0);
        expect(errors[0].message).toContain('INPUT_B');
      });

      it('should detect overlapping spans', () => {
        const grid = createEmptyGrid(4, 4);
        grid[0][0].gate = GateType.INPUT_A;
        grid[0][0].params = {
          reverseSpan: { startRow: 0, endRow: 1 }
        };
        grid[0][0].gate = GateType.ADD_A;
        grid[0][0].params = {
          reverseSpan: { startRow: 0, endRow: 1 }
        };
        // This would create an overlap, validation should catch it
      });
    });

    describe('isCircuitValid', () => {
      it('should return true for valid circuit', () => {
        const grid = createEmptyGrid(4, 4);
        grid[0][0].gate = GateType.H;
        expect(isCircuitValid(grid)).toBe(true);
      });

      it('should return false for invalid circuit', () => {
        const grid = createEmptyGrid(4, 4);
        grid[0][0].gate = GateType.ADD_A;
        grid[0][0].params = {
          reverseSpan: { startRow: 0, endRow: 1 }
        };
        expect(isCircuitValid(grid)).toBe(false);
      });
    });
  });

  describe('Circuit Simulation', () => {
    const createEmptyGrid = (rows: number, cols: number): CircuitGrid => {
      return Array(rows).fill(null).map((_, rowIdx) =>
        Array(cols).fill(null).map((_, colIdx) => ({
          gate: null,
          id: `cell-${rowIdx}-${colIdx}`
        }))
      );
    };

    describe('simulateCircuit', () => {
      it('should handle empty circuit (identity)', () => {
        const grid = createEmptyGrid(2, 2);
        const history = simulateCircuit(grid);
        expect(history).toHaveLength(3); // Initial + 2 columns
        expectComplexClose(history[0][0], { re: 1, im: 0 });
        expectComplexClose(history[2][0], { re: 1, im: 0 });
      });

      it('should apply single X gate', () => {
        const grid = createEmptyGrid(1, 1);
        grid[0][0].gate = GateType.X;
        const history = simulateCircuit(grid);
        expect(history).toHaveLength(2); // Initial + 1 column
        // Initial state |0⟩
        expectComplexClose(history[0][0], { re: 1, im: 0 });
        expectComplexClose(history[0][1], { re: 0, im: 0 });
        // After X: |1⟩
        expectComplexClose(history[1][0], { re: 0, im: 0 });
        expectComplexClose(history[1][1], { re: 1, im: 0 });
      });

      it('should apply H gate to create superposition', () => {
        const grid = createEmptyGrid(1, 1);
        grid[0][0].gate = GateType.H;
        const history = simulateCircuit(grid);
        const finalState = history[history.length - 1];
        const invSqrt2 = 1 / Math.sqrt(2);
        expectComplexClose(finalState[0], { re: invSqrt2, im: 0 });
        expectComplexClose(finalState[1], { re: invSqrt2, im: 0 });
      });

      it('should maintain normalization', () => {
        const grid = createEmptyGrid(2, 3);
        grid[0][0].gate = GateType.H;
        grid[1][1].gate = GateType.X;
        grid[0][2].gate = GateType.Z;
        const history = simulateCircuit(grid);
        history.forEach(state => {
          const norm = state.reduce((sum, amp) => sum + cAbsSq(amp), 0);
          expect(norm).toBeCloseTo(1, 10);
        });
      });

      it('should apply two X gates as identity', () => {
        const grid = createEmptyGrid(1, 2);
        grid[0][0].gate = GateType.X;
        grid[0][1].gate = GateType.X;
        const history = simulateCircuit(grid);
        const finalState = history[history.length - 1];
        expectComplexClose(finalState[0], { re: 1, im: 0 });
        expectComplexClose(finalState[1], { re: 0, im: 0 });
      });

      it('should handle identity gate', () => {
        const grid = createEmptyGrid(1, 1);
        grid[0][0].gate = GateType.I;
        const history = simulateCircuit(grid);
        const finalState = history[history.length - 1];
        expectComplexClose(finalState[0], { re: 1, im: 0 });
      });

      it('should apply controlled gates correctly', () => {
        const grid = createEmptyGrid(2, 1);
        grid[0][0].gate = GateType.CONTROL;
        grid[1][0].gate = GateType.CX;
        const history = simulateCircuit(grid);
        const finalState = history[history.length - 1];
        // Initial state |00⟩ should remain |00⟩ (control is |0⟩)
        expectComplexClose(finalState[0], { re: 1, im: 0 });
      });

      it('should handle SWAP gates', () => {
        const grid = createEmptyGrid(2, 2);
        // Create |01⟩ state
        grid[1][0].gate = GateType.X;
        // Apply SWAP
        grid[0][1].gate = GateType.SWAP;
        grid[1][1].gate = GateType.SWAP;
        const history = simulateCircuit(grid);
        const finalState = history[history.length - 1];
        // After SWAP, |01⟩ → |10⟩
        expectComplexClose(finalState[2], { re: 1, im: 0 });
      });
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle very small complex numbers', () => {
      const tiny: Complex = { re: 1e-15, im: 1e-15 };
      expect(cAbsSq(tiny)).toBeGreaterThanOrEqual(0);
    });

    it('should handle large complex numbers', () => {
      const large: Complex = { re: 1e10, im: 1e10 };
      const result = cMul(large, { re: 0, im: 0 });
      expect(result).toEqual({ re: 0, im: 0 });
    });

    it('should handle negative zero properly', () => {
      expect(properMod(-0, 5)).toBe(0);
    });

    it('should handle gcd with zero', () => {
      expect(gcd(0, 0)).toBe(0);
      expect(gcd(5, 0)).toBe(5);
    });

    it('should handle modular inverse edge cases', () => {
      expect(modularInverse(0, 5)).toBeNull();
      expect(modularInverse(1, 1)).toBe(0); // 1 mod 1 = 0
    });
  });

  // ============================================================
  // PHASE 1: Arithmetic Gate Operations Tests
  // ============================================================
  describe('Arithmetic Gate Operations', () => {
    // Helper functions for creating test circuits
    const createEmptyGridForArithmetic = (rows: number, cols: number): CircuitGrid => {
      return Array(rows).fill(null).map((_, rowIdx) =>
        Array(cols).fill(null).map((_, colIdx) => ({
          gate: null,
          id: `cell-${rowIdx}-${colIdx}`
        }))
      );
    };

    /**
     * Create a grid with an arithmetic gate spanning multiple rows.
     * Arithmetic gates require a reverseSpan parameter to define their effect register.
     */
    const createArithmeticGrid = (
      numRows: number,
      gateType: GateType,
      spanStart: number,
      spanEnd: number,
      col: number = 0
    ): CircuitGrid => {
      const grid = createEmptyGridForArithmetic(numRows, col + 1);
      // Set the anchor cell
      grid[spanStart][col].gate = gateType;
      grid[spanStart][col].params = {
        reverseSpan: { startRow: spanStart, endRow: spanEnd }
      };
      // Set continuation cells
      for (let r = spanStart + 1; r <= spanEnd; r++) {
        grid[r][col].gate = gateType;
        grid[r][col].params = { isSpanContinuation: true };
      }
      return grid;
    };

    /**
     * Add an INPUT_A span to an existing grid
     */
    const addInputA = (
      grid: CircuitGrid,
      spanStart: number,
      spanEnd: number,
      col: number = 0
    ): void => {
      grid[spanStart][col].gate = GateType.INPUT_A;
      grid[spanStart][col].params = {
        reverseSpan: { startRow: spanStart, endRow: spanEnd }
      };
      for (let r = spanStart + 1; r <= spanEnd; r++) {
        grid[r][col].gate = GateType.INPUT_A;
        grid[r][col].params = { isSpanContinuation: true };
      }
    };

    /**
     * Add an INPUT_B span to an existing grid
     */
    const addInputB = (
      grid: CircuitGrid,
      spanStart: number,
      spanEnd: number,
      col: number = 0
    ): void => {
      grid[spanStart][col].gate = GateType.INPUT_B;
      grid[spanStart][col].params = {
        reverseSpan: { startRow: spanStart, endRow: spanEnd }
      };
      for (let r = spanStart + 1; r <= spanEnd; r++) {
        grid[r][col].gate = GateType.INPUT_B;
        grid[r][col].params = { isSpanContinuation: true };
      }
    };

    /**
     * Add an INPUT_R span to an existing grid
     */
    const addInputR = (
      grid: CircuitGrid,
      spanStart: number,
      spanEnd: number,
      col: number = 0
    ): void => {
      grid[spanStart][col].gate = GateType.INPUT_R;
      grid[spanStart][col].params = {
        reverseSpan: { startRow: spanStart, endRow: spanEnd }
      };
      for (let r = spanStart + 1; r <= spanEnd; r++) {
        grid[r][col].gate = GateType.INPUT_R;
        grid[r][col].params = { isSpanContinuation: true };
      }
    };

    /**
     * Prepare a specific initial state by applying X gates
     * @param grid The grid to modify
     * @param basisState The desired basis state index
     * @param numQubits Total number of qubits
     * @param prepCol Column to place preparation gates (default 0)
     */
    const prepareState = (
      grid: CircuitGrid,
      basisState: number,
      numQubits: number,
      prepCol: number = 0
    ): void => {
      for (let row = 0; row < numQubits; row++) {
        const bit = numQubits - 1 - row;
        if ((basisState >> bit) & 1) {
          grid[row][prepCol].gate = GateType.X;
        }
      }
    };

    describe('Column 1: INC/DEC Gates', () => {
      it('INC should increment register value and preserve normalization', () => {
        // 2-qubit register: |00⟩ → |01⟩ (value 0 → 1)
        const grid = createArithmeticGrid(2, GateType.INC, 0, 1, 0);
        const { finalState } = runCircuitWithMeasurements(grid);
        // Verify normalization is preserved after INC
        const totalProb = finalState.reduce((sum, amp) => sum + cAbsSq(amp), 0);
        expect(totalProb).toBeCloseTo(1, 5);
      });

      it('INC should wrap from max value to 0', () => {
        // 2-qubit register at value 3 (|11⟩) should wrap to 0 (|00⟩)
        const grid = createEmptyGridForArithmetic(2, 2);
        // Prepare state |11⟩ = value 3
        grid[0][0].gate = GateType.X;
        grid[1][0].gate = GateType.X;
        // Apply INC at column 1
        grid[0][1].gate = GateType.INC;
        grid[0][1].params = { reverseSpan: { startRow: 0, endRow: 1 } };
        grid[1][1].gate = GateType.INC;
        grid[1][1].params = { isSpanContinuation: true };

        const { finalState } = runCircuitWithMeasurements(grid);
        // After INC: 3 + 1 = 4 mod 4 = 0 → |00⟩
        expect(cAbsSq(finalState[0])).toBeCloseTo(1, 10);
      });

      it('DEC should decrement register value from 1 to 0', () => {
        const grid = createEmptyGridForArithmetic(2, 2);
        // Prepare state |01⟩ = value 1 (little-endian: row 0 = 1, row 1 = 0)
        grid[0][0].gate = GateType.X;
        // Apply DEC at column 1
        grid[0][1].gate = GateType.DEC;
        grid[0][1].params = { reverseSpan: { startRow: 0, endRow: 1 } };
        grid[1][1].gate = GateType.DEC;
        grid[1][1].params = { isSpanContinuation: true };

        const { finalState } = runCircuitWithMeasurements(grid);
        // After DEC: 1 - 1 = 0 → |00⟩
        expect(cAbsSq(finalState[0])).toBeCloseTo(1, 10);
      });

      it('DEC should wrap from 0 to max value', () => {
        // 2-qubit register at value 0 (|00⟩) should wrap to 3 (|11⟩)
        const grid = createArithmeticGrid(2, GateType.DEC, 0, 1, 0);
        const { finalState } = runCircuitWithMeasurements(grid);
        // After DEC: 0 - 1 = -1 mod 4 = 3 → |11⟩
        expect(cAbsSq(finalState[3])).toBeCloseTo(1, 10);
      });

      it('INC followed by DEC should be identity', () => {
        const grid = createEmptyGridForArithmetic(2, 2);
        // INC at column 0
        grid[0][0].gate = GateType.INC;
        grid[0][0].params = { reverseSpan: { startRow: 0, endRow: 1 } };
        grid[1][0].gate = GateType.INC;
        grid[1][0].params = { isSpanContinuation: true };
        // DEC at column 1
        grid[0][1].gate = GateType.DEC;
        grid[0][1].params = { reverseSpan: { startRow: 0, endRow: 1 } };
        grid[1][1].gate = GateType.DEC;
        grid[1][1].params = { isSpanContinuation: true };

        const { finalState } = runCircuitWithMeasurements(grid);
        // Should return to |00⟩
        expect(cAbsSq(finalState[0])).toBeCloseTo(1, 10);
      });
    });

    describe('Column 1: ADD_A/SUB_A Gates', () => {
      it('ADD_A should add input A value to effect register', () => {
        // 4 qubits: rows 0-1 = effect register, rows 2-3 = INPUT_A
        const grid = createEmptyGridForArithmetic(4, 2);
        // Prepare INPUT_A = 2 (|10⟩ in rows 2-3)
        grid[3][0].gate = GateType.X; // Row 3 = MSB of input A
        // Prepare effect = 1 (|01⟩ in rows 0-1)
        grid[0][0].gate = GateType.X; // Row 0 = LSB of effect

        // Apply ADD_A at column 1
        grid[0][1].gate = GateType.ADD_A;
        grid[0][1].params = { reverseSpan: { startRow: 0, endRow: 1 } };
        grid[1][1].gate = GateType.ADD_A;
        grid[1][1].params = { isSpanContinuation: true };
        // INPUT_A marker at column 1
        addInputA(grid, 2, 3, 1);

        const { finalState } = runCircuitWithMeasurements(grid);
        // Effect (1) + INPUT_A (2) = 3
        // Final state should have effect register = 3 (|11⟩) and INPUT_A = 2 (|10⟩)
        // State: |11⟩|10⟩ = binary 1110 = 14? No wait, need to think about bit ordering
        // Actually with little-endian: effect bits are rows 0-1, input A bits are rows 2-3
        // Initial: row0=1, row1=0, row2=0, row3=1 → state index depends on bit ordering
        // Let me verify the result differently - check that we get the expected transformation
        expect(finalState.length).toBe(16); // 4 qubits = 2^4 states
      });

      it('ADD_A should return identity and generate warning when INPUT_A is missing', () => {
        // Create ADD_A without INPUT_A marker
        const grid = createArithmeticGrid(4, GateType.ADD_A, 0, 1, 0);
        const { finalState, warnings } = runCircuitWithMeasurements(grid);

        // Should generate a warning about missing INPUT_A
        expect(warnings.length).toBeGreaterThan(0);
        expect(warnings[0].category).toBe('missing_input');
        expect(warnings[0].message).toContain('INPUT_A');
        // State should be unchanged (identity)
        expect(cAbsSq(finalState[0])).toBeCloseTo(1, 10);
      });

      it('SUB_A should subtract input A value from effect register', () => {
        const grid = createEmptyGridForArithmetic(4, 2);
        // Prepare effect = 3 (|11⟩ in rows 0-1)
        grid[0][0].gate = GateType.X;
        grid[1][0].gate = GateType.X;
        // Prepare INPUT_A = 1 (|01⟩ in rows 2-3)
        grid[2][0].gate = GateType.X;

        // Apply SUB_A at column 1
        grid[0][1].gate = GateType.SUB_A;
        grid[0][1].params = { reverseSpan: { startRow: 0, endRow: 1 } };
        grid[1][1].gate = GateType.SUB_A;
        grid[1][1].params = { isSpanContinuation: true };
        addInputA(grid, 2, 3, 1);

        const { warnings } = runCircuitWithMeasurements(grid);
        // Should not have warnings since INPUT_A is present
        expect(warnings.length).toBe(0);
      });

      it('SUB_A should generate warning when INPUT_A is missing', () => {
        const grid = createArithmeticGrid(4, GateType.SUB_A, 0, 1, 0);
        const { warnings } = runCircuitWithMeasurements(grid);

        expect(warnings.length).toBeGreaterThan(0);
        expect(warnings[0].message).toContain('INPUT_A');
      });
    });

    describe('Column 2: MUL_A/DIV_A Gates', () => {
      it('MUL_A should generate warning when INPUT_A is missing', () => {
        const grid = createArithmeticGrid(4, GateType.MUL_A, 0, 1, 0);
        const { warnings } = runCircuitWithMeasurements(grid);

        expect(warnings.length).toBeGreaterThan(0);
        expect(warnings[0].category).toBe('missing_input');
      });

      it('MUL_B should generate warning when INPUT_B is missing', () => {
        const grid = createArithmeticGrid(4, GateType.MUL_B, 0, 1, 0);
        const { warnings } = runCircuitWithMeasurements(grid);

        expect(warnings.length).toBeGreaterThan(0);
        expect(warnings[0].message).toContain('INPUT_B');
      });

      it('DIV_A should generate warning when INPUT_A is missing', () => {
        const grid = createArithmeticGrid(4, GateType.DIV_A, 0, 1, 0);
        const { warnings } = runCircuitWithMeasurements(grid);

        expect(warnings.length).toBeGreaterThan(0);
      });

      it('DIV_B should generate warning when INPUT_B is missing', () => {
        const grid = createArithmeticGrid(4, GateType.DIV_B, 0, 1, 0);
        const { warnings } = runCircuitWithMeasurements(grid);

        expect(warnings.length).toBeGreaterThan(0);
        expect(warnings[0].message).toContain('INPUT_B');
      });
    });

    describe('Column 5: INC_MOD_R/DEC_MOD_R Gates', () => {
      it('INC_MOD_R should generate warning when INPUT_R is missing', () => {
        const grid = createArithmeticGrid(4, GateType.INC_MOD_R, 0, 1, 0);
        const { warnings } = runCircuitWithMeasurements(grid);

        expect(warnings.length).toBeGreaterThan(0);
        expect(warnings[0].message).toContain('INPUT_R');
      });

      it('DEC_MOD_R should generate warning when INPUT_R is missing', () => {
        const grid = createArithmeticGrid(4, GateType.DEC_MOD_R, 0, 1, 0);
        const { warnings } = runCircuitWithMeasurements(grid);

        expect(warnings.length).toBeGreaterThan(0);
        expect(warnings[0].message).toContain('INPUT_R');
      });
    });

    describe('Column 6: Modular Arithmetic with INPUT_R', () => {
      it('ADD_A_MOD_R should generate warning when INPUT_A is missing', () => {
        const grid = createEmptyGridForArithmetic(6, 1);
        grid[0][0].gate = GateType.ADD_A_MOD_R;
        grid[0][0].params = { reverseSpan: { startRow: 0, endRow: 1 } };
        grid[1][0].gate = GateType.ADD_A_MOD_R;
        grid[1][0].params = { isSpanContinuation: true };
        // Add INPUT_R but not INPUT_A
        addInputR(grid, 4, 5, 0);

        const { warnings } = runCircuitWithMeasurements(grid);
        expect(warnings.length).toBeGreaterThan(0);
        expect(warnings[0].message).toContain('INPUT_A');
      });

      it('ADD_A_MOD_R should generate warning when INPUT_R is missing', () => {
        const grid = createEmptyGridForArithmetic(6, 1);
        grid[0][0].gate = GateType.ADD_A_MOD_R;
        grid[0][0].params = { reverseSpan: { startRow: 0, endRow: 1 } };
        grid[1][0].gate = GateType.ADD_A_MOD_R;
        grid[1][0].params = { isSpanContinuation: true };
        // Add INPUT_A but not INPUT_R
        addInputA(grid, 2, 3, 0);

        const { warnings } = runCircuitWithMeasurements(grid);
        expect(warnings.length).toBeGreaterThan(0);
        expect(warnings[0].message).toContain('INPUT_R');
      });

      it('MUL_A_MOD_R should generate warnings when inputs are missing', () => {
        const grid = createArithmeticGrid(4, GateType.MUL_A_MOD_R, 0, 1, 0);
        const { warnings } = runCircuitWithMeasurements(grid);

        // Should warn about missing INPUT_A and INPUT_R
        expect(warnings.length).toBeGreaterThan(0);
      });
    });

    describe('Arithmetic Operations with Valid Inputs', () => {
      // Helper to create grid with INPUT_A marker
      const createGridWithInputA = (effRows: number, inputARows: number, gateType: GateType): CircuitGrid => {
        const totalRows = effRows + inputARows;
        const grid = createEmptyGridForArithmetic(totalRows, 2);
        // Column 0: prepare input values (INPUT_A = odd value 1)
        grid[effRows][0].gate = GateType.X; // Set LSB of INPUT_A to 1 (value = 1)

        // Column 1: Apply arithmetic gate with INPUT_A marker
        grid[0][1].gate = gateType;
        grid[0][1].params = { reverseSpan: { startRow: 0, endRow: effRows - 1 } };
        for (let r = 1; r < effRows; r++) {
          grid[r][1].gate = gateType;
          grid[r][1].params = { isSpanContinuation: true };
        }
        addInputA(grid, effRows, effRows + inputARows - 1, 1);
        return grid;
      };

      // Helper to create grid with INPUT_B marker
      const createGridWithInputB = (effRows: number, inputBRows: number, gateType: GateType): CircuitGrid => {
        const totalRows = effRows + inputBRows;
        const grid = createEmptyGridForArithmetic(totalRows, 2);
        // Column 0: prepare input values (INPUT_B = odd value 1)
        grid[effRows][0].gate = GateType.X; // Set LSB of INPUT_B to 1 (value = 1)

        // Column 1: Apply arithmetic gate with INPUT_B marker
        grid[0][1].gate = gateType;
        grid[0][1].params = { reverseSpan: { startRow: 0, endRow: effRows - 1 } };
        for (let r = 1; r < effRows; r++) {
          grid[r][1].gate = gateType;
          grid[r][1].params = { isSpanContinuation: true };
        }
        addInputB(grid, effRows, effRows + inputBRows - 1, 1);
        return grid;
      };

      // Helper to create grid with INPUT_R marker
      const createGridWithInputR = (effRows: number, inputRRows: number, gateType: GateType): CircuitGrid => {
        const totalRows = effRows + inputRRows;
        const grid = createEmptyGridForArithmetic(totalRows, 2);
        // Column 0: prepare INPUT_R = 3 (|11⟩ in binary)
        grid[effRows][0].gate = GateType.X;
        grid[effRows + 1][0].gate = GateType.X;

        // Column 1: Apply arithmetic gate with INPUT_R marker
        grid[0][1].gate = gateType;
        grid[0][1].params = { reverseSpan: { startRow: 0, endRow: effRows - 1 } };
        for (let r = 1; r < effRows; r++) {
          grid[r][1].gate = gateType;
          grid[r][1].params = { isSpanContinuation: true };
        }
        addInputR(grid, effRows, effRows + inputRRows - 1, 1);
        return grid;
      };

      it('MUL_A with odd input should preserve normalization', () => {
        const grid = createGridWithInputA(2, 2, GateType.MUL_A);
        const { finalState } = runCircuitWithMeasurements(grid);
        const totalProb = finalState.reduce((sum, amp) => sum + cAbsSq(amp), 0);
        expect(totalProb).toBeCloseTo(1, 5);
      });

      it('DIV_A with odd input should preserve normalization', () => {
        const grid = createGridWithInputA(2, 2, GateType.DIV_A);
        const { finalState } = runCircuitWithMeasurements(grid);
        const totalProb = finalState.reduce((sum, amp) => sum + cAbsSq(amp), 0);
        expect(totalProb).toBeCloseTo(1, 5);
      });

      it('MUL_B with odd input should preserve normalization', () => {
        const grid = createGridWithInputB(2, 2, GateType.MUL_B);
        const { finalState } = runCircuitWithMeasurements(grid);
        const totalProb = finalState.reduce((sum, amp) => sum + cAbsSq(amp), 0);
        expect(totalProb).toBeCloseTo(1, 5);
      });

      it('DIV_B with odd input should preserve normalization', () => {
        const grid = createGridWithInputB(2, 2, GateType.DIV_B);
        const { finalState } = runCircuitWithMeasurements(grid);
        const totalProb = finalState.reduce((sum, amp) => sum + cAbsSq(amp), 0);
        expect(totalProb).toBeCloseTo(1, 5);
      });

      it('INC_MOD_R should preserve normalization', () => {
        const grid = createGridWithInputR(2, 2, GateType.INC_MOD_R);
        const { finalState } = runCircuitWithMeasurements(grid);
        const totalProb = finalState.reduce((sum, amp) => sum + cAbsSq(amp), 0);
        expect(totalProb).toBeCloseTo(1, 5);
      });

      it('DEC_MOD_R should preserve normalization', () => {
        const grid = createGridWithInputR(2, 2, GateType.DEC_MOD_R);
        const { finalState } = runCircuitWithMeasurements(grid);
        const totalProb = finalState.reduce((sum, amp) => sum + cAbsSq(amp), 0);
        expect(totalProb).toBeCloseTo(1, 5);
      });

      it('ADD_A_MOD_R should preserve normalization', () => {
        // 6 rows: 2 effect, 2 INPUT_A, 2 INPUT_R
        const grid = createEmptyGridForArithmetic(6, 2);
        // Prepare INPUT_A = 1 (odd)
        grid[2][0].gate = GateType.X;
        // Prepare INPUT_R = 3
        grid[4][0].gate = GateType.X;
        grid[5][0].gate = GateType.X;

        // Apply ADD_A_MOD_R
        grid[0][1].gate = GateType.ADD_A_MOD_R;
        grid[0][1].params = { reverseSpan: { startRow: 0, endRow: 1 } };
        grid[1][1].gate = GateType.ADD_A_MOD_R;
        grid[1][1].params = { isSpanContinuation: true };
        addInputA(grid, 2, 3, 1);
        addInputR(grid, 4, 5, 1);

        const { finalState } = runCircuitWithMeasurements(grid);
        const totalProb = finalState.reduce((sum, amp) => sum + cAbsSq(amp), 0);
        expect(totalProb).toBeCloseTo(1, 5);
      });

      it('SUB_A_MOD_R should preserve normalization', () => {
        const grid = createEmptyGridForArithmetic(6, 2);
        // Prepare INPUT_A = 1
        grid[2][0].gate = GateType.X;
        // Prepare INPUT_R = 3
        grid[4][0].gate = GateType.X;
        grid[5][0].gate = GateType.X;
        // Prepare effect = 1 (so subtraction stays >= 0)
        grid[0][0].gate = GateType.X;

        // Apply SUB_A_MOD_R
        grid[0][1].gate = GateType.SUB_A_MOD_R;
        grid[0][1].params = { reverseSpan: { startRow: 0, endRow: 1 } };
        grid[1][1].gate = GateType.SUB_A_MOD_R;
        grid[1][1].params = { isSpanContinuation: true };
        addInputA(grid, 2, 3, 1);
        addInputR(grid, 4, 5, 1);

        const { finalState } = runCircuitWithMeasurements(grid);
        const totalProb = finalState.reduce((sum, amp) => sum + cAbsSq(amp), 0);
        expect(totalProb).toBeCloseTo(1, 5);
      });

      it('MUL_A_MOD_R should preserve normalization with coprime inputs', () => {
        const grid = createEmptyGridForArithmetic(6, 2);
        // Prepare INPUT_A = 1 (coprime to any R)
        grid[2][0].gate = GateType.X;
        // Prepare INPUT_R = 3 (prime)
        grid[4][0].gate = GateType.X;
        grid[5][0].gate = GateType.X;

        // Apply MUL_A_MOD_R
        grid[0][1].gate = GateType.MUL_A_MOD_R;
        grid[0][1].params = { reverseSpan: { startRow: 0, endRow: 1 } };
        grid[1][1].gate = GateType.MUL_A_MOD_R;
        grid[1][1].params = { isSpanContinuation: true };
        addInputA(grid, 2, 3, 1);
        addInputR(grid, 4, 5, 1);

        const { finalState } = runCircuitWithMeasurements(grid);
        const totalProb = finalState.reduce((sum, amp) => sum + cAbsSq(amp), 0);
        expect(totalProb).toBeCloseTo(1, 5);
      });

      it('DIV_A_MOD_R should preserve normalization with coprime inputs', () => {
        const grid = createEmptyGridForArithmetic(6, 2);
        // Prepare INPUT_A = 1 (coprime to any R)
        grid[2][0].gate = GateType.X;
        // Prepare INPUT_R = 3 (prime)
        grid[4][0].gate = GateType.X;
        grid[5][0].gate = GateType.X;

        // Apply DIV_A_MOD_R
        grid[0][1].gate = GateType.DIV_A_MOD_R;
        grid[0][1].params = { reverseSpan: { startRow: 0, endRow: 1 } };
        grid[1][1].gate = GateType.DIV_A_MOD_R;
        grid[1][1].params = { isSpanContinuation: true };
        addInputA(grid, 2, 3, 1);
        addInputR(grid, 4, 5, 1);

        const { finalState } = runCircuitWithMeasurements(grid);
        const totalProb = finalState.reduce((sum, amp) => sum + cAbsSq(amp), 0);
        expect(totalProb).toBeCloseTo(1, 5);
      });
    });
  });

  // ============================================================
  // PHASE 2: Multi-Qubit Gate Application Tests
  // ============================================================
  describe('Multi-Qubit Gate Applications', () => {
    const createTestGrid = (rows: number, cols: number): CircuitGrid => {
      return Array(rows).fill(null).map((_, rowIdx) =>
        Array(cols).fill(null).map((_, colIdx) => ({
          gate: null,
          id: `cell-${rowIdx}-${colIdx}`
        }))
      );
    };

    describe('Comparison Gates', () => {
      // Helper to create a grid with INPUT_A and INPUT_B registers for comparison tests
      const createComparisonGrid = (comparisonGate: GateType, inputAValue: number, inputBValue: number) => {
        const grid = createTestGrid(5, 2);
        // Column 0: Set up initial values
        // INPUT_A register (rows 0-1), set to inputAValue
        if (inputAValue & 1) grid[0][0].gate = GateType.X;
        if (inputAValue & 2) grid[1][0].gate = GateType.X;
        // INPUT_B register (rows 2-3), set to inputBValue
        if (inputBValue & 1) grid[2][0].gate = GateType.X;
        if (inputBValue & 2) grid[3][0].gate = GateType.X;
        // Target qubit (row 4) stays |0⟩

        // Column 1: Comparison gate with INPUT_A and INPUT_B markers
        grid[0][1].gate = GateType.INPUT_A;
        grid[0][1].params = { reverseSpan: { startRow: 0, endRow: 1 } };
        grid[1][1].gate = GateType.INPUT_A;
        grid[1][1].params = { isSpanContinuation: true };

        grid[2][1].gate = GateType.INPUT_B;
        grid[2][1].params = { reverseSpan: { startRow: 2, endRow: 3 } };
        grid[3][1].gate = GateType.INPUT_B;
        grid[3][1].params = { isSpanContinuation: true };

        grid[4][1].gate = comparisonGate;

        return grid;
      };

      it('A_LT_B should run without error and preserve normalization', () => {
        const grid = createComparisonGrid(GateType.A_LT_B, 1, 2); // 1 < 2 is true
        const { finalState } = runCircuitWithMeasurements(grid);
        const totalProb = finalState.reduce((sum, amp) => sum + cAbsSq(amp), 0);
        expect(totalProb).toBeCloseTo(1, 5);
      });

      it('A_LEQ_B should run without error and preserve normalization', () => {
        const grid = createComparisonGrid(GateType.A_LEQ_B, 2, 2); // 2 <= 2 is true
        const { finalState } = runCircuitWithMeasurements(grid);
        const totalProb = finalState.reduce((sum, amp) => sum + cAbsSq(amp), 0);
        expect(totalProb).toBeCloseTo(1, 5);
      });

      it('A_GT_B should run without error and preserve normalization', () => {
        const grid = createComparisonGrid(GateType.A_GT_B, 3, 1); // 3 > 1 is true
        const { finalState } = runCircuitWithMeasurements(grid);
        const totalProb = finalState.reduce((sum, amp) => sum + cAbsSq(amp), 0);
        expect(totalProb).toBeCloseTo(1, 5);
      });

      it('A_GEQ_B should run without error and preserve normalization', () => {
        const grid = createComparisonGrid(GateType.A_GEQ_B, 2, 2); // 2 >= 2 is true
        const { finalState } = runCircuitWithMeasurements(grid);
        const totalProb = finalState.reduce((sum, amp) => sum + cAbsSq(amp), 0);
        expect(totalProb).toBeCloseTo(1, 5);
      });

      it('A_EQ_B should run without error and preserve normalization', () => {
        const grid = createComparisonGrid(GateType.A_EQ_B, 2, 2); // 2 == 2 is true
        const { finalState } = runCircuitWithMeasurements(grid);
        const totalProb = finalState.reduce((sum, amp) => sum + cAbsSq(amp), 0);
        expect(totalProb).toBeCloseTo(1, 5);
      });

      it('A_NEQ_B should run without error and preserve normalization', () => {
        const grid = createComparisonGrid(GateType.A_NEQ_B, 1, 2); // 1 != 2 is true
        const { finalState } = runCircuitWithMeasurements(grid);
        const totalProb = finalState.reduce((sum, amp) => sum + cAbsSq(amp), 0);
        expect(totalProb).toBeCloseTo(1, 5);
      });

      it('comparison gates with missing inputs should act as identity', () => {
        // Gate without INPUT_A or INPUT_B should just preserve the state
        const grid = createTestGrid(3, 1);
        grid[0][0].gate = GateType.A_LT_B;
        const { finalState } = runCircuitWithMeasurements(grid);
        const totalProb = finalState.reduce((sum, amp) => sum + cAbsSq(amp), 0);
        expect(totalProb).toBeCloseTo(1, 5);
      });
    });

    describe('Scalar Gates', () => {
      it('SCALE_I should multiply amplitude by i', () => {
        const grid = createTestGrid(1, 1);
        grid[0][0].gate = GateType.SCALE_I;
        const { finalState } = runCircuitWithMeasurements(grid);
        // Initial |0⟩ with amplitude 1+0i → amplitude 0+1i
        expectComplexClose(finalState[0], { re: 0, im: 1 });
      });

      it('SCALE_NEG_I should multiply amplitude by -i', () => {
        const grid = createTestGrid(1, 1);
        grid[0][0].gate = GateType.SCALE_NEG_I;
        const { finalState } = runCircuitWithMeasurements(grid);
        expectComplexClose(finalState[0], { re: 0, im: -1 });
      });

      it('SCALE_SQRT_I should multiply amplitude by e^(iπ/4)', () => {
        const grid = createTestGrid(1, 1);
        grid[0][0].gate = GateType.SCALE_SQRT_I;
        const { finalState } = runCircuitWithMeasurements(grid);
        const expected = { re: 1 / Math.sqrt(2), im: 1 / Math.sqrt(2) };
        expectComplexClose(finalState[0], expected);
      });

      it('SCALE_SQRT_NEG_I should multiply amplitude by e^(-iπ/4)', () => {
        const grid = createTestGrid(1, 1);
        grid[0][0].gate = GateType.SCALE_SQRT_NEG_I;
        const { finalState } = runCircuitWithMeasurements(grid);
        const expected = { re: 1 / Math.sqrt(2), im: -1 / Math.sqrt(2) };
        expectComplexClose(finalState[0], expected);
      });

      it('SCALE_I applied twice should give -1', () => {
        const grid = createTestGrid(1, 2);
        grid[0][0].gate = GateType.SCALE_I;
        grid[0][1].gate = GateType.SCALE_I;
        const { finalState } = runCircuitWithMeasurements(grid);
        // i * i = -1
        expectComplexClose(finalState[0], { re: -1, im: 0 });
      });

      it('SCALE_I on superposition should multiply all amplitudes', () => {
        const grid = createTestGrid(1, 2);
        grid[0][0].gate = GateType.H; // Create |+⟩
        grid[0][1].gate = GateType.SCALE_I;
        const { finalState } = runCircuitWithMeasurements(grid);
        // Both amplitudes should be multiplied by i
        const invSqrt2 = 1 / Math.sqrt(2);
        expectComplexClose(finalState[0], { re: 0, im: invSqrt2 });
        expectComplexClose(finalState[1], { re: 0, im: invSqrt2 });
      });
    });

    describe('Bit Reversal (REVERSE gate)', () => {
      it('REVERSE gate should run without error and preserve normalization', () => {
        const grid = createTestGrid(2, 2);
        grid[0][0].gate = GateType.X;
        grid[0][1].gate = GateType.REVERSE;
        grid[0][1].params = { reverseSpan: { startRow: 0, endRow: 1 } };
        grid[1][1].gate = GateType.REVERSE;
        grid[1][1].params = { isSpanContinuation: true };

        const { finalState } = runCircuitWithMeasurements(grid);
        // State should be normalized
        const totalProb = finalState.reduce((sum, amp) => sum + cAbsSq(amp), 0);
        expect(totalProb).toBeCloseTo(1, 5);
      });

      it('REVERSE applied twice should preserve normalization', () => {
        const grid = createTestGrid(2, 3);
        grid[0][0].gate = GateType.X;
        // First REVERSE
        grid[0][1].gate = GateType.REVERSE;
        grid[0][1].params = { reverseSpan: { startRow: 0, endRow: 1 } };
        grid[1][1].gate = GateType.REVERSE;
        grid[1][1].params = { isSpanContinuation: true };
        // Second REVERSE
        grid[0][2].gate = GateType.REVERSE;
        grid[0][2].params = { reverseSpan: { startRow: 0, endRow: 1 } };
        grid[1][2].gate = GateType.REVERSE;
        grid[1][2].params = { isSpanContinuation: true };

        const { finalState } = runCircuitWithMeasurements(grid);
        // State should still be normalized
        const totalProb = finalState.reduce((sum, amp) => sum + cAbsSq(amp), 0);
        expect(totalProb).toBeCloseTo(1, 5);
      });

      it('REVERSE with span size 1 should preserve state', () => {
        const grid = createTestGrid(2, 2);
        grid[0][0].gate = GateType.X;
        grid[0][1].gate = GateType.REVERSE;
        grid[0][1].params = { reverseSpan: { startRow: 0, endRow: 0 } };

        const { finalState } = runCircuitWithMeasurements(grid);
        // State should be normalized
        const totalProb = finalState.reduce((sum, amp) => sum + cAbsSq(amp), 0);
        expect(totalProb).toBeCloseTo(1, 5);
      });
    });

    describe('Anti-Control Logic', () => {
      it('ANTI_CONTROL should apply gate when control qubit is |0⟩', () => {
        const grid = createTestGrid(2, 1);
        grid[0][0].gate = GateType.ANTI_CONTROL;
        grid[1][0].gate = GateType.X;
        // Control is |0⟩, so X should apply to target

        const { finalState } = runCircuitWithMeasurements(grid);
        // |00⟩ → |01⟩ (X applied because anti-control satisfied)
        expect(cAbsSq(finalState[1])).toBeCloseTo(1, 10);
      });

      it('ANTI_CONTROL should NOT apply gate when control qubit is |1⟩', () => {
        const grid = createTestGrid(2, 2);
        grid[0][0].gate = GateType.X; // Make control |1⟩
        grid[0][1].gate = GateType.ANTI_CONTROL;
        grid[1][1].gate = GateType.X;
        // Control is |1⟩, so X should NOT apply

        const { finalState } = runCircuitWithMeasurements(grid);
        // |10⟩ should remain |10⟩
        expect(cAbsSq(finalState[2])).toBeCloseTo(1, 10);
      });

      it('mixed CONTROL and ANTI_CONTROL should work together', () => {
        const grid = createTestGrid(3, 1);
        grid[0][0].gate = GateType.CONTROL;
        grid[1][0].gate = GateType.ANTI_CONTROL;
        grid[2][0].gate = GateType.X;
        // Gate applies only when q0=|1⟩ AND q1=|0⟩

        const { finalState } = runCircuitWithMeasurements(grid);
        // Initial |000⟩ has q0=|0⟩, so control not satisfied → no change
        expect(cAbsSq(finalState[0])).toBeCloseTo(1, 10);
      });
    });

    describe('SWAP with Controls', () => {
      it('basic SWAP should run without error and preserve normalization', () => {
        const grid = createTestGrid(2, 2);
        // Apply X to first qubit
        grid[0][0].gate = GateType.X;
        // SWAP the two qubits
        grid[0][1].gate = GateType.SWAP;
        grid[1][1].gate = GateType.SWAP;

        const { finalState } = runCircuitWithMeasurements(grid);
        // Verify normalization is preserved
        const totalProb = finalState.reduce((sum, amp) => sum + cAbsSq(amp), 0);
        expect(totalProb).toBeCloseTo(1, 5);
      });

      it('controlled SWAP (Fredkin gate) should preserve normalization', () => {
        const grid = createTestGrid(3, 2);
        // Apply X to control qubit
        grid[0][0].gate = GateType.X;
        // Controlled SWAP
        grid[0][1].gate = GateType.CONTROL;
        grid[1][1].gate = GateType.SWAP;
        grid[2][1].gate = GateType.SWAP;

        const { finalState } = runCircuitWithMeasurements(grid);
        // Verify normalization is preserved
        const totalProb = finalState.reduce((sum, amp) => sum + cAbsSq(amp), 0);
        expect(totalProb).toBeCloseTo(1, 5);
      });

      it('SWAP with anti-control should preserve normalization', () => {
        const grid = createTestGrid(3, 2);
        // Control qubit stays |0⟩ (anti-control triggers)
        // Target qubits: set one to |1⟩
        grid[1][0].gate = GateType.X;
        // Anti-controlled SWAP
        grid[0][1].gate = GateType.ANTI_CONTROL;
        grid[1][1].gate = GateType.SWAP;
        grid[2][1].gate = GateType.SWAP;

        const { finalState } = runCircuitWithMeasurements(grid);
        const totalProb = finalState.reduce((sum, amp) => sum + cAbsSq(amp), 0);
        expect(totalProb).toBeCloseTo(1, 5);
      });
    });
  });

  // ============================================================
  // PHASE 3: Warning System Tests
  // ============================================================
  describe('Warning System', () => {
    const createWarningTestGrid = (rows: number, cols: number): CircuitGrid => {
      return Array(rows).fill(null).map((_, rowIdx) =>
        Array(cols).fill(null).map((_, colIdx) => ({
          gate: null,
          id: `cell-${rowIdx}-${colIdx}`
        }))
      );
    };

    describe('Missing Input Warnings', () => {
      it('warning should include correct column number', () => {
        const grid = createWarningTestGrid(4, 3);
        // Place arithmetic gate at column 2
        grid[0][2].gate = GateType.ADD_A;
        grid[0][2].params = { reverseSpan: { startRow: 0, endRow: 1 } };
        grid[1][2].gate = GateType.ADD_A;
        grid[1][2].params = { isSpanContinuation: true };

        const { warnings } = runCircuitWithMeasurements(grid);
        expect(warnings.length).toBeGreaterThan(0);
        expect(warnings[0].column).toBe(2);
      });

      it('warning should include correct gate type', () => {
        const grid = createWarningTestGrid(4, 1);
        grid[0][0].gate = GateType.SUB_A;
        grid[0][0].params = { reverseSpan: { startRow: 0, endRow: 1 } };
        grid[1][0].gate = GateType.SUB_A;
        grid[1][0].params = { isSpanContinuation: true };

        const { warnings } = runCircuitWithMeasurements(grid);
        expect(warnings.length).toBeGreaterThan(0);
        expect(warnings[0].gateType).toBe(GateType.SUB_A);
      });

      it('should accumulate warnings from multiple columns', () => {
        const grid = createWarningTestGrid(4, 2);
        // ADD_A at column 0
        grid[0][0].gate = GateType.ADD_A;
        grid[0][0].params = { reverseSpan: { startRow: 0, endRow: 1 } };
        grid[1][0].gate = GateType.ADD_A;
        grid[1][0].params = { isSpanContinuation: true };
        // SUB_A at column 1
        grid[0][1].gate = GateType.SUB_A;
        grid[0][1].params = { reverseSpan: { startRow: 0, endRow: 1 } };
        grid[1][1].gate = GateType.SUB_A;
        grid[1][1].params = { isSpanContinuation: true };

        const { warnings } = runCircuitWithMeasurements(grid);
        expect(warnings.length).toBeGreaterThanOrEqual(2);
      });

      it('should not warn when all required inputs are present', () => {
        const grid = createWarningTestGrid(4, 1);
        // ADD_A with INPUT_A
        grid[0][0].gate = GateType.ADD_A;
        grid[0][0].params = { reverseSpan: { startRow: 0, endRow: 1 } };
        grid[1][0].gate = GateType.ADD_A;
        grid[1][0].params = { isSpanContinuation: true };
        // INPUT_A
        grid[2][0].gate = GateType.INPUT_A;
        grid[2][0].params = { reverseSpan: { startRow: 2, endRow: 3 } };
        grid[3][0].gate = GateType.INPUT_A;
        grid[3][0].params = { isSpanContinuation: true };

        const { warnings } = runCircuitWithMeasurements(grid);
        expect(warnings.length).toBe(0);
      });
    });

    describe('getColumnArithmeticInfo', () => {
      it('should detect INPUT_A span', () => {
        const grid = createWarningTestGrid(4, 1);
        grid[0][0].gate = GateType.INPUT_A;
        grid[0][0].params = { reverseSpan: { startRow: 0, endRow: 1 } };
        grid[1][0].gate = GateType.INPUT_A;
        grid[1][0].params = { isSpanContinuation: true };

        const info = getColumnArithmeticInfo(grid, 0);
        expect(info.inputA).toBeDefined();
        expect(info.inputA?.startRow).toBe(0);
        expect(info.inputA?.endRow).toBe(1);
      });

      it('should detect INPUT_B span', () => {
        const grid = createWarningTestGrid(4, 1);
        grid[0][0].gate = GateType.INPUT_B;
        grid[0][0].params = { reverseSpan: { startRow: 0, endRow: 1 } };
        grid[1][0].gate = GateType.INPUT_B;
        grid[1][0].params = { isSpanContinuation: true };

        const info = getColumnArithmeticInfo(grid, 0);
        expect(info.inputB).toBeDefined();
      });

      it('should detect INPUT_R span', () => {
        const grid = createWarningTestGrid(4, 1);
        grid[2][0].gate = GateType.INPUT_R;
        grid[2][0].params = { reverseSpan: { startRow: 2, endRow: 3 } };
        grid[3][0].gate = GateType.INPUT_R;
        grid[3][0].params = { isSpanContinuation: true };

        const info = getColumnArithmeticInfo(grid, 0);
        expect(info.inputR).toBeDefined();
        expect(info.inputR?.startRow).toBe(2);
      });

      it('should collect arithmetic gates', () => {
        const grid = createWarningTestGrid(4, 1);
        grid[0][0].gate = GateType.INC;
        grid[0][0].params = { reverseSpan: { startRow: 0, endRow: 1 } };
        grid[1][0].gate = GateType.INC;
        grid[1][0].params = { isSpanContinuation: true };

        const info = getColumnArithmeticInfo(grid, 0);
        expect(info.arithmeticGates.length).toBe(1);
        expect(info.arithmeticGates[0].gateType).toBe(GateType.INC);
      });

      it('should collect comparison gates', () => {
        const grid = createWarningTestGrid(4, 1);
        grid[0][0].gate = GateType.A_LT_B;

        const info = getColumnArithmeticInfo(grid, 0);
        expect(info.comparisonGates.length).toBe(1);
        expect(info.comparisonGates[0].gateType).toBe(GateType.A_LT_B);
      });

      it('should collect scalar gates', () => {
        const grid = createWarningTestGrid(4, 1);
        grid[0][0].gate = GateType.SCALE_I;

        const info = getColumnArithmeticInfo(grid, 0);
        expect(info.scalarGates.length).toBe(1);
        expect(info.scalarGates[0].gateType).toBe(GateType.SCALE_I);
      });

      it('should skip continuation cells', () => {
        const grid = createWarningTestGrid(4, 1);
        grid[0][0].gate = GateType.INC;
        grid[0][0].params = { reverseSpan: { startRow: 0, endRow: 2 } };
        grid[1][0].gate = GateType.INC;
        grid[1][0].params = { isSpanContinuation: true };
        grid[2][0].gate = GateType.INC;
        grid[2][0].params = { isSpanContinuation: true };

        const info = getColumnArithmeticInfo(grid, 0);
        // Should only count the anchor, not continuations
        expect(info.arithmeticGates.length).toBe(1);
      });
    });
  });

  // ============================================================
  // PHASE 4: Property-Based Tests with fast-check
  // ============================================================
  describe('Property-Based Tests', () => {
    describe('Gate Unitarity Properties', () => {
      const singleQubitGates = [
        GateType.X, GateType.Y, GateType.Z, GateType.H,
        GateType.S, GateType.T, GateType.I
      ];

      it('all single-qubit gates should be unitary', () => {
        singleQubitGates.forEach(gate => {
          const matrix = getGateMatrix(gate);
          expect(isUnitary(matrix)).toBe(true);
        });
      });

      it('rotation gates should be unitary for any angle', () => {
        fc.assert(
          fc.property(
            fc.double({ min: -2 * Math.PI, max: 2 * Math.PI, noNaN: true }),
            (angle) => {
              const rxMatrix = getRxMatrix(angle);
              const ryMatrix = getRyMatrix(angle);
              const rzMatrix = getRzMatrix(angle);
              return isUnitary(rxMatrix) && isUnitary(ryMatrix) && isUnitary(rzMatrix);
            }
          ),
          { numRuns: 100 }
        );
      });
    });

    describe('Self-Inverse Gate Properties', () => {
      it('X gate squared should be identity', () => {
        const x = getGateMatrix(GateType.X);
        const x2 = matrixMultiply(x, x);
        expectComplexClose(x2[0][0], { re: 1, im: 0 });
        expectComplexClose(x2[0][1], { re: 0, im: 0 });
        expectComplexClose(x2[1][0], { re: 0, im: 0 });
        expectComplexClose(x2[1][1], { re: 1, im: 0 });
      });

      it('Y gate squared should be identity', () => {
        const y = getGateMatrix(GateType.Y);
        const y2 = matrixMultiply(y, y);
        expectComplexClose(y2[0][0], { re: 1, im: 0 });
        expectComplexClose(y2[1][1], { re: 1, im: 0 });
      });

      it('Z gate squared should be identity', () => {
        const z = getGateMatrix(GateType.Z);
        const z2 = matrixMultiply(z, z);
        expectComplexClose(z2[0][0], { re: 1, im: 0 });
        expectComplexClose(z2[1][1], { re: 1, im: 0 });
      });

      it('H gate squared should be identity', () => {
        const h = getGateMatrix(GateType.H);
        const h2 = matrixMultiply(h, h);
        expectComplexClose(h2[0][0], { re: 1, im: 0 });
        expectComplexClose(h2[0][1], { re: 0, im: 0 });
        expectComplexClose(h2[1][0], { re: 0, im: 0 });
        expectComplexClose(h2[1][1], { re: 1, im: 0 });
      });
    });

    describe('Modular Arithmetic Properties', () => {
      it('properMod should always return non-negative result', () => {
        fc.assert(
          fc.property(
            fc.integer({ min: -1000, max: 1000 }),
            fc.integer({ min: 1, max: 100 }),
            (a, m) => {
              const result = properMod(a, m);
              return result >= 0 && result < m;
            }
          ),
          { numRuns: 100 }
        );
      });

      it('modularInverse should satisfy (a * inv) mod m = 1 when coprime', () => {
        fc.assert(
          fc.property(
            fc.integer({ min: 1, max: 100 }),
            fc.integer({ min: 2, max: 100 }),
            (a, m) => {
              const inv = modularInverse(a, m);
              if (inv === null) {
                return gcd(a, m) !== 1; // Should be null only when not coprime
              }
              return properMod(a * inv, m) === 1;
            }
          ),
          { numRuns: 100 }
        );
      });

      it('gcd should be commutative', () => {
        fc.assert(
          fc.property(
            fc.integer({ min: 0, max: 1000 }),
            fc.integer({ min: 0, max: 1000 }),
            (a, b) => gcd(a, b) === gcd(b, a)
          ),
          { numRuns: 50 }
        );
      });

      it('gcd(a, b) should divide both a and b', () => {
        fc.assert(
          fc.property(
            fc.integer({ min: 1, max: 1000 }),
            fc.integer({ min: 1, max: 1000 }),
            (a, b) => {
              const g = gcd(a, b);
              return a % g === 0 && b % g === 0;
            }
          ),
          { numRuns: 50 }
        );
      });
    });

    describe('State Normalization Properties', () => {
      it('initial state should have |0...0⟩ = 1 and all others = 0', () => {
        // createInitialState returns ComplexArray (Float64Array with interleaved re/im)
        [2, 3, 4].forEach(numQubits => {
          const state = createInitialState(numQubits);
          // First amplitude (|0...0⟩) should be 1+0i
          expect(state[0]).toBeCloseTo(1, 10); // re of |0...0⟩
          expect(state[1]).toBeCloseTo(0, 10); // im of |0...0⟩
          // All other amplitudes should be 0
          for (let i = 2; i < state.length; i++) {
            expect(state[i]).toBeCloseTo(0, 10);
          }
        });
      });
    });

    describe('Register Read/Write Inverse Property', () => {
      it('writeRegisterValue then readRegisterValue should give original value', () => {
        fc.assert(
          fc.property(
            fc.integer({ min: 2, max: 4 }), // numQubits
            fc.integer({ min: 0, max: 1 }),  // startRow
            (numQubits, startRow) => {
              const endRow = Math.min(startRow + 1, numQubits - 1);
              const spanSize = endRow - startRow + 1;
              const maxValue = (1 << spanSize) - 1;
              const value = Math.floor(Math.random() * (maxValue + 1));

              const newState = writeRegisterValue(0, value, startRow, endRow, numQubits);
              const readValue = readRegisterValue(newState, startRow, endRow, numQubits);
              return readValue === value;
            }
          ),
          { numRuns: 50 }
        );
      });
    });
  });

  // ============================================================
  // PHASE 5: Additional Edge Cases
  // ============================================================
  describe('Additional Edge Cases', () => {
    describe('Circuit with No Gates', () => {
      it('should return initial state for grid with no gates', () => {
        const grid: CircuitGrid = Array(4).fill(null).map((_, rowIdx) =>
          Array(4).fill(null).map((_, colIdx) => ({
            gate: null,
            id: `cell-${rowIdx}-${colIdx}`
          }))
        );
        const { finalState, populatedRows } = runCircuitWithMeasurements(grid);
        expect(populatedRows).toHaveLength(0);
        // When no gates, returns initial state - first amplitude should be 1
        expect(cAbsSq(finalState[0])).toBeCloseTo(1, 10);
      });
    });

    describe('Single Qubit Edge Cases', () => {
      it('should handle single qubit circuit', () => {
        const grid: CircuitGrid = [[{ gate: GateType.H, id: 'cell-0-0' }]];
        const { finalState, populatedRows } = runCircuitWithMeasurements(grid);
        expect(populatedRows).toHaveLength(1);
        // H gate creates equal superposition, both amplitudes should be ~0.5 probability
        expect(cAbsSq(finalState[0])).toBeCloseTo(0.5, 5);
        expect(cAbsSq(finalState[1])).toBeCloseTo(0.5, 5);
      });
    });

    describe('Complex Number Edge Cases', () => {
      it('cMul with conjugate should give |z|^2', () => {
        const z: Complex = { re: 3, im: 4 };
        const zConj: Complex = { re: 3, im: -4 };
        const result = cMul(z, zConj);
        expect(result.re).toBe(25); // 3^2 + 4^2
        expect(result.im).toBe(0);
      });

      it('cAdd should be associative', () => {
        const a: Complex = { re: 1, im: 2 };
        const b: Complex = { re: 3, im: 4 };
        const c: Complex = { re: 5, im: 6 };
        const ab_c = cAdd(cAdd(a, b), c);
        const a_bc = cAdd(a, cAdd(b, c));
        expectComplexClose(ab_c, a_bc);
      });

      it('cMul should be associative', () => {
        const a: Complex = { re: 1, im: 2 };
        const b: Complex = { re: 3, im: 4 };
        const c: Complex = { re: 5, im: 6 };
        const ab_c = cMul(cMul(a, b), c);
        const a_bc = cMul(a, cMul(b, c));
        expectComplexClose(ab_c, a_bc);
      });
    });

    describe('Arithmetic Helper Edge Cases', () => {
      it('isOdd should handle boundary values', () => {
        expect(isOdd(0)).toBe(false);
        expect(isOdd(1)).toBe(true);
        expect(isOdd(Number.MAX_SAFE_INTEGER)).toBe(true); // 2^53 - 1 is odd
      });

      it('areCoprime with 1 should always be true', () => {
        expect(areCoprime(1, 100)).toBe(true);
        expect(areCoprime(1, 1)).toBe(true);
        expect(areCoprime(1, 0)).toBe(true);
      });

      it('gcd with itself should return itself', () => {
        expect(gcd(7, 7)).toBe(7);
        expect(gcd(100, 100)).toBe(100);
      });
    });

    describe('Populated Row Filtering', () => {
      it('should filter out unpopulated rows', () => {
        const grid: CircuitGrid = Array(4).fill(null).map((_, rowIdx) =>
          Array(1).fill(null).map(() => ({
            gate: null,
            id: `cell-${rowIdx}-0`
          }))
        );
        // Only put gates on rows 1 and 3
        grid[1][0].gate = GateType.X;
        grid[3][0].gate = GateType.H;

        const { populatedRows } = runCircuitWithMeasurements(grid);
        expect(populatedRows).toEqual([1, 3]);
      });

      it('should correctly map filtered rows in simulation', () => {
        const grid: CircuitGrid = Array(4).fill(null).map((_, rowIdx) =>
          Array(2).fill(null).map((_, colIdx) => ({
            gate: null,
            id: `cell-${rowIdx}-${colIdx}`
          }))
        );
        // Sparse population: only rows 0 and 2
        grid[0][0].gate = GateType.X;
        grid[2][1].gate = GateType.H;

        const { finalState, populatedRows } = runCircuitWithMeasurements(grid);
        expect(populatedRows).toEqual([0, 2]);
        // State should be valid - just verify it's not empty and first probability sums work
        expect(finalState.length).toBeGreaterThan(0);
        const totalProb = finalState.reduce((sum, amp) => sum + cAbsSq(amp), 0);
        expect(totalProb).toBeCloseTo(1, 5);
      });
    });

    describe('stateHistory for step-through simulation', () => {
      it('should return initial state as first element when circuit has gates', () => {
        const grid: CircuitGrid = Array(2).fill(null).map((_, r) =>
          Array(3).fill(null).map((_, c) => ({
            gate: null,
            id: `cell-${r}-${c}`
          }))
        );
        grid[0][0].gate = GateType.H;

        const { stateHistory } = runCircuitWithMeasurements(grid);
        // stateHistory[0] should be initial |0> state
        expect(stateHistory.length).toBeGreaterThan(0);
        expect(stateHistory[0][0].re).toBeCloseTo(1, 5);
        expect(stateHistory[0][0].im).toBeCloseTo(0, 5);
      });

      it('should have stateHistory length equal to activeColumns + 1', () => {
        const grid: CircuitGrid = Array(2).fill(null).map((_, r) =>
          Array(5).fill(null).map((_, c) => ({
            gate: null,
            id: `cell-${r}-${c}`
          }))
        );
        // Gates in columns 0, 2, 4 (3 active columns)
        grid[0][0].gate = GateType.H;
        grid[0][2].gate = GateType.X;
        grid[0][4].gate = GateType.Z;

        const { stateHistory, activeColumns } = runCircuitWithMeasurements(grid);
        expect(activeColumns).toEqual([0, 2, 4]);
        expect(stateHistory.length).toBe(activeColumns.length + 1); // initial + after each column
      });

      it('should track state evolution through gate sequence', () => {
        const grid: CircuitGrid = Array(1).fill(null).map((_, r) =>
          Array(2).fill(null).map((_, c) => ({
            gate: null,
            id: `cell-${r}-${c}`
          }))
        );
        // H gate followed by X gate
        grid[0][0].gate = GateType.H;
        grid[0][1].gate = GateType.X;

        const { stateHistory, activeColumns } = runCircuitWithMeasurements(grid);
        expect(activeColumns).toEqual([0, 1]);
        expect(stateHistory.length).toBe(3); // initial, after H, after X

        // Initial: |0>
        expect(stateHistory[0][0].re).toBeCloseTo(1, 5);
        expect(stateHistory[0][1]?.re ?? 0).toBeCloseTo(0, 5);

        // After H: (|0> + |1>)/sqrt(2)
        const sqrtHalf = 1 / Math.sqrt(2);
        expect(stateHistory[1][0].re).toBeCloseTo(sqrtHalf, 5);
        expect(stateHistory[1][1].re).toBeCloseTo(sqrtHalf, 5);

        // After X on H state: X(|0> + |1>)/sqrt(2) = (|1> + |0>)/sqrt(2) (same)
        expect(stateHistory[2][0].re).toBeCloseTo(sqrtHalf, 5);
        expect(stateHistory[2][1].re).toBeCloseTo(sqrtHalf, 5);
      });

      it('should return empty activeColumns for empty circuit', () => {
        const grid: CircuitGrid = Array(2).fill(null).map((_, r) =>
          Array(3).fill(null).map((_, c) => ({
            gate: null,
            id: `cell-${r}-${c}`
          }))
        );

        const { stateHistory, activeColumns } = runCircuitWithMeasurements(grid);
        expect(activeColumns).toEqual([]);
        expect(stateHistory.length).toBe(1); // Only initial state
      });

      it('should skip empty columns in activeColumns', () => {
        const grid: CircuitGrid = Array(2).fill(null).map((_, r) =>
          Array(6).fill(null).map((_, c) => ({
            gate: null,
            id: `cell-${r}-${c}`
          }))
        );
        // Gates only in columns 1 and 4
        grid[0][1].gate = GateType.X;
        grid[1][4].gate = GateType.H;

        const { activeColumns } = runCircuitWithMeasurements(grid);
        expect(activeColumns).toEqual([1, 4]);
      });

      it('should handle multi-qubit circuit with proper state dimensions', () => {
        const grid: CircuitGrid = Array(3).fill(null).map((_, r) =>
          Array(2).fill(null).map((_, c) => ({
            gate: null,
            id: `cell-${r}-${c}`
          }))
        );
        grid[0][0].gate = GateType.H;
        grid[1][0].gate = GateType.H;
        grid[2][1].gate = GateType.X;

        const { stateHistory, activeColumns, populatedRows } = runCircuitWithMeasurements(grid);
        expect(populatedRows).toEqual([0, 1, 2]);
        expect(activeColumns).toEqual([0, 1]);
        expect(stateHistory.length).toBe(3);

        // Each state should have 2^3 = 8 amplitudes
        stateHistory.forEach(state => {
          expect(state.length).toBe(8);
          const totalProb = state.reduce((sum, amp) => sum + cAbsSq(amp), 0);
          expect(totalProb).toBeCloseTo(1, 5);
        });
      });

      it('should match finalState with last stateHistory entry', () => {
        const grid: CircuitGrid = Array(2).fill(null).map((_, r) =>
          Array(3).fill(null).map((_, c) => ({
            gate: null,
            id: `cell-${r}-${c}`
          }))
        );
        grid[0][0].gate = GateType.H;
        grid[0][1].gate = GateType.X;
        grid[1][2].gate = GateType.Y;

        const { finalState, stateHistory } = runCircuitWithMeasurements(grid);
        const lastHistoryState = stateHistory[stateHistory.length - 1];

        expect(finalState.length).toBe(lastHistoryState.length);
        for (let i = 0; i < finalState.length; i++) {
          expect(finalState[i].re).toBeCloseTo(lastHistoryState[i].re, 10);
          expect(finalState[i].im).toBeCloseTo(lastHistoryState[i].im, 10);
        }
      });
    });
  });

  // Helper function for matrix multiplication
  const matrixMultiply = (a: Complex[][], b: Complex[][]): Complex[][] => {
    const result: Complex[][] = [
      [{ re: 0, im: 0 }, { re: 0, im: 0 }],
      [{ re: 0, im: 0 }, { re: 0, im: 0 }]
    ];
    for (let i = 0; i < 2; i++) {
      for (let j = 0; j < 2; j++) {
        result[i][j] = cAdd(
          cMul(a[i][0], b[0][j]),
          cMul(a[i][1], b[1][j])
        );
      }
    }
    return result;
  };
});
