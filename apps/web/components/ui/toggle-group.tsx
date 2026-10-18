// apps/web/components/ui/toggle-group.tsx
'use client';

import * as React from 'react';
import { type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/utils';
import { Toggle, toggleVariants } from './toggle';

interface ToggleGroupContextType {
  size?: VariantProps<typeof toggleVariants>['size'];
  variant?: VariantProps<typeof toggleVariants>['variant'];
  value?: string | string[];
  onItemClick?: (value: string) => void;
}

const ToggleGroupContext = React.createContext<ToggleGroupContextType>({});

export const ToggleGroup = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    type?: 'single' | 'multiple';
    value?: string | string[];
    defaultValue?: string | string[];
    onValueChange?: (value: any) => void;
    size?: VariantProps<typeof toggleVariants>['size'];
    variant?: VariantProps<typeof toggleVariants>['variant'];
  }
>(({ className, variant, size, children, type = 'single', value: controlledVal, defaultValue, onValueChange, ...props }, ref) => {
  const [uncontrolledVal, setUncontrolledVal] = React.useState(defaultValue || (type === 'multiple' ? [] : ''));
  const isControlled = controlledVal !== undefined;
  const currentVal = isControlled ? controlledVal : uncontrolledVal;

  const handleItemClick = (itemValue: string) => {
    if (type === 'single') {
      const next = currentVal === itemValue ? '' : itemValue;
      if (!isControlled) setUncontrolledVal(next);
      onValueChange?.(next);
    } else {
      const arr = Array.isArray(currentVal) ? currentVal : [];
      const next = arr.includes(itemValue) ? arr.filter((v) => v !== itemValue) : [...arr, itemValue];
      if (!isControlled) setUncontrolledVal(next);
      onValueChange?.(next);
    }
  };

  return (
    <ToggleGroupContext.Provider value={{ variant, size, value: currentVal, onItemClick: handleItemClick }}>
      <div ref={ref} role="group" className={cn('flex items-center justify-center gap-1', className)} {...props}>
        {children}
      </div>
    </ToggleGroupContext.Provider>
  );
});
ToggleGroup.displayName = 'ToggleGroup';

export const ToggleGroupItem = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & { value: string }
>(({ className, value, children, ...props }, ref) => {
  const context = React.useContext(ToggleGroupContext);
  const isPressed = Array.isArray(context.value)
    ? context.value.includes(value)
    : context.value === value;

  return (
    <Toggle
      ref={ref}
      variant={context.variant}
      size={context.size}
      pressed={isPressed}
      onClick={() => context.onItemClick?.(value)}
      className={cn(className)}
      {...props}
    >
      {children}
    </Toggle>
  );
});
ToggleGroupItem.displayName = 'ToggleGroupItem';
