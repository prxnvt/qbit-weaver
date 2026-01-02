import React, { useState, useMemo, useCallback } from 'react';
import { GateType, CircuitGrid } from './types';
import { INITIAL_ROWS, INITIAL_COLS, MAX_ROWS } from './constants';
import { Sidebar } from './components/Sidebar';
import { Gate } from './components/Gate';
import { BlochSphere } from './components/BlochSphere';
import { simulateCircuit, getBlochVector } from './utils/quantum';

const App: React.FC = () => {
  const [rows, setRows] = useState(INITIAL_ROWS);
  const [hoveredGate, setHoveredGate] = useState<GateType | null>(null);
  const [hoveredInfo, setHoveredInfo] = useState<string | null>(null);
  
  const [grid, setGrid] = useState<CircuitGrid>(() => {
    return Array(INITIAL_ROWS).fill(null).map((_, r) => 
      Array(INITIAL_COLS).fill(null).map((_, c) => ({
        gate: null,
        id: `cell-${r}-${c}`
      }))
    );
  });

  const simulationHistory = useMemo(() => {
    return simulateCircuit(grid);
  }, [grid]);

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

  const handleDrop = useCallback((row: number, dropCol: number, type: GateType) => {
    setGrid(prev => {
      const newGrid = prev.map(r => r.map(c => ({...c})));
      
      // Logic: If gate is NOT SWAP/CONTROL/CX/CZ (Fixed pos), slide to leftmost empty
      const isFixed = [GateType.SWAP, GateType.CONTROL, GateType.CX, GateType.CZ].includes(type);
      
      let finalCol = dropCol;
      if (!isFixed) {
          // Find first empty slot in this row from left
          for (let c = 0; c <= dropCol; c++) {
              if (newGrid[row][c].gate === null || newGrid[row][c].gate === GateType.EMPTY) {
                  finalCol = c;
                  break;
              }
          }
      }

      newGrid[row][finalCol] = {
        ...newGrid[row][finalCol],
        gate: type
      };
      return newGrid;
    });
  }, []);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  };

  const handleDropEvent = (e: React.DragEvent, row: number, col: number) => {
    e.preventDefault();
    const type = e.dataTransfer.getData('gateType') as GateType;
    if (type) {
      handleDrop(row, col, type);
    }
  };

  const clearCell = (row: number, col: number, e: React.MouseEvent) => {
    e.preventDefault();
    setGrid(prev => {
      const newGrid = prev.map(r => r.map(c => ({...c})));
      newGrid[row][col].gate = null;
      return newGrid;
    });
  };

  const finalState = simulationHistory[simulationHistory.length - 1];

  // Helper to draw connector lines in a column
  const renderColumnConnectors = (colIdx: number) => {
    // 1. Check for SWAPs
    const swapRows: number[] = [];
    const controlRows: number[] = [];
    const targetRows: number[] = [];

    for (let r = 0; r < rows; r++) {
        const g = grid[r][colIdx].gate;
        if (g === GateType.SWAP) swapRows.push(r);
        if (g === GateType.CONTROL) controlRows.push(r);
        if (g && g !== GateType.EMPTY && g !== GateType.CONTROL && g !== GateType.SWAP) targetRows.push(r);
    }

    // Connect SWAPs
    const lines = [];
    // SWAP lines
    for (let i = 0; i < swapRows.length - 1; i += 2) {
        const start = swapRows[i];
        const end = swapRows[i+1];
        // Height: (end - start) * 48px (row height h-12)
        // Top: start * 48px + 24px (center)
        lines.push(
             <div 
                key={`line-swap-${colIdx}-${i}`}
                className="absolute w-px bg-white z-0 pointer-events-none"
                style={{
                    left: '50%',
                    top: `${start * 48 + 24}px`,
                    height: `${(end - start) * 48}px`
                }}
             />
        );
    }

    // Control Lines
    if (controlRows.length > 0 && targetRows.length > 0) {
        // Connect min(control, target) to max(control, target)
        const allActive = [...controlRows, ...targetRows];
        const minR = Math.min(...allActive);
        const maxR = Math.max(...allActive);
        
        lines.push(
            <div 
                key={`line-ctrl-${colIdx}`}
                className="absolute w-px bg-white z-0 pointer-events-none"
                style={{
                    left: '50%',
                    top: `${minR * 48 + 24}px`,
                    height: `${(maxR - minR) * 48}px`
                }}
             />
        );
    }
    
    return lines;
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-black text-white overflow-hidden font-mono">
      
      {/* Main Layout: Circuit (Scrolls) | Bloch (Fixed) */}
      <div className="flex-1 flex flex-row overflow-hidden relative">
        
        {/* Circuit Scrollable Area */}
        <div className="flex-1 overflow-x-auto overflow-y-hidden relative flex flex-col">
            
            <div className="flex-1 p-8 min-w-max relative">
                
                {/* Wires Background - Full Width of Scroll Area */}
                <div className="absolute inset-0 pointer-events-none p-8 z-0">
                    {Array.from({ length: rows }).map((_, r) => (
                        <div key={`wire-${r}`} className="absolute w-full h-px bg-neutral-800" style={{ top: `${32 + r * 48 + 24}px`, left: 0 }}></div>
                    ))}
                </div>

                {/* Grid */}
                <div className="flex flex-col relative">
                     {/* Column Layers for Connectors */}
                     <div className="absolute inset-0 pointer-events-none">
                        {Array.from({ length: INITIAL_COLS }).map((_, c) => (
                             <div key={`col-conn-${c}`} className="absolute top-0 bottom-0 w-16" style={{ left: `${c * 64 + 48}px` }}>
                                 {renderColumnConnectors(c)}
                             </div>
                        ))}
                     </div>

                    {grid.map((row, rIdx) => (
                        <div key={`row-${rIdx}`} className="flex h-12 items-center relative z-10">
                            {/* Label */}
                            <div className="w-12 flex-none flex items-center justify-center text-gray-500 font-bold text-xs">
                                |q{rIdx}⟩
                            </div>

                            {/* Cells */}
                            {row.map((cell, cIdx) => (
                                <div
                                    key={cell.id}
                                    onDragOver={handleDragOver}
                                    onDrop={(e) => handleDropEvent(e, rIdx, cIdx)}
                                    onContextMenu={(e) => clearCell(rIdx, cIdx, e)}
                                    className="w-16 h-12 flex-none flex items-center justify-center relative group"
                                >
                                    <div className="absolute inset-1 border border-transparent group-hover:border-neutral-800 rounded opacity-50 pointer-events-none"></div>
                                    {cell.gate && (
                                        <Gate type={cell.gate} onHover={setHoveredGate} />
                                    )}
                                </div>
                            ))}
                            
                            {/* Spacer to push width if needed */}
                            <div className="w-8"></div>
                        </div>
                    ))}
                </div>
            </div>
            
            {/* Controls */}
            <div className="p-8 pt-0 sticky left-0">
               <button 
                onClick={handleAddRow}
                disabled={rows >= MAX_ROWS}
                className="flex items-center gap-2 px-3 py-2 text-neutral-500 hover:text-white transition-colors text-xs uppercase tracking-widest font-bold border border-neutral-800 hover:border-neutral-600"
              >
                <span>+ Add Wire</span>
              </button>
            </div>
        </div>

        {/* Bloch Sphere Visualization (Fixed Right Column) */}
        <div className="w-40 flex-none bg-black border-l border-neutral-800 z-20 flex flex-col pt-8 pb-8 relative shadow-2xl">
            {/* Visual Header */}
             <div className="absolute top-2 left-0 right-0 text-center text-[10px] text-neutral-600 uppercase tracking-widest">
                State
             </div>
             
             <div className="flex flex-col">
                {Array.from({ length: rows }).map((_, rIdx) => {
                     const [bx, by, bz] = getBlochVector(finalState, rIdx, rows);
                     return (
                         <div key={`bloch-final-${rIdx}`} className="h-12 flex items-center justify-center relative group">
                             {/* REMOVED EXTRA CONNECTOR LINES HERE */}
                             <div className="absolute left-0 top-1/2 w-4 h-px bg-neutral-800"></div> {/* Internal wire connecting to sphere */}

                             <BlochSphere 
                                x={bx} y={by} z={bz} 
                                size={36} 
                                row={rIdx} 
                                col={-1} 
                                onHover={setHoveredInfo}
                             />
                         </div>
                     );
                })}
             </div>
        </div>
      </div>

      {/* Bottom Sidebar */}
      <Sidebar onHoverGate={setHoveredGate} />
    </div>
  );
};

export default App;