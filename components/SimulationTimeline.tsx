import React from 'react';
import { Play, Pause, SkipBack, SkipForward, StepBack, StepForward, RotateCcw } from 'lucide-react';

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
}) => {
  if (totalSteps === 0) {
    return null;
  }

  const maxStep = totalSteps;
  const isAtEnd = currentStep >= maxStep;

  return (
    <div className="flex items-center gap-1 shrink-0">
      {/* Jump to start */}
      <button
        onClick={() => onStepChange(0)}
        disabled={currentStep === 0}
        className={`p-1.5 transition-colors ${
          currentStep === 0
            ? 'text-white/30 cursor-not-allowed'
            : 'text-white hover:bg-white/20'
        }`}
        title="Jump to start"
      >
        <SkipBack size={20} />
      </button>

      {/* Step back */}
      <button
        onClick={onStepBack}
        disabled={currentStep === 0}
        className={`p-1.5 transition-colors ${
          currentStep === 0
            ? 'text-white/30 cursor-not-allowed'
            : 'text-white hover:bg-white/20'
        }`}
        title="Step back"
      >
        <StepBack size={20} />
      </button>

      {/* Play/Pause/Replay */}
      <button
        onClick={onPlayPause}
        className="p-1.5 transition-colors text-white hover:bg-white/20"
        title={isAtEnd && !isPlaying ? 'Replay' : isPlaying ? 'Pause' : 'Play'}
      >
        {isPlaying ? (
          <Pause size={22} />
        ) : isAtEnd ? (
          <RotateCcw size={22} />
        ) : (
          <Play size={22} />
        )}
      </button>

      {/* Step forward */}
      <button
        onClick={onStepForward}
        disabled={isAtEnd}
        className={`p-1.5 transition-colors ${
          isAtEnd
            ? 'text-white/30 cursor-not-allowed'
            : 'text-white hover:bg-white/20'
        }`}
        title="Step forward"
      >
        <StepForward size={20} />
      </button>

      {/* Jump to end */}
      <button
        onClick={() => onStepChange(maxStep)}
        disabled={isAtEnd}
        className={`p-1.5 transition-colors ${
          isAtEnd
            ? 'text-white/30 cursor-not-allowed'
            : 'text-white hover:bg-white/20'
        }`}
        title="Jump to end"
      >
        <SkipForward size={20} />
      </button>
    </div>
  );
};
