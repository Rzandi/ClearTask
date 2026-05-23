/* ═══════════════════════════════════════════════════════════
   AppBootstrap — ClearTask
   Handles IndexedDB migration and cache initialization
   before rendering the main application.
   ═══════════════════════════════════════════════════════════ */

import { useState, useEffect } from 'react';
import { migrateToIndexedDB } from '../utils/migration';

/**
 * Bootstrap component that:
 * 1. Runs localStorage → IndexedDB migration (if needed)
 * 2. Initializes the in-memory cache from IndexedDB
 * 3. Renders children only after both steps complete
 *
 * @param {{ children: React.ReactNode }} props
 */
export default function AppBootstrap({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [migrationWarning, setMigrationWarning] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function boot() {
      try {
        // Step 1: Migrate localStorage → IndexedDB (idempotent)
        const result = await migrateToIndexedDB();
        if (!result.success) {
          console.warn('[Boot] Migration issue:', result.error);
          // Show a dismissible warning banner instead of silencing it completely
          if (!cancelled) {
            setMigrationWarning(result.error || 'Beberapa data lokal gagal dimigrasikan.');
          }
        } else if (!result.skipped) {
          console.log('[Boot] Migration complete:', result.counts);
        }

        // Step 2: Cache in-memory digantikan sepenuhnya oleh Dexie live queries.

        if (!cancelled) {
          setReady(true);
        }
      } catch (err: any) {
        console.error('[Boot] Fatal error:', err);
        if (!cancelled) {
          setError(err.message || 'Gagal memuat database');
        }
      }
    }

    boot();
    return () => {
      cancelled = true;
    };
  }, []);

  if (error) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          background: '#0a0a0f',
          color: '#ff6b6b',
          fontFamily: 'system-ui, sans-serif',
          padding: '2rem',
          textAlign: 'center',
        }}
      >
        <h1 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>⚠️ Database Error</h1>
        <p style={{ color: '#a0a0b0', maxWidth: '400px' }}>{error}</p>
        <button
          onClick={() => window.location.reload()}
          style={{
            marginTop: '1.5rem',
            padding: '0.75rem 2rem',
            background: '#00ffa3',
            color: '#0a0a0f',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontWeight: 600,
          }}
        >
          Coba Lagi
        </button>
      </div>
    );
  }

  if (!ready) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          background: '#0a0a0f',
          color: '#e0e0e0',
          fontFamily: 'system-ui, sans-serif',
          gap: '1rem',
        }}
      >
        <div
          style={{
            width: '40px',
            height: '40px',
            border: '3px solid rgba(0, 255, 163, 0.2)',
            borderTopColor: '#00ffa3',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
          }}
        />
        <p style={{ color: '#a0a0b0' }}>Memuat database... (biasanya &lt; 1 detik)</p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <>
      {migrationWarning && (
        <div
          style={{
            background: '#ffb703',
            color: '#023047',
            padding: '0.75rem 1rem',
            textAlign: 'center',
            fontWeight: 'bold',
            fontSize: '0.875rem',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: '1rem',
            position: 'relative',
            zIndex: 1000,
          }}
        >
          <span>⚠️ Peringatan: {migrationWarning} Beberapa data lama mungkin tidak lengkap.</span>
          <button
            onClick={() => setMigrationWarning(null)}
            style={{
              background: 'rgba(0,0,0,0.1)',
              border: '1px solid rgba(0,0,0,0.2)',
              borderRadius: '4px',
              padding: '0.1rem 0.5rem',
              cursor: 'pointer',
              fontWeight: 'bold',
            }}
          >
            Tutup
          </button>
        </div>
      )}
      {children}
    </>
  );
}
