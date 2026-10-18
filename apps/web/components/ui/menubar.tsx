'use client';

import * as React from 'react';
import { cn } from '../../lib/utils';

export function Menubar({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      role="menubar"
      data-slot="menubar"
      className={cn(
        'flex h-9 items-center gap-1 rounded-xl border border-border bg-card p-1 text-sm shadow-2xs',
        className
      )}
      {...props}
    />
  );
}

export function MenubarMenu({ className, ...props }: React.ComponentProps<'div'>) {
  return <div data-slot="menubar-menu" className={cn('relative inline-block', className)} {...props} />;
}

export function MenubarTrigger({
  className,
  ...props
}: React.ComponentProps<'button'>) {
  return (
    <button
      type="button"
      role="menuitem"
      data-slot="menubar-trigger"
      className={cn(
        'flex items-center rounded-lg px-2.5 py-1 text-xs font-medium text-foreground hover:bg-muted focus:bg-muted outline-none transition-colors cursor-pointer',
        className
      )}
      {...props}
    />
  );
}

export function MenubarContent({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="menubar-content"
      className={cn(
        'z-50 min-w-48 overflow-hidden rounded-xl border border-border bg-card p-1 text-card-foreground shadow-lg animate-in fade-in-80',
        className
      )}
      {...props}
    />
  );
}

export function MenubarItem({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      role="menuitem"
      data-slot="menubar-item"
      className={cn(
        'relative flex items-center rounded-lg px-2 py-1.5 text-xs outline-none select-none hover:bg-muted cursor-pointer transition-colors',
        className
      )}
      {...props}
    />
  );
}

export function MenubarSeparator({ className, ...props }: React.ComponentProps<'div'>) {
  return <div className={cn('-mx-1 my-1 h-px bg-border', className)} {...props} />;
}

export function MenubarShortcut({ className, ...props }: React.ComponentProps<'span'>) {
  return (
    <span
      className={cn('ml-auto text-2xs tracking-widest text-muted-foreground', className)}
      {...props}
    />
  );
}
