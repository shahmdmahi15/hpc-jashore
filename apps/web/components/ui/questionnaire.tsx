'use client';

import * as React from 'react';
import { cn } from '../../lib/utils';
import { buttonVariants } from './button';
import { Check } from 'lucide-react';

export function Questionnaire({
  className,
  ...props
}: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="questionnaire"
      className={cn('flex w-full min-w-0 flex-col gap-4', className)}
      {...props}
    />
  );
}

export function QuestionnaireProgress({
  value = 0,
  max = 100,
  className,
  ...props
}: React.ComponentProps<'div'> & { value?: number; max?: number }) {
  const percentage = Math.round((value / max) * 100);
  return (
    <div data-slot="questionnaire-progress" className={cn('w-full space-y-1', className)} {...props}>
      <div className="flex justify-between text-xs font-semibold text-muted-foreground">
        <span>Progress</span>
        <span>{percentage}%</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full bg-emerald-500 transition-all duration-300 rounded-full"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

export function QuestionnaireItem({
  className,
  ...props
}: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="questionnaire-item"
      className={cn('flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 shadow-2xs', className)}
      {...props}
    />
  );
}

export function QuestionnaireQuestion({
  className,
  ...props
}: React.ComponentProps<'h3'>) {
  return (
    <h3
      data-slot="questionnaire-question"
      className={cn('text-sm font-semibold text-foreground', className)}
      {...props}
    />
  );
}

export function QuestionnaireAnswer({
  selected,
  className,
  children,
  ...props
}: React.ComponentProps<'button'> & { selected?: boolean }) {
  return (
    <button
      type="button"
      className={cn(
        'flex w-full items-center justify-between rounded-xl border p-3 text-left text-xs sm:text-sm font-medium transition-all cursor-pointer',
        selected
          ? 'border-emerald-500 bg-emerald-50 text-emerald-950 dark:bg-emerald-950/30 dark:text-emerald-300 ring-2 ring-emerald-500/20'
          : 'border-border bg-background hover:bg-muted text-foreground',
        className
      )}
      {...props}
    >
      <span>{children}</span>
      {selected && <Check className="size-4 text-emerald-600 dark:text-emerald-400 shrink-0" />}
    </button>
  );
}
