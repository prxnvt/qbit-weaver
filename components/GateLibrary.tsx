import React, { useState, useEffect, useMemo, useRef } from 'react';
import { GateType, CustomGateDefinition, GateParams, Complex } from '../types';
import { GATE_DEFS } from '../constants';
import { Gate } from './Gate';
import { Input } from './ui/input';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';

// Fixed height for the Gate Library bottom pane (in pixels)
// 4 gate rows × 44px + header ~28px + padding 48px = ~256px + 34px adjustment
const GATE_LIBRARY_HEIGHT = 290;

// Format a complex number for display
const formatComplex = (c: Complex): string => {
  const re = c.re;
  const im = c.im;
  if (Math.abs(im) < 1e-10) return re.toFixed(2).replace(/\.00$/, '');
  if (Math.abs(re) < 1e-10) return im === 1 ? 'i' : im === -1 ? '-i' : `${im.toFixed(2)}i`;
  const sign = im >= 0 ? '+' : '';
  return `${re.toFixed(2)}${sign}${im.toFixed(2)}i`;
};

// Format matrix for tooltip display
const formatMatrix = (matrix: Complex[][]): React.ReactNode => {
  if (!matrix || matrix.length === 0) return null;
  return (
    <div className="font-mono text-xs leading-relaxed">
      {matrix.map((row, i) => (
        <div key={i} className="flex gap-3 py-0.5">
          {row.map((cell, j) => (
            <span key={j} className="w-14 text-right">{formatComplex(cell)}</span>
          ))}
        </div>
      ))}
    </div>
  );
};

// Tooltip content for a gate
const GateTooltipContent: React.FC<{ type: GateType }> = ({ type }) => {
  const def = GATE_DEFS[type];
  if (!def) return null;

  return (
    <div className="max-w-sm py-1">
      <div className="font-bold text-base mb-2">{def.fullName}</div>
      {def.description && (
        <div className="text-sm text-white/80 mb-3 leading-relaxed">{def.description}</div>
      )}
      {def.matrix && def.matrix.length > 0 && (
        <div className="border-t border-white/20 pt-3">
          {formatMatrix(def.matrix)}
        </div>
      )}
    </div>
  );
};

interface GateLibraryProps {
  onHoverGate: (type: GateType | null, params?: GateParams) => void;
  customGates: CustomGateDefinition[];
  onAddCustomGate: () => void;
}

// Sub-library categories
type SubLibrary = 'Standard' | 'Formulaic' | 'Arithmetic' | 'Visualization' | 'Custom';

const SUB_LIBRARIES: SubLibrary[] = ['Standard', 'Formulaic', 'Arithmetic', 'Visualization', 'Custom'];

// Formulaic sub-library gates (parameterized gates that prompt for angle):
// Col 1: RX, RY, RZ
const FORMULAIC_GATE_COLUMNS: GateType[][] = [
  [GateType.RX, GateType.RY, GateType.RZ],
];

// Standard sub-library gates (merged with Advanced):
// Col 1: X, Y, Z, H
// Col 2: CTRL, ANTI-CTRL, CNOT, CCX
// Col 3: SWAP, MEASURE
// Col 4: Rv, T, CZ
// Col 5: S, √Y, √X
// Col 6: S†, √Y†, √X†
// Col 7: RX(π/2), RX(π/4), RX(π/8), RX(π/12)
// Col 8: RY(π/2), RY(π/4), RY(π/8), RY(π/12)
// Col 9: RZ(π/2), RZ(π/4), RZ(π/8), RZ(π/12)
// Col 10: XC, XA, YC, YA
const STANDARD_GATE_COLUMNS: GateType[][] = [
  [GateType.X, GateType.Y, GateType.Z, GateType.H],
  [GateType.CONTROL, GateType.ANTI_CONTROL, GateType.CX, GateType.CCX],
  [GateType.SWAP, GateType.MEASURE],
  [GateType.REVERSE, GateType.T, GateType.CZ],
  [GateType.S, GateType.SQRT_Y, GateType.SQRT_X],
  [GateType.SDG, GateType.SQRT_Y_DG, GateType.SQRT_X_DG],
  [GateType.RX_PI_2, GateType.RX_PI_4, GateType.RX_PI_8, GateType.RX_PI_12],
  [GateType.RY_PI_2, GateType.RY_PI_4, GateType.RY_PI_8, GateType.RY_PI_12],
  [GateType.RZ_PI_2, GateType.RZ_PI_4, GateType.RZ_PI_8, GateType.RZ_PI_12],
  [GateType.X_CONTROL, GateType.X_ANTI_CONTROL, GateType.Y_CONTROL, GateType.Y_ANTI_CONTROL],
];

// Arithmetic sub-library gates (max 4 per column):
// Col 1: +1, -1, +A, -A (increment/decrement - dark blue)
// Col 2: ×A, ÷A, ×B, ÷B (multiply/divide - dark blue)
// Col 3: A<B, A≤B, A>B, A≥B (inequalities - violet)
// Col 4: A=B, A≠B, +1%R, -1%R (mixed: equalities violet + inc mod lilac)
// Col 5: +A%R, -A%R, ×A%R, ÷A%R (modular arithmetic on A - lilac)
// Col 6: ×i, ×-i, ×√i, ×√-i (imaginary scalars - pink)
// Col 7: inputB, inputR, inputA (input markers - A is white dotted, last)
const ARITHMETIC_GATE_COLUMNS: GateType[][] = [
  [GateType.INC, GateType.DEC, GateType.ADD_A, GateType.SUB_A],
  [GateType.MUL_A, GateType.DIV_A, GateType.MUL_B, GateType.DIV_B],
  [GateType.A_LT_B, GateType.A_LEQ_B, GateType.A_GT_B, GateType.A_GEQ_B],
  [GateType.A_EQ_B, GateType.A_NEQ_B, GateType.INC_MOD_R, GateType.DEC_MOD_R],
  [GateType.ADD_A_MOD_R, GateType.SUB_A_MOD_R, GateType.MUL_A_MOD_R, GateType.DIV_A_MOD_R],
  [GateType.SCALE_I, GateType.SCALE_NEG_I, GateType.SCALE_SQRT_I, GateType.SCALE_SQRT_NEG_I],
  [GateType.INPUT_B, GateType.INPUT_R, GateType.INPUT_A],
];

export const GateLibrary: React.FC<GateLibraryProps> = ({ onHoverGate, customGates, onAddCustomGate }) => {
  const [activeSubLibrary, setActiveSubLibrary] = useState<SubLibrary>('Standard');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Debounce search query (150ms)
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(searchQuery), 150);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Handle Escape key to clear search (with stopPropagation to prevent A2 selection clear)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && searchQuery) {
        e.stopPropagation();
        setSearchQuery('');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [searchQuery]);

  // Collect all gates from all sub-libraries
  const allGates = useMemo(() => [
    ...STANDARD_GATE_COLUMNS.flat(),
    ...FORMULAIC_GATE_COLUMNS.flat(),
    ...ARITHMETIC_GATE_COLUMNS.flat(),
  ].filter(Boolean), []);

  // Search results - filter gates by query
  const searchResults = useMemo(() => {
    if (!debouncedQuery.trim()) return null;
    const q = debouncedQuery.toLowerCase();
    return allGates.filter(type => {
      const def = GATE_DEFS[type];
      return def?.fullName?.toLowerCase().includes(q) ||
             def?.label?.toLowerCase().includes(q) ||
             def?.description?.toLowerCase().includes(q);
    });
  }, [debouncedQuery, allGates]);

  const isSearching = searchResults !== null;

  const renderGateColumns = (columns: GateType[][]) => (
    <div className="flex gap-4">
      {columns.map((column, colIdx) => (
        <div key={colIdx} className="flex flex-col gap-1">
          {column.map((type) => (
            <Tooltip key={type} delayDuration={300}>
              <TooltipTrigger asChild>
                <div
                  className="flex items-center gap-2 group cursor-grab active:cursor-grabbing py-0.5 hover:bg-white/10 transition-colors"
                >
                  <Gate type={type} onHover={onHoverGate} isGateLibrary />
                  <span className="text-base font-bold text-white uppercase truncate">
                    {GATE_DEFS[type]?.fullName || type}
                  </span>
                </div>
              </TooltipTrigger>
              <TooltipContent side="top" className="bg-zinc-900 border-zinc-700 text-white">
                <GateTooltipContent type={type} />
              </TooltipContent>
            </Tooltip>
          ))}
        </div>
      ))}
    </div>
  );

  const renderCustomGates = () => (
    <div className="flex gap-4">
      {/* Add Custom Gate Button */}
      <div className="flex flex-col gap-1">
        <div
          onClick={onAddCustomGate}
          className="flex items-center gap-2 py-0.5 hover:bg-purple-500/20 transition-colors cursor-pointer"
        >
          <div className="w-10 h-10 border-2 border-dashed border-purple-500 flex items-center justify-center text-purple-400 font-bold text-base">
            +
          </div>
          <span className="text-base font-bold text-purple-400 uppercase">
            Custom
          </span>
        </div>

        {/* Custom gates from library */}
        {customGates.slice(0, 3).map((customGate) => (
          <div
            key={customGate.label}
            className="flex items-center gap-2 group cursor-grab active:cursor-grabbing py-0.5 hover:bg-white/10 transition-colors"
          >
            <Gate
              type={GateType.CUSTOM}
              onHover={onHoverGate}
              params={{ customLabel: customGate.label, customMatrix: customGate.matrix }}
              isGateLibrary
            />
            <span className="text-base font-bold text-purple-400 uppercase truncate">
              {customGate.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );

  const renderEmptySubLibrary = () => (
    <div className="flex items-center justify-center h-32 text-white/50 text-sm">
      No gates available
    </div>
  );

  const renderSearchResults = () => {
    if (!searchResults || searchResults.length === 0) {
      return (
        <div className="flex items-center justify-center h-32 text-white/50 text-sm">
          No gates found
        </div>
      );
    }

    // Group search results into columns of 4 for consistent layout
    const columns: GateType[][] = [];
    for (let i = 0; i < searchResults.length; i += 4) {
      columns.push(searchResults.slice(i, i + 4));
    }

    return (
      <div className="flex gap-4">
        {columns.map((column, colIdx) => (
          <div key={colIdx} className="flex flex-col gap-1">
            {column.map((type) => (
              <Tooltip key={type} delayDuration={300}>
                <TooltipTrigger asChild>
                  <div
                    className="flex items-center gap-2 group cursor-grab active:cursor-grabbing py-0.5 hover:bg-white/10 transition-colors"
                  >
                    <Gate type={type} onHover={onHoverGate} isGateLibrary />
                    <span className="text-xs font-bold text-white uppercase truncate">
                      {GATE_DEFS[type]?.fullName || type}
                    </span>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="top" className="bg-zinc-900 border-zinc-700 text-white">
                  <GateTooltipContent type={type} />
                </TooltipContent>
              </Tooltip>
            ))}
          </div>
        ))}
      </div>
    );
  };

  const renderSubLibraryContent = () => {
    switch (activeSubLibrary) {
      case 'Standard':
        return renderGateColumns(STANDARD_GATE_COLUMNS);
      case 'Formulaic':
        return renderGateColumns(FORMULAIC_GATE_COLUMNS);
      case 'Arithmetic':
        return renderGateColumns(ARITHMETIC_GATE_COLUMNS);
      case 'Custom':
        return renderCustomGates();
      default:
        return renderEmptySubLibrary();
    }
  };

  return (
    <TooltipProvider>
      <div
        className="border-t-2 border-white bg-black px-4 pt-3 pb-6 z-10"
        style={{ height: GATE_LIBRARY_HEIGHT, minHeight: GATE_LIBRARY_HEIGHT, flexShrink: 0 }}
      >
        {/* Header row: Title and Search */}
        <div className="flex items-center gap-4 mb-3">
          <span className="text-lg font-bold text-white uppercase shrink-0 tracking-tight">
            Gate Library
          </span>
          <div className="relative max-w-xs">
            <Input
              ref={searchInputRef}
              type="text"
              placeholder="Search gates..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-7 bg-black border-white text-white placeholder:text-white/50 text-xs pr-7"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-white/70 hover:text-white text-xs font-bold"
                aria-label="Clear search"
              >
                X
              </button>
            )}
          </div>
        </div>

        {/* Sub-library toggle buttons (hidden when searching) */}
        {!isSearching && (
          <div className="flex gap-1 mb-3">
            {SUB_LIBRARIES.map((lib) => (
              <button
                key={lib}
                onClick={() => setActiveSubLibrary(lib)}
                className={`px-2 py-1 text-base font-bold uppercase transition-colors ${
                  activeSubLibrary === lib
                    ? 'bg-white text-black'
                    : 'text-white hover:bg-white/20'
                }`}
              >
                {lib}
              </button>
            ))}
          </div>
        )}

        {/* Sub-library content or search results with horizontal scroll */}
        <div className="overflow-x-auto">
          {isSearching ? renderSearchResults() : renderSubLibraryContent()}
        </div>
      </div>
    </TooltipProvider>
  );
};
