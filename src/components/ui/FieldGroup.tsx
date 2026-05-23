/* ═══════════════════════════════════════════════════════════
   FieldGroup — ClearTask UI Component
   Shared label + wrapper component for forms
   ═══════════════════════════════════════════════════════════ */

import React from 'react';

export interface FieldGroupProps {
  label: React.ReactNode;
  htmlFor?: string;
  children: React.ReactNode;
}

export default function FieldGroup({ label, htmlFor, children }: FieldGroupProps) {
  return (
    <div>
      <label htmlFor={htmlFor} className="block text-sm font-medium text-text-secondary mb-2">
        {label}
      </label>
      {children}
    </div>
  );
}
