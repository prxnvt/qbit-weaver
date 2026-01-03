import React, { useState, useCallback, useRef, useEffect } from 'react';
import { GateType, CircuitGrid, PARAMETERIZED_GATES, GateParams, Complex, CustomGateDefinition, CONTROL_GATES, ALL_FIXED_2X1_GATES, ARITHMETIC_INPUT_GATES, ARITHMETIC_DARK_BLUE_GATES, ARITHMETIC_LILAC_GATES, ARITHMETIC_FIXED_2X1_GATES } from './types';
import { INITIAL_ROWS, INITIAL_COLS, MAX_ROWS, ROW_HEIGHT, CELL_WIDTH, GATE_DEFS } from './constants';
import { GateLibrary } from './components/GateLibrary';
import { Gate } from './components/Gate';
import { BlochSphere } from './components/BlochSphere';
import { AngleInput } from './components/AngleInput';
import { CustomGateDialog } from './components/CustomGateDialog';
import { LoadDropdown } from './components/LoadDropdown';
import { runCircuitWithMeasurements, getBlochVector, cAbsSq, validateCircuit, ValidationError } from './utils/quantum';
import { AlgorithmTemplate } from './data/algorithms';

// All gates that span multiple rows (for rendering/deletion purposes)
const ALL_SPANNING_GATE_TYPES = [
  GateType.REVERSE,
  ...ALL_FIXED_2X1_GATES,
] as const;

// Gates that can be resized (only REVERSE)
const RESIZABLE_SPANNING_GATES = [
  GateType.REVERSE,
] as const;

interface PendingAngleInput {
  row: number;
  col: number;
  type: GateType;
  position: { x: number; y: number };
}

const App: React.FC = () => {
  const [rows, setRows] = useState(INITIAL_ROWS);
  const [hoveredGate, setHoveredGate] = useState<GateType | null>(null);
  const [hoveredInfo, setHoveredInfo] = useState<string | null>(null);
  const [pendingAngle, setPendingAngle] = useState<PendingAngleInput | null>(null);
  const [showCustomDialog, setShowCustomDialog] = useState(false);
  const [customGates, setCustomGates] = useState<CustomGateDefinition[]>([]);

  // Run workflow state
  const [hasRun, setHasRun] = useState(false);
  const [finalState, setFinalState] = useState<Complex[] | null>(null);
  const [measurements, setMeasurements] = useState<{ qubit: number; result: 0 | 1; probability: number }[]>([]);
  const [populatedRows, setPopulatedRows] = useState<number[]>([]);

  // Validation state
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);

  // Drag hover state for highlighting
  const [dragHover, setDragHover] = useState<{ row: number; col: number } | null>(null);

  // Spanning gate resize state (works for REVERSE, INPUT_A/B/R, arithmetic gates)
  const [resizingGate, setResizingGate] = useState<{
    col: number;
    anchorRow: number;
    edge: 'top' | 'bottom';
    originalSpan: { startRow: number; endRow: number };
    gateType: GateType;
  } | null>(null);
  const [hoveredReverseGate, setHoveredReverseGate] = useState<{ col: number; anchorRow: number } | null>(null);

  // Refs for synchronized scrolling
  const circuitScrollRef = useRef<HTMLDivElement>(null);
  const stateScrollRef = useRef<HTMLDivElement>(null);

  const [grid, setGrid] = useState<CircuitGrid>(() => {
    return Array(INITIAL_ROWS).fill(null).map((_, r) =>
      Array(INITIAL_COLS).fill(null).map((_, c) => ({
        gate: null,
        id: `cell-${r}-${c}`
      }))
    );
  });

  // Sync scroll between circuit and state panels
  useEffect(() => {
    const circuitEl = circuitScrollRef.current;
    const stateEl = stateScrollRef.current;
    if (!circuitEl || !stateEl) return;

    const syncCircuitToState = () => {
      if (stateEl) stateEl.scrollTop = circuitEl.scrollTop;
    };
    const syncStateToCircuit = () => {
      if (circuitEl) circuitEl.scrollTop = stateEl.scrollTop;
    };

    circuitEl.addEventListener('scroll', syncCircuitToState);
    stateEl.addEventListener('scroll', syncStateToCircuit);

    return () => {
      circuitEl.removeEventListener('scroll', syncCircuitToState);
      stateEl.removeEventListener('scroll', syncStateToCircuit);
    };
  }, []);

  // Validate circuit whenever it changes
  useEffect(() => {
    const errors = validateCircuit(grid);
    setValidationErrors(errors);
  }, [grid]);

  // Check if circuit is valid (no errors)
  const isCircuitValid = validationErrors.length === 0;

  // Handle running the circuit simulation
  const handleRun = useCallback(() => {
    const result = runCircuitWithMeasurements(grid);
    setFinalState(result.finalState);
    setMeasurements(result.measurements);
    setPopulatedRows(result.populatedRows);
    setHasRun(true);
  }, [grid]);

  // Clear circuit
  const handleClear = useCallback(() => {
    setGrid(
      Array(rows).fill(null).map((_, r) =>
        Array(INITIAL_COLS).fill(null).map((_, c) => ({
          gate: null,
          id: `cell-${r}-${c}`
        }))
      )
    );
    setHasRun(false);
    setFinalState(null);
    setMeasurements([]);
    setPopulatedRows([]);
  }, [rows]);

  const handleAddRow = () => {
    if (rows >= MAX_ROWS) return;
    setGrid(prev => [
      ...prev,
      Array(INITIAL_COLS).fill(null).map((_, c) => ({
        gate: null,
        id: `cell-${rows}-${c}`
      }))
    ]);
    setRows(prev => prev + 1);
  };

  const handleDrop = useCallback((row: number, dropCol: number, type: GateType, params?: GateParams) => {
    setGrid(prev => {
      const newGrid = prev.map(r => r.map(c => ({...c})));
      const totalRows = newGrid.length;

      // Check if this is a fixed 2x1 gate
      const isFixed2x1 = (ALL_FIXED_2X1_GATES as readonly GateType[]).includes(type);

      // Check if this is a resizable spanning gate (REVERSE)
      const isResizableSpanning = (RESIZABLE_SPANNING_GATES as readonly GateType[]).includes(type);

      if (isFixed2x1) {
        // Fixed 2x1 gates always span exactly 2 rows
        // Check if there's room for 2 rows
        if (row + 1 >= totalRows) {
          // Not enough room - don't place the gate
          return prev;
        }

        const fixedSpan = { startRow: row, endRow: row + 1 };

        // Place anchor cell
        newGrid[row][dropCol] = {
          ...newGrid[row][dropCol],
          gate: type,
          params: { ...params, reverseSpan: fixedSpan, isSpanContinuation: false }
        };

        // Place continuation cell
        newGrid[row + 1][dropCol] = {
          ...newGrid[row + 1][dropCol],
          gate: type,
          params: { ...params, reverseSpan: fixedSpan, isSpanContinuation: true }
        };
      } else if (isResizableSpanning) {
        // REVERSE gate - can have variable span
        const reverseSpan = params?.reverseSpan || { startRow: row, endRow: row };
        newGrid[row][dropCol] = {
          ...newGrid[row][dropCol],
          gate: type,
          params: { ...params, reverseSpan, isSpanContinuation: false }
        };
      } else {
        // Regular single-cell gate
        newGrid[row][dropCol] = {
          ...newGrid[row][dropCol],
          gate: type,
          params: params
        };
      }
      return newGrid;
    });
  }, []);

  // Helper to update spanning gate span (used during resize) - works for REVERSE and arithmetic gates
  const updateSpanningGateSpan = useCallback((col: number, anchorRow: number, newStartRow: number, newEndRow: number, gateType: GateType) => {
    setGrid(prev => {
      const newGrid = prev.map(r => r.map(c => ({...c})));

      // Find current span by looking at the anchor cell
      const anchorCell = newGrid[anchorRow]?.[col];
      if (!anchorCell || anchorCell.gate !== gateType) return prev;

      const oldSpan = anchorCell.params?.reverseSpan;
      if (!oldSpan) return prev;

      // Clear all old span cells
      for (let r = oldSpan.startRow; r <= oldSpan.endRow; r++) {
        if (newGrid[r]?.[col]) {
          newGrid[r][col].gate = null;
          newGrid[r][col].params = undefined;
        }
      }

      // Clamp new span to valid range
      const clampedStart = Math.max(0, Math.min(newStartRow, newGrid.length - 1));
      const clampedEnd = Math.max(0, Math.min(newEndRow, newGrid.length - 1));
      const finalStart = Math.min(clampedStart, clampedEnd);
      const finalEnd = Math.max(clampedStart, clampedEnd);

      // Check for collisions in the new span (excluding empty cells and same gate type)
      for (let r = finalStart; r <= finalEnd; r++) {
        const cell = newGrid[r]?.[col];
        if (cell && cell.gate && cell.gate !== gateType) {
          // Collision detected - need to shift columns
          return shiftColumnsForSpanningGate(newGrid, col, finalStart, finalEnd, gateType);
        }
      }

      // Place anchor cell at the start of the span
      const newSpan = { startRow: finalStart, endRow: finalEnd };
      newGrid[finalStart][col] = {
        ...newGrid[finalStart][col],
        gate: gateType,
        params: { reverseSpan: newSpan, isSpanContinuation: false }
      };

      // Place continuation cells for the rest of the span
      for (let r = finalStart + 1; r <= finalEnd; r++) {
        newGrid[r][col] = {
          ...newGrid[r][col],
          gate: gateType,
          params: { reverseSpan: newSpan, isSpanContinuation: true }
        };
      }

      return newGrid;
    });
  }, []);

  // Helper to shift columns when a spanning gate has a collision
  const shiftColumnsForSpanningGate = (grid: CircuitGrid, targetCol: number, startRow: number, endRow: number, gateType: GateType): CircuitGrid => {
    const numCols = grid[0]?.length || 0;
    const newGrid = grid.map(row => [...row, { gate: null, id: `cell-${grid.indexOf(row)}-${numCols}` }]);

    // Shift all columns from targetCol to the right by 1
    for (let r = 0; r < newGrid.length; r++) {
      for (let c = numCols; c > targetCol; c--) {
        newGrid[r][c] = { ...newGrid[r][c - 1], id: `cell-${r}-${c}` };
      }
      // Clear the target column
      newGrid[r][targetCol] = { gate: null, id: `cell-${r}-${targetCol}` };
    }

    // Now place the spanning gate in the cleared column
    const newSpan = { startRow, endRow };
    newGrid[startRow][targetCol] = {
      ...newGrid[startRow][targetCol],
      gate: gateType,
      params: { reverseSpan: newSpan, isSpanContinuation: false }
    };

    for (let r = startRow + 1; r <= endRow; r++) {
      newGrid[r][targetCol] = {
        ...newGrid[r][targetCol],
        gate: gateType,
        params: { reverseSpan: newSpan, isSpanContinuation: true }
      };
    }

    return newGrid;
  };

  // Delete entire spanning gate (all cells in span) - works for REVERSE and arithmetic gates
  const deleteSpanningGate = useCallback((col: number, anchorRow: number) => {
    setGrid(prev => {
      const newGrid = prev.map(r => r.map(c => ({...c})));
      const anchorCell = newGrid[anchorRow]?.[col];
      if (!anchorCell || !anchorCell.gate) return prev;

      // Check if this is a spanning gate
      if (!(ALL_SPANNING_GATE_TYPES as readonly GateType[]).includes(anchorCell.gate)) return prev;

      const span = anchorCell.params?.reverseSpan;
      if (!span) return prev;

      // Clear all cells in the span
      for (let r = span.startRow; r <= span.endRow; r++) {
        if (newGrid[r]?.[col]) {
          newGrid[r][col].gate = null;
          newGrid[r][col].params = undefined;
        }
      }

      return newGrid;
    });
  }, []);

  // Handle spanning gate resize mouse events
  useEffect(() => {
    if (!resizingGate) return;

    const handleMouseMove = (e: MouseEvent) => {
      const circuitContainer = document.getElementById('circuit-container');
      if (!circuitContainer) return;

      const rect = circuitContainer.getBoundingClientRect();
      // Account for padding (pt-4 = 16px + py-8 = 32px top)
      const relativeY = e.clientY - rect.top - 16 + circuitContainer.scrollTop;
      const targetRow = Math.floor(relativeY / ROW_HEIGHT);
      const clampedRow = Math.max(0, Math.min(targetRow, rows - 1));

      const { col, originalSpan, edge, gateType } = resizingGate;

      let newStart = originalSpan.startRow;
      let newEnd = originalSpan.endRow;

      if (edge === 'top') {
        newStart = clampedRow;
      } else {
        newEnd = clampedRow;
      }

      // Ensure start <= end
      if (newStart > newEnd) {
        [newStart, newEnd] = [newEnd, newStart];
      }

      updateSpanningGateSpan(col, originalSpan.startRow, newStart, newEnd, gateType);
    };

    const handleMouseUp = () => {
      setResizingGate(null);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [resizingGate, rows, updateSpanningGateSpan]);

  const handleDragOver = (e: React.DragEvent, row: number, col: number) => {
    e.preventDefault();
    // Use move if from circuit board, copy if from sidebar
    const sourceCellId = e.dataTransfer.types.includes('sourcecellid');
    e.dataTransfer.dropEffect = sourceCellId ? 'move' : 'copy';
    setDragHover({ row, col });
  };

  const handleDragLeave = () => {
    setDragHover(null);
  };

  const handleDropEvent = (e: React.DragEvent, row: number, col: number) => {
    e.preventDefault();
    setDragHover(null);
    const type = e.dataTransfer.getData('gateType') as GateType;
    if (!type) return;

    const sourceCellId = e.dataTransfer.getData('sourceCellId');
    const paramsStr = e.dataTransfer.getData('gateParams');
    const existingParams = paramsStr ? JSON.parse(paramsStr) as GateParams : undefined;

    // If moving from another cell, clear the source cell
    if (sourceCellId) {
      // Parse source cell id: "cell-{row}-{col}"
      const parts = sourceCellId.split('-');
      const sourceRow = parseInt(parts[1], 10);
      const sourceCol = parseInt(parts[2], 10);

      // Don't do anything if dropping on same cell
      if (sourceRow === row && sourceCol === col) return;

      // Clear source cell
      setGrid(prev => {
        const newGrid = prev.map(r => r.map(c => ({...c})));
        newGrid[sourceRow][sourceCol].gate = null;
        newGrid[sourceRow][sourceCol].params = undefined;
        return newGrid;
      });
    }

    // Check if this is a parameterized gate (only prompt for new gates from sidebar)
    if (!existingParams && (PARAMETERIZED_GATES as readonly GateType[]).includes(type)) {
      // Show angle input popup
      const rect = (e.target as HTMLElement).getBoundingClientRect();
      setPendingAngle({
        row,
        col,
        type,
        position: { x: rect.left, y: rect.bottom + 8 }
      });
    } else {
      handleDrop(row, col, type, existingParams);
    }
  };

  const handleAngleConfirm = (angle: number, expression: string) => {
    if (!pendingAngle) return;
    handleDrop(pendingAngle.row, pendingAngle.col, pendingAngle.type, {
      angle,
      angleExpression: expression
    });
    setPendingAngle(null);
  };

  const handleAngleCancel = () => {
    setPendingAngle(null);
  };

  const handleAddCustomGate = () => {
    setShowCustomDialog(true);
  };

  const handleCustomConfirm = (matrix: Complex[][], label: string) => {
    setCustomGates(prev => [...prev, { label, matrix }]);
    setShowCustomDialog(false);
  };

  const handleCustomCancel = () => {
    setShowCustomDialog(false);
  };

  const handleLoadTemplate = useCallback((template: AlgorithmTemplate) => {
    // Deep clone the template grid to avoid mutations
    const newGrid = template.grid.map((row, rIdx) =>
      row.map((cell, cIdx) => ({
        ...cell,
        id: `cell-${rIdx}-${cIdx}`,
        params: cell.params ? { ...cell.params } : undefined,
      }))
    );

    setRows(template.qubits);
    setGrid(newGrid);
    setHasRun(false);
    setFinalState(null);
    setMeasurements([]);
    setPopulatedRows([]);
  }, []);

  const clearCell = (row: number, col: number, e: React.MouseEvent) => {
    e.preventDefault();
    const cell = grid[row]?.[col];

    // If this is a spanning gate, delete the entire span
    if (cell?.gate && (ALL_SPANNING_GATE_TYPES as readonly GateType[]).includes(cell.gate)) {
      const span = cell.params?.reverseSpan;
      if (span) {
        deleteSpanningGate(col, span.startRow);
        return;
      }
    }

    setGrid(prev => {
      const newGrid = prev.map(r => r.map(c => ({...c})));
      newGrid[row][col].gate = null;
      newGrid[row][col].params = undefined;
      return newGrid;
    });
  };

  // Calculate measurement probabilities for display
  const getMeasurementProbabilities = () => {
    if (!finalState || populatedRows.length === 0) return [];
    const probs: { state: string; prob: number }[] = [];
    const numQubits = populatedRows.length;
    for (let i = 0; i < finalState.length; i++) {
      const prob = cAbsSq(finalState[i]);
      if (prob > 0.001) {
        const stateLabel = `|${i.toString(2).padStart(numQubits, '0')}⟩`;
        probs.push({ state: stateLabel, prob });
      }
    }
    return probs.sort((a, b) => b.prob - a.prob).slice(0, 4); // Top 4
  };


  // Helper to get styling for spanning gates based on type
  const getSpanningGateStyle = (gateType: GateType) => {
    // Input markers - dashed borders (A is white, others colored)
    if ((ARITHMETIC_INPUT_GATES as readonly GateType[]).includes(gateType)) {
      if (gateType === GateType.INPUT_A) {
        return {
          borderClass: 'border-dashed border-white',
          textClass: 'text-gray-300',
          hoverBgClass: 'bg-white',
        };
      }
      return {
        borderClass: 'border-dashed border-gray-400',
        textClass: 'text-gray-400',
        hoverBgClass: 'bg-gray-400',
      };
    }
    // Lilac - mod gates
    if ((ARITHMETIC_LILAC_GATES as readonly GateType[]).includes(gateType)) {
      return {
        borderClass: 'border-purple-400',
        textClass: 'text-purple-300',
        hoverBgClass: 'bg-purple-400',
      };
    }
    // Dark blue - inc/dec, mul/div
    if ((ARITHMETIC_DARK_BLUE_GATES as readonly GateType[]).includes(gateType)) {
      return {
        borderClass: 'border-blue-600',
        textClass: 'text-blue-400',
        hoverBgClass: 'bg-blue-600',
      };
    }
    // Default (REVERSE) - yellow
    return {
      borderClass: 'border-yellow-400',
      textClass: 'text-yellow-400',
      hoverBgClass: 'bg-yellow-400',
    };
  };

  // Helper to render a spanning gate (REVERSE, arithmetic 2x1 gates, input markers)
  const renderSpanningGate = (col: number, gateType: GateType, span: { startRow: number; endRow: number }) => {
    const spanHeight = (span.endRow - span.startRow + 1) * ROW_HEIGHT;
    const isHovered = hoveredReverseGate?.col === col && hoveredReverseGate?.anchorRow === span.startRow;
    const style = getSpanningGateStyle(gateType);
    const gateDef = GATE_DEFS[gateType];
    const label = gateDef?.label || gateType;

    // Only REVERSE gate is resizable
    const isResizable = (RESIZABLE_SPANNING_GATES as readonly GateType[]).includes(gateType);

    const handleResizeMouseDown = (edge: 'top' | 'bottom') => (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setResizingGate({
        col,
        anchorRow: span.startRow,
        edge,
        originalSpan: { ...span },
        gateType,
      });
    };

    return (
      <div
        className="absolute z-30 pointer-events-auto"
        style={{
          left: 0,
          top: 0,
          width: CELL_WIDTH,
          height: spanHeight,
        }}
        onMouseEnter={() => setHoveredReverseGate({ col, anchorRow: span.startRow })}
        onMouseLeave={() => setHoveredReverseGate(null)}
        onContextMenu={(e) => {
          e.preventDefault();
          deleteSpanningGate(col, span.startRow);
        }}
      >
        {/* Main gate body */}
        <div
          className={`absolute inset-2 border-2 ${style.borderClass} bg-black flex items-center justify-center cursor-grab active:cursor-grabbing`}
          draggable
          onDragStart={(e) => {
            e.dataTransfer.setData('gateType', gateType);
            e.dataTransfer.setData('sourceCellId', `cell-${span.startRow}-${col}`);
            e.dataTransfer.setData('gateParams', JSON.stringify({ reverseSpan: span }));
            e.dataTransfer.effectAllowed = 'move';
          }}
        >
          <span className={`${style.textClass} font-bold text-xs`}>{label}</span>
        </div>

        {/* Resize handles - only show on hover for resizable gates (REVERSE only) */}
        {isHovered && isResizable && (
          <>
            {/* Top resize handle */}
            <div
              className={`absolute left-2 right-2 h-2 ${style.hoverBgClass}/50 hover:${style.hoverBgClass} cursor-ns-resize z-40`}
              style={{ top: 4 }}
              onMouseDown={handleResizeMouseDown('top')}
            />
            {/* Bottom resize handle */}
            <div
              className={`absolute left-2 right-2 h-2 ${style.hoverBgClass}/50 hover:${style.hoverBgClass} cursor-ns-resize z-40`}
              style={{ bottom: 4 }}
              onMouseDown={handleResizeMouseDown('bottom')}
            />
          </>
        )}
      </div>
    );
  };

  // Helper to draw connector lines in a column
  const renderColumnConnectors = (colIdx: number) => {
    const swapRows: number[] = [];
    const controlRows: number[] = [];
    const targetRows: number[] = [];

    // Track arithmetic gates and their input markers for connector lines
    const arithmeticSpans: { startRow: number; endRow: number }[] = [];
    const inputSpans: { startRow: number; endRow: number }[] = [];

    for (let r = 0; r < rows; r++) {
        const cell = grid[r][colIdx];
        const g = cell.gate;
        if (!g) continue;

        // Skip span continuations for arithmetic gates
        if (cell.params?.isSpanContinuation) continue;

        if (g === GateType.SWAP) swapRows.push(r);
        // All control-type gates (CONTROL, ANTI_CONTROL, X_CONTROL, etc.)
        if ((CONTROL_GATES as readonly GateType[]).includes(g)) controlRows.push(r);
        // Target gates are anything that's not a control or swap
        if (g !== GateType.EMPTY && !(CONTROL_GATES as readonly GateType[]).includes(g) && g !== GateType.SWAP) targetRows.push(r);

        // Collect arithmetic gate spans
        if ((ALL_FIXED_2X1_GATES as readonly GateType[]).includes(g) && cell.params?.reverseSpan) {
          if ((ARITHMETIC_INPUT_GATES as readonly GateType[]).includes(g)) {
            inputSpans.push(cell.params.reverseSpan);
          } else {
            arithmeticSpans.push(cell.params.reverseSpan);
          }
        }
    }

    const lines = [];

    // SWAP lines
    for (let i = 0; i < swapRows.length - 1; i += 2) {
        const start = swapRows[i];
        const end = swapRows[i+1];
        lines.push(
             <div
                key={`line-swap-${colIdx}-${i}`}
                className="absolute w-0.5 bg-white z-0 pointer-events-none"
                style={{
                    left: '50%',
                    top: `${start * ROW_HEIGHT + ROW_HEIGHT / 2}px`,
                    height: `${(end - start) * ROW_HEIGHT}px`,
                    transform: 'translateX(-50%)'
                }}
             />
        );
    }

    // Control Lines
    if (controlRows.length > 0 && targetRows.length > 0) {
        const allActive = [...controlRows, ...targetRows];
        const minR = Math.min(...allActive);
        const maxR = Math.max(...allActive);

        lines.push(
            <div
                key={`line-ctrl-${colIdx}`}
                className="absolute w-0.5 bg-white z-0 pointer-events-none"
                style={{
                    left: '50%',
                    top: `${minR * ROW_HEIGHT + ROW_HEIGHT / 2}px`,
                    height: `${(maxR - minR) * ROW_HEIGHT}px`,
                    transform: 'translateX(-50%)'
                }}
             />
        );
    }

    // Arithmetic connector lines: connect input markers to arithmetic gates
    if (inputSpans.length > 0 && arithmeticSpans.length > 0) {
        // Find the overall range from top of topmost input to bottom of bottommost arithmetic gate
        const allSpans = [...inputSpans, ...arithmeticSpans];
        const minRow = Math.min(...allSpans.map(s => s.startRow));
        const maxRow = Math.max(...allSpans.map(s => s.endRow));

        lines.push(
            <div
                key={`line-arith-${colIdx}`}
                className="absolute w-0.5 bg-purple-400 z-0 pointer-events-none"
                style={{
                    left: '50%',
                    top: `${minRow * ROW_HEIGHT + ROW_HEIGHT / 2}px`,
                    height: `${(maxRow - minRow) * ROW_HEIGHT}px`,
                    transform: 'translateX(-50%)'
                }}
             />
        );
    }

    return lines;
  };

  const measurementProbs = getMeasurementProbabilities();

  return (
    <div className="flex flex-col h-screen w-screen bg-black text-white overflow-hidden font-mono font-bold">

      {/* Header Bar */}
      <header className="h-14 border-b-2 border-white bg-black flex items-center px-4 justify-between shrink-0 z-20">
        <div className="flex items-center gap-4">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <h1 className="font-bold text-lg tracking-tight uppercase">QCVO</h1>
          </div>

          {/* Divider */}
          <div className="h-6 w-0.5 bg-white"></div>

          {/* Run Button */}
          <button
            onClick={handleRun}
            disabled={!isCircuitValid}
            className={`flex items-center gap-2 px-4 py-1.5 border-2 transition-colors text-sm font-bold uppercase ${
              isCircuitValid
                ? 'border-white hover:bg-white hover:text-black'
                : 'border-red-500 text-red-500 opacity-50 cursor-not-allowed'
            }`}
            title={!isCircuitValid ? `Validation errors: ${validationErrors.length}` : 'Run circuit simulation'}
          >
            <span>Run</span>
          </button>

          {/* Load Template Dropdown */}
          <LoadDropdown onLoad={handleLoadTemplate} />

          {/* Upload Button */}
          <button
            className="flex items-center gap-2 px-4 py-1.5 border-2 border-white hover:bg-white hover:text-black transition-colors text-sm font-bold uppercase"
          >
            <span>Upload</span>
          </button>

          {/* Save Button */}
          <button
            className="flex items-center gap-2 px-4 py-1.5 border-2 border-white hover:bg-white hover:text-black transition-colors text-sm font-bold uppercase"
          >
            <span>Save</span>
          </button>

          {/* Optimize Button */}
          <button
            className="flex items-center gap-2 px-4 py-1.5 border-2 border-white hover:bg-white hover:text-black transition-colors text-sm font-bold uppercase"
          >
            <span>Optimize</span>
          </button>
        </div>

        <div className="flex items-center gap-4">
          {/* Measurement Results */}
          {hasRun && measurements.length > 0 && (
            <div className="text-xs text-white">
              Measurements: {measurements.map(m => `q${m.qubit}=${m.result}`).join(', ')}
            </div>
          )}

          {/* Clear Button - rightmost */}
          <button
            onClick={handleClear}
            className="flex items-center gap-2 px-4 py-1.5 border-2 border-white hover:bg-red-600 hover:border-red-600 hover:text-white transition-colors text-sm font-bold uppercase"
          >
            <span>Clear</span>
          </button>
        </div>
      </header>

      {/* Main Layout - Grid: [Circuit + GateLibrary] | [Right Sidebar] */}
      <div className="flex-1 grid grid-cols-[1fr_240px] grid-rows-1 min-h-0 overflow-hidden">

        {/* Left Column: Circuit Area + Gate Library */}
        <div className="flex flex-col h-full overflow-hidden border-r-2 border-white">

          {/* Circuit Area - Scrollable, takes remaining space */}
          <section className="flex-1 relative bg-black overflow-auto min-h-0">

            {/* Circuit Grid */}
            <div ref={circuitScrollRef} className="py-8 pl-4 pr-8 relative" id="circuit-container">
            {/* Circuit Wires and Gates */}
            <div className="min-w-[800px] relative">
              {/* Column Connectors Layer */}
              <div className="absolute inset-0 pointer-events-none">
                {Array.from({ length: grid[0]?.length ?? 0 }).map((_, c) => (
                  <div key={`col-conn-${c}`} className="absolute top-0 bottom-0" style={{ left: `${c * CELL_WIDTH + 48}px`, width: CELL_WIDTH }}>
                    {renderColumnConnectors(c)}
                  </div>
                ))}
              </div>

              {/* Qubit Rows */}
              <div className="pt-4">
                {grid.map((row, rIdx) => (
                  <div key={`row-${rIdx}`} className="flex items-center group relative" style={{ height: ROW_HEIGHT }}>
                    {/* Qubit Label */}
                    <div className="w-12 text-left font-mono font-bold text-sm text-white select-none">
                      |q{rIdx}⟩
                    </div>

                    {/* Wire and Gates */}
                    <div className="flex-1 relative flex items-center">
                      {/* Wire Line */}
                      <div className="absolute inset-0 flex items-center pointer-events-none">
                        <div className="w-full h-0.5 bg-white"></div>
                      </div>

                      {/* Gate Cells */}
                      <div className="flex relative z-10">
                        {row.map((cell, cIdx) => {
                          const isRowHighlighted = dragHover?.row === rIdx;
                          const isColHighlighted = dragHover?.col === cIdx;
                          const isHovered = isRowHighlighted && isColHighlighted;

                          return (
                            <div
                              key={cell.id}
                              onDragOver={(e) => handleDragOver(e, rIdx, cIdx)}
                              onDragLeave={handleDragLeave}
                              onDrop={(e) => handleDropEvent(e, rIdx, cIdx)}
                              onContextMenu={(e) => clearCell(rIdx, cIdx, e)}
                              className={`flex items-center justify-center relative transition-colors ${
                                isHovered
                                  ? 'bg-white/20'
                                  : (isRowHighlighted || isColHighlighted)
                                    ? 'bg-white/10'
                                    : ''
                              }`}
                              style={{ height: ROW_HEIGHT, width: CELL_WIDTH }}
                            >
                              {/* Regular gates (non-spanning) */}
                              {cell.gate && !(ALL_SPANNING_GATE_TYPES as readonly GateType[]).includes(cell.gate) && (
                                <Gate type={cell.gate} onHover={setHoveredGate} params={cell.params} cellId={cell.id} />
                              )}
                              {/* Render spanning gate anchor (REVERSE, arithmetic spanning, input markers) */}
                              {cell.gate && (ALL_SPANNING_GATE_TYPES as readonly GateType[]).includes(cell.gate) && !cell.params?.isSpanContinuation && cell.params?.reverseSpan && (
                                renderSpanningGate(cIdx, cell.gate, cell.params.reverseSpan)
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                ))}

                {/* Add Wire Button - below bottom-most wire, aligned with qubit labels */}
                <div className="flex items-center mt-2" style={{ height: ROW_HEIGHT }}>
                  <div className="w-12 flex justify-center">
                    <button
                      onClick={handleAddRow}
                      disabled={rows >= MAX_ROWS}
                      className="w-8 h-8 border-2 border-white hover:bg-white hover:text-black transition-colors text-sm font-bold disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-white"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>
            </div>

            </div>
          </section>

          {/* Gate Library - Bottom of left column */}
          <GateLibrary
            onHoverGate={setHoveredGate}
            customGates={customGates}
            onAddCustomGate={handleAddCustomGate}
          />
        </div>

        {/* Right Column: System State (full height) */}
        <aside className="bg-black flex flex-col">
          {/* Bloch Spheres - Scrollable, synced with circuit */}
          <div ref={stateScrollRef} className="flex-1 overflow-auto py-8 px-4" id="system-state-container">
            <div className="pt-4">
            {Array.from({ length: rows }).map((_, rIdx) => {
              // Check if this row was populated (had gates)
              const filteredIdx = populatedRows.indexOf(rIdx);
              const isPopulated = filteredIdx !== -1;

              // Get Bloch vector - use filtered index for populated rows, default for empty
              const [bx, by, bz] = (hasRun && finalState && isPopulated)
                ? getBlochVector(finalState, filteredIdx, populatedRows.length)
                : [0, 0, 1]; // Default |0⟩ state for unpopulated wires or before run

              // Calculate probabilities from Bloch vector
              const prob0 = (1 + bz) / 2;
              const prob1 = (1 - bz) / 2;
              const prob0Pct = (prob0 * 100).toFixed(0);

              // Calculate the dominant state for display
              const getDominantState = () => {
                if (prob0 > 0.99) return '|0⟩';
                if (prob1 > 0.99) return '|1⟩';

                // For superposition states, check for common values
                const sqrtHalf = 1 / Math.sqrt(2);
                const theta = Math.acos(Math.max(-1, Math.min(1, bz)));
                const phi = Math.atan2(by, bx);

                const alpha = Math.cos(theta / 2);
                const betaMag = Math.sin(theta / 2);

                // Check for |+⟩ = (|0⟩ + |1⟩)/√2 (theta = π/2, phi = 0)
                if (Math.abs(alpha - sqrtHalf) < 0.05 && Math.abs(betaMag - sqrtHalf) < 0.05) {
                  if (Math.abs(phi) < 0.1) return '|+⟩';
                  if (Math.abs(phi - Math.PI) < 0.1 || Math.abs(phi + Math.PI) < 0.1) return '|−⟩';
                  if (Math.abs(phi - Math.PI/2) < 0.1) return '|i⟩';
                  if (Math.abs(phi + Math.PI/2) < 0.1) return '|−i⟩';
                }

                // Generic superposition
                return 'sup';
              };

              const stateLabel = getDominantState();

              return (
                <div
                  key={`bloch-${rIdx}`}
                  className={`flex items-center ${hasRun && !isPopulated ? 'opacity-30' : ''}`}
                  style={{ height: ROW_HEIGHT }}
                >
                  <BlochSphere
                    x={bx} y={by} z={bz}
                    size={40}
                    row={rIdx}
                    col={-1}
                    onHover={setHoveredInfo}
                  />
                  <div className="ml-3 flex-1">
                    <div className="text-[10px] font-mono text-white">|q{rIdx}⟩</div>
                    <div className="text-xs font-bold text-white">{prob0Pct}% {stateLabel}</div>
                  </div>
                </div>
              );
            })}
          </div>
          </div>

          {/* Measurement Probabilities */}
          <div className="p-4 border-t-2 border-white bg-black shrink-0">
            <div className="text-[10px] text-white mb-2 font-bold uppercase">Measurement Probabilities</div>
            {hasRun && measurementProbs.length > 0 ? (
              <>
                <div className="w-full h-3 border-2 border-white flex overflow-hidden">
                  {measurementProbs.map((p, i) => (
                    <div
                      key={p.state}
                      className={`h-full ${i === 0 ? 'bg-white' : i === 1 ? 'bg-gray-500' : 'bg-gray-700'}`}
                      style={{ width: `${p.prob * 100}%` }}
                    />
                  ))}
                </div>
                <div className="flex justify-between mt-1 text-[9px] text-white font-mono font-bold">
                  {measurementProbs.slice(0, 2).map(p => (
                    <span key={p.state}>{p.state}: {(p.prob * 100).toFixed(0)}%</span>
                  ))}
                </div>
              </>
            ) : (
              <div className="w-full h-3 border-2 border-white bg-black"></div>
            )}
          </div>
        </aside>
      </div>

      {/* Angle Input Popup */}
      {pendingAngle && (
        <AngleInput
          gateType={pendingAngle.type}
          position={pendingAngle.position}
          onConfirm={handleAngleConfirm}
          onCancel={handleAngleCancel}
        />
      )}

      {/* Custom Gate Dialog */}
      {showCustomDialog && (
        <CustomGateDialog
          onConfirm={handleCustomConfirm}
          onCancel={handleCustomCancel}
          existingNames={customGates.map(g => g.label)}
        />
      )}
    </div>
  );
};

export default App;
