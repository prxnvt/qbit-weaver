import React, { useRef, useEffect } from 'react';
import { X } from 'lucide-react';
import { TEMPLATES_BY_CATEGORY, CATEGORIES, AlgorithmTemplate } from '../data/algorithms';

const DROPDOWN_WIDTH = 340;

interface TemplatesDropdownProps {
  isOpen: boolean;
  onClose: () => void;
  onDragStart: (template: AlgorithmTemplate) => void;
  onDragEnd: () => void;
}

export const TemplatesDropdown: React.FC<TemplatesDropdownProps> = ({
  isOpen,
  onClose,
  onDragStart,
  onDragEnd,
}) => {
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Close on click outside
  useEffect(() => {
    if (!isOpen) return;
    const handleMouseDown = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(target) &&
        !target.closest('#templates-header-btn')
      ) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleMouseDown);
    return () => document.removeEventListener('mousedown', handleMouseDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleDragStart = (e: React.DragEvent, template: AlgorithmTemplate) => {
    e.dataTransfer.setData('algorithmTemplate', JSON.stringify(template));
    e.dataTransfer.effectAllowed = 'copy';
    onDragStart(template);
  };

  return (
    <div
      ref={dropdownRef}
      className="absolute top-full right-0 z-30 border-2 border-foreground bg-background overflow-y-auto"
      style={{ width: DROPDOWN_WIDTH, maxHeight: '70vh' }}
    >
      {/* Header */}
      <div className="px-3 py-2 border-b-2 border-foreground sticky top-0 bg-background z-10 flex items-center justify-between">
        <span className="text-lg font-bold text-foreground uppercase">Templates</span>
        <button
          onClick={onClose}
          className="p-1 hover:bg-foreground/10 transition-colors"
          title="Close templates"
        >
          <X size={16} />
        </button>
      </div>

      {/* Categories and Templates */}
      {CATEGORIES.map((category) => (
        <div key={category}>
          <div className="px-3 py-2 text-lg font-bold uppercase text-muted-foreground bg-secondary border-b border-border sticky top-10 z-[5]">
            {category}
          </div>

          {TEMPLATES_BY_CATEGORY[category].map((template) => (
            <div
              key={template.id}
              draggable
              onDragStart={(e) => handleDragStart(e, template)}
              onDragEnd={onDragEnd}
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
