import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/utils';
import { Separator } from './separator';

function ItemGroup({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      role="list"
      data-slot="item-group"
      className={cn(
        'group/item-group flex w-full flex-col gap-4 has-data-[size=sm]:gap-2.5 has-data-[size=xs]:gap-2',
        className
      )}
      {...props}
    />
  );
}

function ItemSeparator({
  className,
  ...props
}: React.ComponentProps<typeof Separator>) {
  return (
    <Separator
      data-slot="item-separator"
      orientation="horizontal"
      className={cn('my-2', className)}
      {...props}
    />
  );
}

const itemVariants = cva(
  'group/item flex w-full flex-wrap items-center rounded-lg border text-sm transition-colors duration-100 outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 [a]:transition-colors [a]:hover:bg-muted',
  {
    variants: {
      variant: {
        default: 'border-border bg-card text-card-foreground',
        muted: 'border-transparent bg-muted text-muted-foreground',
        outline: 'border-input bg-transparent',
      },
      size: {
        default: 'gap-3 p-3',
        sm: 'gap-2.5 p-2.5 text-xs',
        xs: 'gap-2 p-2 text-xs',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

interface ItemProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof itemVariants> {}

const Item = React.forwardRef<HTMLDivElement, ItemProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <div
        ref={ref}
        data-slot="item"
        className={cn(itemVariants({ variant, size, className }))}
        {...props}
      />
    );
  }
);
Item.displayName = 'Item';

function ItemContent({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="item-content"
      className={cn('flex flex-1 flex-col gap-1 min-w-0', className)}
      {...props}
    />
  );
}

function ItemTitle({ className, ...props }: React.ComponentProps<'h4'>) {
  return (
    <h4
      data-slot="item-title"
      className={cn('font-medium leading-none truncate', className)}
      {...props}
    />
  );
}

function ItemDescription({ className, ...props }: React.ComponentProps<'p'>) {
  return (
    <p
      data-slot="item-description"
      className={cn('text-xs text-muted-foreground line-clamp-2', className)}
      {...props}
    />
  );
}

function ItemActions({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="item-actions"
      className={cn('flex items-center gap-2 shrink-0', className)}
      {...props}
    />
  );
}

export {
  Item,
  ItemGroup,
  ItemSeparator,
  ItemContent,
  ItemTitle,
  ItemDescription,
  ItemActions,
  itemVariants,
};
