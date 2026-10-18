import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/utils';
import { Button } from './button';

const attachmentVariants = cva(
  'group/attachment relative flex w-fit max-w-full min-w-0 shrink-0 flex-wrap rounded-xl border bg-card text-card-foreground transition-colors focus-within:ring-1 focus-within:ring-ring/50',
  {
    variants: {
      size: {
        default: 'gap-2 text-sm p-2.5',
        sm: 'gap-2 text-xs p-2',
        xs: 'gap-1.5 rounded-lg text-xs p-1.5',
      },
      orientation: {
        horizontal: 'min-w-40 items-center',
        vertical: 'w-28 flex-col',
      },
    },
    defaultVariants: {
      size: 'default',
      orientation: 'horizontal',
    },
  }
);

function Attachment({
  className,
  state = 'done',
  size = 'default',
  orientation = 'horizontal',
  ...props
}: React.ComponentProps<'div'> &
  VariantProps<typeof attachmentVariants> & {
    state?: 'idle' | 'uploading' | 'processing' | 'error' | 'done';
  }) {
  return (
    <div
      data-slot="attachment"
      data-state={state}
      data-orientation={orientation}
      className={cn(attachmentVariants({ size, orientation }), className)}
      {...props}
    />
  );
}

function AttachmentMedia({
  className,
  ...props
}: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="attachment-media"
      className={cn('flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-foreground', className)}
      {...props}
    />
  );
}

function AttachmentContent({
  className,
  ...props
}: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="attachment-content"
      className={cn('flex flex-1 flex-col min-w-0', className)}
      {...props}
    />
  );
}

function AttachmentTitle({
  className,
  ...props
}: React.ComponentProps<'span'>) {
  return (
    <span
      data-slot="attachment-title"
      className={cn('block max-w-full min-w-0 truncate font-medium text-xs sm:text-sm', className)}
      {...props}
    />
  );
}

function AttachmentDescription({
  className,
  ...props
}: React.ComponentProps<'span'>) {
  return (
    <span
      data-slot="attachment-description"
      className={cn('block min-w-0 truncate text-2xs sm:text-xs text-muted-foreground', className)}
      {...props}
    />
  );
}

function AttachmentActions({
  className,
  ...props
}: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="attachment-actions"
      className={cn('flex items-center gap-1 shrink-0 ml-auto', className)}
      {...props}
    />
  );
}

function AttachmentAction({
  className,
  variant = 'ghost',
  size = 'sm',
  ...props
}: React.ComponentProps<typeof Button>) {
  return (
    <Button
      data-slot="attachment-action"
      variant={variant}
      size={size}
      className={cn('size-7 p-0', className)}
      {...props}
    />
  );
}

function AttachmentTrigger({
  className,
  type = 'button',
  ...props
}: React.ComponentProps<'button'>) {
  return (
    <button
      type={type}
      data-slot="attachment-trigger"
      className={cn('absolute inset-0 z-10 opacity-0 cursor-pointer', className)}
      {...props}
    />
  );
}

function AttachmentGroup({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="attachment-group"
      className={cn('flex min-w-0 gap-2 overflow-x-auto py-1', className)}
      {...props}
    />
  );
}

export {
  Attachment,
  AttachmentGroup,
  AttachmentMedia,
  AttachmentContent,
  AttachmentTitle,
  AttachmentDescription,
  AttachmentActions,
  AttachmentAction,
  AttachmentTrigger,
};
