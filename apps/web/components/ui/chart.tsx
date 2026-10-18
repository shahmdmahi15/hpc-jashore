'use client';

import * as React from 'react';
import { cn } from '../../lib/utils';

export type ChartConfig = Record<
  string,
  {
    label?: React.ReactNode;
    icon?: React.ComponentType;
    color?: string;
  }
>;

const ChartContext = React.createContext<{ config: ChartConfig }>({
  config: {},
});

export function ChartContainer({
  id,
  className,
  children,
  config,
  ...props
}: React.ComponentProps<'div'> & {
  config: ChartConfig;
  children: React.ReactNode;
}) {
  return (
    <ChartContext.Provider value={{ config }}>
      <div
        data-slot="chart"
        className={cn(
          'flex aspect-video justify-center text-xs [&_.recharts-cartesian-axis-tick_text]:fill-muted-foreground',
          className
        )}
        {...props}
      >
        {children}
      </div>
    </ChartContext.Provider>
  );
}

export function ChartTooltip({
  active,
  payload,
  label,
  className,
}: any) {
  if (!active || !payload?.length) return null;

  return (
    <div
      className={cn(
        'rounded-xl border border-border bg-card p-2 shadow-md text-xs space-y-1',
        className
      )}
    >
      {label && <div className="font-semibold text-foreground">{label}</div>}
      <div className="space-y-0.5">
        {payload.map((item: any, index: number) => (
          <div key={`item-${index}`} className="flex items-center gap-2">
            <div
              className="size-2 rounded-full"
              style={{ backgroundColor: item.color || item.fill }}
            />
            <span className="text-muted-foreground">{item.name || item.dataKey}:</span>
            <span className="font-semibold text-foreground">{item.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ChartTooltipContent({
  active,
  payload,
  label,
  className,
}: any) {
  return <ChartTooltip active={active} payload={payload} label={label} className={className} />;
}

export function ChartLegend({ payload, className }: any) {
  if (!payload?.length) return null;

  return (
    <div className={cn('flex items-center justify-center gap-4 pt-2 text-xs', className)}>
      {payload.map((entry: any, index: number) => (
        <div key={`legend-${index}`} className="flex items-center gap-1.5">
          <div
            className="size-2 rounded-full"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-muted-foreground">{entry.value}</span>
        </div>
      ))}
    </div>
  );
}

export function ChartLegendContent({ payload, className }: any) {
  return <ChartLegend payload={payload} className={className} />;
}
