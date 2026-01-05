import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { InfoBox, HoverInfo } from './InfoBox';
import { GateType } from '../types';

describe('InfoBox', () => {
  it('should render empty state when type is none', () => {
    const info: HoverInfo = { type: 'none' };
    render(<InfoBox info={info} />);
    expect(screen.getByText('Hover over elements for details')).toBeInTheDocument();
  });

  it('should render percentage content', () => {
    const info: HoverInfo = {
      type: 'percentage',
      qubit: 0,
      probability: 75.5,
    };
    render(<InfoBox info={info} />);
    expect(screen.getByText('Qubit |q0⟩ Measurement')).toBeInTheDocument();
    expect(screen.getByText('75.5%')).toBeInTheDocument();
  });

  it('should render amplitude content', () => {
    const info: HoverInfo = {
      type: 'amplitude',
      basisState: '00',
      probability: 0.5,
      magnitude: 0.707,
      phase: 45.0,
    };
    render(<InfoBox info={info} />);
    expect(screen.getByText('Basis State |00⟩')).toBeInTheDocument();
    expect(screen.getByText('50.0%')).toBeInTheDocument();
    expect(screen.getByText('0.7070')).toBeInTheDocument();
    expect(screen.getByText('45.0°')).toBeInTheDocument();
  });

  it('should render Bloch sphere content', () => {
    const info: HoverInfo = {
      type: 'bloch',
      qubit: 1,
      state: '|+⟩',
      vector: [1, 0, 0],
    };
    render(<InfoBox info={info} />);
    expect(screen.getByText('Qubit |q1⟩')).toBeInTheDocument();
    expect(screen.getByText('|+⟩')).toBeInTheDocument();
    expect(screen.getByText('1.000')).toBeInTheDocument();
  });

  it('should render template content', () => {
    const info: HoverInfo = {
      type: 'template',
      name: 'Bell State',
      description: 'Creates an entangled Bell state',
      qubits: 2,
      category: 'Entanglement',
    };
    render(<InfoBox info={info} />);
    expect(screen.getByText('Bell State')).toBeInTheDocument();
    expect(screen.getByText('Creates an entangled Bell state')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('Entanglement')).toBeInTheDocument();
  });

  it('should render gate content for Hadamard gate', () => {
    const info: HoverInfo = {
      type: 'gate',
      gate: GateType.H,
    };
    render(<InfoBox info={info} />);
    expect(screen.getByText('Hadamard')).toBeInTheDocument();
    expect(screen.getByText('Hadamard Gate. Superposition.')).toBeInTheDocument();
  });

  it('should render gate content with angle parameter', () => {
    const info: HoverInfo = {
      type: 'gate',
      gate: GateType.RX,
      params: {
        angle: Math.PI / 4,
        angleExpression: 'π/4',
      },
    };
    render(<InfoBox info={info} />);
    expect(screen.getByText('Rotation X')).toBeInTheDocument();
    expect(screen.getByText(/π\/4/)).toBeInTheDocument();
  });

  it('should render with correct dimensions', () => {
    const info: HoverInfo = { type: 'none' };
    const { container } = render(<InfoBox info={info} />);
    const infoBox = container.firstChild as HTMLElement;

    expect(infoBox).toHaveStyle({ width: '288px', height: '200px' });
  });
});
