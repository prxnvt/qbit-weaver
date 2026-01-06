import { useState, useCallback } from 'react';
import { GateType } from '../types';

const STORAGE_KEY = 'qcvo-recent-gates';
const MAX_RECENT = 8;

/**
 * Hook for tracking recently used gates.
 *
 * Features:
 * - Tracks last 8 gates placed on the circuit
 * - Persists to localStorage
 * - No duplicates (most recent placement moves to front)
 * - Excludes custom gates (GateType.CUSTOM)
 *
 * @returns Object with recentGates array and addRecentGate callback
 */
export function useRecentGates() {
  const [recentGates, setRecentGates] = useState<GateType[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) return [];
      const parsed = JSON.parse(stored) as unknown;
      // Validate that parsed value is an array of strings
      if (!Array.isArray(parsed)) return [];
      // Filter to only valid GateType values (excluding CUSTOM)
      return parsed.filter(
        (item): item is GateType =>
          typeof item === 'string' &&
          Object.values(GateType).includes(item as GateType) &&
          item !== GateType.CUSTOM
      );
    } catch {
      return [];
    }
  });

  const addRecentGate = useCallback((gate: GateType) => {
    // Exclude custom gates
    if (gate === GateType.CUSTOM) return;

    setRecentGates((prev) => {
      // Remove existing instance (if any) to avoid duplicates
      const filtered = prev.filter((g) => g !== gate);
      // Add to front and limit to MAX_RECENT
      const updated = [gate, ...filtered].slice(0, MAX_RECENT);
      // Persist to localStorage
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch {
        // Ignore storage errors (e.g., quota exceeded, private browsing)
      }
      return updated;
    });
  }, []);

  return { recentGates, addRecentGate };
}
