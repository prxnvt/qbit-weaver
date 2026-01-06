import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useRecentGates } from './useRecentGates';
import { GateType } from '../types';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
    get length() {
      return Object.keys(store).length;
    },
    key: vi.fn((index: number) => Object.keys(store)[index] || null),
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

describe('useRecentGates', () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  describe('initialization', () => {
    it('should initialize with empty array when localStorage is empty', () => {
      const { result } = renderHook(() => useRecentGates());

      expect(result.current.recentGates).toEqual([]);
    });

    it('should initialize with existing localStorage data', () => {
      const existingGates = [GateType.H, GateType.X, GateType.Y];
      localStorageMock.setItem('qcvo-recent-gates', JSON.stringify(existingGates));

      const { result } = renderHook(() => useRecentGates());

      expect(result.current.recentGates).toEqual(existingGates);
    });

    it('should handle invalid localStorage data gracefully', () => {
      localStorageMock.setItem('qcvo-recent-gates', 'invalid-json');

      const { result } = renderHook(() => useRecentGates());

      expect(result.current.recentGates).toEqual([]);
    });

    it('should filter out invalid gate types from localStorage', () => {
      const mixedData = [GateType.H, 'INVALID_GATE', GateType.X, 123, null];
      localStorageMock.setItem('qcvo-recent-gates', JSON.stringify(mixedData));

      const { result } = renderHook(() => useRecentGates());

      expect(result.current.recentGates).toEqual([GateType.H, GateType.X]);
    });

    it('should filter out CUSTOM gates from localStorage', () => {
      const dataWithCustom = [GateType.H, GateType.CUSTOM, GateType.X];
      localStorageMock.setItem('qcvo-recent-gates', JSON.stringify(dataWithCustom));

      const { result } = renderHook(() => useRecentGates());

      expect(result.current.recentGates).toEqual([GateType.H, GateType.X]);
    });
  });

  describe('addRecentGate', () => {
    it('should add gate to front of list', () => {
      const { result } = renderHook(() => useRecentGates());

      act(() => {
        result.current.addRecentGate(GateType.H);
      });

      expect(result.current.recentGates).toEqual([GateType.H]);

      act(() => {
        result.current.addRecentGate(GateType.X);
      });

      expect(result.current.recentGates).toEqual([GateType.X, GateType.H]);
    });

    it('should move existing gate to front (no duplicates)', () => {
      const { result } = renderHook(() => useRecentGates());

      act(() => {
        result.current.addRecentGate(GateType.H);
        result.current.addRecentGate(GateType.X);
        result.current.addRecentGate(GateType.Y);
      });

      expect(result.current.recentGates).toEqual([GateType.Y, GateType.X, GateType.H]);

      // Add H again - should move to front
      act(() => {
        result.current.addRecentGate(GateType.H);
      });

      expect(result.current.recentGates).toEqual([GateType.H, GateType.Y, GateType.X]);
    });

    it('should limit to max 8 gates', () => {
      const { result } = renderHook(() => useRecentGates());

      const gates = [
        GateType.H,
        GateType.X,
        GateType.Y,
        GateType.Z,
        GateType.S,
        GateType.T,
        GateType.CX,
        GateType.SWAP,
        GateType.MEASURE, // 9th gate
        GateType.RX,      // 10th gate
      ];

      act(() => {
        gates.forEach((gate) => result.current.addRecentGate(gate));
      });

      expect(result.current.recentGates).toHaveLength(8);
      // Most recent first, oldest dropped
      expect(result.current.recentGates).toEqual([
        GateType.RX,
        GateType.MEASURE,
        GateType.SWAP,
        GateType.CX,
        GateType.T,
        GateType.S,
        GateType.Z,
        GateType.Y,
      ]);
      // H and X should have been dropped
      expect(result.current.recentGates).not.toContain(GateType.H);
      expect(result.current.recentGates).not.toContain(GateType.X);
    });

    it('should exclude GateType.CUSTOM', () => {
      const { result } = renderHook(() => useRecentGates());

      act(() => {
        result.current.addRecentGate(GateType.H);
        result.current.addRecentGate(GateType.CUSTOM);
        result.current.addRecentGate(GateType.X);
      });

      expect(result.current.recentGates).toEqual([GateType.X, GateType.H]);
      expect(result.current.recentGates).not.toContain(GateType.CUSTOM);
    });
  });

  describe('localStorage persistence', () => {
    it('should persist to localStorage when adding gates', () => {
      const { result } = renderHook(() => useRecentGates());

      act(() => {
        result.current.addRecentGate(GateType.H);
        result.current.addRecentGate(GateType.X);
      });

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'qcvo-recent-gates',
        JSON.stringify([GateType.X, GateType.H])
      );
    });

    it('should persist after moving gate to front', () => {
      const { result } = renderHook(() => useRecentGates());

      act(() => {
        result.current.addRecentGate(GateType.H);
        result.current.addRecentGate(GateType.X);
        result.current.addRecentGate(GateType.H); // Move H to front
      });

      // Last call should have H first
      const lastCall = localStorageMock.setItem.mock.calls[
        localStorageMock.setItem.mock.calls.length - 1
      ];
      expect(lastCall).toEqual([
        'qcvo-recent-gates',
        JSON.stringify([GateType.H, GateType.X]),
      ]);
    });

    it('should not call setItem for CUSTOM gates', () => {
      const { result } = renderHook(() => useRecentGates());

      act(() => {
        result.current.addRecentGate(GateType.CUSTOM);
      });

      expect(localStorageMock.setItem).not.toHaveBeenCalled();
    });

    it('should load persisted data across renders', () => {
      // First render - add some gates
      const { result: result1 } = renderHook(() => useRecentGates());

      act(() => {
        result1.current.addRecentGate(GateType.H);
        result1.current.addRecentGate(GateType.X);
      });

      // Second render - should load from localStorage
      const { result: result2 } = renderHook(() => useRecentGates());

      expect(result2.current.recentGates).toEqual([GateType.X, GateType.H]);
    });
  });

  describe('edge cases', () => {
    it('should handle adding same gate multiple times consecutively', () => {
      const { result } = renderHook(() => useRecentGates());

      act(() => {
        result.current.addRecentGate(GateType.H);
        result.current.addRecentGate(GateType.H);
        result.current.addRecentGate(GateType.H);
      });

      expect(result.current.recentGates).toEqual([GateType.H]);
    });

    it('should handle non-array localStorage data', () => {
      localStorageMock.setItem('qcvo-recent-gates', JSON.stringify({ not: 'an array' }));

      const { result } = renderHook(() => useRecentGates());

      expect(result.current.recentGates).toEqual([]);
    });

    it('should handle null localStorage data', () => {
      localStorageMock.setItem('qcvo-recent-gates', JSON.stringify(null));

      const { result } = renderHook(() => useRecentGates());

      expect(result.current.recentGates).toEqual([]);
    });
  });
});
