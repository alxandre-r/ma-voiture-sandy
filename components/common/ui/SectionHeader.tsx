import type { ReactNode } from 'react';

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  count?: number;
  action?: ReactNode;
  className?: string;
}

export default function SectionHeader({
  title,
  subtitle,
  icon,
  count,
  action,
  className = '',
}: SectionHeaderProps) {
  return (
    <div className={`flex items-center justify-between gap-4 ${className}`}>
      <div className="flex items-center gap-2 min-w-0">
        {icon && (
          <span className="shrink-0 text-gray-400 dark:text-gray-500">{icon}</span>
        )}
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100 truncate">
              {title}
            </h2>
            {count !== undefined && (
              <span className="shrink-0 inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400">
                {count}
              </span>
            )}
          </div>
          {subtitle && (
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{subtitle}</p>
          )}
        </div>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
