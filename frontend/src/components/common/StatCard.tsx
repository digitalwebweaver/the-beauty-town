import type { LucideIcon } from 'lucide-react';
import { ArrowDown, ArrowUp } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface StatCardProps {
  label: string;
  value: string;
  delta?: string;
  trend?: 'up' | 'down' | 'flat';
  icon?: LucideIcon;
}

function StatCard({ label, value, delta, trend, icon: Icon }: StatCardProps) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className="mt-1 text-2xl font-bold">{value}</p>
          </div>
          {Icon && (
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Icon className="h-5 w-5" />
            </div>
          )}
        </div>
        {delta && (
          <div
            className={cn(
              'mt-3 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium',
              trend === 'up' && 'bg-emerald-500/10 text-emerald-600',
              trend === 'down' && 'bg-red-500/10 text-red-600',
              trend === 'flat' && 'bg-muted text-muted-foreground'
            )}
          >
            {trend === 'up' && <ArrowUp className="h-3 w-3" />}
            {trend === 'down' && <ArrowDown className="h-3 w-3" />}
            {delta}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default StatCard;
