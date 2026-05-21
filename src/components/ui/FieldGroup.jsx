/* ═══════════════════════════════════════════════════════════
   FieldGroup — ClearTask UI Component
   Shared label + wrapper component for forms
   ═══════════════════════════════════════════════════════════ */

export default function FieldGroup({ label, htmlFor, children }) {
  return (
    <div>
      <label htmlFor={htmlFor} className="block text-sm font-medium text-text-secondary mb-2">
        {label}
      </label>
      {children}
    </div>
  );
}
