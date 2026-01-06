import {
  Complex,
  ComplexArray,
  GateType,
  CircuitGrid,
  GateParams,
  SimulationWarning,
  isParameterizedGate,
  isArithmeticFixed2x1Gate,
  isArithmeticInputGate,
  isArithmeticComparisonGate,
  isArithmeticScalarGate,
  isRequiresInputAGate,
  isRequiresInputBGate,
  isRequiresInputRGate,
  ARITHMETIC_FIXED_2X1_GATES,
  ARITHMETIC_INPUT_GATES,
  ARITHMETIC_COMPARISON_GATES,
  ARITHMETIC_SCALAR_GATES,
  REQUIRES_INPUT_A,
  REQUIRES_INPUT_B,
  REQUIRES_INPUT_R,
} from '../types';
import { GATE_DEFS } from '../constants';
import {
  EPSILON as COMPLEX_EPSILON,
  add as complexAdd,
  mul as complexMul,
  absSq as complexAbsSq,
} from './complex';

// --- Constants ---

/** Tolerance for floating-point comparisons in numerical operations */
export const EPSILON = COMPLEX_EPSILON;
const INV_SQRT_2 = 1 / Math.sqrt(2);
const ZERO_COMPLEX: Complex = { re: 0, im: 0 };
const ONE_COMPLEX: Complex = { re: 1, im: 0 };

// --- ComplexArray Helpers (high-performance interleaved Float64Array) ---

/** Create a new ComplexArray initialized to zeros */
export const createComplexArray = (length: number): ComplexArray =>
  new Float64Array(length * 2);

/** Get length (number of complex numbers, NOT Float64Array length) */
export const complexLength = (arr: ComplexArray): number => arr.length / 2;

/** Check if complex number at index is zero */
export const isZeroAt = (arr: ComplexArray, i: number): boolean =>
  arr[i * 2] === 0 && arr[i * 2 + 1] === 0;

/** Get real part at index */
export const getRe = (arr: ComplexArray, i: number): number => arr[i * 2];

/** Get imaginary part at index */
export const getIm = (arr: ComplexArray, i: number): number => arr[i * 2 + 1];

/** Set complex number at index from re/im values */
export const setComplexValues = (arr: ComplexArray, i: number, re: number, im: number): void => {
  arr[i * 2] = re;
  arr[i * 2 + 1] = im;
};

/** Add complex number to value at index (mutating accumulation) */
export const addToComplex = (arr: ComplexArray, i: number, re: number, im: number): void => {
  arr[i * 2] += re;
  arr[i * 2 + 1] += im;
};

/** Get complex number at index as object (for UI/compatibility) */
export const getComplex = (arr: ComplexArray, i: number): Complex => ({
  re: arr[i * 2],
  im: arr[i * 2 + 1],
});

/** Convert ComplexArray to legacy Complex[] for UI consumption */
export const toComplexObjectArray = (arr: ComplexArray): Complex[] => {
  const len = complexLength(arr);
  const result: Complex[] = new Array(len);
  for (let i = 0; i < len; i++) {
    result[i] = { re: arr[i * 2], im: arr[i * 2 + 1] };
  }
  return result;
};

/** Convert legacy Complex[] to ComplexArray (for tests and external interop) */
export const fromComplexObjectArray = (arr: Complex[]): ComplexArray => {
  const result = createComplexArray(arr.length);
  for (let i = 0; i < arr.length; i++) {
    result[i * 2] = arr[i].re;
    result[i * 2 + 1] = arr[i].im;
  }
  return result;
};

// --- Complex Number Math ---

/**
 * Check if a complex number is effectively zero
 */
const isZero = (c: Complex): boolean => c.re === 0 && c.im === 0;

/** @deprecated Use `add` from 'utils/complex' instead */
export const cAdd = complexAdd;

/** @deprecated Use `mul` from 'utils/complex' instead */
export const cMul = complexMul;

/** @deprecated Use `absSq` from 'utils/complex' instead */
export const cAbsSq = complexAbsSq;

/** @deprecated Use `mul` from 'utils/complex' instead */
export const cScale = (a: Complex, scalar: Complex): Complex => complexMul(a, scalar);

// --- Arithmetic Helper Functions ---

/**
 * Greatest common divisor using Euclidean algorithm
 */
export const gcd = (a: number, b: number): number => {
  a = Math.abs(a);
  b = Math.abs(b);
  while (b) {
    const t = b;
    b = a % b;
    a = t;
  }
  return a;
};

/**
 * Always-positive modulo (handles negative numbers correctly)
 */
export const properMod = (a: number, m: number): number => {
  return ((a % m) + m) % m;
};

/**
 * Modular multiplicative inverse using extended Euclidean algorithm.
 * Returns x such that (a * x) mod m = 1.
 * Returns null if inverse doesn't exist (when gcd(a, m) !== 1).
 */
export const modularInverse = (a: number, m: number): number | null => {
  a = properMod(a, m);
  if (gcd(a, m) !== 1) {
    return null; // No inverse exists
  }

  // Extended Euclidean algorithm
  let [old_r, r] = [a, m];
  let [old_s, s] = [1, 0];

  while (r !== 0) {
    const quotient = Math.floor(old_r / r);
    [old_r, r] = [r, old_r - quotient * r];
    [old_s, s] = [s, old_s - quotient * s];
  }

  return properMod(old_s, m);
};

/**
 * Check if a number is odd (required for multiply/divide gates with mod 2^n)
 */
export const isOdd = (n: number): boolean => (n & 1) === 1;

/**
 * Check if two numbers are coprime
 */
export const areCoprime = (a: number, b: number): boolean => gcd(a, b) === 1;

// --- Arithmetic Gate Types and Interfaces ---

export interface ArithmeticSpan {
  startRow: number;
  endRow: number;
  gateType: GateType;
}

export interface ColumnArithmeticInfo {
  inputA?: ArithmeticSpan;
  inputB?: ArithmeticSpan;
  inputR?: ArithmeticSpan;
  arithmeticGates: ArithmeticSpan[];
  comparisonGates: { row: number; gateType: GateType }[];
  scalarGates: { row: number; gateType: GateType }[];
}

/**
 * Find all arithmetic-related gates in a column and return their span info.
 * This is used by both simulation and validation.
 */
export const getColumnArithmeticInfo = (
  grid: CircuitGrid,
  col: number
): ColumnArithmeticInfo => {
  const numRows = grid.length;
  const result: ColumnArithmeticInfo = {
    arithmeticGates: [],
    comparisonGates: [],
    scalarGates: [],
  };

  for (let row = 0; row < numRows; row++) {
    const cell = grid[row][col];
    const gateType = cell.gate;
    if (!gateType) continue;

    // Check for input markers (only process anchor cells, not continuations)
    if (isArithmeticInputGate(gateType) && !cell.params?.isSpanContinuation) {
      const span = cell.params?.reverseSpan; // Reusing reverseSpan for arithmetic spans
      if (span) {
        const spanInfo: ArithmeticSpan = {
          startRow: span.startRow,
          endRow: span.endRow,
          gateType,
        };
        if (gateType === GateType.INPUT_A) result.inputA = spanInfo;
        else if (gateType === GateType.INPUT_B) result.inputB = spanInfo;
        else if (gateType === GateType.INPUT_R) result.inputR = spanInfo;
      }
    }

    // Check for spanning arithmetic gates (only process anchor cells)
    if (isArithmeticFixed2x1Gate(gateType) && !cell.params?.isSpanContinuation) {
      const span = cell.params?.reverseSpan;
      if (span) {
        result.arithmeticGates.push({
          startRow: span.startRow,
          endRow: span.endRow,
          gateType,
        });
      }
    }

    // Check for comparison gates (single-qubit)
    if (isArithmeticComparisonGate(gateType)) {
      result.comparisonGates.push({ row, gateType });
    }

    // Check for scalar gates (single-qubit)
    if (isArithmeticScalarGate(gateType)) {
      result.scalarGates.push({ row, gateType });
    }
  }

  return result;
};

/**
 * Read an integer value from a register span in a basis state.
 * Uses little-endian convention: top qubit (lower row index) = LSB.
 *
 * @param basisState The full basis state index (e.g., for |0110⟩, basisState = 6)
 * @param startRow The starting row of the register span
 * @param endRow The ending row of the register span
 * @param numQubits Total number of qubits in the circuit
 * @returns The integer value represented by the qubits in the span
 */
export const readRegisterValue = (
  basisState: number,
  startRow: number,
  endRow: number,
  numQubits: number
): number => {
  let value = 0;
  const spanSize = endRow - startRow + 1;

  for (let i = 0; i < spanSize; i++) {
    const row = startRow + i;
    const bit = numQubits - 1 - row;
    if ((basisState >> bit) & 1) {
      // Little-endian: top qubit (row=startRow, i=0) is LSB
      value |= 1 << i;
    }
  }

  return value;
};

/**
 * Write an integer value to a register span in a basis state.
 * Uses little-endian convention: top qubit (lower row index) = LSB.
 *
 * @param basisState The original basis state index
 * @param value The new value to write
 * @param startRow The starting row of the register span
 * @param endRow The ending row of the register span
 * @param numQubits Total number of qubits in the circuit
 * @returns The new basis state index with the value written
 */
export const writeRegisterValue = (
  basisState: number,
  value: number,
  startRow: number,
  endRow: number,
  numQubits: number
): number => {
  let newState = basisState;
  const spanSize = endRow - startRow + 1;

  // Clear the bits in the span
  for (let i = 0; i < spanSize; i++) {
    const row = startRow + i;
    const bit = numQubits - 1 - row;
    newState &= ~(1 << bit);
  }

  // Set the new bits from value (little-endian)
  for (let i = 0; i < spanSize; i++) {
    const row = startRow + i;
    const bit = numQubits - 1 - row;
    if ((value >> i) & 1) {
      newState |= 1 << bit;
    }
  }

  return newState;
};

/**
 * Compute the result of an arithmetic operation on a register value.
 * This is the shared logic for all arithmetic permutation gates.
 *
 * @param gateType The type of arithmetic gate to apply
 * @param effectValue The current value in the effect register
 * @param inputAValue Value from input register A (or null if not present)
 * @param inputBValue Value from input register B (or null if not present)
 * @param inputRValue Value from input register R/modulus (or null if not present)
 * @param mod2n The modulus 2^n for the effect register size
 * @returns The new value after applying the arithmetic operation
 */
const computeArithmeticResult = (
  gateType: GateType,
  effectValue: number,
  inputAValue: number | null,
  inputBValue: number | null,
  inputRValue: number | null,
  mod2n: number
): number => {
  switch (gateType) {
    // Column 1: Increment/Decrement
    case GateType.INC:
      return properMod(effectValue + 1, mod2n);
    case GateType.DEC:
      return properMod(effectValue - 1, mod2n);
    case GateType.ADD_A:
      if (inputAValue !== null) {
        return properMod(effectValue + inputAValue, mod2n);
      }
      break;
    case GateType.SUB_A:
      if (inputAValue !== null) {
        return properMod(effectValue - inputAValue, mod2n);
      }
      break;

    // Column 2: Multiply/Divide (requires odd multiplier)
    case GateType.MUL_A:
      if (inputAValue !== null && isOdd(inputAValue)) {
        return properMod(effectValue * inputAValue, mod2n);
      }
      break;
    case GateType.DIV_A:
      if (inputAValue !== null && isOdd(inputAValue)) {
        const inv = modularInverse(inputAValue, mod2n);
        if (inv !== null) {
          return properMod(effectValue * inv, mod2n);
        }
      }
      break;
    case GateType.MUL_B:
      if (inputBValue !== null && isOdd(inputBValue)) {
        return properMod(effectValue * inputBValue, mod2n);
      }
      break;
    case GateType.DIV_B:
      if (inputBValue !== null && isOdd(inputBValue)) {
        const inv = modularInverse(inputBValue, mod2n);
        if (inv !== null) {
          return properMod(effectValue * inv, mod2n);
        }
      }
      break;

    // Column 5: Modular Inc/Dec with inputR
    case GateType.INC_MOD_R:
      if (inputRValue !== null && inputRValue > 0 && effectValue < inputRValue) {
        return properMod(effectValue + 1, inputRValue);
      }
      break;
    case GateType.DEC_MOD_R:
      if (inputRValue !== null && inputRValue > 0 && effectValue < inputRValue) {
        return properMod(effectValue - 1, inputRValue);
      }
      break;

    // Column 6: Modular Arithmetic on A with inputR
    case GateType.ADD_A_MOD_R:
      if (inputAValue !== null && inputRValue !== null && inputRValue > 0 && effectValue < inputRValue && inputAValue < inputRValue) {
        return properMod(effectValue + inputAValue, inputRValue);
      }
      break;
    case GateType.SUB_A_MOD_R:
      if (inputAValue !== null && inputRValue !== null && inputRValue > 0 && effectValue < inputRValue && inputAValue < inputRValue) {
        return properMod(effectValue - inputAValue, inputRValue);
      }
      break;
    case GateType.MUL_A_MOD_R:
      if (inputAValue !== null && inputRValue !== null && inputRValue > 0 && effectValue < inputRValue && areCoprime(inputAValue, inputRValue)) {
        return properMod(effectValue * inputAValue, inputRValue);
      }
      break;
    case GateType.DIV_A_MOD_R:
      if (inputAValue !== null && inputRValue !== null && inputRValue > 0 && effectValue < inputRValue && areCoprime(inputAValue, inputRValue)) {
        const inv = modularInverse(inputAValue, inputRValue);
        if (inv !== null) {
          return properMod(effectValue * inv, inputRValue);
        }
      }
      break;
  }

  // Default: return unchanged value (identity operation)
  return effectValue;
};

/**
 * Apply an arithmetic permutation gate (like +1, -1, +A, ×A, etc.)
 * These gates permute basis states based on arithmetic operations on register values.
 */
const applyArithmeticPermutation = (
  state: ComplexArray,
  gateType: GateType,
  effectStart: number,
  effectEnd: number,
  inputAValue: number | null,
  inputBValue: number | null,
  inputRValue: number | null,
  controlMask: number,
  antiControlMask: number,
  numQubits: number
): ComplexArray => {
  const len = complexLength(state);
  const newState = createComplexArray(len);
  const effectSpanSize = effectEnd - effectStart + 1;
  const mod2n = 1 << effectSpanSize; // 2^n for the effect register

  for (let i = 0; i < len; i++) {
    if (isZeroAt(state, i)) continue;

    const stateRe = getRe(state, i);
    const stateIm = getIm(state, i);

    // Check controls
    if ((i & controlMask) !== controlMask || (i & antiControlMask) !== 0) {
      addToComplex(newState, i, stateRe, stateIm);
      continue;
    }

    // Read current effect register value
    const effectValue = readRegisterValue(i, effectStart, effectEnd, numQubits);

    // Compute new value using shared helper
    const newValue = computeArithmeticResult(gateType, effectValue, inputAValue, inputBValue, inputRValue, mod2n);

    // Write the new value to get the target state
    const targetIdx = writeRegisterValue(i, newValue, effectStart, effectEnd, numQubits);
    addToComplex(newState, targetIdx, stateRe, stateIm);
  }

  return newState;
};

/**
 * Apply an arithmetic permutation gate with dynamic input reading.
 * This version reads input A/B/R values from each basis state dynamically.
 */
const applyArithmeticPermutationDynamic = (
  state: ComplexArray,
  gateType: GateType,
  effectStart: number,
  effectEnd: number,
  inputASpan: { startRow: number; endRow: number } | null,
  inputBSpan: { startRow: number; endRow: number } | null,
  inputRSpan: { startRow: number; endRow: number } | null,
  controlMask: number,
  antiControlMask: number,
  numQubits: number
): ComplexArray => {
  const len = complexLength(state);
  const newState = createComplexArray(len);
  const effectSpanSize = effectEnd - effectStart + 1;
  const mod2n = 1 << effectSpanSize; // 2^n for the effect register

  for (let i = 0; i < len; i++) {
    if (isZeroAt(state, i)) continue;

    const stateRe = getRe(state, i);
    const stateIm = getIm(state, i);

    // Check controls
    if ((i & controlMask) !== controlMask || (i & antiControlMask) !== 0) {
      addToComplex(newState, i, stateRe, stateIm);
      continue;
    }

    // Read input values dynamically from this basis state
    const inputAValue = inputASpan
      ? readRegisterValue(i, inputASpan.startRow, inputASpan.endRow, numQubits)
      : null;
    const inputBValue = inputBSpan
      ? readRegisterValue(i, inputBSpan.startRow, inputBSpan.endRow, numQubits)
      : null;
    const inputRValue = inputRSpan
      ? readRegisterValue(i, inputRSpan.startRow, inputRSpan.endRow, numQubits)
      : null;

    // Read current effect register value
    const effectValue = readRegisterValue(i, effectStart, effectEnd, numQubits);

    // Compute new value using shared helper
    const newValue = computeArithmeticResult(gateType, effectValue, inputAValue, inputBValue, inputRValue, mod2n);

    // Write the new value to get the target state
    const targetIdx = writeRegisterValue(i, newValue, effectStart, effectEnd, numQubits);
    addToComplex(newState, targetIdx, stateRe, stateIm);
  }

  return newState;
};

/**
 * Apply a comparison gate (A<B, A≤B, etc.)
 * These gates flip a single target qubit based on comparing inputA and inputB.
 */
const applyComparisonGate = (
  state: ComplexArray,
  gateType: GateType,
  targetRow: number,
  inputAStart: number,
  inputAEnd: number,
  inputBStart: number,
  inputBEnd: number,
  controlMask: number,
  antiControlMask: number,
  numQubits: number
): ComplexArray => {
  const len = complexLength(state);
  const newState = createComplexArray(len);
  const targetBit = numQubits - 1 - targetRow;

  for (let i = 0; i < len; i++) {
    if (isZeroAt(state, i)) continue;

    const stateRe = getRe(state, i);
    const stateIm = getIm(state, i);

    // Check controls
    if ((i & controlMask) !== controlMask || (i & antiControlMask) !== 0) {
      addToComplex(newState, i, stateRe, stateIm);
      continue;
    }

    // Read A and B values from their respective registers
    const aValue = readRegisterValue(i, inputAStart, inputAEnd, numQubits);
    const bValue = readRegisterValue(i, inputBStart, inputBEnd, numQubits);

    // Determine if comparison is true
    let shouldFlip = false;
    switch (gateType) {
      case GateType.A_LT_B:
        shouldFlip = aValue < bValue;
        break;
      case GateType.A_LEQ_B:
        shouldFlip = aValue <= bValue;
        break;
      case GateType.A_GT_B:
        shouldFlip = aValue > bValue;
        break;
      case GateType.A_GEQ_B:
        shouldFlip = aValue >= bValue;
        break;
      case GateType.A_EQ_B:
        shouldFlip = aValue === bValue;
        break;
      case GateType.A_NEQ_B:
        shouldFlip = aValue !== bValue;
        break;
    }

    // If comparison is true, flip the target qubit (apply X)
    if (shouldFlip) {
      const targetIdx = i ^ (1 << targetBit);
      addToComplex(newState, targetIdx, stateRe, stateIm);
    } else {
      addToComplex(newState, i, stateRe, stateIm);
    }
  }

  return newState;
};

/**
 * Apply a scalar gate (×i, ×-i, ×√i, ×√-i)
 * These gates multiply amplitudes by a complex scalar.
 * When controlled, they become controlled-phase gates.
 * Note: targetRow is kept for API consistency but scalar gates apply globally to controlled subspace.
 */
const applyScalarGate = (
  state: ComplexArray,
  gateType: GateType,
  _targetRow: number, // Unused but kept for consistent API
  controlMask: number,
  antiControlMask: number,
  _numQubits: number  // Unused but kept for consistent API
): ComplexArray => {
  const len = complexLength(state);
  const newState = createComplexArray(len);

  // Determine the scalar based on gate type
  let scalarRe: number;
  let scalarIm: number;
  switch (gateType) {
    case GateType.SCALE_I:
      scalarRe = 0; scalarIm = 1; // i
      break;
    case GateType.SCALE_NEG_I:
      scalarRe = 0; scalarIm = -1; // -i
      break;
    case GateType.SCALE_SQRT_I:
      scalarRe = INV_SQRT_2; scalarIm = INV_SQRT_2; // e^(iπ/4)
      break;
    case GateType.SCALE_SQRT_NEG_I:
      scalarRe = INV_SQRT_2; scalarIm = -INV_SQRT_2; // e^(-iπ/4)
      break;
    default:
      scalarRe = 1; scalarIm = 0; // Identity
  }

  for (let i = 0; i < len; i++) {
    if (isZeroAt(state, i)) continue;

    const stateRe = getRe(state, i);
    const stateIm = getIm(state, i);

    // Check controls
    if ((i & controlMask) !== controlMask || (i & antiControlMask) !== 0) {
      addToComplex(newState, i, stateRe, stateIm);
      continue;
    }

    // Apply the scalar multiplication: (a+bi)(c+di) = (ac-bd) + (ad+bc)i
    const scaledRe = stateRe * scalarRe - stateIm * scalarIm;
    const scaledIm = stateRe * scalarIm + stateIm * scalarRe;
    addToComplex(newState, i, scaledRe, scaledIm);
  }

  return newState;
};

// --- Circuit Validation ---

export interface ValidationError {
  column: number;
  row?: number;
  gateType: GateType;
  message: string;
}

/**
 * Validate the circuit for arithmetic gate errors.
 * All arithmetic and input gates are fixed 2x1 blocks.
 * Input markers (A/B/R) must be in the same column as their arithmetic gates.
 * Input and arithmetic gate spans must not overlap.
 * Returns an array of validation errors (empty if valid).
 */
export const validateCircuit = (grid: CircuitGrid): ValidationError[] => {
  const errors: ValidationError[] = [];
  const numRows = grid.length;
  const numCols = grid[0]?.length || 0;

  // Helper to check if two spans overlap
  const spansOverlap = (span1: { startRow: number; endRow: number }, span2: { startRow: number; endRow: number }): boolean => {
    return span1.startRow <= span2.endRow && span2.startRow <= span1.endRow;
  };

  for (let col = 0; col < numCols; col++) {
    // Collect all gates in this column
    interface GateInfo {
      anchorRow: number;
      gateType: GateType;
      span: { startRow: number; endRow: number };
    }

    const inputGates: GateInfo[] = [];
    const arithmeticGates: GateInfo[] = [];

    for (let row = 0; row < numRows; row++) {
      const cell = grid[row][col];
      const gateType = cell.gate;
      if (!gateType || cell.params?.isSpanContinuation) continue;

      const span = cell.params?.reverseSpan;

      // Input markers (A, B, R)
      if (isArithmeticInputGate(gateType) && span) {
        inputGates.push({ anchorRow: row, gateType, span });
      }
      // Arithmetic gates (spanning or comparison - all are 2x1 now)
      else if (isArithmeticFixed2x1Gate(gateType) && span) {
        arithmeticGates.push({ anchorRow: row, gateType, span });
      }
      // Comparison gates are also 2x1 now
      else if (isArithmeticComparisonGate(gateType) && span) {
        arithmeticGates.push({ anchorRow: row, gateType, span });
      }
    }

    // Build map of input markers by type
    const inputAGate = inputGates.find(g => g.gateType === GateType.INPUT_A);
    const inputBGate = inputGates.find(g => g.gateType === GateType.INPUT_B);
    const inputRGate = inputGates.find(g => g.gateType === GateType.INPUT_R);

    // Validate each arithmetic gate
    for (const gate of arithmeticGates) {
      const requiresA = isRequiresInputAGate(gate.gateType);
      const requiresB = isRequiresInputBGate(gate.gateType);
      const requiresR = isRequiresInputRGate(gate.gateType);

      // Check that required input markers exist in the same column
      if (requiresA && !inputAGate) {
        errors.push({
          column: col,
          row: gate.anchorRow,
          gateType: gate.gateType,
          message: `Missing INPUT_A marker in column ${col + 1}`
        });
      }
      if (requiresB && !inputBGate) {
        errors.push({
          column: col,
          row: gate.anchorRow,
          gateType: gate.gateType,
          message: `Missing INPUT_B marker in column ${col + 1}`
        });
      }
      if (requiresR && !inputRGate) {
        errors.push({
          column: col,
          row: gate.anchorRow,
          gateType: gate.gateType,
          message: `Missing INPUT_R marker in column ${col + 1}`
        });
      }

      // Check that input markers don't overlap with the arithmetic gate
      if (requiresA && inputAGate && spansOverlap(inputAGate.span, gate.span)) {
        errors.push({
          column: col,
          row: gate.anchorRow,
          gateType: gate.gateType,
          message: `INPUT_A overlaps with arithmetic gate in column ${col + 1}`
        });
      }
      if (requiresB && inputBGate && spansOverlap(inputBGate.span, gate.span)) {
        errors.push({
          column: col,
          row: gate.anchorRow,
          gateType: gate.gateType,
          message: `INPUT_B overlaps with arithmetic gate in column ${col + 1}`
        });
      }
      if (requiresR && inputRGate && spansOverlap(inputRGate.span, gate.span)) {
        errors.push({
          column: col,
          row: gate.anchorRow,
          gateType: gate.gateType,
          message: `INPUT_R overlaps with arithmetic gate in column ${col + 1}`
        });
      }
    }
  }

  return errors;
};

/**
 * Check if the circuit has any validation errors.
 */
export const isCircuitValid = (grid: CircuitGrid): boolean => {
  return validateCircuit(grid).length === 0;
};

// --- Gate Matrix Memoization ---

// Cache for fixed rotation gates to avoid recomputation
const gateMatrixCache = new Map<GateType, Complex[][]>();

// --- Rotation Matrix Generators ---

/**
 * Rx(θ) = [[cos(θ/2), -i*sin(θ/2)], [-i*sin(θ/2), cos(θ/2)]]
 */
export const getRxMatrix = (theta: number): Complex[][] => {
  const c = Math.cos(theta / 2);
  const s = Math.sin(theta / 2);
  return [
    [{ re: c, im: 0 }, { re: 0, im: -s }],
    [{ re: 0, im: -s }, { re: c, im: 0 }]
  ];
};

/**
 * Ry(θ) = [[cos(θ/2), -sin(θ/2)], [sin(θ/2), cos(θ/2)]]
 */
export const getRyMatrix = (theta: number): Complex[][] => {
  const c = Math.cos(theta / 2);
  const s = Math.sin(theta / 2);
  return [
    [{ re: c, im: 0 }, { re: -s, im: 0 }],
    [{ re: s, im: 0 }, { re: c, im: 0 }]
  ];
};

/**
 * Rz(θ) = [[e^(-iθ/2), 0], [0, e^(iθ/2)]]
 */
export const getRzMatrix = (theta: number): Complex[][] => {
  const halfTheta = theta / 2;
  return [
    [{ re: Math.cos(-halfTheta), im: Math.sin(-halfTheta) }, { re: 0, im: 0 }],
    [{ re: 0, im: 0 }, { re: Math.cos(halfTheta), im: Math.sin(halfTheta) }]
  ];
};

/**
 * Get the matrix for a gate, computing it dynamically for parameterized gates.
 * Fixed gates are memoized for performance.
 */
export const getGateMatrix = (gateType: GateType, params?: GateParams): Complex[][] => {
  // Handle parameterized rotation gates (cannot cache, depend on params)
  if (isParameterizedGate(gateType)) {
    const angle = params?.angle ?? 0;
    switch (gateType) {
      case GateType.RX:
        return getRxMatrix(angle);
      case GateType.RY:
        return getRyMatrix(angle);
      case GateType.RZ:
        return getRzMatrix(angle);
    }
  }

  // Handle custom gate (cannot cache, unique per instance)
  if (gateType === GateType.CUSTOM && params?.customMatrix) {
    return params.customMatrix;
  }

  // Check cache for fixed gates
  if (gateMatrixCache.has(gateType)) {
    return gateMatrixCache.get(gateType)!;
  }

  // Compute and cache preset rotation gates (fixed angles)
  let matrix: Complex[][] | undefined;
  switch (gateType) {
    case GateType.RX_PI_2:
      matrix = getRxMatrix(Math.PI / 2);
      break;
    case GateType.RX_PI_4:
      matrix = getRxMatrix(Math.PI / 4);
      break;
    case GateType.RX_PI_8:
      matrix = getRxMatrix(Math.PI / 8);
      break;
    case GateType.RX_PI_12:
      matrix = getRxMatrix(Math.PI / 12);
      break;
    case GateType.RY_PI_2:
      matrix = getRyMatrix(Math.PI / 2);
      break;
    case GateType.RY_PI_4:
      matrix = getRyMatrix(Math.PI / 4);
      break;
    case GateType.RY_PI_8:
      matrix = getRyMatrix(Math.PI / 8);
      break;
    case GateType.RY_PI_12:
      matrix = getRyMatrix(Math.PI / 12);
      break;
    case GateType.RZ_PI_2:
      matrix = getRzMatrix(Math.PI / 2);
      break;
    case GateType.RZ_PI_4:
      matrix = getRzMatrix(Math.PI / 4);
      break;
    case GateType.RZ_PI_8:
      matrix = getRzMatrix(Math.PI / 8);
      break;
    case GateType.RZ_PI_12:
      matrix = getRzMatrix(Math.PI / 12);
      break;
    // Square root gates (±90° rotations)
    case GateType.SQRT_X:
      matrix = getRxMatrix(Math.PI / 2);  // X^{1/2} = 90° around X
      break;
    case GateType.SQRT_X_DG:
      matrix = getRxMatrix(-Math.PI / 2); // X^{-1/2} = -90° around X
      break;
    case GateType.SQRT_Y:
      matrix = getRyMatrix(Math.PI / 2);  // Y^{1/2} = 90° around Y
      break;
    case GateType.SQRT_Y_DG:
      matrix = getRyMatrix(-Math.PI / 2); // Y^{-1/2} = -90° around Y
      break;
    // CCX acts as X on target (control logic handled by controlMask)
    case GateType.CCX:
      matrix = [[{ re: 0, im: 0 }, { re: 1, im: 0 }], [{ re: 1, im: 0 }, { re: 0, im: 0 }]];
      break;
  }

  if (matrix) {
    gateMatrixCache.set(gateType, matrix);
    return matrix;
  }

  // Use static matrix from definitions for basic gates (X, Y, Z, H, S, T, I, etc.)
  const def = GATE_DEFS[gateType];
  if (def) {
    gateMatrixCache.set(gateType, def.matrix);
    return def.matrix;
  }

  // Identity fallback for unknown gates
  const identityMatrix = [[{ re: 1, im: 0 }, { re: 0, im: 0 }], [{ re: 0, im: 0 }, { re: 1, im: 0 }]];
  return identityMatrix; // Don't cache unknown gates
};

// --- Simulation Logic ---

// --- Types for simulateColumn ---

/** Configuration options for simulateColumn */
interface SimulateColumnOptions {
  /** Number of qubits in the simulation space */
  numQubits: number;
  /** Current column index (for warning messages) */
  columnIndex: number;
  /** Row mapping: original row -> filtered row. If null, uses identity mapping (all rows) */
  rowMapping: Map<number, number> | null;
  /** Whether to process advanced gates (REVERSE, arithmetic, comparison, scalar) */
  processAdvancedGates: boolean;
  /** Array to collect warnings. If null, warnings are not collected */
  warnings: SimulationWarning[] | null;
}

/** Result of simulating a single column */
interface SimulateColumnResult {
  /** The quantum state after applying all gates in this column */
  state: ComplexArray;
  /** Rows that had MEASURE gates (filtered indices, for caller to handle) */
  measureRows: number[];
  /** Original row indices for measurement rows (for result mapping) */
  measureOriginalRows: number[];
}

// --- Helpers for simulateColumn ---

/**
 * Calculate control and anti-control masks for a column.
 * After basis transformations (H for X, S†H for Y):
 * - X_CONTROL (|+⟩) → anti-control (H|+⟩ = |0⟩)
 * - X_ANTI_CONTROL (|-⟩) → control (H|-⟩ = |1⟩)
 * - Y_CONTROL (|+i⟩) → anti-control (S†H|+i⟩ = |0⟩)
 * - Y_ANTI_CONTROL (|-i⟩) → control (S†H|-i⟩ = |1⟩)
 */
const calculateControlMasks = (
  controls: number[],
  antiControls: number[],
  xControls: number[],
  xAntiControls: number[],
  yControls: number[],
  yAntiControls: number[],
  numQubits: number
): { controlMask: number; antiControlMask: number } => {
  // Control mask: bits that must be 1 for gate to activate
  let controlMask = 0;
  for (const r of controls) {
    controlMask |= 1 << (numQubits - 1 - r);
  }
  // X_ANTI_CONTROL and Y_ANTI_CONTROL become regular controls after basis change
  for (const r of xAntiControls) {
    controlMask |= 1 << (numQubits - 1 - r);
  }
  for (const r of yAntiControls) {
    controlMask |= 1 << (numQubits - 1 - r);
  }

  // Anti-control mask: bits that must be 0 for gate to activate
  let antiControlMask = 0;
  for (const r of antiControls) {
    antiControlMask |= 1 << (numQubits - 1 - r);
  }
  // X_CONTROL and Y_CONTROL become anti-controls after basis change
  for (const r of xControls) {
    antiControlMask |= 1 << (numQubits - 1 - r);
  }
  for (const r of yControls) {
    antiControlMask |= 1 << (numQubits - 1 - r);
  }

  return { controlMask, antiControlMask };
};

/**
 * Pair adjacent SWAP gates in a column.
 * SWAPs are applied pairwise: [row0, row1, row2, row3] → [(row0,row1), (row2,row3)]
 */
const pairSwaps = (swaps: number[]): [number, number][] => {
  const pairs: [number, number][] = [];
  for (let i = 0; i < swaps.length - 1; i += 2) {
    pairs.push([swaps[i], swaps[i + 1]]);
  }
  return pairs;
};

/**
 * Simulate a single column of the circuit grid.
 *
 * This unified helper handles all column simulation logic:
 * - Gate identification (controls, operations, SWAP, MEASURE, etc.)
 * - Basis transformations for X/Y controls
 * - Control mask calculation
 * - Gate application (standard, REVERSE, arithmetic, comparison, scalar)
 * - Warning collection for missing arithmetic inputs
 *
 * Measurements are NOT performed here - measureRows are returned for caller to handle.
 */
const simulateColumn = (
  state: ComplexArray,
  grid: CircuitGrid,
  col: number,
  options: SimulateColumnOptions
): SimulateColumnResult => {
  const { numQubits, columnIndex, rowMapping, processAdvancedGates, warnings } = options;
  const numRows = grid.length;

  // Collections for identified gates
  const controls: number[] = [];
  const antiControls: number[] = [];
  const xControls: number[] = [];
  const xAntiControls: number[] = [];
  const yControls: number[] = [];
  const yAntiControls: number[] = [];
  const swaps: number[] = [];
  const operations: { row: number; type: GateType; params?: GateParams }[] = [];
  const measureRows: number[] = [];
  const measureOriginalRows: number[] = [];

  // Advanced gate collections (only used when processAdvancedGates=true)
  const reverseGates: { startRow: number; endRow: number }[] = [];
  const arithmeticOps: { startRow: number; endRow: number; gateType: GateType; originalRow: number }[] = [];
  const comparisonOps: { row: number; gateType: GateType; originalRow: number }[] = [];
  const scalarOps: { row: number; gateType: GateType }[] = [];
  let inputASpan: { startRow: number; endRow: number } | null = null;
  let inputBSpan: { startRow: number; endRow: number } | null = null;
  let inputRSpan: { startRow: number; endRow: number } | null = null;

  // Determine which rows to iterate over
  const rowsToProcess = rowMapping
    ? Array.from(rowMapping.keys())
    : Array.from({ length: numRows }, (_, i) => i);

  // Identify gates in this column
  for (const originalRow of rowsToProcess) {
    const cell = grid[originalRow][col];
    const type = cell.gate;
    if (!type) continue;

    const filteredRow = rowMapping ? rowMapping.get(originalRow)! : originalRow;

    if (type === GateType.CONTROL) {
      controls.push(filteredRow);
    } else if (type === GateType.ANTI_CONTROL) {
      antiControls.push(filteredRow);
    } else if (type === GateType.X_CONTROL) {
      xControls.push(filteredRow);
    } else if (type === GateType.X_ANTI_CONTROL) {
      xAntiControls.push(filteredRow);
    } else if (type === GateType.Y_CONTROL) {
      yControls.push(filteredRow);
    } else if (type === GateType.Y_ANTI_CONTROL) {
      yAntiControls.push(filteredRow);
    } else if (type === GateType.SWAP) {
      swaps.push(filteredRow);
    } else if (type === GateType.MEASURE) {
      if (processAdvancedGates) {
        // In execution mode, track measurements for caller to handle
        measureRows.push(filteredRow);
        measureOriginalRows.push(originalRow);
      } else {
        // In visualization mode, treat MEASURE as identity
        operations.push({ row: filteredRow, type: GateType.I, params: cell.params });
      }
    } else if (processAdvancedGates) {
      // Advanced gates only processed when enabled
      if (type === GateType.REVERSE && !cell.params?.isSpanContinuation) {
        const span = cell.params?.reverseSpan;
        if (span && rowMapping) {
          const filteredStart = rowMapping.get(span.startRow);
          const filteredEnd = rowMapping.get(span.endRow);
          if (filteredStart !== undefined && filteredEnd !== undefined) {
            reverseGates.push({ startRow: filteredStart, endRow: filteredEnd });
          }
        }
      } else if (type === GateType.INPUT_A && !cell.params?.isSpanContinuation) {
        const span = cell.params?.reverseSpan;
        if (span && rowMapping) {
          const filteredStart = rowMapping.get(span.startRow);
          const filteredEnd = rowMapping.get(span.endRow);
          if (filteredStart !== undefined && filteredEnd !== undefined) {
            inputASpan = { startRow: filteredStart, endRow: filteredEnd };
          }
        }
      } else if (type === GateType.INPUT_B && !cell.params?.isSpanContinuation) {
        const span = cell.params?.reverseSpan;
        if (span && rowMapping) {
          const filteredStart = rowMapping.get(span.startRow);
          const filteredEnd = rowMapping.get(span.endRow);
          if (filteredStart !== undefined && filteredEnd !== undefined) {
            inputBSpan = { startRow: filteredStart, endRow: filteredEnd };
          }
        }
      } else if (type === GateType.INPUT_R && !cell.params?.isSpanContinuation) {
        const span = cell.params?.reverseSpan;
        if (span && rowMapping) {
          const filteredStart = rowMapping.get(span.startRow);
          const filteredEnd = rowMapping.get(span.endRow);
          if (filteredStart !== undefined && filteredEnd !== undefined) {
            inputRSpan = { startRow: filteredStart, endRow: filteredEnd };
          }
        }
      } else if (isArithmeticFixed2x1Gate(type) && !cell.params?.isSpanContinuation) {
        const span = cell.params?.reverseSpan;
        if (span && rowMapping) {
          const filteredStart = rowMapping.get(span.startRow);
          const filteredEnd = rowMapping.get(span.endRow);
          if (filteredStart !== undefined && filteredEnd !== undefined) {
            arithmeticOps.push({ startRow: filteredStart, endRow: filteredEnd, gateType: type, originalRow });
          }
        }
      } else if (isArithmeticComparisonGate(type)) {
        comparisonOps.push({ row: filteredRow, gateType: type, originalRow });
      } else if (isArithmeticScalarGate(type)) {
        scalarOps.push({ row: filteredRow, gateType: type });
      } else if (!isArithmeticInputGate(type) && !isArithmeticFixed2x1Gate(type) && type !== GateType.REVERSE) {
        operations.push({ row: filteredRow, type, params: cell.params });
      }
    } else {
      // Standard gate in visualization mode
      if (type === GateType.CCX) {
        operations.push({ row: filteredRow, type: GateType.CCX, params: cell.params });
      } else {
        operations.push({ row: filteredRow, type, params: cell.params });
      }
    }
  }

  // Create working copy of state
  let nextState = new Float64Array(state);

  // Apply basis transformations for X/Y controls
  for (const r of [...xControls, ...xAntiControls]) {
    nextState = applyGate(nextState, GateType.H, r, 0, numQubits);
  }
  for (const r of [...yControls, ...yAntiControls]) {
    nextState = applySdagger(nextState, r, numQubits);
    nextState = applyGate(nextState, GateType.H, r, 0, numQubits);
  }

  // Calculate control masks
  const { controlMask, antiControlMask } = calculateControlMasks(
    controls, antiControls, xControls, xAntiControls, yControls, yAntiControls, numQubits
  );

  // Apply SWAPs
  const swapPairs = pairSwaps(swaps);
  for (const [r1, r2] of swapPairs) {
    nextState = applySwapWithAntiControl(nextState, r1, r2, controlMask, antiControlMask, numQubits);
  }

  // Apply standard gates
  for (const op of operations) {
    nextState = applyGateWithAntiControl(nextState, op.type, op.row, controlMask, antiControlMask, numQubits, op.params);
  }

  // Apply advanced gates (when enabled)
  if (processAdvancedGates) {
    // REVERSE gates
    for (const rev of reverseGates) {
      nextState = applyBitReversePermutation(nextState, rev.startRow, rev.endRow, numQubits);
    }

    // Arithmetic gates with warning collection
    for (const arithOp of arithmeticOps) {
      if (warnings) {
        const requiresA = isRequiresInputAGate(arithOp.gateType);
        const requiresB = isRequiresInputBGate(arithOp.gateType);
        const requiresR = isRequiresInputRGate(arithOp.gateType);

        if (requiresA && !inputASpan) {
          warnings.push({
            column: columnIndex,
            row: arithOp.originalRow,
            gateType: arithOp.gateType,
            message: `${arithOp.gateType} gate requires INPUT_A marker in the same column`,
            category: 'missing_input'
          });
        }
        if (requiresB && !inputBSpan) {
          warnings.push({
            column: columnIndex,
            row: arithOp.originalRow,
            gateType: arithOp.gateType,
            message: `${arithOp.gateType} gate requires INPUT_B marker in the same column`,
            category: 'missing_input'
          });
        }
        if (requiresR && !inputRSpan) {
          warnings.push({
            column: columnIndex,
            row: arithOp.originalRow,
            gateType: arithOp.gateType,
            message: `${arithOp.gateType} gate requires INPUT_R marker in the same column`,
            category: 'missing_input'
          });
        }
      }

      nextState = applyArithmeticPermutationDynamic(
        nextState,
        arithOp.gateType,
        arithOp.startRow,
        arithOp.endRow,
        inputASpan,
        inputBSpan,
        inputRSpan,
        controlMask,
        antiControlMask,
        numQubits
      );
    }

    // Comparison gates
    for (const compOp of comparisonOps) {
      if (!inputASpan || !inputBSpan) {
        if (warnings) {
          if (!inputASpan) {
            warnings.push({
              column: columnIndex,
              row: compOp.originalRow,
              gateType: compOp.gateType,
              message: `${compOp.gateType} gate requires INPUT_A marker in the same column`,
              category: 'missing_input'
            });
          }
          if (!inputBSpan) {
            warnings.push({
              column: columnIndex,
              row: compOp.originalRow,
              gateType: compOp.gateType,
              message: `${compOp.gateType} gate requires INPUT_B marker in the same column`,
              category: 'missing_input'
            });
          }
        }
        continue;
      }

      nextState = applyComparisonGate(
        nextState,
        compOp.gateType,
        compOp.row,
        inputASpan.startRow,
        inputASpan.endRow,
        inputBSpan.startRow,
        inputBSpan.endRow,
        controlMask,
        antiControlMask,
        numQubits
      );
    }

    // Scalar gates
    for (const scalarOp of scalarOps) {
      nextState = applyScalarGate(
        nextState,
        scalarOp.gateType,
        scalarOp.row,
        controlMask,
        antiControlMask,
        numQubits
      );
    }
  }

  // Undo basis transformations
  for (const r of [...xControls, ...xAntiControls]) {
    nextState = applyGate(nextState, GateType.H, r, 0, numQubits);
  }
  for (const r of [...yControls, ...yAntiControls]) {
    nextState = applyGate(nextState, GateType.H, r, 0, numQubits);
    nextState = applyS(nextState, r, numQubits);
  }

  return {
    state: nextState,
    measureRows,
    measureOriginalRows
  };
};

export const createInitialState = (numQubits: number): ComplexArray => {
  const size = Math.pow(2, numQubits);
  const state = createComplexArray(size);
  state[0] = 1; // re of |0...0⟩ = 1 (im already 0)
  return state;
};

export const simulateCircuit = (grid: CircuitGrid): Complex[][] => {
  const numRows = grid.length;
  const numCols = grid[0]?.length || 0;

  let currentState = createInitialState(numRows);
  const history: ComplexArray[] = [currentState];

  for (let col = 0; col < numCols; col++) {
    // 1. Identify Gates and Controls in this column
    const controls: number[] = [];
    const antiControls: number[] = [];
    const xControls: number[] = [];
    const xAntiControls: number[] = [];
    const yControls: number[] = [];
    const yAntiControls: number[] = [];
    const swaps: number[] = [];
    const operations: { row: number; type: GateType; params?: GateParams }[] = [];

    for (let row = 0; row < numRows; row++) {
      const cell = grid[row][col];
      const type = cell.gate;
      if (!type) continue;

      if (type === GateType.CONTROL) {
        controls.push(row);
      } else if (type === GateType.ANTI_CONTROL) {
        antiControls.push(row);
      } else if (type === GateType.X_CONTROL) {
        xControls.push(row);
      } else if (type === GateType.X_ANTI_CONTROL) {
        xAntiControls.push(row);
      } else if (type === GateType.Y_CONTROL) {
        yControls.push(row);
      } else if (type === GateType.Y_ANTI_CONTROL) {
        yAntiControls.push(row);
      } else if (type === GateType.SWAP) {
        swaps.push(row);
      } else if (type === GateType.CCX) {
        operations.push({ row, type: GateType.CCX, params: cell.params });
      } else if (type === GateType.MEASURE) {
        // Measurement gates don't affect visualization, treat as identity
        operations.push({ row, type: GateType.I, params: cell.params });
      } else {
        operations.push({ row, type, params: cell.params });
      }
    }

    // 2. Pair Swaps
    const swapPairs: [number, number][] = [];
    for (let i = 0; i < swaps.length - 1; i += 2) {
      swapPairs.push([swaps[i], swaps[i+1]]);
    }

    let nextState: ComplexArray = new Float64Array(currentState);

    // 3. Apply basis transformations for X/Y controls
    // X-basis: H transforms |+⟩ → |0⟩ and |-⟩ → |1⟩
    for (const r of [...xControls, ...xAntiControls]) {
      nextState = applyGate(nextState, GateType.H, r, 0, numRows);
    }
    // Y-basis: S†H transforms |+i⟩ → |0⟩ and |-i⟩ → |1⟩
    for (const r of [...yControls, ...yAntiControls]) {
      nextState = applySdagger(nextState, r, numRows);
      nextState = applyGate(nextState, GateType.H, r, 0, numRows);
    }

    // 4. Calculate control masks
    // Control mask: bits that must be 1
    let controlMask = 0;
    for (const r of controls) {
      controlMask |= (1 << (numRows - 1 - r));
    }
    // X/Y controls: after basis change, |+⟩/|+i⟩ maps to |0⟩, so control on |+⟩ means anti-control after H
    // Wait - H maps |+⟩ → |0⟩, so X_CONTROL (triggers on |+⟩) should be ANTI-control after H
    // Let me reconsider:
    // |+⟩ = (|0⟩ + |1⟩)/√2, after H: H|+⟩ = |0⟩
    // |-⟩ = (|0⟩ - |1⟩)/√2, after H: H|-⟩ = |1⟩
    // So X_CONTROL (activates on |+⟩) → after H, activates on |0⟩ → anti-control
    // X_ANTI_CONTROL (activates on |-⟩) → after H, activates on |1⟩ → control
    for (const r of xAntiControls) {
      controlMask |= (1 << (numRows - 1 - r));
    }
    for (const r of yAntiControls) {
      controlMask |= (1 << (numRows - 1 - r));
    }

    // Anti-control mask: bits that must be 0
    let antiControlMask = 0;
    for (const r of antiControls) {
      antiControlMask |= (1 << (numRows - 1 - r));
    }
    // X_CONTROL triggers on |+⟩ which becomes |0⟩ after H → anti-control mask
    for (const r of xControls) {
      antiControlMask |= (1 << (numRows - 1 - r));
    }
    for (const r of yControls) {
      antiControlMask |= (1 << (numRows - 1 - r));
    }

    // 5. Apply SWAPs with control masks
    for (const [r1, r2] of swapPairs) {
      nextState = applySwapWithAntiControl(nextState, r1, r2, controlMask, antiControlMask, numRows);
    }

    // 6. Apply gates with control masks
    for (const op of operations) {
      nextState = applyGateWithAntiControl(nextState, op.type, op.row, controlMask, antiControlMask, numRows, op.params);
    }

    // 7. Undo basis transformations
    for (const r of [...xControls, ...xAntiControls]) {
      nextState = applyGate(nextState, GateType.H, r, 0, numRows);
    }
    for (const r of [...yControls, ...yAntiControls]) {
      nextState = applyGate(nextState, GateType.H, r, 0, numRows);
      nextState = applyS(nextState, r, numRows);
    }

    currentState = nextState;
    history.push(currentState);
  }

  // Convert ComplexArray[] to Complex[][] for backward compatibility
  return history.map(toComplexObjectArray);
};

const applyGate = (
    state: ComplexArray,
    gateType: GateType,
    row: number,
    controlMask: number,
    numQubits: number,
    params?: GateParams
): ComplexArray => {
    const matrix = getGateMatrix(gateType, params);
    const len = complexLength(state);
    const newState = createComplexArray(len);
    const bit = numQubits - 1 - row;

    for (let i = 0; i < len; i++) {
        // If state is zero, skip
        if (isZeroAt(state, i)) continue;

        const stateRe = getRe(state, i);
        const stateIm = getIm(state, i);

        // Check controls
        // If controls are NOT satisfied, this gate acts as Identity
        if ((i & controlMask) !== controlMask) {
            addToComplex(newState, i, stateRe, stateIm); // Identity
            continue;
        }

        // Apply Gate Matrix
        // Local index (0 or 1)
        const localIdx = (i >> bit) & 1;
        const otherBits = i & ~(1 << bit);

        // Matrix multiplication
        // |0> -> M00|0> + M10|1>
        // |1> -> M01|0> + M11|1>

        for (let k = 0; k < 2; k++) {
            const matrixElem = matrix[k][localIdx];
            if (isZero(matrixElem)) continue;

            const targetIdx = otherBits | (k << bit);
            // Inline cMul: (a+bi)(c+di) = (ac-bd) + (ad+bc)i
            const valRe = matrixElem.re * stateRe - matrixElem.im * stateIm;
            const valIm = matrixElem.re * stateIm + matrixElem.im * stateRe;
            addToComplex(newState, targetIdx, valRe, valIm);
        }
    }
    return newState;
};


// --- S and S† gate helpers for Y-basis control ---

const applyS = (
  state: ComplexArray,
  row: number,
  numQubits: number
): ComplexArray => {
  // S = [[1, 0], [0, i]]
  const len = complexLength(state);
  const newState = createComplexArray(len);
  const bit = numQubits - 1 - row;

  for (let i = 0; i < len; i++) {
    if (isZeroAt(state, i)) continue;

    const stateRe = getRe(state, i);
    const stateIm = getIm(state, i);
    const localIdx = (i >> bit) & 1;
    if (localIdx === 0) {
      // |0⟩ → |0⟩ (multiply by 1)
      addToComplex(newState, i, stateRe, stateIm);
    } else {
      // |1⟩ → i|1⟩ (multiply by i: (a+bi)*i = -b + ai)
      addToComplex(newState, i, -stateIm, stateRe);
    }
  }
  return newState;
};

const applySdagger = (
  state: ComplexArray,
  row: number,
  numQubits: number
): ComplexArray => {
  // S† = [[1, 0], [0, -i]]
  const len = complexLength(state);
  const newState = createComplexArray(len);
  const bit = numQubits - 1 - row;

  for (let i = 0; i < len; i++) {
    if (isZeroAt(state, i)) continue;

    const stateRe = getRe(state, i);
    const stateIm = getIm(state, i);
    const localIdx = (i >> bit) & 1;
    if (localIdx === 0) {
      // |0⟩ → |0⟩ (multiply by 1)
      addToComplex(newState, i, stateRe, stateIm);
    } else {
      // |1⟩ → -i|1⟩ (multiply by -i: (a+bi)*(-i) = b - ai)
      addToComplex(newState, i, stateIm, -stateRe);
    }
  }
  return newState;
};

// --- Bit-reversal permutation for REVERSE gate ---

/**
 * Reverse the bits of a number within a given bit width
 * e.g., bitReverse(5, 3) = bitReverse(101, 3) = 101 = 5 (symmetric)
 *       bitReverse(1, 3) = bitReverse(001, 3) = 100 = 4
 */
const bitReverse = (k: number, n: number): number => {
  let result = 0;
  for (let i = 0; i < n; i++) {
    if ((k >> i) & 1) {
      result |= 1 << (n - 1 - i);
    }
  }
  return result;
};

/**
 * Apply bit-reversal permutation to a subset of qubits.
 * The qubits in the span are treated as a sub-register and their order is reversed.
 *
 * For example, if we have 4 qubits total and the span covers qubits 1-2:
 * The state |0110⟩ would have qubits 1 and 2 swapped, becoming |0110⟩ → no change (symmetric)
 * But |0100⟩ would become |0010⟩ (qubits 1 and 2 swapped)
 */
const applyBitReversePermutation = (
  state: ComplexArray,
  startRow: number,
  endRow: number,
  numQubits: number
): ComplexArray => {
  const spanSize = endRow - startRow + 1;

  // If span is 1, it's identity
  if (spanSize <= 1) {
    return state;
  }

  const len = complexLength(state);
  const newState = createComplexArray(len);

  // Convert row indices to bit positions (rows are numbered top-to-bottom, bits are numbered right-to-left)
  // Row 0 = most significant bit, Row n-1 = least significant bit
  const startBit = numQubits - 1 - endRow;   // LSB of span
  const endBit = numQubits - 1 - startRow;   // MSB of span

  for (let i = 0; i < len; i++) {
    if (isZeroAt(state, i)) continue;

    // Extract the bits within the span
    let spanBits = 0;
    for (let b = startBit; b <= endBit; b++) {
      if ((i >> b) & 1) {
        spanBits |= 1 << (b - startBit);
      }
    }

    // Reverse the span bits
    const reversedSpanBits = bitReverse(spanBits, spanSize);

    // Reconstruct the full index with reversed span bits
    let newIdx = i;
    // Clear the span bits
    for (let b = startBit; b <= endBit; b++) {
      newIdx &= ~(1 << b);
    }
    // Set the reversed span bits
    for (let b = startBit; b <= endBit; b++) {
      if ((reversedSpanBits >> (b - startBit)) & 1) {
        newIdx |= 1 << b;
      }
    }

    addToComplex(newState, newIdx, getRe(state, i), getIm(state, i));
  }

  return newState;
};

// --- Gate application with anti-control support ---

const applySwapWithAntiControl = (
  state: ComplexArray,
  row1: number,
  row2: number,
  controlMask: number,
  antiControlMask: number,
  numQubits: number
): ComplexArray => {
  const newState = new Float64Array(state); // Copy the TypedArray
  const len = complexLength(state);
  const bit1 = numQubits - 1 - row1;
  const bit2 = numQubits - 1 - row2;

  for (let i = 0; i < len; i++) {
    // Check controls (must be 1) and anti-controls (must be 0)
    if ((i & controlMask) !== controlMask) continue;
    if ((i & antiControlMask) !== 0) continue;

    const b1 = (i >> bit1) & 1;
    const b2 = (i >> bit2) & 1;

    if (b1 !== b2) {
      const j = i ^ (1 << bit1) ^ (1 << bit2);
      if (i < j) {
        // Swap re and im for indices i and j
        const tempRe = newState[i * 2];
        const tempIm = newState[i * 2 + 1];
        newState[i * 2] = newState[j * 2];
        newState[i * 2 + 1] = newState[j * 2 + 1];
        newState[j * 2] = tempRe;
        newState[j * 2 + 1] = tempIm;
      }
    }
  }
  return newState;
};

const applyGateWithAntiControl = (
  state: ComplexArray,
  gateType: GateType,
  row: number,
  controlMask: number,
  antiControlMask: number,
  numQubits: number,
  params?: GateParams
): ComplexArray => {
  const matrix = getGateMatrix(gateType, params);
  const len = complexLength(state);
  const newState = createComplexArray(len);
  const bit = numQubits - 1 - row;

  for (let i = 0; i < len; i++) {
    if (isZeroAt(state, i)) continue;

    const stateRe = getRe(state, i);
    const stateIm = getIm(state, i);

    // Check controls (must be 1) and anti-controls (must be 0)
    const controlsSatisfied = (i & controlMask) === controlMask;
    const antiControlsSatisfied = (i & antiControlMask) === 0;

    if (!controlsSatisfied || !antiControlsSatisfied) {
      // Gate acts as identity
      addToComplex(newState, i, stateRe, stateIm);
      continue;
    }

    // Apply gate matrix
    const localIdx = (i >> bit) & 1;
    const otherBits = i & ~(1 << bit);

    for (let k = 0; k < 2; k++) {
      const matrixElem = matrix[k][localIdx];
      if (isZero(matrixElem)) continue;

      const targetIdx = otherBits | (k << bit);
      // Inline cMul: (a+bi)(c+di) = (ac-bd) + (ad+bc)i
      const valRe = matrixElem.re * stateRe - matrixElem.im * stateIm;
      const valIm = matrixElem.re * stateIm + matrixElem.im * stateRe;
      addToComplex(newState, targetIdx, valRe, valIm);
    }
  }
  return newState;
};

// --- Visualization Logic ---

export const getBlochVector = (state: ComplexArray, targetQubit: number, totalQubits: number): [number, number, number] => {
  let expX = 0;
  let expY = 0;
  let expZ = 0;

  const N = totalQubits;
  const bitK = N - 1 - targetQubit;
  const len = complexLength(state);

  for (let i = 0; i < len; i++) {
    const ampRe = getRe(state, i);
    const ampIm = getIm(state, i);
    const absSq = ampRe * ampRe + ampIm * ampIm;

    // Z expectation
    if (((i >> bitK) & 1) === 0) {
        expZ += absSq;
    } else {
        expZ -= absSq;
    }

    // X and Y
    if (((i >> bitK) & 1) === 0) {
        const idx1 = i | (1 << bitK);
        if (idx1 >= len) continue;

        const c0Re = ampRe;
        const c0Im = ampIm;
        const c1Re = getRe(state, idx1);
        const c1Im = getIm(state, idx1);

        const termRe = c0Re * c1Re + c0Im * c1Im;

        expX += 2 * termRe;
        expY += 2 * (c1Im * c0Re - c1Re * c0Im);
    }
  }

  return [expX, expY, expZ];
};

// --- Measurement Logic ---

/**
 * Perform a measurement on a specific qubit.
 * Returns the measurement result (0 or 1) and the collapsed state.
 *
 * Logic: Generate random number r in [0,1].
 * Calculate |a|^2 = probability of measuring 0.
 * If r <= |a|^2, collapse to 0; otherwise collapse to 1.
 */
export const measureQubit = (
  state: ComplexArray,
  qubit: number,
  numQubits: number
): { result: 0 | 1; probability: number; collapsedState: ComplexArray } => {
  const bit = numQubits - 1 - qubit;
  const len = complexLength(state);

  // Calculate probability of measuring 0
  let prob0 = 0;
  for (let i = 0; i < len; i++) {
    if (((i >> bit) & 1) === 0) {
      const re = getRe(state, i);
      const im = getIm(state, i);
      prob0 += re * re + im * im;
    }
  }

  // Generate random number and determine result
  const r = Math.random();
  const result: 0 | 1 = r <= prob0 ? 0 : 1;
  const measuredProb = result === 0 ? prob0 : 1 - prob0;

  // Collapse the state
  const collapsedState = createComplexArray(len);
  const normFactor = Math.sqrt(measuredProb);

  for (let i = 0; i < len; i++) {
    const bitVal = (i >> bit) & 1;
    if (bitVal === result) {
      // Normalize this amplitude
      const re = getRe(state, i) / normFactor;
      const im = getIm(state, i) / normFactor;
      setComplexValues(collapsedState, i, re, im);
    }
    // Other amplitudes remain 0 (already initialized)
  }

  return { result, probability: measuredProb, collapsedState };
};

/**
 * Run the circuit with actual measurements.
 * This is used for the "Run" workflow and performs real measurements.
 * Unpopulated wires (rows with no gates) are filtered out before simulation.
 */
export const runCircuitWithMeasurements = (
  grid: CircuitGrid
): { finalState: Complex[]; measurements: { qubit: number; result: 0 | 1; probability: number }[]; populatedRows: number[]; warnings: SimulationWarning[] } => {
  const numRows = grid.length;
  const numCols = grid[0]?.length || 0;
  const warnings: SimulationWarning[] = [];

  // Find which rows have at least one gate
  const populatedRows: number[] = [];
  for (let row = 0; row < numRows; row++) {
    const hasGate = grid[row].some(cell => cell.gate !== null);
    if (hasGate) {
      populatedRows.push(row);
    }
  }

  // If no gates at all, return default state for all qubits
  if (populatedRows.length === 0) {
    return {
      finalState: toComplexObjectArray(createInitialState(numRows)),
      measurements: [],
      populatedRows: [],
      warnings: []
    };
  }

  // Create mapping from original row index to filtered row index
  const rowToFiltered = new Map<number, number>();
  populatedRows.forEach((originalRow, filteredIdx) => {
    rowToFiltered.set(originalRow, filteredIdx);
  });

  const numFilteredRows = populatedRows.length;
  let currentState = createInitialState(numFilteredRows);
  const measurements: { qubit: number; result: 0 | 1; probability: number }[] = [];

  for (let col = 0; col < numCols; col++) {
    const controls: number[] = [];
    const antiControls: number[] = [];
    const xControls: number[] = [];
    const xAntiControls: number[] = [];
    const yControls: number[] = [];
    const yAntiControls: number[] = [];
    const swaps: number[] = [];
    const operations: { row: number; type: GateType; params?: GateParams }[] = [];
    const measureRows: number[] = [];
    const reverseGates: { startRow: number; endRow: number }[] = [];

    // Arithmetic gate collections (include originalRow for warning messages)
    const arithmeticOps: { startRow: number; endRow: number; gateType: GateType; originalRow: number }[] = [];
    const comparisonOps: { row: number; gateType: GateType; originalRow: number }[] = [];
    const scalarOps: { row: number; gateType: GateType }[] = [];
    let inputASpan: { startRow: number; endRow: number } | null = null;
    let inputBSpan: { startRow: number; endRow: number } | null = null;
    let inputRSpan: { startRow: number; endRow: number } | null = null;

    for (const originalRow of populatedRows) {
      const cell = grid[originalRow][col];
      const type = cell.gate;
      if (!type) continue;

      const filteredRow = rowToFiltered.get(originalRow)!;

      if (type === GateType.CONTROL) {
        controls.push(filteredRow);
      } else if (type === GateType.ANTI_CONTROL) {
        antiControls.push(filteredRow);
      } else if (type === GateType.X_CONTROL) {
        xControls.push(filteredRow);
      } else if (type === GateType.X_ANTI_CONTROL) {
        xAntiControls.push(filteredRow);
      } else if (type === GateType.Y_CONTROL) {
        yControls.push(filteredRow);
      } else if (type === GateType.Y_ANTI_CONTROL) {
        yAntiControls.push(filteredRow);
      } else if (type === GateType.SWAP) {
        swaps.push(filteredRow);
      } else if (type === GateType.MEASURE) {
        measureRows.push(filteredRow);
      } else if (type === GateType.REVERSE && !cell.params?.isSpanContinuation) {
        // Only process anchor cells for REVERSE gates
        const span = cell.params?.reverseSpan;
        if (span) {
          // Map the span rows to filtered indices
          const filteredStart = rowToFiltered.get(span.startRow);
          const filteredEnd = rowToFiltered.get(span.endRow);
          if (filteredStart !== undefined && filteredEnd !== undefined) {
            reverseGates.push({ startRow: filteredStart, endRow: filteredEnd });
          }
        }
      }
      // Arithmetic input markers
      else if (type === GateType.INPUT_A && !cell.params?.isSpanContinuation) {
        const span = cell.params?.reverseSpan;
        if (span) {
          const filteredStart = rowToFiltered.get(span.startRow);
          const filteredEnd = rowToFiltered.get(span.endRow);
          if (filteredStart !== undefined && filteredEnd !== undefined) {
            inputASpan = { startRow: filteredStart, endRow: filteredEnd };
          }
        }
      } else if (type === GateType.INPUT_B && !cell.params?.isSpanContinuation) {
        const span = cell.params?.reverseSpan;
        if (span) {
          const filteredStart = rowToFiltered.get(span.startRow);
          const filteredEnd = rowToFiltered.get(span.endRow);
          if (filteredStart !== undefined && filteredEnd !== undefined) {
            inputBSpan = { startRow: filteredStart, endRow: filteredEnd };
          }
        }
      } else if (type === GateType.INPUT_R && !cell.params?.isSpanContinuation) {
        const span = cell.params?.reverseSpan;
        if (span) {
          const filteredStart = rowToFiltered.get(span.startRow);
          const filteredEnd = rowToFiltered.get(span.endRow);
          if (filteredStart !== undefined && filteredEnd !== undefined) {
            inputRSpan = { startRow: filteredStart, endRow: filteredEnd };
          }
        }
      }
      // Arithmetic spanning gates
      else if (isArithmeticFixed2x1Gate(type) && !cell.params?.isSpanContinuation) {
        const span = cell.params?.reverseSpan;
        if (span) {
          const filteredStart = rowToFiltered.get(span.startRow);
          const filteredEnd = rowToFiltered.get(span.endRow);
          if (filteredStart !== undefined && filteredEnd !== undefined) {
            arithmeticOps.push({ startRow: filteredStart, endRow: filteredEnd, gateType: type, originalRow });
          }
        }
      }
      // Comparison gates (single-qubit)
      else if (isArithmeticComparisonGate(type)) {
        comparisonOps.push({ row: filteredRow, gateType: type, originalRow });
      }
      // Scalar gates (single-qubit)
      else if (isArithmeticScalarGate(type)) {
        scalarOps.push({ row: filteredRow, gateType: type });
      }
      // Skip input marker and arithmetic continuation cells
      else if (!isArithmeticInputGate(type) &&
               !isArithmeticFixed2x1Gate(type) &&
               type !== GateType.REVERSE) {
        operations.push({ row: filteredRow, type, params: cell.params });
      }
    }

    // Apply basis transformations for X/Y controls
    // X-basis: apply H to transform |+⟩/|-⟩ to |0⟩/|1⟩
    for (const r of [...xControls, ...xAntiControls]) {
      currentState = applyGate(currentState, GateType.H, r, 0, numFilteredRows);
    }
    // Y-basis: apply S†H to transform |+i⟩/|-i⟩ to |0⟩/|1⟩
    for (const r of [...yControls, ...yAntiControls]) {
      // S† = [[1, 0], [0, -i]]
      currentState = applySdagger(currentState, r, numFilteredRows);
      currentState = applyGate(currentState, GateType.H, r, 0, numFilteredRows);
    }

    // Calculate control mask (bits that must be 1)
    // After basis transformation:
    // - H maps |+⟩ → |0⟩ and |-⟩ → |1⟩
    // - S†H maps |+i⟩ → |0⟩ and |-i⟩ → |1⟩
    // So X_CONTROL (triggers on |+⟩) becomes anti-control (triggers on |0⟩) after H
    // And X_ANTI_CONTROL (triggers on |-⟩) becomes control (triggers on |1⟩) after H
    let controlMask = 0;
    for (const r of controls) {
      controlMask |= (1 << (numFilteredRows - 1 - r));
    }
    // X/Y anti-controls trigger on |-⟩/|-i⟩ which become |1⟩ after basis change
    for (const r of xAntiControls) {
      controlMask |= (1 << (numFilteredRows - 1 - r));
    }
    for (const r of yAntiControls) {
      controlMask |= (1 << (numFilteredRows - 1 - r));
    }

    // Calculate anti-control mask (bits that must be 0)
    let antiControlMask = 0;
    for (const r of antiControls) {
      antiControlMask |= (1 << (numFilteredRows - 1 - r));
    }
    // X/Y controls trigger on |+⟩/|+i⟩ which become |0⟩ after basis change
    for (const r of xControls) {
      antiControlMask |= (1 << (numFilteredRows - 1 - r));
    }
    for (const r of yControls) {
      antiControlMask |= (1 << (numFilteredRows - 1 - r));
    }

    // Apply SWAPs
    const swapPairs: [number, number][] = [];
    for (let i = 0; i < swaps.length - 1; i += 2) {
      swapPairs.push([swaps[i], swaps[i + 1]]);
    }
    for (const [r1, r2] of swapPairs) {
      currentState = applySwapWithAntiControl(currentState, r1, r2, controlMask, antiControlMask, numFilteredRows);
    }

    // Apply gates with both control and anti-control masks
    for (const op of operations) {
      currentState = applyGateWithAntiControl(currentState, op.type, op.row, controlMask, antiControlMask, numFilteredRows, op.params);
    }

    // Apply REVERSE gates (bit-reversal permutation)
    for (const rev of reverseGates) {
      currentState = applyBitReversePermutation(currentState, rev.startRow, rev.endRow, numFilteredRows);
    }

    // Apply arithmetic spanning gates (permutations)
    for (const arithOp of arithmeticOps) {
      // Check for missing required inputs and generate warnings
      const requiresA = isRequiresInputAGate(arithOp.gateType);
      const requiresB = isRequiresInputBGate(arithOp.gateType);
      const requiresR = isRequiresInputRGate(arithOp.gateType);

      if (requiresA && !inputASpan) {
        warnings.push({
          column: col,
          row: arithOp.originalRow,
          gateType: arithOp.gateType,
          message: `${arithOp.gateType} gate requires INPUT_A marker in the same column`,
          category: 'missing_input'
        });
      }
      if (requiresB && !inputBSpan) {
        warnings.push({
          column: col,
          row: arithOp.originalRow,
          gateType: arithOp.gateType,
          message: `${arithOp.gateType} gate requires INPUT_B marker in the same column`,
          category: 'missing_input'
        });
      }
      if (requiresR && !inputRSpan) {
        warnings.push({
          column: col,
          row: arithOp.originalRow,
          gateType: arithOp.gateType,
          message: `${arithOp.gateType} gate requires INPUT_R marker in the same column`,
          category: 'missing_input'
        });
      }

      // Apply the gate (it will act as identity if inputs are missing)
      currentState = applyArithmeticPermutationDynamic(
        currentState,
        arithOp.gateType,
        arithOp.startRow,
        arithOp.endRow,
        inputASpan,
        inputBSpan,
        inputRSpan,
        controlMask,
        antiControlMask,
        numFilteredRows
      );
    }

    // Apply comparison gates (single-qubit conditional flips)
    for (const compOp of comparisonOps) {
      // Comparison gates require both INPUT_A and INPUT_B
      if (!inputASpan || !inputBSpan) {
        if (!inputASpan) {
          warnings.push({
            column: col,
            row: compOp.originalRow,
            gateType: compOp.gateType,
            message: `${compOp.gateType} gate requires INPUT_A marker in the same column`,
            category: 'missing_input'
          });
        }
        if (!inputBSpan) {
          warnings.push({
            column: col,
            row: compOp.originalRow,
            gateType: compOp.gateType,
            message: `${compOp.gateType} gate requires INPUT_B marker in the same column`,
            category: 'missing_input'
          });
        }
        // Skip applying the gate since inputs are missing
        continue;
      }

      currentState = applyComparisonGate(
        currentState,
        compOp.gateType,
        compOp.row,
        inputASpan.startRow,
        inputASpan.endRow,
        inputBSpan.startRow,
        inputBSpan.endRow,
        controlMask,
        antiControlMask,
        numFilteredRows
      );
    }

    // Apply scalar gates (amplitude multiplications)
    for (const scalarOp of scalarOps) {
      currentState = applyScalarGate(
        currentState,
        scalarOp.gateType,
        scalarOp.row,
        controlMask,
        antiControlMask,
        numFilteredRows
      );
    }

    // Undo basis transformations for X/Y controls
    for (const r of [...xControls, ...xAntiControls]) {
      currentState = applyGate(currentState, GateType.H, r, 0, numFilteredRows);
    }
    for (const r of [...yControls, ...yAntiControls]) {
      currentState = applyGate(currentState, GateType.H, r, 0, numFilteredRows);
      currentState = applyS(currentState, r, numFilteredRows);
    }

    // Perform measurements (collapse the state)
    for (const row of measureRows) {
      const { result, probability, collapsedState } = measureQubit(currentState, row, numFilteredRows);
      // Map back to original row index for the measurement result
      const originalRow = populatedRows[row];
      measurements.push({ qubit: originalRow, result, probability });
      currentState = collapsedState;
    }
  }

  return { finalState: toComplexObjectArray(currentState), measurements, populatedRows, warnings };
};
