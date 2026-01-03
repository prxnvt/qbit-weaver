import { GateDef, GateType, Complex } from './types';

// Math helpers
const ZERO: Complex = { re: 0, im: 0 };
const ONE: Complex = { re: 1, im: 0 };
const NEG_ONE: Complex = { re: -1, im: 0 };
const I: Complex = { re: 0, im: 1 };
const NEG_I: Complex = { re: 0, im: -1 };
const INV_SQRT2: Complex = { re: 1 / Math.sqrt(2), im: 0 };
const NEG_INV_SQRT2: Complex = { re: -1 / Math.sqrt(2), im: 0 };

// T gate phase: e^(i pi/4) = cos(pi/4) + i sin(pi/4) = 1/sqrt(2) + i/sqrt(2)
const T_PHASE: Complex = { re: 1 / Math.sqrt(2), im: 1 / Math.sqrt(2) };

// Layout constants (used for connector line calculations)
export const ROW_HEIGHT = 48;
export const CELL_WIDTH = 56; // Width of each gate cell in pixels

export const GATE_DEFS: Partial<Record<GateType, GateDef>> = {
  [GateType.X]: {
    type: GateType.X,
    label: 'X',
    fullName: 'Pauli-X',
    description: 'Pauli-X (NOT) Gate. Flips |0> to |1>.',
    matrixLabel: '[[0, 1], [1, 0]]',
    qubits: 1,
    matrix: [[ZERO, ONE], [ONE, ZERO]]
  },
  [GateType.Y]: {
    type: GateType.Y,
    label: 'Y',
    fullName: 'Pauli-Y',
    description: 'Pauli-Y Gate.',
    matrixLabel: '[[0, -i], [i, 0]]',
    qubits: 1,
    matrix: [[ZERO, NEG_I], [I, ZERO]]
  },
  [GateType.Z]: {
    type: GateType.Z,
    label: 'Z',
    fullName: 'Pauli-Z',
    description: 'Pauli-Z Gate. Phase flip.',
    matrixLabel: '[[1, 0], [0, -1]]',
    qubits: 1,
    matrix: [[ONE, ZERO], [ZERO, NEG_ONE]]
  },
  [GateType.H]: {
    type: GateType.H,
    label: 'H',
    fullName: 'Hadamard',
    description: 'Hadamard Gate. Superposition.',
    matrixLabel: 'H',
    qubits: 1,
    matrix: [[INV_SQRT2, INV_SQRT2], [INV_SQRT2, NEG_INV_SQRT2]]
  },
  [GateType.S]: {
    type: GateType.S,
    label: 'S',
    fullName: 'S',
    description: 'S Gate (Phase). Rotation by π/2 around Z.',
    matrixLabel: '[[1, 0], [0, i]]',
    qubits: 1,
    matrix: [[ONE, ZERO], [ZERO, I]]
  },
  [GateType.T]: {
    type: GateType.T,
    label: 'T',
    fullName: 'π/8 (T)',
    description: 'T Gate (π/8). Rotation by π/4 around Z.',
    matrixLabel: '[[1, 0], [0, e^iπ/4]]',
    qubits: 1,
    matrix: [[ONE, ZERO], [ZERO, T_PHASE]]
  },
  // Square root gates (±90° rotations)
  [GateType.SDG]: {
    type: GateType.SDG,
    label: 'S†',
    fullName: 'S† (Z^{-½})',
    description: 'S-dagger Gate. Rotation by -π/2 around Z.',
    matrixLabel: '[[1, 0], [0, -i]]',
    qubits: 1,
    matrix: [[ONE, ZERO], [ZERO, NEG_I]]
  },
  [GateType.SQRT_X]: {
    type: GateType.SQRT_X,
    label: '√X',
    fullName: '√X',
    description: 'Square root of X. Rotation by π/2 around X.',
    matrixLabel: '√X',
    qubits: 1,
    matrix: [[ONE, ZERO], [ZERO, ONE]] // Computed at runtime
  },
  [GateType.SQRT_X_DG]: {
    type: GateType.SQRT_X_DG,
    label: '√X†',
    fullName: '√X† (X^{-½})',
    description: 'Inverse square root of X. Rotation by -π/2 around X.',
    matrixLabel: '√X†',
    qubits: 1,
    matrix: [[ONE, ZERO], [ZERO, ONE]] // Computed at runtime
  },
  [GateType.SQRT_Y]: {
    type: GateType.SQRT_Y,
    label: '√Y',
    fullName: '√Y',
    description: 'Square root of Y. Rotation by π/2 around Y.',
    matrixLabel: '√Y',
    qubits: 1,
    matrix: [[ONE, ZERO], [ZERO, ONE]] // Computed at runtime
  },
  [GateType.SQRT_Y_DG]: {
    type: GateType.SQRT_Y_DG,
    label: '√Y†',
    fullName: '√Y† (Y^{-½})',
    description: 'Inverse square root of Y. Rotation by -π/2 around Y.',
    matrixLabel: '√Y†',
    qubits: 1,
    matrix: [[ONE, ZERO], [ZERO, ONE]] // Computed at runtime
  },
  [GateType.CX]: {
    type: GateType.CX,
    label: 'CNOT',
    fullName: 'CNOT Target',
    description: 'CNOT Target (⊕). Acts as X if controls are active.',
    matrixLabel: 'X',
    qubits: 1,
    matrix: [[ZERO, ONE], [ONE, ZERO]] // Same as X, logic handles control
  },
  [GateType.CZ]: {
    type: GateType.CZ,
    label: 'CZ',
    fullName: 'CZ Target',
    description: 'Controlled-Z Target. Acts as Z if controls are active.',
    matrixLabel: 'Z',
    qubits: 1,
    matrix: [[ONE, ZERO], [ZERO, NEG_ONE]] // Same as Z
  },
  [GateType.CONTROL]: {
    type: GateType.CONTROL,
    label: '•',
    fullName: 'Control',
    description: 'Control. Conditions on |1⟩ state.',
    matrixLabel: 'I',
    qubits: 1,
    matrix: [[ONE, ZERO], [ZERO, ONE]] // Identity, logic handles control
  },
  [GateType.ANTI_CONTROL]: {
    type: GateType.ANTI_CONTROL,
    label: '○',
    fullName: 'Anti-Ctrl',
    description: 'Anti-Control. Conditions on |0⟩ state.',
    matrixLabel: 'I',
    qubits: 1,
    matrix: [[ONE, ZERO], [ZERO, ONE]] // Identity, logic handles control
  },
  [GateType.X_CONTROL]: {
    type: GateType.X_CONTROL,
    label: 'XC',
    fullName: 'X Control',
    description: 'X-basis Control. Conditions on |+⟩ = (|0⟩+|1⟩)/√2.',
    matrixLabel: 'H',
    qubits: 1,
    matrix: [[INV_SQRT2, INV_SQRT2], [INV_SQRT2, NEG_INV_SQRT2]] // Hadamard to change basis
  },
  [GateType.X_ANTI_CONTROL]: {
    type: GateType.X_ANTI_CONTROL,
    label: 'XA',
    fullName: 'X Anti-Ctrl',
    description: 'X-basis Anti-Control. Conditions on |-⟩ = (|0⟩-|1⟩)/√2.',
    matrixLabel: 'H',
    qubits: 1,
    matrix: [[INV_SQRT2, INV_SQRT2], [INV_SQRT2, NEG_INV_SQRT2]] // Hadamard to change basis
  },
  [GateType.Y_CONTROL]: {
    type: GateType.Y_CONTROL,
    label: 'YC',
    fullName: 'Y Control',
    description: 'Y-basis Control. Conditions on |+i⟩ = (|0⟩+i|1⟩)/√2.',
    matrixLabel: 'S†H',
    qubits: 1,
    matrix: [[INV_SQRT2, INV_SQRT2], [INV_SQRT2, NEG_INV_SQRT2]] // Placeholder
  },
  [GateType.Y_ANTI_CONTROL]: {
    type: GateType.Y_ANTI_CONTROL,
    label: 'YA',
    fullName: 'Y Anti-Ctrl',
    description: 'Y-basis Anti-Control. Conditions on |-i⟩ = (|0⟩-i|1⟩)/√2.',
    matrixLabel: 'S†H',
    qubits: 1,
    matrix: [[INV_SQRT2, INV_SQRT2], [INV_SQRT2, NEG_INV_SQRT2]] // Placeholder
  },
  [GateType.SWAP]: {
    type: GateType.SWAP,
    label: 'SWP',
    fullName: 'Swap',
    description: 'SWAP. Swaps connected qubits.',
    matrixLabel: 'SWAP',
    qubits: 1, // Handled specially in logic
    matrix: [[ONE, ZERO], [ZERO, ONE]]
  },
  [GateType.EMPTY]: {
    type: GateType.EMPTY,
    label: '',
    fullName: 'Identity',
    description: 'Identity',
    matrixLabel: 'I',
    qubits: 1,
    matrix: [[ONE, ZERO], [ZERO, ONE]]
  },
  [GateType.I]: {
    type: GateType.I,
    label: 'I',
    fullName: 'Identity',
    description: 'Identity Gate. Does nothing (wire spacer).',
    matrixLabel: '[[1, 0], [0, 1]]',
    qubits: 1,
    matrix: [[ONE, ZERO], [ZERO, ONE]]
  },
  [GateType.RX]: {
    type: GateType.RX,
    label: 'Rx',
    fullName: 'Rotation X',
    description: 'Rotation around X-axis by angle θ.',
    matrixLabel: 'Rx(θ)',
    qubits: 1,
    isParameterized: true,
    matrix: [[ONE, ZERO], [ZERO, ONE]] // Placeholder, computed at runtime
  },
  [GateType.RY]: {
    type: GateType.RY,
    label: 'Ry',
    fullName: 'Rotation Y',
    description: 'Rotation around Y-axis by angle θ.',
    matrixLabel: 'Ry(θ)',
    qubits: 1,
    isParameterized: true,
    matrix: [[ONE, ZERO], [ZERO, ONE]] // Placeholder, computed at runtime
  },
  [GateType.RZ]: {
    type: GateType.RZ,
    label: 'Rz',
    fullName: 'Rotation Z',
    description: 'Rotation around Z-axis by angle θ.',
    matrixLabel: 'Rz(θ)',
    qubits: 1,
    isParameterized: true,
    matrix: [[ONE, ZERO], [ZERO, ONE]] // Placeholder, computed at runtime
  },
  // Preset RX gates
  [GateType.RX_PI_2]: {
    type: GateType.RX_PI_2,
    label: 'Rx',
    fullName: 'Rx(π/2)',
    description: 'Rotation around X-axis by π/2.',
    matrixLabel: 'Rx(π/2)',
    qubits: 1,
    matrix: [[ONE, ZERO], [ZERO, ONE]] // Computed at runtime
  },
  [GateType.RX_PI_4]: {
    type: GateType.RX_PI_4,
    label: 'Rx',
    fullName: 'Rx(π/4)',
    description: 'Rotation around X-axis by π/4.',
    matrixLabel: 'Rx(π/4)',
    qubits: 1,
    matrix: [[ONE, ZERO], [ZERO, ONE]]
  },
  [GateType.RX_PI_8]: {
    type: GateType.RX_PI_8,
    label: 'Rx',
    fullName: 'Rx(π/8)',
    description: 'Rotation around X-axis by π/8.',
    matrixLabel: 'Rx(π/8)',
    qubits: 1,
    matrix: [[ONE, ZERO], [ZERO, ONE]]
  },
  [GateType.RX_PI_12]: {
    type: GateType.RX_PI_12,
    label: 'Rx',
    fullName: 'Rx(π/12)',
    description: 'Rotation around X-axis by π/12.',
    matrixLabel: 'Rx(π/12)',
    qubits: 1,
    matrix: [[ONE, ZERO], [ZERO, ONE]]
  },
  // Preset RY gates
  [GateType.RY_PI_2]: {
    type: GateType.RY_PI_2,
    label: 'Ry',
    fullName: 'Ry(π/2)',
    description: 'Rotation around Y-axis by π/2.',
    matrixLabel: 'Ry(π/2)',
    qubits: 1,
    matrix: [[ONE, ZERO], [ZERO, ONE]]
  },
  [GateType.RY_PI_4]: {
    type: GateType.RY_PI_4,
    label: 'Ry',
    fullName: 'Ry(π/4)',
    description: 'Rotation around Y-axis by π/4.',
    matrixLabel: 'Ry(π/4)',
    qubits: 1,
    matrix: [[ONE, ZERO], [ZERO, ONE]]
  },
  [GateType.RY_PI_8]: {
    type: GateType.RY_PI_8,
    label: 'Ry',
    fullName: 'Ry(π/8)',
    description: 'Rotation around Y-axis by π/8.',
    matrixLabel: 'Ry(π/8)',
    qubits: 1,
    matrix: [[ONE, ZERO], [ZERO, ONE]]
  },
  [GateType.RY_PI_12]: {
    type: GateType.RY_PI_12,
    label: 'Ry',
    fullName: 'Ry(π/12)',
    description: 'Rotation around Y-axis by π/12.',
    matrixLabel: 'Ry(π/12)',
    qubits: 1,
    matrix: [[ONE, ZERO], [ZERO, ONE]]
  },
  // Preset RZ gates
  [GateType.RZ_PI_2]: {
    type: GateType.RZ_PI_2,
    label: 'Rz',
    fullName: 'Rz(π/2)',
    description: 'Rotation around Z-axis by π/2.',
    matrixLabel: 'Rz(π/2)',
    qubits: 1,
    matrix: [[ONE, ZERO], [ZERO, ONE]]
  },
  [GateType.RZ_PI_4]: {
    type: GateType.RZ_PI_4,
    label: 'Rz',
    fullName: 'Rz(π/4)',
    description: 'Rotation around Z-axis by π/4.',
    matrixLabel: 'Rz(π/4)',
    qubits: 1,
    matrix: [[ONE, ZERO], [ZERO, ONE]]
  },
  [GateType.RZ_PI_8]: {
    type: GateType.RZ_PI_8,
    label: 'Rz',
    fullName: 'Rz(π/8)',
    description: 'Rotation around Z-axis by π/8.',
    matrixLabel: 'Rz(π/8)',
    qubits: 1,
    matrix: [[ONE, ZERO], [ZERO, ONE]]
  },
  [GateType.RZ_PI_12]: {
    type: GateType.RZ_PI_12,
    label: 'Rz',
    fullName: 'Rz(π/12)',
    description: 'Rotation around Z-axis by π/12.',
    matrixLabel: 'Rz(π/12)',
    qubits: 1,
    matrix: [[ONE, ZERO], [ZERO, ONE]]
  },
  [GateType.CCX]: {
    type: GateType.CCX,
    label: 'CCX',
    fullName: 'Toffoli',
    description: 'Toffoli (CCX) Gate. Flips target if both controls are |1⟩.',
    matrixLabel: 'CCX',
    qubits: 3,
    matrix: [[ZERO, ONE], [ONE, ZERO]] // Same as X, logic handles controls
  },
  [GateType.MEASURE]: {
    type: GateType.MEASURE,
    label: 'M',
    fullName: 'Measure',
    description: 'Measurement. Collapses qubit to |0⟩ or |1⟩.',
    matrixLabel: 'M',
    qubits: 1,
    matrix: [[ONE, ZERO], [ZERO, ONE]] // Identity placeholder
  },
  [GateType.CUSTOM]: {
    type: GateType.CUSTOM,
    label: 'U',
    fullName: 'Custom',
    description: 'Custom unitary gate defined by user.',
    matrixLabel: 'U',
    qubits: 1,
    matrix: [[ONE, ZERO], [ZERO, ONE]] // Placeholder, defined by user
  },
  [GateType.REVERSE]: {
    type: GateType.REVERSE,
    label: 'Rv',
    fullName: 'Reverse',
    description: 'Bit-reversal permutation. Reverses qubit order within span.',
    matrixLabel: 'Rv',
    qubits: -1, // Variable: depends on span
    matrix: [[ONE, ZERO], [ZERO, ONE]] // Computed at runtime based on span
  },

  // ============================================================================
  // ARITHMETIC GATES - Column 1: Increment/Decrement
  // ============================================================================
  [GateType.INC]: {
    type: GateType.INC,
    label: '+1',
    fullName: 'Increment',
    description: 'Increment: |k⟩ → |(k + 1) mod 2ⁿ⟩. Adds 1 to register value.',
    matrixLabel: '+1',
    qubits: -1, // Variable: depends on span
    matrix: [[ONE, ZERO], [ZERO, ONE]] // Permutation computed at runtime
  },
  [GateType.DEC]: {
    type: GateType.DEC,
    label: '-1',
    fullName: 'Decrement',
    description: 'Decrement: |k⟩ → |(k - 1) mod 2ⁿ⟩. Subtracts 1 from register value.',
    matrixLabel: '-1',
    qubits: -1,
    matrix: [[ONE, ZERO], [ZERO, ONE]]
  },
  [GateType.ADD_A]: {
    type: GateType.ADD_A,
    label: '+A',
    fullName: 'Add A',
    description: 'Add A: |E⟩ → |(E + A) mod 2ⁿ⟩. Requires inputA in same column.',
    matrixLabel: '+A',
    qubits: -1,
    matrix: [[ONE, ZERO], [ZERO, ONE]]
  },
  [GateType.SUB_A]: {
    type: GateType.SUB_A,
    label: '-A',
    fullName: 'Subtract A',
    description: 'Subtract A: |E⟩ → |(E - A) mod 2ⁿ⟩. Requires inputA in same column.',
    matrixLabel: '-A',
    qubits: -1,
    matrix: [[ONE, ZERO], [ZERO, ONE]]
  },

  // ============================================================================
  // ARITHMETIC GATES - Column 2: Multiply/Divide
  // ============================================================================
  [GateType.MUL_A]: {
    type: GateType.MUL_A,
    label: '×A',
    fullName: 'Multiply by A',
    description: 'Multiply: |E⟩ → |(E × A) mod 2ⁿ⟩. A must be odd. Requires inputA.',
    matrixLabel: '×A',
    qubits: -1,
    matrix: [[ONE, ZERO], [ZERO, ONE]]
  },
  [GateType.DIV_A]: {
    type: GateType.DIV_A,
    label: '÷A',
    fullName: 'Divide by A',
    description: 'Divide: |E⟩ → |(E × A⁻¹) mod 2ⁿ⟩. A must be odd. Requires inputA.',
    matrixLabel: '÷A',
    qubits: -1,
    matrix: [[ONE, ZERO], [ZERO, ONE]]
  },
  [GateType.MUL_B]: {
    type: GateType.MUL_B,
    label: '×B',
    fullName: 'Multiply by B',
    description: 'Multiply: |E⟩ → |(E × B) mod 2ⁿ⟩. B must be odd. Requires inputB.',
    matrixLabel: '×B',
    qubits: -1,
    matrix: [[ONE, ZERO], [ZERO, ONE]]
  },
  [GateType.DIV_B]: {
    type: GateType.DIV_B,
    label: '÷B',
    fullName: 'Divide by B',
    description: 'Divide: |E⟩ → |(E × B⁻¹) mod 2ⁿ⟩. B must be odd. Requires inputB.',
    matrixLabel: '÷B',
    qubits: -1,
    matrix: [[ONE, ZERO], [ZERO, ONE]]
  },

  // ============================================================================
  // ARITHMETIC GATES - Column 3: Inequalities
  // ============================================================================
  [GateType.A_LT_B]: {
    type: GateType.A_LT_B,
    label: 'A<B',
    fullName: 'A Less Than B',
    description: 'Flip target if A < B: |t⟩ → |t ⊕ (A < B)⟩. Requires inputA and inputB.',
    matrixLabel: 'A<B',
    qubits: 1,
    matrix: [[ONE, ZERO], [ZERO, ONE]] // X or I depending on comparison
  },
  [GateType.A_LEQ_B]: {
    type: GateType.A_LEQ_B,
    label: 'A≤B',
    fullName: 'A Less Than or Equal B',
    description: 'Flip target if A ≤ B: |t⟩ → |t ⊕ (A ≤ B)⟩. Requires inputA and inputB.',
    matrixLabel: 'A≤B',
    qubits: 1,
    matrix: [[ONE, ZERO], [ZERO, ONE]]
  },
  [GateType.A_GT_B]: {
    type: GateType.A_GT_B,
    label: 'A>B',
    fullName: 'A Greater Than B',
    description: 'Flip target if A > B: |t⟩ → |t ⊕ (A > B)⟩. Requires inputA and inputB.',
    matrixLabel: 'A>B',
    qubits: 1,
    matrix: [[ONE, ZERO], [ZERO, ONE]]
  },
  [GateType.A_GEQ_B]: {
    type: GateType.A_GEQ_B,
    label: 'A≥B',
    fullName: 'A Greater Than or Equal B',
    description: 'Flip target if A ≥ B: |t⟩ → |t ⊕ (A ≥ B)⟩. Requires inputA and inputB.',
    matrixLabel: 'A≥B',
    qubits: 1,
    matrix: [[ONE, ZERO], [ZERO, ONE]]
  },

  // ============================================================================
  // ARITHMETIC GATES - Column 4: Equalities
  // ============================================================================
  [GateType.A_EQ_B]: {
    type: GateType.A_EQ_B,
    label: 'A=B',
    fullName: 'A Equals B',
    description: 'Flip target if A = B: |t⟩ → |t ⊕ (A = B)⟩. Requires inputA and inputB.',
    matrixLabel: 'A=B',
    qubits: 1,
    matrix: [[ONE, ZERO], [ZERO, ONE]]
  },
  [GateType.A_NEQ_B]: {
    type: GateType.A_NEQ_B,
    label: 'A≠B',
    fullName: 'A Not Equal B',
    description: 'Flip target if A ≠ B: |t⟩ → |t ⊕ (A ≠ B)⟩. Requires inputA and inputB.',
    matrixLabel: 'A≠B',
    qubits: 1,
    matrix: [[ONE, ZERO], [ZERO, ONE]]
  },

  // ============================================================================
  // ARITHMETIC GATES - Column 5: Modular Increment/Decrement
  // ============================================================================
  [GateType.INC_MOD_R]: {
    type: GateType.INC_MOD_R,
    label: '+1%R',
    fullName: 'Increment mod R',
    description: 'Increment mod R: |E⟩ → |(E + 1) mod R⟩. Requires inputR. E must be < R.',
    matrixLabel: '+1%R',
    qubits: -1,
    matrix: [[ONE, ZERO], [ZERO, ONE]]
  },
  [GateType.DEC_MOD_R]: {
    type: GateType.DEC_MOD_R,
    label: '-1%R',
    fullName: 'Decrement mod R',
    description: 'Decrement mod R: |E⟩ → |(E - 1) mod R⟩. Requires inputR. E must be < R.',
    matrixLabel: '-1%R',
    qubits: -1,
    matrix: [[ONE, ZERO], [ZERO, ONE]]
  },

  // ============================================================================
  // ARITHMETIC GATES - Column 6: Modular Arithmetic on A
  // ============================================================================
  [GateType.ADD_A_MOD_R]: {
    type: GateType.ADD_A_MOD_R,
    label: '+A%R',
    fullName: 'Add A mod R',
    description: 'Add A mod R: |E⟩ → |(E + A) mod R⟩. Requires inputA and inputR.',
    matrixLabel: '+A%R',
    qubits: -1,
    matrix: [[ONE, ZERO], [ZERO, ONE]]
  },
  [GateType.SUB_A_MOD_R]: {
    type: GateType.SUB_A_MOD_R,
    label: '-A%R',
    fullName: 'Subtract A mod R',
    description: 'Subtract A mod R: |E⟩ → |(E - A) mod R⟩. Requires inputA and inputR.',
    matrixLabel: '-A%R',
    qubits: -1,
    matrix: [[ONE, ZERO], [ZERO, ONE]]
  },
  [GateType.MUL_A_MOD_R]: {
    type: GateType.MUL_A_MOD_R,
    label: '×A%R',
    fullName: 'Multiply by A mod R',
    description: 'Multiply mod R: |E⟩ → |(E × A) mod R⟩. A must be coprime to R.',
    matrixLabel: '×A%R',
    qubits: -1,
    matrix: [[ONE, ZERO], [ZERO, ONE]]
  },
  [GateType.DIV_A_MOD_R]: {
    type: GateType.DIV_A_MOD_R,
    label: '÷A%R',
    fullName: 'Divide by A mod R',
    description: 'Divide mod R: |E⟩ → |(E × A⁻¹) mod R⟩. A must be coprime to R.',
    matrixLabel: '÷A%R',
    qubits: -1,
    matrix: [[ONE, ZERO], [ZERO, ONE]]
  },

  // ============================================================================
  // ARITHMETIC GATES - Column 7: Imaginary Scalars
  // ============================================================================
  [GateType.SCALE_I]: {
    type: GateType.SCALE_I,
    label: '×i',
    fullName: 'Scale by i',
    description: 'Multiply amplitude by i (90° phase). Global phase if unconditional.',
    matrixLabel: '[[i, 0], [0, i]]',
    qubits: 1,
    matrix: [[I, ZERO], [ZERO, I]]
  },
  [GateType.SCALE_NEG_I]: {
    type: GateType.SCALE_NEG_I,
    label: '×-i',
    fullName: 'Scale by -i',
    description: 'Multiply amplitude by -i (-90° phase). Inverse of ×i.',
    matrixLabel: '[[-i, 0], [0, -i]]',
    qubits: 1,
    matrix: [[NEG_I, ZERO], [ZERO, NEG_I]]
  },
  [GateType.SCALE_SQRT_I]: {
    type: GateType.SCALE_SQRT_I,
    label: '×√i',
    fullName: 'Scale by √i',
    description: 'Multiply amplitude by √i = e^(iπ/4) (45° phase).',
    matrixLabel: '[[e^(iπ/4), 0], [0, e^(iπ/4)]]',
    qubits: 1,
    matrix: [[{ re: 1 / Math.sqrt(2), im: 1 / Math.sqrt(2) }, ZERO],
             [ZERO, { re: 1 / Math.sqrt(2), im: 1 / Math.sqrt(2) }]]
  },
  [GateType.SCALE_SQRT_NEG_I]: {
    type: GateType.SCALE_SQRT_NEG_I,
    label: '×√-i',
    fullName: 'Scale by √-i',
    description: 'Multiply amplitude by √-i = e^(-iπ/4) (-45° phase). Inverse of ×√i.',
    matrixLabel: '[[e^(-iπ/4), 0], [0, e^(-iπ/4)]]',
    qubits: 1,
    matrix: [[{ re: 1 / Math.sqrt(2), im: -1 / Math.sqrt(2) }, ZERO],
             [ZERO, { re: 1 / Math.sqrt(2), im: -1 / Math.sqrt(2) }]]
  },

  // ============================================================================
  // ARITHMETIC INPUT MARKERS
  // ============================================================================
  [GateType.INPUT_A]: {
    type: GateType.INPUT_A,
    label: 'A',
    fullName: 'Input A',
    description: 'Marks qubits as input register A. Read-only; does not modify state.',
    matrixLabel: 'I',
    qubits: -1, // Variable: depends on span
    matrix: [[ONE, ZERO], [ZERO, ONE]] // Identity (read-only marker)
  },
  [GateType.INPUT_B]: {
    type: GateType.INPUT_B,
    label: 'B',
    fullName: 'Input B',
    description: 'Marks qubits as input register B. Read-only; does not modify state.',
    matrixLabel: 'I',
    qubits: -1,
    matrix: [[ONE, ZERO], [ZERO, ONE]]
  },
  [GateType.INPUT_R]: {
    type: GateType.INPUT_R,
    label: 'R',
    fullName: 'Input R (Modulus)',
    description: 'Marks qubits as modulus register R. Read-only; does not modify state.',
    matrixLabel: 'I',
    qubits: -1,
    matrix: [[ONE, ZERO], [ZERO, ONE]]
  }
};

export const INITIAL_ROWS = 3;
export const INITIAL_COLS = 10;
export const MAX_ROWS = 8;