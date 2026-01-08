/**
 * Circuit serialization utilities for save/load functionality.
 *
 * Provides functions to serialize circuits to JSON format and
 * deserialize/validate JSON files back into circuit data.
 */

import {
  CircuitFile,
  CircuitFileMetadata,
  CircuitGrid,
  Cell,
  GateType,
  GateParams,
  CustomGateDefinition,
  Complex,
  isValidGateType,
} from '../types';

// ============================================================================
// Constants
// ============================================================================

/** Current version of the circuit file format */
export const CIRCUIT_FILE_VERSION = '1.0';

/** Supported versions for backward compatibility */
const SUPPORTED_VERSIONS = ['1.0'];

// ============================================================================
// Validation Types
// ============================================================================

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

// ============================================================================
// Serialization
// ============================================================================

/**
 * Serialize a circuit grid and custom gates to a CircuitFile object.
 */
export function serializeCircuit(
  grid: CircuitGrid,
  customGates: CustomGateDefinition[],
  metadata: Partial<CircuitFileMetadata> = {}
): CircuitFile {
  const rows = grid.length;
  const cols = rows > 0 ? grid[0].length : 0;

  return {
    version: CIRCUIT_FILE_VERSION,
    metadata: {
      name: metadata.name ?? 'Untitled Circuit',
      description: metadata.description,
      createdAt: metadata.createdAt ?? new Date().toISOString(),
    },
    circuit: {
      rows,
      cols,
      grid,
    },
    customGates: customGates.length > 0 ? customGates : undefined,
  };
}

/**
 * Convert a CircuitFile to a JSON string with pretty printing.
 */
export function circuitToJson(circuitFile: CircuitFile): string {
  return JSON.stringify(circuitFile, null, 2);
}

/**
 * Serialize circuit and return JSON string ready for download.
 */
export function serializeCircuitToJson(
  grid: CircuitGrid,
  customGates: CustomGateDefinition[],
  metadata?: Partial<CircuitFileMetadata>
): string {
  const circuitFile = serializeCircuit(grid, customGates, metadata);
  return circuitToJson(circuitFile);
}

// ============================================================================
// Deserialization
// ============================================================================

/**
 * Parse a JSON string into a CircuitFile object.
 * Throws if JSON is invalid.
 */
export function parseCircuitJson(json: string): unknown {
  try {
    return JSON.parse(json);
  } catch {
    throw new Error('Invalid JSON format');
  }
}

/**
 * Deserialize and validate a JSON string into a CircuitFile.
 * Returns the CircuitFile if valid, or throws with validation errors.
 */
export function deserializeCircuit(json: string): CircuitFile {
  const data = parseCircuitJson(json);
  const validation = validateCircuitFile(data);

  if (!validation.valid) {
    throw new Error(`Invalid circuit file: ${validation.errors.join('; ')}`);
  }

  // Type assertion is safe after validation
  return data as CircuitFile;
}

// ============================================================================
// Validation
// ============================================================================

/**
 * Validate that an unknown object conforms to the CircuitFile schema.
 */
export function validateCircuitFile(data: unknown): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check basic structure
  if (!data || typeof data !== 'object') {
    return { valid: false, errors: ['Data must be an object'], warnings: [] };
  }

  const obj = data as Record<string, unknown>;

  // Check version
  if (typeof obj.version !== 'string') {
    errors.push('Missing or invalid version field');
  } else if (!SUPPORTED_VERSIONS.includes(obj.version)) {
    errors.push(`Unsupported version: ${obj.version}. Supported: ${SUPPORTED_VERSIONS.join(', ')}`);
  }

  // Check metadata
  const metadataResult = validateMetadata(obj.metadata);
  errors.push(...metadataResult.errors);
  warnings.push(...metadataResult.warnings);

  // Check circuit
  const circuitResult = validateCircuitData(obj.circuit);
  errors.push(...circuitResult.errors);
  warnings.push(...circuitResult.warnings);

  // Check custom gates (optional)
  if (obj.customGates !== undefined) {
    const customGatesResult = validateCustomGates(obj.customGates);
    errors.push(...customGatesResult.errors);
    warnings.push(...customGatesResult.warnings);
  }

  return { valid: errors.length === 0, errors, warnings };
}

/**
 * Validate the metadata section.
 */
function validateMetadata(metadata: unknown): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!metadata || typeof metadata !== 'object') {
    errors.push('Missing or invalid metadata');
    return { valid: false, errors, warnings };
  }

  const meta = metadata as Record<string, unknown>;

  if (typeof meta.name !== 'string' || meta.name.length === 0) {
    errors.push('Metadata must have a non-empty name');
  }

  if (meta.description !== undefined && typeof meta.description !== 'string') {
    errors.push('Metadata description must be a string');
  }

  if (typeof meta.createdAt !== 'string') {
    errors.push('Metadata must have a createdAt timestamp');
  }

  return { valid: errors.length === 0, errors, warnings };
}

/**
 * Validate the circuit data section.
 */
function validateCircuitData(circuit: unknown): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!circuit || typeof circuit !== 'object') {
    errors.push('Missing or invalid circuit data');
    return { valid: false, errors, warnings };
  }

  const circ = circuit as Record<string, unknown>;

  // Validate dimensions
  if (typeof circ.rows !== 'number' || circ.rows < 1) {
    errors.push('Circuit must have valid rows count');
  }
  if (typeof circ.cols !== 'number' || circ.cols < 1) {
    errors.push('Circuit must have valid cols count');
  }

  // Validate grid
  if (!Array.isArray(circ.grid)) {
    errors.push('Circuit grid must be an array');
    return { valid: false, errors, warnings };
  }

  const expectedRows = circ.rows as number;
  const expectedCols = circ.cols as number;

  if (circ.grid.length !== expectedRows) {
    errors.push(`Grid has ${circ.grid.length} rows, expected ${expectedRows}`);
  }

  // Validate each row and cell
  for (let row = 0; row < circ.grid.length; row++) {
    const gridRow = circ.grid[row];
    if (!Array.isArray(gridRow)) {
      errors.push(`Row ${row} is not an array`);
      continue;
    }

    if (gridRow.length !== expectedCols) {
      errors.push(`Row ${row} has ${gridRow.length} columns, expected ${expectedCols}`);
    }

    for (let col = 0; col < gridRow.length; col++) {
      const cellResult = validateCell(gridRow[col], row, col);
      errors.push(...cellResult.errors);
      warnings.push(...cellResult.warnings);
    }
  }

  return { valid: errors.length === 0, errors, warnings };
}

/**
 * Validate a single cell.
 */
function validateCell(cell: unknown, row: number, col: number): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const location = `cell [${row},${col}]`;

  if (!cell || typeof cell !== 'object') {
    errors.push(`${location}: must be an object`);
    return { valid: false, errors, warnings };
  }

  const c = cell as Record<string, unknown>;

  // Validate gate type
  if (c.gate !== null && typeof c.gate !== 'string') {
    errors.push(`${location}: gate must be string or null`);
  } else if (c.gate !== null && !isValidGateType(c.gate as string)) {
    errors.push(`${location}: unknown gate type "${c.gate}"`);
  }

  // Validate id
  if (typeof c.id !== 'string') {
    errors.push(`${location}: missing id`);
  }

  // Validate params if present
  if (c.params !== undefined) {
    const paramsResult = validateParams(c.params, location);
    errors.push(...paramsResult.errors);
    warnings.push(...paramsResult.warnings);
  }

  return { valid: errors.length === 0, errors, warnings };
}

/**
 * Validate gate parameters.
 */
function validateParams(params: unknown, location: string): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (typeof params !== 'object' || params === null) {
    errors.push(`${location}: params must be an object`);
    return { valid: false, errors, warnings };
  }

  const p = params as Record<string, unknown>;

  // Validate angle if present
  if (p.angle !== undefined && typeof p.angle !== 'number') {
    errors.push(`${location}: angle must be a number`);
  }

  // Validate angleExpression if present
  if (p.angleExpression !== undefined && typeof p.angleExpression !== 'string') {
    errors.push(`${location}: angleExpression must be a string`);
  }

  // Validate reverseSpan if present
  if (p.reverseSpan !== undefined) {
    const span = p.reverseSpan as Record<string, unknown>;
    if (typeof span?.startRow !== 'number' || typeof span?.endRow !== 'number') {
      errors.push(`${location}: reverseSpan must have startRow and endRow numbers`);
    } else if (span.startRow > span.endRow) {
      errors.push(`${location}: reverseSpan startRow must be <= endRow`);
    }
  }

  // Validate isSpanContinuation if present
  if (p.isSpanContinuation !== undefined && typeof p.isSpanContinuation !== 'boolean') {
    errors.push(`${location}: isSpanContinuation must be a boolean`);
  }

  // Validate customMatrix if present
  if (p.customMatrix !== undefined) {
    const matrixResult = validateComplexMatrix(p.customMatrix, location);
    errors.push(...matrixResult.errors);
  }

  return { valid: errors.length === 0, errors, warnings };
}

/**
 * Validate a 2x2 complex matrix.
 */
function validateComplexMatrix(matrix: unknown, location: string): ValidationResult {
  const errors: string[] = [];

  if (!Array.isArray(matrix) || matrix.length !== 2) {
    errors.push(`${location}: customMatrix must be a 2x2 array`);
    return { valid: false, errors, warnings: [] };
  }

  for (let i = 0; i < 2; i++) {
    if (!Array.isArray(matrix[i]) || matrix[i].length !== 2) {
      errors.push(`${location}: customMatrix row ${i} must have 2 elements`);
      continue;
    }

    for (let j = 0; j < 2; j++) {
      const elem = matrix[i][j] as Record<string, unknown>;
      if (typeof elem?.re !== 'number' || typeof elem?.im !== 'number') {
        errors.push(`${location}: customMatrix[${i}][${j}] must have re and im numbers`);
      }
    }
  }

  return { valid: errors.length === 0, errors, warnings: [] };
}

/**
 * Validate custom gates array.
 */
function validateCustomGates(customGates: unknown): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!Array.isArray(customGates)) {
    errors.push('customGates must be an array');
    return { valid: false, errors, warnings };
  }

  for (let i = 0; i < customGates.length; i++) {
    const gate = customGates[i] as Record<string, unknown>;
    const location = `customGates[${i}]`;

    if (typeof gate?.label !== 'string' || gate.label.length === 0) {
      errors.push(`${location}: must have a non-empty label`);
    }

    if (gate?.matrix !== undefined) {
      const matrixResult = validateComplexMatrix(gate.matrix, location);
      errors.push(...matrixResult.errors);
    } else {
      errors.push(`${location}: missing matrix`);
    }
  }

  return { valid: errors.length === 0, errors, warnings };
}

// ============================================================================
// File Download Helper
// ============================================================================

/**
 * Trigger a browser download of the circuit as a JSON file.
 */
export function downloadCircuitFile(
  grid: CircuitGrid,
  customGates: CustomGateDefinition[],
  filename?: string,
  metadata?: Partial<CircuitFileMetadata>
): void {
  const json = serializeCircuitToJson(grid, customGates, metadata);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = filename ?? `${metadata?.name ?? 'circuit'}.qbw.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
}

// ============================================================================
// File Upload Helper
// ============================================================================

/**
 * Read and parse a circuit file from a File object.
 * Returns a Promise that resolves to the CircuitFile or rejects with an error.
 */
export function readCircuitFile(file: File): Promise<CircuitFile> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      try {
        const json = reader.result as string;
        const circuitFile = deserializeCircuit(json);
        resolve(circuitFile);
      } catch (error) {
        reject(error instanceof Error ? error : new Error('Failed to parse circuit file'));
      }
    };

    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };

    reader.readAsText(file);
  });
}
