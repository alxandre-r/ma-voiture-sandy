'use client';

import {
  addMonths,
  format,
  getDaysInMonth,
  getDay,
  isAfter,
  isBefore,
  isSameDay,
  startOfMonth,
  subMonths,
} from 'date-fns';
import { fr } from 'date-fns/locale';
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useRef, useEffect } from 'react';

import Icon from '@/components/common/ui/Icon';
import { PERIOD_PRESET_LABELS } from '@/types/period';

import type { CustomPeriod, PeriodPreset, PeriodSelection } from '@/types/period';

/* ------------------------------------------------------------------ */
/* Helpers                                                              */
/* ------------------------------------------------------------------ */

const PRESETS = Object.entries(PERIOD_PRESET_LABELS) as [PeriodPreset, string][];

function isCustom(p: PeriodSelection): p is CustomPeriod {
  return typeof p === 'object' && p.preset === 'custom';
}

function toISODate(d: Date): string {
  return format(d, 'yyyy-MM-dd');
}

/** Short date label shown below the preset card label */
function getPresetSubtitle(preset: PeriodPreset): string {
  const now = new Date();
  const fmt = (d: Date) => format(d, 'd MMM', { locale: fr });

  switch (preset) {
    case 'month': {
      const s = new Date(now.getFullYear(), now.getMonth(), 1);
      return `${fmt(s)} – auj.`;
    }
    case '3months':
      return `${fmt(subMonths(now, 3))} – auj.`;
    case '6months':
      return `${fmt(subMonths(now, 6))} – auj.`;
    case 'year':
      return `1 janv – auj.`;
    case '12months':
      return `${fmt(subMonths(now, 12))} – auj.`;
    case 'all':
      return "Tout l'historique";
  }
}

/** Label shown in the trigger button */
function getButtonLabel(period: PeriodSelection): string {
  if (isCustom(period)) {
    const fmt = (s: string) =>
      new Date(s).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
    return `${fmt(period.start)} – ${fmt(period.end)}`;
  }
  return PERIOD_PRESET_LABELS[period as PeriodPreset] ?? 'Cette année';
}

/* ------------------------------------------------------------------ */
/* Main component                                                       */
/* ------------------------------------------------------------------ */

export default function PeriodSelector({
  selectedPeriod,
  setSelectedPeriod,
}: {
  selectedPeriod: PeriodSelection;
  setSelectedPeriod: (period: PeriodSelection) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) setShowCalendar(false);
  }, [isOpen]);

  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  const handlePresetSelect = (preset: PeriodPreset) => {
    setSelectedPeriod(preset);
    setIsOpen(false);
  };

  const handleCustomApply = (start: string, end: string) => {
    setSelectedPeriod({ preset: 'custom', start, end });
    setIsOpen(false);
  };

  return (
    <div ref={ref} className="periodSelector-Button relative w-full sm:w-auto">
      {/* Trigger button */}
      <button
        className={`flex items-center justify-between w-full gap-2
          px-3 py-2 rounded-lg text-xs font-medium
          border border-gray-200 dark:border-gray-700
          bg-white dark:bg-gray-800
          text-gray-900 dark:text-gray-100
          sm:min-w-[160px] min-w-[120px]
          transition-colors hover:cursor-pointer
          ${isOpen ? 'border-custom-1 ring-1 ring-custom-1/30' : 'hover:border-gray-300 dark:hover:border-gray-600'}`}
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="truncate">{getButtonLabel(selectedPeriod)}</span>
        <Icon
          name="arrow-down"
          size={14}
          className={`shrink-0 transition-transform text-gray-400 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Dropdown panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -8 }}
            transition={{ type: 'spring', stiffness: 320, damping: 28 }}
            className="absolute z-50 mt-2 right-0
              bg-white dark:bg-gray-800
              border border-gray-200 dark:border-gray-700
              rounded-2xl shadow-xl shadow-black/10 overflow-hidden
              w-[300px]"
          >
            <AnimatePresence mode="wait" initial={false}>
              {showCalendar ? (
                <motion.div
                  key="calendar"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.15 }}
                >
                  <RangeCalendar
                    initial={isCustom(selectedPeriod) ? selectedPeriod : undefined}
                    onApply={handleCustomApply}
                    onBack={() => setShowCalendar(false)}
                  />
                </motion.div>
              ) : (
                <motion.div
                  key="presets"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.15 }}
                >
                  <PresetGrid
                    selectedPeriod={selectedPeriod}
                    onSelect={handlePresetSelect}
                    onCustom={() => setShowCalendar(true)}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Preset grid                                                          */
/* ------------------------------------------------------------------ */

function PresetGrid({
  selectedPeriod,
  onSelect,
  onCustom,
}: {
  selectedPeriod: PeriodSelection;
  onSelect: (p: PeriodPreset) => void;
  onCustom: () => void;
}) {
  const customActive = isCustom(selectedPeriod);

  return (
    <div className="p-3">
      {/* 2-column grid of 6 preset cards */}
      <div className="grid grid-cols-2 gap-2">
        {PRESETS.map(([value, label]) => {
          const active = selectedPeriod === value;
          return (
            <button
              key={value}
              onClick={() => onSelect(value)}
              className={`
                flex flex-col items-start text-left px-3 py-2.5 rounded-xl
                transition-all duration-150 hover:cursor-pointer
                ${
                  active
                    ? 'bg-gradient-to-br from-indigo-500 to-purple-600 shadow-md shadow-indigo-200 dark:shadow-indigo-900/40'
                    : 'bg-gray-50 dark:bg-gray-700/60 hover:bg-gray-100 dark:hover:bg-gray-700'
                }
              `}
            >
              <span
                className={`text-sm font-semibold leading-tight ${
                  active ? 'text-white' : 'text-gray-800 dark:text-gray-100'
                }`}
              >
                {label}
              </span>
              <span
                className={`text-[10px] mt-0.5 leading-tight ${
                  active ? 'text-indigo-100' : 'text-gray-400 dark:text-gray-500'
                }`}
              >
                {getPresetSubtitle(value)}
              </span>
            </button>
          );
        })}
      </div>

      {/* Divider */}
      <div className="mx-0.5 my-3 border-t border-gray-100 dark:border-gray-700" />

      {/* Custom date range */}
      <button
        onClick={onCustom}
        className={`
          w-full flex items-center justify-between px-3 py-2.5 rounded-xl
          transition-all duration-150 hover:cursor-pointer
          ${
            customActive
              ? 'bg-gradient-to-br from-indigo-500 to-purple-600 shadow-md shadow-indigo-200 dark:shadow-indigo-900/40'
              : 'bg-gray-50 dark:bg-gray-700/60 hover:bg-gray-100 dark:hover:bg-gray-700'
          }
        `}
      >
        <div className="flex flex-col items-start">
          <span
            className={`text-sm font-semibold ${
              customActive ? 'text-white' : 'text-gray-800 dark:text-gray-100'
            }`}
          >
            Personnalisé
          </span>
          <span
            className={`text-[10px] mt-0.5 ${
              customActive ? 'text-indigo-100' : 'text-gray-400 dark:text-gray-500'
            }`}
          >
            {customActive
              ? (() => {
                  const fmt = (s: string) =>
                    new Date(s).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
                  return `${fmt((selectedPeriod as CustomPeriod).start)} – ${fmt((selectedPeriod as CustomPeriod).end)}`;
                })()
              : 'Choisir une plage de dates'}
          </span>
        </div>
        <Icon
          name="calendar"
          size={16}
          className={customActive ? 'opacity-80' : 'text-gray-400 dark:text-gray-500'}
        />
      </button>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Range Calendar                                                       */
/* ------------------------------------------------------------------ */

type SelectionStep = 'start' | 'end';

function RangeCalendar({
  initial,
  onApply,
  onBack,
}: {
  initial?: CustomPeriod;
  onApply: (start: string, end: string) => void;
  onBack: () => void;
}) {
  const today = new Date();

  const [displayMonth, setDisplayMonth] = useState<Date>(() =>
    initial ? new Date(initial.end) : startOfMonth(today),
  );

  const [tempStart, setTempStart] = useState<Date | null>(initial ? new Date(initial.start) : null);
  const [tempEnd, setTempEnd] = useState<Date | null>(initial ? new Date(initial.end) : null);
  const [step, setStep] = useState<SelectionStep>(initial ? 'start' : 'start');

  const handleDayClick = (day: Date) => {
    if (step === 'start' || !tempStart) {
      setTempStart(day);
      setTempEnd(null);
      setStep('end');
    } else {
      if (isBefore(day, tempStart)) {
        setTempEnd(tempStart);
        setTempStart(day);
      } else {
        setTempEnd(day);
      }
      setStep('start');
    }
  };

  const canApply = tempStart !== null && tempEnd !== null;

  const monthLabel = format(displayMonth, 'MMMM yyyy', { locale: fr });
  const capitalised = monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1);

  const atMaxMonth =
    displayMonth.getFullYear() === today.getFullYear() &&
    displayMonth.getMonth() === today.getMonth();

  return (
    <div className="p-3">
      {/* Header row */}
      <div className="flex items-center gap-2 mb-3">
        <button
          onClick={onBack}
          className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          title="Retour"
        >
          <Icon name="arrow-back" size={14} className="text-gray-500 dark:text-gray-400" />
        </button>
        <span className="text-xs font-semibold text-gray-700 dark:text-gray-200 flex-1">
          Plage personnalisée
        </span>
      </div>

      {/* Month navigation */}
      <div className="flex items-center justify-between mb-3 px-1">
        <button
          onClick={() => setDisplayMonth((m) => subMonths(m, 1))}
          className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        >
          <svg
            viewBox="0 0 16 16"
            className="w-3.5 h-3.5 text-gray-500 dark:text-gray-400 fill-current"
          >
            <path
              d="M10.5 3.5L6 8l4.5 4.5"
              stroke="currentColor"
              strokeWidth="1.5"
              fill="none"
              strokeLinecap="round"
            />
          </svg>
        </button>
        <span className="text-xs font-semibold text-gray-800 dark:text-gray-200">
          {capitalised}
        </span>
        <button
          onClick={() => setDisplayMonth((m) => addMonths(m, 1))}
          disabled={atMaxMonth}
          className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <svg
            viewBox="0 0 16 16"
            className="w-3.5 h-3.5 text-gray-500 dark:text-gray-400 fill-current"
          >
            <path
              d="M5.5 3.5L10 8l-4.5 4.5"
              stroke="currentColor"
              strokeWidth="1.5"
              fill="none"
              strokeLinecap="round"
            />
          </svg>
        </button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 mb-1">
        {['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((d, i) => (
          <div
            key={i}
            className="text-center text-[10px] font-medium text-gray-400 dark:text-gray-500 py-0.5"
          >
            {d}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <CalendarGrid
        displayMonth={displayMonth}
        today={today}
        tempStart={tempStart}
        tempEnd={tempEnd}
        onDayClick={handleDayClick}
      />

      {/* Selection hint */}
      <div className="mt-2.5 flex items-center justify-center gap-1.5">
        <span
          className={`text-[10px] px-2 py-0.5 rounded-full ${
            step === 'start' || !tempStart
              ? 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-300 font-medium'
              : 'text-gray-400 dark:text-gray-500'
          }`}
        >
          Début{tempStart ? ` : ${format(tempStart, 'd MMM', { locale: fr })}` : ''}
        </span>
        <span className="text-gray-300 dark:text-gray-600 text-[10px]">→</span>
        <span
          className={`text-[10px] px-2 py-0.5 rounded-full ${
            step === 'end' && tempStart
              ? 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-300 font-medium'
              : 'text-gray-400 dark:text-gray-500'
          }`}
        >
          Fin{tempEnd ? ` : ${format(tempEnd, 'd MMM', { locale: fr })}` : ''}
        </span>
      </div>

      {/* Actions */}
      <div className="flex gap-2 mt-3">
        <button
          onClick={onBack}
          className="flex-1 py-2 text-xs rounded-xl border border-gray-200 dark:border-gray-600
            text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700
            transition-colors font-medium"
        >
          Annuler
        </button>
        <button
          onClick={() => canApply && onApply(toISODate(tempStart!), toISODate(tempEnd!))}
          disabled={!canApply}
          className={`flex-1 py-2 text-xs rounded-xl font-semibold transition-colors
            ${
              canApply
                ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white hover:opacity-90 shadow-sm'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-400 cursor-not-allowed'
            }`}
        >
          Appliquer
        </button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Calendar grid                                                        */
/* ------------------------------------------------------------------ */

function CalendarGrid({
  displayMonth,
  today,
  tempStart,
  tempEnd,
  onDayClick,
}: {
  displayMonth: Date;
  today: Date;
  tempStart: Date | null;
  tempEnd: Date | null;
  onDayClick: (day: Date) => void;
}) {
  const first = startOfMonth(displayMonth);
  const startOffset = (getDay(first) + 6) % 7; // Monday = 0
  const daysInMonth = getDaysInMonth(displayMonth);

  const cells: (Date | null)[] = [
    ...Array(startOffset).fill(null),
    ...Array.from(
      { length: daysInMonth },
      (_, i) => new Date(first.getFullYear(), first.getMonth(), i + 1),
    ),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <div className="grid grid-cols-7 gap-y-0.5">
      {cells.map((day, idx) => {
        if (!day) return <div key={idx} className="h-7" />;

        const future = isAfter(day, today);
        const isStart = !!tempStart && isSameDay(day, tempStart);
        const isEnd = !!tempEnd && isSameDay(day, tempEnd);
        const inRange =
          !!tempStart && !!tempEnd && isAfter(day, tempStart) && isBefore(day, tempEnd);
        const isToday = isSameDay(day, today);

        // Range highlight: rounded ends, flat interior
        const rangeEndcap = isStart || isEnd;
        const startRound = isStart && !isEnd;
        const endRound = isEnd && !isStart;

        let dayClass =
          'h-7 w-7 mx-auto flex items-center justify-center text-[11px] transition-colors select-none';

        if (future) {
          dayClass += ' text-gray-300 dark:text-gray-600 cursor-not-allowed';
        } else if (rangeEndcap) {
          dayClass += ` rounded-full bg-indigo-500 text-white font-bold cursor-pointer
            ${startRound ? '' : ''} ${endRound ? '' : ''}`;
        } else if (inRange) {
          dayClass +=
            ' bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-200 cursor-pointer';
        } else if (isToday) {
          dayClass +=
            ' rounded-full ring-1 ring-indigo-400 text-gray-800 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer font-medium';
        } else {
          dayClass +=
            ' rounded-full text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer';
        }

        return (
          <div
            key={idx}
            className={`flex items-center justify-center ${
              inRange ? 'bg-indigo-50 dark:bg-indigo-900/20' : ''
            } ${isStart && tempEnd ? 'rounded-l-full' : ''} ${isEnd ? 'rounded-r-full' : ''}`}
          >
            <button
              disabled={future}
              onClick={() => !future && onDayClick(day)}
              className={dayClass}
            >
              {day.getDate()}
            </button>
          </div>
        );
      })}
    </div>
  );
}
