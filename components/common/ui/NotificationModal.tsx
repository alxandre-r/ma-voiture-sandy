'use client';

import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import { useEffect, useState } from 'react';

interface NotificationAction {
  label: string;
  onClick: () => void;
}

interface NotificationModalProps {
  message: string;
  type?: 'success' | 'error' | 'info' | 'warning';
  duration?: number;
  action?: NotificationAction;
  onClose: () => void;
}

const variants = {
  initial: { opacity: 0, x: 80, scale: 0.95 },
  animate: { opacity: 1, x: 0, scale: 1 },
  exit: { opacity: 0, x: 80, scale: 0.95 },
};

// Mapping explicite pour le light et dark theme
const borderClasses = {
  success: 'border-b-green-600 dark:border-b-green-500',
  error: 'border-b-red-600 dark:border-b-red-700',
  warning: 'border-b-yellow-500 dark:border-b-yellow-400',
  info: 'border-b-gray-400 dark:border-b-gray-500',
};

const svgPath = {
  success: '/icons/notif/success',
  error: '/icons/notif/error',
  warning: '/icons/notif/warning',
  info: '/icons/notif/info',
};

export default function NotificationModal({
  message,
  type = 'info',
  duration = 6000,
  action,
  onClose,
}: NotificationModalProps) {
  const [visible, setVisible] = useState(true);
  const [isHovering, setIsHovering] = useState(false);

  // auto-dismiss
  useEffect(() => {
    if (isHovering) return;

    const timer = setTimeout(() => setVisible(false), duration);
    return () => clearTimeout(timer);
  }, [duration, isHovering]);

  return (
    <AnimatePresence onExitComplete={onClose}>
      {visible && (
        <motion.div
          layout
          initial="initial"
          animate="animate"
          exit="exit"
          variants={variants}
          transition={{ duration: 0.25, ease: 'easeOut' }}
        >
          <div
            className={`rounded-xl shadow-xl backdrop-blur-md border
              bg-white/30 
              border-gray-200 
              hover:border-gray-300
              ${borderClasses[type]} 
              dark:bg-gray-800/30
              dark:border-gray-700 
              dark:hover:border-gray-600
              transition-colors
              `}
            onMouseEnter={() => setIsHovering(true)}
            onMouseLeave={() => setIsHovering(false)}
          >
            <div className="flex items-center gap-3 p-6">
              <Image src={`${svgPath[type]}.svg`} alt={type} width={24} height={24} />

              <p className="flex-1 text-sm text-gray-800 dark:text-white">{message}</p>

              {action && (
                <button
                  onClick={() => {
                    action.onClick();
                    setVisible(false);
                  }}
                  className="text-xs font-semibold text-custom-1 hover:underline cursor-pointer shrink-0"
                >
                  {action.label}
                </button>
              )}

              <button
                onClick={() => setVisible(false)}
                className="text-gray-500 hover:text-gray-800 dark:hover:text-white hover:cursor-pointer transition-opacity"
                aria-label="Fermer"
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
