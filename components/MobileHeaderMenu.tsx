import React, { useEffect, useRef } from 'react';
import { Download, Upload, X as XIcon, Info } from 'lucide-react';

interface MobileHeaderMenuProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  onUpload: () => void;
  onClear: () => void;
  onInfo: () => void;
}

export const MobileHeaderMenu: React.FC<MobileHeaderMenuProps> = ({
  isOpen,
  onClose,
  onSave,
  onUpload,
  onClear,
  onInfo,
}) => {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleTap = (e: TouchEvent | MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    // Use touchstart on touch devices to avoid double-fire (touchstart + mousedown)
    const eventType = 'ontouchstart' in window ? 'touchstart' : 'mousedown';
    document.addEventListener(eventType, handleTap);
    return () => {
      document.removeEventListener(eventType, handleTap);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const buttonClass = "w-full flex items-center gap-3 px-4 py-3 text-sm font-bold uppercase active:bg-accent/20 transition-colors";

  return (
    <div
      ref={menuRef}
      className="absolute top-full right-0 mt-1 w-48 bg-background border-2 border-foreground z-50 shadow-lg"
    >
      <button onClick={() => { onSave(); onClose(); }} className={buttonClass}>
        <Download size={18} />
        <span>Save</span>
      </button>
      <button onClick={() => { onUpload(); onClose(); }} className={buttonClass}>
        <Upload size={18} />
        <span>Upload</span>
      </button>
      <button onClick={() => { onClear(); onClose(); }} className={`${buttonClass} text-red-400`}>
        <XIcon size={18} />
        <span>Clear</span>
      </button>
      <button onClick={() => { onInfo(); onClose(); }} className={buttonClass}>
        <Info size={18} />
        <span>Info</span>
      </button>
    </div>
  );
};
