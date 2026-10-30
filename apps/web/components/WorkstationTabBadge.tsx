// apps/web/components/WorkstationTabBadge.tsx
'use client';

import React from 'react';
import { cn } from '../lib/utils';

export interface WorkstationTabBadgeProps {
  count?: number;
  pulse?: boolean;
  color?: 'emerald' | 'rose' | 'amber' | 'blue' | 'purple';
  className?: string;
  maxDisplay?: number;
}

export function WorkstationTabBadge({
  count = 0,
  pulse = true,
  color = 'rose',
  className,
  maxDisplay = 99,
}: WorkstationTabBadgeProps) {
  if (count <= 0) return null;

  const colorStyles = {
    rose: {
      ping: 'bg-rose-400',
      badge: 'bg-rose-500 text-white',
    },
    emerald: {
      ping: 'bg-emerald-400',
      badge: 'bg-emerald-500 text-white',
    },
    amber: {
      ping: 'bg-amber-400',
      badge: 'bg-amber-500 text-white',
    },
    blue: {
      ping: 'bg-blue-400',
      badge: 'bg-blue-500 text-white',
    },
    purple: {
      ping: 'bg-purple-400',
      badge: 'bg-purple-500 text-white',
    },
  }[color];

  const displayCount = count > maxDisplay ? `${maxDisplay}+` : String(count);

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 ml-1 select-none pointer-events-none',
        className,
      )}
    >
      {pulse && (
        <span className="relative flex h-2 w-2">
          <span
            className={cn(
              'animate-ping absolute inline-flex h-full w-full rounded-full opacity-75',
              colorStyles.ping,
            )}
          />
          <span
            className={cn(
              'relative inline-flex rounded-full h-2 w-2',
              colorStyles.badge,
            )}
          />
        </span>
      )}
      <span
        className={cn(
          'px-1.5 py-0.5 text-[9px] font-black rounded-full font-mono leading-none shadow-xs',
          colorStyles.badge,
        )}
      >
        {displayCount}
      </span>
    </span>
  );
}

export default WorkstationTabBadge;
