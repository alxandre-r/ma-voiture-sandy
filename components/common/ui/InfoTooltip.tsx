'use client';

import { useRef, useState } from 'react';

interface InfoTooltipProps {
  title: string;
  details: string[];
  className?: string;
  /** Position the tooltip above or below the icon (default: above) */
  position?: 'above' | 'below';
}

const TOOLTIP_W = 256; // w-64 = 256px
const MARGIN = 8; // min distance from viewport edge

export default function InfoTooltip({
  title,
  details,
  className,
  position = 'above',
}: InfoTooltipProps) {
  const [visible, setVisible] = useState(false);
  const [popupStyle, setPopupStyle] = useState<React.CSSProperties>({
    left: '50%',
    transform: 'translateX(-50%)',
  });
  const triggerRef = useRef<HTMLSpanElement>(null);

  const handleMouseEnter = () => {
    setVisible(true);
    if (triggerRef.current && typeof window !== 'undefined') {
      const rect = triggerRef.current.getBoundingClientRect();
      const vw = window.innerWidth;
      // Ideal centered position in page coords
      const idealLeft = rect.left + rect.width / 2 - TOOLTIP_W / 2;
      // Clamp to viewport with margin
      const clampedLeft = Math.max(MARGIN, Math.min(idealLeft, vw - TOOLTIP_W - MARGIN));
      // Express as offset from wrapper's own left edge (tooltip is absolute inside wrapper)
      setPopupStyle({ left: clampedLeft - rect.left, transform: 'none' });
    }
  };

  const handleMouseLeave = () => {
    setVisible(false);
    setPopupStyle({ left: '50%', transform: 'translateX(-50%)' });
  };

  return (
    <span className={`relative inline-flex items-center ${className ?? ''}`}>
      <span
        ref={triggerRef}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className="cursor-help text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
      >
        <svg
          className="w-3.5 h-3.5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <circle cx="12" cy="12" r="10" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 16v-4m0-4h.01" />
        </svg>
      </span>

      {visible && (
        <span
          className={`absolute z-50 ${position === 'above' ? 'bottom-full mb-2' : 'top-full mt-2'}`}
          style={{ display: 'block', ...popupStyle }}
        >
          <span className="block bg-gray-900 dark:bg-gray-700 text-white p-4 rounded-lg shadow-xl w-64 pointer-events-none">
            <span className="block font-semibold text-sm mb-2">{title}</span>
            <span className="block text-xs text-gray-300">
              {details.map((detail, i) => (
                <span key={i} className="block leading-relaxed">
                  {detail}
                </span>
              ))}
            </span>
          </span>
        </span>
      )}
    </span>
  );
}
