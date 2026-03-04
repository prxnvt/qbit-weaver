import { useState, useCallback } from 'react';
import { GateType, GateParams } from '../types';

export interface MobileGateSelectionState {
  selectedGateType: GateType | null;
  selectedGateParams?: GateParams;
  sourceCellId: string | null;
  isMovingFromGrid: boolean;
}

const INITIAL_STATE: MobileGateSelectionState = {
  selectedGateType: null,
  selectedGateParams: undefined,
  sourceCellId: null,
  isMovingFromGrid: false,
};

export function useMobileGateSelection() {
  const [state, setState] = useState<MobileGateSelectionState>(INITIAL_STATE);

  const selectFromLibrary = useCallback((type: GateType, params?: GateParams) => {
    setState(prev => {
      // Toggle off if same gate tapped again (compare customLabel for CUSTOM gates)
      const isSameGate = prev.selectedGateType === type &&
        !prev.isMovingFromGrid &&
        (type !== 'CUSTOM' || prev.selectedGateParams?.customLabel === params?.customLabel);
      if (isSameGate) {
        return INITIAL_STATE;
      }
      return {
        selectedGateType: type,
        selectedGateParams: params,
        sourceCellId: null,
        isMovingFromGrid: false,
      };
    });
  }, []);

  const selectFromGrid = useCallback((type: GateType, cellId: string, params?: GateParams) => {
    setState({
      selectedGateType: type,
      selectedGateParams: params,
      sourceCellId: cellId,
      isMovingFromGrid: true,
    });
  }, []);

  const cancel = useCallback(() => {
    setState(INITIAL_STATE);
  }, []);

  const isLibraryGateSelected = useCallback((type: GateType): boolean => {
    return state.selectedGateType === type && !state.isMovingFromGrid;
  }, [state.selectedGateType, state.isMovingFromGrid]);

  return {
    state,
    selectFromLibrary,
    selectFromGrid,
    cancel,
    isLibraryGateSelected,
  };
}
