import React from 'react';
import { Complex, GateType } from '../types';
import { getBlochVector } from '../utils/quantum';
import { HoverInfo } from './InfoBox';
import { CELL_WIDTH, ROW_HEIGHT } from '../constants';

interface InlinePercentageProps {
  state: Complex[];
  qubitIndex: number;
  numQubits: number;
  row: number;
  cellId: string;
  onHover: (info: HoverInfo) => void;
}

export const InlinePercentage: React.FC<InlinePercentageProps> = ({
  state,
  qubitIndex,
  numQubits,
  row,
  cellId,
  onHover
}) => {
  const [, , z] = getBlochVector(state, qubitIndex, numQubits);

  // Calculate |1⟩ probability from Bloch z-component: P(|1⟩) = (1 - z) / 2
  const bzClamped = Math.max(-1, Math.min(1, z));
  const prob1Raw = (1 - bzClamped) / 2 * 100;
  const prob1Pct = Math.round(prob1Raw);

  // Size to fit within circuit cell
  const width = CELL_WIDTH - 16;
  const height = ROW_HEIGHT - 32;

  const handleMouseEnter = () => {
    onHover({
      type: 'percentage',
      qubit: row,
      probability: prob1Pct
    });
  };

  const handleMouseLeave = () => {
    onHover({ type: 'none' });
  };

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData('gateType', GateType.PERCENT_VIS);
    e.dataTransfer.setData('sourceCellId', cellId);
    e.dataTransfer.effectAllowed = 'move';
  };

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      className="relative border-2 border-emerald-500 bg-black flex items-center justify-center overflow-hidden cursor-grab active:cursor-grabbing"
      style={{ width, height }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Fill from bottom */}
      <div
        className="absolute bottom-0 left-0 right-0 bg-emerald-500 transition-all duration-150"
        style={{ height: `${prob1Pct}%` }}
      />
      {/* Percentage text - always white with shadow for readability */}
      <span
        className="text-xs font-bold relative z-10 text-white"
        style={{ textShadow: '0 0 4px rgba(0,0,0,0.8), 0 0 2px rgba(0,0,0,0.9)' }}
      >
        {prob1Pct}%
      </span>
    </div>
  );
};
