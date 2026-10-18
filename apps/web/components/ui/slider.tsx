// apps/web/components/ui/slider.tsx
'use client';

import * as React from 'react';
import { cn } from '../../lib/utils';

interface SliderProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'defaultValue'> {
  value?: number[] | number;
  defaultValue?: number[] | number;
  onValueChange?: (value: any) => void;
  min?: number;
  max?: number;
  step?: number;
}

export const Slider = React.forwardRef<HTMLInputElement, SliderProps>(
  ({ className, min = 0, max = 100, step = 1, value, defaultValue, onValueChange, ...props }, ref) => {
    const rawVal = Array.isArray(value) ? value[0] : value;
    const rawDef = Array.isArray(defaultValue) ? defaultValue[0] : defaultValue;
    const currentValue = rawVal ?? rawDef ?? min;

    const percentage = Math.min(100, Math.max(0, ((currentValue - min) / (max - min)) * 100));

    return (
      <div className={cn('relative flex w-full touch-none select-none items-center py-1', className)}>
        <div className="relative h-2 w-full grow overflow-hidden rounded-full bg-secondary">
          <div
            className="absolute h-full bg-emerald-500 rounded-full transition-all"
            style={{ width: `${percentage}%` }}
          />
        </div>
        <input
          ref={ref}
          type="range"
          min={min}
          max={max}
          step={step}
          value={currentValue}
          onChange={(e) => onValueChange?.([parseFloat(e.target.value)])}
          className="absolute inset-0 w-full opacity-0 cursor-pointer"
          {...props}
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute block size-5 rounded-full border-2 border-emerald-500 bg-background ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 -translate-x-1/2 shadow-md"
          style={{ left: `${percentage}%` }}
        />
      </div>
    );
  },
);
Slider.displayName = 'Slider';
