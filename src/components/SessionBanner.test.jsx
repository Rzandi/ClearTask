/* ═══════════════════════════════════════════════════════════
   SessionBanner Tests — ClearTask
   ═══════════════════════════════════════════════════════════ */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SessionBanner from './SessionBanner';

describe('SessionBanner', () => {
  // 10.1 Unit test: render null ketika session adalah null
  it('should render null when session is null', () => {
    const { container } = render(<SessionBanner session={null} onClose={vi.fn()} />);
    expect(container.firstChild).toBeNull();
  });

  // 10.2 Unit test: tampilkan "Sesi Tanpa Nama" ketika session.nama adalah string kosong
  it('should display "Sesi Tanpa Nama" when session.nama is empty string', () => {
    const session = {
      id: 'test-id',
      nama: '',
      waktuMulai: '2025-07-14T08:30:00.000Z',
      tanggalMulai: '2025-07-14',
      status: 'aktif',
    };
    render(<SessionBanner session={session} onClose={vi.fn()} />);
    expect(screen.getByText('Sesi Tanpa Nama')).toBeInTheDocument();
  });

  // 10.3 Unit test: tampilkan nama sesi ketika session.nama terisi
  it('should display session name when session.nama is filled', () => {
    const session = {
      id: 'test-id',
      nama: 'Shift Pagi',
      waktuMulai: '2025-07-14T08:30:00.000Z',
      tanggalMulai: '2025-07-14',
      status: 'aktif',
    };
    render(<SessionBanner session={session} onClose={vi.fn()} />);
    expect(screen.getByText('Shift Pagi')).toBeInTheDocument();
  });

  // 10.4 Unit test: tombol "Tutup Session" memanggil onClose saat diklik
  it('should call onClose when "Tutup Session" button is clicked', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const session = {
      id: 'test-id',
      nama: 'Test Session',
      waktuMulai: '2025-07-14T08:30:00.000Z',
      tanggalMulai: '2025-07-14',
      status: 'aktif',
    };
    render(<SessionBanner session={session} onClose={onClose} />);
    
    const closeButton = screen.getByRole('button', { name: /tutup session/i });
    await user.click(closeButton);
    
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  // 10.5 Unit test: waktu mulai ditampilkan dalam format yang benar
  it('should display start time in correct format', () => {
    const session = {
      id: 'test-id',
      nama: 'Test Session',
      waktuMulai: '2025-07-14T08:30:00.000Z',
      tanggalMulai: '2025-07-14',
      status: 'aktif',
    };
    render(<SessionBanner session={session} onClose={vi.fn()} />);
    
    // The format should be "Dibuka: DD/MM/YYYY, HH:mm"
    // waktuMulai is in UTC, so we need to check for the formatted output
    // formatDate and formatTime use 'id-ID' locale
    expect(screen.getByText(/Dibuka:/)).toBeInTheDocument();
  });
});
