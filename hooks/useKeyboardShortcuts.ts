import { useEffect, useCallback } from 'react';
import { GateType, CircuitGrid, isSpanningGate } from '../types';

export interface UseKeyboardShortcutsOptions {
  /** Currently selected cell */
  selectedCell: { row: number; col: number } | null;
  /** Function to select a cell */
  selectCell: (row: number, col: number) => void;
  /** Function to clear selection */
  clearSelection: () => void;
  /** Maximum number of rows */
  maxRows: number;
  /** Number of columns currently displayed */
  displayColCount: number;
  /** Current grid state */
  grid: CircuitGrid;
  /** Push a new state to history (for undoable operations) */
  pushState: (update: CircuitGrid | ((prev: CircuitGrid) => CircuitGrid)) => void;
  /** Delete spanning gate function */
  deleteSpanningGate: (col: number, anchorRow: number) => void;
  /** Optional callback to track recently used gates */
  addRecentGate?: (gate: GateType) => void;
}

/** Gate hotkeys mapping */
const GATE_HOTKEYS: Record<string, GateType> = {
  h: GateType.H,
  x: GateType.X,
  y: GateType.Y,
  z: GateType.Z,
  s: GateType.S,
  t: GateType.T,
  m: GateType.MEASURE,
};

/**
 * Check if an event target is an interactive element that should
 * prevent keyboard shortcuts from firing.
 */
function isInteractiveElement(target: EventTarget | null): boolean {
  if (!target) return false;
  if (!(target instanceof HTMLElement)) return false;

  // Check for input/textarea elements
  if (
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement
  ) {
    return true;
  }

  // Check for dialog elements
  if (
    target.getAttribute('role') === 'dialog' ||
    target.closest('[role="dialog"]')
  ) {
    return true;
  }

  // Check for contenteditable
  if (target.isContentEditable) {
    return true;
  }

  return false;
}

/**
 * Hook for handling keyboard shortcuts in the circuit editor.
 *
 * Handles:
 * - Arrow key navigation (moves selection within grid bounds)
 * - Delete/Backspace (clears gate from selected cell)
 * - Gate hotkeys (H, X, Y, Z, S, T, M)
 * - Escape (clears selection)
 */
export function useKeyboardShortcuts({
  selectedCell,
  selectCell,
  clearSelection,
  maxRows,
  displayColCount,
  grid,
  pushState,
  deleteSpanningGate,
  addRecentGate,
}: UseKeyboardShortcutsOptions): void {
  /**
   * Handle arrow key navigation.
   * Moves selection within grid bounds without wrapping.
   */
  const handleArrowNavigation = useCallback(
    (key: string) => {
      if (!selectedCell) return;

      const { row, col } = selectedCell;
      let newRow = row;
      let newCol = col;

      switch (key) {
        case 'ArrowUp':
          newRow = Math.max(0, row - 1);
          break;
        case 'ArrowDown':
          newRow = Math.min(maxRows - 1, row + 1);
          break;
        case 'ArrowLeft':
          newCol = Math.max(0, col - 1);
          break;
        case 'ArrowRight':
          newCol = Math.min(displayColCount - 1, col + 1);
          break;
      }

      if (newRow !== row || newCol !== col) {
        selectCell(newRow, newCol);
      }
    },
    [selectedCell, selectCell, maxRows, displayColCount]
  );

  /**
   * Handle delete/backspace to clear gate from selected cell.
   * Uses pushState to ensure the operation is undoable.
   */
  const handleDelete = useCallback(() => {
    if (!selectedCell) return;

    const { row, col } = selectedCell;
    const cell = grid[row]?.[col];

    if (!cell || !cell.gate) return;

    // If this is a spanning gate, delete the entire span
    if (isSpanningGate(cell.gate)) {
      const span = cell.params?.reverseSpan;
      if (span) {
        deleteSpanningGate(col, span.startRow);
        return;
      }
    }

    // Clear the single cell using pushState for undo support
    pushState((prev) => {
      const newGrid = prev.map((r) => r.map((c) => ({ ...c })));
      newGrid[row][col].gate = null;
      newGrid[row][col].params = undefined;
      return newGrid;
    });
  }, [selectedCell, grid, pushState, deleteSpanningGate]);

  /**
   * Handle gate hotkeys to place gates at selected cell.
   * Uses pushState to ensure the operation is undoable.
   */
  const handleGateHotkey = useCallback(
    (gateType: GateType) => {
      if (!selectedCell) return;

      const { row, col } = selectedCell;

      // Place the gate using pushState for undo support
      pushState((prev) => {
        const newGrid = prev.map((r) => r.map((c) => ({ ...c })));
        newGrid[row][col] = {
          ...newGrid[row][col],
          gate: gateType,
          params: undefined,
        };
        return newGrid;
      });

      // Track recently used gate
      addRecentGate?.(gateType);
    },
    [selectedCell, pushState, addRecentGate]
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Skip if target is an interactive element
      if (isInteractiveElement(e.target)) {
        return;
      }

      // Handle Escape - clears selection
      // Note: In future, this should check for search being active first
      if (e.key === 'Escape') {
        if (selectedCell) {
          e.preventDefault();
          clearSelection();
        }
        return;
      }

      // Handle arrow keys for navigation
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        if (selectedCell) {
          e.preventDefault();
          handleArrowNavigation(e.key);
        }
        return;
      }

      // Handle Delete/Backspace to clear gate
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedCell) {
          e.preventDefault();
          handleDelete();
        }
        return;
      }

      // Handle gate hotkeys (lowercase letter keys)
      const lowerKey = e.key.toLowerCase();
      if (GATE_HOTKEYS[lowerKey]) {
        if (selectedCell) {
          e.preventDefault();
          handleGateHotkey(GATE_HOTKEYS[lowerKey]);
        }
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    selectedCell,
    clearSelection,
    handleArrowNavigation,
    handleDelete,
    handleGateHotkey,
  ]);
}
