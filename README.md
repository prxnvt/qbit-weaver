# Qbit Weaver

An interactive, browser-based simple quantum computer simulator for learning and visualization.

## Overview

QCVO provides a visual drag-and-drop interface for constructing quantum circuits, running simulations, and observing quantum state evolution through real-time Bloch sphere visualizations. No coding required—build circuits intuitively and see quantum behavior instantly.

## Features

### Circuit Building
- **Drag-and-drop gate placement** from a categorized gate library
- **Multi-qubit support** up to 8 qubits (256 amplitude states)
- **Dynamic wire management** - add or remove qubit lines
- **Visual feedback** with hover highlights and control connectors

### Gate Library (100+ gates)

| Category | Gates |
|----------|-------|
| **Pauli** | X, Y, Z |
| **Hadamard** | H (superposition) |
| **Phase** | S, T, S†, T† |
| **Square Root** | √X, √X†, √Y, √Y† |
| **Rotation** | RX, RY, RZ with custom angles |
| **Preset Rotations** | RX(π/2), RX(π/4), RY(π/8), RZ(π/12), etc. |
| **Multi-Qubit** | CX (CNOT), CZ, SWAP, CCX (Toffoli) |
| **Control Markers** | CONTROL, ANTI_CONTROL, X/Y variants |
| **Arithmetic** | INC, DEC, ADD, SUB, MUL, DIV, modular ops |
| **Comparison** | A<B, A≤B, A>B, A≥B, A=B, A≠B |
| **Special** | MEASURE, Identity, REVERSE, CUSTOM |

### Simulation & Visualization
- **State vector simulation** with full complex amplitude tracking
- **Bloch spheres** displaying qubit states after execution
- **Amplitude grid** showing the complete state vector
- **Dirac notation** display (|ψ⟩ = α|0⟩ + β|1⟩)
- **Measurement** with probabilistic state collapse

### Additional Features
- **Algorithm templates** - pre-built quantum circuits
- **Custom gate creation** - define your own 2×2 unitary matrices
- **Angle expression parsing** - supports "pi/4", "3*pi/8", etc.
- **Gate information panel** - displays gate details and matrices on hover

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | React 19 |
| Language | TypeScript 5.8 |
| Build Tool | Vite 6 |
| Styling | Tailwind CSS 3.4 |
| Components | shadcn/ui (Radix UI) |
| Testing | Vitest + React Testing Library |
| Icons | Lucide React |
| Font | JetBrains Mono |

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd qcvo

# Install dependencies
npm install
```

### Development

```bash
# Start development server (http://localhost:3000)
npm run dev
```

### Production

```bash
# Build for production
npm run build

# Preview production build
npm run preview
```

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server on port 3000 |
| `npm run build` | Create optimized production build |
| `npm run preview` | Preview production build locally |
| `npm test` | Run all tests |
| `npm run test:watch` | Run tests in watch mode |
| `npm run test:coverage` | Run tests with coverage report |

## Project Structure

```
qcvo/
├── App.tsx                    # Main application component
├── types.ts                   # TypeScript type definitions
├── constants.ts               # Gate definitions & layout constants
│
├── components/
│   ├── Gate.tsx               # Draggable/placed gate component
│   ├── BlochSphere.tsx        # Bloch sphere visualization
│   ├── GateLibrary.tsx        # Gate palette sidebar
│   ├── AmplitudeGrid.tsx      # State vector display
│   ├── InfoBox.tsx            # Hover information panel
│   ├── AngleInput.tsx         # Angle input dialog
│   ├── CustomGateDialog.tsx   # Custom gate creator
│   ├── AlgorithmSidebar.tsx   # Algorithm templates
│   └── ui/                    # shadcn UI primitives
│
├── utils/
│   ├── quantum.ts             # Quantum simulation engine
│   ├── angleParser.ts         # Angle expression parser
│   └── complexParser.ts       # Complex number parser
│
└── data/
    └── algorithms.ts          # Pre-built quantum algorithms
```

## Testing

The project includes 208 tests covering the quantum simulation engine, parsers, and components.

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage
```

### Coverage Thresholds

| Module | Lines | Functions | Branches |
|--------|-------|-----------|----------|
| angleParser.ts | 90% | 90% | 90% |
| complexParser.ts | 90% | 90% | 90% |
| quantum.ts | 35% | 65% | 20% |

## Architecture

- **State Management**: React hooks (useState, useCallback, useMemo)
- **Drag-and-Drop**: HTML5 drag events with dataTransfer API
- **Simulation**: Column-by-column gate application on state vectors
- **Qubit Ordering**: Big-endian (row 0 = MSB)
- **Complex Numbers**: Custom implementation with re/im properties

## License

MIT
