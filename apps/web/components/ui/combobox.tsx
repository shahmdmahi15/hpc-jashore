'use client';

import * as React from 'react';
import { cn } from '../../lib/utils';
import { Check, ChevronsUpDown, Search } from 'lucide-react';
import { Button } from './button';
import { Input } from './input';

export interface ComboboxOption {
  value: string;
  label: string;
}

interface ComboboxProps {
  options: ComboboxOption[];
  value?: string;
  onValueChange?: (val: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  className?: string;
}

export function Combobox({
  options = [],
  value = '',
  onValueChange,
  placeholder = 'Select option...',
  searchPlaceholder = 'Search...',
  emptyText = 'No results found.',
  className,
}: ComboboxProps) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState('');

  const filtered = React.useMemo(() => {
    if (!search.trim()) return options;
    return options.filter((o) =>
      o.label.toLowerCase().includes(search.toLowerCase())
    );
  }, [options, search]);

  const selectedOption = options.find((o) => o.value === value);

  return (
    <div className={cn('relative w-full', className)}>
      <Button
        type="button"
        variant="outline"
        role="combobox"
        aria-expanded={open}
        className="w-full justify-between font-normal h-10 px-3 text-xs sm:text-sm bg-card border-input"
        onClick={() => setOpen(!open)}
      >
        <span className={cn('truncate', !selectedOption && 'text-muted-foreground')}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronsUpDown className="size-4 shrink-0 opacity-50 ml-2" />
      </Button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setOpen(false)}
          />
          <div className="absolute left-0 top-full mt-1.5 z-50 w-full rounded-xl border border-border bg-card p-1 shadow-lg animate-in fade-in-50">
            <div className="flex items-center px-2 pb-1 pt-1 border-b border-border/60">
              <Search className="size-3.5 text-muted-foreground mr-1.5 shrink-0" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={searchPlaceholder}
                className="w-full bg-transparent text-xs py-1 text-foreground placeholder:text-muted-foreground focus:outline-none"
                autoFocus
              />
            </div>
            <div className="max-h-56 overflow-y-auto py-1">
              {filtered.length === 0 ? (
                <div className="py-3 text-center text-xs text-muted-foreground">
                  {emptyText}
                </div>
              ) : (
                filtered.map((item) => {
                  const isSelected = item.value === value;
                  return (
                    <button
                      key={item.value}
                      type="button"
                      className={cn(
                        'flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-left text-xs font-medium cursor-pointer transition-colors',
                        isSelected
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold'
                          : 'text-foreground hover:bg-muted'
                      )}
                      onClick={() => {
                        onValueChange?.(item.value);
                        setOpen(false);
                      }}
                    >
                      <span className="truncate">{item.label}</span>
                      {isSelected && <Check className="size-3.5 shrink-0 text-emerald-500 ml-1.5" />}
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
