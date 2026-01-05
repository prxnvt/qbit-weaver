import React from 'react';
import { Complex } from '../types';
import { HoverInfo } from './InfoBox';

interface AmplitudeGridProps {
  amplitudes: Complex[];
  numQubits: number;
  maxHeight: number;    // Max height in px (e.g., 8 * ROW_HEIGHT = 320)
  rowHeight: number;    // Base row height (e.g., ROW_HEIGHT = 40)
  onHover?: (info: HoverInfo) => void;
}

interface AmplitudeCellProps {
  amplitude: Complex;
  size: number;
  basisIndex: number;
  numQubits: number;
  onHover?: (info: HoverInfo) => void;
}

// Helper functions
// Split: ceil -> rows (more qubits), floor -> cols (fewer qubits) for horizontal compactness
function getGridDimensions(numQubits: number): {
  numRows: number;
  numCols: number;
  rowQubits: number;
  colQubits: number;
} {
  const rowQubits = Math.ceil(numQubits / 2);
  const colQubits = Math.floor(numQubits / 2);
  return {
    numRows: 1 << rowQubits,
    numCols: 1 << colQubits,
    rowQubits,
    colQubits
  };
}

function gridToBasisIndex(row: number, col: number, colQubits: number): number {
  return col | (row << colQubits);
}

function toBinaryLabel(value: number, numBits: number): string {
  if (numBits === 0) return '';
  return value.toString(2).padStart(numBits, '0');
}

function complexMagnitude(c: Complex): number {
  return Math.sqrt(c.re * c.re + c.im * c.im);
}

function complexPhase(c: Complex): number {
  return Math.atan2(c.im, c.re);
}

function complexProbability(c: Complex): number {
  return c.re * c.re + c.im * c.im;
}

const AmplitudeCell: React.FC<AmplitudeCellProps> = ({
  amplitude,
  size,
  basisIndex,
  numQubits,
  onHover
}) => {
  const probability = complexProbability(amplitude);
  const magnitude = complexMagnitude(amplitude);
  const phase = complexPhase(amplitude);

  const fillHeight = probability * size;
  const maxRadius = size * 0.35;
  const circleRadius = magnitude * maxRadius;
  const lineLength = circleRadius > 0 ? circleRadius + 4 : 0;

  const centerX = size / 2;
  const centerY = size / 2;

  // Phase line endpoint (SVG Y is inverted, so negate sin for up = positive)
  const lineEndX = centerX + Math.cos(phase) * lineLength;
  const lineEndY = centerY - Math.sin(phase) * lineLength;

  const handleMouseEnter = () => {
    const basisStr = basisIndex.toString(2).padStart(numQubits, '0');
    const phaseDeg = phase * 180 / Math.PI;
    onHover?.({
      type: 'amplitude',
      basisState: basisStr,
      probability,
      magnitude,
      phase: phaseDeg
    });
  };

  const handleMouseLeave = () => {
    onHover?.({ type: 'none' });
  };

  return (
    <svg
      width={size}
      height={size}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={{ display: 'block' }}
    >
      {/* Cell background */}
      <rect
        x={0}
        y={0}
        width={size}
        height={size}
        fill="#1a1a2e"
        stroke="#333"
        strokeWidth={1}
      />

      {/* Probability fill (blue from bottom) */}
      {probability > 0.001 && (
        <rect
          x={0}
          y={size - fillHeight}
          width={size}
          height={fillHeight}
          fill="rgba(59, 130, 246, 0.6)"
        />
      )}

      {/* Magnitude circle */}
      {magnitude > 0.01 && (
        <circle
          cx={centerX}
          cy={centerY}
          r={circleRadius}
          fill="none"
          stroke="#22d3ee"
          strokeWidth={1.5}
        />
      )}

      {/* Phase line */}
      {magnitude > 0.01 && (
        <line
          x1={centerX}
          y1={centerY}
          x2={lineEndX}
          y2={lineEndY}
          stroke="white"
          strokeWidth={1.5}
        />
      )}
    </svg>
  );
};

export const AmplitudeGrid: React.FC<AmplitudeGridProps> = ({
  amplitudes,
  numQubits,
  maxHeight,
  rowHeight,
  onHover
}) => {
  if (numQubits === 0 || amplitudes.length === 0) {
    return null;
  }

  const { numRows, numCols, rowQubits, colQubits } = getGridDimensions(numQubits);

  // Calculate cell size: scale down if grid has more than 8 rows
  const maxRows = Math.floor(maxHeight / rowHeight); // typically 8
  const cellSize = numRows <= maxRows
    ? rowHeight
    : Math.floor(maxHeight / numRows);

  const labelWidth = Math.max(cellSize * 0.6, 16);

  const labelHeight = Math.max(12, cellSize * 0.4);

  return (
    <div className="amplitude-grid relative">
      {/* Column labels row - positioned absolutely above grid */}
      <div className="absolute left-0 flex" style={{ top: -labelHeight, height: labelHeight }}>
        {/* Corner spacer */}
        <div style={{ width: labelWidth }} />
        {/* Column labels */}
        {Array.from({ length: numCols }).map((_, col) => (
          <div
            key={`col-${col}`}
            className="text-white/60 font-mono text-center flex items-end justify-center"
            style={{ width: cellSize, fontSize: Math.max(8, cellSize * 0.25) }}
          >
            {toBinaryLabel(col, colQubits)}
          </div>
        ))}
      </div>

      {/* Grid rows */}
      {Array.from({ length: numRows }).map((_, row) => (
        <div key={`row-${row}`} className="flex items-center">
          {/* Row label */}
          <div
            className="text-white/60 font-mono text-right pr-1"
            style={{ width: labelWidth, fontSize: Math.max(8, cellSize * 0.25) }}
          >
            {toBinaryLabel(row, rowQubits)}
          </div>

          {/* Cells */}
          {Array.from({ length: numCols }).map((_, col) => {
            const basisIndex = gridToBasisIndex(row, col, colQubits);
            const amplitude = amplitudes[basisIndex] || { re: 0, im: 0 };
            return (
              <AmplitudeCell
                key={`cell-${row}-${col}`}
                amplitude={amplitude}
                size={cellSize}
                basisIndex={basisIndex}
                numQubits={numQubits}
                onHover={onHover}
              />
            );
          })}
        </div>
      ))}
    </div>
  );
};
