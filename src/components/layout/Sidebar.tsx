/* ═══════════════════════════════════════════════════════════
   Sidebar — ClearTask (Desktop Navigation)
   ═══════════════════════════════════════════════════════════ */

import { useSettings } from '../../contexts/SettingsContext';

export interface SidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  onHelpOpen: () => void;
  activeSession?: any;
  onOpenSession: () => void;
}

export default function Sidebar({
  activeTab,
  onTabChange,
  onHelpOpen,
  activeSession = null,
  onOpenSession,
}: SidebarProps) {
  const { settings } = useSettings();
  const navItems = [
    { id: 'input', label: 'Input Penjualan', icon: InputIcon },
    { id: 'laporan', label: 'Riwayat Laporan', icon: LaporanIcon },
    { id: 'riwayat-sesi', label: 'Riwayat Sesi', icon: SessionHistoryIcon },
    { id: 'database', label: 'Database', icon: DatabaseIcon },
    { id: 'spk', label: 'Analisis Restock', icon: SpkIcon },
  ];

  return (
    <aside className="hidden lg:flex flex-col w-[260px] min-h-screen bg-bg-sidebar/70 backdrop-blur-2xl border-r border-white/[0.02] shadow-[4px_0_30px_rgba(0,0,0,0.3)] fixed left-0 top-0 z-40">
      {/* Logo */}
      <div className="p-6 pb-2">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-9 h-9 rounded-xl bg-primary/15 flex items-center justify-center">
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#00ffa3"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M9 11l3 3L22 4" />
              <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
            </svg>
          </div>
          <div>
            <h1 className="text-lg font-bold text-text-primary tracking-tight">
              {settings?.appName || 'ClearTask'}
            </h1>
          </div>
        </div>
        <p className="text-[11px] text-text-muted ml-12 -mt-1">
          {settings?.appSubtitle || settings?.tokoName || 'Pencatatan Penjualan'}
        </p>
      </div>

      {/* User */}
      <div className="px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary text-xs font-bold">
            {settings.kasirName?.charAt(0).toUpperCase() || 'A'}
          </div>
          <div>
            <p className="text-sm font-medium text-text-primary">{settings.kasirName || 'Admin'}</p>
            <p className="text-[11px] text-text-muted">Operational Manager</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 mt-2" aria-label="Navigasi utama">
        {/* Session Button */}
        <div className="mb-3">
          {activeSession ? (
            <div className="px-4 py-2.5 rounded-xl bg-primary/10 border border-primary/20">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-primary animate-pulse flex-shrink-0" />
                <span className="text-xs font-medium text-primary truncate">
                  {activeSession.nama || 'Sesi Aktif'}
                </span>
              </div>
            </div>
          ) : (
            <button
              id="sidebar-btn-buka-session"
              onClick={onOpenSession}
              className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 transition-all duration-200 cursor-pointer"
            >
              <SessionIcon />
              Buka Session Baru
            </button>
          )}
        </div>

        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              id={`sidebar-nav-${item.id}`}
              role="tab"
              aria-selected={isActive}
              onClick={() => onTabChange(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl mb-1 text-sm font-medium transition-all duration-200 cursor-pointer ${
                isActive
                  ? 'bg-primary/12 text-primary shadow-[inset_3px_0_0_#00ffa3]'
                  : 'text-text-secondary hover:text-text-primary hover:bg-white/[0.04]'
              }`}
            >
              <item.icon active={isActive} />
              {item.label}
            </button>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-3 pb-6 space-y-1">
        <button
          onClick={onHelpOpen}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-text-muted hover:text-text-secondary hover:bg-white/[0.04] transition-colors cursor-pointer"
        >
          <HelpIcon />
          Bantuan
        </button>
        <button
          onClick={() => {
            if (window.confirm('Yakin ingin memuat ulang aplikasi?')) {
              window.location.reload();
            }
          }}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-text-muted hover:text-text-secondary hover:bg-white/[0.04] transition-colors cursor-pointer"
        >
          <LogoutIcon />
          Muat Ulang
        </button>
      </div>
    </aside>
  );
}

/* ─── Icons ───────────────────────────────────────────────── */
function InputIcon({ active }: { active: boolean }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke={active ? '#00ffa3' : '#6e7681'}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  );
}

function LaporanIcon({ active }: { active: boolean }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke={active ? '#00ffa3' : '#6e7681'}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <polyline points="10 9 9 9 8 9" />
    </svg>
  );
}

function DatabaseIcon({ active }: { active: boolean }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke={active ? '#00ffa3' : '#6e7681'}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <ellipse cx="12" cy="5" rx="9" ry="3" />
      <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
      <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
    </svg>
  );
}

function HelpIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="#6e7681"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}

function LogoutIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="#6e7681"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  );
}

function SessionIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="#00ffa3"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

function SessionHistoryIcon({ active }: { active: boolean }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke={active ? '#00ffa3' : '#6e7681'}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 8v4l3 3" />
      <path d="M3.05 11a9 9 0 1 1 .5 4m-.5 5v-5h5" />
    </svg>
  );
}

function SpkIcon({ active }: { active: boolean }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke={active ? '#00ffa3' : '#6e7681'}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 3v18h18" />
      <path d="M18.7 8l-5.1 5.2-2.8-2.7L7 14.3" />
    </svg>
  );
}
