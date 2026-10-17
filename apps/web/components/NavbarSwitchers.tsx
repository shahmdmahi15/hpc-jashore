// apps/web/components/NavbarSwitchers.tsx
'use client';

import React from 'react';
import { ThemeToggle } from './theme-toggle';
import { LanguageToggle } from '../lib/i18n';
import { cn } from '../lib/utils';

export function NavbarSwitchers({ className }: { className?: string }) {
  return (
    <div className={cn('flex items-center gap-1.5 sm:gap-2 shrink-0', className)}>
      <LanguageToggle />
      <ThemeToggle />
    </div>
  );
}

export default NavbarSwitchers;
