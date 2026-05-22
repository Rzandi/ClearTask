/* ═══════════════════════════════════════════════════════════
   Card — ClearTask UI Component
   Reusable card wrapper with glass-card and elevated variants.
   ═══════════════════════════════════════════════════════════ */

import { cn } from '../../utils/cn';

/**
 * Card component — wraps content in a styled container.
 *
 * @param {'default'|'elevated'|'flat'} variant
 * @param {string} className - Additional Tailwind classes
 * @param {React.ReactNode} children
 */
export default function Card({ children, variant = 'default', className, ...props }) {
  const variants = {
    default: 'glass-card',
    elevated: 'glass-card shadow-[var(--shadow-elevated)]',
    flat: 'bg-bg-card border border-border-default rounded-xl',
  };

  return (
    <div className={cn(variants[variant], className)} {...props}>
      {children}
    </div>
  );
}
