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

  // Rotation gates (parameterized)
  RX = 'RX',
  RY = 'RY',
  RZ = 'RZ',

  // Multi-qubit gates
  CX = 'CX',         // Acts as X (NOT), visualizes as target
  CZ = 'CZ',         // Acts as Z, visualizes as target
  SWAP = 'SWAP',
  CONTROL = 'CONTROL', // Control dot
  CCX = 'CCX',       // Toffoli gate (double-controlled NOT)

  // Special gates
  MEASURE = 'MEASURE', // Measurement gate
  CUSTOM = 'CUSTOM',   // User-defined gate

  // Legacy (kept for compatibility, consider removing)
  EMPTY = 'EMPTY'
}

/** Gates that are parameterized and require an angle value */
export const PARAMETERIZED_GATES = [GateType.RX, GateType.RY, GateType.RZ] as const;

/** Gates that require fixed positioning (multi-qubit operations) */
export const FIXED_POSITION_GATES = [
  GateType.SWAP,
  GateType.CONTROL,
  GateType.CX,
  GateType.CZ,
  GateType.CCX,
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