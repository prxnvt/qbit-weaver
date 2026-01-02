import { Complex, GateType, CircuitGrid } from '../types';
import { GATE_DEFS } from '../constants';

// --- Complex Number Math ---

export const cAdd = (a: Complex, b: Complex): Complex => ({
  re: a.re + b.re,
  im: a.im + b.im,
});

export const cMul = (a: Complex, b: Complex): Complex => ({
  re: a.re * b.re - a.im * b.im,
  im: a.re * b.im + a.im * b.re,
});

export const cAbsSq = (a: Complex): number => a.re * a.re + a.im * a.im;

// --- Simulation Logic ---

export const createInitialState = (numQubits: number): Complex[] => {
  const size = Math.pow(2, numQubits);
  const state: Complex[] = new Array(size).fill({ re: 0, im: 0 });
  state[0] = { re: 1, im: 0 };
  return state;
};

export const simulateCircuit = (grid: CircuitGrid): Complex[][] => {
  const numRows = grid.length;
  const numCols = grid[0]?.length || 0;
  
  let currentState = createInitialState(numRows);
  const history: Complex[][] = [currentState];

  for (let col = 0; col < numCols; col++) {
    // 1. Identify Gates and Controls in this column
    const controls: number[] = [];
    const swaps: number[] = [];
    const operations: { row: number; type: GateType }[] = [];

    for (let row = 0; row < numRows; row++) {
      const type = grid[row][col].gate;
      if (!type) continue;

      if (type === GateType.CONTROL) {
        controls.push(row);
      } else if (type === GateType.SWAP) {
        swaps.push(row);
      } else {
        operations.push({ row, type });
      }
    }

    // 2. Pair Swaps
    // If we have 2 swaps, pair them. If 3, pair first 2? standard behavior is pair 0-1, 2-3...
    const swapPairs: [number, number][] = [];
    for (let i = 0; i < swaps.length - 1; i += 2) {
      swapPairs.push([swaps[i], swaps[i+1]]);
    }

    let nextState = [...currentState];

    // 3. Apply Gates
    // We apply swaps first, then single qubit gates? Or all in parallel?
    // In a column, everything happens "simultaneously".
    // Since SWAP commutes with operations on other wires, order between disjoint ops doesn't matter.
    // Order between Control and Target matters? No, Control doesn't change value in computational basis (usually).
    // We assume Controls are Z-axis controls (standard) or just conditionals.
    
    // Step 3a: Calculate Control Mask
    // We need to know which basis states satisfy the control condition.
    // Mask: bits at control indices must be 1.
    
    let controlMask = 0;
    for (const r of controls) {
      // row 0 is MSB? 
      // In our setup: row 0 is usually visual top.
      // Let's assume big-endian mapping: |q0 q1 ... qN>
      // q0 is row 0 (MSB).
      // bit index = numRows - 1 - row.
      controlMask |= (1 << (numRows - 1 - r));
    }

    // Step 3b: Apply SWAPs
    // SWAP can also be controlled if controls exist in the same column!
    for (const [r1, r2] of swapPairs) {
        nextState = applySwap(nextState, r1, r2, controlMask, numRows);
    }

    // Step 3c: Apply Single Qubit Gates (Controlled)
    for (const op of operations) {
       nextState = applyGate(nextState, op.type, op.row, controlMask, numRows);
    }

    currentState = nextState;
    history.push(currentState);
  }

  return history;
};

const applySwap = (
    state: Complex[], 
    row1: number, 
    row2: number, 
    controlMask: number, 
    numQubits: number
): Complex[] => {
    const newState = [...state];
    const bit1 = numQubits - 1 - row1;
    const bit2 = numQubits - 1 - row2;

    for (let i = 0; i < state.length; i++) {
        // Check controls
        if ((i & controlMask) !== controlMask) continue;

        // Check if bits differ
        const b1 = (i >> bit1) & 1;
        const b2 = (i >> bit2) & 1;

        if (b1 !== b2) {
            // Target index to swap with
            const j = i ^ (1 << bit1) ^ (1 << bit2);
            
            // We only need to process the pair (i, j) once.
            // Let's only process if i < j to avoid double swapping
            if (i < j) {
                const temp = newState[i];
                newState[i] = newState[j];
                newState[j] = temp;
            }
        }
    }
    return newState;
};

const applyGate = (
    state: Complex[],
    gateType: GateType,
    row: number,
    controlMask: number,
    numQubits: number
): Complex[] => {
    const def = GATE_DEFS[gateType];
    const newState = new Array(state.length).fill({ re: 0, im: 0 });
    const bit = numQubits - 1 - row;

    for (let i = 0; i < state.length; i++) {
        // If state is zero, skip
        if (state[i].re === 0 && state[i].im === 0) continue;

        // Check controls
        // If controls are NOT satisfied, this gate acts as Identity
        if ((i & controlMask) !== controlMask) {
            newState[i] = cAdd(newState[i], state[i]); // Identity
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
            const matrixElem = def.matrix[k][localIdx];
            if (matrixElem.re === 0 && matrixElem.im === 0) continue;

            const targetIdx = otherBits | (k << bit);
            const val = cMul(matrixElem, state[i]);
            newState[targetIdx] = cAdd(newState[targetIdx], val);
        }
    }
    return newState;
};


// --- Visualization Logic ---

export const getBlochVector = (state: Complex[], targetQubit: number, totalQubits: number): [number, number, number] => {
  let expX = 0;
  let expY = 0;
  let expZ = 0;
  
  const N = totalQubits;
  const bitK = N - 1 - targetQubit; 
  
  for (let i = 0; i < state.length; i++) {
    const amp = state[i];
    const absSq = cAbsSq(amp);
    
    // Z expectation
    if (((i >> bitK) & 1) === 0) {
        expZ += absSq;
    } else {
        expZ -= absSq;
    }
    
    // X and Y
    if (((i >> bitK) & 1) === 0) {
        const idx1 = i | (1 << bitK);
        if (idx1 >= state.length) continue; 

        const c0 = state[i];
        const c1 = state[idx1];
        
        const termRe = c0.re * c1.re + c0.im * c1.im;
        // const termIm = c0.re * c1.im - c0.im * c1.re; // Not needed directly, derived
        
        expX += 2 * termRe;
        expY += 2 * (c1.im * c0.re - c1.re * c0.im);
    }
  }
  
  return [expX, expY, expZ];
};
