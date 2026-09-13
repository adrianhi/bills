import * as React from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/shared/lib';

export interface SwitchProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'onChange'> {
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  loading?: boolean;
}

export const Switch = React.forwardRef<HTMLButtonElement, SwitchProps>(
  ({ className, checked = false, onCheckedChange, disabled, loading, ...props }, ref) => {
    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      if (disabled || loading) return;
      onCheckedChange?.(!checked);
      props.onClick?.(e);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
      if (disabled || loading) return;
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        onCheckedChange?.(!checked);
      }
      props.onKeyDown?.(e);
    };

    return (
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-busy={loading}
        disabled={disabled || loading}
        ref={ref}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        className={cn(
          'peer inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-60',
          checked
            ? 'bg-emerald-600 dark:bg-emerald-500'
            : 'bg-zinc-300 dark:bg-zinc-700',
          className
        )}
        {...props}
      >
        <span
          className={cn(
            'pointer-events-none flex h-5 w-5 items-center justify-center rounded-full bg-white shadow-md ring-0 transition-transform duration-200 ease-in-out dark:bg-zinc-100',
            checked ? 'translate-x-5' : 'translate-x-0'
          )}
        >
          {loading ? (
            <Loader2 className="h-3 w-3 animate-spin text-emerald-600 dark:text-emerald-700" />
          ) : null}
        </span>
      </button>
    );
  }
);

Switch.displayName = 'Switch';
