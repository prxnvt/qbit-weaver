import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SimulationTimeline } from './SimulationTimeline';

describe('SimulationTimeline', () => {
  const defaultProps = {
    totalSteps: 3,
    currentStep: 0,
    onStepChange: vi.fn(),
    isPlaying: false,
    onPlayPause: vi.fn(),
    onStepForward: vi.fn(),
    onStepBack: vi.fn(),
    activeColumns: [0, 2, 4],
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should call onPlayPause when clicking play button', () => {
    const onPlayPause = vi.fn();
    render(<SimulationTimeline {...defaultProps} onPlayPause={onPlayPause} />);

    fireEvent.click(screen.getByTitle('Play'));
    expect(onPlayPause).toHaveBeenCalled();
  });

  it('should show pause icon when playing', () => {
    render(<SimulationTimeline {...defaultProps} isPlaying={true} />);
    expect(screen.getByTitle('Pause')).toBeInTheDocument();
  });

  it('should call onStepForward when clicking forward button', () => {
    const onStepForward = vi.fn();
    render(<SimulationTimeline {...defaultProps} onStepForward={onStepForward} />);

    fireEvent.click(screen.getByTitle('Step forward'));
    expect(onStepForward).toHaveBeenCalled();
  });

  it('should call onStepBack when clicking back button', () => {
    const onStepBack = vi.fn();
    render(<SimulationTimeline {...defaultProps} currentStep={2} onStepBack={onStepBack} />);

    fireEvent.click(screen.getByTitle('Step back'));
    expect(onStepBack).toHaveBeenCalled();
  });

  it('should disable step back when at step 0', () => {
    render(<SimulationTimeline {...defaultProps} currentStep={0} />);
    const backButton = screen.getByTitle('Step back');
    expect(backButton).toHaveClass('cursor-not-allowed');
  });

  it('should disable step forward when at max step', () => {
    render(<SimulationTimeline {...defaultProps} currentStep={3} />);
    const forwardButton = screen.getByTitle('Step forward');
    expect(forwardButton).toHaveClass('cursor-not-allowed');
  });

  it('should return null when totalSteps is 0', () => {
    const { container } = render(
      <SimulationTimeline {...defaultProps} totalSteps={0} activeColumns={[]} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('should call onStepChange with 0 when clicking jump to start', () => {
    const onStepChange = vi.fn();
    render(<SimulationTimeline {...defaultProps} currentStep={2} onStepChange={onStepChange} />);

    fireEvent.click(screen.getByTitle('Jump to start'));
    expect(onStepChange).toHaveBeenCalledWith(0);
  });

  it('should call onStepChange with maxStep when clicking jump to end', () => {
    const onStepChange = vi.fn();
    render(<SimulationTimeline {...defaultProps} currentStep={1} onStepChange={onStepChange} />);

    fireEvent.click(screen.getByTitle('Jump to end'));
    expect(onStepChange).toHaveBeenCalledWith(3);
  });

  it('should disable jump to start when at step 0', () => {
    render(<SimulationTimeline {...defaultProps} currentStep={0} />);
    const jumpStartButton = screen.getByTitle('Jump to start');
    expect(jumpStartButton).toHaveClass('cursor-not-allowed');
  });

  it('should disable jump to end when at max step', () => {
    render(<SimulationTimeline {...defaultProps} currentStep={3} />);
    const jumpEndButton = screen.getByTitle('Jump to end');
    expect(jumpEndButton).toHaveClass('cursor-not-allowed');
  });

  it('should show replay button when at end and not playing', () => {
    render(<SimulationTimeline {...defaultProps} currentStep={3} isPlaying={false} />);
    expect(screen.getByTitle('Replay')).toBeInTheDocument();
  });
});
