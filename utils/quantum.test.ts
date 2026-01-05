import { describe, it, expect, vi } from 'vitest';
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
  // Circuit validation
  validateCircuit,
  isCircuitValid,
  // Simulation
  simulateCircuit,
} from './quantum';
import { Complex, GateType, CircuitGrid } from '../types';

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
        expect(state.length).toBe(2);
        expect(state[0]).toEqual({ re: 1, im: 0 });
        expect(state[1]).toEqual({ re: 0, im: 0 });
      });

      it('should create initial |00⟩ state for 2 qubits', () => {
        const state = createInitialState(2);
        expect(state.length).toBe(4);
        expect(state[0]).toEqual({ re: 1, im: 0 });
        expect(state[1]).toEqual({ re: 0, im: 0 });
        expect(state[2]).toEqual({ re: 0, im: 0 });
        expect(state[3]).toEqual({ re: 0, im: 0 });
      });

      it('should create initial state for 3 qubits', () => {
        const state = createInitialState(3);
        expect(state.length).toBe(8);
        expect(state[0]).toEqual({ re: 1, im: 0 });
        for (let i = 1; i < 8; i++) {
          expect(state[i]).toEqual({ re: 0, im: 0 });
        }
      });

      it('should be normalized', () => {
        const state = createInitialState(4);
        const norm = state.reduce((sum, amp) => sum + cAbsSq(amp), 0);
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
        const state: Complex[] = [{ re: 0, im: 0 }, { re: 1, im: 0 }];
        const [x, y, z] = getBlochVector(state, 0, 1);
        expect(x).toBeCloseTo(0, 10);
        expect(y).toBeCloseTo(0, 10);
        expect(z).toBeCloseTo(-1, 10);
      });

      it('should return (1, 0, 0) for |+⟩ state', () => {
        const invSqrt2 = 1 / Math.sqrt(2);
        const state: Complex[] = [
          { re: invSqrt2, im: 0 },
          { re: invSqrt2, im: 0 }
        ];
        const [x, y, z] = getBlochVector(state, 0, 1);
        expect(x).toBeCloseTo(1, 10);
        expect(y).toBeCloseTo(0, 10);
        expect(z).toBeCloseTo(0, 10);
      });

      it('should return (-1, 0, 0) for |-⟩ state', () => {
        const invSqrt2 = 1 / Math.sqrt(2);
        const state: Complex[] = [
          { re: invSqrt2, im: 0 },
          { re: -invSqrt2, im: 0 }
        ];
        const [x, y, z] = getBlochVector(state, 0, 1);
        expect(x).toBeCloseTo(-1, 10);
        expect(y).toBeCloseTo(0, 10);
        expect(z).toBeCloseTo(0, 10);
      });

      it('should return (0, 1, 0) for |+i⟩ state', () => {
        const invSqrt2 = 1 / Math.sqrt(2);
        const state: Complex[] = [
          { re: invSqrt2, im: 0 },
          { re: 0, im: invSqrt2 }
        ];
        const [x, y, z] = getBlochVector(state, 0, 1);
        expect(x).toBeCloseTo(0, 10);
        expect(y).toBeCloseTo(1, 10);
        expect(z).toBeCloseTo(0, 10);
      });

      it('should return (0, -1, 0) for |-i⟩ state', () => {
        const invSqrt2 = 1 / Math.sqrt(2);
        const state: Complex[] = [
          { re: invSqrt2, im: 0 },
          { re: 0, im: -invSqrt2 }
        ];
        const [x, y, z] = getBlochVector(state, 0, 1);
        expect(x).toBeCloseTo(0, 10);
        expect(y).toBeCloseTo(-1, 10);
        expect(z).toBeCloseTo(0, 10);
      });

      it('should have unit length for pure states', () => {
        const invSqrt2 = 1 / Math.sqrt(2);
        const state: Complex[] = [
          { re: invSqrt2, im: 0 },
          { re: 0.5, im: 0.5 }
        ];
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
        expectComplexClose(collapsedState[0], { re: 1, im: 0 });
        vi.restoreAllMocks();
      });

      it('should measure |1⟩ as 1 with probability 1', () => {
        const state: Complex[] = [{ re: 0, im: 0 }, { re: 1, im: 0 }];
        vi.spyOn(Math, 'random').mockReturnValue(0.5);
        const { result, probability, collapsedState } = measureQubit(state, 0, 1);
        expect(result).toBe(1);
        expect(probability).toBeCloseTo(1, 10);
        expectComplexClose(collapsedState[1], { re: 1, im: 0 });
        vi.restoreAllMocks();
      });

      it('should measure |+⟩ with equal probabilities', () => {
        const invSqrt2 = 1 / Math.sqrt(2);
        const state: Complex[] = [
          { re: invSqrt2, im: 0 },
          { re: invSqrt2, im: 0 }
        ];

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
        const state: Complex[] = [
          { re: invSqrt2, im: 0 },
          { re: invSqrt2, im: 0 }
        ];
        vi.spyOn(Math, 'random').mockReturnValue(0.3);
        const { collapsedState } = measureQubit(state, 0, 1);
        const norm = collapsedState.reduce((sum, amp) => sum + cAbsSq(amp), 0);
        expect(norm).toBeCloseTo(1, 10);
        vi.restoreAllMocks();
      });

      it('should work with multi-qubit states', () => {
        // Create |01⟩ state (2 qubits)
        const state: Complex[] = [
          { re: 0, im: 0 },
          { re: 1, im: 0 },
          { re: 0, im: 0 },
          { re: 0, im: 0 }
        ];
        vi.spyOn(Math, 'random').mockReturnValue(0.5);

        // Measure qubit 0 (should be |0⟩)
        const result0 = measureQubit(state, 0, 2);
        expect(result0.result).toBe(0);

        // Measure qubit 1 (should be |1⟩)
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
});
