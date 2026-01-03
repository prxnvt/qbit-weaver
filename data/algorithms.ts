import { CircuitGrid, Cell, GateType, GateParams } from '../types';
import { INITIAL_COLS } from '../constants';

export interface AlgorithmTemplate {
  id: string;
  name: string;
  description: string;
  category: 'Fundamental' | 'Entanglement' | 'Algorithms' | 'Error Correction' | 'Gates';
  qubits: number;
  grid: CircuitGrid;
}

// Helper to create an empty cell
const emptyCell = (row: number, col: number): Cell => ({
  gate: null,
  id: `cell-${row}-${col}`,
});

// Helper to create a cell with a gate
const cell = (row: number, col: number, gate: GateType, params?: GateParams): Cell => ({
  gate,
  id: `cell-${row}-${col}`,
  params,
});

// Helper to create a full grid from sparse gate placements
// gates: Array of { row, col, gate, params? }
const createGrid = (
  numQubits: number,
  gates: { row: number; col: number; gate: GateType; params?: GateParams }[]
): CircuitGrid => {
  // Find max column used
  const maxCol = Math.max(...gates.map(g => g.col), 0);
  const numCols = Math.max(maxCol + 1, INITIAL_COLS);

  // Create empty grid
  const grid: CircuitGrid = Array(numQubits)
    .fill(null)
    .map((_, r) =>
      Array(numCols)
        .fill(null)
        .map((_, c) => emptyCell(r, c))
    );

  // Place gates
  for (const { row, col, gate, params } of gates) {
    if (row < numQubits && col < numCols) {
      grid[row][col] = cell(row, col, gate, params);
    }
  }

  return grid;
};

// ============================================================================
// ASCII Diagram Parser
// ============================================================================
// Parses ASCII circuit diagrams into gate placements
// Format:
//   q0: H -●-H-M
//   q1: X-H-X-H--
//
// Gate symbols:
//   H, X, Y, Z, S, T, M (measure)
//   ● or * = CONTROL
//   ○ or o = ANTI_CONTROL
//   Rx, Ry, Rz = rotation gates (need angle param)
//   SWAP or SW = SWAP
//   CCX = Toffoli target
//   CX or ⊕ = CNOT target
//   CZ = CZ target
//   R₂, R₃ etc = RZ with specific angles (pi/2, pi/4)
//   Ry† = RY with negative angle
// ============================================================================

type GatePlacement = { row: number; col: number; gate: GateType; params?: GateParams };

const GATE_MAP: Record<string, GateType> = {
  'H': GateType.H,
  'X': GateType.X,
  'Y': GateType.Y,
  'Z': GateType.Z,
  'S': GateType.S,
  'T': GateType.T,
  'I': GateType.I,
  'M': GateType.MEASURE,
  'MEASURE': GateType.MEASURE,
  '●': GateType.CONTROL,
  '*': GateType.CONTROL,
  '○': GateType.ANTI_CONTROL,
  'o': GateType.ANTI_CONTROL,
  'SWAP': GateType.SWAP,
  'SW': GateType.SWAP,
  'SWP': GateType.SWAP,
  'CX': GateType.CX,
  '⊕': GateType.CX,
  'CZ': GateType.CZ,
  'CCX': GateType.CCX,
  'RX': GateType.RX,
  'RY': GateType.RY,
  'RZ': GateType.RZ,
  'Rx': GateType.RX,
  'Ry': GateType.RY,
  'Rz': GateType.RZ,
};

// Parse a single line of ASCII diagram
// Returns array of { col, gate, params? }
function parseLine(line: string): { col: number; gate: GateType; params?: GateParams }[] {
  const results: { col: number; gate: GateType; params?: GateParams }[] = [];

  // Remove the qubit label prefix (e.g., "q0: " or "q0:")
  const colonIdx = line.indexOf(':');
  const content = colonIdx >= 0 ? line.slice(colonIdx + 1) : line;

  // Track position in the content (for column calculation)
  let pos = 0;
  let col = 0;

  while (pos < content.length) {
    const char = content[pos];

    // Skip whitespace and wire characters
    if (char === ' ' || char === '-' || char === '─' || char === '│' || char === '|') {
      pos++;
      continue;
    }

    // Try to match multi-character gates first
    const remaining = content.slice(pos);

    // Special patterns
    if (remaining.startsWith('SWAP') || remaining.startsWith('swap')) {
      results.push({ col, gate: GateType.SWAP });
      pos += 4;
      col++;
      continue;
    }

    if (remaining.startsWith('CCX') || remaining.startsWith('ccx')) {
      results.push({ col, gate: GateType.CCX });
      pos += 3;
      col++;
      continue;
    }

    // R₂ = RZ(π/2)
    if (remaining.startsWith('R₂')) {
      results.push({ col, gate: GateType.RZ, params: { angle: Math.PI / 2, angleExpression: 'π/2' } });
      pos += 2;
      col++;
      continue;
    }

    // R₃ = RZ(π/4)
    if (remaining.startsWith('R₃')) {
      results.push({ col, gate: GateType.RZ, params: { angle: Math.PI / 4, angleExpression: 'π/4' } });
      pos += 2;
      col++;
      continue;
    }

    // Ry† = RY(-angle) - for W state, we'll use a specific angle
    if (remaining.startsWith('Ry†')) {
      // arccos(1/√3) for W state preparation
      results.push({ col, gate: GateType.RY, params: { angle: -Math.acos(1/Math.sqrt(3)), angleExpression: '-arccos(1/√3)' } });
      pos += 3;
      col++;
      continue;
    }

    // Ry with specific angle for W state: arccos(√(2/3))
    if (remaining.startsWith('Ry')) {
      results.push({ col, gate: GateType.RY, params: { angle: Math.acos(Math.sqrt(2/3)), angleExpression: 'arccos(√(2/3))' } });
      pos += 2;
      col++;
      continue;
    }

    if (remaining.startsWith('Rx') || remaining.startsWith('RX')) {
      results.push({ col, gate: GateType.RX, params: { angle: Math.PI / 2, angleExpression: 'π/2' } });
      pos += 2;
      col++;
      continue;
    }

    if (remaining.startsWith('Rz') || remaining.startsWith('RZ')) {
      results.push({ col, gate: GateType.RZ, params: { angle: Math.PI / 2, angleExpression: 'π/2' } });
      pos += 2;
      col++;
      continue;
    }

    if (remaining.startsWith('CX') || remaining.startsWith('cx')) {
      results.push({ col, gate: GateType.CX });
      pos += 2;
      col++;
      continue;
    }

    if (remaining.startsWith('CZ') || remaining.startsWith('cz')) {
      results.push({ col, gate: GateType.CZ });
      pos += 2;
      col++;
      continue;
    }

    if (remaining.startsWith('SW') || remaining.startsWith('sw')) {
      results.push({ col, gate: GateType.SWAP });
      pos += 2;
      col++;
      continue;
    }

    // Skip [encode] markers and similar brackets
    if (char === '[') {
      const endBracket = remaining.indexOf(']');
      if (endBracket >= 0) {
        pos += endBracket + 1;
        continue;
      }
    }

    // Single character gates
    const gate = GATE_MAP[char];
    if (gate) {
      results.push({ col, gate });
      pos++;
      col++;
      continue;
    }

    // Unknown character, skip
    pos++;
  }

  return results;
}

// Parse full ASCII diagram into gate placements
export function parseAsciiCircuit(diagram: string): GatePlacement[] {
  const lines = diagram.trim().split('\n');
  const placements: GatePlacement[] = [];

  for (let row = 0; row < lines.length; row++) {
    const lineGates = parseLine(lines[row]);
    for (const { col, gate, params } of lineGates) {
      placements.push({ row, col, gate, params });
    }
  }

  return placements;
}

// Create a grid from ASCII diagram
export function gridFromAscii(diagram: string, numQubits: number): CircuitGrid {
  const placements = parseAsciiCircuit(diagram);
  return createGrid(numQubits, placements);
}

// ============================================================================
// Algorithm Templates
// ============================================================================

export const ALGORITHM_TEMPLATES: AlgorithmTemplate[] = [
  // --- Entanglement ---
  {
    id: 'bell-state',
    name: 'Bell State (EPR Pair)',
    description: 'Creates maximally entangled Bell state |Φ+⟩ = (|00⟩ + |11⟩)/√2',
    category: 'Entanglement',
    qubits: 2,
    grid: gridFromAscii(`
q0: H-●
q1: --X
`, 2),
  },
  {
    id: 'entangle-two-qubits',
    name: 'Entangle Two Qubits',
    description: 'Basic entanglement: H creates superposition, CNOT entangles. Measuring one qubit instantly determines the other.',
    category: 'Entanglement',
    qubits: 2,
    grid: createGrid(2, [
      // Step 1: Put first qubit in superposition
      { row: 0, col: 0, gate: GateType.H },
      // Step 2: CNOT entangles the two qubits
      { row: 0, col: 1, gate: GateType.CONTROL },
      { row: 1, col: 1, gate: GateType.CX },
      // Step 3: Measure both - results will be correlated (00 or 11)
      { row: 0, col: 3, gate: GateType.MEASURE },
      { row: 1, col: 3, gate: GateType.MEASURE },
    ]),
  },
  {
    id: 'ghz-state',
    name: 'GHZ State',
    description: 'Creates 3-qubit GHZ state (|000⟩ + |111⟩)/√2',
    category: 'Entanglement',
    qubits: 3,
    grid: gridFromAscii(`
q0: H-●---●
q1: --X---|
q2: ------X
`, 3),
  },
  {
    id: 'w-state',
    name: 'W State',
    description: 'Creates W state (|001⟩ + |010⟩ + |100⟩)/√3 using rotation gates',
    category: 'Entanglement',
    qubits: 3,
    grid: createGrid(3, [
      // Row 1: Ry gate, then control, then Ry†, then another control-X
      { row: 1, col: 0, gate: GateType.RY, params: { angle: Math.acos(Math.sqrt(2/3)), angleExpression: 'arccos(√(2/3))' } },
      { row: 1, col: 1, gate: GateType.CONTROL },
      { row: 2, col: 1, gate: GateType.CX },
      { row: 1, col: 2, gate: GateType.RY, params: { angle: -Math.acos(1/Math.sqrt(2)), angleExpression: '-π/4' } },
      { row: 1, col: 3, gate: GateType.CX },
      { row: 0, col: 3, gate: GateType.CONTROL },
      { row: 0, col: 4, gate: GateType.CONTROL },
      { row: 1, col: 4, gate: GateType.CX },
    ]),
  },

  // --- Fundamental Algorithms ---
  {
    id: 'deutsch',
    name: 'Deutsch Algorithm',
    description: 'Determines if a function is constant or balanced using one query',
    category: 'Algorithms',
    qubits: 2,
    grid: gridFromAscii(`
q0: H-●-H-M
q1: X-H-X-H
`, 2),
  },
  {
    id: 'deutsch-jozsa',
    name: 'Deutsch-Jozsa Algorithm',
    description: 'Generalizes Deutsch algorithm to n-bit functions',
    category: 'Algorithms',
    qubits: 3,
    grid: gridFromAscii(`
q0: H-●----H-M
q1: H-|-●--H-M
q2: X-H-X-X-H
`, 3),
  },
  {
    id: 'bernstein-vazirani',
    name: 'Bernstein-Vazirani Algorithm',
    description: 'Finds hidden bit string with one query',
    category: 'Algorithms',
    qubits: 3,
    grid: gridFromAscii(`
q0: H-●---H-M
q1: H-|-●-H-M
q2: X-H-X-X-H
`, 3),
  },
  {
    id: 'grover-2qubit',
    name: "Grover's Algorithm (2-qubit)",
    description: 'Quantum search finding marked item in unstructured database',
    category: 'Algorithms',
    qubits: 2,
    grid: gridFromAscii(`
q0: H-●-H-X-●-X-H-M
q1: H-X-H-X-X-X-H-M
`, 2),
  },
  {
    id: 'qft-3qubit',
    name: 'Quantum Fourier Transform (3-qubit)',
    description: 'Quantum version of discrete Fourier transform',
    category: 'Algorithms',
    qubits: 3,
    grid: createGrid(3, [
      // q0: H, control for R2, control for R3, then SWAP with q2
      { row: 0, col: 0, gate: GateType.H },
      { row: 0, col: 1, gate: GateType.CONTROL },
      { row: 1, col: 1, gate: GateType.RZ, params: { angle: Math.PI / 2, angleExpression: 'π/2' } },
      { row: 0, col: 2, gate: GateType.CONTROL },
      { row: 2, col: 2, gate: GateType.RZ, params: { angle: Math.PI / 4, angleExpression: 'π/4' } },
      // q1: H, control for R2
      { row: 1, col: 3, gate: GateType.H },
      { row: 1, col: 4, gate: GateType.CONTROL },
      { row: 2, col: 4, gate: GateType.RZ, params: { angle: Math.PI / 2, angleExpression: 'π/2' } },
      // q2: H
      { row: 2, col: 5, gate: GateType.H },
      // SWAP q0 and q2
      { row: 0, col: 6, gate: GateType.SWAP },
      { row: 2, col: 6, gate: GateType.SWAP },
    ]),
  },

  // --- Quantum Communication ---
  {
    id: 'teleportation',
    name: 'Quantum Teleportation',
    description: 'Teleports qubit state using entanglement and classical communication',
    category: 'Fundamental',
    qubits: 3,
    grid: createGrid(3, [
      // Create Bell pair between q1 and q2
      { row: 1, col: 0, gate: GateType.H },
      { row: 1, col: 1, gate: GateType.CONTROL },
      { row: 2, col: 1, gate: GateType.CX },
      // Bell measurement on q0 and q1
      { row: 0, col: 2, gate: GateType.CONTROL },
      { row: 1, col: 2, gate: GateType.CX },
      { row: 0, col: 3, gate: GateType.H },
      { row: 0, col: 4, gate: GateType.MEASURE },
      { row: 1, col: 4, gate: GateType.MEASURE },
      // Conditional corrections on q2
      { row: 1, col: 5, gate: GateType.CONTROL },
      { row: 2, col: 5, gate: GateType.CX },
      { row: 0, col: 6, gate: GateType.CONTROL },
      { row: 2, col: 6, gate: GateType.CZ },
    ]),
  },
  {
    id: 'superdense-coding',
    name: 'Superdense Coding',
    description: 'Sends 2 classical bits using 1 qubit and shared entanglement',
    category: 'Fundamental',
    qubits: 2,
    grid: createGrid(2, [
      // Create Bell pair
      { row: 0, col: 0, gate: GateType.H },
      { row: 0, col: 1, gate: GateType.CONTROL },
      { row: 1, col: 1, gate: GateType.CX },
      // Encoding would happen here (identity = 00)
      // Decode
      { row: 0, col: 3, gate: GateType.CONTROL },
      { row: 1, col: 3, gate: GateType.CX },
      { row: 0, col: 4, gate: GateType.H },
      { row: 0, col: 5, gate: GateType.MEASURE },
      { row: 1, col: 5, gate: GateType.MEASURE },
    ]),
  },
  {
    id: 'phase-kickback',
    name: 'Phase Kickback',
    description: 'Demonstrates phase kickback phenomenon used in many quantum algorithms',
    category: 'Fundamental',
    qubits: 2,
    grid: gridFromAscii(`
q0: H-●-H
q1: X-H-X-H
`, 2),
  },

  // --- Gate Decompositions ---
  {
    id: 'swap-decomposition',
    name: 'SWAP from CNOTs',
    description: 'Implements SWAP gate using 3 CNOT gates',
    category: 'Gates',
    qubits: 2,
    grid: createGrid(2, [
      { row: 0, col: 0, gate: GateType.CONTROL },
      { row: 1, col: 0, gate: GateType.CX },
      { row: 1, col: 1, gate: GateType.CONTROL },
      { row: 0, col: 1, gate: GateType.CX },
      { row: 0, col: 2, gate: GateType.CONTROL },
      { row: 1, col: 2, gate: GateType.CX },
    ]),
  },
  {
    id: 'cz-decomposition',
    name: 'CZ from CNOTs',
    description: 'Implements Controlled-Z using Hadamard and CNOT',
    category: 'Gates',
    qubits: 2,
    grid: gridFromAscii(`
q0: --●--
q1: H-X-H
`, 2),
  },
  {
    id: 'toffoli-demo',
    name: 'Toffoli Gate Demo',
    description: 'Toffoli (CCX) gate with both controls in |1⟩ state',
    category: 'Gates',
    qubits: 3,
    grid: createGrid(3, [
      { row: 0, col: 0, gate: GateType.X },
      { row: 1, col: 0, gate: GateType.X },
      { row: 0, col: 1, gate: GateType.CONTROL },
      { row: 1, col: 1, gate: GateType.CONTROL },
      { row: 2, col: 1, gate: GateType.CCX },
    ]),
  },

  // --- Error Correction ---
  {
    id: 'bit-flip-code',
    name: 'Bit Flip Code (Encode)',
    description: 'Encodes 1 logical qubit into 3 physical qubits for bit-flip protection',
    category: 'Error Correction',
    qubits: 3,
    grid: gridFromAscii(`
q0: ●---●
q1: X---|
q2: ----X
`, 3),
  },
  {
    id: 'phase-flip-code',
    name: 'Phase Flip Code (Encode)',
    description: 'Encodes 1 logical qubit for phase-flip error protection',
    category: 'Error Correction',
    qubits: 3,
    grid: createGrid(3, [
      { row: 0, col: 0, gate: GateType.H },
      { row: 1, col: 0, gate: GateType.H },
      { row: 2, col: 0, gate: GateType.H },
      { row: 0, col: 1, gate: GateType.CONTROL },
      { row: 1, col: 1, gate: GateType.CX },
      { row: 0, col: 2, gate: GateType.CONTROL },
      { row: 2, col: 2, gate: GateType.CX },
      { row: 0, col: 3, gate: GateType.H },
      { row: 1, col: 3, gate: GateType.H },
      { row: 2, col: 3, gate: GateType.H },
    ]),
  },

  // --- Modular Arithmetic Demo ---
  {
    id: 'modular-add-mod-r-demo',
    name: 'Add A mod R Demo',
    description: 'Demonstrates +A%R: A=2 (rows 0-1), R=3 (rows 2-3), effect register (rows 4-5). Computes (1+2) mod 3 = 0.',
    category: 'Algorithms',
    qubits: 6,
    grid: createGrid(6, [
      // Initialize INPUT_A (q0-q1) to value 2 (binary 10)
      { row: 1, col: 0, gate: GateType.X },

      // Initialize INPUT_R (q2-q3) to value 3 (binary 11)
      { row: 2, col: 0, gate: GateType.X },
      { row: 3, col: 0, gate: GateType.X },

      // Initialize effect register (q4-q5) to value 1 (binary 01)
      { row: 4, col: 0, gate: GateType.X },

      // Column 2: INPUT_A, INPUT_R, and ADD_A_MOD_R all in same column (connected)
      // INPUT_A at rows 0-1
      { row: 0, col: 2, gate: GateType.INPUT_A, params: { reverseSpan: { startRow: 0, endRow: 1 }, isSpanContinuation: false } },
      { row: 1, col: 2, gate: GateType.INPUT_A, params: { reverseSpan: { startRow: 0, endRow: 1 }, isSpanContinuation: true } },

      // INPUT_R at rows 2-3
      { row: 2, col: 2, gate: GateType.INPUT_R, params: { reverseSpan: { startRow: 2, endRow: 3 }, isSpanContinuation: false } },
      { row: 3, col: 2, gate: GateType.INPUT_R, params: { reverseSpan: { startRow: 2, endRow: 3 }, isSpanContinuation: true } },

      // ADD_A_MOD_R at rows 4-5: computes (effect + A) mod R = (1 + 2) mod 3 = 0
      { row: 4, col: 2, gate: GateType.ADD_A_MOD_R, params: { reverseSpan: { startRow: 4, endRow: 5 }, isSpanContinuation: false } },
      { row: 5, col: 2, gate: GateType.ADD_A_MOD_R, params: { reverseSpan: { startRow: 4, endRow: 5 }, isSpanContinuation: true } },

      // Measure the result register (should be 0)
      { row: 4, col: 4, gate: GateType.MEASURE },
      { row: 5, col: 4, gate: GateType.MEASURE },
    ]),
  },
  {
    id: 'modular-add-demo',
    name: 'Modular Addition Demo',
    description: 'Demonstrates modular addition: reads A from qubits 0-1, adds to register at qubits 2-3. Values range 0-3 (mod 4).',
    category: 'Algorithms',
    qubits: 4,
    grid: createGrid(4, [
      // Initialize INPUT_A register (q0-q1) to value 2 (binary 10)
      { row: 1, col: 0, gate: GateType.X },

      // Initialize effect register (q2-q3) to value 1 (binary 01)
      { row: 2, col: 0, gate: GateType.X },

      // INPUT_A marker at rows 0-1
      { row: 0, col: 2, gate: GateType.INPUT_A, params: { reverseSpan: { startRow: 0, endRow: 1 }, isSpanContinuation: false } },
      { row: 1, col: 2, gate: GateType.INPUT_A, params: { reverseSpan: { startRow: 0, endRow: 1 }, isSpanContinuation: true } },

      // ADD_A gate at rows 2-3: computes (effect + A) mod 4
      // Initial: effect=1, A=2 → result = (1+2) mod 4 = 3
      { row: 2, col: 2, gate: GateType.ADD_A, params: { reverseSpan: { startRow: 2, endRow: 3 }, isSpanContinuation: false } },
      { row: 3, col: 2, gate: GateType.ADD_A, params: { reverseSpan: { startRow: 2, endRow: 3 }, isSpanContinuation: true } },

      // Measure the result register
      { row: 2, col: 4, gate: GateType.MEASURE },
      { row: 3, col: 4, gate: GateType.MEASURE },
    ]),
  },
  {
    id: 'modular-mul-demo',
    name: 'Modular Multiply Demo',
    description: 'Demonstrates modular multiplication: reads A from qubits 0-1, multiplies register at qubits 2-3. A must be odd (1 or 3).',
    category: 'Algorithms',
    qubits: 4,
    grid: createGrid(4, [
      // Initialize INPUT_A register (q0-q1) to value 3 (binary 11) - must be odd
      { row: 0, col: 0, gate: GateType.X },
      { row: 1, col: 0, gate: GateType.X },

      // Initialize effect register (q2-q3) to value 2 (binary 10)
      { row: 3, col: 0, gate: GateType.X },

      // INPUT_A marker at rows 0-1, directly above MUL_A at rows 2-3
      { row: 0, col: 2, gate: GateType.INPUT_A, params: { reverseSpan: { startRow: 0, endRow: 1 }, isSpanContinuation: false } },
      { row: 1, col: 2, gate: GateType.INPUT_A, params: { reverseSpan: { startRow: 0, endRow: 1 }, isSpanContinuation: true } },

      // MUL_A gate at rows 2-3: computes (effect × A) mod 4
      // Initial: effect=2, A=3 → result = (2×3) mod 4 = 6 mod 4 = 2
      { row: 2, col: 2, gate: GateType.MUL_A, params: { reverseSpan: { startRow: 2, endRow: 3 }, isSpanContinuation: false } },
      { row: 3, col: 2, gate: GateType.MUL_A, params: { reverseSpan: { startRow: 2, endRow: 3 }, isSpanContinuation: true } },

      // Measure the result register
      { row: 2, col: 4, gate: GateType.MEASURE },
      { row: 3, col: 4, gate: GateType.MEASURE },
    ]),
  },
  {
    id: 'increment-demo',
    name: 'Increment/Decrement Demo',
    description: 'Demonstrates INC and DEC gates on a 2-qubit register (values 0-3 mod 4).',
    category: 'Algorithms',
    qubits: 4,
    grid: createGrid(4, [
      // Initialize register (q0-q1) to value 2 (binary 10)
      { row: 1, col: 0, gate: GateType.X },

      // INC: 2 → 3
      { row: 0, col: 2, gate: GateType.INC, params: { reverseSpan: { startRow: 0, endRow: 1 }, isSpanContinuation: false } },
      { row: 1, col: 2, gate: GateType.INC, params: { reverseSpan: { startRow: 0, endRow: 1 }, isSpanContinuation: true } },

      // INC: 3 → 0 (wraps around)
      { row: 0, col: 3, gate: GateType.INC, params: { reverseSpan: { startRow: 0, endRow: 1 }, isSpanContinuation: false } },
      { row: 1, col: 3, gate: GateType.INC, params: { reverseSpan: { startRow: 0, endRow: 1 }, isSpanContinuation: true } },

      // DEC: 0 → 3 (wraps around)
      { row: 0, col: 4, gate: GateType.DEC, params: { reverseSpan: { startRow: 0, endRow: 1 }, isSpanContinuation: false } },
      { row: 1, col: 4, gate: GateType.DEC, params: { reverseSpan: { startRow: 0, endRow: 1 }, isSpanContinuation: true } },

      // Measure final result (should be 3)
      { row: 0, col: 6, gate: GateType.MEASURE },
      { row: 1, col: 6, gate: GateType.MEASURE },
    ]),
  },

  // --- Shor's Algorithm ---
  {
    id: 'shor-algorithm',
    name: "Shor's Algorithm (Simplified)",
    description: "Simplified Shor's algorithm for factoring. Uses controlled modular multiplication with QFT to find period r of a^x mod N. This demo shows the structure with 2-qubit registers.",
    category: 'Algorithms',
    qubits: 8,
    grid: createGrid(8, [
      // === SETUP ===
      // Control qubits (q0-q1): Put in superposition
      { row: 0, col: 0, gate: GateType.H },
      { row: 1, col: 0, gate: GateType.H },

      // Work register (q6-q7): Initialize to |1⟩ (value 1)
      { row: 6, col: 0, gate: GateType.X },

      // === CONTROLLED MODULAR EXPONENTIATION ===
      // For factoring N, we compute a^x mod N for superposition of x values
      // Using a=2, N=3 as a simple example: 2^0=1, 2^1=2, 2^2=1 (mod 3), period r=2

      // Step 1: Controlled multiplication by a^1 = 2 (controlled by q1)
      // INPUT_A = 2 at rows 2-3
      { row: 2, col: 2, gate: GateType.INPUT_A, params: { reverseSpan: { startRow: 2, endRow: 3 }, isSpanContinuation: false } },
      { row: 3, col: 2, gate: GateType.INPUT_A, params: { reverseSpan: { startRow: 2, endRow: 3 }, isSpanContinuation: true } },
      // INPUT_R = 3 at rows 4-5
      { row: 4, col: 2, gate: GateType.INPUT_R, params: { reverseSpan: { startRow: 4, endRow: 5 }, isSpanContinuation: false } },
      { row: 5, col: 2, gate: GateType.INPUT_R, params: { reverseSpan: { startRow: 4, endRow: 5 }, isSpanContinuation: true } },
      // MUL_A_MOD_R on work register (q6-q7)
      { row: 6, col: 2, gate: GateType.MUL_A_MOD_R, params: { reverseSpan: { startRow: 6, endRow: 7 }, isSpanContinuation: false } },
      { row: 7, col: 2, gate: GateType.MUL_A_MOD_R, params: { reverseSpan: { startRow: 6, endRow: 7 }, isSpanContinuation: true } },
      // Control from q1
      { row: 1, col: 2, gate: GateType.CONTROL },

      // Step 2: Controlled multiplication by a^2 = 4 ≡ 1 (mod 3) (controlled by q0)
      // Since 2^2 mod 3 = 1, this is effectively identity, but we show the structure
      // INPUT_A = 1 at rows 2-3
      { row: 2, col: 4, gate: GateType.INPUT_A, params: { reverseSpan: { startRow: 2, endRow: 3 }, isSpanContinuation: false } },
      { row: 3, col: 4, gate: GateType.INPUT_A, params: { reverseSpan: { startRow: 2, endRow: 3 }, isSpanContinuation: true } },
      // INPUT_R = 3 at rows 4-5
      { row: 4, col: 4, gate: GateType.INPUT_R, params: { reverseSpan: { startRow: 4, endRow: 5 }, isSpanContinuation: false } },
      { row: 5, col: 4, gate: GateType.INPUT_R, params: { reverseSpan: { startRow: 4, endRow: 5 }, isSpanContinuation: true } },
      // MUL_A_MOD_R on work register (q6-q7)
      { row: 6, col: 4, gate: GateType.MUL_A_MOD_R, params: { reverseSpan: { startRow: 6, endRow: 7 }, isSpanContinuation: false } },
      { row: 7, col: 4, gate: GateType.MUL_A_MOD_R, params: { reverseSpan: { startRow: 6, endRow: 7 }, isSpanContinuation: true } },
      // Control from q0
      { row: 0, col: 4, gate: GateType.CONTROL },

      // === INVERSE QFT on control register ===
      // Swap q0 and q1 for bit reversal
      { row: 0, col: 6, gate: GateType.SWAP },
      { row: 1, col: 6, gate: GateType.SWAP },

      // QFT† on 2 qubits
      { row: 0, col: 7, gate: GateType.H },
      { row: 0, col: 8, gate: GateType.CONTROL },
      { row: 1, col: 8, gate: GateType.RZ, params: { angle: -Math.PI / 2, angleExpression: '-π/2' } },
      { row: 1, col: 9, gate: GateType.H },

      // === MEASUREMENT ===
      // Measure control register to get period information
      { row: 0, col: 11, gate: GateType.MEASURE },
      { row: 1, col: 11, gate: GateType.MEASURE },
    ]),
  },
];

// Group templates by category for UI
export const TEMPLATES_BY_CATEGORY = ALGORITHM_TEMPLATES.reduce((acc, template) => {
  if (!acc[template.category]) {
    acc[template.category] = [];
  }
  acc[template.category].push(template);
  return acc;
}, {} as Record<string, AlgorithmTemplate[]>);

export const CATEGORIES = Object.keys(TEMPLATES_BY_CATEGORY) as AlgorithmTemplate['category'][];
