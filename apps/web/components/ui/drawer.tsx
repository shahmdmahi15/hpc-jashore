'use client';

import * as React from 'react';
import { cn } from '../../lib/utils';
import { X } from 'lucide-react';

interface DrawerContextType {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const DrawerContext = React.createContext<DrawerContextType | undefined>(undefined);

function useDrawer() {
  const context = React.useContext(DrawerContext);
  if (!context) {
    throw new Error('useDrawer must be used within a Drawer');
  }
  return context;
}

const Drawer = ({
  open = false,
  onOpenChange,
  children,
}: {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: React.ReactNode;
}) => {
  const [internalOpen, setInternalOpen] = React.useState(open);
  const isControlled = onOpenChange !== undefined;
  const currentOpen = isControlled ? open : internalOpen;

  const handleOpenChange = (newOpen: boolean) => {
    if (!isControlled) {
      setInternalOpen(newOpen);
    }
    onOpenChange?.(newOpen);
  };

  return (
    <DrawerContext.Provider value={{ open: currentOpen, onOpenChange: handleOpenChange }}>
      {children}
    </DrawerContext.Provider>
  );
};

const DrawerTrigger = ({
  className,
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) => {
  const { onOpenChange } = useDrawer();
  return (
    <button
      type="button"
      className={cn(className)}
      onClick={() => onOpenChange(true)}
      {...props}
    >
      {children}
    </button>
  );
};

const DrawerClose = ({
  className,
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) => {
  const { onOpenChange } = useDrawer();
  return (
    <button
      type="button"
      className={cn(className)}
      onClick={() => onOpenChange(false)}
      {...props}
    >
      {children}
    </button>
  );
};

const DrawerContent = ({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => {
  const { open, onOpenChange } = useDrawer();

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onOpenChange(false);
      }
    };
    if (open) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, onOpenChange]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity animate-in fade-in-0"
        onClick={() => onOpenChange(false)}
      />
      {/* Panel */}
      <div
        className={cn(
          'relative z-50 flex h-full w-full max-w-md flex-col bg-card border-l border-border p-6 shadow-2xl transition-transform animate-in slide-in-from-right duration-200 ease-out sm:max-w-lg',
          className
        )}
        {...props}
      >
        <button
          type="button"
          onClick={() => onOpenChange(false)}
          className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none"
        >
          <X className="h-4 w-4" />
          <span className="sr-only">Close</span>
        </button>
        {children}
      </div>
    </div>
  );
};

const DrawerHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn('flex flex-col space-y-1.5 text-left pb-4', className)}
    {...props}
  />
);
DrawerHeader.displayName = 'DrawerHeader';

const DrawerFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn('mt-auto flex flex-col gap-2 pt-4', className)}
    {...props}
  />
);
DrawerFooter.displayName = 'DrawerFooter';

const DrawerTitle = React.forwardRef<
  HTMLHeadingElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn('text-lg font-semibold leading-none tracking-tight', className)}
    {...props}
  />
));
DrawerTitle.displayName = 'DrawerTitle';

const DrawerDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn('text-sm text-muted-foreground', className)}
    {...props}
  />
));
DrawerDescription.displayName = 'DrawerDescription';

export {
  Drawer,
  DrawerTrigger,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerFooter,
  DrawerTitle,
  DrawerDescription,
};
