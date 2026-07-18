import { useState } from 'react';
import { VOICES, PROMPT_EXAMPLES } from '../constants.js';
import { useT } from '../i18n/index.jsx';

export default function PromptBuilder({ onResult, ollamaHost, ollamaModel }) {
  const { t } = useT();
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [raw, setRaw] = useState('');

  const translate = async () => {
    if (!prompt.trim()) return;
    setLoading(true); setError(''); setRaw('');
    try {
      const res = await fetch('/api/translate-prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: prompt.trim(), ollama_host: ollamaHost, model: ollamaModel }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Błąd serwera');
      setRaw(JSON.stringify(data.command, null, 2));
      onResult(data.command);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="form-group">
        <label className="form-label">{t('pb_label')}</label>
        <textarea
          className="prompt-textarea"
          placeholder={t('pb_placeholder')}
          value={prompt}
          onChange={e => setPrompt(e.target.value)}
          rows={5}
        />
      </div>

      <div className="prompt-examples">
        {PROMPT_EXAMPLES.map((ex, i) => (
          <button key={i} className="prompt-chip" onClick={() => setPrompt(ex)}>
            {ex.length > 45 ? ex.slice(0, 45) + '…' : ex}
          </button>
        ))}
      </div>

      <div style={{ marginTop: 16 }}>
        <button className="btn btn-primary" onClick={translate} disabled={loading || !prompt.trim()}>
          {loading ? <><span className="spinner" />{t('pb_btn_translating')}</> : t('pb_btn_translate')}
        </button>
      </div>

      {error && (
        <div className="alert alert-error" style={{ marginTop: 12 }}>
          ⚠️ {error}
        </div>
      )}

      {raw && (
        <div style={{ marginTop: 14 }}>
          <div className="form-label" style={{ marginBottom: 6 }}>{t('pb_result_label')}</div>
          <div className="alert alert-success">
            {t('pb_result_success')}
          </div>
          <details style={{ marginTop: 8 }}>
            <summary style={{ cursor: 'pointer', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
              {t('pb_show_json')}
            </summary>
            <pre style={{
              marginTop: 8, padding: 12,
              background: 'var(--bg-input)', borderRadius: 6,
              fontSize: '0.72rem', overflowX: 'auto',
              color: 'var(--accent-light)', lineHeight: 1.6,
            }}>{raw}</pre>
          </details>
        </div>
      )}
    </div>
  );
}
