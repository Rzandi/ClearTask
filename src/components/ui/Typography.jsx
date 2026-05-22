/* ═══════════════════════════════════════════════════════════
   Typography — ClearTask UI Component
   Consistent text styles across the app.
   ═══════════════════════════════════════════════════════════ */

import { cn } from '../../utils/cn';

const variantMap = {
  h1: { tag: 'h1', cls: 'text-3xl lg:text-4xl font-extrabold text-text-primary tracking-tight' },
  h2: { tag: 'h2', cls: 'text-2xl font-bold text-text-primary tracking-tight' },
  h3: { tag: 'h3', cls: 'text-xl font-semibold text-text-primary' },
  h4: { tag: 'h4', cls: 'text-base font-semibold text-text-primary' },
  body: { tag: 'p', cls: 'text-sm text-text-primary leading-relaxed' },
  caption: { tag: 'p', cls: 'text-xs text-text-secondary leading-relaxed' },
  muted: { tag: 'p', cls: 'text-xs text-text-muted' },
  label: { tag: 'span', cls: 'text-xs font-semibold uppercase tracking-wider text-text-muted' },
};

/**
 * Typography component — consistent text rendering.
 *
 * @param {'h1'|'h2'|'h3'|'h4'|'body'|'caption'|'muted'|'label'} variant
 * @param {string} as - Override the rendered HTML tag
 * @param {string} className
 * @param {React.ReactNode} children
 */
export default function Typography({ children, variant = 'body', as, className, ...props }) {
  const config = variantMap[variant] ?? variantMap.body;
  const Tag = as || config.tag;

  return (
    <Tag className={cn(config.cls, className)} {...props}>
      {children}
    </Tag>
  );
}
