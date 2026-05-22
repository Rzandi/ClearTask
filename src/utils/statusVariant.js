/**
 * Helper: map common status strings to Badge variant.
 * Usage: <Badge variant={statusVariant('Selesai')}>Selesai</Badge>
 */
export function statusVariant(status) {
  const map = {
    Selesai: 'success',
    aktif: 'success',
    ditutup: 'default',
    Pending: 'warning',
    Gagal: 'error',
    Error: 'error',
  };
  return map[status] ?? 'default';
}
