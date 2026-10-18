'use client';

import * as React from 'react';
import { cn } from '../../lib/utils';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from './button';

export interface CalendarProps {
  className?: string;
  selected?: Date;
  onSelect?: (date: Date) => void;
}

export function Calendar({
  className,
  selected,
  onSelect,
}: CalendarProps) {
  const [currentMonth, setCurrentMonth] = React.useState(
    selected || new Date()
  );

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayIndex = new Date(year, month, 1).getDay();

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const prevMonth = () => {
    setCurrentMonth(new Date(year, month - 1, 1));
  };

  const nextMonth = () => {
    setCurrentMonth(new Date(year, month + 1, 1));
  };

  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const blanks = Array.from({ length: firstDayIndex }, (_, i) => i);

  return (
    <div className={cn('p-3 rounded-2xl border border-border bg-card shadow-2xs w-fit select-none', className)}>
      <div className="flex items-center justify-between pb-3">
        <h3 className="text-xs font-semibold text-foreground">
          {monthNames[month]} {year}
        </h3>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={prevMonth}
            className="size-7 p-0"
          >
            <ChevronLeft className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={nextMonth}
            className="size-7 p-0"
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-2xs font-semibold text-muted-foreground pb-1">
        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d) => (
          <div key={d} className="h-6 flex items-center justify-center">
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-xs">
        {blanks.map((b) => (
          <div key={`b-${b}`} className="h-8" />
        ))}
        {days.map((day) => {
          const date = new Date(year, month, day);
          const isSelected =
            selected &&
            selected.getDate() === day &&
            selected.getMonth() === month &&
            selected.getFullYear() === year;

          return (
            <button
              key={day}
              type="button"
              onClick={() => onSelect?.(date)}
              className={cn(
                'size-8 rounded-lg flex items-center justify-center font-medium transition-colors cursor-pointer',
                isSelected
                  ? 'bg-emerald-600 text-white font-bold'
                  : 'text-foreground hover:bg-muted'
              )}
            >
              {day}
            </button>
          );
        })}
      </div>
    </div>
  );
}
