# Sparse State Vector Support - Design Document

**Status**: Design complete, implementation deferred until qubit limit increases to 12+

**Conclusion**: Sparse state vectors are NOT worthwhile for the current 8-qubit limit (256 amplitudes = 4KB). This document serves as a ready-to-implement design for when QCVO supports more qubits.

---

## Analysis: Why Not Worth It at 8 Qubits

| Factor | Dense (Current) | Sparse (Map) |
|--------|-----------------|--------------|
| Memory per state | 4KB | ~100 bytes (1 amp) to 20KB+ (256 amps) |
| Iteration | O(256) with cache locality | O(k) with hash overhead |
| Zero-skipping | Already exists via `isZeroAt()` | Native |
| Map overhead | N/A | ~60-80 bytes per entry |

**Key insight**: The existing `isZeroAt()` check in all gate loops already provides O(k) effective iteration. Sparse adds complexity without meaningful benefit at this scale.

**When sparse becomes worthwhile**:
- 12 qubits: 4,096 amplitudes (64KB) - marginal benefit if <10% non-zero
- 16 qubits: 65,536 amplitudes (1MB) - clear benefit for sparse circuits
- 20+ qubits: Essential for any practical simulation

---

## Design: Hybrid State Vector System

### Representation Choice: Hybrid Class

Use a discriminated union with automatic format switching based on sparsity.

### Type Definitions (types.ts)

```typescript
// New sparse state types
export interface SparseStateVector {
  readonly format: 'sparse';
  readonly numQubits: number;
  readonly entries: Map<number, { re: number; im: number }>;
}

export interface DenseStateVector {
  readonly format: 'dense';
  readonly numQubits: number;
  readonly data: ComplexArray;
}

export type StateVector = SparseStateVector | DenseStateVector;

// Type guards
export const isSparse = (s: StateVector): s is SparseStateVector =>
  s.format === 'sparse';
export const isDense = (s: StateVector): s is DenseStateVector =>
  s.format === 'dense';
```

### Heuristics (utils/quantum.ts)

```typescript
// Constants
const SPARSE_THRESHOLD = 0.1;        // Use sparse if <10% non-zero
const MIN_SIZE_FOR_SPARSE = 4096;    // Only consider sparse for 12+ qubits
const HADAMARD_DENSITY_FACTOR = 2;   // Each H doubles non-zero count

const shouldUseSparse = (nonZeroCount: number, totalSize: number): boolean => {
  if (totalSize < MIN_SIZE_FOR_SPARSE) return false;
  return (nonZeroCount / totalSize) < SPARSE_THRESHOLD;
};

// Predict density after applying gates in a column
const predictPostColumnDensity = (
  currentNonZero: number,
  hadamardCount: number,
  totalSize: number
): number => {
  const predictedNonZero = Math.min(
    currentNonZero * Math.pow(HADAMARD_DENSITY_FACTOR, hadamardCount),
    totalSize
  );
  return predictedNonZero / totalSize;
};
```

### Conversion Functions (utils/sparseState.ts - new file)

```typescript
import { ComplexArray, createComplexArray, EPSILON } from './quantum';

export const toDense = (sparse: SparseStateVector): DenseStateVector => {
  const size = 1 << sparse.numQubits;
  const data = createComplexArray(size);
  for (const [idx, amp] of sparse.entries) {
    data[idx * 2] = amp.re;
    data[idx * 2 + 1] = amp.im;
  }
  return { format: 'dense', numQubits: sparse.numQubits, data };
};

export const toSparse = (dense: DenseStateVector): SparseStateVector => {
  const entries = new Map<number, { re: number; im: number }>();
  const len = dense.data.length / 2;
  for (let i = 0; i < len; i++) {
    const re = dense.data[i * 2];
    const im = dense.data[i * 2 + 1];
    if (Math.abs(re) > EPSILON || Math.abs(im) > EPSILON) {
      entries.set(i, { re, im });
    }
  }
  return { format: 'sparse', numQubits: dense.numQubits, entries };
};

export const createSparseInitial = (numQubits: number): SparseStateVector => ({
  format: 'sparse',
  numQubits,
  entries: new Map([[0, { re: 1, im: 0 }]])
});

export const getNonZeroCount = (state: StateVector): number => {
  if (isSparse(state)) return state.entries.size;
  let count = 0;
  for (let i = 0; i < state.data.length / 2; i++) {
    if (Math.abs(state.data[i * 2]) > EPSILON ||
        Math.abs(state.data[i * 2 + 1]) > EPSILON) {
      count++;
    }
  }
  return count;
};
```

### Sparse Gate Application Pattern

```typescript
const applySparseGate = (
  state: SparseStateVector,
  gateType: GateType,
  targetRow: number,
  controlMask: number,
  numQubits: number,
  params?: GateParams
): SparseStateVector => {
  const matrix = getGateMatrix(gateType, params);
  const newEntries = new Map<number, { re: number; im: number }>();
  const bit = numQubits - 1 - targetRow;

  for (const [i, amp] of state.entries) {
    // Control check - identity if controls not satisfied
    if ((i & controlMask) !== controlMask) {
      accumulateToMap(newEntries, i, amp.re, amp.im);
      continue;
    }

    // Apply 2x2 matrix
    const localIdx = (i >> bit) & 1;
    const otherBits = i & ~(1 << bit);

    for (let k = 0; k < 2; k++) {
      const m = matrix[k][localIdx];
      if (Math.abs(m.re) < EPSILON && Math.abs(m.im) < EPSILON) continue;

      const targetIdx = otherBits | (k << bit);
      const valRe = m.re * amp.re - m.im * amp.im;
      const valIm = m.re * amp.im + m.im * amp.re;
      accumulateToMap(newEntries, targetIdx, valRe, valIm);
    }
  }

  // Prune near-zero entries
  for (const [idx, amp] of newEntries) {
    if (Math.abs(amp.re) < EPSILON && Math.abs(amp.im) < EPSILON) {
      newEntries.delete(idx);
    }
  }

  return { format: 'sparse', numQubits, entries: newEntries };
};

const accumulateToMap = (
  map: Map<number, { re: number; im: number }>,
  idx: number, re: number, im: number
): void => {
  const existing = map.get(idx);
  if (existing) {
    existing.re += re;
    existing.im += im;
  } else {
    map.set(idx, { re, im });
  }
};
```

---

## Files Requiring Modification

| File | Changes |
|------|---------|
| `types.ts` | Add `SparseStateVector`, `DenseStateVector`, `StateVector` types |
| `utils/quantum.ts` | Add sparse variants of gate functions, update `simulateCircuit`, add heuristics |
| `utils/sparseState.ts` | **New file** - conversion functions, sparse operations |
| `utils/quantum.test.ts` | Add sparse operation tests, conversion round-trip tests |
| `App.tsx` | Update `finalState` type to `StateVector \| null` |
| `components/AmplitudeGrid.tsx` | Accept `StateVector`, convert to dense for display |

### Functions in quantum.ts Needing Sparse Variants

| Function | Lines | Modification |
|----------|-------|--------------|
| `applyGate` | 1455-1503 | Add sparse branch |
| `applyGateWithAntiControl` | 1680-1726 | Add sparse branch |
| `applyArithmeticPermutation` | 430-471 | Add sparse branch |
| `applyArithmeticPermutationDynamic` | 477-529 | Add sparse branch |
| `applyComparisonGate` | 535-600 | Add sparse branch |
| `applyScalarGate` | 608-658 | Add sparse branch |
| `applySwapWithAntiControl` | 1643-1678 | Add sparse branch |
| `applyBitReversePermutation` | 1587-1639 | Add sparse branch |
| `measureQubit` | 1781-1820 | Sparse probability calculation |
| `getBlochVector` | 1730-1769 | Convert to dense (always needs full iteration) |
| `simulateCircuit` | 1329-1453 | Use StateVector, auto-convert |
| `runCircuitWithMeasurements` | 1827+ | Use StateVector, auto-convert |
| `createInitialState` | 1322-1327 | Return sparse for large numQubits |

---

## Risk Mitigation

### When Sparse Is Slower Than Dense

1. **Dense circuits** (H on all qubits) - Mitigate: Auto-convert to dense when sparsity > 50%
2. **UI display latency** - Mitigate: Convert to dense lazily, cache converted state
3. **Map hash collisions** - Mitigate: Use simple integer keys (good distribution)
4. **GC pressure** - Mitigate: Reuse Map objects where possible

### Testing Strategy

1. Round-trip tests: `toSparse(toDense(s)) ≈ s`
2. Equivalence tests: Dense and sparse produce same results
3. Performance benchmarks: Compare at various sparsity levels
4. Edge cases: Empty state, single amplitude, fully dense

---

## Implementation Trigger

Implement this design when:
1. `MAX_ROWS` in `constants.ts` is increased to 12+
2. User requests explicitly
3. Performance profiling shows memory pressure from history tracking

**Estimated effort**: 2-3 days for full implementation with tests

---

## Alternative: Quick Win for Memory (No Sparse Needed)

If memory becomes a concern before qubit limit increase:
1. Store history checkpoints every N columns instead of every column
2. Lazy recomputation from checkpoints when needed
3. Compress consecutive zero amplitudes in stored history
