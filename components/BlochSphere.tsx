import React from 'react';

interface BlochSphereProps {
  x: number;
  y: number;
  z: number;
  size?: number;
  row: number;
  col: number;
  onHover: (data: string | null) => void;
}

export const BlochSphere: React.FC<BlochSphereProps> = ({ x, y, z, size = 40, row, col, onHover }) => {
  // Isometric projection-ish or simple 3D to 2D
  // Let's do a simple pseudo-3D
  // Z is up (screen Y negative)
  // X is down-left
  // Y is down-right
  
  // Map 3D (x,y,z) to 2D (u, v)
  // Let's keep it simple: Standard Bloch view
  // Circle represents the sphere
  // Z axis is vertical
  // X axis projects slightly
  // Y axis projects slightly
  
  // Coordinate transform for visualization
  // Screen X = x * cos(30) + y * cos(-30) ???
  // Let's use standard projection:
  // u = x * 0.7 - y * 0.7
  // v = -z + x * 0.4 + y * 0.4
  
  const radius = size / 2 - 2;
  const cx = size / 2;
  const cy = size / 2;
  
  // Project vector (x,y,z) onto screen (px, py) relative to center
  // Standard view: Z points UP. Y points Right. X points "Out" (down-left)
  // Let's use a standard orthographic projection that looks good.
  
  // We want to see all 3 components.
  // u = Y * 0.9 - X * 0.4
  // v = -Z * 0.9 + X * 0.4
  
  const px = (y * 0.8 - x * 0.4) * radius;
  const py = (-z * 0.8 + x * 0.4) * radius;

  // Axis end points for drawing
  const xAxis = { u: (-0.4) * radius, v: (0.4) * radius };
  const yAxis = { u: (0.8) * radius, v: 0 };
  const zAxis = { u: 0, v: (-0.8) * radius };

  const handleMouseEnter = () => {
    onHover(`State |ψ⟩: <X>=${x.toFixed(2)}, <Y>=${y.toFixed(2)}, <Z>=${z.toFixed(2)}`);
  };

  return (
    <div 
      className="relative flex items-center justify-center" 
      style={{ width: size, height: size }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={() => onHover(null)}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* Sphere Outline */}
        <circle cx={cx} cy={cy} r={radius} stroke="#333" strokeWidth="1" fill="none" />
        
        {/* Equator (Approximate ellipse) */}
        <ellipse cx={cx} cy={cy} rx={radius} ry={radius * 0.3} stroke="#222" strokeWidth="1" fill="none" />

        {/* Axes (back half) */}
        {/* Only drawing simple lines from center */}
        
        {/* Vector Line */}
        <line 
          x1={cx} 
          y1={cy} 
          x2={cx + px} 
          y2={cy + py} 
          stroke="red" 
          strokeWidth="2" 
          strokeLinecap="round"
        />
        
        {/* Vector Head */}
        <circle cx={cx + px} cy={cy + py} r={2} fill="red" />
      </svg>
    </div>
  );
};
