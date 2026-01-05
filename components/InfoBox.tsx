import React from 'react';
import { GateType, GateParams, Complex } from '../types';
import { GATE_DEFS } from '../constants';

// Hover info types for different UI elements
export type HoverInfo =
  | { type: 'gate'; gate: GateType; params?: GateParams }
  | { type: 'bloch'; qubit: number; state: string; vector: [number, number, number] }
  | { type: 'amplitude'; basisState: string; probability: number; magnitude: number; phase: number }
  | { type: 'percentage'; qubit: number; probability: number }
  | { type: 'template'; name: string; description: string; qubits: number; category: string }
  | { type: 'none' };

interface InfoBoxProps {
  info: HoverInfo;
}

// Format a complex number for display
function formatComplex(c: Complex): string {
  const re = c.re;
  const im = c.im;
  const threshold = 0.0001;

  // Check for special values
  const sqrt2 = Math.SQRT2;
  const invSqrt2 = 1 / sqrt2;

  // Helper to check if a value matches a special number
  const isClose = (val: number, target: number) => Math.abs(val - target) < threshold;

  // Pure zero
  if (isClose(re, 0) && isClose(im, 0)) return '0';

  // Pure real
  if (isClose(im, 0)) {
    if (isClose(re, 1)) return '1';
    if (isClose(re, -1)) return '-1';
    if (isClose(re, invSqrt2)) return '1/√2';
    if (isClose(re, -invSqrt2)) return '-1/√2';
    if (isClose(re, 0.5)) return '1/2';
    if (isClose(re, -0.5)) return '-1/2';
    return re.toFixed(3).replace(/\.?0+$/, '');
  }

  // Pure imaginary
  if (isClose(re, 0)) {
    if (isClose(im, 1)) return 'i';
    if (isClose(im, -1)) return '-i';
    if (isClose(im, invSqrt2)) return 'i/√2';
    if (isClose(im, -invSqrt2)) return '-i/√2';
    return `${im.toFixed(3).replace(/\.?0+$/, '')}i`;
  }

  // Complex with both parts - check for e^(iπ/4) type values
  if (isClose(re, invSqrt2) && isClose(im, invSqrt2)) return 'e^(iπ/4)/√2';
  if (isClose(re, invSqrt2) && isClose(im, -invSqrt2)) return 'e^(-iπ/4)/√2';
  if (isClose(re, -invSqrt2) && isClose(im, invSqrt2)) return 'e^(i3π/4)/√2';
  if (isClose(re, -invSqrt2) && isClose(im, -invSqrt2)) return 'e^(-i3π/4)/√2';

  // General complex
  const reStr = re.toFixed(2).replace(/\.?0+$/, '');
  const imStr = im >= 0
    ? `+${im.toFixed(2).replace(/\.?0+$/, '')}i`
    : `${im.toFixed(2).replace(/\.?0+$/, '')}i`;
  return `${reStr}${imStr}`;
}

// Render a matrix in LaTeX-style notation
function MatrixDisplay({ matrix }: { matrix: Complex[][] }) {
  if (!matrix || matrix.length === 0) return null;

  const rows = matrix.length;
  const cols = matrix[0].length;

  // Calculate max width for alignment
  const formattedCells = matrix.map(row => row.map(c => formatComplex(c)));
  const maxWidth = Math.max(...formattedCells.flat().map(s => s.length));

  return (
    <div className="font-mono text-xs mt-2">
      <div className="flex">
        {/* Left bracket */}
        <div className="flex flex-col justify-center mr-1">
          <span className="text-white/60">┌</span>
          {Array.from({ length: rows - 1 }).map((_, i) => (
            <span key={i} className="text-white/60">│</span>
          ))}
          <span className="text-white/60">└</span>
        </div>

        {/* Matrix content */}
        <div className="flex flex-col">
          {formattedCells.map((row, rIdx) => (
            <div key={rIdx} className="flex gap-2">
              {row.map((cell, cIdx) => (
                <span
                  key={cIdx}
                  className="text-cyan-400 text-right"
                  style={{ minWidth: `${maxWidth}ch` }}
                >
                  {cell}
                </span>
              ))}
            </div>
          ))}
        </div>

        {/* Right bracket */}
        <div className="flex flex-col justify-center ml-1">
          <span className="text-white/60">┐</span>
          {Array.from({ length: rows - 1 }).map((_, i) => (
            <span key={i} className="text-white/60">│</span>
          ))}
          <span className="text-white/60">┘</span>
        </div>
      </div>
    </div>
  );
}

// Gate info content
function GateContent({ gate, params }: { gate: GateType; params?: GateParams }) {
  const gateDef = GATE_DEFS[gate];

  if (!gateDef) {
    return (
      <div>
        <div className="text-white font-bold">{gate}</div>
        <div className="text-white/60 text-sm mt-1">Unknown gate type</div>
      </div>
    );
  }

  return (
    <div>
      <div className="text-white font-bold">{gateDef.fullName}</div>
      <div className="text-white/70 text-sm mt-1 leading-relaxed">{gateDef.description}</div>
      {params?.angle !== undefined && (
        <div className="text-cyan-400 text-sm mt-2">
          θ = {params.angleExpression || params.angle.toFixed(4)}
        </div>
      )}
      {gateDef.matrix && <MatrixDisplay matrix={gateDef.matrix} />}
    </div>
  );
}

// Bloch sphere info content
function BlochContent({ qubit, state, vector }: { qubit: number; state: string; vector: [number, number, number] }) {
  const [x, y, z] = vector;

  return (
    <div>
      <div className="text-white font-bold">Qubit |q{qubit}⟩</div>
      <div className="text-cyan-400 text-sm mt-2 font-mono">{state}</div>
      <div className="mt-3">
        <div className="text-white/60 text-xs mb-1">Bloch Vector</div>
        <div className="grid grid-cols-3 gap-2 text-sm font-mono">
          <div><span className="text-white/60">X:</span> <span className="text-white">{x.toFixed(3)}</span></div>
          <div><span className="text-white/60">Y:</span> <span className="text-white">{y.toFixed(3)}</span></div>
          <div><span className="text-white/60">Z:</span> <span className="text-white">{z.toFixed(3)}</span></div>
        </div>
      </div>
    </div>
  );
}

// Amplitude cell info content
function AmplitudeContent({ basisState, probability, magnitude, phase }: {
  basisState: string;
  probability: number;
  magnitude: number;
  phase: number;
}) {
  return (
    <div>
      <div className="text-white font-bold">Basis State |{basisState}⟩</div>
      <div className="mt-3 space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-white/60">Probability:</span>
          <span className="text-cyan-400 font-mono">{(probability * 100).toFixed(1)}%</span>
        </div>
        <div className="flex justify-between">
          <span className="text-white/60">Magnitude:</span>
          <span className="text-white font-mono">{magnitude.toFixed(4)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-white/60">Phase:</span>
          <span className="text-white font-mono">{phase.toFixed(1)}°</span>
        </div>
      </div>
    </div>
  );
}

// Percentage box info content
function PercentageContent({ qubit, probability }: { qubit: number; probability: number }) {
  return (
    <div>
      <div className="text-white font-bold">Qubit |q{qubit}⟩ Measurement</div>
      <div className="text-white/70 text-sm mt-2">
        Probability of measuring |1⟩ state
      </div>
      <div className="mt-3">
        <div className="text-3xl font-bold text-green-400">{probability.toFixed(1)}%</div>
        <div className="text-white/60 text-sm mt-1">
          |0⟩: {(100 - probability).toFixed(1)}% · |1⟩: {probability.toFixed(1)}%
        </div>
      </div>
    </div>
  );
}

// Template info content
function TemplateContent({ name, description, qubits, category }: {
  name: string;
  description: string;
  qubits: number;
  category: string;
}) {
  return (
    <div>
      <div className="text-white font-bold">{name}</div>
      <div className="text-white/70 text-sm mt-1 leading-relaxed">{description}</div>
      <div className="mt-3 flex gap-4 text-sm">
        <div>
          <span className="text-white/60">Qubits:</span>{' '}
          <span className="text-cyan-400">{qubits}</span>
        </div>
        <div>
          <span className="text-white/60">Category:</span>{' '}
          <span className="text-purple-400">{category}</span>
        </div>
      </div>
    </div>
  );
}

// Empty state content
function EmptyContent() {
  return (
    <div className="flex flex-col items-center justify-center h-full text-white/40">
      <div className="text-sm">Hover over elements for details</div>
    </div>
  );
}

export const InfoBox: React.FC<InfoBoxProps> = ({ info }) => {
  const renderContent = () => {
    switch (info.type) {
      case 'gate':
        return <GateContent gate={info.gate} params={info.params} />;
      case 'bloch':
        return <BlochContent qubit={info.qubit} state={info.state} vector={info.vector} />;
      case 'amplitude':
        return <AmplitudeContent
          basisState={info.basisState}
          probability={info.probability}
          magnitude={info.magnitude}
          phase={info.phase}
        />;
      case 'percentage':
        return <PercentageContent qubit={info.qubit} probability={info.probability} />;
      case 'template':
        return <TemplateContent
          name={info.name}
          description={info.description}
          qubits={info.qubits}
          category={info.category}
        />;
      case 'none':
      default:
        return <EmptyContent />;
    }
  };

  return (
    <div
      className="bg-black border-t-2 border-l-2 border-white/20 p-4 overflow-hidden"
      style={{ width: 288, height: 200 }}
    >
      {renderContent()}
    </div>
  );
};
