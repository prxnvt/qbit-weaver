import React from 'react';
import { GateType } from '../types';
import { GATE_DEFS } from '../constants';

interface InfoPanelProps {
  hoveredGate: GateType | null;
  customText: string | null;
}

export const InfoPanel: React.FC<InfoPanelProps> = ({ hoveredGate, customText }) => {
  if (customText) {
     return (
      <div className="h-32 mb-4 p-4 flex flex-col justify-center bg-black border-b border-white">
        <h2 className="text-xl font-bold mb-2">State Info</h2>
        <p className="text-sm text-gray-300 font-mono">{customText}</p>
      </div>
    );
  }

  if (!hoveredGate || hoveredGate === GateType.EMPTY) {
    return (
      <div className="h-32 mb-4 p-4 flex flex-col justify-center bg-black border-b border-white opacity-50">
        <h2 className="text-xl font-bold mb-2">Info Panel</h2>
        <p className="text-sm">Hover over a gate or sphere to see details.</p>
      </div>
    );
  }

  const def = GATE_DEFS[hoveredGate];

  return (
    <div className="h-32 mb-4 p-4 bg-black border-b border-white">
      <div className="flex justify-between items-baseline mb-2">
        <h2 className="text-xl font-bold">{def.label} Gate</h2>
        <span className="text-xs text-gray-400 uppercase tracking-widest">{def.type}</span>
      </div>
      <div className="flex gap-4">
        <div className="flex-1">
            <p className="text-sm text-gray-300 mb-2 leading-tight">{def.description}</p>
        </div>
        <div className="font-mono text-xs p-2 bg-neutral-900 border border-neutral-800 whitespace-pre text-right min-w-[120px]">
            {def.matrixLabel}
        </div>
      </div>
    </div>
  );
};
