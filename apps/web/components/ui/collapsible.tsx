// apps/web/components/ui/collapsible.tsx
'use client';

import * as React from 'react';
import { cn } from '../../lib/utils';

interface CollapsibleContextType {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const CollapsibleContext = React.createContext<CollapsibleContextType>({
  open: false,
  onOpenChange: () => {},
});

export const Collapsible = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    open?: boolean;
    defaultOpen?: boolean;
    onOpenChange?: (open: boolean) => void;
  }
>(({ open: controlledOpen, defaultOpen = false, onOpenChange, className, children, ...props }, ref) => {
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(defaultOpen);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : uncontrolledOpen;

  const handleOpenChange = (nextOpen: boolean) => {
    if (!isControlled) setUncontrolledOpen(nextOpen);
    onOpenChange?.(nextOpen);
  };

  return (
    <CollapsibleContext.Provider value={{ open, onOpenChange: handleOpenChange }}>
      <div ref={ref} className={cn('w-full', className)} {...props}>
        {children}
      </div>
    </CollapsibleContext.Provider>
  );
});
Collapsible.displayName = 'Collapsible';

export const CollapsibleTrigger = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement>
>(({ className, onClick, children, ...props }, ref) => {
  const { open, onOpenChange } = React.useContext(CollapsibleContext);
  return (
    <button
      ref={ref}
      type="button"
      aria-expanded={open}
      onClick={(e) => {
        onOpenChange(!open);
        onClick?.(e);
      }}
      className={cn('cursor-pointer select-none transition-all', className)}
      {...props}
    >
      {children}
    </button>
  );
});
CollapsibleTrigger.displayName = 'CollapsibleTrigger';

export const CollapsibleContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, children, ...props }, ref) => {
  const { open } = React.useContext(CollapsibleContext);
  if (!open) return null;

  return (
    <div
      ref={ref}
      className={cn('overflow-hidden transition-all animate-in fade-in', className)}
      {...props}
    >
      {children}
    </div>
  );
});
CollapsibleContent.displayName = 'CollapsibleContent';
