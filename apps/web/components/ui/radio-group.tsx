// apps/web/components/ui/radio-group.tsx
'use client';

import * as React from 'react';
import { cn } from '../../lib/utils';
import { Circle } from 'lucide-react';

interface RadioGroupContextType {
  value?: string;
  onChange?: (value: string) => void;
  name?: string;
}

const RadioGroupContext = React.createContext<RadioGroupContextType>({});

export const RadioGroup = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    value?: string;
    defaultValue?: string;
    onValueChange?: (value: string) => void;
    name?: string;
  }
>(({ className, value: controlledValue, defaultValue, onValueChange, name, children, ...props }, ref) => {
  const [uncontrolledValue, setUncontrolledValue] = React.useState(defaultValue || '');
  const isControlled = controlledValue !== undefined;
  const currentValue = isControlled ? controlledValue : uncontrolledValue;

  const handleChange = (val: string) => {
    if (!isControlled) {
      setUncontrolledValue(val);
    }
    onValueChange?.(val);
  };

  return (
    <RadioGroupContext.Provider value={{ value: currentValue, onChange: handleChange, name }}>
      <div ref={ref} role="radiogroup" className={cn('grid gap-2', className)} {...props}>
        {children}
      </div>
    </RadioGroupContext.Provider>
  );
});
RadioGroup.displayName = 'RadioGroup';

export const RadioGroupItem = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & { value: string }
>(({ className, value, id, disabled, ...props }, ref) => {
  const context = React.useContext(RadioGroupContext);
  const checked = context.value === value;

  return (
    <button
      ref={ref}
      type="button"
      role="radio"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => context.onChange?.(value)}
      className={cn(
        'aspect-square size-4 rounded-full border border-primary text-primary ring-offset-background focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 inline-flex items-center justify-center transition-all cursor-pointer',
        checked && 'border-emerald-500 bg-emerald-500/10 text-emerald-500',
        className,
      )}
      {...props}
    >
      {checked && <Circle className="size-2 fill-current text-current" />}
    </button>
  );
});
RadioGroupItem.displayName = 'RadioGroupItem';
