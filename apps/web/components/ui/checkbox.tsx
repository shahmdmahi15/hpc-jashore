import * as React from 'react';
import { cn } from '../../lib/utils';
import { Check } from 'lucide-react';

export interface CheckboxProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
}

const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, label, checked, onChange, disabled, ...props }, ref) => {
    return (
      <label className="inline-flex items-center gap-2 cursor-pointer select-none">
        <div className="relative flex items-center justify-center">
          <input
            type="checkbox"
            className="sr-only peer"
            checked={checked}
            onChange={onChange}
            disabled={disabled}
            ref={ref}
            {...props}
          />
          <div
            className={cn(
              'size-4 rounded-md border border-border bg-card transition-all flex items-center justify-center',
              'peer-checked:bg-emerald-600 peer-checked:border-emerald-600 peer-checked:text-white',
              'peer-focus-visible:ring-2 peer-focus-visible:ring-emerald-500/20',
              disabled && 'opacity-50 cursor-not-allowed',
              className
            )}
          >
            {checked && <Check className="size-3 stroke-[3]" />}
          </div>
        </div>
        {label && <span className="text-sm font-medium text-foreground">{label}</span>}
      </label>
    );
  }
);
Checkbox.displayName = 'Checkbox';

export { Checkbox };
