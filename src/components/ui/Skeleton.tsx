export default function Skeleton({ className = '', variant = 'text' }) {
  // variants: 'text' | 'title' | 'avatar' | 'card'
  const variantClass = `skeleton-${variant}`;
  return <div className={`skeleton ${variantClass} ${className}`} aria-hidden="true" />;
}
