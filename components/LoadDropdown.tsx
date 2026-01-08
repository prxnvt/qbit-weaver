import React, { useState, useRef, useEffect } from 'react';
import { TEMPLATES_BY_CATEGORY, CATEGORIES, AlgorithmTemplate } from '../data/algorithms';

interface LoadDropdownProps {
  onLoad: (template: AlgorithmTemplate) => void;
}

export const LoadDropdown: React.FC<LoadDropdownProps> = ({ onLoad }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleSelect = (template: AlgorithmTemplate) => {
    onLoad(template);
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-1.5 border-2 border-white hover:bg-white hover:text-black transition-colors text-sm font-bold uppercase"
      >
        <span>Load</span>
        <svg
          className={`w-3 h-3 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-1 w-72 bg-black border-2 border-white z-50 max-h-96 overflow-auto">
          {CATEGORIES.map((category) => (
            <div key={category}>
              <div className="px-3 py-1.5 text-[10px] font-bold uppercase text-gray-400 bg-gray-900 border-b border-gray-800">
                {category}
              </div>
              {TEMPLATES_BY_CATEGORY[category].map((template) => (
                <button
                  key={template.id}
                  onClick={() => handleSelect(template)}
                  className="w-full px-3 py-2 text-left hover:bg-white hover:text-black transition-colors border-b border-gray-800 last:border-b-0"
                >
                  <div className="text-sm font-bold">{template.name}</div>
                </button>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
