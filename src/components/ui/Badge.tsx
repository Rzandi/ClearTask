/* ═══════════════════════════════════════════════════════════
   Badge — ClearTask UI Component
   Small status label with semantic color variants.
   ═══════════════════════════════════════════════════════════ */

import { cn } from '../../utils/cn';

/**
 * Badge component — inline status label.
 *
 * @param {'success'|'warning'|'error'|'info'|'default'} variant
 * @param {'sm'|'md'} size
 * @param {string} className
 * @param {React.ReactNode} children
 */
export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'success' | 'warning' | 'error' | 'info' | 'default';
  size?: 'sm' | 'md';
}

export default function Badge({ children, variant = 'default', size = 'sm', className, ...props }: BadgeProps) {
  const base = 'inline-flex items-center font-semibold rounded-full leading-none';

  const variants = {
    success: 'bg-success/15 text-success border border-success/25',
    warning: 'bg-warning/15 text-warning border border-warning/25',
    error: 'bg-error/15 text-error border border-error/25',
    info: 'bg-info/15 text-info border border-info/25',
    default: 'bg-white/[0.08] text-text-secondary border border-border-default',
  };

  const sizes = {
    sm: 'px-2 py-0.5 text-[10px] tracking-wide uppercase',
    md: 'px-3 py-1 text-xs tracking-wide uppercase',
  };

  return (
    <span className={cn(base, variants[variant], sizes[size], className)} {...props}>
      {children}
    </span>
  );
}
