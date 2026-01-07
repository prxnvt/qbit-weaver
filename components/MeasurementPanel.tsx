import React, { useMemo } from 'react';

interface MeasurementOutcome {
  qubit: number;
  result: 0 | 1;
  probability: number;
}

interface MeasurementPanelProps {
  measurements: MeasurementOutcome[];
  numRows: number;
  rowHeight: number;
}

export const MeasurementPanel: React.FC<MeasurementPanelProps> = ({
  measurements,
  numRows,
  rowHeight,
}) => {
  // Group measurements by qubit, preserving chronological order
  const measurementsByQubit = useMemo(() => {
    const grouped: MeasurementOutcome[][] = Array.from({ length: numRows }, () => []);
    for (const m of measurements) {
      if (m.qubit >= 0 && m.qubit < numRows) {
        grouped[m.qubit].push(m);
      }
    }
    return grouped;
  }, [measurements, numRows]);

  if (measurements.length === 0) {
    return null;
  }

  return (
    <div className="ml-4 pr-2.5 flex flex-col">
        {measurementsByQubit.map((qubitMeasurements, rowIndex) => (
          <div
            key={rowIndex}
            className="flex items-center gap-2 text-xs text-white"
            style={{ height: rowHeight }}
          >
            {qubitMeasurements.length > 0 ? (
              qubitMeasurements.map((m, idx) => (
                <span key={idx} className="font-bold">
                  {m.result} ({Math.round(m.probability * 100)}%)
                </span>
              ))
            ) : null}
          </div>
        ))}
    </div>
  );
};
