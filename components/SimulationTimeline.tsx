import React, { useEffect, useRef } from 'react';
import { Play, Pause, SkipBack, SkipForward, StepBack, StepForward } from 'lucide-react';

export interface SimulationTimelineProps {
  /** Total number of simulation steps (columns with gates) */
  totalSteps: number;
  /** Current step index (0 = initial state, 1+ = after column N) */
  currentStep: number;
  /** Callback when user changes step */
  onStepChange: (step: number) => void;
  /** Whether auto-play is active */
  isPlaying: boolean;
  /** Toggle play/pause */
  onPlayPause: () => void;
  /** Go forward one step */
  onStepForward: () => void;
  /** Go back one step */
  onStepBack: () => void;
  /** Active column indices (for labels) */
  activeColumns: number[];
}

export const SimulationTimeline: React.FC<SimulationTimelineProps> = ({
  totalSteps,
  currentStep,
  onStepChange,
  isPlaying,
  onPlayPause,
  onStepForward,
  onStepBack,
  activeColumns,
}) => {
  const timelineRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to keep current step visible
  useEffect(() => {
    if (timelineRef.current && totalSteps > 0) {
      const container = timelineRef.current;
      const stepWidth = 40; // Width of each step marker
      const scrollPosition = currentStep * stepWidth - container.clientWidth / 2 + stepWidth / 2;
      // Check if scrollTo exists (may not exist in test environment)
      if (typeof container.scrollTo === 'function') {
        container.scrollTo({ left: Math.max(0, scrollPosition), behavior: 'smooth' });
      }
    }
  }, [currentStep, totalSteps]);

  if (totalSteps === 0) {
    return null;
  }

  // Total steps includes initial state (step 0) plus one per column
  // stateHistory[0] = initial, stateHistory[1] = after col 0, etc.
  const maxStep = totalSteps; // stateHistory has totalSteps + 1 entries (0 to totalSteps)

  return (
    <div className="flex items-center gap-2 px-4 py-2 bg-gray-900 border-t border-white/20">
      {/* Playback Controls */}
      <div className="flex items-center gap-1 shrink-0">
        {/* Jump to start */}
        <button
          onClick={() => onStepChange(0)}
          disabled={currentStep === 0}
          className={`p-1.5 rounded transition-colors ${
            currentStep === 0
              ? 'text-white/30 cursor-not-allowed'
              : 'text-white hover:bg-white/20'
          }`}
          title="Jump to start"
        >
          <SkipBack size={16} />
        </button>

        {/* Step back */}
        <button
          onClick={onStepBack}
          disabled={currentStep === 0}
          className={`p-1.5 rounded transition-colors ${
            currentStep === 0
              ? 'text-white/30 cursor-not-allowed'
              : 'text-white hover:bg-white/20'
          }`}
          title="Step back"
        >
          <StepBack size={16} />
        </button>

        {/* Play/Pause */}
        <button
          onClick={onPlayPause}
          disabled={currentStep >= maxStep && !isPlaying}
          className={`p-2 rounded transition-colors ${
            currentStep >= maxStep && !isPlaying
              ? 'text-white/30 cursor-not-allowed'
              : 'text-white hover:bg-white/20'
          }`}
          title={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? <Pause size={20} /> : <Play size={20} />}
        </button>

        {/* Step forward */}
        <button
          onClick={onStepForward}
          disabled={currentStep >= maxStep}
          className={`p-1.5 rounded transition-colors ${
            currentStep >= maxStep
              ? 'text-white/30 cursor-not-allowed'
              : 'text-white hover:bg-white/20'
          }`}
          title="Step forward"
        >
          <StepForward size={16} />
        </button>

        {/* Jump to end */}
        <button
          onClick={() => onStepChange(maxStep)}
          disabled={currentStep >= maxStep}
          className={`p-1.5 rounded transition-colors ${
            currentStep >= maxStep
              ? 'text-white/30 cursor-not-allowed'
              : 'text-white hover:bg-white/20'
          }`}
          title="Jump to end"
        >
          <SkipForward size={16} />
        </button>
      </div>

      {/* Step indicator */}
      <div className="text-xs text-white/60 shrink-0 min-w-[80px] text-center">
        Step {currentStep} / {maxStep}
      </div>

      {/* Timeline bar */}
      <div
        ref={timelineRef}
        className="flex-1 overflow-x-auto scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent"
      >
        <div className="flex items-center gap-1 py-1 min-w-max">
          {/* Initial state marker */}
          <button
            onClick={() => onStepChange(0)}
            className={`flex flex-col items-center justify-center w-10 h-8 rounded transition-all ${
              currentStep === 0
                ? 'bg-cyan-500 text-black'
                : 'bg-white/10 text-white/60 hover:bg-white/20'
            }`}
            title="Initial state |0...0>"
          >
            <span className="text-[10px] font-mono">Init</span>
          </button>

          {/* Column step markers */}
          {activeColumns.map((colIndex, stepIndex) => {
            const step = stepIndex + 1; // stateHistory index
            const isActive = currentStep === step;
            const isPast = currentStep > step;

            return (
              <button
                key={colIndex}
                onClick={() => onStepChange(step)}
                className={`flex flex-col items-center justify-center w-10 h-8 rounded transition-all ${
                  isActive
                    ? 'bg-cyan-500 text-black'
                    : isPast
                      ? 'bg-cyan-800/50 text-cyan-300 hover:bg-cyan-700/50'
                      : 'bg-white/10 text-white/60 hover:bg-white/20'
                }`}
                title={`After column ${colIndex + 1}`}
              >
                <span className="text-[10px] font-mono">C{colIndex + 1}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Current column label */}
      <div className="text-xs text-white/80 shrink-0 min-w-[100px] text-right">
        {currentStep === 0 ? (
          <span>Initial |0...0&gt;</span>
        ) : (
          <span>After Col {activeColumns[currentStep - 1] + 1}</span>
        )}
      </div>
    </div>
  );
};
