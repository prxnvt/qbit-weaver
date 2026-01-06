import { useState, useCallback, useRef } from 'react';
import { CircuitGrid } from '../types';

/**
 * Deep clone a CircuitGrid to prevent mutations
 */
const cloneGrid = (grid: CircuitGrid): CircuitGrid => {
  return grid.map(row => row.map(cell => ({ ...cell, params: cell.params ? { ...cell.params } : undefined })));
};

/**
 * Compare two grids for equality (shallow comparison of cell properties)
 */
const gridsEqual = (a: CircuitGrid, b: CircuitGrid): boolean => {
  if (a.length !== b.length) return false;
  for (let r = 0; r < a.length; r++) {
    if (a[r].length !== b[r].length) return false;
    for (let c = 0; c < a[r].length; c++) {
      if (a[r][c].gate !== b[r][c].gate) return false;
      // Compare params by JSON (simple but effective for our use case)
      if (JSON.stringify(a[r][c].params) !== JSON.stringify(b[r][c].params)) return false;
    }
  }
  return true;
};

export interface UseCircuitHistoryReturn {
  /** Current grid state */
  grid: CircuitGrid;
  /** Direct setter that does NOT record history (for expansions) */
  setGrid: (grid: CircuitGrid | ((prev: CircuitGrid) => CircuitGrid)) => void;
  /** Updates grid AND records to history */
  pushState: (grid: CircuitGrid | ((prev: CircuitGrid) => CircuitGrid)) => void;
  /** Save current state as "before" (for drag start) */
  saveSnapshot: () => void;
  /** Finalize drag transaction (for drag end/mouseup) */
  commitDrag: () => void;
  /** Undo to previous state */
  undo: () => void;
  /** Redo to next state */
  redo: () => void;
  /** Whether undo is available */
  canUndo: boolean;
  /** Whether redo is available */
  canRedo: boolean;
}

/**
 * Hook for managing circuit grid state with undo/redo support.
 *
 * @param initialGrid - Initial grid state
 * @param maxHistory - Maximum number of history states to keep (default 50)
 */
export function useCircuitHistory(
  initialGrid: CircuitGrid,
  maxHistory: number = 50
): UseCircuitHistoryReturn {
  // Current grid state
  const [grid, setGridInternal] = useState<CircuitGrid>(() => cloneGrid(initialGrid));

  // History stacks
  const [past, setPast] = useState<CircuitGrid[]>([]);
  const [future, setFuture] = useState<CircuitGrid[]>([]);

  // Snapshot for drag transactions
  const dragSnapshotRef = useRef<CircuitGrid | null>(null);

  /**
   * setGrid: Direct setter that does NOT record history.
   * Used for grid expansions (adding rows/columns) that shouldn't be undoable on their own.
   */
  const setGrid = useCallback((update: CircuitGrid | ((prev: CircuitGrid) => CircuitGrid)) => {
    setGridInternal(prev => {
      const newGrid = typeof update === 'function' ? update(prev) : update;
      return cloneGrid(newGrid);
    });
  }, []);

  /**
   * pushState: Updates grid AND records to history.
   * Used for user actions that should be undoable.
   */
  const pushState = useCallback((update: CircuitGrid | ((prev: CircuitGrid) => CircuitGrid)) => {
    setGridInternal(prev => {
      const newGrid = typeof update === 'function' ? update(prev) : update;
      const clonedNew = cloneGrid(newGrid);

      // Don't record if nothing changed
      if (gridsEqual(prev, clonedNew)) {
        return prev;
      }

      // Push current state to past
      setPast(prevPast => {
        const newPast = [...prevPast, cloneGrid(prev)];
        // Limit history size
        if (newPast.length > maxHistory) {
          return newPast.slice(newPast.length - maxHistory);
        }
        return newPast;
      });

      // Clear future on new action
      setFuture([]);

      return clonedNew;
    });
  }, [maxHistory]);

  /**
   * saveSnapshot: Save current state as "before" for drag transactions.
   * Call this when drag starts (e.g., when resizingGate becomes non-null).
   */
  const saveSnapshot = useCallback(() => {
    setGridInternal(current => {
      dragSnapshotRef.current = cloneGrid(current);
      return current;
    });
  }, []);

  /**
   * commitDrag: Finalize drag transaction.
   * If the grid changed from the snapshot, push the snapshot to history.
   * Call this on mouseup to record the entire drag as a single history entry.
   */
  const commitDrag = useCallback(() => {
    const snapshot = dragSnapshotRef.current;
    if (!snapshot) return;

    setGridInternal(current => {
      // If nothing changed, no need to record
      if (gridsEqual(snapshot, current)) {
        dragSnapshotRef.current = null;
        return current;
      }

      // Push snapshot (the "before" state) to past
      setPast(prevPast => {
        const newPast = [...prevPast, snapshot];
        if (newPast.length > maxHistory) {
          return newPast.slice(newPast.length - maxHistory);
        }
        return newPast;
      });

      // Clear future
      setFuture([]);

      // Clear snapshot
      dragSnapshotRef.current = null;

      return current;
    });
  }, [maxHistory]);

  /**
   * undo: Go back to previous state.
   * Current state moves to future, past.pop() becomes current.
   */
  const undo = useCallback(() => {
    setPast(prevPast => {
      if (prevPast.length === 0) return prevPast;

      const newPast = [...prevPast];
      const previousState = newPast.pop()!;

      setGridInternal(current => {
        // Push current to future
        setFuture(prevFuture => [cloneGrid(current), ...prevFuture]);
        return cloneGrid(previousState);
      });

      return newPast;
    });
  }, []);

  /**
   * redo: Go forward to next state.
   * Current state moves to past, future.shift() becomes current.
   */
  const redo = useCallback(() => {
    setFuture(prevFuture => {
      if (prevFuture.length === 0) return prevFuture;

      const newFuture = [...prevFuture];
      const nextState = newFuture.shift()!;

      setGridInternal(current => {
        // Push current to past
        setPast(prevPast => [...prevPast, cloneGrid(current)]);
        return cloneGrid(nextState);
      });

      return newFuture;
    });
  }, []);

  return {
    grid,
    setGrid,
    pushState,
    saveSnapshot,
    commitDrag,
    undo,
    redo,
    canUndo: past.length > 0,
    canRedo: future.length > 0,
  };
}
