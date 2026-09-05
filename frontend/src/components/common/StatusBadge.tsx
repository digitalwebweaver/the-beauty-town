import { Badge } from '@/components/ui/badge';
import { STATUS_LABEL, STATUS_STYLES } from '@/lib/appointmentStatus';
import type { AppointmentStatus } from '@/types';

function StatusBadge({ status }: { status: AppointmentStatus }) {
  return (
    <Badge variant="secondary" className={STATUS_STYLES[status]}>
      {STATUS_LABEL[status]}
    </Badge>
  );
}

export default StatusBadge;
