import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSelection } from './useSelection';

describe('useSelection', () => {
  describe('initialization', () => {
    it('should initialize with no selection', () => {
      const { result } = renderHook(() => useSelection(8, 10));

      expect(result.current.selectedCell).toBeNull();
    });
  });

  describe('selectCell', () => {
    it('should select a cell at valid coordinates', () => {
      const { result } = renderHook(() => useSelection(8, 10));

      act(() => {
        result.current.selectCell(3, 5);
      });

      expect(result.current.selectedCell).toEqual({ row: 3, col: 5 });
    });

    it('should update selection when selecting a different cell', () => {
      const { result } = renderHook(() => useSelection(8, 10));

      act(() => {
        result.current.selectCell(1, 2);
      });

      expect(result.current.selectedCell).toEqual({ row: 1, col: 2 });

      act(() => {
        result.current.selectCell(4, 7);
      });

      expect(result.current.selectedCell).toEqual({ row: 4, col: 7 });
    });

    it('should not select cell with negative row', () => {
      const { result } = renderHook(() => useSelection(8, 10));

      act(() => {
        result.current.selectCell(-1, 5);
      });

      expect(result.current.selectedCell).toBeNull();
    });

    it('should not select cell with negative column', () => {
      const { result } = renderHook(() => useSelection(8, 10));

      act(() => {
        result.current.selectCell(3, -1);
      });

      expect(result.current.selectedCell).toBeNull();
    });

    it('should not select cell with row >= maxRows', () => {
      const { result } = renderHook(() => useSelection(8, 10));

      act(() => {
        result.current.selectCell(8, 5);
      });

      expect(result.current.selectedCell).toBeNull();

      act(() => {
        result.current.selectCell(10, 5);
      });

      expect(result.current.selectedCell).toBeNull();
    });

    it('should not select cell with col >= maxCols', () => {
      const { result } = renderHook(() => useSelection(8, 10));

      act(() => {
        result.current.selectCell(3, 10);
      });

      expect(result.current.selectedCell).toBeNull();

      act(() => {
        result.current.selectCell(3, 15);
      });

      expect(result.current.selectedCell).toBeNull();
    });

    it('should allow selecting boundary cells (row 0, col 0)', () => {
      const { result } = renderHook(() => useSelection(8, 10));

      act(() => {
        result.current.selectCell(0, 0);
      });

      expect(result.current.selectedCell).toEqual({ row: 0, col: 0 });
    });

    it('should allow selecting boundary cells (maxRow-1, maxCol-1)', () => {
      const { result } = renderHook(() => useSelection(8, 10));

      act(() => {
        result.current.selectCell(7, 9);
      });

      expect(result.current.selectedCell).toEqual({ row: 7, col: 9 });
    });
  });

  describe('clearSelection', () => {
    it('should clear the selection', () => {
      const { result } = renderHook(() => useSelection(8, 10));

      act(() => {
        result.current.selectCell(3, 5);
      });

      expect(result.current.selectedCell).not.toBeNull();

      act(() => {
        result.current.clearSelection();
      });

      expect(result.current.selectedCell).toBeNull();
    });

    it('should be safe to call when no selection exists', () => {
      const { result } = renderHook(() => useSelection(8, 10));

      expect(result.current.selectedCell).toBeNull();

      act(() => {
        result.current.clearSelection();
      });

      expect(result.current.selectedCell).toBeNull();
    });
  });

  describe('isSelected', () => {
    it('should return true for the selected cell', () => {
      const { result } = renderHook(() => useSelection(8, 10));

      act(() => {
        result.current.selectCell(3, 5);
      });

      expect(result.current.isSelected(3, 5)).toBe(true);
    });

    it('should return false for non-selected cells', () => {
      const { result } = renderHook(() => useSelection(8, 10));

      act(() => {
        result.current.selectCell(3, 5);
      });

      expect(result.current.isSelected(3, 4)).toBe(false);
      expect(result.current.isSelected(2, 5)).toBe(false);
      expect(result.current.isSelected(0, 0)).toBe(false);
    });

    it('should return false when no cell is selected', () => {
      const { result } = renderHook(() => useSelection(8, 10));

      expect(result.current.isSelected(3, 5)).toBe(false);
      expect(result.current.isSelected(0, 0)).toBe(false);
    });

    it('should update correctly after selection changes', () => {
      const { result } = renderHook(() => useSelection(8, 10));

      act(() => {
        result.current.selectCell(1, 2);
      });

      expect(result.current.isSelected(1, 2)).toBe(true);
      expect(result.current.isSelected(4, 7)).toBe(false);

      act(() => {
        result.current.selectCell(4, 7);
      });

      expect(result.current.isSelected(1, 2)).toBe(false);
      expect(result.current.isSelected(4, 7)).toBe(true);
    });

    it('should return false after clearing selection', () => {
      const { result } = renderHook(() => useSelection(8, 10));

      act(() => {
        result.current.selectCell(3, 5);
      });

      expect(result.current.isSelected(3, 5)).toBe(true);

      act(() => {
        result.current.clearSelection();
      });

      expect(result.current.isSelected(3, 5)).toBe(false);
    });
  });

  describe('dynamic bounds', () => {
    it('should respect changing maxRows', () => {
      const { result, rerender } = renderHook(
        ({ maxRows, maxCols }) => useSelection(maxRows, maxCols),
        { initialProps: { maxRows: 8, maxCols: 10 } }
      );

      // Valid selection with initial bounds
      act(() => {
        result.current.selectCell(7, 5);
      });
      expect(result.current.selectedCell).toEqual({ row: 7, col: 5 });

      // Rerender with smaller bounds
      rerender({ maxRows: 4, maxCols: 10 });

      // Try to select a cell that's now out of bounds
      act(() => {
        result.current.selectCell(5, 5);
      });

      // Selection should not change (the attempt was rejected)
      expect(result.current.selectedCell).toEqual({ row: 7, col: 5 });
    });

    it('should respect changing maxCols', () => {
      const { result, rerender } = renderHook(
        ({ maxRows, maxCols }) => useSelection(maxRows, maxCols),
        { initialProps: { maxRows: 8, maxCols: 10 } }
      );

      // Valid selection with initial bounds
      act(() => {
        result.current.selectCell(3, 9);
      });
      expect(result.current.selectedCell).toEqual({ row: 3, col: 9 });

      // Rerender with smaller bounds
      rerender({ maxRows: 8, maxCols: 5 });

      // Try to select a cell that's now out of bounds
      act(() => {
        result.current.selectCell(3, 7);
      });

      // Selection should not change (the attempt was rejected)
      expect(result.current.selectedCell).toEqual({ row: 3, col: 9 });
    });
  });
});
