'use client';

import * as React from 'react';
import { cn } from '../../lib/utils';

interface PopoverProps {
  trigger: React.ReactNode;
  children: React.ReactNode;
  align?: 'left' | 'right' | 'center';
  className?: string;
}

export function Popover({ trigger, children, align = 'center', className }: PopoverProps) {
  const [open, setOpen] = React.useState(false);
  const popoverRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  const alignClass = {
    left: 'left-0',
    right: 'right-0',
    center: 'left-1/2 -translate-x-1/2',
  }[align];

  return (
    <div className="relative inline-block" ref={popoverRef}>
      <div onClick={() => setOpen(!open)} className="cursor-pointer">
        {trigger}
      </div>
      {open && (
        <div
          className={cn(
            'absolute top-full mt-2 z-50 w-72 rounded-2xl border border-border bg-card p-4 text-foreground shadow-xl outline-none animate-in fade-in zoom-in-95',
            alignClass,
            className
          )}
        >
          {children}
        </div>
      )}
    </div>
  );
}
