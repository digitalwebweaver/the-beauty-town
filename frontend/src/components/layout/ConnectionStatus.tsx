import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { cn } from '@/lib/utils';

const LABEL: Record<'online' | 'offline' | 'checking', string> = {
  online: 'Online',
  offline: 'Offline',
  checking: 'Checking…',
};

const DOT_CLASS: Record<'online' | 'offline' | 'checking', string> = {
  online: 'bg-emerald-500',
  offline: 'bg-destructive',
  checking: 'bg-amber-500',
};

interface ConnectionStatusProps {
  className?: string;
}

function ConnectionStatus({ className }: ConnectionStatusProps) {
  const { status } = useOnlineStatus();

  return (
    <div
      className={cn('flex items-center gap-1.5 text-xs font-medium', className)}
      title={
        status === 'offline'
          ? "Can't reach the server — check your connection"
          : status === 'checking'
            ? 'Checking connection…'
            : 'Connected'
      }
    >
      <span className="relative flex h-2 w-2">
        {status === 'online' && (
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
        )}
        <span className={cn('relative inline-flex h-2 w-2 rounded-full', DOT_CLASS[status])} />
      </span>
      <span className="hidden sm:inline">{LABEL[status]}</span>
    </div>
  );
}

export default ConnectionStatus;
