import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-semibold transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 select-none cursor-pointer active:scale-[0.98]',
  {
    variants: {
      variant: {
        default:
          'bg-emerald-600 text-white shadow-sm hover:bg-emerald-500 active:bg-emerald-700 dark:bg-emerald-500 dark:text-black dark:hover:bg-emerald-400',
        destructive:
          'bg-red-600 text-white shadow-sm hover:bg-red-500 active:bg-red-700 dark:bg-red-700 dark:hover:bg-red-600',
        outline:
          'border border-zinc-200 dark:border-zinc-800 bg-transparent hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-zinc-800/80 dark:hover:text-white',
        secondary:
          'bg-zinc-100 text-zinc-900 hover:bg-zinc-200/80 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700',
        ghost:
          'hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-zinc-800/80 dark:hover:text-white',
        link: 'text-emerald-600 dark:text-emerald-400 underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-9 px-4 py-2',
        sm: 'h-8 rounded-md px-3 text-xs',
        lg: 'h-11 rounded-lg px-6 text-base',
        icon: 'h-9 w-9',
        'icon-sm': 'h-7 w-7 rounded-md',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';

export { Button, buttonVariants };
