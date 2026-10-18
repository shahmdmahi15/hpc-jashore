'use client';

import * as React from 'react';
import { cn } from '../../lib/utils';
import { Button } from './button';
import { Input } from './input';
import { Separator } from './separator';
import { Sheet, SheetContent } from './sheet';
import { PanelLeft } from 'lucide-react';

interface SidebarContextType {
  open: boolean;
  setOpen: (open: boolean) => void;
  openMobile: boolean;
  setOpenMobile: (open: boolean) => void;
  isMobile: boolean;
  toggleSidebar: () => void;
}

const SidebarContext = React.createContext<SidebarContextType>({
  open: true,
  setOpen: () => {},
  openMobile: false,
  setOpenMobile: () => {},
  isMobile: false,
  toggleSidebar: () => {},
});

export function useSidebar() {
  return React.useContext(SidebarContext);
}

export function SidebarProvider({
  defaultOpen = true,
  open: controlledOpen,
  onOpenChange,
  className,
  style,
  children,
  ...props
}: React.ComponentProps<'div'> & {
  defaultOpen?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(defaultOpen);
  const [openMobile, setOpenMobile] = React.useState(false);
  const [isMobile, setIsMobile] = React.useState(false);

  React.useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const open = controlledOpen !== undefined ? controlledOpen : uncontrolledOpen;
  const setOpen = React.useCallback(
    (value: boolean) => {
      if (onOpenChange) {
        onOpenChange(value);
      } else {
        setUncontrolledOpen(value);
      }
    },
    [onOpenChange]
  );

  const toggleSidebar = React.useCallback(() => {
    if (isMobile) {
      setOpenMobile((prev) => !prev);
    } else {
      setOpen(!open);
    }
  }, [isMobile, open, setOpen]);

  return (
    <SidebarContext.Provider
      value={{
        open,
        setOpen,
        openMobile,
        setOpenMobile,
        isMobile,
        toggleSidebar,
      }}
    >
      <div
        className={cn('flex min-h-svh w-full text-sidebar-foreground', className)}
        style={style}
        {...props}
      >
        {children}
      </div>
    </SidebarContext.Provider>
  );
}

export function Sidebar({
  side = 'left',
  variant = 'sidebar',
  collapsible = 'offcanvas',
  className,
  children,
  ...props
}: React.ComponentProps<'div'> & {
  side?: 'left' | 'right';
  variant?: 'sidebar' | 'floating' | 'inset';
  collapsible?: 'offcanvas' | 'icon' | 'none';
}) {
  const { isMobile, openMobile, setOpenMobile, open } = useSidebar();

  if (isMobile) {
    return (
      <Sheet open={openMobile} onOpenChange={setOpenMobile}>
        <SheetContent side={side} className="w-72 p-0 bg-card border-border">
          <div className="flex h-full w-full flex-col">{children}</div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <aside
      data-state={open ? 'expanded' : 'collapsed'}
      className={cn(
        'relative hidden md:flex flex-col border-r border-border bg-card transition-[width] duration-200',
        open ? 'w-64' : 'w-16',
        className
      )}
      {...props}
    >
      <div className="flex h-full w-full flex-col overflow-hidden">{children}</div>
    </aside>
  );
}

export function SidebarTrigger({
  className,
  onClick,
  ...props
}: React.ComponentProps<typeof Button>) {
  const { toggleSidebar } = useSidebar();

  return (
    <Button
      variant="ghost"
      size="sm"
      className={cn('size-8 p-0', className)}
      onClick={(event: React.MouseEvent<HTMLButtonElement>) => {
        onClick?.(event);
        toggleSidebar();
      }}
      {...props}
    >
      <PanelLeft className="size-4" />
      <span className="sr-only">Toggle Sidebar</span>
    </Button>
  );
}

export function SidebarHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return <div className={cn('flex flex-col gap-2 p-3 border-b border-border', className)} {...props} />;
}

export function SidebarContent({ className, ...props }: React.ComponentProps<'div'>) {
  return <div className={cn('flex flex-1 flex-col gap-2 overflow-auto p-3', className)} {...props} />;
}

export function SidebarFooter({ className, ...props }: React.ComponentProps<'div'>) {
  return <div className={cn('flex flex-col gap-2 p-3 border-t border-border mt-auto', className)} {...props} />;
}

export function SidebarSeparator({ className, ...props }: React.ComponentProps<typeof Separator>) {
  return <Separator className={cn('my-2', className)} {...props} />;
}

export function SidebarGroup({ className, ...props }: React.ComponentProps<'div'>) {
  return <div className={cn('flex flex-col gap-1', className)} {...props} />;
}

export function SidebarGroupLabel({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      className={cn('px-2 py-1 text-2xs font-semibold uppercase tracking-wider text-muted-foreground', className)}
      {...props}
    />
  );
}

export function SidebarGroupContent({ className, ...props }: React.ComponentProps<'div'>) {
  return <div className={cn('flex flex-col gap-0.5', className)} {...props} />;
}

export function SidebarMenu({ className, ...props }: React.ComponentProps<'ul'>) {
  return <ul className={cn('flex flex-col gap-0.5 list-none m-0 p-0', className)} {...props} />;
}

export function SidebarMenuItem({ className, ...props }: React.ComponentProps<'li'>) {
  return <li className={cn('relative', className)} {...props} />;
}

export function SidebarMenuButton({
  isActive,
  className,
  ...props
}: React.ComponentProps<'button'> & { isActive?: boolean }) {
  return (
    <button
      type="button"
      className={cn(
        'flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-medium transition-colors cursor-pointer text-left',
        isActive
          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold'
          : 'text-foreground hover:bg-muted',
        className
      )}
      {...props}
    />
  );
}

export function SidebarInput({ className, ...props }: React.ComponentProps<typeof Input>) {
  return <Input className={cn('h-8 text-xs', className)} {...props} />;
}

export function SidebarInset({ className, ...props }: React.ComponentProps<'main'>) {
  return <main className={cn('flex flex-1 flex-col overflow-auto', className)} {...props} />;
}
