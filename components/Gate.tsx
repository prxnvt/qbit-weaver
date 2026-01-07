import React from 'react';
import {
  GateType,
  GateParams,
  isArithmeticDarkBlueGate,
  isArithmeticVioletGate,
  isArithmeticLilacGate,
  isArithmeticPinkGate,
  isArithmeticInputGate,
  isTimeParameterizedGate,
  isExponentialGate,
  isQFTGate,
  isInputParameterizedGate,
} from '../types';
import { formatAngle } from '../utils/angleParser';

interface GateProps {
  type: GateType;
  onHover: (type: GateType | null, params?: GateParams) => void;
  params?: GateParams;
  /** If provided, this gate is on the circuit board and can be moved */
  cellId?: string;
  /** If true, this is in the gate library (bottom pane) and should copy, not move */
  isGateLibrary?: boolean;
  /** If true, this gate has a validation error and should be highlighted in red */
  hasError?: boolean;
}

export const Gate: React.FC<GateProps> = ({ type, onHover, params, cellId, isGateLibrary = false, hasError = false }) => {
  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData('gateType', type);
    // If from gate library, copy; if from circuit board, move
    e.dataTransfer.effectAllowed = isGateLibrary ? 'copy' : 'move';
    if (cellId) {
      e.dataTransfer.setData('sourceCellId', cellId);
    }
    if (params) {
      e.dataTransfer.setData('gateParams', JSON.stringify(params));
    }
  };

  // When in gate library, parent row handles dragging; otherwise gate handles it
  const baseClasses = `w-10 h-10 flex items-center justify-center text-base font-bold select-none z-20 relative ${!isGateLibrary ? 'cursor-grab active:cursor-grabbing' : ''}`;
  const errorBgClass = hasError ? "!bg-red-600" : "";

  // Custom Styles per Gate Type
  let content: React.ReactNode = type;
  let specificStyles = "bg-black border-2 border-white text-white";

  if (type === GateType.I) {
      // Identity gate - wire through box
      content = (
        <div className="relative w-full h-full flex items-center justify-center">
          <div className="absolute w-full h-0.5 bg-neutral-500"></div>
          <span className="text-neutral-400 text-sm bg-black px-1">I</span>
        </div>
      );
      specificStyles = "bg-black border-2 border-neutral-500 text-neutral-400";
  } else if (type === GateType.CONTROL) {
      // Filled circle for control (conditions on |1⟩)
      content = <div className="w-4 h-4 rounded-full bg-white"></div>;
      specificStyles = "bg-black border-2 border-white rounded-none";
  } else if (type === GateType.ANTI_CONTROL) {
      // Empty circle for anti-control (conditions on |0⟩)
      content = <div className="w-4 h-4 rounded-full border-2 border-white bg-black"></div>;
      specificStyles = "bg-black border-2 border-white rounded-none";
  } else if (type === GateType.X_CONTROL) {
      // X-basis control (conditions on |+⟩)
      content = <span className="text-sm font-bold">XC</span>;
      specificStyles = "bg-black border-2 border-orange-400 text-orange-400";
  } else if (type === GateType.X_ANTI_CONTROL) {
      // X-basis anti-control (conditions on |-⟩)
      content = <span className="text-sm font-bold">XA</span>;
      specificStyles = "bg-black border-2 border-orange-400 text-orange-400";
  } else if (type === GateType.Y_CONTROL) {
      // Y-basis control (conditions on |+i⟩)
      content = <span className="text-sm font-bold">YC</span>;
      specificStyles = "bg-black border-2 border-green-400 text-green-400";
  } else if (type === GateType.Y_ANTI_CONTROL) {
      // Y-basis anti-control (conditions on |-i⟩)
      content = <span className="text-sm font-bold">YA</span>;
      specificStyles = "bg-black border-2 border-green-400 text-green-400";
  } else if (type === GateType.CX) {
      // CNOT target - circle with plus
      content = (
          <div className="relative w-8 h-8 flex items-center justify-center">
              <div className="absolute inset-0 rounded-full border-2 border-white"></div>
              <div className="w-full h-0.5 bg-white"></div>
              <div className="absolute h-full w-0.5 bg-white"></div>
          </div>
      );
      specificStyles = "bg-black border-none text-white";
  } else if (type === GateType.CZ) {
      content = <span className="text-sm font-bold">CZ</span>;
      specificStyles = "bg-black border-2 border-white text-white";
  } else if (type === GateType.SWAP) {
      content = <span className="text-lg">×</span>;
      specificStyles = "bg-black border-2 border-white text-white";
  } else if (type === GateType.CCX) {
      // Toffoli - shows as target with two dots indicator
      content = (
          <div className="relative w-8 h-8 flex items-center justify-center">
              <div className="absolute inset-0 rounded-full border-2 border-white"></div>
              <div className="w-full h-0.5 bg-white"></div>
              <div className="absolute h-full w-0.5 bg-white"></div>
              <div className="absolute -top-1 left-1/2 -translate-x-1/2 flex gap-0.5">
                <div className="w-1.5 h-1.5 rounded-full bg-white"></div>
                <div className="w-1.5 h-1.5 rounded-full bg-white"></div>
              </div>
          </div>
      );
      specificStyles = "bg-black border-none text-white";
  } else if (type === GateType.MEASURE) {
      // Measurement gate - meter icon style
      content = (
        <div className="flex flex-col items-center justify-center">
          <span className="text-base font-bold">M</span>
        </div>
      );
      specificStyles = "bg-black border-2 border-white text-white";
  } else if (type === GateType.RX || type === GateType.RY || type === GateType.RZ) {
      // Rotation gates - show Rx, Ry, Rz with angle
      const axis = type.slice(1); // X, Y, or Z
      const angleLabel = params?.angle !== undefined ? formatAngle(params.angle) : '';
      content = (
        <div className="flex flex-col items-center leading-none">
          <div className="flex items-baseline">
            <span className="text-sm">R</span>
            <span className="text-xs">{axis}</span>
          </div>
          {angleLabel && (
            <span className="text-xs text-cyan-300 -mt-0.5">{angleLabel}</span>
          )}
        </div>
      );
      specificStyles = "bg-black border-2 border-cyan-400 text-cyan-400";
  } else if (
      type === GateType.RX_PI_2 || type === GateType.RX_PI_4 || type === GateType.RX_PI_8 || type === GateType.RX_PI_12 ||
      type === GateType.RY_PI_2 || type === GateType.RY_PI_4 || type === GateType.RY_PI_8 || type === GateType.RY_PI_12 ||
      type === GateType.RZ_PI_2 || type === GateType.RZ_PI_4 || type === GateType.RZ_PI_8 || type === GateType.RZ_PI_12
  ) {
      // Preset rotation gates - extract axis and angle from type
      const axis = type.charAt(1); // X, Y, or Z
      const anglePart = type.split('_').slice(1).join('/'); // PI_2 -> π/2, PI_4 -> π/4, etc.
      const angleLabel = anglePart.replace('PI', 'π').replace('_', '/');
      content = (
        <div className="flex flex-col items-center leading-none">
          <div className="flex items-baseline">
            <span className="text-sm">R</span>
            <span className="text-xs">{axis}</span>
          </div>
          <span className="text-xs text-cyan-300 -mt-0.5">{angleLabel}</span>
        </div>
      );
      specificStyles = "bg-black border-2 border-cyan-400 text-cyan-400";
  } else if (type === GateType.SDG) {
      // S-dagger gate
      content = <span className="text-sm font-bold">S†</span>;
      specificStyles = "bg-black border-2 border-white text-white";
  } else if (type === GateType.SQRT_X) {
      // Square root of X
      content = <span className="text-sm font-bold">√X</span>;
      specificStyles = "bg-black border-2 border-white text-white";
  } else if (type === GateType.SQRT_X_DG) {
      // Inverse square root of X
      content = <span className="text-sm font-bold">√X†</span>;
      specificStyles = "bg-black border-2 border-white text-white";
  } else if (type === GateType.SQRT_Y) {
      // Square root of Y
      content = <span className="text-sm font-bold">√Y</span>;
      specificStyles = "bg-black border-2 border-white text-white";
  } else if (type === GateType.SQRT_Y_DG) {
      // Inverse square root of Y
      content = <span className="text-sm font-bold">√Y†</span>;
      specificStyles = "bg-black border-2 border-white text-white";
  } else if (type === GateType.CUSTOM) {
      // Custom gate - show label or 'U'
      const label = params?.customLabel || 'U';
      content = <span className="text-sm font-bold">{label}</span>;
      specificStyles = "bg-black border-2 border-purple-400 text-purple-400";
  } else if (type === GateType.REVERSE) {
      // Reverse gate - bit-reversal permutation
      content = <span className="text-sm font-bold">Rv</span>;
      specificStyles = "bg-black border-2 border-yellow-400 text-yellow-400";
  } else if (type === GateType.PHASE_GRADIENT) {
      // Phase Gradient gate - yellow
      content = <span className="text-sm font-bold">PG</span>;
      specificStyles = "bg-black border-2 border-yellow-400 text-yellow-400";
  }
  // ============================================================================
  // TIME-PARAMETERIZED GATES - Blue (Z^t, X^t, Y^t)
  // ============================================================================
  else if (isTimeParameterizedGate(type)) {
      const blueBase = "bg-black border-2 border-blue-500 text-blue-400";
      specificStyles = blueBase;

      if (type === GateType.ZT) {
          content = (
            <div className="flex items-baseline">
              <span className="text-sm font-bold">Z</span>
              <span className="text-xs font-bold align-super">t</span>
            </div>
          );
      } else if (type === GateType.XT) {
          content = (
            <div className="flex items-baseline">
              <span className="text-sm font-bold">X</span>
              <span className="text-xs font-bold align-super">t</span>
            </div>
          );
      } else if (type === GateType.YT) {
          content = (
            <div className="flex items-baseline">
              <span className="text-sm font-bold">Y</span>
              <span className="text-xs font-bold align-super">t</span>
            </div>
          );
      }
  }
  // ============================================================================
  // INPUT-PARAMETERIZED GATES - Blue (Z^A, X^A, Y^A, Z^B, X^B, Y^B)
  // ============================================================================
  else if (isInputParameterizedGate(type)) {
      const blueBase = "bg-black border-2 border-blue-500 text-blue-400";
      specificStyles = blueBase;

      if (type === GateType.ZA) {
          content = (
            <div className="flex items-baseline">
              <span className="text-sm font-bold">Z</span>
              <span className="text-xs font-bold align-super">A</span>
            </div>
          );
      } else if (type === GateType.XA) {
          content = (
            <div className="flex items-baseline">
              <span className="text-sm font-bold">X</span>
              <span className="text-xs font-bold align-super">A</span>
            </div>
          );
      } else if (type === GateType.YA) {
          content = (
            <div className="flex items-baseline">
              <span className="text-sm font-bold">Y</span>
              <span className="text-xs font-bold align-super">A</span>
            </div>
          );
      } else if (type === GateType.ZB) {
          content = (
            <div className="flex items-baseline">
              <span className="text-sm font-bold">Z</span>
              <span className="text-xs font-bold align-super">B</span>
            </div>
          );
      } else if (type === GateType.XB) {
          content = (
            <div className="flex items-baseline">
              <span className="text-sm font-bold">X</span>
              <span className="text-xs font-bold align-super">B</span>
            </div>
          );
      } else if (type === GateType.YB) {
          content = (
            <div className="flex items-baseline">
              <span className="text-sm font-bold">Y</span>
              <span className="text-xs font-bold align-super">B</span>
            </div>
          );
      }
  }
  // ============================================================================
  // EXPONENTIAL GATES - Blue (e^Z, e^X, e^Y)
  // ============================================================================
  else if (isExponentialGate(type)) {
      const blueBase = "bg-black border-2 border-blue-500 text-blue-400";
      specificStyles = blueBase;

      if (type === GateType.EXP_Z) {
          content = (
            <div className="flex items-baseline">
              <span className="text-sm font-bold">e</span>
              <span className="text-xs font-bold align-super">Z</span>
            </div>
          );
      } else if (type === GateType.EXP_X) {
          content = (
            <div className="flex items-baseline">
              <span className="text-sm font-bold">e</span>
              <span className="text-xs font-bold align-super">X</span>
            </div>
          );
      } else if (type === GateType.EXP_Y) {
          content = (
            <div className="flex items-baseline">
              <span className="text-sm font-bold">e</span>
              <span className="text-xs font-bold align-super">Y</span>
            </div>
          );
      }
  }
  // ============================================================================
  // QFT GATES - Purple (QFT, QFT†)
  // ============================================================================
  else if (isQFTGate(type)) {
      const purpleBase = "bg-black border-2 border-purple-500 text-purple-400";
      specificStyles = purpleBase;

      if (type === GateType.QFT) {
          content = <span className="text-sm font-bold">QFT</span>;
      } else if (type === GateType.QFT_DG) {
          content = (
            <div className="flex items-baseline">
              <span className="text-sm font-bold">QFT</span>
              <span className="text-xs font-bold align-super">†</span>
            </div>
          );
      }
  }
  // ============================================================================
  // ARITHMETIC GATES - Dark Blue (inc/dec, mul/div)
  // ============================================================================
  else if (isArithmeticDarkBlueGate(type)) {
      const darkBlueBase = "bg-black border-2 border-blue-600 text-blue-400";
      specificStyles = darkBlueBase;

      // Column 1: Increment/Decrement
      if (type === GateType.INC) {
          content = <span className="text-sm font-bold">+1</span>;
      } else if (type === GateType.DEC) {
          content = <span className="text-sm font-bold">-1</span>;
      } else if (type === GateType.ADD_A) {
          content = <span className="text-sm font-bold">+A</span>;
      } else if (type === GateType.SUB_A) {
          content = <span className="text-sm font-bold">-A</span>;
      }
      // Column 2: Multiply/Divide
      else if (type === GateType.MUL_A) {
          content = <span className="text-sm font-bold">×A</span>;
      } else if (type === GateType.DIV_A) {
          content = <span className="text-sm font-bold">÷A</span>;
      } else if (type === GateType.MUL_B) {
          content = <span className="text-sm font-bold">×B</span>;
      } else if (type === GateType.DIV_B) {
          content = <span className="text-sm font-bold">÷B</span>;
      }
  }
  // ============================================================================
  // ARITHMETIC GATES - Violet (comparison gates)
  // ============================================================================
  else if (isArithmeticVioletGate(type)) {
      const violetBase = "bg-black border-2 border-violet-600 text-violet-400";
      specificStyles = violetBase;

      if (type === GateType.A_LT_B) {
          content = <span className="text-sm font-bold">A&lt;B</span>;
      } else if (type === GateType.A_LEQ_B) {
          content = <span className="text-sm font-bold">A≤B</span>;
      } else if (type === GateType.A_GT_B) {
          content = <span className="text-sm font-bold">A&gt;B</span>;
      } else if (type === GateType.A_GEQ_B) {
          content = <span className="text-sm font-bold">A≥B</span>;
      } else if (type === GateType.A_EQ_B) {
          content = <span className="text-sm font-bold">A=B</span>;
      } else if (type === GateType.A_NEQ_B) {
          content = <span className="text-sm font-bold">A≠B</span>;
      }
  }
  // ============================================================================
  // ARITHMETIC GATES - Lilac (mod gates)
  // ============================================================================
  else if (isArithmeticLilacGate(type)) {
      const lilacBase = "bg-black border-2 border-purple-400 text-purple-300";
      specificStyles = lilacBase;

      if (type === GateType.INC_MOD_R) {
          content = (
            <div className="flex flex-col items-center leading-none">
              <span className="text-sm font-bold">+1</span>
              <span className="text-xs">%R</span>
            </div>
          );
      } else if (type === GateType.DEC_MOD_R) {
          content = (
            <div className="flex flex-col items-center leading-none">
              <span className="text-sm font-bold">-1</span>
              <span className="text-xs">%R</span>
            </div>
          );
      } else if (type === GateType.ADD_A_MOD_R) {
          content = (
            <div className="flex flex-col items-center leading-none">
              <span className="text-sm font-bold">+A</span>
              <span className="text-xs">%R</span>
            </div>
          );
      } else if (type === GateType.SUB_A_MOD_R) {
          content = (
            <div className="flex flex-col items-center leading-none">
              <span className="text-sm font-bold">-A</span>
              <span className="text-xs">%R</span>
            </div>
          );
      } else if (type === GateType.MUL_A_MOD_R) {
          content = (
            <div className="flex flex-col items-center leading-none">
              <span className="text-sm font-bold">×A</span>
              <span className="text-xs">%R</span>
            </div>
          );
      } else if (type === GateType.DIV_A_MOD_R) {
          content = (
            <div className="flex flex-col items-center leading-none">
              <span className="text-sm font-bold">÷A</span>
              <span className="text-xs">%R</span>
            </div>
          );
      }
  }
  // ============================================================================
  // ARITHMETIC GATES - Pink (imaginary scalar gates)
  // ============================================================================
  else if (isArithmeticPinkGate(type)) {
      const pinkBase = "bg-black border-2 border-pink-500 text-pink-400";
      specificStyles = pinkBase;

      if (type === GateType.SCALE_I) {
          content = <span className="text-sm font-bold">×i</span>;
      } else if (type === GateType.SCALE_NEG_I) {
          content = <span className="text-sm font-bold">×-i</span>;
      } else if (type === GateType.SCALE_SQRT_I) {
          content = <span className="text-sm font-bold">×√i</span>;
      } else if (type === GateType.SCALE_SQRT_NEG_I) {
          content = <span className="text-sm font-bold">×√-i</span>;
      }
  }
  // ============================================================================
  // ARITHMETIC INPUT MARKERS - Dashed borders
  // ============================================================================
  else if (isArithmeticInputGate(type)) {
      // Dashed border style for input markers
      const inputMarkerBase = "bg-black border-2 border-dashed text-gray-300";

      if (type === GateType.INPUT_A) {
          content = <span className="text-sm font-bold">A</span>;
          specificStyles = `${inputMarkerBase} border-white`;
      } else if (type === GateType.INPUT_B) {
          content = <span className="text-sm font-bold">B</span>;
          specificStyles = `${inputMarkerBase} border-green-500`;
      } else if (type === GateType.INPUT_R) {
          content = <span className="text-sm font-bold">R</span>;
          specificStyles = `${inputMarkerBase} border-amber-500`;
      }
  }
  // ============================================================================
  // VISUALIZATION GATES - Emerald (Bloch sphere, percentage)
  // ============================================================================
  else if (type === GateType.BLOCH_VIS) {
      // Mini Bloch sphere icon
      content = (
        <div className="relative w-6 h-6">
          <svg width="24" height="24" viewBox="0 0 24 24">
            {/* Sphere outline */}
            <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-emerald-400" />
            {/* Equator ellipse */}
            <ellipse cx="12" cy="12" rx="9" ry="3" fill="none" stroke="currentColor" strokeWidth="0.75" className="text-emerald-400/50" />
            {/* Vertical axis */}
            <line x1="12" y1="3" x2="12" y2="21" stroke="currentColor" strokeWidth="0.75" className="text-emerald-400/50" />
            {/* State vector arrow pointing up */}
            <line x1="12" y1="12" x2="12" y2="5" stroke="currentColor" strokeWidth="1.5" className="text-emerald-400" />
            <polygon points="12,3 10,6 14,6" fill="currentColor" className="text-emerald-400" />
          </svg>
        </div>
      );
      specificStyles = "bg-black border-2 border-emerald-500 text-emerald-400";
  }
  else if (type === GateType.PERCENT_VIS) {
      content = <span className="text-base font-bold">%</span>;
      specificStyles = "bg-black border-2 border-emerald-500 text-emerald-400";
  }

  return (
    <div
      draggable={!isGateLibrary}
      onDragStart={!isGateLibrary ? handleDragStart : undefined}
      onMouseEnter={() => onHover(type, params)}
      onMouseLeave={() => onHover(null)}
      className={`${baseClasses} ${specificStyles} ${errorBgClass} group`}
    >
      {content}
    </div>
  );
};
