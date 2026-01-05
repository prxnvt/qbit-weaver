import React from 'react';
import { GateType, GateParams, ARITHMETIC_DARK_BLUE_GATES, ARITHMETIC_VIOLET_GATES, ARITHMETIC_LILAC_GATES, ARITHMETIC_PINK_GATES, ARITHMETIC_INPUT_GATES } from '../types';
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

  const baseClasses = "w-10 h-10 flex items-center justify-center text-sm font-bold cursor-grab active:cursor-grabbing select-none z-20 relative";
  const errorBgClass = hasError ? "!bg-red-600" : "";

  // Custom Styles per Gate Type
  let content: React.ReactNode = type;
  let specificStyles = "bg-black border-2 border-white text-white";

  if (type === GateType.I) {
      // Identity gate - wire through box
      content = (
        <div className="relative w-full h-full flex items-center justify-center">
          <div className="absolute w-full h-0.5 bg-neutral-500"></div>
          <span className="text-neutral-400 text-xs bg-black px-1">I</span>
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
      content = <span className="text-xs font-bold">XC</span>;
      specificStyles = "bg-black border-2 border-orange-400 text-orange-400";
  } else if (type === GateType.X_ANTI_CONTROL) {
      // X-basis anti-control (conditions on |-⟩)
      content = <span className="text-xs font-bold">XA</span>;
      specificStyles = "bg-black border-2 border-orange-400 text-orange-400";
  } else if (type === GateType.Y_CONTROL) {
      // Y-basis control (conditions on |+i⟩)
      content = <span className="text-xs font-bold">YC</span>;
      specificStyles = "bg-black border-2 border-green-400 text-green-400";
  } else if (type === GateType.Y_ANTI_CONTROL) {
      // Y-basis anti-control (conditions on |-i⟩)
      content = <span className="text-xs font-bold">YA</span>;
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
      content = <span className="text-xs font-bold">CZ</span>;
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
          <span className="text-sm font-bold">M</span>
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
            <span className="text-xs">R</span>
            <span className="text-[8px]">{axis}</span>
          </div>
          {angleLabel && (
            <span className="text-[8px] text-cyan-300 -mt-0.5">{angleLabel}</span>
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
            <span className="text-xs">R</span>
            <span className="text-[8px]">{axis}</span>
          </div>
          <span className="text-[8px] text-cyan-300 -mt-0.5">{angleLabel}</span>
        </div>
      );
      specificStyles = "bg-black border-2 border-cyan-400 text-cyan-400";
  } else if (type === GateType.SDG) {
      // S-dagger gate
      content = <span className="text-xs font-bold">S†</span>;
      specificStyles = "bg-black border-2 border-white text-white";
  } else if (type === GateType.SQRT_X) {
      // Square root of X
      content = <span className="text-xs font-bold">√X</span>;
      specificStyles = "bg-black border-2 border-white text-white";
  } else if (type === GateType.SQRT_X_DG) {
      // Inverse square root of X
      content = <span className="text-[10px] font-bold">√X†</span>;
      specificStyles = "bg-black border-2 border-white text-white";
  } else if (type === GateType.SQRT_Y) {
      // Square root of Y
      content = <span className="text-xs font-bold">√Y</span>;
      specificStyles = "bg-black border-2 border-white text-white";
  } else if (type === GateType.SQRT_Y_DG) {
      // Inverse square root of Y
      content = <span className="text-[10px] font-bold">√Y†</span>;
      specificStyles = "bg-black border-2 border-white text-white";
  } else if (type === GateType.CUSTOM) {
      // Custom gate - show label or 'U'
      const label = params?.customLabel || 'U';
      content = <span className="text-xs font-bold">{label}</span>;
      specificStyles = "bg-black border-2 border-purple-400 text-purple-400";
  } else if (type === GateType.REVERSE) {
      // Reverse gate - bit-reversal permutation
      content = <span className="text-xs font-bold">Rv</span>;
      specificStyles = "bg-black border-2 border-yellow-400 text-yellow-400";
  }
  // ============================================================================
  // ARITHMETIC GATES - Dark Blue (inc/dec, mul/div)
  // ============================================================================
  else if ((ARITHMETIC_DARK_BLUE_GATES as readonly GateType[]).includes(type)) {
      const darkBlueBase = "bg-black border-2 border-blue-600 text-blue-400";
      specificStyles = darkBlueBase;

      // Column 1: Increment/Decrement
      if (type === GateType.INC) {
          content = <span className="text-xs font-bold">+1</span>;
      } else if (type === GateType.DEC) {
          content = <span className="text-xs font-bold">-1</span>;
      } else if (type === GateType.ADD_A) {
          content = <span className="text-xs font-bold">+A</span>;
      } else if (type === GateType.SUB_A) {
          content = <span className="text-xs font-bold">-A</span>;
      }
      // Column 2: Multiply/Divide
      else if (type === GateType.MUL_A) {
          content = <span className="text-xs font-bold">×A</span>;
      } else if (type === GateType.DIV_A) {
          content = <span className="text-xs font-bold">÷A</span>;
      } else if (type === GateType.MUL_B) {
          content = <span className="text-xs font-bold">×B</span>;
      } else if (type === GateType.DIV_B) {
          content = <span className="text-xs font-bold">÷B</span>;
      }
  }
  // ============================================================================
  // ARITHMETIC GATES - Violet (comparison gates)
  // ============================================================================
  else if ((ARITHMETIC_VIOLET_GATES as readonly GateType[]).includes(type)) {
      const violetBase = "bg-black border-2 border-violet-600 text-violet-400";
      specificStyles = violetBase;

      if (type === GateType.A_LT_B) {
          content = <span className="text-xs font-bold">A&lt;B</span>;
      } else if (type === GateType.A_LEQ_B) {
          content = <span className="text-xs font-bold">A≤B</span>;
      } else if (type === GateType.A_GT_B) {
          content = <span className="text-xs font-bold">A&gt;B</span>;
      } else if (type === GateType.A_GEQ_B) {
          content = <span className="text-xs font-bold">A≥B</span>;
      } else if (type === GateType.A_EQ_B) {
          content = <span className="text-xs font-bold">A=B</span>;
      } else if (type === GateType.A_NEQ_B) {
          content = <span className="text-xs font-bold">A≠B</span>;
      }
  }
  // ============================================================================
  // ARITHMETIC GATES - Lilac (mod gates)
  // ============================================================================
  else if ((ARITHMETIC_LILAC_GATES as readonly GateType[]).includes(type)) {
      const lilacBase = "bg-black border-2 border-purple-400 text-purple-300";
      specificStyles = lilacBase;

      if (type === GateType.INC_MOD_R) {
          content = (
            <div className="flex flex-col items-center leading-none">
              <span className="text-xs font-bold">+1</span>
              <span className="text-[9px]">%R</span>
            </div>
          );
      } else if (type === GateType.DEC_MOD_R) {
          content = (
            <div className="flex flex-col items-center leading-none">
              <span className="text-xs font-bold">-1</span>
              <span className="text-[9px]">%R</span>
            </div>
          );
      } else if (type === GateType.ADD_A_MOD_R) {
          content = (
            <div className="flex flex-col items-center leading-none">
              <span className="text-xs font-bold">+A</span>
              <span className="text-[9px]">%R</span>
            </div>
          );
      } else if (type === GateType.SUB_A_MOD_R) {
          content = (
            <div className="flex flex-col items-center leading-none">
              <span className="text-xs font-bold">-A</span>
              <span className="text-[9px]">%R</span>
            </div>
          );
      } else if (type === GateType.MUL_A_MOD_R) {
          content = (
            <div className="flex flex-col items-center leading-none">
              <span className="text-xs font-bold">×A</span>
              <span className="text-[9px]">%R</span>
            </div>
          );
      } else if (type === GateType.DIV_A_MOD_R) {
          content = (
            <div className="flex flex-col items-center leading-none">
              <span className="text-xs font-bold">÷A</span>
              <span className="text-[9px]">%R</span>
            </div>
          );
      }
  }
  // ============================================================================
  // ARITHMETIC GATES - Pink (imaginary scalar gates)
  // ============================================================================
  else if ((ARITHMETIC_PINK_GATES as readonly GateType[]).includes(type)) {
      const pinkBase = "bg-black border-2 border-pink-500 text-pink-400";
      specificStyles = pinkBase;

      if (type === GateType.SCALE_I) {
          content = <span className="text-xs font-bold">×i</span>;
      } else if (type === GateType.SCALE_NEG_I) {
          content = <span className="text-xs font-bold">×-i</span>;
      } else if (type === GateType.SCALE_SQRT_I) {
          content = <span className="text-xs font-bold">×√i</span>;
      } else if (type === GateType.SCALE_SQRT_NEG_I) {
          content = <span className="text-[10px] font-bold">×√-i</span>;
      }
  }
  // ============================================================================
  // ARITHMETIC INPUT MARKERS - Dashed borders
  // ============================================================================
  else if ((ARITHMETIC_INPUT_GATES as readonly GateType[]).includes(type)) {
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

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      onMouseEnter={() => onHover(type, params)}
      onMouseLeave={() => onHover(null)}
      className={`${baseClasses} ${specificStyles} ${errorBgClass} group`}
    >
      {content}
    </div>
  );
};
