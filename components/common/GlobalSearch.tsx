'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import Icon from '@/components/common/ui/Icon';
import { Modal } from '@/components/common/ui/Modal';
import Spinner from '@/components/common/ui/Spinner';
import { useSelectors } from '@/contexts/SelectorsContext';
import { formatCurrency } from '@/lib/utils/format';

// ---- Types ----
interface SearchExpense {
  id: number;
  type: string;
  amount: number;
  date: string;
  notes: string | null;
  label: string | null;
  vehicle_name: string | null;
  maintenance_type_label: string | null;
}

interface SearchReminder {
  id: number;
  title: string;
  due_date: string | null;
  vehicle_id: number;
}

interface ApiResults {
  expenses: SearchExpense[];
  reminders: SearchReminder[];
}

// ---- Static page navigation items ----
const PAGES = [
  { label: 'Tableau de bord', path: '/dashboard', icon: 'dashboard' },
  { label: 'Statistiques', path: '/statistics', icon: 'chart' },
  { label: 'Dépenses', path: '/expenses', icon: 'euro' },
  { label: 'Maintenance', path: '/maintenance', icon: 'tool' },
  { label: 'Rappels', path: '/reminders', icon: 'bell' },
  { label: 'Assurance', path: '/insurance', icon: 'secure' },
  { label: 'Véhicules', path: '/garage', icon: 'garage' },
  { label: 'Famille', path: '/family', icon: 'family' },
] as const;

// ---- Result item types for keyboard nav ----
type ResultItem =
  | { kind: 'page'; label: string; path: string; icon: string }
  | { kind: 'vehicle'; label: string; path: string; icon: string; vehicleId: number }
  | { kind: 'expense'; id: number; label: string; sub: string; path: string }
  | { kind: 'reminder'; id: number; label: string; sub: string; path: string };

// ---- Helpers ----
function formatDate(dateStr: string | null) {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

const FUEL_LABELS: Record<string, string> = {
  essence: 'Essence',
  diesel: 'Diesel',
  electric: 'Électrique',
  hybrid: 'Hybride',
  'plug-in-hybrid': 'Hybride rechargeable',
  lpg: 'GPL',
  hydrogen: 'Hydrogène',
};

// ---- Props ----
interface GlobalSearchProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function GlobalSearch({ isOpen, onClose }: GlobalSearchProps) {
  const router = useRouter();
  const { vehicles } = useSelectors();

  const [query, setQuery] = useState('');
  const [apiResults, setApiResults] = useState<ApiResults>({ expenses: [], reminders: [] });
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Scroll-lock background when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = '';
      };
    }
  }, [isOpen]);

  // Reset & focus on open
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setApiResults({ expenses: [], reminders: [] });
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 80);
    }
  }, [isOpen]);

  // Debounced API fetch
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (query.trim().length < 2) {
      setApiResults({ expenses: [], reminders: [] });
      setLoading(false);
      return;
    }

    setLoading(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query.trim())}`);
        if (res.ok) {
          const data = (await res.json()) as ApiResults;
          setApiResults(data);
        }
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  // ---- Build result lists ----
  const q = query.trim().toLowerCase();

  const filteredVehicles = useMemo(
    () =>
      q.length >= 1
        ? vehicles.filter(
            (v) =>
              v.name?.toLowerCase().includes(q) ||
              v.make?.toLowerCase().includes(q) ||
              v.model?.toLowerCase().includes(q),
          )
        : vehicles,
    [q, vehicles],
  );

  const filteredPages = useMemo(
    () => (q.length >= 1 ? PAGES.filter((p) => p.label.toLowerCase().includes(q)) : PAGES),
    [q],
  );

  // Order: Véhicules → Dépenses → Rappels → Navigation
  const items = useMemo<ResultItem[]>(
    () => [
      ...filteredVehicles.map((v) => ({
        kind: 'vehicle' as const,
        label: [v.make, v.model].filter(Boolean).join(' ') || v.name || `Véhicule ${v.vehicle_id}`,
        path: `/garage?vehicleId=${v.vehicle_id}`,
        icon: 'car',
        vehicleId: v.vehicle_id,
      })),
      ...apiResults.expenses.map((e) => ({
        kind: 'expense' as const,
        id: e.id,
        label: e.maintenance_type_label || e.label || e.type,
        sub: [
          e.vehicle_name,
          e.amount != null ? formatCurrency(e.amount) : null,
          formatDate(e.date),
        ]
          .filter(Boolean)
          .join(' · '),
        path: '/expenses',
      })),
      ...apiResults.reminders.map((r) => ({
        kind: 'reminder' as const,
        id: r.id,
        label: r.title,
        sub: r.due_date ? `Échéance : ${formatDate(r.due_date)}` : '',
        path: '/reminders',
      })),
      ...filteredPages.map((p) => ({
        kind: 'page' as const,
        label: p.label,
        path: p.path,
        icon: p.icon,
      })),
    ],
    [filteredVehicles, filteredPages, apiResults],
  );

  // Section boundaries for keyboard nav index
  const vehicleEnd = filteredVehicles.length;
  const expenseEnd = vehicleEnd + apiResults.expenses.length;
  const reminderEnd = expenseEnd + apiResults.reminders.length;

  // Reset selection when results change
  useEffect(() => {
    setSelectedIndex(0);
  }, [items.length, q]);

  const navigate = useCallback(
    (item: ResultItem) => {
      router.push(item.path);
      onClose();
    },
    [router, onClose],
  );

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
        return;
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((i) => (i + 1) % Math.max(items.length, 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(
          (i) => (i - 1 + Math.max(items.length, 1)) % Math.max(items.length, 1),
        );
      } else if (e.key === 'Enter' && items[selectedIndex]) {
        navigate(items[selectedIndex]);
      }
    },
    [items, selectedIndex, navigate, onClose],
  );

  const hasResults = items.length > 0;
  const showEmpty =
    q.length >= 2 &&
    !loading &&
    apiResults.expenses.length === 0 &&
    apiResults.reminders.length === 0 &&
    filteredVehicles.length === 0 &&
    filteredPages.length === 0;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Rechercher" size="md" fullscreenOnMobile>
      {/* Search input — breaks out of Modal's px-6 py-4 padding */}
      <div className="flex items-center gap-3 -mx-6 -mt-4 px-4 py-3 border-b border-gray-100 dark:border-gray-700">
        <Icon name="search" size={18} className="text-gray-400 shrink-0" /> {/* Search icon not working (color not beeing applied) */} 
        <input
          ref={inputRef}
          type="text"
          placeholder="Rechercher un véhicule, une dépense, un rappel…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          className="flex-1 bg-transparent text-sm text-gray-800 dark:text-gray-200 placeholder:text-gray-400 focus:outline-none"
        />
        {loading && (
          <div className="shrink-0">
            <Spinner />
          </div>
        )}
      </div>

      {/* Results */}
      <div className="-mx-6 overflow-y-auto max-h-[50vh] sm:max-h-[55vh]">
        {showEmpty && (
          <div className="px-4 py-10 text-center text-sm text-gray-400">
            Aucun résultat pour &laquo;&nbsp;{query.trim()}&nbsp;&raquo;
          </div>
        )}

        {!showEmpty && q.length < 2 && (
          <div className="px-4 py-10 text-center text-sm text-gray-400">
            Tapez au moins 2 caractères…
          </div>
        )}

        {hasResults && (
          <div className="py-2">
            {/* Véhicules */}
            {filteredVehicles.length > 0 && (
              <Section label="Véhicules">
                {filteredVehicles.map((v, i) => {
                  const label =
                    [v.make, v.model].filter(Boolean).join(' ') ||
                    v.name ||
                    `Véhicule ${v.vehicle_id}`;
                  const fuelLabel = v.fuel_type ? FUEL_LABELS[v.fuel_type] : null;
                  const sub = [
                    v.name !== label ? v.name : null,
                    fuelLabel,
                    v.odometer != null ? `${v.odometer.toLocaleString('fr-FR')} km` : null,
                  ]
                    .filter(Boolean)
                    .join(' · ');
                  return (
                    <ResultRow
                      key={v.vehicle_id}
                      selected={selectedIndex === i}
                      icon="car"
                      label={label}
                      sub={sub || undefined}
                      onMouseEnter={() => setSelectedIndex(i)}
                      onClick={() =>
                        navigate({
                          kind: 'vehicle',
                          label,
                          path: `/garage?vehicleId=${v.vehicle_id}`,
                          icon: 'car',
                          vehicleId: v.vehicle_id,
                        })
                      }
                    />
                  );
                })}
              </Section>
            )}

            {/* Dépenses */}
            {apiResults.expenses.length > 0 && (
              <Section label="Dépenses">
                {apiResults.expenses.map((e, i) => {
                  const idx = vehicleEnd + i;
                  const label = e.maintenance_type_label || e.label || e.type;
                  const sub = [
                    e.vehicle_name,
                    e.amount != null ? formatCurrency(e.amount) : null,
                    formatDate(e.date),
                  ]
                    .filter(Boolean)
                    .join(' · ');
                  return (
                    <ResultRow
                      key={e.id}
                      selected={selectedIndex === idx}
                      icon="euro"
                      label={label}
                      sub={sub}
                      onMouseEnter={() => setSelectedIndex(idx)}
                      onClick={() =>
                        navigate({ kind: 'expense', id: e.id, label, sub, path: '/expenses' })
                      }
                    />
                  );
                })}
              </Section>
            )}

            {/* Rappels */}
            {apiResults.reminders.length > 0 && (
              <Section label="Rappels">
                {apiResults.reminders.map((r, i) => {
                  const idx = expenseEnd + i;
                  const sub = r.due_date ? `Échéance : ${formatDate(r.due_date)}` : '';
                  return (
                    <ResultRow
                      key={r.id}
                      selected={selectedIndex === idx}
                      icon="bell"
                      label={r.title}
                      sub={sub}
                      onMouseEnter={() => setSelectedIndex(idx)}
                      onClick={() =>
                        navigate({
                          kind: 'reminder',
                          id: r.id,
                          label: r.title,
                          sub,
                          path: '/reminders',
                        })
                      }
                    />
                  );
                })}
              </Section>
            )}

            {/* Navigation — en bas */}
            {filteredPages.length > 0 && (
              <Section label="Navigation">
                {filteredPages.map((page, i) => {
                  const idx = reminderEnd + i;
                  return (
                    <ResultRow
                      key={page.path}
                      selected={selectedIndex === idx}
                      icon={page.icon}
                      label={page.label}
                      onMouseEnter={() => setSelectedIndex(idx)}
                      onClick={() =>
                        navigate({
                          kind: 'page',
                          label: page.label,
                          path: page.path,
                          icon: page.icon,
                        })
                      }
                    />
                  );
                })}
              </Section>
            )}
          </div>
        )}
      </div>

      {/* Footer — keyboard hints, desktop only */}
      <div className="hidden sm:flex items-center gap-4 -mx-6 -mb-4 px-4 py-2.5 border-t border-gray-100 dark:border-gray-700 text-[11px] text-gray-400">
        <span>
          <kbd className="font-mono">↑↓</kbd> naviguer
        </span>
        <span>
          <kbd className="font-mono">↵</kbd> ouvrir
        </span>
        <span>
          <kbd className="font-mono">Esc</kbd> fermer
        </span>
      </div>
    </Modal>
  );
}

// ---- Sub-components ----

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-1">
      <p className="px-4 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-gray-400">
        {label}
      </p>
      {children}
    </div>
  );
}

function ResultRow({
  selected,
  icon,
  label,
  sub,
  onMouseEnter,
  onClick,
}: {
  selected: boolean;
  icon: string;
  label: string;
  sub?: string;
  onMouseEnter: () => void;
  onClick: () => void;
}) {
  const rowRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (selected) rowRef.current?.scrollIntoView({ block: 'nearest' });
  }, [selected]);

  return (
    <button
      ref={rowRef}
      className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
        selected
          ? 'bg-custom-1/10 text-custom-1'
          : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
      }`}
      onMouseEnter={onMouseEnter}
      onClick={onClick}
    >
      <Icon name={icon} size={16} className="shrink-0 opacity-70" />
      <span className="flex-1 min-w-0">
        <span className="block text-sm font-medium truncate">{label}</span>
        {sub && <span className="block text-xs text-gray-400 truncate">{sub}</span>}
      </span>
      <Icon name="arrow-back" size={14} className="shrink-0 opacity-40 rotate-180" />
    </button>
  );
}
