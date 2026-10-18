// apps/web/components/ui/toggle.tsx
'use client';

import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/utils';

export const toggleVariants = cva(
  'inline-flex items-center justify-center rounded-xl text-xs sm:text-sm font-semibold transition-colors hover:bg-muted hover:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 cursor-pointer active:scale-95',
  {
    variants: {
      variant: {
        default: 'bg-transparent',
        outline: 'border border-input bg-transparent hover:bg-accent hover:text-accent-foreground',
      },
      size: {
        default: 'h-9 px-3',
        sm: 'h-8 px-2',
        lg: 'h-10 px-3',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

export const Toggle = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> &
    VariantProps<typeof toggleVariants> & {
      pressed?: boolean;
      defaultPressed?: boolean;
      onPressedChange?: (pressed: boolean) => void;
    }
>(({ className, variant, size, pressed: controlledPressed, defaultPressed = false, onPressedChange, onClick, ...props }, ref) => {
  const [uncontrolledPressed, setUncontrolledPressed] = React.useState(defaultPressed);
  const isControlled = controlledPressed !== undefined;
  const isPressed = isControlled ? controlledPressed : uncontrolledPressed;

  return (
    <button
      ref={ref}
      type="button"
      aria-pressed={isPressed}
      onClick={(e) => {
        if (!isControlled) setUncontrolledPressed(!isPressed);
        onPressedChange?.(!isPressed);
        onClick?.(e);
      }}
      className={cn(
        toggleVariants({ variant, size }),
        isPressed && 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
        className,
      )}
      {...props}
    />
  );
});
Toggle.displayName = 'Toggle';
