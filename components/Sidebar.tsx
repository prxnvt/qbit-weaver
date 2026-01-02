import React from 'react';
import { GateType } from '../types';
import { GATE_DEFS } from '../constants';
import { Gate } from './Gate';

interface SidebarProps {
  onHoverGate: (type: GateType | null) => void;
}

const TOOLBOX_GATES = [
    GateType.X, GateType.Y, GateType.Z, 
    GateType.H, 
    GateType.S, GateType.T,
    GateType.CX, GateType.CZ,
    GateType.CONTROL,
    GateType.SWAP
];

export const Sidebar: React.FC<SidebarProps> = ({ onHoverGate }) => {
  return (
    <div className="w-full bg-neutral-900 border-t border-neutral-800 p-6 z-30 flex-none overflow-x-auto">
      <div className="grid gap-x-12 gap-y-4 grid-rows-4 grid-flow-col auto-cols-max mx-auto max-w-7xl content-center justify-center">
        {TOOLBOX_GATES.map((type) => (
          <div key={type} className="flex items-center gap-3">
            <Gate type={type} onHover={onHoverGate} />
            <span className="text-sm font-bold text-gray-300 min-w-[100px]">{GATE_DEFS[type].fullName}</span>
          </div>
        ))}
      </div>
    </div>
  );
};