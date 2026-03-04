import React, { useState } from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';
import { GateType, GateParams, CustomGateDefinition } from '../types';
import { GateLibrary } from './GateLibrary';

interface MobileGateDrawerProps {
  onHoverGate: (type: GateType | null, params?: GateParams) => void;
  onSelectGate: (type: GateType, params?: GateParams) => void;
  customGates: CustomGateDefinition[];
  onAddCustomGate: () => void;
  selectedGateType: GateType | null;
}

export const MobileGateDrawer: React.FC<MobileGateDrawerProps> = ({
  onHoverGate,
  onSelectGate,
  customGates,
  onAddCustomGate,
  selectedGateType,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const handleSelectGate = (type: GateType, params?: GateParams) => {
    onSelectGate(type, params);
    setIsExpanded(false);
  };

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-40 bg-background border-t-2 border-foreground transition-all duration-300"
      style={{ height: isExpanded ? 'min(320px, 50vh)' : 48 }}
    >
      {/* Collapsed bar / toggle */}
      <button
        onClick={() => setIsExpanded(prev => !prev)}
        className="w-full h-12 flex items-center justify-between px-4 active:bg-accent/20"
      >
        <span className="text-sm font-bold text-foreground uppercase tracking-tight">
          Gate Library
          {selectedGateType && (
            <span className="text-cyan-400 ml-2 normal-case">
              ({selectedGateType} selected)
            </span>
          )}
        </span>
        {isExpanded ? <ChevronDown size={20} /> : <ChevronUp size={20} />}
      </button>

      {/* Expanded content */}
      {isExpanded && (
        <div className="overflow-hidden" style={{ height: 'calc(min(320px, 50vh) - 48px)' }}>
          <GateLibrary
            onHoverGate={onHoverGate}
            customGates={customGates}
            onAddCustomGate={onAddCustomGate}
            onSelectGate={handleSelectGate}
            isMobile
          />
        </div>
      )}
    </div>
  );
};
