import * as React from 'react';
import { cn } from '../../lib/utils';
import { X } from 'lucide-react';

interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
}

function Dialog({ open, onOpenChange, children }: DialogProps) {
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onOpenChange(false);
    };
    if (open) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, onOpenChange]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 overflow-y-auto print:static print:inset-auto print:block print:p-0 print:m-0 print:overflow-visible print:bg-transparent print:h-auto print:w-auto"
      style={{
        paddingTop: 'max(1.25rem, calc(env(safe-area-inset-top, 0px) + 0.75rem))',
        paddingBottom: 'max(1.25rem, calc(env(safe-area-inset-bottom, 0px) + 0.75rem))',
        paddingLeft: 'max(0.75rem, env(safe-area-inset-left, 0px))',
        paddingRight: 'max(0.75rem, env(safe-area-inset-right, 0px))',
      }}
    >
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity animate-in fade-in print:hidden"
        onClick={() => onOpenChange(false)}
      />
      <div className="relative z-50 w-full flex items-center justify-center pointer-events-none [&>*]:pointer-events-auto my-auto print:static print:block print:w-auto print:m-0 print:p-0">
        {children}
      </div>
    </div>
  );
}

const DialogContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { onClose?: () => void }
>(({ className, children, onClose, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      'relative w-full max-w-lg max-h-[calc(100dvh-max(2.5rem,calc(env(safe-area-inset-top,0px)+env(safe-area-inset-bottom,0px)+1.5rem)))] overflow-y-auto rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-4 sm:p-6 shadow-2xl animate-in zoom-in-95 duration-200 text-zinc-950 dark:text-white',
      'print:static print:block print:max-w-none print:max-h-none print:overflow-visible print:border-none print:shadow-none print:p-0 print:m-0 print:bg-transparent print:transform-none print:animate-none',
      className
    )}
    {...props}
  >
    {onClose && (
      <button
        type="button"
        onClick={onClose}
        className="absolute right-4 top-4 rounded-lg p-1 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors cursor-pointer"
      >
        <X className="size-4" />
        <span className="sr-only">Close</span>
      </button>
    )}
    {children}
  </div>
));
DialogContent.displayName = 'DialogContent';

const DialogHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      'flex flex-col space-y-1.5 text-center sm:text-left mb-4',
      className
    )}
    {...props}
  />
);
DialogHeader.displayName = 'DialogHeader';

const DialogTitle = React.forwardRef<
  HTMLHeadingElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h2
    ref={ref}
    className={cn(
      'text-lg font-bold leading-none tracking-tight text-zinc-950 dark:text-white',
      className
    )}
    {...props}
  />
));
DialogTitle.displayName = 'DialogTitle';

const DialogDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn('text-sm text-zinc-600 dark:text-zinc-400', className)}
    {...props}
  />
));
DialogDescription.displayName = 'DialogDescription';

const DialogFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      'flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 mt-6',
      className
    )}
    {...props}
  />
);
DialogFooter.displayName = 'DialogFooter';

export {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
};
