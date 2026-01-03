import React, { useState, useEffect, useRef } from 'react';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { parseAngleExpression, formatAngle } from '../utils/angleParser';

interface AngleInputProps {
  gateType: string;
  onConfirm: (angle: number, expression: string) => void;
  onCancel: () => void;
  position: { x: number; y: number };
}

export const AngleInput: React.FC<AngleInputProps> = ({
  gateType,
  onConfirm,
  onCancel,
  position,
}) => {
  const [value, setValue] = useState('pi/2');
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  const handleSubmit = () => {
    const parsed = parseAngleExpression(value);
    if (parsed === null) {
      setError('Invalid angle expression');
      return;
    }
    onConfirm(parsed, value);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSubmit();
    } else if (e.key === 'Escape') {
      onCancel();
    }
  };

  const previewAngle = parseAngleExpression(value);

  return (
    <div
      className="fixed z-50 bg-neutral-900 border border-neutral-700 rounded-lg p-3 shadow-xl"
      style={{ left: position.x, top: position.y }}
    >
      <div className="text-xs text-neutral-400 mb-2">
        {gateType} angle (radians)
      </div>
      <div className="flex gap-2">
        <Input
          ref={inputRef}
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            setError(null);
          }}
          onKeyDown={handleKeyDown}
          placeholder="e.g., pi/4, 0.5"
          className="w-32 bg-black border-neutral-600 text-white text-sm"
        />
        <Button
          onClick={handleSubmit}
          size="sm"
          className="bg-cyan-600 hover:bg-cyan-700 text-white"
        >
          OK
        </Button>
        <Button
          onClick={onCancel}
          size="sm"
          variant="outline"
          className="border-neutral-600 text-neutral-400 hover:text-white"
        >
          Cancel
        </Button>
      </div>
      {error && (
        <div className="text-red-400 text-xs mt-1">{error}</div>
      )}
      {previewAngle !== null && !error && (
        <div className="text-neutral-500 text-xs mt-1">
          = {formatAngle(previewAngle)} ({previewAngle.toFixed(4)} rad)
        </div>
      )}
    </div>
  );
};
