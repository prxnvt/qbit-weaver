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

  it('should render step indicator', () => {
    render(<SimulationTimeline {...defaultProps} />);
    expect(screen.getByText('Step 0 / 3')).toBeInTheDocument();
  });

  it('should render Init button for initial state', () => {
    render(<SimulationTimeline {...defaultProps} />);
    expect(screen.getByTitle('Initial state |0...0>')).toBeInTheDocument();
  });

  it('should render column step markers', () => {
    render(<SimulationTimeline {...defaultProps} />);
    expect(screen.getByText('C1')).toBeInTheDocument(); // Column 0+1 = 1
    expect(screen.getByText('C3')).toBeInTheDocument(); // Column 2+1 = 3
    expect(screen.getByText('C5')).toBeInTheDocument(); // Column 4+1 = 5
  });

  it('should call onStepChange when clicking on step marker', () => {
    const onStepChange = vi.fn();
    render(<SimulationTimeline {...defaultProps} onStepChange={onStepChange} />);

    fireEvent.click(screen.getByText('C1'));
    expect(onStepChange).toHaveBeenCalledWith(1);
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

  it('should show current column label', () => {
    render(<SimulationTimeline {...defaultProps} currentStep={0} />);
    expect(screen.getByText('Initial |0...0>')).toBeInTheDocument();
  });

  it('should show "After Col N" when at a step', () => {
    render(<SimulationTimeline {...defaultProps} currentStep={2} />);
    expect(screen.getByText('After Col 3')).toBeInTheDocument(); // activeColumns[1] = 2, +1 = 3
  });

  it('should highlight current step marker', () => {
    render(<SimulationTimeline {...defaultProps} currentStep={1} />);
    const c1Button = screen.getByText('C1');
    expect(c1Button.parentElement).toHaveClass('bg-cyan-500');
  });
});
