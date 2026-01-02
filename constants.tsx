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

// Row height constant (used for connector line calculations)
export const ROW_HEIGHT = 48;

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
    fullName: 'Phase (S)',
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
    description: 'Control. Conditions other gates in this column.',
    matrixLabel: 'I',
    qubits: 1,
    matrix: [[ONE, ZERO], [ZERO, ONE]] // Identity, logic handles control
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
  }
};

export const INITIAL_ROWS = 3;
export const INITIAL_COLS = 16; // Wider default
export const MAX_ROWS = 8;