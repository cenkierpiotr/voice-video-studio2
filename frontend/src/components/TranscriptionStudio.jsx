import React, { useState, useRef, useCallback } from 'react';
import { useT } from '../i18n/index.jsx';

function InstallerBox({ installCmd, t }) {
  return (
    <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 12, padding: 20, marginTop: 16 }}>
      <div style={{ fontSize: 18, marginBottom: 10 }}>⚠️ {t('ts_not_installed')}</div>
      <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 14, lineHeight: 1.6 }}>
        {t('ts_install_hint')}
      </p>
      <div style={{ background: 'var(--bg-input)', borderRadius: 8, padding: '10px 14px', fontFamily: 'monospace', fontSize: 12, color: '#a5f3fc', marginBottom: 12 }}>
        {installCmd || 'pip install whisperx torch torchaudio'}
      </div>
      <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>
        {t('ts_vram_hint')}
      </p>
    </div>
  );
}

export default function TranscriptionStudio({ isGenerating, onJobStart, lastResult, onResultChange }) {
  const { t } = useT();
  const LANGUAGES = [
    { value: 'auto', label: '🔍 ' + t('ts_lang_auto') },
    { value: 'pl',   label: '🇵🇱 ' + t('ts_lang_pl') },
    { value: 'en',   label: '🇬🇧 ' + t('ts_lang_en') },
    { value: 'de',   label: '🇩🇪 Deutsch' },
    { value: 'fr',   label: '🇫🇷 Français' },
    { value: 'es',   label: '🇪🇸 Español' },
    { value: 'uk',   label: '🇺🇦 ' + t('ts_lang_uk') },
  ];
  const [file, setFile] = useState(null);
  const [language, setLanguage] = useState('auto');
  const [diarization, setDiarization] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState(null);
  const [notInstalled, setNotInstalled] = useState(false);
  const [installCmd, setInstallCmd] = useState('');
  const fileRef = useRef();

  const handleFile = (f) => {
    if (f) {
      setFile(f);
      setError(null);
      setNotInstalled(false);
    }
  };

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  }, []);

  const handleTranscribe = async () => {
    if (!file) { setError(t('ts_upload_audio_video')); return; }
    setError(null);
    setNotInstalled(false);
    const fd = new FormData();
    fd.append('file', file);
    fd.append('language', language);
    fd.append('diarization', diarization ? 'true' : 'false');
    try {
      const res = await fetch('/api/transcribe', { method: 'POST', body: fd });
      const data = await res.json();
      if (res.status === 503 && data.detail?.error === 'whisperx_not_installed') {
        setNotInstalled(true);
        setInstallCmd(data.detail?.install_cmd || '');
        return;
      }
      if (!res.ok) throw new Error(data.detail || t('aes_err_server'));
      if (data.job_id) onJobStart(data.job_id);
    } catch (e) {
      setError(e.message);
    }
  };

  const copyText = () => {
    if (lastResult?.text) navigator.clipboard.writeText(lastResult.text);
  };

  const downloadTxt = () => {
    if (!lastResult?.text) return;
    const blob = new Blob([lastResult.text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = t('ts_filename_txt'); a.click();
    URL.revokeObjectURL(url);
  };

  const downloadSrt = () => {
    if (!lastResult?.srt) return;
    const blob = new Blob([lastResult.srt], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = t('ts_filename_srt'); a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6 }}>📝 {t('nav_transcription')}</div>
        <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
          {t('ts_subtitle')}
        </div>
      </div>

      {/* Upload area */}
      <div
        className={`drop-area ${dragging ? 'dragging' : ''}`}
        onClick={() => fileRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
      >
        <div className="drop-icon">{file ? '✅' : '🎙'}</div>
        <div className="drop-text">
          {file ? file.name : t('ts_drop_or_click')}
        </div>
        <div className="drop-sub">
          {file
            ? `${(file.size / 1024 / 1024).toFixed(1)} MB · ${t('ts_click_to_change')}`
            : t('ts_formats')}
        </div>
        <input ref={fileRef} type="file" style={{ display: 'none' }}
          accept="audio/*,video/*"
          onChange={e => handleFile(e.target.files[0])} />
      </div>

      {/* Options */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 16 }}>
        <div className="form-group">
          <label className="form-label">{t('ts_language')}</label>
          <select className="form-select" value={language} onChange={e => setLanguage(e.target.value)}>
            {LANGUAGES.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
          </select>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, paddingTop: 20 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: 13 }}>
            <input type="checkbox" checked={diarization} onChange={e => setDiarization(e.target.checked)}
              style={{ width: 16, height: 16, accentColor: 'var(--accent)' }} />
            <span>
              <strong>{t('ts_who_speaks')}</strong><br />
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{t('ts_diarization_hint')}</span>
            </span>
          </label>
        </div>
      </div>

      {/* Errors and not-installed */}
      {error && (
        <div className="alert alert-error" style={{ marginTop: 16 }}>⚠️ {error}</div>
      )}
      {notInstalled && <InstallerBox installCmd={installCmd} t={t} />}

      {/* Submit */}
      <div style={{ marginTop: 20 }}>
        <button className="btn btn-primary btn-lg" onClick={handleTranscribe}
          disabled={isGenerating || !file}>
          {isGenerating
            ? <><span className="spinner" /> {t('ts_transcribing')}</>
            : `📝 ${t('ts_btn_transcribe')}`}
        </button>
      </div>

      {/* Results */}
      {lastResult && (
        <div style={{ marginTop: 24, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 13, fontWeight: 600 }}>
              ✅ {t('ts_transcription_ready')}
              {lastResult.language && <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 8 }}>· {t('ts_language')}: {lastResult.language.toUpperCase()}</span>}
            </span>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-ghost btn-sm" onClick={copyText} title={t('ts_copy_text')}>📋 {t('ts_copy')}</button>
              <button className="btn btn-ghost btn-sm" onClick={downloadTxt}>⬇️ .txt</button>
              {lastResult.srt && (
                <button className="btn btn-ghost btn-sm" onClick={downloadSrt}>⬇️ .srt</button>
              )}
            </div>
          </div>
          <textarea
            readOnly
            value={lastResult.text || ''}
            style={{ width: '100%', minHeight: 200, background: 'var(--bg-input)', border: 'none', color: 'var(--text-primary)', padding: 16, fontSize: 13, lineHeight: 1.7, resize: 'vertical', outline: 'none', fontFamily: 'inherit' }}
          />
        </div>
      )}
    </div>
  );
}
