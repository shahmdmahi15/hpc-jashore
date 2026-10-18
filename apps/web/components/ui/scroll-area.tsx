// apps/web/components/ui/scroll-area.tsx
'use client';

import * as React from 'react';
import { cn } from '../../lib/utils';

export const ScrollArea = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { orientation?: 'vertical' | 'horizontal' | 'both' }
>(({ className, children, orientation = 'vertical', ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={cn(
        'relative overflow-auto scrollbar-thin scrollbar-thumb-muted-foreground/20 scrollbar-track-transparent',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
});
ScrollArea.displayName = 'ScrollArea';
