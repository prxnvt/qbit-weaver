import React from 'react';
import { GateType } from '../types';

interface GateProps {
  type: GateType;
  onHover: (type: GateType | null) => void;
  isDragging?: boolean;
}

export const Gate: React.FC<GateProps> = ({ type, onHover, isDragging }) => {
  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData('gateType', type);
    e.dataTransfer.effectAllowed = 'copy';
  };

  const baseClasses = "w-10 h-10 flex items-center justify-center text-sm font-bold cursor-grab active:cursor-grabbing select-none transition-transform hover:scale-105 z-20 relative";
  
  // Custom Styles per Gate Type
  let content: React.ReactNode = type;
  let specificStyles = "bg-black border border-white text-white hover:bg-neutral-900";

  if (type === GateType.CONTROL) {
      content = <div className="w-4 h-4 rounded-full bg-white"></div>;
      specificStyles = "bg-transparent border-none hover:bg-neutral-900/50 rounded-full";
  } else if (type === GateType.CX) {
      content = (
          <div className="relative w-8 h-8 flex items-center justify-center">
              <div className="absolute inset-0 rounded-full border-2 border-white"></div>
              <div className="w-full h-0.5 bg-white"></div>
              <div className="h-full w-0.5 bg-white"></div>
          </div>
      );
      specificStyles = "bg-black border-none text-white hover:bg-neutral-900 rounded-full";
  } else if (type === GateType.CZ) {
      content = "Z"; 
      specificStyles = "bg-black border border-white text-white hover:bg-neutral-900";
  } else if (type === GateType.SWAP) {
      content = (
        <div className="text-xs font-mono">×</div> // Simple cross for swap
      );
      specificStyles = "bg-black border border-white text-white hover:bg-neutral-900";
  }

  const styleClasses = isDragging 
    ? "bg-neutral-800 border-neutral-600 text-neutral-400 opacity-50" 
    : specificStyles;

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      onMouseEnter={() => onHover(type)}
      onMouseLeave={() => onHover(null)}
      className={`${baseClasses} ${styleClasses}`}
    >
      {content}
    </div>
  );
};
