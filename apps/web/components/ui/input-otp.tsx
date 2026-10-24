'use client';

import * as React from 'react';
import { cn } from '../../lib/utils';
import { Minus } from 'lucide-react';

interface InputOTPProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  maxLength?: number;
  value?: string;
  onChange?: (val: string) => void;
  children?: React.ReactNode;
}

const InputOTPContext = React.createContext<{
  value: string;
  maxLength: number;
}>({
  value: '',
  maxLength: 6,
});

function InputOTP({
  className,
  maxLength = 6,
  value = '',
  onChange,
  children,
  ...props
}: InputOTPProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.slice(0, maxLength);
    onChange?.(val);
  };

  return (
    <InputOTPContext.Provider value={{ value, maxLength }}>
      <div className={cn('relative flex items-center gap-2', className)}>
        <input
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={maxLength}
          value={value}
          onChange={handleChange}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
          data-lpignore="true"
          className="absolute inset-0 z-10 opacity-0 cursor-pointer"
          {...props}
        />
        {children}
      </div>
    </InputOTPContext.Provider>
  );
}

function InputOTPGroup({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="input-otp-group"
      className={cn('flex items-center gap-1.5', className)}
      {...props}
    />
  );
}

function InputOTPSlot({
  index,
  className,
  ...props
}: React.ComponentProps<'div'> & { index: number }) {
  const { value } = React.useContext(InputOTPContext);
  const char = value[index] || '';
  const isActive = value.length === index;

  return (
    <div
      data-slot="input-otp-slot"
      className={cn(
        'relative flex size-10 items-center justify-center rounded-xl border border-input bg-card text-sm font-semibold shadow-2xs transition-all',
        isActive && 'border-emerald-500 ring-2 ring-emerald-500/20',
        className
      )}
      {...props}
    >
      {char}
      {isActive && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center animate-pulse">
          <div className="h-4 w-px bg-foreground" />
        </div>
      )}
    </div>
  );
}

function InputOTPSeparator({ ...props }: React.ComponentProps<'div'>) {
  return (
    <div data-slot="input-otp-separator" role="separator" {...props}>
      <Minus className="size-4 text-muted-foreground" />
    </div>
  );
}

export { InputOTP, InputOTPGroup, InputOTPSlot, InputOTPSeparator };
