export type Complex = {
  re: number;
  im: number;
};

export enum GateType {
  // Single-qubit gates
  X = 'X',
  Y = 'Y',
  Z = 'Z',
  H = 'H',
  S = 'S',
  T = 'T',
  I = 'I',           // Identity gate

  // Square root gates (±90° rotations)
  SDG = 'SDG',       // S-dagger (Z^{-1/2}) = -90° around Z
  SQRT_X = 'SQRT_X', // √X (X^{1/2}) = 90° around X
  SQRT_X_DG = 'SQRT_X_DG', // √X† (X^{-1/2}) = -90° around X
  SQRT_Y = 'SQRT_Y', // √Y (Y^{1/2}) = 90° around Y
  SQRT_Y_DG = 'SQRT_Y_DG', // √Y† (Y^{-1/2}) = -90° around Y

  // Rotation gates (parameterized)
  RX = 'RX',
  RY = 'RY',
  RZ = 'RZ',

  // Preset rotation gates (fixed angles, no prompt)
  RX_PI_2 = 'RX_PI_2',
  RX_PI_4 = 'RX_PI_4',
  RX_PI_8 = 'RX_PI_8',
  RX_PI_12 = 'RX_PI_12',
  RY_PI_2 = 'RY_PI_2',
  RY_PI_4 = 'RY_PI_4',
  RY_PI_8 = 'RY_PI_8',
  RY_PI_12 = 'RY_PI_12',
  RZ_PI_2 = 'RZ_PI_2',
  RZ_PI_4 = 'RZ_PI_4',
  RZ_PI_8 = 'RZ_PI_8',
  RZ_PI_12 = 'RZ_PI_12',

  // Multi-qubit gates
  CX = 'CX',         // Acts as X (NOT), visualizes as target
  CZ = 'CZ',         // Acts as Z, visualizes as target
  SWAP = 'SWAP',
  CONTROL = 'CONTROL', // Control dot (conditions on |1⟩)
  ANTI_CONTROL = 'ANTI_CONTROL', // Anti-control (conditions on |0⟩)
  X_CONTROL = 'X_CONTROL',       // X-basis control (conditions on |+⟩)
  X_ANTI_CONTROL = 'X_ANTI_CONTROL', // X-basis anti-control (conditions on |-⟩)
  Y_CONTROL = 'Y_CONTROL',       // Y-basis control (conditions on |+i⟩)
  Y_ANTI_CONTROL = 'Y_ANTI_CONTROL', // Y-basis anti-control (conditions on |-i⟩)
  CCX = 'CCX',       // Toffoli gate (double-controlled NOT)

  // Special gates
  MEASURE = 'MEASURE', // Measurement gate
  CUSTOM = 'CUSTOM',   // User-defined gate
  REVERSE = 'REVERSE', // Bit-reversal permutation gate (spans multiple qubits)

  // Arithmetic gates - Column 1: Increment/Decrement
  INC = 'INC',           // +1: Increment by 1
  DEC = 'DEC',           // -1: Decrement by 1
  ADD_A = 'ADD_A',       // +A: Add value from inputA register
  SUB_A = 'SUB_A',       // -A: Subtract value from inputA register

  // Arithmetic gates - Column 2: Multiply/Divide
  MUL_A = 'MUL_A',       // ×A: Multiply by inputA (must be odd)
  DIV_A = 'DIV_A',       // ÷A: Divide by inputA (multiply by modular inverse)
  MUL_B = 'MUL_B',       // ×B: Multiply by inputB (must be odd)
  DIV_B = 'DIV_B',       // ÷B: Divide by inputB (multiply by modular inverse)

  // Arithmetic gates - Column 3: Inequalities
  A_LT_B = 'A_LT_B',     // A<B: Flip target if A < B
  A_LEQ_B = 'A_LEQ_B',   // A≤B: Flip target if A ≤ B
  A_GT_B = 'A_GT_B',     // A>B: Flip target if A > B
  A_GEQ_B = 'A_GEQ_B',   // A≥B: Flip target if A ≥ B

  // Arithmetic gates - Column 4: Equalities
  A_EQ_B = 'A_EQ_B',     // A=B: Flip target if A equals B
  A_NEQ_B = 'A_NEQ_B',   // A≠B: Flip target if A not equals B

  // Arithmetic gates - Column 5: Modular Increment/Decrement
  INC_MOD_R = 'INC_MOD_R',   // +1%R: Increment mod R
  DEC_MOD_R = 'DEC_MOD_R',   // -1%R: Decrement mod R

  // Arithmetic gates - Column 6: Modular Arithmetic on A
  ADD_A_MOD_R = 'ADD_A_MOD_R',   // +A%R: Add A mod R
  SUB_A_MOD_R = 'SUB_A_MOD_R',   // -A%R: Subtract A mod R
  MUL_A_MOD_R = 'MUL_A_MOD_R',   // ×A%R: Multiply by A mod R
  DIV_A_MOD_R = 'DIV_A_MOD_R',   // ÷A%R: Divide by A mod R

  // Arithmetic gates - Column 7: Imaginary Scalars
  SCALE_I = 'SCALE_I',           // ×i: Multiply amplitude by i
  SCALE_NEG_I = 'SCALE_NEG_I',   // ×-i: Multiply amplitude by -i
  SCALE_SQRT_I = 'SCALE_SQRT_I',       // ×√i: Multiply amplitude by √i
  SCALE_SQRT_NEG_I = 'SCALE_SQRT_NEG_I', // ×√-i: Multiply amplitude by √-i

  // Arithmetic input markers (read-only register markers)
  INPUT_A = 'INPUT_A',   // Marks qubits as A register
  INPUT_B = 'INPUT_B',   // Marks qubits as B register
  INPUT_R = 'INPUT_R',   // Marks qubits as R register (modulus)

  // Legacy (kept for compatibility, consider removing)
  EMPTY = 'EMPTY'
}

/** Gates that are parameterized and require an angle value */
export const PARAMETERIZED_GATES = [GateType.RX, GateType.RY, GateType.RZ] as const;

/** Gates that require fixed positioning (multi-qubit operations) */
export const FIXED_POSITION_GATES = [
  GateType.SWAP,
  GateType.CONTROL,
  GateType.ANTI_CONTROL,
  GateType.X_CONTROL,
  GateType.X_ANTI_CONTROL,
  GateType.Y_CONTROL,
  GateType.Y_ANTI_CONTROL,
  GateType.CX,
  GateType.CZ,
  GateType.CCX,
] as const;

/** All control-type gates (for rendering connector lines) */
export const CONTROL_GATES = [
  GateType.CONTROL,
  GateType.ANTI_CONTROL,
  GateType.X_CONTROL,
  GateType.X_ANTI_CONTROL,
  GateType.Y_CONTROL,
  GateType.Y_ANTI_CONTROL,
] as const;

/** Fixed 2x1 arithmetic gates (non-resizable, span exactly 2 rows) */
export const ARITHMETIC_FIXED_2X1_GATES = [
  // Column 1: Increment/Decrement
  GateType.INC,
  GateType.DEC,
  GateType.ADD_A,
  GateType.SUB_A,
  // Column 2: Multiply/Divide
  GateType.MUL_A,
  GateType.DIV_A,
  GateType.MUL_B,
  GateType.DIV_B,
  // Column 5: Modular Inc/Dec
  GateType.INC_MOD_R,
  GateType.DEC_MOD_R,
  // Column 6: Modular Arithmetic
  GateType.ADD_A_MOD_R,
  GateType.SUB_A_MOD_R,
  GateType.MUL_A_MOD_R,
  GateType.DIV_A_MOD_R,
  // Comparison gates (also 2x1)
  GateType.A_LT_B,
  GateType.A_LEQ_B,
  GateType.A_GT_B,
  GateType.A_GEQ_B,
  GateType.A_EQ_B,
  GateType.A_NEQ_B,
] as const;

/** @deprecated Use ARITHMETIC_FIXED_2X1_GATES instead */
export const ARITHMETIC_SPANNING_GATES = ARITHMETIC_FIXED_2X1_GATES;

/** Arithmetic input marker gates (fixed 2x1, non-resizable) */
export const ARITHMETIC_INPUT_GATES = [
  GateType.INPUT_A,
  GateType.INPUT_B,
  GateType.INPUT_R,
] as const;

/** All fixed 2x1 gates (inputs + arithmetic operations) */
export const ALL_FIXED_2X1_GATES = [
  ...ARITHMETIC_FIXED_2X1_GATES,
  ...ARITHMETIC_INPUT_GATES,
] as const;

/** Arithmetic comparison gates (2x1 blocks) */
export const ARITHMETIC_COMPARISON_GATES = [
  GateType.A_LT_B,
  GateType.A_LEQ_B,
  GateType.A_GT_B,
  GateType.A_GEQ_B,
  GateType.A_EQ_B,
  GateType.A_NEQ_B,
] as const;

/** Arithmetic scalar gates (single-qubit, multiply amplitudes) */
export const ARITHMETIC_SCALAR_GATES = [
  GateType.SCALE_I,
  GateType.SCALE_NEG_I,
  GateType.SCALE_SQRT_I,
  GateType.SCALE_SQRT_NEG_I,
] as const;

/** Arithmetic gates - Dark blue (columns 1-2: inc/dec, mul/div) */
export const ARITHMETIC_DARK_BLUE_GATES = [
  GateType.INC,
  GateType.DEC,
  GateType.ADD_A,
  GateType.SUB_A,
  GateType.MUL_A,
  GateType.DIV_A,
  GateType.MUL_B,
  GateType.DIV_B,
] as const;

/** Arithmetic gates - Violet (comparison gates) */
export const ARITHMETIC_VIOLET_GATES = [
  GateType.A_LT_B,
  GateType.A_LEQ_B,
  GateType.A_GT_B,
  GateType.A_GEQ_B,
  GateType.A_EQ_B,
  GateType.A_NEQ_B,
] as const;

/** Arithmetic gates - Lilac (mod gates) */
export const ARITHMETIC_LILAC_GATES = [
  GateType.INC_MOD_R,
  GateType.DEC_MOD_R,
  GateType.ADD_A_MOD_R,
  GateType.SUB_A_MOD_R,
  GateType.MUL_A_MOD_R,
  GateType.DIV_A_MOD_R,
] as const;

/** Arithmetic gates - Pink (imaginary scalar gates) */
export const ARITHMETIC_PINK_GATES = [
  GateType.SCALE_I,
  GateType.SCALE_NEG_I,
  GateType.SCALE_SQRT_I,
  GateType.SCALE_SQRT_NEG_I,
] as const;

/** All arithmetic gates with purple-ish colors (for backwards compat) */
export const ARITHMETIC_PURPLE_GATES = [
  ...ARITHMETIC_VIOLET_GATES,
  ...ARITHMETIC_LILAC_GATES,
  ...ARITHMETIC_PINK_GATES,
] as const;

/** Gates requiring inputA in same column */
export const REQUIRES_INPUT_A = [
  GateType.ADD_A,
  GateType.SUB_A,
  GateType.MUL_A,
  GateType.DIV_A,
  GateType.A_LT_B,
  GateType.A_LEQ_B,
  GateType.A_GT_B,
  GateType.A_GEQ_B,
  GateType.A_EQ_B,
  GateType.A_NEQ_B,
  GateType.ADD_A_MOD_R,
  GateType.SUB_A_MOD_R,
  GateType.MUL_A_MOD_R,
  GateType.DIV_A_MOD_R,
] as const;

/** Gates requiring inputB in same column */
export const REQUIRES_INPUT_B = [
  GateType.MUL_B,
  GateType.DIV_B,
  GateType.A_LT_B,
  GateType.A_LEQ_B,
  GateType.A_GT_B,
  GateType.A_GEQ_B,
  GateType.A_EQ_B,
  GateType.A_NEQ_B,
] as const;

/** Gates requiring inputR in same column */
export const REQUIRES_INPUT_R = [
  GateType.INC_MOD_R,
  GateType.DEC_MOD_R,
  GateType.ADD_A_MOD_R,
  GateType.SUB_A_MOD_R,
  GateType.MUL_A_MOD_R,
  GateType.DIV_A_MOD_R,
] as const;

export interface GateDef {
  type: GateType;
  label: string;
  fullName: string;
  description: string;
  matrixLabel: string;
  matrix: Complex[][];
  qubits: number;
  /** Whether this gate requires a parameter (like rotation angle) */
  isParameterized?: boolean;
}

/** Parameters for a gate instance in a cell */
export interface GateParams {
  /** Rotation angle for Rx, Ry, Rz gates (in radians) */
  angle?: number;
  /** Original angle expression as entered by user (e.g., "pi/4") */
  angleExpression?: string;
  /** Custom 2x2 matrix for CUSTOM gate type */
  customMatrix?: Complex[][];
  /** Optional label for custom gates */
  customLabel?: string;
  /** For REVERSE gate: defines the span of rows it covers */
  reverseSpan?: { startRow: number; endRow: number };
  /** For REVERSE gate: marks this cell as a continuation (not the anchor) */
  isSpanContinuation?: boolean;
}

export interface Cell {
  gate: GateType | null;
  id: string;
  /** Gate-specific parameters (angle, custom matrix, etc.) */
  params?: GateParams;
}

export type CircuitGrid = Cell[][];

export interface QuantumState {
  amplitude: Complex[];
  numQubits: number;
}

/** Result of a single qubit measurement */
export interface MeasurementOutcome {
  qubit: number;
  result: 0 | 1;
  probability: number;
}

/** Complete result of circuit simulation */
export interface SimulationResult {
  /** Final quantum state after simulation */
  finalState: QuantumState;
  /** Bloch vector coordinates for each qubit [x, y, z] */
  blochVectors: [number, number, number][];
  /** Measurement outcomes (if any measurement gates were applied) */
  measurements: MeasurementOutcome[];
  /** Number of gates applied */
  gateCount: number;
  /** Simulation time in milliseconds */
  simulationTimeMs: number;
}

/** Noise model configuration */
export interface NoiseModel {
  /** Probability of single-qubit gate error (0-1) */
  singleQubitErrorRate: number;
  /** Probability of two-qubit gate error (0-1) */
  twoQubitErrorRate: number;
  /** Probability of measurement error (0-1) */
  measurementErrorRate: number;
}

/** Result of noisy simulation */
export interface NoiseResult {
  /** Noisy final state */
  noisyState: QuantumState;
  /** Noisy Bloch vectors */
  noisyBlochVectors: [number, number, number][];
  /** Fidelity between ideal and noisy state (0-1) */
  fidelity: number;
  /** Number of errors that occurred during simulation */
  errorCount: number;
  /** Breakdown of errors by gate type */
  errorsByGateType: Record<GateType, number>;
}

/** Combined simulation output (ideal + noisy) */
export interface FullSimulationResult {
  ideal: SimulationResult;
  noisy?: NoiseResult;
  noiseModel?: NoiseModel;
}

/** A custom gate stored in the library */
export interface CustomGateDefinition {
  label: string;
  matrix: Complex[][];
}