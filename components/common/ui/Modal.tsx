'use client';

import { motion, AnimatePresence } from 'framer-motion';
import React, { useEffect, useRef } from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  fullscreenOnMobile?: boolean;
}

const backdropVariants = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
};

const modalVariants = {
  initial: {
    opacity: 0,
    scale: 0.95,
    y: 12,
  },
  animate: {
    opacity: 1,
    scale: 1,
    y: 0,
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    y: 12,
  },
};

const sizeClasses = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-xl',
  xl: 'max-w-2xl',
};

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  size = 'md',
  fullscreenOnMobile = false,
}) => {
  const modalRef = useRef<HTMLDivElement>(null);

  /* ---------------- click outside ---------------- */
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose]);

  /* ---------------- escape ---------------- */
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className={`
            fixed inset-0 z-50 flex justify-center
            ${fullscreenOnMobile ? 'items-start sm:items-center' : 'items-center'}
            bg-black/10 dark:bg-black/50 backdrop-blur-[2px]
          `}
          variants={backdropVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          transition={{ duration: 0.1, ease: 'easeOut' }}
        >
          <motion.div
            ref={modalRef}
            className={`
              bg-white dark:bg-gray-800 shadow-xl
              ${
                fullscreenOnMobile
                  ? `
                    w-full h-full
                    sm:h-auto sm:w-full sm:mx-4 sm:rounded-lg ${sizeClasses[size]}
                  `
                  : `
                    w-full mx-4 rounded-lg ${sizeClasses[size]}
                  `
              }
            `}
            variants={modalVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ duration: 0.1, ease: 'easeOut' }}
          >
            {/* Header */}
            <div
              className={`
              px-6 py-4 border-b border-gray-200 dark:border-gray-700
              flex items-center justify-between
              ${fullscreenOnMobile ? 'sticky top-0 z-10 bg-white dark:bg-gray-800' : ''}
              `}
            >
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">{title}</h3>
              <button
                aria-label="Fermer"
                onClick={onClose}
                className="text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white hover:cursor-pointer transition-colors duration-200"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            {/* Content */}
            <div className="px-6 py-4">{children}</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
