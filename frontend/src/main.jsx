import { StrictMode, Component } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { LangProvider } from './i18n/index.jsx'

class ErrorBoundary extends Component {
  state = { error: null };
  static getDerivedStateFromError(error) { return { error }; }
  componentDidCatch(error, info) { console.error('[ErrorBoundary]', error, info); }
  render() {
    if (this.state.error) return (
      <div style={{
        minHeight:'100vh', display:'flex', flexDirection:'column',
        alignItems:'center', justifyContent:'center',
        background:'#0d0d0d', color:'#ccc', fontFamily:'monospace', padding:40, gap:20
      }}>
        <div style={{fontSize:'2.5rem'}}>⚠️</div>
        <div style={{fontSize:'1.2rem', color:'#f66', fontWeight:700}}>Application Error</div>
        <pre style={{
          background:'rgba(255,0,0,0.08)', border:'1px solid rgba(255,80,80,0.3)',
          borderRadius:8, padding:16, maxWidth:600, overflowX:'auto', fontSize:'0.8rem'
        }}>{String(this.state.error)}</pre>
        <button
          onClick={() => this.setState({ error: null })}
          style={{
            padding:'10px 28px', background:'var(--primary,#0af)', color:'#000',
            border:'none', borderRadius:8, cursor:'pointer', fontWeight:700, fontSize:'1rem'
          }}
        >🔄 Retry</button>
      </div>
    );
    return this.props.children;
  }
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <LangProvider>
        <App />
      </LangProvider>
    </ErrorBoundary>
  </StrictMode>,
)
