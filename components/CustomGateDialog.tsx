import React, { useState, useEffect, useRef } from 'react';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Complex } from '../types';
import { parseComplexExpression } from '../utils/complexParser';
import { add, mul, conj, ZERO } from '../utils/complex';

interface CustomGateDialogProps {
  onConfirm: (matrix: Complex[][], label: string) => void;
  onCancel: () => void;
  existingNames: string[];
}

const isUnitary = (matrix: Complex[][]): boolean => {
  // Compute U * U^dagger
  const result: Complex[][] = [
    [ZERO, ZERO],
    [ZERO, ZERO],
  ];

  for (let i = 0; i < 2; i++) {
    for (let j = 0; j < 2; j++) {
      for (let k = 0; k < 2; k++) {
        result[i][j] = add(result[i][j], mul(matrix[i][k], conj(matrix[j][k])));
      }
    }
  }

  // Check if result is approximately identity
  const eps = 0.01;
  const isClose = (a: number, b: number) => Math.abs(a - b) < eps;

  return (
    isClose(result[0][0].re, 1) && isClose(result[0][0].im, 0) &&
    isClose(result[0][1].re, 0) && isClose(result[0][1].im, 0) &&
    isClose(result[1][0].re, 0) && isClose(result[1][0].im, 0) &&
    isClose(result[1][1].re, 1) && isClose(result[1][1].im, 0)
  );
};

export const CustomGateDialog: React.FC<CustomGateDialogProps> = ({
  onConfirm,
  onCancel,
  existingNames,
}) => {
  const [m00, setM00] = useState('1');
  const [m01, setM01] = useState('0');
  const [m10, setM10] = useState('0');
  const [m11, setM11] = useState('1');
  const [label, setLabel] = useState('');

  const labelInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    labelInputRef.current?.focus();
  }, []);

  // Parse all matrix entries
  const c00 = parseComplexExpression(m00);
  const c01 = parseComplexExpression(m01);
  const c10 = parseComplexExpression(m10);
  const c11 = parseComplexExpression(m11);

  const allValid = c00 !== null && c01 !== null && c10 !== null && c11 !== null;
  const matrix: Complex[][] | null = allValid ? [[c00!, c01!], [c10!, c11!]] : null;
  const isUnitaryMatrix = matrix ? isUnitary(matrix) : false;

  // Check name validity
  const trimmedLabel = label.trim().toUpperCase();
  const nameValid = trimmedLabel.length > 0 && trimmedLabel.length <= 2;
  const nameExists = existingNames.includes(trimmedLabel);

  const canSubmit = allValid && isUnitaryMatrix && nameValid && !nameExists;

  const handleSubmit = () => {
    if (!canSubmit || !matrix) return;
    onConfirm(matrix, trimmedLabel);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && canSubmit) {
      handleSubmit();
    } else if (e.key === 'Escape') {
      onCancel();
    }
  };

  const getNameError = (): string | null => {
    if (label.trim() === '') return null;
    if (trimmedLabel.length > 2) return 'Max 2 characters';
    if (nameExists) return 'Name already exists';
    return null;
  };

  const nameError = getNameError();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div
        className="bg-neutral-900 border border-neutral-700 rounded-lg p-5 shadow-xl max-w-md"
        onKeyDown={handleKeyDown}
      >
        <div className="text-sm text-neutral-300 mb-4 font-bold">
          Create Custom Gate
        </div>

        {/* Label input */}
        <div className="flex items-center gap-3 mb-4">
          <span className="text-xs text-neutral-400 w-16">Name:</span>
          <Input
            ref={labelInputRef}
            value={label}
            onChange={(e) => setLabel(e.target.value.slice(0, 2))}
            placeholder="e.g. V"
            className="w-20 bg-black border-neutral-600 text-white text-sm px-2 uppercase"
            maxLength={2}
          />
          {nameError && (
            <span className="text-red-400 text-xs">{nameError}</span>
          )}
        </div>

        {/* 2x2 Matrix input */}
        <div className="text-xs text-neutral-500 mb-2">
          Matrix (supports: 1+2i, 1/sqrt(2), pi/4, -i, etc.)
        </div>
        <div className="flex flex-col gap-2 mb-4">
          <div className="flex items-center gap-2">
            <span className="text-neutral-600 text-2xl font-light">[</span>
            <Input
              value={m00}
              onChange={(e) => setM00(e.target.value)}
              placeholder="1"
              className={`w-24 bg-black border-neutral-600 text-white text-sm px-2 text-center ${c00 === null && m00 ? 'border-red-500' : ''}`}
            />
            <Input
              value={m01}
              onChange={(e) => setM01(e.target.value)}
              placeholder="0"
              className={`w-24 bg-black border-neutral-600 text-white text-sm px-2 text-center ${c01 === null && m01 ? 'border-red-500' : ''}`}
            />
            <span className="text-neutral-600 text-2xl font-light">]</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-neutral-600 text-2xl font-light">[</span>
            <Input
              value={m10}
              onChange={(e) => setM10(e.target.value)}
              placeholder="0"
              className={`w-24 bg-black border-neutral-600 text-white text-sm px-2 text-center ${c10 === null && m10 ? 'border-red-500' : ''}`}
            />
            <Input
              value={m11}
              onChange={(e) => setM11(e.target.value)}
              placeholder="1"
              className={`w-24 bg-black border-neutral-600 text-white text-sm px-2 text-center ${c11 === null && m11 ? 'border-red-500' : ''}`}
            />
            <span className="text-neutral-600 text-2xl font-light">]</span>
          </div>
        </div>

        {/* Status messages */}
        {!allValid && (m00 || m01 || m10 || m11) && (
          <div className="text-red-400 text-xs mb-3">
            Invalid expression in matrix
          </div>
        )}
        {allValid && !isUnitaryMatrix && (
          <div className="text-yellow-500 text-xs mb-3">
            Matrix is not unitary (required for quantum gates)
          </div>
        )}

        {/* Buttons */}
        <div className="flex gap-2 justify-end">
          <Button
            onClick={onCancel}
            size="sm"
            variant="outline"
            className="border-neutral-600 text-neutral-400 hover:text-white"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            size="sm"
            disabled={!canSubmit}
            className={canSubmit
              ? "bg-purple-600 hover:bg-purple-700 text-white"
              : "bg-neutral-700 text-neutral-500 cursor-not-allowed"
            }
          >
            Add to Library
          </Button>
        </div>
      </div>
    </div>
  );
};
