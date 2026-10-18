'use client';

import * as React from 'react';
import { cn } from '../../lib/utils';
import { GripVertical } from 'lucide-react';

interface ResizablePanelGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  direction?: 'horizontal' | 'vertical';
}

function ResizablePanelGroup({
  className,
  direction = 'horizontal',
  ...props
}: ResizablePanelGroupProps) {
  return (
    <div
      data-slot="resizable-panel-group"
      className={cn(
        'flex h-full w-full',
        direction === 'vertical' ? 'flex-col' : 'flex-row',
        className
      )}
      {...props}
    />
  );
}

interface ResizablePanelProps extends React.HTMLAttributes<HTMLDivElement> {
  defaultSize?: number;
}

function ResizablePanel({
  className,
  defaultSize,
  style,
  ...props
}: ResizablePanelProps) {
  return (
    <div
      data-slot="resizable-panel"
      className={cn('flex-1 overflow-auto min-w-0 min-h-0', className)}
      style={{
        flexGrow: defaultSize ? defaultSize / 100 : 1,
        ...style,
      }}
      {...props}
    />
  );
}

function ResizableHandle({
  withHandle,
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & {
  withHandle?: boolean;
}) {
  return (
    <div
      data-slot="resizable-handle"
      className={cn(
        'relative flex w-px items-center justify-center bg-border transition-colors hover:bg-emerald-500',
        className
      )}
      {...props}
    >
      {withHandle && (
        <div className="z-10 flex h-4 w-3 items-center justify-center rounded-xs border border-border bg-card">
          <GripVertical className="size-2.5 text-muted-foreground" />
        </div>
      )}
    </div>
  );
}

export { ResizablePanelGroup, ResizablePanel, ResizableHandle };
