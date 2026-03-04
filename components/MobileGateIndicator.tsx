import React from 'react';
import { X } from 'lucide-react';
import { GateType, GateParams } from '../types';
import { Gate } from './Gate';

interface MobileGateIndicatorProps {
  gateType: GateType;
  gateParams?: GateParams;
  isMoving: boolean;
  onCancel: () => void;
  onHoverGate: (type: GateType | null, params?: GateParams) => void;
}

export const MobileGateIndicator: React.FC<MobileGateIndicatorProps> = ({
  gateType,
  gateParams,
  isMoving,
  onCancel,
  onHoverGate,
}) => {
  return (
    <div className="fixed bottom-14 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-background border-2 border-cyan-400 px-4 py-2 shadow-lg shadow-cyan-400/20">
      <Gate type={gateType} onHover={onHoverGate} params={gateParams} isGateLibrary isMobile />
      <span className="text-sm font-bold text-cyan-400 uppercase whitespace-nowrap">
        {isMoving ? 'Tap to move' : 'Tap to place'}
      </span>
      <button
        onClick={onCancel}
        className="ml-1 p-1 text-foreground/70 active:text-foreground"
        aria-label="Cancel gate selection"
      >
        <X size={18} />
      </button>
    </div>
  );
};
