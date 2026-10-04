/* ═══════════════════════════════════════════════════════════
   HighlightText — ClearTask (W3-09)
   Highlights matching query substrings with a themed mark tag.
   ═══════════════════════════════════════════════════════════ */

import { memo } from 'react';

export interface HighlightTextProps {
  text?: string | null;
  query?: string | null;
  className?: string;
}

export const HighlightText = memo(function HighlightText({
  text,
  query,
  className = '',
}: HighlightTextProps) {
  if (!text) return null;
  if (!query || !query.trim()) {
    return <span className={className}>{text}</span>;
  }

  const trimmed = query.trim();
  const escaped = trimmed.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(${escaped})`, 'gi');
  const parts = text.split(regex);

  return (
    <span className={className}>
      {parts.map((part, i) =>
        part.toLowerCase() === trimmed.toLowerCase() ? (
          <mark key={i} className="bg-primary/25 text-primary font-semibold rounded px-0.5">
            {part}
          </mark>
        ) : (
          part
        )
      )}
    </span>
  );
});

export default HighlightText;
