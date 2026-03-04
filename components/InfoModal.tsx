import React, { useEffect } from 'react';
import { X, Github } from 'lucide-react';

interface InfoModalProps {
  onClose: () => void;
}

const INFO_SECTIONS = [
  {
    title: 'Drag & Drop Gates',
    description:
      'Build quantum circuits by dragging gates from the library onto the grid.',
  },
  {
    title: 'Algorithm Templates',
    description:
      'Start from pre-built templates like Bell states, Grover\'s search, and QFT.',
  },
  {
    title: 'Real-time Simulation',
    description:
      'Watch quantum states evolve with Bloch spheres, amplitudes, and measurements.',
  },
];

export const InfoModal: React.FC<InfoModalProps> = ({ onClose }) => {
  // Close on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="relative bg-neutral-900 border border-neutral-700 rounded-lg overflow-y-auto p-8"
        style={{ width: '75vw', height: '75vh' }}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 hover:bg-foreground/10 transition-colors rounded"
          title="Close"
        >
          <X size={20} />
        </button>

        {/* Header */}
        <h1 className="text-3xl font-bold text-foreground mb-2">Qbit Weaver</h1>
        <p className="text-foreground/60 text-lg mb-4">
          A quantum computer simulator that runs in your browser!
        </p>

        {/* Author & License */}
        <div className="flex items-center gap-3 text-sm text-foreground/50 mb-10">
          <span>MIT License</span>
          <span className="text-foreground/20">·</span>
          <span>© Pranav Turlapati</span>
          <span className="text-foreground/20">·</span>
          <a
            href="https://github.com/prxnvt/qbit-weaver"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-foreground/50 hover:text-foreground transition-colors"
          >
            <Github size={14} />
            GitHub
          </a>
        </div>

        {/* 3-column feature sections */}
        <div className="grid grid-cols-3 gap-6">
          {INFO_SECTIONS.map((section) => (
            <div key={section.title}>
              <h2 className="text-lg font-bold text-foreground mb-1 uppercase">
                {section.title}
              </h2>
              <p className="text-foreground/70 text-sm mb-3">
                {section.description}
              </p>
              <div className="w-full h-[180px] border-2 border-dashed border-foreground/20 rounded-lg flex items-center justify-center">
                <span className="text-foreground/30 text-sm font-bold uppercase">
                  Coming soon
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
