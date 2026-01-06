import { useState, useCallback } from 'react';

/**
 * Represents a selected cell in the circuit grid
 */
export interface Selection {
  row: number;
  col: number;
}

export interface UseSelectionReturn {
  /** Currently selected cell, or null if nothing selected */
  selectedCell: Selection | null;
  /** Select a cell at the given row and column */
  selectCell: (row: number, col: number) => void;
  /** Clear the current selection */
  clearSelection: () => void;
  /** Check if a cell at the given row and column is selected */
  isSelected: (row: number, col: number) => boolean;
}

/**
 * Hook for managing cell selection state in the circuit grid.
 *
 * @param maxRows - Maximum number of rows in the grid
 * @param maxCols - Maximum number of columns in the grid
 */
export function useSelection(
  maxRows: number,
  maxCols: number
): UseSelectionReturn {
  const [selectedCell, setSelectedCell] = useState<Selection | null>(null);

  /**
   * Select a cell at the given row and column.
   * Performs bounds checking to ensure valid selection.
   */
  const selectCell = useCallback((row: number, col: number) => {
    // Bounds checking
    if (row < 0 || row >= maxRows || col < 0 || col >= maxCols) {
      return;
    }
    setSelectedCell({ row, col });
  }, [maxRows, maxCols]);

  /**
   * Clear the current selection.
   */
  const clearSelection = useCallback(() => {
    setSelectedCell(null);
  }, []);

  /**
   * Check if a cell at the given row and column is selected.
   */
  const isSelected = useCallback((row: number, col: number): boolean => {
    if (!selectedCell) return false;
    return selectedCell.row === row && selectedCell.col === col;
  }, [selectedCell]);

  return {
    selectedCell,
    selectCell,
    clearSelection,
    isSelected,
  };
}
