// apps/web/components/ui/hover-card.tsx
'use client';

import * as React from 'react';
import { cn } from '../../lib/utils';

interface HoverCardContextType {
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

const HoverCardContext = React.createContext<HoverCardContextType>({
  open: false,
  setOpen: () => {},
});

export function HoverCard({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = React.useState(false);
  const timeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleMouseEnter = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setOpen(true);
  };

  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => {
      setOpen(false);
    }, 150);
  };

  return (
    <HoverCardContext.Provider value={{ open, setOpen }}>
      <div
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className="relative inline-block"
      >
        {children}
      </div>
    </HoverCardContext.Provider>
  );
}

export const HoverCardTrigger = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, children, ...props }, ref) => (
  <div ref={ref} className={cn('inline-block cursor-pointer', className)} {...props}>
    {children}
  </div>
));
HoverCardTrigger.displayName = 'HoverCardTrigger';

export const HoverCardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { align?: 'start' | 'center' | 'end' }
>(({ className, align = 'center', children, ...props }, ref) => {
  const { open } = React.useContext(HoverCardContext);
  if (!open) return null;

  const alignClass =
    align === 'start'
      ? 'left-0'
      : align === 'center'
      ? 'left-1/2 -translate-x-1/2'
      : 'right-0';

  return (
    <div
      ref={ref}
      className={cn(
        'absolute z-50 mt-2 w-64 rounded-2xl border border-border bg-popover p-4 text-popover-foreground shadow-xl outline-none backdrop-blur-xl animate-in fade-in zoom-in-95',
        alignClass,
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
});
HoverCardContent.displayName = 'HoverCardContent';
