'use client';

import * as React from 'react';
import { cn } from '../../lib/utils';

interface ContextMenuContextType {
  open: boolean;
  position: { x: number; y: number };
  setOpen: (open: boolean) => void;
  setPosition: (pos: { x: number; y: number }) => void;
}

const ContextMenuContext = React.createContext<ContextMenuContextType>({
  open: false,
  position: { x: 0, y: 0 },
  setOpen: () => {},
  setPosition: () => {},
});

export function ContextMenu({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = React.useState(false);
  const [position, setPosition] = React.useState({ x: 0, y: 0 });

  return (
    <ContextMenuContext.Provider value={{ open, position, setOpen, setPosition }}>
      {children}
    </ContextMenuContext.Provider>
  );
}

export function ContextMenuTrigger({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  const { setOpen, setPosition } = React.useContext(ContextMenuContext);

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    setPosition({ x: e.clientX, y: e.clientY });
    setOpen(true);
  };

  return (
    <div
      className={className}
      onContextMenu={handleContextMenu}
      {...props}
    >
      {children}
    </div>
  );
}

export function ContextMenuContent({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  const { open, position, setOpen } = React.useContext(ContextMenuContext);

  if (!open) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-50 bg-transparent"
        onClick={() => setOpen(false)}
        onContextMenu={(e) => {
          e.preventDefault();
          setOpen(false);
        }}
      />
      <div
        style={{ top: position.y, left: position.x }}
        className={cn(
          'fixed z-50 min-w-40 overflow-hidden rounded-xl border border-border bg-card p-1 text-card-foreground shadow-xl animate-in fade-in-80 text-xs',
          className
        )}
        {...props}
      >
        {children}
      </div>
    </>
  );
}

export function ContextMenuItem({
  className,
  onClick,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  const { setOpen } = React.useContext(ContextMenuContext);

  return (
    <div
      role="menuitem"
      className={cn(
        'relative flex items-center rounded-lg px-2.5 py-1.5 outline-none select-none hover:bg-muted cursor-pointer transition-colors font-medium',
        className
      )}
      onClick={(e) => {
        onClick?.(e);
        setOpen(false);
      }}
      {...props}
    />
  );
}

export function ContextMenuSeparator({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('-mx-1 my-1 h-px bg-border', className)} {...props} />;
}
