'use client';

import React, { useState } from 'react';

import { Card } from '@/components/common/ui/card';
import Icon from '@/components/common/ui/Icon';

/* ------------------------------------------------------------------ */
/* Public types                                                         */
/* ------------------------------------------------------------------ */

export interface StatCardTooltip {
  title: string;
  details: string[];
}

export interface StatCardDef {
  key?: string;
  /** Card label shown above the value */
  label: string;
  /** Main value displayed large */
  value: string | React.ReactNode;
  /** Unit shown after the value, e.g. "€", "L/100" */
  unit?: string;
  /** Icon name from /public/icons (without .svg) */
  icon?: string;
  /** Tailwind bg class for the icon pill, e.g. "bg-emerald-50 dark:bg-emerald-900/20" */
  iconBg?: string;
  /** Tailwind text color class for the icon, e.g. "text-custom-1" */
  iconColor?: string;
  /** Trend string shown top-right, e.g. "+12.3%" */
  trend?: string;
  /** Tailwind text color for the trend, e.g. "text-red-500" */
  trendColor?: string;
  /** Override text color for the value (warning states) */
  valueColor?: string;
  /** Small muted text below the value */
  subtitle?: string;
  /** When provided, the card becomes interactive with a hover/click tooltip */
  tooltip?: StatCardTooltip;
  /** When provided (without tooltip), makes the card a clickable button */
  onClick?: () => void;
  /** Show "—" placeholders instead of real values */
  loading?: boolean;
}

/* ------------------------------------------------------------------ */
/* StatOverviewCard — single card                                       */
/* ------------------------------------------------------------------ */

export function StatOverviewCard({
  label,
  value,
  unit,
  icon,
  iconBg = 'bg-gray-50 dark:bg-gray-900/40',
  iconColor,
  trend,
  trendColor = 'text-gray-500',
  valueColor,
  subtitle,
  tooltip,
  onClick,
  loading = false,
}: StatCardDef) {
  const [showTooltip, setShowTooltip] = useState(false);
  const hasTooltip = !!tooltip;
  const hasOnClick = !!onClick && !hasTooltip;
  const isInteractive = hasTooltip || hasOnClick;

  const inner = (
    <Card
      className={`p-4 h-full transition-all ${
        isInteractive ? 'hover:shadow-md active:scale-[0.98] cursor-pointer' : ''
      }`}
    >
      {/* Label row */}
      <div className="flex items-start justify-between gap-1 mb-2.5">
        <div className="flex items-center gap-1.5 min-w-0">
          {icon && (
            <span
              className={`p-1.5 ${iconBg} rounded-lg shrink-0 flex items-center justify-center ${iconColor ?? 'text-gray-500 dark:text-gray-400'}`}
            >
              <Icon name={icon} size={14} />
            </span>
          )}
          <span className="text-xs text-gray-500 dark:text-gray-400 leading-tight">{label}</span>
        </div>

        {trend && (
          <span className={`text-[11px] font-semibold whitespace-nowrap shrink-0 ${trendColor}`}>
            {trend}
          </span>
        )}
      </div>

      {/* Value row */}
      <div className="flex items-baseline gap-1 flex-wrap">
        <span
          className={`text-2xl font-bold tracking-tight leading-none ${
            valueColor ?? 'text-gray-900 dark:text-gray-100'
          }`}
        >
          {loading ? '—' : value}
        </span>
        {unit && !loading && (
          <span className="text-sm text-gray-500 dark:text-gray-400">{unit}</span>
        )}
      </div>

      {/* Subtitle */}
      {subtitle && !loading && (
        <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1 leading-tight">
          {subtitle}
        </p>
      )}
    </Card>
  );

  if (hasOnClick) {
    return (
      <div className="h-full">
        <button className="w-full h-full text-left" onClick={onClick}>
          {inner}
        </button>
      </div>
    );
  }

  if (!hasTooltip) return <div className="h-full">{inner}</div>;

  return (
    <div className="relative h-full">
      <button
        className="w-full text-left"
        onClick={() => setShowTooltip((v) => !v)}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
      >
        {inner}
      </button>

      {showTooltip && (
        <div className="absolute top-full left-1/2 -translate-x-1/2 mt-3 z-50 w-56 max-w-[calc(100vw-2rem)] pointer-events-none">
          <div className="bg-gray-900 dark:bg-gray-700 text-white p-4 rounded-xl shadow-xl">
            <p className="font-semibold text-sm mb-2">{tooltip.title}</p>
            <ul className="text-xs text-gray-300 space-y-1">
              {tooltip.details.map((d, i) => (
                <li key={i}>{d}</li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* StatOverviewGrid — responsive grid wrapper                          */
/* ------------------------------------------------------------------ */

/**
 * Renders a grid of StatOverviewCards.
 *
 * Pass `gridClass` to control the grid columns, e.g.:
 *   "grid-cols-3"               → 3 columns always
 *   "grid-cols-2 md:grid-cols-4" → 2 on mobile, 4 on desktop
 */
export function StatOverviewGrid({
  cards,
  gridClass = 'grid-cols-3',
  className,
}: {
  cards: StatCardDef[];
  /** Tailwind grid-cols classes. Default: "grid-cols-3" */
  gridClass?: string;
  className?: string;
}) {
  return (
    <div className={`grid gap-2 sm:gap-3 ${gridClass} ${className ?? ''}`}>
      {cards.map((card, i) => {
        const { key, ...rest } = card;
        return <StatOverviewCard key={key ?? String(i)} {...rest} />;
      })}
    </div>
  );
}
