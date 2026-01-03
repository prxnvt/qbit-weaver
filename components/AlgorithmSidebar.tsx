import React from 'react';
import { TEMPLATES_BY_CATEGORY, CATEGORIES, AlgorithmTemplate } from '../data/algorithms';

// Fixed width to match the Load dropdown (w-72 = 288px)
const SIDEBAR_WIDTH = 288;

interface AlgorithmSidebarProps {
  onHoverTemplate: (template: AlgorithmTemplate | null) => void;
  onDragStart?: (template: AlgorithmTemplate) => void;
  onDragEnd?: () => void;
}

export const AlgorithmSidebar: React.FC<AlgorithmSidebarProps> = ({ onHoverTemplate, onDragStart, onDragEnd }) => {
  const handleDragStart = (e: React.DragEvent, template: AlgorithmTemplate) => {
    e.dataTransfer.setData('algorithmTemplate', JSON.stringify(template));
    e.dataTransfer.effectAllowed = 'copy';
    onDragStart?.(template);
  };

  const handleDragEnd = () => {
    onDragEnd?.();
  };

  return (
    <div
      className="border-l-2 border-white bg-black h-full overflow-y-auto shrink-0"
      style={{ width: SIDEBAR_WIDTH, minWidth: SIDEBAR_WIDTH }}
    >
      {/* Header */}
      <div className="px-3 py-2 border-b-2 border-white sticky top-0 bg-black z-10">
        <span className="text-sm font-bold text-white uppercase">Templates</span>
      </div>

      {/* Categories and Templates */}
      {CATEGORIES.map((category) => (
        <div key={category}>
          {/* Category Header */}
          <div className="px-3 py-1.5 text-[10px] font-bold uppercase text-gray-400 bg-gray-900 border-b border-gray-800 sticky top-10 z-[5]">
            {category}
          </div>

          {/* Templates in category */}
          {TEMPLATES_BY_CATEGORY[category].map((template) => (
            <div
              key={template.id}
              draggable
              onDragStart={(e) => handleDragStart(e, template)}
              onDragEnd={handleDragEnd}
              onMouseEnter={() => onHoverTemplate(template)}
              onMouseLeave={() => onHoverTemplate(null)}
              className="px-3 py-2 border-b border-gray-800 cursor-grab active:cursor-grabbing select-none"
            >
              <div className="text-sm font-bold text-white">{template.name}</div>
              <div className="text-[10px] text-gray-400 mt-0.5 line-clamp-2">
                {template.description}
              </div>
              <div className="text-[9px] text-gray-500 mt-1">
                {template.qubits} qubits
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
};
