import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/utils';
import { Separator } from './separator';

const buttonGroupVariants = cva(
  'inline-flex w-fit items-stretch *:focus-visible:relative *:focus-visible:z-10',
  {
    variants: {
      orientation: {
        horizontal:
          'flex-row *:rounded-none first:*:rounded-l-lg last:*:rounded-r-lg [&>*:not(:first-child)]:-ml-px',
        vertical:
          'flex-col *:rounded-none first:*:rounded-t-lg last:*:rounded-b-lg [&>*:not(:first-child)]:-mt-px',
      },
    },
    defaultVariants: {
      orientation: 'horizontal',
    },
  }
);

function ButtonGroup({
  className,
  orientation,
  ...props
}: React.ComponentProps<'div'> & VariantProps<typeof buttonGroupVariants>) {
  return (
    <div
      role="group"
      data-slot="button-group"
      data-orientation={orientation}
      className={cn(buttonGroupVariants({ orientation }), className)}
      {...props}
    />
  );
}

function ButtonGroupText({
  className,
  ...props
}: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="button-group-text"
      className={cn(
        'flex items-center px-3 py-2 text-sm font-medium bg-muted text-muted-foreground border border-input select-none',
        className
      )}
      {...props}
    />
  );
}

function ButtonGroupSeparator({
  className,
  ...props
}: React.ComponentProps<typeof Separator>) {
  return (
    <Separator
      data-slot="button-group-separator"
      className={cn('shrink-0 bg-border', className)}
      {...props}
    />
  );
}

export {
  ButtonGroup,
  ButtonGroupText,
  ButtonGroupSeparator,
  buttonGroupVariants,
};
