import React from 'react';
import { HoverInfo } from './InfoBox';

interface BlochSphereProps {
  x: number;
  y: number;
  z: number;
  size?: number;
  row: number;
  col: number;
  onHover: (info: HoverInfo) => void;
}

// Format a coefficient for Dirac notation display
const formatCoefficient = (re: number, im: number, isFirst: boolean): string => {
  const mag = Math.sqrt(re * re + im * im);
  if (mag < 0.001) return '';

  // Check for common values
  const sqrtHalf = 1 / Math.sqrt(2);
  const isSqrtHalf = Math.abs(mag - sqrtHalf) < 0.01;

  let coefStr = '';

  if (Math.abs(im) < 0.001) {
    // Real coefficient
    if (Math.abs(Math.abs(re) - 1) < 0.01) {
      coefStr = re < 0 ? '-' : (isFirst ? '' : '+');
    } else if (isSqrtHalf) {
      coefStr = re < 0 ? '-1/√2' : (isFirst ? '1/√2' : '+1/√2');
    } else {
      const val = re.toFixed(2);
      coefStr = re < 0 ? val : (isFirst ? val : '+' + val);
    }
  } else if (Math.abs(re) < 0.001) {
    // Pure imaginary
    if (Math.abs(Math.abs(im) - 1) < 0.01) {
      coefStr = im < 0 ? '-i' : (isFirst ? 'i' : '+i');
    } else if (isSqrtHalf) {
      coefStr = im < 0 ? '-i/√2' : (isFirst ? 'i/√2' : '+i/√2');
    } else {
      coefStr = im < 0 ? im.toFixed(2) + 'i' : (isFirst ? im.toFixed(2) + 'i' : '+' + im.toFixed(2) + 'i');
    }
  } else {
    // Complex
    const sign = isFirst ? '' : '+';
    const imSign = im < 0 ? '-' : '+';
    coefStr = `${sign}(${re.toFixed(1)}${imSign}${Math.abs(im).toFixed(1)}i)`;
  }

  return coefStr;
};

export const BlochSphere: React.FC<BlochSphereProps> = ({ x, y, z, size = 48, row, col, onHover }) => {
  // Calculate polar coordinates for the Bloch vector
  const theta = Math.acos(Math.max(-1, Math.min(1, z))); // Angle from +Z axis
  const phi = Math.atan2(y, x); // Angle in XY plane

  // Convert to needle rotation (0° = pointing up/+Z, 180° = pointing down/-Z)
  const needleRotation = theta * (180 / Math.PI);

  // Use phi to add horizontal offset to show X/Y component
  const horizontalOffset = Math.sin(theta) * Math.cos(phi) * 0.3;

  // Check if state is non-trivial (not |0⟩)
  const isExcited = Math.abs(z - 1) > 0.01 || Math.abs(x) > 0.01 || Math.abs(y) > 0.01;

  // Determine if there's an imaginary component (Y affects phase)
  const hasImaginary = Math.abs(y) > 0.1;

  // Calculate quantum state amplitudes from Bloch vector
  // |ψ⟩ = cos(θ/2)|0⟩ + e^(iφ)sin(θ/2)|1⟩
  const alpha = Math.cos(theta / 2); // Amplitude of |0⟩ (always real and positive)
  const betaMag = Math.sin(theta / 2); // Magnitude of |1⟩ amplitude
  const betaRe = betaMag * Math.cos(phi); // Real part of β
  const betaIm = betaMag * Math.sin(phi); // Imaginary part of β

  // Build the Dirac notation string
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

  const diracNotation = buildDiracNotation();

  const handleMouseEnter = () => {
    onHover({
      type: 'bloch',
      qubit: row,
      state: diracNotation,
      vector: [x, y, z]
    });
  };

  const handleMouseLeave = () => {
    onHover({ type: 'none' });
  };

  // Calculate radius for the arrow (from center to edge)
  const radius = size * 0.42;
  // Arrow dimensions
  const arrowHeadSize = 4;
  const vectorWidth = 1;

  return (
    <div
      className={`relative rounded-full bg-black flex items-center justify-center shrink-0 ${!isExcited ? 'opacity-50' : ''}`}
      style={{
        width: size,
        height: size,
        border: '1px solid rgba(255, 255, 255, 0.6)'
      }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* SVG for axes and vector */}
      <svg
        width={size}
        height={size}
        className="absolute inset-0"
        style={{ overflow: 'visible' }}
      >
        {/* Center point */}
        <circle cx={size/2} cy={size/2} r={1} fill="rgba(255,255,255,0.4)" />

        {/* Z axis (vertical) */}
        <line
          x1={size/2}
          y1={3}
          x2={size/2}
          y2={size - 3}
          stroke="rgba(255, 255, 255, 0.35)"
          strokeWidth={0.5}
        />

        {/* X axis (horizontal) */}
        <line
          x1={3}
          y1={size/2}
          x2={size - 3}
          y2={size/2}
          stroke="rgba(255, 255, 255, 0.35)"
          strokeWidth={0.5}
        />

        {/* Y axis (diagonal, representing depth) */}
        <line
          x1={size/2 - size * 0.28}
          y1={size/2 + size * 0.2}
          x2={size/2 + size * 0.28}
          y2={size/2 - size * 0.2}
          stroke="rgba(255, 255, 255, 0.25)"
          strokeWidth={0.5}
          strokeDasharray="2,2"
        />

        {/* Equator ellipse */}
        <ellipse
          cx={size/2}
          cy={size/2}
          rx={size * 0.4}
          ry={size * 0.15}
          fill="none"
          stroke="rgba(255, 255, 255, 0.3)"
          strokeWidth={0.5}
        />

        {/* Axis labels - Z axis poles */}
        <text x={size/2} y={-2} fontSize={5} fill="rgba(255,255,255,0.4)" textAnchor="middle" dominantBaseline="auto">|0⟩</text>
        <text x={size/2} y={size + 2} fontSize={5} fill="rgba(255,255,255,0.4)" textAnchor="middle" dominantBaseline="hanging">|1⟩</text>

        {/* State vector arrow */}
        <g transform={`translate(${size/2}, ${size/2}) rotate(${needleRotation + horizontalOffset * 60})`}>
          {/* Arrow line - from center extending to edge */}
          <line
            x1={0}
            y1={0}
            x2={0}
            y2={-radius + arrowHeadSize/2}
            stroke={isExcited ? '#ef4444' : 'rgba(255,255,255,0.7)'}
            strokeWidth={vectorWidth}
          />
          {/* Arrow head */}
          <polygon
            points={`0,${-radius} ${arrowHeadSize/2},${-radius + arrowHeadSize} ${-arrowHeadSize/2},${-radius + arrowHeadSize}`}
            fill={isExcited ? '#ef4444' : 'rgba(255,255,255,0.7)'}
          />
        </g>
      </svg>

      {/* Imaginary indicator */}
      {hasImaginary && (
        <span className="absolute -right-1 -bottom-1 text-[8px] text-red-500 font-bold">i</span>
      )}
    </div>
  );
};
