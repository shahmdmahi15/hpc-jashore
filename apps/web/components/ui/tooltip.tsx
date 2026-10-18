'use client';

import * as React from 'react';
import { cn } from '../../lib/utils';

export interface TooltipProps {
  content: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export function Tooltip({ content, children, className }: TooltipProps) {
  const [visible, setVisible] = React.useState(false);

  return (
    <div
      className="relative inline-flex"
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
      onFocus={() => setVisible(true)}
      onBlur={() => setVisible(false)}
    >
      {children}
      {visible && (
        <div
          className={cn(
            'absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 overflow-hidden rounded-lg bg-zinc-900 px-3 py-1.5 text-xs text-white shadow-md animate-in fade-in zoom-in-95 pointer-events-none whitespace-nowrap dark:bg-zinc-100 dark:text-zinc-950 font-medium',
            className
          )}
        >
          {content}
        </div>
      )}
    </div>
  );
}
