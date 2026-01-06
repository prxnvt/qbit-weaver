import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useKeyboardShortcuts, UseKeyboardShortcutsOptions } from './useKeyboardShortcuts';
import { CircuitGrid, GateType } from '../types';

// Helper to create a simple grid for testing
const createTestGrid = (rows: number, cols: number): CircuitGrid => {
  return Array(rows)
    .fill(null)
    .map((_, r) =>
      Array(cols)
        .fill(null)
        .map((_, c) => ({
          gate: null,
          id: `cell-${r}-${c}`,
        }))
    );
};

// Helper to place a gate in a grid
const placeGate = (
  grid: CircuitGrid,
  row: number,
  col: number,
  gate: GateType
): CircuitGrid => {
  const newGrid = grid.map((r) => r.map((c) => ({ ...c })));
  newGrid[row][col].gate = gate;
  return newGrid;
};

// Helper to fire keyboard events
const fireKeyDown = (key: string, options: Partial<KeyboardEventInit> = {}) => {
  const event = new KeyboardEvent('keydown', {
    key,
    bubbles: true,
    cancelable: true,
    ...options,
  });
  window.dispatchEvent(event);
  return event;
};

describe('useKeyboardShortcuts', () => {
  let defaultOptions: UseKeyboardShortcutsOptions;

  beforeEach(() => {
    defaultOptions = {
      selectedCell: null,
      selectCell: vi.fn(),
      clearSelection: vi.fn(),
      maxRows: 8,
      displayColCount: 10,
      grid: createTestGrid(8, 10),
      pushState: vi.fn(),
      deleteSpanningGate: vi.fn(),
    };
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('arrow key navigation', () => {
    it('should move selection up on ArrowUp', () => {
      const selectCell = vi.fn();
      renderHook(() =>
        useKeyboardShortcuts({
          ...defaultOptions,
          selectedCell: { row: 3, col: 5 },
          selectCell,
        })
      );

      act(() => {
        fireKeyDown('ArrowUp');
      });

      expect(selectCell).toHaveBeenCalledWith(2, 5);
    });

    it('should move selection down on ArrowDown', () => {
      const selectCell = vi.fn();
      renderHook(() =>
        useKeyboardShortcuts({
          ...defaultOptions,
          selectedCell: { row: 3, col: 5 },
          selectCell,
        })
      );

      act(() => {
        fireKeyDown('ArrowDown');
      });

      expect(selectCell).toHaveBeenCalledWith(4, 5);
    });

    it('should move selection left on ArrowLeft', () => {
      const selectCell = vi.fn();
      renderHook(() =>
        useKeyboardShortcuts({
          ...defaultOptions,
          selectedCell: { row: 3, col: 5 },
          selectCell,
        })
      );

      act(() => {
        fireKeyDown('ArrowLeft');
      });

      expect(selectCell).toHaveBeenCalledWith(3, 4);
    });

    it('should move selection right on ArrowRight', () => {
      const selectCell = vi.fn();
      renderHook(() =>
        useKeyboardShortcuts({
          ...defaultOptions,
          selectedCell: { row: 3, col: 5 },
          selectCell,
        })
      );

      act(() => {
        fireKeyDown('ArrowRight');
      });

      expect(selectCell).toHaveBeenCalledWith(3, 6);
    });

    it('should not move selection above row 0', () => {
      const selectCell = vi.fn();
      renderHook(() =>
        useKeyboardShortcuts({
          ...defaultOptions,
          selectedCell: { row: 0, col: 5 },
          selectCell,
        })
      );

      act(() => {
        fireKeyDown('ArrowUp');
      });

      // Should not call selectCell when already at boundary
      expect(selectCell).not.toHaveBeenCalled();
    });

    it('should not move selection below maxRows - 1', () => {
      const selectCell = vi.fn();
      renderHook(() =>
        useKeyboardShortcuts({
          ...defaultOptions,
          selectedCell: { row: 7, col: 5 },
          selectCell,
        })
      );

      act(() => {
        fireKeyDown('ArrowDown');
      });

      expect(selectCell).not.toHaveBeenCalled();
    });

    it('should not move selection left of col 0', () => {
      const selectCell = vi.fn();
      renderHook(() =>
        useKeyboardShortcuts({
          ...defaultOptions,
          selectedCell: { row: 3, col: 0 },
          selectCell,
        })
      );

      act(() => {
        fireKeyDown('ArrowLeft');
      });

      expect(selectCell).not.toHaveBeenCalled();
    });

    it('should not move selection right of displayColCount - 1', () => {
      const selectCell = vi.fn();
      renderHook(() =>
        useKeyboardShortcuts({
          ...defaultOptions,
          selectedCell: { row: 3, col: 9 },
          selectCell,
        })
      );

      act(() => {
        fireKeyDown('ArrowRight');
      });

      expect(selectCell).not.toHaveBeenCalled();
    });

    it('should not navigate when no cell is selected', () => {
      const selectCell = vi.fn();
      renderHook(() =>
        useKeyboardShortcuts({
          ...defaultOptions,
          selectedCell: null,
          selectCell,
        })
      );

      act(() => {
        fireKeyDown('ArrowUp');
        fireKeyDown('ArrowDown');
        fireKeyDown('ArrowLeft');
        fireKeyDown('ArrowRight');
      });

      expect(selectCell).not.toHaveBeenCalled();
    });
  });

  describe('delete key handling', () => {
    it('should clear gate on Delete key', () => {
      const pushState = vi.fn();
      const gridWithGate = placeGate(createTestGrid(8, 10), 3, 5, GateType.H);

      renderHook(() =>
        useKeyboardShortcuts({
          ...defaultOptions,
          selectedCell: { row: 3, col: 5 },
          grid: gridWithGate,
          pushState,
        })
      );

      act(() => {
        fireKeyDown('Delete');
      });

      expect(pushState).toHaveBeenCalledTimes(1);

      // Execute the updater function to verify it clears the gate
      const updater = pushState.mock.calls[0][0];
      const result = updater(gridWithGate);
      expect(result[3][5].gate).toBeNull();
      expect(result[3][5].params).toBeUndefined();
    });

    it('should clear gate on Backspace key', () => {
      const pushState = vi.fn();
      const gridWithGate = placeGate(createTestGrid(8, 10), 3, 5, GateType.X);

      renderHook(() =>
        useKeyboardShortcuts({
          ...defaultOptions,
          selectedCell: { row: 3, col: 5 },
          grid: gridWithGate,
          pushState,
        })
      );

      act(() => {
        fireKeyDown('Backspace');
      });

      expect(pushState).toHaveBeenCalledTimes(1);

      const updater = pushState.mock.calls[0][0];
      const result = updater(gridWithGate);
      expect(result[3][5].gate).toBeNull();
    });

    it('should not call pushState when selected cell is empty', () => {
      const pushState = vi.fn();

      renderHook(() =>
        useKeyboardShortcuts({
          ...defaultOptions,
          selectedCell: { row: 3, col: 5 },
          pushState,
        })
      );

      act(() => {
        fireKeyDown('Delete');
      });

      expect(pushState).not.toHaveBeenCalled();
    });

    it('should not call pushState when no cell is selected', () => {
      const pushState = vi.fn();
      const gridWithGate = placeGate(createTestGrid(8, 10), 3, 5, GateType.H);

      renderHook(() =>
        useKeyboardShortcuts({
          ...defaultOptions,
          selectedCell: null,
          grid: gridWithGate,
          pushState,
        })
      );

      act(() => {
        fireKeyDown('Delete');
      });

      expect(pushState).not.toHaveBeenCalled();
    });

    it('should call deleteSpanningGate for spanning gates', () => {
      const deleteSpanningGate = vi.fn();
      const gridWithSpanning = createTestGrid(8, 10);
      gridWithSpanning[2][3] = {
        gate: GateType.REVERSE,
        id: 'cell-2-3',
        params: { reverseSpan: { startRow: 2, endRow: 4 }, isSpanContinuation: false },
      };

      renderHook(() =>
        useKeyboardShortcuts({
          ...defaultOptions,
          selectedCell: { row: 2, col: 3 },
          grid: gridWithSpanning,
          deleteSpanningGate,
        })
      );

      act(() => {
        fireKeyDown('Delete');
      });

      expect(deleteSpanningGate).toHaveBeenCalledWith(3, 2);
    });
  });

  describe('gate hotkeys', () => {
    it('should place Hadamard gate on H key', () => {
      const pushState = vi.fn();

      renderHook(() =>
        useKeyboardShortcuts({
          ...defaultOptions,
          selectedCell: { row: 3, col: 5 },
          pushState,
        })
      );

      act(() => {
        fireKeyDown('h');
      });

      expect(pushState).toHaveBeenCalledTimes(1);

      const updater = pushState.mock.calls[0][0];
      const result = updater(createTestGrid(8, 10));
      expect(result[3][5].gate).toBe(GateType.H);
    });

    it('should place X gate on X key', () => {
      const pushState = vi.fn();

      renderHook(() =>
        useKeyboardShortcuts({
          ...defaultOptions,
          selectedCell: { row: 2, col: 4 },
          pushState,
        })
      );

      act(() => {
        fireKeyDown('x');
      });

      expect(pushState).toHaveBeenCalledTimes(1);

      const updater = pushState.mock.calls[0][0];
      const result = updater(createTestGrid(8, 10));
      expect(result[2][4].gate).toBe(GateType.X);
    });

    it('should place Y gate on Y key', () => {
      const pushState = vi.fn();

      renderHook(() =>
        useKeyboardShortcuts({
          ...defaultOptions,
          selectedCell: { row: 1, col: 2 },
          pushState,
        })
      );

      act(() => {
        fireKeyDown('y');
      });

      const updater = pushState.mock.calls[0][0];
      const result = updater(createTestGrid(8, 10));
      expect(result[1][2].gate).toBe(GateType.Y);
    });

    it('should place Z gate on Z key', () => {
      const pushState = vi.fn();

      renderHook(() =>
        useKeyboardShortcuts({
          ...defaultOptions,
          selectedCell: { row: 0, col: 0 },
          pushState,
        })
      );

      act(() => {
        fireKeyDown('z');
      });

      const updater = pushState.mock.calls[0][0];
      const result = updater(createTestGrid(8, 10));
      expect(result[0][0].gate).toBe(GateType.Z);
    });

    it('should place S gate on S key', () => {
      const pushState = vi.fn();

      renderHook(() =>
        useKeyboardShortcuts({
          ...defaultOptions,
          selectedCell: { row: 5, col: 7 },
          pushState,
        })
      );

      act(() => {
        fireKeyDown('s');
      });

      const updater = pushState.mock.calls[0][0];
      const result = updater(createTestGrid(8, 10));
      expect(result[5][7].gate).toBe(GateType.S);
    });

    it('should place T gate on T key', () => {
      const pushState = vi.fn();

      renderHook(() =>
        useKeyboardShortcuts({
          ...defaultOptions,
          selectedCell: { row: 4, col: 3 },
          pushState,
        })
      );

      act(() => {
        fireKeyDown('t');
      });

      const updater = pushState.mock.calls[0][0];
      const result = updater(createTestGrid(8, 10));
      expect(result[4][3].gate).toBe(GateType.T);
    });

    it('should place Measure gate on M key', () => {
      const pushState = vi.fn();

      renderHook(() =>
        useKeyboardShortcuts({
          ...defaultOptions,
          selectedCell: { row: 6, col: 8 },
          pushState,
        })
      );

      act(() => {
        fireKeyDown('m');
      });

      const updater = pushState.mock.calls[0][0];
      const result = updater(createTestGrid(8, 10));
      expect(result[6][8].gate).toBe(GateType.MEASURE);
    });

    it('should work with uppercase letters', () => {
      const pushState = vi.fn();

      renderHook(() =>
        useKeyboardShortcuts({
          ...defaultOptions,
          selectedCell: { row: 3, col: 5 },
          pushState,
        })
      );

      act(() => {
        fireKeyDown('H');
      });

      expect(pushState).toHaveBeenCalledTimes(1);
    });

    it('should not place gate when no cell is selected', () => {
      const pushState = vi.fn();

      renderHook(() =>
        useKeyboardShortcuts({
          ...defaultOptions,
          selectedCell: null,
          pushState,
        })
      );

      act(() => {
        fireKeyDown('h');
        fireKeyDown('x');
        fireKeyDown('y');
        fireKeyDown('z');
      });

      expect(pushState).not.toHaveBeenCalled();
    });

    it('should overwrite existing gate', () => {
      const pushState = vi.fn();
      const gridWithGate = placeGate(createTestGrid(8, 10), 3, 5, GateType.X);

      renderHook(() =>
        useKeyboardShortcuts({
          ...defaultOptions,
          selectedCell: { row: 3, col: 5 },
          grid: gridWithGate,
          pushState,
        })
      );

      act(() => {
        fireKeyDown('h');
      });

      const updater = pushState.mock.calls[0][0];
      const result = updater(gridWithGate);
      expect(result[3][5].gate).toBe(GateType.H);
    });
  });

  describe('escape key', () => {
    it('should clear selection on Escape', () => {
      const clearSelection = vi.fn();

      renderHook(() =>
        useKeyboardShortcuts({
          ...defaultOptions,
          selectedCell: { row: 3, col: 5 },
          clearSelection,
        })
      );

      act(() => {
        fireKeyDown('Escape');
      });

      expect(clearSelection).toHaveBeenCalledTimes(1);
    });

    it('should not call clearSelection when no cell is selected', () => {
      const clearSelection = vi.fn();

      renderHook(() =>
        useKeyboardShortcuts({
          ...defaultOptions,
          selectedCell: null,
          clearSelection,
        })
      );

      act(() => {
        fireKeyDown('Escape');
      });

      expect(clearSelection).not.toHaveBeenCalled();
    });
  });

  describe('input element filtering', () => {
    it('should not handle shortcuts when input is focused', () => {
      const pushState = vi.fn();
      const selectCell = vi.fn();

      renderHook(() =>
        useKeyboardShortcuts({
          ...defaultOptions,
          selectedCell: { row: 3, col: 5 },
          pushState,
          selectCell,
        })
      );

      // Create and focus an input element
      const input = document.createElement('input');
      document.body.appendChild(input);
      input.focus();

      // Fire keyboard event with input as target
      const event = new KeyboardEvent('keydown', {
        key: 'h',
        bubbles: true,
        cancelable: true,
      });
      Object.defineProperty(event, 'target', { value: input });
      window.dispatchEvent(event);

      expect(pushState).not.toHaveBeenCalled();

      // Cleanup
      document.body.removeChild(input);
    });

    it('should not handle shortcuts when textarea is focused', () => {
      const pushState = vi.fn();

      renderHook(() =>
        useKeyboardShortcuts({
          ...defaultOptions,
          selectedCell: { row: 3, col: 5 },
          pushState,
        })
      );

      // Create and focus a textarea element
      const textarea = document.createElement('textarea');
      document.body.appendChild(textarea);
      textarea.focus();

      const event = new KeyboardEvent('keydown', {
        key: 'x',
        bubbles: true,
        cancelable: true,
      });
      Object.defineProperty(event, 'target', { value: textarea });
      window.dispatchEvent(event);

      expect(pushState).not.toHaveBeenCalled();

      // Cleanup
      document.body.removeChild(textarea);
    });

    it('should not handle shortcuts when dialog element is focused', () => {
      const pushState = vi.fn();

      renderHook(() =>
        useKeyboardShortcuts({
          ...defaultOptions,
          selectedCell: { row: 3, col: 5 },
          pushState,
        })
      );

      // Create a dialog element
      const dialog = document.createElement('div');
      dialog.setAttribute('role', 'dialog');
      document.body.appendChild(dialog);
      dialog.focus();

      const event = new KeyboardEvent('keydown', {
        key: 'h',
        bubbles: true,
        cancelable: true,
      });
      Object.defineProperty(event, 'target', { value: dialog });
      window.dispatchEvent(event);

      expect(pushState).not.toHaveBeenCalled();

      // Cleanup
      document.body.removeChild(dialog);
    });

    it('should not handle shortcuts when element inside dialog is focused', () => {
      const pushState = vi.fn();

      renderHook(() =>
        useKeyboardShortcuts({
          ...defaultOptions,
          selectedCell: { row: 3, col: 5 },
          pushState,
        })
      );

      // Create a dialog with a child element
      const dialog = document.createElement('div');
      dialog.setAttribute('role', 'dialog');
      const childButton = document.createElement('button');
      dialog.appendChild(childButton);
      document.body.appendChild(dialog);

      const event = new KeyboardEvent('keydown', {
        key: 'h',
        bubbles: true,
        cancelable: true,
      });
      Object.defineProperty(event, 'target', { value: childButton });
      window.dispatchEvent(event);

      expect(pushState).not.toHaveBeenCalled();

      // Cleanup
      document.body.removeChild(dialog);
    });
  });

  describe('cleanup', () => {
    it('should remove event listener on unmount', () => {
      const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');

      const { unmount } = renderHook(() =>
        useKeyboardShortcuts(defaultOptions)
      );

      unmount();

      expect(removeEventListenerSpy).toHaveBeenCalledWith(
        'keydown',
        expect.any(Function)
      );

      removeEventListenerSpy.mockRestore();
    });
  });

  describe('non-hotkey keys', () => {
    it('should ignore keys that are not hotkeys', () => {
      const pushState = vi.fn();
      const selectCell = vi.fn();
      const clearSelection = vi.fn();

      renderHook(() =>
        useKeyboardShortcuts({
          ...defaultOptions,
          selectedCell: { row: 3, col: 5 },
          pushState,
          selectCell,
          clearSelection,
        })
      );

      act(() => {
        fireKeyDown('a');
        fireKeyDown('b');
        fireKeyDown('c');
        fireKeyDown('1');
        fireKeyDown('Enter');
        fireKeyDown('Tab');
      });

      expect(pushState).not.toHaveBeenCalled();
      expect(selectCell).not.toHaveBeenCalled();
      expect(clearSelection).not.toHaveBeenCalled();
    });
  });
});
