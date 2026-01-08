export type Complex = {
  re: number;
  im: number;
};

/**
 * High-performance complex array using Float64Array with interleaved storage.
 * Layout: [re0, im0, re1, im1, re2, im2, ...]
 * Access: re = arr[i*2], im = arr[i*2+1]
 */
export type ComplexArray = Float64Array;

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

  // Time-parameterized gates (rotation = t full turns, t animates 0→1)
  ZT = 'ZT',           // Z^t: [[1, 0], [0, e^(i×2π×t)]]
  XT = 'XT',           // X^t: H × Z^t × H
  YT = 'YT',           // Y^t: √X† × Z^t × √X

  // Input-parameterized gates (rotation = A/2^n or B/2^n full turns)
  ZA = 'ZA',           // Z^A: Phase rotation based on inputA register
  XA = 'XA',           // X^A: X-axis rotation based on inputA register
  YA = 'YA',           // Y^A: Y-axis rotation based on inputA register
  ZB = 'ZB',           // Z^B: Phase rotation based on inputB register
  XB = 'XB',           // X^B: X-axis rotation based on inputB register
  YB = 'YB',           // Y^B: Y-axis rotation based on inputB register

  // Phase gradient gate (applies Z^(k/2^n) to each basis state k)
  PHASE_GRADIENT = 'PHASE_GRADIENT',

  // Exponential gates (e^(iπtZ), e^(iπtX), e^(iπtY) - time animated)
  EXP_Z = 'EXP_Z',         // e^(iπtZ) = [[e^(iπt), 0], [0, e^(-iπt)]]
  EXP_X = 'EXP_X',         // e^(iπtX) = [[cos(πt), i·sin(πt)], [i·sin(πt), cos(πt)]]
  EXP_Y = 'EXP_Y',         // e^(iπtY) = [[cos(πt), sin(πt)], [-sin(πt), cos(πt)]]

  // QFT gates (resizable spanning gates)
  QFT = 'QFT',             // Quantum Fourier Transform
  QFT_DG = 'QFT_DG',       // Inverse QFT (QFT†)

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

  // Visualization gates (inline state display, act as identity)
  BLOCH_VIS = 'BLOCH_VIS',     // Mini Bloch sphere showing qubit state at position
  PERCENT_VIS = 'PERCENT_VIS', // Percentage bar showing |1⟩ probability at position

  // Legacy (kept for compatibility, consider removing)
  EMPTY = 'EMPTY'
}

// ============================================================================
// Type Utilities
// ============================================================================

/** Extract element type from a readonly array */
type ArrayElement<T extends readonly unknown[]> = T[number];

// ============================================================================
// Gate Category Arrays with Type Guards
// ============================================================================

/** Gates that are parameterized and require an angle value */
export const PARAMETERIZED_GATES = [
  GateType.RX, GateType.RY, GateType.RZ
] as const satisfies readonly GateType[];

/** Union type of parameterized gates */
export type ParameterizedGate = ArrayElement<typeof PARAMETERIZED_GATES>;

/** Type guard: checks if a gate is parameterized */
export function isParameterizedGate(gate: GateType): gate is ParameterizedGate {
  return (PARAMETERIZED_GATES as readonly GateType[]).includes(gate);
}

/** Time-parameterized gates (use global time variable t that animates 0→1) */
export const TIME_PARAMETERIZED_GATES = [
  GateType.ZT, GateType.XT, GateType.YT,
] as const satisfies readonly GateType[];

/** Union type of time-parameterized gates */
export type TimeParameterizedGate = ArrayElement<typeof TIME_PARAMETERIZED_GATES>;

/** Type guard: checks if a gate is time-parameterized */
export function isTimeParameterizedGate(gate: GateType): gate is TimeParameterizedGate {
  return (TIME_PARAMETERIZED_GATES as readonly GateType[]).includes(gate);
}

/** Exponential gates (e^(iπtZ), e^(iπtX), e^(iπtY) - time animated) */
export const EXPONENTIAL_GATES = [
  GateType.EXP_Z, GateType.EXP_X, GateType.EXP_Y,
] as const satisfies readonly GateType[];

/** Union type of exponential gates */
export type ExponentialGate = ArrayElement<typeof EXPONENTIAL_GATES>;

/** Type guard: checks if a gate is an exponential gate */
export function isExponentialGate(gate: GateType): gate is ExponentialGate {
  return (EXPONENTIAL_GATES as readonly GateType[]).includes(gate);
}

/** QFT gates (Quantum Fourier Transform and inverse) */
export const QFT_GATES = [
  GateType.QFT, GateType.QFT_DG,
] as const satisfies readonly GateType[];

/** Union type of QFT gates */
export type QFTGate = ArrayElement<typeof QFT_GATES>;

/** Type guard: checks if a gate is a QFT gate */
export function isQFTGate(gate: GateType): gate is QFTGate {
  return (QFT_GATES as readonly GateType[]).includes(gate);
}

/** Input-parameterized gates using inputA register */
export const INPUT_PARAMETERIZED_GATES_A = [
  GateType.ZA, GateType.XA, GateType.YA,
] as const satisfies readonly GateType[];

/** Input-parameterized gates using inputB register */
export const INPUT_PARAMETERIZED_GATES_B = [
  GateType.ZB, GateType.XB, GateType.YB,
] as const satisfies readonly GateType[];

/** All input-parameterized gates */
export const INPUT_PARAMETERIZED_GATES = [
  ...INPUT_PARAMETERIZED_GATES_A,
  ...INPUT_PARAMETERIZED_GATES_B,
] as const satisfies readonly GateType[];

/** Union type of input-parameterized gates */
export type InputParameterizedGate = ArrayElement<typeof INPUT_PARAMETERIZED_GATES>;

/** Type guard: checks if a gate is input-parameterized (A variant) */
export function isInputParameterizedGateA(gate: GateType): boolean {
  return (INPUT_PARAMETERIZED_GATES_A as readonly GateType[]).includes(gate);
}

/** Type guard: checks if a gate is input-parameterized (B variant) */
export function isInputParameterizedGateB(gate: GateType): boolean {
  return (INPUT_PARAMETERIZED_GATES_B as readonly GateType[]).includes(gate);
}

/** Type guard: checks if a gate is input-parameterized */
export function isInputParameterizedGate(gate: GateType): gate is InputParameterizedGate {
  return (INPUT_PARAMETERIZED_GATES as readonly GateType[]).includes(gate);
}

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
] as const satisfies readonly GateType[];

/** Union type of fixed position gates */
export type FixedPositionGate = ArrayElement<typeof FIXED_POSITION_GATES>;

/** Type guard: checks if a gate requires fixed positioning */
export function isFixedPositionGate(gate: GateType): gate is FixedPositionGate {
  return (FIXED_POSITION_GATES as readonly GateType[]).includes(gate);
}

/** All control-type gates (for rendering connector lines) */
export const CONTROL_GATES = [
  GateType.CONTROL,
  GateType.ANTI_CONTROL,
  GateType.X_CONTROL,
  GateType.X_ANTI_CONTROL,
  GateType.Y_CONTROL,
  GateType.Y_ANTI_CONTROL,
] as const satisfies readonly GateType[];

/** Union type of control gates */
export type ControlGate = ArrayElement<typeof CONTROL_GATES>;

/** Type guard: checks if a gate is a control gate */
export function isControlGate(gate: GateType): gate is ControlGate {
  return (CONTROL_GATES as readonly GateType[]).includes(gate);
}

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
] as const satisfies readonly GateType[];

/** Union type of fixed 2x1 arithmetic gates */
export type ArithmeticFixed2x1Gate = ArrayElement<typeof ARITHMETIC_FIXED_2X1_GATES>;

/** Type guard: checks if a gate is a fixed 2x1 arithmetic gate */
export function isArithmeticFixed2x1Gate(gate: GateType): gate is ArithmeticFixed2x1Gate {
  return (ARITHMETIC_FIXED_2X1_GATES as readonly GateType[]).includes(gate);
}

/** @deprecated Use ARITHMETIC_FIXED_2X1_GATES instead */
export const ARITHMETIC_SPANNING_GATES = ARITHMETIC_FIXED_2X1_GATES;

/** Arithmetic input marker gates (fixed 2x1, non-resizable) */
export const ARITHMETIC_INPUT_GATES = [
  GateType.INPUT_A,
  GateType.INPUT_B,
  GateType.INPUT_R,
] as const satisfies readonly GateType[];

/** Union type of arithmetic input gates */
export type ArithmeticInputGate = ArrayElement<typeof ARITHMETIC_INPUT_GATES>;

/** Type guard: checks if a gate is an arithmetic input gate */
export function isArithmeticInputGate(gate: GateType): gate is ArithmeticInputGate {
  return (ARITHMETIC_INPUT_GATES as readonly GateType[]).includes(gate);
}

/** All fixed 2x1 gates (inputs + arithmetic operations) */
export const ALL_FIXED_2X1_GATES = [
  ...ARITHMETIC_FIXED_2X1_GATES,
  ...ARITHMETIC_INPUT_GATES,
] as const satisfies readonly GateType[];

/** Union type of all fixed 2x1 gates */
export type AllFixed2x1Gate = ArrayElement<typeof ALL_FIXED_2X1_GATES>;

/** Type guard: checks if a gate is any fixed 2x1 gate */
export function isAllFixed2x1Gate(gate: GateType): gate is AllFixed2x1Gate {
  return (ALL_FIXED_2X1_GATES as readonly GateType[]).includes(gate);
}

/** Arithmetic comparison gates (2x1 blocks) */
export const ARITHMETIC_COMPARISON_GATES = [
  GateType.A_LT_B,
  GateType.A_LEQ_B,
  GateType.A_GT_B,
  GateType.A_GEQ_B,
  GateType.A_EQ_B,
  GateType.A_NEQ_B,
] as const satisfies readonly GateType[];

/** Union type of arithmetic comparison gates */
export type ArithmeticComparisonGate = ArrayElement<typeof ARITHMETIC_COMPARISON_GATES>;

/** Type guard: checks if a gate is an arithmetic comparison gate */
export function isArithmeticComparisonGate(gate: GateType): gate is ArithmeticComparisonGate {
  return (ARITHMETIC_COMPARISON_GATES as readonly GateType[]).includes(gate);
}

/** Arithmetic scalar gates (single-qubit, multiply amplitudes) */
export const ARITHMETIC_SCALAR_GATES = [
  GateType.SCALE_I,
  GateType.SCALE_NEG_I,
  GateType.SCALE_SQRT_I,
  GateType.SCALE_SQRT_NEG_I,
] as const satisfies readonly GateType[];

/** Union type of arithmetic scalar gates */
export type ArithmeticScalarGate = ArrayElement<typeof ARITHMETIC_SCALAR_GATES>;

/** Type guard: checks if a gate is an arithmetic scalar gate */
export function isArithmeticScalarGate(gate: GateType): gate is ArithmeticScalarGate {
  return (ARITHMETIC_SCALAR_GATES as readonly GateType[]).includes(gate);
}

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
] as const satisfies readonly GateType[];

/** Union type of dark blue arithmetic gates */
export type ArithmeticDarkBlueGate = ArrayElement<typeof ARITHMETIC_DARK_BLUE_GATES>;

/** Type guard: checks if a gate is a dark blue arithmetic gate */
export function isArithmeticDarkBlueGate(gate: GateType): gate is ArithmeticDarkBlueGate {
  return (ARITHMETIC_DARK_BLUE_GATES as readonly GateType[]).includes(gate);
}

/** Arithmetic gates - Violet (comparison gates) */
export const ARITHMETIC_VIOLET_GATES = [
  GateType.A_LT_B,
  GateType.A_LEQ_B,
  GateType.A_GT_B,
  GateType.A_GEQ_B,
  GateType.A_EQ_B,
  GateType.A_NEQ_B,
] as const satisfies readonly GateType[];

/** Union type of violet arithmetic gates */
export type ArithmeticVioletGate = ArrayElement<typeof ARITHMETIC_VIOLET_GATES>;

/** Type guard: checks if a gate is a violet arithmetic gate */
export function isArithmeticVioletGate(gate: GateType): gate is ArithmeticVioletGate {
  return (ARITHMETIC_VIOLET_GATES as readonly GateType[]).includes(gate);
}

/** Arithmetic gates - Lilac (mod gates) */
export const ARITHMETIC_LILAC_GATES = [
  GateType.INC_MOD_R,
  GateType.DEC_MOD_R,
  GateType.ADD_A_MOD_R,
  GateType.SUB_A_MOD_R,
  GateType.MUL_A_MOD_R,
  GateType.DIV_A_MOD_R,
] as const satisfies readonly GateType[];

/** Union type of lilac arithmetic gates */
export type ArithmeticLilacGate = ArrayElement<typeof ARITHMETIC_LILAC_GATES>;

/** Type guard: checks if a gate is a lilac arithmetic gate */
export function isArithmeticLilacGate(gate: GateType): gate is ArithmeticLilacGate {
  return (ARITHMETIC_LILAC_GATES as readonly GateType[]).includes(gate);
}

/** Arithmetic gates - Pink (imaginary scalar gates) */
export const ARITHMETIC_PINK_GATES = [
  GateType.SCALE_I,
  GateType.SCALE_NEG_I,
  GateType.SCALE_SQRT_I,
  GateType.SCALE_SQRT_NEG_I,
] as const satisfies readonly GateType[];

/** Union type of pink arithmetic gates */
export type ArithmeticPinkGate = ArrayElement<typeof ARITHMETIC_PINK_GATES>;

/** Type guard: checks if a gate is a pink arithmetic gate */
export function isArithmeticPinkGate(gate: GateType): gate is ArithmeticPinkGate {
  return (ARITHMETIC_PINK_GATES as readonly GateType[]).includes(gate);
}

/** All arithmetic gates with purple-ish colors (for backwards compat) */
export const ARITHMETIC_PURPLE_GATES = [
  ...ARITHMETIC_VIOLET_GATES,
  ...ARITHMETIC_LILAC_GATES,
  ...ARITHMETIC_PINK_GATES,
] as const satisfies readonly GateType[];

/** Union type of purple arithmetic gates */
export type ArithmeticPurpleGate = ArrayElement<typeof ARITHMETIC_PURPLE_GATES>;

/** Type guard: checks if a gate is a purple arithmetic gate */
export function isArithmeticPurpleGate(gate: GateType): gate is ArithmeticPurpleGate {
  return (ARITHMETIC_PURPLE_GATES as readonly GateType[]).includes(gate);
}

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
  // Input-parameterized rotation gates
  GateType.ZA,
  GateType.XA,
  GateType.YA,
] as const satisfies readonly GateType[];

/** Union type of gates requiring inputA */
export type RequiresInputAGate = ArrayElement<typeof REQUIRES_INPUT_A>;

/** Type guard: checks if a gate requires inputA */
export function isRequiresInputAGate(gate: GateType): gate is RequiresInputAGate {
  return (REQUIRES_INPUT_A as readonly GateType[]).includes(gate);
}

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
  // Input-parameterized rotation gates
  GateType.ZB,
  GateType.XB,
  GateType.YB,
] as const satisfies readonly GateType[];

/** Union type of gates requiring inputB */
export type RequiresInputBGate = ArrayElement<typeof REQUIRES_INPUT_B>;

/** Type guard: checks if a gate requires inputB */
export function isRequiresInputBGate(gate: GateType): gate is RequiresInputBGate {
  return (REQUIRES_INPUT_B as readonly GateType[]).includes(gate);
}

/** Gates requiring inputR in same column */
export const REQUIRES_INPUT_R = [
  GateType.INC_MOD_R,
  GateType.DEC_MOD_R,
  GateType.ADD_A_MOD_R,
  GateType.SUB_A_MOD_R,
  GateType.MUL_A_MOD_R,
  GateType.DIV_A_MOD_R,
] as const satisfies readonly GateType[];

/** Union type of gates requiring inputR */
export type RequiresInputRGate = ArrayElement<typeof REQUIRES_INPUT_R>;

/** Type guard: checks if a gate requires inputR */
export function isRequiresInputRGate(gate: GateType): gate is RequiresInputRGate {
  return (REQUIRES_INPUT_R as readonly GateType[]).includes(gate);
}

// ============================================================================
// Spanning Gate Arrays (previously in App.tsx)
// ============================================================================

/** All gates that span multiple rows (REVERSE + PHASE_GRADIENT + QFT + fixed 2x1 gates) */
export const ALL_SPANNING_GATE_TYPES = [
  GateType.REVERSE,
  GateType.PHASE_GRADIENT,
  GateType.QFT,
  GateType.QFT_DG,
  ...ALL_FIXED_2X1_GATES,
] as const satisfies readonly GateType[];

/** Union type of spanning gates */
export type SpanningGate = ArrayElement<typeof ALL_SPANNING_GATE_TYPES>;

/** Type guard: checks if a gate spans multiple rows */
export function isSpanningGate(gate: GateType): gate is SpanningGate {
  return (ALL_SPANNING_GATE_TYPES as readonly GateType[]).includes(gate);
}

/** Type guard: checks if a string is a valid GateType enum value */
export function isValidGateType(value: string): value is GateType {
  return Object.values(GateType).includes(value as GateType);
}

/** Exhaustiveness check helper for switch statements */
export function assertNever(x: never): never {
  throw new Error(`Unexpected value: ${x}`);
}

/** Gates with resizable spans (REVERSE, PHASE_GRADIENT, QFT, QFT_DG) */
export const RESIZABLE_SPANNING_GATES = [
  GateType.REVERSE,
  GateType.PHASE_GRADIENT,
  GateType.QFT,
  GateType.QFT_DG,
] as const satisfies readonly GateType[];

/** Union type of resizable spanning gates */
export type ResizableSpanningGate = ArrayElement<typeof RESIZABLE_SPANNING_GATES>;

/** Type guard: checks if a gate has a resizable span */
export function isResizableSpanningGate(gate: GateType): gate is ResizableSpanningGate {
  return (RESIZABLE_SPANNING_GATES as readonly GateType[]).includes(gate);
}

/** Visualization gates (inline state display, act as identity) */
export const VISUALIZATION_GATES = [
  GateType.BLOCH_VIS,
  GateType.PERCENT_VIS,
] as const satisfies readonly GateType[];

/** Union type of visualization gates */
export type VisualizationGate = ArrayElement<typeof VISUALIZATION_GATES>;

/** Type guard: checks if a gate is a visualization gate */
export function isVisualizationGate(gate: GateType): gate is VisualizationGate {
  return (VISUALIZATION_GATES as readonly GateType[]).includes(gate);
}

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

/** Warning generated during circuit simulation */
export interface SimulationWarning {
  /** Column where the warning occurred (0-indexed) */
  column: number;
  /** Row where the warning occurred (0-indexed), if applicable */
  row?: number;
  /** The gate type that caused the warning */
  gateType: GateType;
  /** Human-readable warning message */
  message: string;
  /** Warning category for filtering/styling */
  category: 'missing_input' | 'invalid_operation' | 'no_effect';
}

// ============================================================================
// Circuit File Format (for save/load)
// ============================================================================

/** Metadata for a saved circuit file */
export interface CircuitFileMetadata {
  name: string;
  description?: string;
  createdAt: string;
}

/** Complete circuit file format for import/export */
export interface CircuitFile {
  version: string;
  metadata: CircuitFileMetadata;
  circuit: {
    rows: number;
    cols: number;
    grid: Cell[][];
  };
  customGates?: CustomGateDefinition[];
}
