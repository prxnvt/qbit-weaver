import React from 'react';
import { TEMPLATES_BY_CATEGORY, CATEGORIES, AlgorithmTemplate } from '../data/algorithms';

// Fixed width to accommodate template text
const SIDEBAR_WIDTH = 340;

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
      className="border-l-2 border-foreground bg-background h-full overflow-y-auto shrink-0"
      style={{ width: SIDEBAR_WIDTH, minWidth: SIDEBAR_WIDTH }}
    >
      {/* Header */}
      <div className="px-3 py-2 border-b-2 border-foreground sticky top-0 bg-background z-10">
        <span className="text-lg font-bold text-foreground uppercase">Templates</span>
      </div>

      {/* Categories and Templates */}
      {CATEGORIES.map((category) => (
        <div key={category}>
          {/* Category Header */}
          <div className="px-3 py-2 text-lg font-bold uppercase text-muted-foreground bg-secondary border-b border-border sticky top-10 z-[5]">
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
              className="px-3 py-2 border-b border-border cursor-grab active:cursor-grabbing select-none hover:bg-accent/10"
            >
              <div className="text-xl font-bold text-foreground">{template.name}</div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
};
