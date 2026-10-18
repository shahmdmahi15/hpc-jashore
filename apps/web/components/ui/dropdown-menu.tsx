// apps/web/components/ui/dropdown-menu.tsx
'use client';

import * as React from 'react';
import { cn } from '../../lib/utils';
import { Check, ChevronRight, Circle } from 'lucide-react';

interface DropdownContextType {
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

const DropdownContext = React.createContext<DropdownContextType>({
  open: false,
  setOpen: () => {},
});

export function DropdownMenu({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [open]);

  return (
    <DropdownContext.Provider value={{ open, setOpen }}>
      <div ref={containerRef} className="relative inline-block text-left">
        {children}
      </div>
    </DropdownContext.Provider>
  );
}

export const DropdownMenuTrigger = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & { asChild?: boolean }
>(({ className, children, onClick, ...props }, ref) => {
  const { open, setOpen } = React.useContext(DropdownContext);
  return (
    <button
      ref={ref}
      type="button"
      aria-haspopup="menu"
      aria-expanded={open}
      onClick={(e) => {
        setOpen((prev) => !prev);
        onClick?.(e);
      }}
      className={cn('inline-flex items-center justify-center cursor-pointer', className)}
      {...props}
    >
      {children}
    </button>
  );
});
DropdownMenuTrigger.displayName = 'DropdownMenuTrigger';

export const DropdownMenuContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { align?: 'start' | 'center' | 'end'; sideOffset?: number }
>(({ className, align = 'end', sideOffset = 4, children, ...props }, ref) => {
  const { open } = React.useContext(DropdownContext);
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
      role="menu"
      style={{ marginTop: sideOffset }}
      className={cn(
        'absolute z-50 min-w-[8rem] overflow-hidden rounded-2xl border border-border bg-popover p-1.5 text-popover-foreground shadow-xl backdrop-blur-xl animate-in fade-in zoom-in-95',
        alignClass,
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
});
DropdownMenuContent.displayName = 'DropdownMenuContent';

export const DropdownMenuItem = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { inset?: boolean; disabled?: boolean }
>(({ className, inset, disabled, onClick, children, ...props }, ref) => {
  const { setOpen } = React.useContext(DropdownContext);
  return (
    <div
      ref={ref}
      role="menuitem"
      aria-disabled={disabled}
      onClick={(e) => {
        if (disabled) return;
        onClick?.(e);
        setOpen(false);
      }}
      className={cn(
        'relative flex cursor-pointer select-none items-center gap-2 rounded-xl px-2.5 py-1.5 text-xs sm:text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground active:scale-[0.99]',
        inset && 'pl-8',
        disabled && 'pointer-events-none opacity-50',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
});
DropdownMenuItem.displayName = 'DropdownMenuItem';

export const DropdownMenuLabel = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { inset?: boolean }
>(({ className, inset, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('px-2.5 py-1 text-xs font-bold text-muted-foreground', inset && 'pl-8', className)}
    {...props}
  />
));
DropdownMenuLabel.displayName = 'DropdownMenuLabel';

export const DropdownMenuSeparator = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn('-mx-1 my-1 h-px bg-border', className)} {...props} />
));
DropdownMenuSeparator.displayName = 'DropdownMenuSeparator';
