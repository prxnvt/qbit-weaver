import React from 'react';
import { Complex, GateType } from '../types';
import { getBlochVector } from '../utils/quantum';
import { HoverInfo } from './InfoBox';
import { CELL_WIDTH, ROW_HEIGHT } from '../constants';

interface InlineBlochSphereProps {
  state: Complex[];
  qubitIndex: number;
  numQubits: number;
  row: number;
  cellId: string;
  onHover: (info: HoverInfo) => void;
}

// Format a coefficient for Dirac notation display
const formatCoefficient = (re: number, im: number, isFirst: boolean): string => {
  const mag = Math.sqrt(re * re + im * im);
  if (mag < 0.001) return '';

  const sqrtHalf = 1 / Math.sqrt(2);
  const isSqrtHalf = Math.abs(mag - sqrtHalf) < 0.01;

  let coefStr = '';

  if (Math.abs(im) < 0.001) {
    if (Math.abs(Math.abs(re) - 1) < 0.01) {
      coefStr = re < 0 ? '-' : (isFirst ? '' : '+');
    } else if (isSqrtHalf) {
      coefStr = re < 0 ? '-1/√2' : (isFirst ? '1/√2' : '+1/√2');
    } else {
      const val = re.toFixed(2);
      coefStr = re < 0 ? val : (isFirst ? val : '+' + val);
    }
  } else if (Math.abs(re) < 0.001) {
    if (Math.abs(Math.abs(im) - 1) < 0.01) {
      coefStr = im < 0 ? '-i' : (isFirst ? 'i' : '+i');
    } else if (isSqrtHalf) {
      coefStr = im < 0 ? '-i/√2' : (isFirst ? 'i/√2' : '+i/√2');
    } else {
      coefStr = im < 0 ? im.toFixed(2) + 'i' : (isFirst ? im.toFixed(2) + 'i' : '+' + im.toFixed(2) + 'i');
    }
  } else {
    const sign = isFirst ? '' : '+';
    const imSign = im < 0 ? '-' : '+';
    coefStr = `${sign}(${re.toFixed(1)}${imSign}${Math.abs(im).toFixed(1)}i)`;
  }

  return coefStr;
};

export const InlineBlochSphere: React.FC<InlineBlochSphereProps> = ({
  state,
  qubitIndex,
  numQubits,
  row,
  cellId,
  onHover
}) => {
  const [x, y, z] = getBlochVector(state, qubitIndex, numQubits);

  // Size to fit within circuit cell
  const size = Math.min(CELL_WIDTH - 16, ROW_HEIGHT - 32);

  // Calculate polar coordinates for the Bloch vector
  const theta = Math.acos(Math.max(-1, Math.min(1, z)));
  const phi = Math.atan2(y, x);
  const needleRotation = theta * (180 / Math.PI);
  const horizontalOffset = Math.sin(theta) * Math.cos(phi) * 0.3;

  const isExcited = Math.abs(z - 1) > 0.01 || Math.abs(x) > 0.01 || Math.abs(y) > 0.01;
  const hasImaginary = Math.abs(y) > 0.1;

  // Calculate quantum state amplitudes
  const alpha = Math.cos(theta / 2);
  const betaMag = Math.sin(theta / 2);
  const betaRe = betaMag * Math.cos(phi);
  const betaIm = betaMag * Math.sin(phi);

  const buildDiracNotation = (): string => {
    const alpha0 = formatCoefficient(alpha, 0, true);
    const beta1 = formatCoefficient(betaRe, betaIm, alpha < 0.001);

    let notation = '';
    if (alpha > 0.001) {
      notation += alpha0 + '|0⟩';
    }
    if (betaMag > 0.001) {
      notation += beta1 + '|1⟩';
    }

    return notation || '|0⟩';
  };

  const handleMouseEnter = () => {
    onHover({
      type: 'bloch',
      qubit: row,
      state: buildDiracNotation(),
      vector: [x, y, z]
    });
  };

  const handleMouseLeave = () => {
    onHover({ type: 'none' });
  };

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData('gateType', GateType.BLOCH_VIS);
    e.dataTransfer.setData('sourceCellId', cellId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const radius = size * 0.38;
  const arrowHeadSize = 3;

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      className={`relative rounded-full bg-black flex items-center justify-center shrink-0 cursor-grab active:cursor-grabbing ${!isExcited ? 'opacity-50' : ''}`}
      style={{
        width: size,
        height: size,
        border: '2px solid rgba(16, 185, 129, 0.8)'
      }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <svg
        width={size}
        height={size}
        className="absolute inset-0"
        style={{ overflow: 'visible' }}
      >
        {/* Center point */}
        <circle cx={size/2} cy={size/2} r={1.5} fill="rgba(16,185,129,0.6)" />

        {/* Z axis (vertical) - more visible */}
        <line
          x1={size/2} y1={2} x2={size/2} y2={size - 2}
          stroke="rgba(16, 185, 129, 0.7)" strokeWidth={1}
        />

        {/* X axis (horizontal) - more visible */}
        <line
          x1={2} y1={size/2} x2={size - 2} y2={size/2}
          stroke="rgba(16, 185, 129, 0.7)" strokeWidth={1}
        />

        {/* Y axis (diagonal, representing depth) */}
        <line
          x1={size/2 - size * 0.25}
          y1={size/2 + size * 0.18}
          x2={size/2 + size * 0.25}
          y2={size/2 - size * 0.18}
          stroke="rgba(16, 185, 129, 0.5)"
          strokeWidth={0.75}
          strokeDasharray="2,2"
        />

        {/* Equator ellipse - more visible */}
        <ellipse
          cx={size/2} cy={size/2} rx={size * 0.38} ry={size * 0.14}
          fill="none" stroke="rgba(16, 185, 129, 0.5)" strokeWidth={0.75}
        />

        {/* State vector arrow */}
        <g transform={`translate(${size/2}, ${size/2}) rotate(${needleRotation + horizontalOffset * 60})`}>
          <line
            x1={0} y1={0} x2={0} y2={-radius + arrowHeadSize/2}
            stroke={isExcited ? '#10b981' : 'rgba(255,255,255,0.7)'}
            strokeWidth={1.5}
          />
          <polygon
            points={`0,${-radius} ${arrowHeadSize/2},${-radius + arrowHeadSize} ${-arrowHeadSize/2},${-radius + arrowHeadSize}`}
            fill={isExcited ? '#10b981' : 'rgba(255,255,255,0.7)'}
          />
        </g>
      </svg>

      {hasImaginary && (
        <span className="absolute -right-0.5 -bottom-0.5 text-[6px] text-emerald-500 font-bold">i</span>
      )}
    </div>
  );
};
