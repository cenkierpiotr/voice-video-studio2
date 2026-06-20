import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[ErrorBoundary]', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          padding: '40px', backgroundColor: '#0f0f1a', color: '#e2e8f0',
          minHeight: '100vh', display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', textAlign: 'center', gap: 16,
        }}>
          <span style={{ fontSize: 48 }}>⚠️</span>
          <h1 style={{ margin: 0, fontSize: 24 }}>Coś poszło nie tak</h1>
          {import.meta.env.DEV && this.state.error && (
            <pre style={{
              background: 'rgba(255,255,255,0.05)', padding: '12px 16px', borderRadius: 8,
              fontSize: 12, textAlign: 'left', maxWidth: 600, overflow: 'auto',
              color: '#fca5a5',
            }}>
              {this.state.error.message}
            </pre>
          )}
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              onClick={() => window.location.reload()}
              style={{
                padding: '8px 18px', borderRadius: 8, border: 'none', cursor: 'pointer',
                background: '#5b6af0', color: '#fff', fontWeight: 600, fontSize: 14,
              }}
            >
              Odśwież stronę
            </button>
            <button
              onClick={() => this.setState({ hasError: false, error: null })}
              style={{
                padding: '8px 18px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.15)',
                cursor: 'pointer', background: 'transparent', color: '#e2e8f0', fontSize: 14,
              }}
            >
              Spróbuj ponownie
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
