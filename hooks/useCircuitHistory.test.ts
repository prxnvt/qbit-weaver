import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCircuitHistory } from './useCircuitHistory';
import { CircuitGrid, GateType } from '../types';

// Helper to create a simple grid for testing
const createTestGrid = (rows: number, cols: number): CircuitGrid => {
  return Array(rows).fill(null).map((_, r) =>
    Array(cols).fill(null).map((_, c) => ({
      gate: null,
      id: `cell-${r}-${c}`,
    }))
  );
};

// Helper to place a gate in a grid
const placeGate = (grid: CircuitGrid, row: number, col: number, gate: GateType): CircuitGrid => {
  const newGrid = grid.map(r => r.map(c => ({ ...c })));
  newGrid[row][col].gate = gate;
  return newGrid;
};

describe('useCircuitHistory', () => {
  describe('initialization', () => {
    it('should initialize with the provided grid', () => {
      const initialGrid = createTestGrid(2, 2);
      const { result } = renderHook(() => useCircuitHistory(initialGrid));

      expect(result.current.grid).toEqual(initialGrid);
      expect(result.current.canUndo).toBe(false);
      expect(result.current.canRedo).toBe(false);
    });

    it('should clone the initial grid to prevent external mutations', () => {
      const initialGrid = createTestGrid(2, 2);
      const { result } = renderHook(() => useCircuitHistory(initialGrid));

      // Mutate original
      initialGrid[0][0].gate = GateType.X;

      // Hook's grid should be unchanged
      expect(result.current.grid[0][0].gate).toBeNull();
    });
  });

  describe('setGrid (no history)', () => {
    it('should update grid without recording history', () => {
      const initialGrid = createTestGrid(2, 2);
      const { result } = renderHook(() => useCircuitHistory(initialGrid));

      act(() => {
        result.current.setGrid(prev => placeGate(prev, 0, 0, GateType.X));
      });

      expect(result.current.grid[0][0].gate).toBe(GateType.X);
      expect(result.current.canUndo).toBe(false);
    });

    it('should accept a direct grid value', () => {
      const initialGrid = createTestGrid(2, 2);
      const { result } = renderHook(() => useCircuitHistory(initialGrid));

      const newGrid = placeGate(initialGrid, 0, 0, GateType.H);

      act(() => {
        result.current.setGrid(newGrid);
      });

      expect(result.current.grid[0][0].gate).toBe(GateType.H);
      expect(result.current.canUndo).toBe(false);
    });

    it('should not affect undo/redo stacks', () => {
      const initialGrid = createTestGrid(2, 2);
      const { result } = renderHook(() => useCircuitHistory(initialGrid));

      // First, push a state to create history
      act(() => {
        result.current.pushState(prev => placeGate(prev, 0, 0, GateType.X));
      });

      expect(result.current.canUndo).toBe(true);

      // Use setGrid - should not affect history
      act(() => {
        result.current.setGrid(prev => placeGate(prev, 0, 1, GateType.Y));
      });

      expect(result.current.grid[0][1].gate).toBe(GateType.Y);
      expect(result.current.canUndo).toBe(true); // Still true from pushState
    });
  });

  describe('pushState (records history)', () => {
    it('should update grid and record history', () => {
      const initialGrid = createTestGrid(2, 2);
      const { result } = renderHook(() => useCircuitHistory(initialGrid));

      act(() => {
        result.current.pushState(prev => placeGate(prev, 0, 0, GateType.X));
      });

      expect(result.current.grid[0][0].gate).toBe(GateType.X);
      expect(result.current.canUndo).toBe(true);
    });

    it('should clear future on new action', () => {
      const initialGrid = createTestGrid(2, 2);
      const { result } = renderHook(() => useCircuitHistory(initialGrid));

      // Push two states
      act(() => {
        result.current.pushState(prev => placeGate(prev, 0, 0, GateType.X));
      });
      act(() => {
        result.current.pushState(prev => placeGate(prev, 0, 1, GateType.Y));
      });

      // Undo to create future
      act(() => {
        result.current.undo();
      });

      expect(result.current.canRedo).toBe(true);

      // New action should clear future
      act(() => {
        result.current.pushState(prev => placeGate(prev, 1, 0, GateType.Z));
      });

      expect(result.current.canRedo).toBe(false);
    });

    it('should not record history when grid is unchanged', () => {
      const initialGrid = createTestGrid(2, 2);
      const { result } = renderHook(() => useCircuitHistory(initialGrid));

      // Push same grid (no actual change)
      act(() => {
        result.current.pushState(prev => prev);
      });

      expect(result.current.canUndo).toBe(false);
    });

    it('should accept a direct grid value', () => {
      const initialGrid = createTestGrid(2, 2);
      const { result } = renderHook(() => useCircuitHistory(initialGrid));

      const newGrid = placeGate(initialGrid, 0, 0, GateType.H);

      act(() => {
        result.current.pushState(newGrid);
      });

      expect(result.current.grid[0][0].gate).toBe(GateType.H);
      expect(result.current.canUndo).toBe(true);
    });
  });

  describe('undo', () => {
    it('should restore previous state', () => {
      const initialGrid = createTestGrid(2, 2);
      const { result } = renderHook(() => useCircuitHistory(initialGrid));

      act(() => {
        result.current.pushState(prev => placeGate(prev, 0, 0, GateType.X));
      });

      expect(result.current.grid[0][0].gate).toBe(GateType.X);

      act(() => {
        result.current.undo();
      });

      expect(result.current.grid[0][0].gate).toBeNull();
      expect(result.current.canUndo).toBe(false);
      expect(result.current.canRedo).toBe(true);
    });

    it('should handle multiple undos', () => {
      const initialGrid = createTestGrid(2, 2);
      const { result } = renderHook(() => useCircuitHistory(initialGrid));

      act(() => {
        result.current.pushState(prev => placeGate(prev, 0, 0, GateType.X));
      });
      act(() => {
        result.current.pushState(prev => placeGate(prev, 0, 1, GateType.Y));
      });
      act(() => {
        result.current.pushState(prev => placeGate(prev, 1, 0, GateType.Z));
      });

      // Undo three times
      act(() => {
        result.current.undo();
      });
      expect(result.current.grid[1][0].gate).toBeNull();
      expect(result.current.grid[0][1].gate).toBe(GateType.Y);

      act(() => {
        result.current.undo();
      });
      expect(result.current.grid[0][1].gate).toBeNull();
      expect(result.current.grid[0][0].gate).toBe(GateType.X);

      act(() => {
        result.current.undo();
      });
      expect(result.current.grid[0][0].gate).toBeNull();
      expect(result.current.canUndo).toBe(false);
    });

    it('should do nothing when history is empty', () => {
      const initialGrid = createTestGrid(2, 2);
      const { result } = renderHook(() => useCircuitHistory(initialGrid));

      // Try to undo with no history
      act(() => {
        result.current.undo();
      });

      expect(result.current.grid).toEqual(initialGrid);
      expect(result.current.canUndo).toBe(false);
    });
  });

  describe('redo', () => {
    it('should restore undone state', () => {
      const initialGrid = createTestGrid(2, 2);
      const { result } = renderHook(() => useCircuitHistory(initialGrid));

      act(() => {
        result.current.pushState(prev => placeGate(prev, 0, 0, GateType.X));
      });
      act(() => {
        result.current.undo();
      });

      expect(result.current.grid[0][0].gate).toBeNull();

      act(() => {
        result.current.redo();
      });

      expect(result.current.grid[0][0].gate).toBe(GateType.X);
      expect(result.current.canRedo).toBe(false);
      expect(result.current.canUndo).toBe(true);
    });

    it('should handle multiple redos', () => {
      const initialGrid = createTestGrid(2, 2);
      const { result } = renderHook(() => useCircuitHistory(initialGrid));

      act(() => {
        result.current.pushState(prev => placeGate(prev, 0, 0, GateType.X));
      });
      act(() => {
        result.current.pushState(prev => placeGate(prev, 0, 1, GateType.Y));
      });

      // Undo twice
      act(() => {
        result.current.undo();
      });
      act(() => {
        result.current.undo();
      });

      // Redo twice
      act(() => {
        result.current.redo();
      });
      expect(result.current.grid[0][0].gate).toBe(GateType.X);

      act(() => {
        result.current.redo();
      });
      expect(result.current.grid[0][1].gate).toBe(GateType.Y);
      expect(result.current.canRedo).toBe(false);
    });

    it('should do nothing when future is empty', () => {
      const initialGrid = createTestGrid(2, 2);
      const { result } = renderHook(() => useCircuitHistory(initialGrid));

      act(() => {
        result.current.pushState(prev => placeGate(prev, 0, 0, GateType.X));
      });

      // Try to redo with no future
      act(() => {
        result.current.redo();
      });

      expect(result.current.grid[0][0].gate).toBe(GateType.X);
      expect(result.current.canRedo).toBe(false);
    });
  });

  describe('saveSnapshot + commitDrag (drag transactions)', () => {
    it('should record drag as single history entry', () => {
      const initialGrid = createTestGrid(2, 2);
      const { result } = renderHook(() => useCircuitHistory(initialGrid));

      // Start drag - save snapshot
      act(() => {
        result.current.saveSnapshot();
      });

      // Multiple setGrid calls during drag (no history)
      act(() => {
        result.current.setGrid(prev => placeGate(prev, 0, 0, GateType.X));
      });
      act(() => {
        result.current.setGrid(prev => placeGate(prev, 0, 1, GateType.Y));
      });
      act(() => {
        result.current.setGrid(prev => placeGate(prev, 1, 0, GateType.Z));
      });

      expect(result.current.canUndo).toBe(false);

      // End drag - commit
      act(() => {
        result.current.commitDrag();
      });

      expect(result.current.canUndo).toBe(true);
      expect(result.current.grid[0][0].gate).toBe(GateType.X);
      expect(result.current.grid[0][1].gate).toBe(GateType.Y);
      expect(result.current.grid[1][0].gate).toBe(GateType.Z);

      // Single undo should restore to pre-drag state
      act(() => {
        result.current.undo();
      });

      expect(result.current.grid[0][0].gate).toBeNull();
      expect(result.current.grid[0][1].gate).toBeNull();
      expect(result.current.grid[1][0].gate).toBeNull();
    });

    it('should not record if grid unchanged during drag', () => {
      const initialGrid = createTestGrid(2, 2);
      const { result } = renderHook(() => useCircuitHistory(initialGrid));

      act(() => {
        result.current.saveSnapshot();
      });

      // No changes during drag
      act(() => {
        result.current.commitDrag();
      });

      expect(result.current.canUndo).toBe(false);
    });

    it('should handle commitDrag without saveSnapshot', () => {
      const initialGrid = createTestGrid(2, 2);
      const { result } = renderHook(() => useCircuitHistory(initialGrid));

      // commitDrag without saveSnapshot should be a no-op
      act(() => {
        result.current.setGrid(prev => placeGate(prev, 0, 0, GateType.X));
      });
      act(() => {
        result.current.commitDrag();
      });

      expect(result.current.grid[0][0].gate).toBe(GateType.X);
      expect(result.current.canUndo).toBe(false);
    });

    it('should clear future on commitDrag', () => {
      const initialGrid = createTestGrid(2, 2);
      const { result } = renderHook(() => useCircuitHistory(initialGrid));

      // Create some history and undo
      act(() => {
        result.current.pushState(prev => placeGate(prev, 0, 0, GateType.X));
      });
      act(() => {
        result.current.undo();
      });

      expect(result.current.canRedo).toBe(true);

      // Drag transaction
      act(() => {
        result.current.saveSnapshot();
      });
      act(() => {
        result.current.setGrid(prev => placeGate(prev, 0, 1, GateType.Y));
      });
      act(() => {
        result.current.commitDrag();
      });

      expect(result.current.canRedo).toBe(false);
    });
  });

  describe('history limit', () => {
    it('should limit history to maxHistory entries', () => {
      const initialGrid = createTestGrid(2, 2);
      const maxHistory = 3;
      const { result } = renderHook(() => useCircuitHistory(initialGrid, maxHistory));

      // Push more than maxHistory states
      for (let i = 0; i < 5; i++) {
        act(() => {
          result.current.pushState(prev => {
            const newGrid = prev.map(r => r.map(c => ({ ...c })));
            newGrid[0][0].gate = `GATE_${i}` as GateType;
            return newGrid;
          });
        });
      }

      // Should only be able to undo maxHistory times
      let undoCount = 0;
      while (result.current.canUndo) {
        act(() => {
          result.current.undo();
        });
        undoCount++;
      }

      expect(undoCount).toBe(maxHistory);
    });

    it('should limit history for commitDrag as well', () => {
      const initialGrid = createTestGrid(2, 2);
      const maxHistory = 2;
      const { result } = renderHook(() => useCircuitHistory(initialGrid, maxHistory));

      // Fill up history
      act(() => {
        result.current.pushState(prev => placeGate(prev, 0, 0, GateType.X));
      });
      act(() => {
        result.current.pushState(prev => placeGate(prev, 0, 1, GateType.Y));
      });

      // Drag transaction should also respect limit
      act(() => {
        result.current.saveSnapshot();
      });
      act(() => {
        result.current.setGrid(prev => placeGate(prev, 1, 0, GateType.Z));
      });
      act(() => {
        result.current.commitDrag();
      });

      // Should only be able to undo maxHistory times
      let undoCount = 0;
      while (result.current.canUndo) {
        act(() => {
          result.current.undo();
        });
        undoCount++;
      }

      expect(undoCount).toBe(maxHistory);
    });
  });

  describe('grid immutability', () => {
    it('should not allow mutations to affect internal state', () => {
      const initialGrid = createTestGrid(2, 2);
      const { result } = renderHook(() => useCircuitHistory(initialGrid));

      // Get reference to grid
      const gridRef = result.current.grid;

      // Push a state
      act(() => {
        result.current.pushState(prev => placeGate(prev, 0, 0, GateType.X));
      });

      // Old reference should be unchanged
      expect(gridRef[0][0].gate).toBeNull();
    });

    it('should provide independent copies for undo/redo', () => {
      const initialGrid = createTestGrid(2, 2);
      const { result } = renderHook(() => useCircuitHistory(initialGrid));

      act(() => {
        result.current.pushState(prev => placeGate(prev, 0, 0, GateType.X));
      });

      const afterPush = result.current.grid;

      act(() => {
        result.current.undo();
      });

      const afterUndo = result.current.grid;

      // References should be different
      expect(afterPush).not.toBe(afterUndo);

      // Values should be different
      expect(afterPush[0][0].gate).toBe(GateType.X);
      expect(afterUndo[0][0].gate).toBeNull();
    });
  });
});
