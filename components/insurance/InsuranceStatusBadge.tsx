import { getInsuranceBadge } from '@/lib/utils/insuranceUtils';

import type { BadgeTone, VehicleInsuranceStatus } from '@/lib/utils/insuranceUtils';

const TONE_CLASSES: Record<BadgeTone, string> = {
  success: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400',
  warning: 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400',
  info: 'bg-sky-50 text-sky-700 dark:bg-sky-900/20 dark:text-sky-400',
  danger: 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400',
  neutral: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
};

interface InsuranceStatusBadgeProps {
  status: VehicleInsuranceStatus;
  vehicleActive: boolean;
}

/** Vehicle insurance status badge, shared by /insurance and the garage detail. */
export default function InsuranceStatusBadge({ status, vehicleActive }: InsuranceStatusBadgeProps) {
  const { label, tone } = getInsuranceBadge(status, vehicleActive);
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold whitespace-nowrap ${TONE_CLASSES[tone]}`}
    >
      {label}
    </span>
  );
}
