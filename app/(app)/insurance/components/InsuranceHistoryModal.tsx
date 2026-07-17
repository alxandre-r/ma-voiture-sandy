import { Modal } from '@/components/common/ui/Modal';

import InsuranceHistoryList from './InsuranceHistoryList';

import type { InsuranceContract } from '@/types/insurance';
import type { Vehicle } from '@/types/vehicle';

interface InsuranceHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  vehicle: Vehicle | null;
  contracts: InsuranceContract[];
  onEdit?: (contract: InsuranceContract) => void;
  onDelete?: (contract: InsuranceContract) => void;
}

export default function InsuranceHistoryModal({
  isOpen,
  onClose,
  vehicle,
  contracts,
  onEdit,
  onDelete,
}: InsuranceHistoryModalProps) {
  const vehicleName = vehicle
    ? (vehicle.name ?? `${vehicle.make ?? ''} ${vehicle.model ?? ''}`.trim())
    : '';

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Historique — ${vehicleName}`} size="sm">
      <InsuranceHistoryList contracts={contracts} onEdit={onEdit} onDelete={onDelete} />
    </Modal>
  );
}
