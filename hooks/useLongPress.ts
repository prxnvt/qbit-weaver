import { useCallback, useRef, useState } from 'react';

interface UseLongPressOptions {
  delay?: number;
  moveThreshold?: number;
  onLongPress: () => void;
}

export function useLongPress({ delay = 500, moveThreshold = 10, onLongPress }: UseLongPressOptions) {
  const [isLongPressing, setIsLongPressing] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startPosRef = useRef<{ x: number; y: number } | null>(null);
  const firedRef = useRef(false);

  const clear = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setIsLongPressing(false);
    firedRef.current = false;
  }, []);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    startPosRef.current = { x: touch.clientX, y: touch.clientY };
    firedRef.current = false;

    timerRef.current = setTimeout(() => {
      firedRef.current = true;
      setIsLongPressing(true);
      onLongPress();
      // Reset after visual feedback
      setTimeout(() => setIsLongPressing(false), 300);
    }, delay);
  }, [delay, onLongPress]);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    if (!startPosRef.current) return;
    const touch = e.touches[0];
    const dx = touch.clientX - startPosRef.current.x;
    const dy = touch.clientY - startPosRef.current.y;
    if (Math.sqrt(dx * dx + dy * dy) > moveThreshold) {
      clear();
    }
  }, [moveThreshold, clear]);

  const onTouchEnd = useCallback(() => {
    const wasFired = firedRef.current;
    clear();
    return wasFired;
  }, [clear]);

  return {
    isLongPressing,
    handlers: {
      onTouchStart,
      onTouchMove,
      onTouchEnd,
    },
    wasFired: () => firedRef.current,
  };
}
