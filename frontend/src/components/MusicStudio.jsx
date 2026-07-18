import React, { useState, useEffect } from 'react';
import JobMonitor from './JobMonitor.jsx';
import { useT } from '../i18n/index.jsx';

export default function MusicStudio({ onComplete }) {
  const { t } = useT();
  const PRESETS = [
    { label: '🎙 ' + t('ms_preset_podcast'), prompt: 'calm background music for a podcast, soft and unobtrusive' },
    { label: '💼 ' + t('ms_preset_business'), prompt: 'professional corporate background music, uplifting and confident' },
    { label: '🏃 ' + t('ms_preset_motivational'), prompt: 'energetic motivational music, upbeat and inspiring' },
    { label: '🌙 ' + t('ms_preset_calm'), prompt: 'ambient relaxing music, soft piano and strings' },
    { label: '🎬 ' + t('ms_preset_cinematic'), prompt: 'cinematic orchestral background music, dramatic and epic' },
    { label: '🕹 ' + t('ms_preset_gaming'), prompt: 'electronic gaming background music, intense and modern' },
  ];
  const [prompt, setPrompt]     = useState('');
  const [duration, setDuration] = useState(30);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState(null);
  const [jobId, setJobId]       = useState(null);
  const [notInstalled, setNotInstalled] = useState(false);
  const [installCmd, setInstallCmd] = useState('');

  useEffect(() => {
    fetch('/api/models')
      .then(r => r.json())
      .then(data => {
        const anyMusicInstalled = (data.models || []).some(m => m.category === 'music' && m.installed);
        if (!anyMusicInstalled) {
          setNotInstalled(true);
          setInstallCmd('pip install audiocraft');
        }
      })
      .catch(() => {});
  }, []);

  const handleGenerate = async () => {
    if (!prompt.trim()) { setError(t('ms_err_describe')); return; }
    setError(null);
    setNotInstalled(false);
    setLoading(true);
    try {
      const res = await fetch('/api/music/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, duration }),
      });
      const data = await res.json();
      if (res.status === 503 && data.detail?.error === 'musicgen_not_installed') {
        setNotInstalled(true);
        setInstallCmd(data.detail?.install_cmd || '');
        return;
      }
      if (!res.ok) throw new Error(data.detail || t('ms_err_generation'));
      if (data.job_id) setJobId(data.job_id);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const onJobComplete = (data) => {
    setJobId(null);
    if (onComplete) onComplete(data);
  };

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6 }}>🎵 {t('ms_title')}</div>
        <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
          {t('ms_subtitle')}
        </div>
      </div>

      {notInstalled ? (
        <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 12, padding: 24 }}>
          <div style={{ fontSize: 18, marginBottom: 10 }}>⚠️ {t('ms_not_installed')}</div>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 14, lineHeight: 1.6 }}>
            {t('ms_install_hint')}
          </p>
          <div style={{ background: 'var(--bg-input)', borderRadius: 8, padding: '10px 14px', fontFamily: 'monospace', fontSize: 12, color: '#a5f3fc', marginBottom: 12 }}>
            {installCmd || 'pip install audiocraft'}
          </div>
          <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>
            {t('ms_vram_hint')}
          </p>
        </div>
      ) : (
        <>
          {/* Presets */}
          <div style={{ marginBottom: 16 }}>
            <label className="form-label" style={{ marginBottom: 8, display: 'block' }}>{t('ms_quick_presets')}</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {PRESETS.map(p => (
                <button key={p.label} className="prompt-chip" onClick={() => setPrompt(p.prompt)}>
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Prompt */}
          <div className="form-group">
            <label className="form-label">📝 {t('ms_describe_music')}</label>
            <textarea
              className="form-textarea"
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              placeholder="np. calm piano background music for a corporate presentation, soft and professional"
              rows={3}
            />
          </div>

          {/* Duration */}
          <div className="form-group">
            <label className="form-label">⏱ {t('ms_duration')}: <strong style={{ color: 'var(--accent-light)' }}>{duration} {t('ms_seconds')}</strong></label>
            <input type="range" className="form-range"
              min={10} max={300} step={5} value={duration}
              onChange={e => setDuration(parseInt(e.target.value))} />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-muted)' }}>
              <span>10 {t('ms_sec_short')}</span>
              <span>5 {t('ms_min_short')}</span>
            </div>
          </div>

          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 16, padding: '8px 12px', background: 'var(--bg-input)', borderRadius: 8 }}>
            ⏱ {t('ms_est_time')} {duration} {t('ms_sec_music')}: ~{Math.ceil(duration / 15)} {t('ms_minutes')}
          </div>

          {error && <div className="alert alert-error" style={{ marginBottom: 16 }}>⚠️ {error}</div>}

          {jobId && (
            <div style={{ marginBottom: 16 }}>
              <JobMonitor jobId={jobId} onComplete={onJobComplete} onFailed={e => { setError(e); setJobId(null); }} />
            </div>
          )}

          <button className="btn btn-primary btn-lg" onClick={handleGenerate}
            disabled={loading || !!jobId || !prompt.trim()}>
            {loading || jobId ? <><span className="spinner" /> {t('ms_generating')}</> : `🎵 ${t('ms_btn_generate')}`}
          </button>
        </>
      )}
    </div>
  );
}
