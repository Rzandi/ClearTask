/* ═══════════════════════════════════════════════════════════
   ErrorBoundary — ClearTask
   Catches unhandled React render errors and shows a
   user-friendly fallback instead of a blank white screen.
   Ref: architecture-report.md + error-handling-report.md
   ═══════════════════════════════════════════════════════════ */

import { Component } from 'react';

export interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: any;
  errorInfo: any;
  copied?: boolean;
}

function getErrorCode(error: any): string {
  if (!error) return 'E000';
  const str = String(error?.name || '') + ':' + String(error?.message || '');
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  const code = Math.abs(hash % 900) + 100;
  return `E${code}`;
}

export default class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null, copied: false };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  componentDidCatch(error: any, errorInfo: any) {
    // Log hanya di development
    if (import.meta.env.DEV) {
      console.error('[ErrorBoundary] Uncaught error:', error, errorInfo);
    }
    this.setState({ errorInfo });
  }

  handleCopyError = async () => {
    const { error, errorInfo } = this.state;
    const errorCode = getErrorCode(error);
    const text = [
      `Kode Error: ${errorCode}`,
      `Waktu: ${new Date().toISOString()}`,
      `Pesan: ${error?.message || String(error)}`,
      error?.stack ? `Stack Trace:\n${error.stack}` : '',
      errorInfo?.componentStack ? `Component Stack:\n${errorInfo.componentStack}` : '',
    ]
      .filter(Boolean)
      .join('\n\n');

    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      this.setState({ copied: true });
      setTimeout(() => this.setState({ copied: false }), 2500);
    } catch (err) {
      console.error('Failed to copy error:', err);
    }
  };

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null, copied: false });
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    const { error } = this.state;

    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          background: '#0d1117',
          color: '#e6edf3',
          fontFamily: 'Inter, system-ui, sans-serif',
          padding: '2rem',
          textAlign: 'center',
          gap: '1rem',
        }}
      >
        {/* Icon */}
        <div
          style={{
            width: '64px',
            height: '64px',
            borderRadius: '16px',
            background: 'rgba(248, 81, 73, 0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '0.5rem',
          }}
        >
          <svg
            width="32"
            height="32"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#f85149"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        </div>

        <h1 style={{ fontSize: '1.5rem', fontWeight: 800, margin: 0 }}>Terjadi Kesalahan</h1>

        <p style={{ color: '#8b949e', maxWidth: '400px', lineHeight: 1.6, margin: 0 }}>
          Aplikasi mengalami error yang tidak terduga. Data Anda aman di IndexedDB.
        </p>

        {/* Short Error Code Badge (W0-12) */}
        {error && (
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.25rem 0.75rem',
              borderRadius: '9999px',
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.1)',
              fontSize: '0.8rem',
              color: '#8b949e',
              fontFamily: 'monospace',
            }}
          >
            <span>
              Kode Error: <strong style={{ color: '#f85149' }}>{getErrorCode(error)}</strong>
            </span>
          </div>
        )}

        {/* Error detail — hanya di DEV */}
        {import.meta.env.DEV && error && (
          <details
            style={{
              background: 'rgba(248, 81, 73, 0.08)',
              border: '1px solid rgba(248, 81, 73, 0.2)',
              borderRadius: '8px',
              padding: '1rem',
              maxWidth: '500px',
              width: '100%',
              textAlign: 'left',
              fontSize: '0.75rem',
              color: '#f85149',
            }}
          >
            <summary style={{ cursor: 'pointer', marginBottom: '0.5rem' }}>
              Detail Error (DEV only)
            </summary>
            <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
              {error.toString()}
            </pre>
          </details>
        )}

        <div
          style={{
            display: 'flex',
            gap: '0.75rem',
            marginTop: '0.5rem',
            flexWrap: 'wrap',
            justifyContent: 'center',
          }}
        >
          <button
            onClick={this.handleCopyError}
            style={{
              padding: '0.75rem 1.25rem',
              background: 'rgba(255,255,255,0.06)',
              color: '#e6edf3',
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: '10px',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '0.875rem',
            }}
          >
            {this.state.copied ? '✓ Detail Tersalin' : 'Salin Detail Error'}
          </button>
          <button
            onClick={this.handleReset}
            style={{
              padding: '0.75rem 1.5rem',
              background: 'rgba(255,255,255,0.06)',
              color: '#e6edf3',
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: '10px',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '0.875rem',
            }}
          >
            Coba Lagi
          </button>
          <button
            onClick={this.handleReload}
            style={{
              padding: '0.75rem 1.5rem',
              background: '#00ffa3',
              color: '#0d1117',
              border: 'none',
              borderRadius: '10px',
              cursor: 'pointer',
              fontWeight: 700,
              fontSize: '0.875rem',
            }}
          >
            Muat Ulang Aplikasi
          </button>
        </div>
      </div>
    );
  }
}
