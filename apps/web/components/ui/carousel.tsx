'use client';

import * as React from 'react';
import { cn } from '../../lib/utils';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { Button } from './button';

interface CarouselContextType {
  scrollPrev: () => void;
  scrollNext: () => void;
  canScrollPrev: boolean;
  canScrollNext: boolean;
}

const CarouselContext = React.createContext<CarouselContextType>({
  scrollPrev: () => {},
  scrollNext: () => {},
  canScrollPrev: false,
  canScrollNext: false,
});

export function Carousel({
  orientation = 'horizontal',
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & {
  orientation?: 'horizontal' | 'vertical';
}) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [canScrollPrev, setCanScrollPrev] = React.useState(false);
  const [canScrollNext, setCanScrollNext] = React.useState(true);

  const checkScroll = React.useCallback(() => {
    if (!containerRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = containerRef.current;
    setCanScrollPrev(scrollLeft > 0);
    setCanScrollNext(scrollLeft + clientWidth < scrollWidth - 5);
  }, []);

  const scrollPrev = () => {
    if (!containerRef.current) return;
    containerRef.current.scrollBy({ left: -300, behavior: 'smooth' });
    setTimeout(checkScroll, 300);
  };

  const scrollNext = () => {
    if (!containerRef.current) return;
    containerRef.current.scrollBy({ left: 300, behavior: 'smooth' });
    setTimeout(checkScroll, 300);
  };

  return (
    <CarouselContext.Provider
      value={{ scrollPrev, scrollNext, canScrollPrev, canScrollNext }}
    >
      <div
        className={cn('relative w-full overflow-hidden', className)}
        {...props}
      >
        <div
          ref={containerRef}
          onScroll={checkScroll}
          className="flex w-full overflow-x-auto scroll-smooth snap-x snap-mandatory scrollbar-none"
        >
          {children}
        </div>
      </div>
    </CarouselContext.Provider>
  );
}

export function CarouselContent({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('flex -ml-4 w-full', className)} {...props} />;
}

export function CarouselItem({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      role="group"
      aria-roledescription="slide"
      className={cn('min-w-0 shrink-0 grow-0 basis-full pl-4 snap-start', className)}
      {...props}
    />
  );
}

export function CarouselPrevious({
  className,
  ...props
}: React.ComponentProps<typeof Button>) {
  const { scrollPrev, canScrollPrev } = React.useContext(CarouselContext);
  return (
    <Button
      variant="outline"
      size="sm"
      className={cn('absolute left-2 top-1/2 -translate-y-1/2 size-8 rounded-full p-0 shadow-md bg-card/80 backdrop-blur-xs', className)}
      disabled={!canScrollPrev}
      onClick={scrollPrev}
      {...props}
    >
      <ArrowLeft className="size-4" />
      <span className="sr-only">Previous slide</span>
    </Button>
  );
}

export function CarouselNext({
  className,
  ...props
}: React.ComponentProps<typeof Button>) {
  const { scrollNext, canScrollNext } = React.useContext(CarouselContext);
  return (
    <Button
      variant="outline"
      size="sm"
      className={cn('absolute right-2 top-1/2 -translate-y-1/2 size-8 rounded-full p-0 shadow-md bg-card/80 backdrop-blur-xs', className)}
      disabled={!canScrollNext}
      onClick={scrollNext}
      {...props}
    >
      <ArrowRight className="size-4" />
      <span className="sr-only">Next slide</span>
    </Button>
  );
}
