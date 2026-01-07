import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { Undo2, Redo2 } from 'lucide-react';
import {
  GateType,
  CircuitGrid,
  GateParams,
  Complex,
  CustomGateDefinition,
  isValidGateType,
  isParameterizedGate,
  isTimeParameterizedGate,
  isExponentialGate,
  isControlGate,
  isAllFixed2x1Gate,
  isArithmeticInputGate,
  isArithmeticDarkBlueGate,
  isArithmeticLilacGate,
  isSpanningGate,
  isResizableSpanningGate,
} from './types';
import { INITIAL_ROWS, INITIAL_COLS, MAX_ROWS, ROW_HEIGHT, CELL_WIDTH, GRID_CELL_SIZE, GATE_DEFS } from './constants';
import { GateLibrary } from './components/GateLibrary';
import { Gate } from './components/Gate';
import { BlochSphere } from './components/BlochSphere';
import { AmplitudeGrid } from './components/AmplitudeGrid';
import { AngleInput } from './components/AngleInput';
import { CustomGateDialog } from './components/CustomGateDialog';
import { AlgorithmSidebar } from './components/AlgorithmSidebar';
import { InfoBox, HoverInfo } from './components/InfoBox';
import { runCircuitWithMeasurements, getBlochVector, validateCircuit, ValidationError, CircuitSimulationResult } from './utils/quantum';
import { SimulationTimeline } from './components/SimulationTimeline';
import { MeasurementPanel } from './components/MeasurementPanel';
import { AlgorithmTemplate } from './data/algorithms';
import { useCircuitHistory } from './hooks/useCircuitHistory';
import { useSelection } from './hooks/useSelection';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';

interface PendingAngleInput {
  row: number;
  col: number;
  type: GateType;
  position: { x: number; y: number };
}

// Helper to get the actual populated dimensions of a template (rows with gates, rightmost col with gate)
const getTemplatePopulatedDimensions = (template: AlgorithmTemplate): { rows: number; cols: number } => {
  const grid = template.grid;
  let maxRow = -1;
  let maxCol = -1;

  for (let r = 0; r < grid.length; r++) {
    for (let c = 0; c < grid[r].length; c++) {
      if (grid[r][c]?.gate !== null) {
        maxRow = Math.max(maxRow, r);
        maxCol = Math.max(maxCol, c);
      }
    }
  }

  return {
    rows: maxRow + 1,
    cols: maxCol + 1,
  };
};

const App: React.FC = () => {
  // Rows are always fixed at 8 (q0-q7)
  const [hoverInfo, setHoverInfo] = useState<HoverInfo>({ type: 'none' });
  const [pendingAngle, setPendingAngle] = useState<PendingAngleInput | null>(null);
  const [showCustomDialog, setShowCustomDialog] = useState(false);
  const [customGates, setCustomGates] = useState<CustomGateDefinition[]>([]);

  // Run workflow state
  const [hasRun, setHasRun] = useState(false);
  const [finalState, setFinalState] = useState<Complex[] | null>(null);
  const [measurements, setMeasurements] = useState<{ qubit: number; result: 0 | 1; probability: number }[]>([]);
  const [populatedRows, setPopulatedRows] = useState<number[]>([]);

  // Step mode state
  const [stepMode, setStepMode] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [stateHistory, setStateHistory] = useState<Complex[][]>([]);
  const [activeColumns, setActiveColumns] = useState<number[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);

  // Time-parameterized gates animation state
  const [timeParameter, setTimeParameter] = useState(0);
  const [isFrozen, setIsFrozen] = useState(false);
  const animationRef = useRef<number | null>(null);

  // Cache measurement seeds to prevent random oscillation during time animation
  // The seed changes only when the grid changes, not on every animation frame
  const measurementSeedRef = useRef<number>(Date.now());

  // Validation state
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);

  // Drag hover state for highlighting
  const [dragHover, setDragHover] = useState<{ row: number; col: number } | null>(null);

  // Template drag state for algorithm sidebar
  const [templateDragHover, setTemplateDragHover] = useState<{ row: number; col: number } | null>(null);
  const [draggingTemplate, setDraggingTemplate] = useState<AlgorithmTemplate | null>(null);

  // Spanning gate resize state (works for REVERSE, INPUT_A/B/R, arithmetic gates)
  const [resizingGate, setResizingGate] = useState<{
    col: number;
    anchorRow: number;
    edge: 'top' | 'bottom';
    originalSpan: { startRow: number; endRow: number };
    gateType: GateType;
  } | null>(null);
  const [hoveredReverseGate, setHoveredReverseGate] = useState<{ col: number; anchorRow: number } | null>(null);

  // Ref for circuit scrolling
  const circuitScrollRef = useRef<HTMLDivElement>(null);

  // Create initial grid
  const initialGrid = React.useMemo(() => {
    return Array(INITIAL_ROWS).fill(null).map((_, r) =>
      Array(INITIAL_COLS).fill(null).map((_, c) => ({
        gate: null,
        id: `cell-${r}-${c}`
      }))
    );
  }, []);

  // Circuit history with undo/redo support
  const {
    grid,
    setGrid,
    pushState,
    saveSnapshot,
    commitDrag,
    undo,
    redo,
    canUndo,
    canRedo,
  } = useCircuitHistory(initialGrid);

  // Selection state for keyboard navigation
  const {
    selectedCell,
    selectCell,
    clearSelection,
    isSelected,
  } = useSelection(MAX_ROWS, grid[0]?.length ?? INITIAL_COLS);

  // Check if circuit has any time-parameterized or exponential gates
  const hasTimeGates = useMemo(() => {
    for (const row of grid) {
      for (const cell of row) {
        if (cell.gate && (isTimeParameterizedGate(cell.gate) || isExponentialGate(cell.gate))) {
          return true;
        }
      }
    }
    return false;
  }, [grid]);

  // Auto-disable step mode when time gates are present
  useEffect(() => {
    if (hasTimeGates && stepMode) {
      setStepMode(false);
      setIsPlaying(false);
    }
  }, [hasTimeGates, stepMode]);

  // Auto-disable freeze when all time gates are removed
  useEffect(() => {
    if (!hasTimeGates && isFrozen) {
      setIsFrozen(false);
    }
  }, [hasTimeGates, isFrozen]);

  // Time animation loop - runs continuously when time gates are present and not frozen
  useEffect(() => {
    if (!hasTimeGates) {
      // No time gates - stop animation and reset
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
      setTimeParameter(0);
      return;
    }

    if (isFrozen) {
      // Frozen - stop animation but keep current t value
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
      return;
    }

    // Start animation loop when time gates exist and not frozen
    let lastTime = performance.now();
    const CYCLE_DURATION_MS = 3000; // 3 seconds for full 0→1 cycle

    const animate = (currentTime: number) => {
      const deltaTime = currentTime - lastTime;
      lastTime = currentTime;

      // Skip if deltaTime is negative or too large (tab switch, etc.)
      if (deltaTime < 0 || deltaTime > 500) {
        animationRef.current = requestAnimationFrame(animate);
        return;
      }

      setTimeParameter(prev => {
        const newT = prev + deltaTime / CYCLE_DURATION_MS;
        // Clamp to [0, 1) and handle wrap-around
        if (newT >= 1) return newT % 1;
        if (newT < 0) return 0;
        return newT;
      });

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
    };
  }, [hasTimeGates, isFrozen]);

  // Hover handlers for InfoBox
  const handleGateHover = useCallback((gate: GateType | null, params?: GateParams) => {
    if (gate) {
      setHoverInfo({ type: 'gate', gate, params });
    } else {
      setHoverInfo({ type: 'none' });
    }
  }, []);

  const handleTemplateHover = useCallback((template: AlgorithmTemplate | null) => {
    if (template) {
      setHoverInfo({
        type: 'template',
        name: template.name,
        description: template.description,
        qubits: template.qubits,
        category: template.category
      });
    } else {
      setHoverInfo({ type: 'none' });
    }
  }, []);

  // Validate circuit whenever it changes
  useEffect(() => {
    const errors = validateCircuit(grid);
    setValidationErrors(errors);
  }, [grid]);

  // Auto-run circuit with 100ms debounce whenever grid changes and circuit is valid
  const lastGridRef = useRef<string>('');

  useEffect(() => {
    // For grid changes, use debounce
    const gridKey = JSON.stringify(grid.map(row => row.map(cell => cell.gate)));
    if (gridKey !== lastGridRef.current) {
      lastGridRef.current = gridKey;
      // Generate new measurement seed when grid changes
      measurementSeedRef.current = Date.now();
      const timeoutId = setTimeout(() => {
        // Only run if circuit is valid (no validation errors)
        const errors = validateCircuit(grid);
        if (errors.length === 0) {
          const result = runCircuitWithMeasurements(grid, timeParameter, measurementSeedRef.current);
          setFinalState(result.finalState);
          setMeasurements(result.measurements);
          setPopulatedRows(result.populatedRows);
          setStateHistory(result.stateHistory);
          setActiveColumns(result.activeColumns);
          setHasRun(true);
          // Reset step index if it exceeds new history length
          setStepIndex(prev => Math.min(prev, result.stateHistory.length - 1));
        }
      }, 100);
      return () => clearTimeout(timeoutId);
    }
  }, [grid, timeParameter]);

  // Separate effect for time parameter updates (no debounce when animating)
  // Uses cached measurement seed for stable results during animation
  useEffect(() => {
    if (!hasTimeGates) return;

    const errors = validateCircuit(grid);
    if (errors.length === 0) {
      // Use the cached seed so measurements don't change randomly during animation
      const result = runCircuitWithMeasurements(grid, timeParameter, measurementSeedRef.current);
      setFinalState(result.finalState);
      setMeasurements(result.measurements);
      setPopulatedRows(result.populatedRows);
      setStateHistory(result.stateHistory);
      setActiveColumns(result.activeColumns);
      setHasRun(true);
    }
  }, [timeParameter, hasTimeGates]);

  // Calculate display column count: max(rightmost populated column + 1, INITIAL_COLS)
  // After auto-run, wires shorten to rightmost populated column
  const displayColCount = React.useMemo(() => {
    let rightmostPopulated = -1;
    for (let c = grid[0].length - 1; c >= 0; c--) {
      if (grid.some(row => row[c]?.gate !== null)) {
        rightmostPopulated = c;
        break;
      }
    }
    return Math.max(rightmostPopulated + 1, INITIAL_COLS);
  }, [grid]);

  // Helper to check if a cell has a validation error
  const cellHasError = useCallback((row: number, col: number): boolean => {
    return validationErrors.some(err => err.column === col && err.row === row);
  }, [validationErrors]);

  // Clear circuit (always keeps 8 rows)
  const handleClear = useCallback(() => {
    pushState(
      Array(MAX_ROWS).fill(null).map((_, r) =>
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
    setStepIndex(0);
    setStateHistory([]);
    setActiveColumns([]);
    setIsPlaying(false);
  }, [pushState]);

  // Step mode handlers
  const handleStepModeToggle = useCallback(() => {
    // Cannot enable step mode if time gates are present or frozen
    if (hasTimeGates || isFrozen) return;

    setStepMode(prev => {
      if (prev) {
        // Turning off step mode - stop playing
        setIsPlaying(false);
      } else {
        // Turning on step mode - start at initial state
        setStepIndex(0);
      }
      return !prev;
    });
  }, [hasTimeGates, isFrozen]);

  const handleStepChange = useCallback((step: number) => {
    setStepIndex(Math.max(0, Math.min(step, stateHistory.length - 1)));
  }, [stateHistory.length]);

  const handleStepForward = useCallback(() => {
    setStepIndex(prev => Math.min(prev + 1, stateHistory.length - 1));
  }, [stateHistory.length]);

  const handleStepBack = useCallback(() => {
    setStepIndex(prev => Math.max(prev - 1, 0));
  }, []);

  const handlePlayPause = useCallback(() => {
    setIsPlaying(prev => {
      if (!prev && stepIndex >= stateHistory.length - 1) {
        // If at end and pressing play, restart from beginning
        setStepIndex(0);
      }
      return !prev;
    });
  }, [stepIndex, stateHistory.length]);

  // Auto-play effect for step mode
  useEffect(() => {
    if (!isPlaying || !stepMode) return;

    const interval = setInterval(() => {
      setStepIndex(prev => {
        if (prev >= stateHistory.length - 1) {
          setIsPlaying(false);
          return prev;
        }
        return prev + 1;
      });
    }, 500); // 500ms per step

    return () => clearInterval(interval);
  }, [isPlaying, stepMode, stateHistory.length]);

  // Compute display state based on step mode
  const displayState = React.useMemo(() => {
    if (!hasRun || !finalState) return null;
    if (stepMode && stateHistory.length > 0) {
      return stateHistory[stepIndex] ?? finalState;
    }
    return finalState;
  }, [hasRun, finalState, stepMode, stateHistory, stepIndex]);

  // Current column being highlighted in step mode
  const currentStepColumn = React.useMemo(() => {
    if (!stepMode || stepIndex === 0 || activeColumns.length === 0) return -1;
    return activeColumns[stepIndex - 1] ?? -1;
  }, [stepMode, stepIndex, activeColumns]);


  const handleDrop = useCallback((row: number, dropCol: number, type: GateType, params?: GateParams) => {
    pushState(prev => {
      const newGrid = prev.map(r => r.map(c => ({...c})));
      const totalRows = newGrid.length;

      // Check if this is a fixed 2x1 gate
      const isFixed2x1 = isAllFixed2x1Gate(type);

      // Check if this is a resizable spanning gate (REVERSE)
      const isResizableSpanning = isResizableSpanningGate(type);

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
  }, [pushState]);

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
    pushState(prev => {
      const newGrid = prev.map(r => r.map(c => ({...c})));
      const anchorCell = newGrid[anchorRow]?.[col];
      if (!anchorCell || !anchorCell.gate) return prev;

      // Check if this is a spanning gate
      if (!isSpanningGate(anchorCell.gate)) return prev;

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
  }, [pushState]);

  // Keyboard shortcuts for selection, navigation, and gate placement
  useKeyboardShortcuts({
    selectedCell,
    selectCell,
    clearSelection,
    maxRows: MAX_ROWS,
    displayColCount,
    grid,
    pushState,
    deleteSpanningGate,
  });

  // Save snapshot when drag starts (resizingGate becomes non-null)
  useEffect(() => {
    if (resizingGate) {
      saveSnapshot();
    }
  }, [resizingGate, saveSnapshot]);

  // Handle spanning gate resize mouse events
  useEffect(() => {
    if (!resizingGate) return;

    const handleMouseMove = (e: MouseEvent) => {
      const circuitContainer = document.getElementById('circuit-container');
      if (!circuitContainer) return;

      const rect = circuitContainer.getBoundingClientRect();
      // Account for padding (pt-4 = 16px + py-4 = 16px top)
      const relativeY = e.clientY - rect.top - 16 + circuitContainer.scrollTop;
      const targetRow = Math.floor(relativeY / ROW_HEIGHT);
      const clampedRow = Math.max(0, Math.min(targetRow, MAX_ROWS - 1));

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
      // Commit drag as single history entry before clearing state
      commitDrag();
      setResizingGate(null);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [resizingGate, updateSpanningGateSpan, commitDrag]);

  const handleDragOver = (e: React.DragEvent, row: number, col: number) => {
    e.preventDefault();

    // Check if dragging an algorithm template
    const isTemplate = e.dataTransfer.types.includes('algorithmtemplate');
    if (isTemplate) {
      e.dataTransfer.dropEffect = 'copy';
      setTemplateDragHover({ row, col });
      setDragHover(null);
      return;
    }

    // Use move if from circuit board, copy if from sidebar
    const sourceCellId = e.dataTransfer.types.includes('sourcecellid');
    e.dataTransfer.dropEffect = sourceCellId ? 'move' : 'copy';
    setDragHover({ row, col });
    setTemplateDragHover(null);
  };

  const handleDragLeave = () => {
    setDragHover(null);
    setTemplateDragHover(null);
  };

  const handleDropEvent = (e: React.DragEvent, row: number, col: number) => {
    e.preventDefault();
    setDragHover(null);
    setTemplateDragHover(null);

    // Check for algorithm template drop first
    const templateData = e.dataTransfer.getData('algorithmTemplate');
    if (templateData) {
      try {
        const template = JSON.parse(templateData) as AlgorithmTemplate;
        handleDropTemplate(template, row, col);
        return;
      } catch {
        // Ignore parse errors, fall through to gate handling
      }
    }

    const typeStr = e.dataTransfer.getData('gateType');
    if (!isValidGateType(typeStr)) return;
    const type = typeStr;

    const sourceCellId = e.dataTransfer.getData('sourceCellId');
    const paramsStr = e.dataTransfer.getData('gateParams');
    const existingParams = paramsStr ? JSON.parse(paramsStr) as GateParams : undefined;

    // If moving from another cell, combine clear-source + place-target atomically
    if (sourceCellId) {
      // Parse source cell id: "cell-{row}-{col}"
      const parts = sourceCellId.split('-');
      const sourceRow = parseInt(parts[1], 10);
      const sourceCol = parseInt(parts[2], 10);

      // Don't do anything if dropping on same cell
      if (sourceRow === row && sourceCol === col) return;

      // Atomic: clear source + place target in single pushState
      pushState(prev => {
        const newGrid = prev.map(r => r.map(c => ({...c})));
        const totalRows = newGrid.length;

        // Clear source cell
        newGrid[sourceRow][sourceCol].gate = null;
        newGrid[sourceRow][sourceCol].params = undefined;

        // Place target cell (same logic as handleDrop)
        const isFixed2x1 = isAllFixed2x1Gate(type);
        const isResizableSpanning = isResizableSpanningGate(type);

        if (isFixed2x1) {
          if (row + 1 >= totalRows) {
            // Not enough room - only clear source
            return newGrid;
          }

          const fixedSpan = { startRow: row, endRow: row + 1 };

          newGrid[row][col] = {
            ...newGrid[row][col],
            gate: type,
            params: { ...existingParams, reverseSpan: fixedSpan, isSpanContinuation: false }
          };
          newGrid[row + 1][col] = {
            ...newGrid[row + 1][col],
            gate: type,
            params: { ...existingParams, reverseSpan: fixedSpan, isSpanContinuation: true }
          };
        } else if (isResizableSpanning) {
          const reverseSpan = existingParams?.reverseSpan || { startRow: row, endRow: row };
          newGrid[row][col] = {
            ...newGrid[row][col],
            gate: type,
            params: { ...existingParams, reverseSpan, isSpanContinuation: false }
          };
        } else {
          newGrid[row][col] = {
            ...newGrid[row][col],
            gate: type,
            params: existingParams
          };
        }

        return newGrid;
      });
      return;
    }

    // Check if this is a parameterized gate (only prompt for new gates from sidebar)
    if (!existingParams && isParameterizedGate(type)) {
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

  // Handle dropping a template at a specific position
  const handleDropTemplate = useCallback((template: AlgorithmTemplate, dropRow: number, dropCol: number) => {
    const templateRows = template.qubits;
    const templateCols = template.grid[0]?.length ?? 0;

    // Check if template would exceed max rows
    const endRow = dropRow + templateRows - 1;
    if (endRow >= MAX_ROWS) {
      // Cannot place - would exceed max rows
      return;
    }

    // Calculate required grid size
    const requiredRows = dropRow + templateRows;
    const requiredCols = dropCol + templateCols;

    pushState(prev => {
      // Expand grid if needed
      let newGrid = prev.map(r => r.map(c => ({ ...c })));

      // Add rows if needed
      const currentRows = newGrid.length;
      if (requiredRows > currentRows) {
        const rowsToAdd = requiredRows - currentRows;
        const currentCols = newGrid[0]?.length ?? INITIAL_COLS;
        for (let i = 0; i < rowsToAdd; i++) {
          newGrid.push(
            Array(currentCols).fill(null).map((_, c) => ({
              gate: null,
              id: `cell-${currentRows + i}-${c}`,
            }))
          );
        }
      }

      // Add columns if needed
      const currentCols = newGrid[0]?.length ?? INITIAL_COLS;
      if (requiredCols > currentCols) {
        const colsToAdd = requiredCols - currentCols;
        newGrid = newGrid.map((row, rIdx) => [
          ...row,
          ...Array(colsToAdd).fill(null).map((_, i) => ({
            gate: null,
            id: `cell-${rIdx}-${currentCols + i}`,
          })),
        ]);
      }

      // Place template gates (only where template has gates, don't clear other cells)
      for (let r = 0; r < templateRows; r++) {
        for (let c = 0; c < templateCols; c++) {
          const templateCell = template.grid[r]?.[c];
          if (templateCell?.gate !== null) {
            const targetRow = dropRow + r;
            const targetCol = dropCol + c;

            // Update cell IDs and params for spanning gates
            let params = templateCell.params ? { ...templateCell.params } : undefined;
            if (params?.reverseSpan) {
              params = {
                ...params,
                reverseSpan: {
                  startRow: params.reverseSpan.startRow + dropRow,
                  endRow: params.reverseSpan.endRow + dropRow,
                },
              };
            }

            newGrid[targetRow][targetCol] = {
              gate: templateCell.gate,
              id: `cell-${targetRow}-${targetCol}`,
              params,
            };
          }
        }
      }

      return newGrid;
    });

    // Reset run state
    setHasRun(false);
    setFinalState(null);
    setMeasurements([]);
    setPopulatedRows([]);
  }, [pushState]);


  const clearCell = (row: number, col: number, e: React.MouseEvent) => {
    e.preventDefault();
    const cell = grid[row]?.[col];

    // If this is a spanning gate, delete the entire span
    if (cell?.gate && isSpanningGate(cell.gate)) {
      const span = cell.params?.reverseSpan;
      if (span) {
        deleteSpanningGate(col, span.startRow);
        return;
      }
    }

    pushState(prev => {
      const newGrid = prev.map(r => r.map(c => ({...c})));
      newGrid[row][col].gate = null;
      newGrid[row][col].params = undefined;
      return newGrid;
    });
  };

  // Helper to get styling for spanning gates based on type
  const getSpanningGateStyle = (gateType: GateType) => {
    // Input markers - dashed borders (A is white, others colored)
    if (isArithmeticInputGate(gateType)) {
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
    if (isArithmeticLilacGate(gateType)) {
      return {
        borderClass: 'border-purple-400',
        textClass: 'text-purple-300',
        hoverBgClass: 'bg-purple-400',
      };
    }
    // Dark blue - inc/dec, mul/div
    if (isArithmeticDarkBlueGate(gateType)) {
      return {
        borderClass: 'border-blue-600',
        textClass: 'text-blue-400',
        hoverBgClass: 'bg-blue-600',
      };
    }
    // Purple - QFT gates
    if (gateType === GateType.QFT || gateType === GateType.QFT_DG) {
      return {
        borderClass: 'border-purple-500',
        textClass: 'text-purple-400',
        hoverBgClass: 'bg-purple-500',
      };
    }
    // Phase Gradient - yellow
    if (gateType === GateType.PHASE_GRADIENT) {
      return {
        borderClass: 'border-yellow-400',
        textClass: 'text-yellow-400',
        hoverBgClass: 'bg-yellow-400',
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
  const renderSpanningGate = (col: number, gateType: GateType, span: { startRow: number; endRow: number }, hasError: boolean = false) => {
    const spanHeight = (span.endRow - span.startRow + 1) * ROW_HEIGHT;
    const isHovered = hoveredReverseGate?.col === col && hoveredReverseGate?.anchorRow === span.startRow;
    const style = getSpanningGateStyle(gateType);
    const gateDef = GATE_DEFS[gateType];
    const label = gateDef?.label || gateType;

    // Only REVERSE gate is resizable
    const isResizable = isResizableSpanningGate(gateType);

    // Error background class
    const errorBgClass = hasError ? 'bg-red-600' : 'bg-black';

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
          className={`absolute inset-2 border-2 ${style.borderClass} ${errorBgClass} flex items-center justify-center cursor-grab active:cursor-grabbing`}
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

    for (let r = 0; r < MAX_ROWS; r++) {
        const cell = grid[r][colIdx];
        const g = cell.gate;
        if (!g) continue;

        // Skip span continuations for arithmetic gates
        if (cell.params?.isSpanContinuation) continue;

        if (g === GateType.SWAP) swapRows.push(r);
        // All control-type gates (CONTROL, ANTI_CONTROL, X_CONTROL, etc.)
        if (isControlGate(g)) controlRows.push(r);
        // Target gates are anything that's not a control or swap
        if (g !== GateType.EMPTY && !isControlGate(g) && g !== GateType.SWAP) targetRows.push(r);

        // Collect arithmetic gate spans
        if (isAllFixed2x1Gate(g) && cell.params?.reverseSpan) {
          if (isArithmeticInputGate(g)) {
            inputSpans.push(cell.params.reverseSpan);
          } else {
            arithmeticSpans.push(cell.params.reverseSpan);
          }
        }
    }

    const lines: React.ReactNode[] = [];

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

  // Keyboard shortcuts for undo/redo
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Skip if input or dialog is focused
      const activeElement = document.activeElement;
      if (
        activeElement &&
        (activeElement.tagName === 'INPUT' ||
         activeElement.tagName === 'TEXTAREA' ||
         activeElement.getAttribute('role') === 'dialog' ||
         activeElement.closest('[role="dialog"]'))
      ) {
        return;
      }

      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const modifier = isMac ? e.metaKey : e.ctrlKey;

      if (modifier && e.key === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          redo();
        } else {
          undo();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo]);

  return (
    <div className="flex flex-col h-screen w-screen bg-black text-white overflow-hidden font-mono font-bold">

      {/* Header Bar */}
      <header className="h-16 border-b-2 border-white bg-black flex items-center px-6 justify-between shrink-0 z-20">
        <div className="flex items-center gap-6">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <h1 className="font-bold text-4xl tracking-tight">Qbit Weaver</h1>
          </div>

          {/* Freeze Button - freezes t animation */}
          <button
            onClick={() => setIsFrozen(prev => !prev)}
            disabled={stepMode || !hasTimeGates}
            className={`flex items-center gap-2 px-4 py-2 border-2 transition-colors text-base font-bold uppercase ${
              isFrozen
                ? 'bg-blue-600 border-blue-600 text-white'
                : stepMode || !hasTimeGates
                  ? 'border-white/30 text-white/30 cursor-not-allowed'
                  : 'border-white hover:bg-white hover:text-black'
            }`}
            title={stepMode ? 'Freeze unavailable in step mode' : !hasTimeGates ? 'No time-parameterized gates in circuit' : 'Freeze/unfreeze time parameter animation'}
          >
            <span>Freeze</span>
          </button>

          {/* Step Mode Toggle */}
          <button
            onClick={handleStepModeToggle}
            disabled={hasTimeGates || isFrozen || !hasRun || stateHistory.length <= 1}
            className={`flex items-center gap-2 px-4 py-2 border-2 transition-colors text-base font-bold uppercase ${
              stepMode
                ? 'bg-emerald-600 border-emerald-600 text-white'
                : hasTimeGates || isFrozen
                  ? 'border-white/30 text-white/30 cursor-not-allowed'
                  : hasRun && stateHistory.length > 1
                    ? 'border-white hover:bg-white hover:text-black'
                    : 'border-white/30 text-white/30 cursor-not-allowed'
            }`}
            title={hasTimeGates ? 'Step mode unavailable with time-parameterized gates' : isFrozen ? 'Unfreeze to enable step mode' : 'Toggle step-through simulation mode'}
          >
            <span>Step Mode</span>
          </button>

          {/* Time Parameter Display - shows when time gates exist */}
          {hasTimeGates && (
            <span className={`text-base font-bold uppercase ${isFrozen ? 'text-blue-400' : 'text-white'}`}>
              t = {timeParameter.toFixed(2)}
            </span>
          )}

          {/* Simulation Timeline - visible when step mode is active */}
          {stepMode && hasRun && stateHistory.length > 1 && (
            <SimulationTimeline
              totalSteps={stateHistory.length - 1}
              currentStep={stepIndex}
              onStepChange={handleStepChange}
              isPlaying={isPlaying}
              onPlayPause={handlePlayPause}
              onStepForward={handleStepForward}
              onStepBack={handleStepBack}
              activeColumns={activeColumns}
            />
          )}
        </div>

        <div className="flex items-center gap-4">
          {/* Undo Button */}
          <button
            onClick={undo}
            disabled={!canUndo}
            className={`flex items-center gap-2 px-4 py-2 border-2 transition-colors text-base font-bold uppercase ${
              canUndo
                ? 'border-white hover:bg-white hover:text-black'
                : 'border-white/30 text-white/30 cursor-not-allowed'
            }`}
            title="Undo (Ctrl+Z)"
          >
            <Undo2 size={20} />
            <span>Undo</span>
          </button>

          {/* Redo Button */}
          <button
            onClick={redo}
            disabled={!canRedo}
            className={`flex items-center gap-2 px-4 py-2 border-2 transition-colors text-base font-bold uppercase ${
              canRedo
                ? 'border-white hover:bg-white hover:text-black'
                : 'border-white/30 text-white/30 cursor-not-allowed'
            }`}
            title="Redo (Ctrl+Shift+Z)"
          >
            <Redo2 size={20} />
            <span>Redo</span>
          </button>

          {/* Clear Button - rightmost */}
          <button
            onClick={handleClear}
            className="flex items-center gap-2 px-5 py-2 border-2 border-white hover:bg-red-600 hover:border-red-600 hover:text-white transition-colors text-base font-bold uppercase"
          >
            <span>Clear</span>
          </button>
        </div>
      </header>

      {/* Main Layout - Circuit Area + Gate Library + Sidebar */}
      <div className="flex-1 flex min-h-0 overflow-hidden">

        {/* Left: Circuit Area + Gate Library */}
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">

          {/* Circuit Area - Scrollable, takes remaining space */}
          <section
            className="flex-1 relative bg-black overflow-auto min-h-0"
            onClick={(e) => {
              // Clear selection when clicking on the background (not on grid cells)
              // Check if the click was on an element with data-grid-cell or a child of one
              const target = e.target as HTMLElement;
              const clickedOnCell = target.closest('[data-grid-cell]');
              if (!clickedOnCell) {
                clearSelection();
              }
            }}
          >

            {/* Circuit Grid */}
            <div ref={circuitScrollRef} className="py-4 pl-4 pr-8 relative" id="circuit-container">
            {/* Circuit Wires and Gates */}
            <div className="relative inline-block min-w-full">
              {/* Column Connectors Layer */}
              <div className="absolute inset-0 pointer-events-none">
                {Array.from({ length: displayColCount }).map((_, c) => (
                  <div key={`col-conn-${c}`} className="absolute top-0 bottom-0" style={{ left: `${c * CELL_WIDTH + 48}px`, width: CELL_WIDTH }}>
                    {renderColumnConnectors(c)}
                  </div>
                ))}
              </div>

              {/* Qubit Rows and Amplitude Grid Container */}
              <div className="pt-4 flex items-start">
                {/* Qubit Rows */}
                <div>
                {grid.map((row, rIdx) => {
                  // Display columns based on computed displayColCount
                  const displayCols = row.slice(0, displayColCount);
                  const rowDisplayColCount = displayCols.length;

                  // Get Bloch vector for this row (post-run only)
                  const filteredIdx = populatedRows.indexOf(rIdx);
                  const isPopulated = filteredIdx !== -1;
                  const [bx, by, bz] = (hasRun && displayState && isPopulated)
                    ? getBlochVector(displayState, filteredIdx, populatedRows.length)
                    : [0, 0, 1];
                  // Clamp bz to [-1, 1] to handle floating point errors
                  const bzClamped = Math.max(-1, Math.min(1, bz));
                  const prob1Raw = hasRun ? ((1 - bzClamped) / 2 * 100) : 0;
                  const prob1Rounded = Math.round(prob1Raw);
                  const prob1Pct = (prob1Rounded <= 0) ? '0' : prob1Rounded.toString();

                  return (
                    <div key={`row-${rIdx}`} className="flex items-center group relative" style={{ height: ROW_HEIGHT }}>
                      {/* Qubit Label */}
                      <div className="w-12 text-left font-mono font-bold text-sm text-white select-none">
                        |q{rIdx}⟩
                      </div>

                      {/* Wire and Gates */}
                      <div className="relative flex items-center">
                        {/* Wire Line - spans only the gate cells */}
                        <div
                          className="absolute top-1/2 left-0 h-0.5 bg-white pointer-events-none"
                          style={{
                            width: rowDisplayColCount * CELL_WIDTH,
                            transform: 'translateY(-50%)'
                          }}
                        />

                        {/* Gate Cells */}
                        <div className="flex relative z-10">
                          {displayCols.map((cell, cIdx) => {
                            const isRowHighlighted = dragHover?.row === rIdx;
                            const isColHighlighted = dragHover?.col === cIdx;
                            const isHovered = isRowHighlighted && isColHighlighted;

                            // Template highlight: check if this cell is within the template drop area
                            // Uses actual populated dimensions (not full grid size)
                            // Anchor cell (top-left) is full yellow, rest is light yellow
                            let isTemplateAnchor = false;
                            let isInTemplateArea = false;
                            let isTemplateInvalid = false;
                            if (templateDragHover && draggingTemplate) {
                              const dims = getTemplatePopulatedDimensions(draggingTemplate);
                              const startRow = templateDragHover.row;
                              const startCol = templateDragHover.col;
                              const endRow = startRow + dims.rows - 1;
                              const endCol = startCol + dims.cols - 1;

                              isTemplateAnchor = rIdx === startRow && cIdx === startCol;
                              isInTemplateArea = rIdx >= startRow && rIdx <= endRow && cIdx >= startCol && cIdx <= endCol;
                              // Check if template would exceed max rows
                              isTemplateInvalid = endRow >= MAX_ROWS;
                            }

                            // Check if this cell is selected
                            const isCellSelected = isSelected(rIdx, cIdx);

                            // Step mode column highlighting
                            const isStepColumn = stepMode && cIdx === currentStepColumn;

                            return (
                              <div
                                key={cell.id}
                                data-grid-cell
                                onClick={(e) => {
                                  e.stopPropagation();
                                  selectCell(rIdx, cIdx);
                                }}
                                onDragOver={(e) => handleDragOver(e, rIdx, cIdx)}
                                onDragLeave={handleDragLeave}
                                onDrop={(e) => handleDropEvent(e, rIdx, cIdx)}
                                onContextMenu={(e) => clearCell(rIdx, cIdx, e)}
                                className={`flex items-center justify-center relative transition-all duration-200 border-r border-white/35 cursor-pointer ${
                                  isCellSelected
                                    ? 'ring-2 ring-cyan-400 ring-inset'
                                    : ''
                                } ${
                                  isStepColumn
                                    ? 'bg-emerald-500/30'
                                    : isInTemplateArea
                                      ? (isTemplateInvalid
                                          ? 'bg-red-500/30'
                                          : isTemplateAnchor
                                            ? 'bg-yellow-400/60'
                                            : 'bg-yellow-400/30')
                                      : isHovered
                                        ? 'bg-white/20'
                                        : (isRowHighlighted || isColHighlighted)
                                          ? 'bg-white/10'
                                          : ''
                                }`}
                                style={{ height: ROW_HEIGHT, width: CELL_WIDTH }}
                              >
                                {/* Regular gates (non-spanning) */}
                                {cell.gate && !isSpanningGate(cell.gate) && (
                                  <Gate type={cell.gate} onHover={handleGateHover} params={cell.params} cellId={cell.id} hasError={cellHasError(rIdx, cIdx)} />
                                )}
                                {/* Render spanning gate anchor (REVERSE, arithmetic spanning, input markers) */}
                                {cell.gate && isSpanningGate(cell.gate) && !cell.params?.isSpanContinuation && cell.params?.reverseSpan && (
                                  renderSpanningGate(cIdx, cell.gate, cell.params.reverseSpan, cellHasError(rIdx, cIdx))
                                )}
                              </div>
                            );
                          })}
                        </div>

                        {/* Extension drop zone - between wire end and output */}
                        <div
                          onDragOver={(e) => {
                            e.preventDefault();
                            // Check if dragging an algorithm template
                            const isTemplate = e.dataTransfer.types.includes('algorithmtemplate');
                            e.dataTransfer.dropEffect = 'copy';

                            if (isTemplate && draggingTemplate) {
                              // For templates, set hover state at the extension column
                              setTemplateDragHover({ row: rIdx, col: displayColCount });
                              setDragHover(null);
                            } else {
                              // For single gates, show hover on extension zone
                              setDragHover({ row: rIdx, col: displayColCount });
                              setTemplateDragHover(null);
                            }
                          }}
                          onDragLeave={handleDragLeave}
                          onDrop={(e: React.DragEvent) => {
                            e.preventDefault();
                            setDragHover(null);
                            setTemplateDragHover(null);

                            // Check for algorithm template drop first
                            const templateData = e.dataTransfer.getData('algorithmTemplate');
                            if (templateData) {
                              try {
                                const template = JSON.parse(templateData) as AlgorithmTemplate;
                                const dims = getTemplatePopulatedDimensions(template);

                                // Check if template would exceed max rows
                                if (rIdx + dims.rows > MAX_ROWS) {
                                  return; // Can't place - would exceed rows
                                }

                                // Add columns needed for template, then drop
                                const dropCol = displayColCount;
                                const colsNeeded = dims.cols;

                                // Expand grid first
                                setGrid((prev: CircuitGrid) => {
                                  const currentCols = prev[0]?.length ?? INITIAL_COLS;
                                  const requiredCols = dropCol + colsNeeded;
                                  if (requiredCols <= currentCols) return prev;

                                  const colsToAdd = requiredCols - currentCols;
                                  return prev.map((row, rowIdx: number) => [
                                    ...row,
                                    ...Array(colsToAdd).fill(null).map((_, i) => ({
                                      gate: null,
                                      id: `cell-${rowIdx}-${currentCols + i}`,
                                    })),
                                  ]);
                                });

                                // Then drop template (handleDropTemplate will expand if needed)
                                setTimeout(() => handleDropTemplate(template, rIdx, dropCol), 0);
                                return;
                              } catch {
                                // Ignore parse errors
                              }
                            }

                            // Handle single gate drop
                            const typeStr = e.dataTransfer.getData('gateType');
                            if (!isValidGateType(typeStr)) return;
                            const type = typeStr;

                            // Check 2x1 gate row constraint
                            const isFixed2x1 = isAllFixed2x1Gate(type);
                            if (isFixed2x1 && rIdx + 1 >= MAX_ROWS) {
                              return; // Can't place 2x1 gate on row 7
                            }

                            const paramsStr = e.dataTransfer.getData('gateParams');
                            const existingParams = paramsStr ? JSON.parse(paramsStr) as GateParams : undefined;

                            // Add one column and drop the gate
                            const dropCol = displayColCount;
                            setGrid((prev: CircuitGrid) => {
                              const currentCols = prev[0]?.length ?? INITIAL_COLS;
                              if (dropCol < currentCols) return prev;

                              return prev.map((row, rowIdx: number) => [
                                ...row,
                                { gate: null, id: `cell-${rowIdx}-${currentCols}` }
                              ]);
                            });

                            // Drop the gate after grid expansion
                            setTimeout(() => {
                              if (isParameterizedGate(type) && !existingParams) {
                                const rect = (e.target as HTMLElement).getBoundingClientRect();
                                setPendingAngle({
                                  row: rIdx,
                                  col: dropCol,
                                  type,
                                  position: { x: rect.left, y: rect.bottom + 8 }
                                });
                              } else {
                                handleDrop(rIdx, dropCol, type, existingParams);
                              }
                            }, 0);
                          }}
                          className={`shrink-0 transition-colors ${
                            dragHover?.col === displayColCount && dragHover?.row === rIdx
                              ? 'bg-white/20'
                              : templateDragHover?.col === displayColCount && draggingTemplate
                                ? (() => {
                                    const dims = getTemplatePopulatedDimensions(draggingTemplate);
                                    const isInArea = rIdx >= templateDragHover.row && rIdx < templateDragHover.row + dims.rows;
                                    const isAnchor = rIdx === templateDragHover.row;
                                    const isInvalid = templateDragHover.row + dims.rows > MAX_ROWS;
                                    if (!isInArea) return '';
                                    if (isInvalid) return 'bg-red-500/30';
                                    return isAnchor ? 'bg-yellow-400/60' : 'bg-yellow-400/30';
                                  })()
                                : ''
                          }`}
                          style={{ width: CELL_WIDTH, height: ROW_HEIGHT }}
                        />

                        {/* Post-run: Percentage box + Bloch Sphere + Grid */}
                        {hasRun && (
                          <div className="flex items-center ml-4 gap-4">
                            {/* Percentage of |1⟩ in a box with green fill from bottom */}
                            <div
                              className="border-2 border-white/30 flex items-center justify-center font-bold text-white relative overflow-hidden cursor-pointer"
                              style={{ width: GRID_CELL_SIZE, height: GRID_CELL_SIZE }}
                              onMouseEnter={() => setHoverInfo({ type: 'percentage', qubit: rIdx, probability: parseFloat(prob1Pct) })}
                              onMouseLeave={() => setHoverInfo({ type: 'none' })}
                            >
                              {/* Emerald fill from bottom based on percentage */}
                              <div
                                className="absolute bottom-0 left-0 right-0 bg-emerald-600"
                                style={{ height: `${prob1Pct}%` }}
                              />
                              {/* Black background for unfilled portion */}
                              <div className="absolute inset-0 bg-black" style={{ bottom: `${prob1Pct}%`, top: 0 }} />
                              <span className="text-lg relative z-10">{prob1Pct}%</span>
                            </div>
                            {/* Bloch Sphere */}
                            <BlochSphere
                              x={bx} y={by} z={bz}
                              size={GRID_CELL_SIZE - 8}
                              row={rIdx}
                              col={-1}
                              onHover={setHoverInfo}
                            />
                          </div>
                        )}

                      </div>
                    </div>
                  );
                })}
                </div>

                {/* Amplitude Grid - fixed position to the right of rows */}
                {hasRun && displayState && populatedRows.length > 0 && (
                  <div className="ml-4 transition-opacity duration-200">
                    <AmplitudeGrid
                      amplitudes={displayState}
                      numQubits={populatedRows.length}
                      maxHeight={MAX_ROWS * ROW_HEIGHT}
                      rowHeight={ROW_HEIGHT}
                      onHover={setHoverInfo}
                    />
                  </div>
                )}

                {/* Measurement Panel - to the right of amplitude grid */}
                {hasRun && measurements.length > 0 && (
                  <MeasurementPanel
                    measurements={measurements}
                    numRows={MAX_ROWS}
                    rowHeight={ROW_HEIGHT}
                  />
                )}
              </div>
            </div>

            </div>
          </section>

          {/* Gate Library - Bottom of left column */}
          <GateLibrary
            onHoverGate={handleGateHover}
            customGates={customGates}
            onAddCustomGate={handleAddCustomGate}
          />
        </div>

        {/* Right: Algorithm Templates Sidebar + InfoBox */}
        <div className="flex flex-col shrink-0" style={{ width: 340 }}>
          <AlgorithmSidebar
            onHoverTemplate={handleTemplateHover}
            onDragStart={setDraggingTemplate}
            onDragEnd={() => {
              setDraggingTemplate(null);
              setTemplateDragHover(null);
            }}
          />

          {/* Info Box - Bottom of right column */}
          <InfoBox info={hoverInfo} />
        </div>

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
