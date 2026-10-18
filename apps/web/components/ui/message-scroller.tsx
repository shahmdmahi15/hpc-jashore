'use client';

import * as React from 'react';
import { cn } from '../../lib/utils';
import { Button } from './button';
import { ArrowDown } from 'lucide-react';

export function MessageScrollerProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

export function MessageScroller({
  className,
  children,
  ...props
}: React.ComponentProps<'div'>) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [showScrollBottom, setShowScrollBottom] = React.useState(false);

  const handleScroll = () => {
    if (!containerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
    setShowScrollBottom(scrollHeight - scrollTop - clientHeight > 100);
  };

  const scrollToBottom = () => {
    if (!containerRef.current) return;
    containerRef.current.scrollTo({
      top: containerRef.current.scrollHeight,
      behavior: 'smooth',
    });
  };

  return (
    <div
      data-slot="message-scroller"
      className={cn('relative flex size-full min-h-0 flex-col overflow-hidden', className)}
      {...props}
    >
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto p-4 space-y-4"
      >
        {children}
      </div>

      {showScrollBottom && (
        <Button
          size="sm"
          variant="outline"
          className="absolute bottom-4 right-4 size-8 rounded-full p-0 shadow-md bg-card/80 backdrop-blur-xs"
          onClick={scrollToBottom}
        >
          <ArrowDown className="size-4" />
          <span className="sr-only">Scroll to bottom</span>
        </Button>
      )}
    </div>
  );
}

export function MessageScrollerViewport({
  className,
  ...props
}: React.ComponentProps<'div'>) {
  return <div className={cn('flex flex-col gap-2', className)} {...props} />;
}
