'use client';

import { forwardRef } from 'react';

import Spinner from '@/components/common/ui/Spinner';

import type { ButtonHTMLAttributes, ReactNode } from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline';
export type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  children?: ReactNode;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    'bg-custom-1 hover:bg-custom-1-hover text-white disabled:opacity-50',
  secondary:
    'bg-custom-2 hover:bg-custom-2-hover text-white disabled:opacity-50',
  ghost:
    'bg-transparent hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300 disabled:opacity-50',
  danger:
    'bg-red-600 hover:bg-red-700 text-white disabled:opacity-50',
  outline:
    'border border-gray-200 dark:border-gray-700 bg-transparent hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 disabled:opacity-50',
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-xs gap-1.5',
  md: 'px-4 py-2 text-sm gap-2',
  lg: 'px-5 py-2.5 text-base gap-2',
};

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      isLoading = false,
      leftIcon,
      rightIcon,
      children,
      className = '',
      disabled,
      ...props
    },
    ref,
  ) => {
    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={[
          'inline-flex items-center justify-center font-medium rounded-lg transition-colors cursor-pointer',
          variantClasses[variant],
          sizeClasses[size],
          className,
        ]
          .filter(Boolean)
          .join(' ')}
        {...props}
      >
        {isLoading ? (
          <Spinner color={variant === 'ghost' || variant === 'outline' ? 'gray-300' : 'white'} />
        ) : (
          leftIcon
        )}
        {children}
        {!isLoading && rightIcon}
      </button>
    );
  },
);

Button.displayName = 'Button';

export default Button;
