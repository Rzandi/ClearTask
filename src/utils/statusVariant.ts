/**
 * Helper: map common status strings to Badge variant.
 * Usage: <Badge variant={statusVariant('Selesai')}>Selesai</Badge>
 */
export function statusVariant(
  status: string | undefined | null
): 'success' | 'warning' | 'error' | 'default' {
  const map: Record<string, 'success' | 'warning' | 'error' | 'default'> = {
    Selesai: 'success',
    aktif: 'success',
    ditutup: 'default',
    Pending: 'warning',
    Gagal: 'error',
    Error: 'error',
  };
  return (status ? map[status] : undefined) ?? 'default';
}
