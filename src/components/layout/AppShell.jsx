/* ═══════════════════════════════════════════════════════════
   AppShell — ClearTask Layout Wrapper
   Desktop: Sidebar + Main Content
   Mobile: Full-width + Bottom Nav
   ═══════════════════════════════════════════════════════════ */

import Sidebar from './Sidebar';
import BottomNav from './BottomNav';

export default function AppShell({ activeTab, onTabChange, children }) {
  return (
    <div className="min-h-screen bg-bg-base">
      {/* Desktop Sidebar */}
      <Sidebar activeTab={activeTab} onTabChange={onTabChange} />

      {/* Main Content Area */}
      <main className="lg:ml-[260px] min-h-screen">
        <div className="px-4 sm:px-6 lg:px-8 py-6 lg:py-8 pb-24 lg:pb-8 max-w-[1400px]">
          {children}
        </div>
      </main>

      {/* Mobile Bottom Nav */}
      <BottomNav activeTab={activeTab} onTabChange={onTabChange} />
    </div>
  );
}
