import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/utils';

function BubbleGroup({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="bubble-group"
      className={cn('flex min-w-0 flex-col gap-2', className)}
      {...props}
    />
  );
}

const bubbleVariants = cva(
  'group/bubble relative flex w-fit max-w-[80%] min-w-0 flex-col gap-1',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground',
        secondary: 'bg-secondary text-secondary-foreground',
        muted: 'bg-muted text-muted-foreground',
        tinted: 'bg-emerald-50 text-emerald-950 dark:bg-emerald-950/40 dark:text-emerald-200',
        outline: 'border border-border bg-background text-foreground',
        ghost: 'bg-transparent text-foreground',
        destructive: 'bg-destructive/10 text-destructive',
      },
      align: {
        start: 'self-start rounded-2xl rounded-bl-xs',
        end: 'self-end rounded-2xl rounded-br-xs',
      },
    },
    defaultVariants: {
      variant: 'default',
      align: 'start',
    },
  }
);

interface BubbleProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof bubbleVariants> {}

function Bubble({
  variant = 'default',
  align = 'start',
  className,
  children,
  ...props
}: BubbleProps) {
  return (
    <div
      data-slot="bubble"
      data-variant={variant}
      data-align={align}
      className={cn(bubbleVariants({ variant, align }), 'p-3 text-sm shadow-xs', className)}
      {...props}
    >
      {children}
    </div>
  );
}

function BubbleContent({ className, ...props }: React.ComponentProps<'div'>) {
  return <div data-slot="bubble-content" className={cn('min-w-0', className)} {...props} />;
}

function BubbleReactions({
  className,
  ...props
}: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="bubble-reactions"
      className={cn(
        'absolute -bottom-2 right-2 flex items-center gap-1 rounded-full bg-muted px-1.5 py-0.5 text-xs shadow-xs border border-border',
        className
      )}
      {...props}
    />
  );
}

export { BubbleGroup, Bubble, BubbleContent, BubbleReactions, bubbleVariants };
