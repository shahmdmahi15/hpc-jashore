'use client';

import * as React from 'react';
import { cva } from 'class-variance-authority';
import { cn } from '../../lib/utils';
import { ChevronDown } from 'lucide-react';

export const navigationMenuTriggerStyle = cva(
  'group inline-flex h-9 w-max items-center justify-center rounded-xl bg-background px-4 py-2 text-sm font-medium transition-colors hover:bg-muted hover:text-accent-foreground focus:bg-muted focus:text-accent-foreground focus:outline-none disabled:pointer-events-none disabled:opacity-50'
);

export function NavigationMenu({
  className,
  children,
  ...props
}: React.ComponentProps<'nav'>) {
  return (
    <nav
      data-slot="navigation-menu"
      className={cn('relative z-10 flex max-w-max flex-1 items-center justify-center', className)}
      {...props}
    >
      {children}
    </nav>
  );
}

export function NavigationMenuList({
  className,
  ...props
}: React.ComponentProps<'ul'>) {
  return (
    <ul
      data-slot="navigation-menu-list"
      className={cn('group flex flex-1 list-none items-center justify-center gap-1', className)}
      {...props}
    />
  );
}

export function NavigationMenuItem({
  className,
  ...props
}: React.ComponentProps<'li'>) {
  return <li data-slot="navigation-menu-item" className={cn('relative', className)} {...props} />;
}

export function NavigationMenuTrigger({
  className,
  children,
  ...props
}: React.ComponentProps<'button'>) {
  return (
    <button
      type="button"
      className={cn(navigationMenuTriggerStyle(), 'gap-1 cursor-pointer', className)}
      {...props}
    >
      {children}
      <ChevronDown className="size-3 text-muted-foreground transition-transform duration-200 group-hover:rotate-180" />
    </button>
  );
}

export function NavigationMenuContent({
  className,
  ...props
}: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="navigation-menu-content"
      className={cn(
        'absolute left-0 top-full mt-1.5 w-auto rounded-2xl border border-border bg-card p-3 shadow-xl animate-in fade-in-50',
        className
      )}
      {...props}
    />
  );
}

export function NavigationMenuLink({
  className,
  ...props
}: React.ComponentProps<'a'>) {
  return (
    <a
      data-slot="navigation-menu-link"
      className={cn(
        'block select-none space-y-1 rounded-xl p-3 leading-none no-underline outline-none transition-colors hover:bg-muted hover:text-accent-foreground',
        className
      )}
      {...props}
    />
  );
}
