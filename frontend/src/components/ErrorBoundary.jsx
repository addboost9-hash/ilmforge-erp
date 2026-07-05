import { Component } from 'react';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary] Uncaught error:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#F8FAFC',
          padding: 24,
        }}>
          <div style={{
            background: '#fff',
            borderRadius: 16,
            padding: '48px 40px',
            maxWidth: 480,
            width: '100%',
            textAlign: 'center',
            boxShadow: '0 4px 24px rgba(0,0,0,0.10)',
          }}>
            <div style={{ fontSize: 56, marginBottom: 20 }}>⚠️</div>
            <h1 style={{
              fontSize: 22,
              fontWeight: 700,
              color: '#1E3A5F',
              marginBottom: 12,
              fontFamily: "'Inter', system-ui, sans-serif",
            }}>
              Something went wrong
            </h1>
            <p style={{
              fontSize: 14,
              color: '#64748B',
              lineHeight: 1.6,
              marginBottom: 28,
              fontFamily: "'Inter', system-ui, sans-serif",
            }}>
              An unexpected error occurred. Your data is safe. Refresh the page to continue.
            </p>

            {process.env.NODE_ENV !== 'production' && this.state.error && (
              <details style={{
                textAlign: 'left',
                marginBottom: 24,
                background: '#FEF2F2',
                border: '1px solid #FECACA',
                borderRadius: 8,
                padding: '10px 14px',
              }}>
                <summary style={{
                  cursor: 'pointer',
                  fontSize: 12,
                  fontWeight: 600,
                  color: '#B91C1C',
                  fontFamily: 'monospace',
                }}>
                  Error details (dev only)
                </summary>
                <pre style={{
                  marginTop: 10,
                  fontSize: 11,
                  color: '#7F1D1D',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  fontFamily: 'monospace',
                }}>
                  {this.state.error.message}
                </pre>
              </details>
            )}

            <button
              onClick={() => window.location.reload()}
              style={{
                background: '#0D9488',
                color: '#fff',
                border: 'none',
                borderRadius: 8,
                padding: '11px 28px',
                fontSize: 14,
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: "'Inter', system-ui, sans-serif",
                transition: 'background 0.15s',
              }}
              onMouseOver={e => { e.currentTarget.style.background = '#0F766E'; }}
              onMouseOut={e => { e.currentTarget.style.background = '#0D9488'; }}
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
