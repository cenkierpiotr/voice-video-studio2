import React, { useState, useEffect } from 'react';
import { VIDEO_STYLES } from '../constants.js';
import { useT } from '../i18n/index.jsx';

export default function VideoStudio({ onGenerate, isGenerating, error, ollamaHost, ollamaModel, voices }) {
  const { t } = useT();
  const [engines, setEngines] = useState([
    { value: 'animatediff', label: t('vs_engine_animatediff'), available: false, vram: '6 GB' },
    { value: 'wan21',       label: t('vs_engine_wan21'),       available: false, vram: '8 GB' },
    { value: 'cogvideox',   label: t('vs_engine_cogvideox'),   available: false, vram: '16 GB', pkg: 'cogvideo' },
    { value: 'runway',      label: t('vs_engine_runway'),      available: true,  vram: null },
  ]);

  useEffect(() => {
    fetch('/api/models')
      .then(r => r.json())
      .then(data => {
        const installed = new Set(
          (data.models || []).filter(m => m.category === 'video' && m.installed).map(m => m.id)
        );
        setEngines(prev => prev.map(eng => {
          if (eng.value === 'runway') return eng;
          const available = eng.value === 'cogvideox'
            ? installed.has('cogvideox_5b')
            : installed.has(eng.value);
          return { ...eng, available };
        }));
      })
      .catch(() => {});
  }, []);

  const QUALITIES = [
    { value: 'fast',     label: t('vs_quality_fast') },
    { value: 'standard', label: t('vs_quality_standard') },
    { value: 'high',     label: t('vs_quality_high') },
  ];

  const [prompt, setPrompt]         = useState('Dynamiczna scena w lesie, słońce przebijające się przez liście');
  const [dialogue, setDialogue]     = useState('Witaj w naszym studiu wideo AI. Zobacz jakie to proste!');
  const [speakerKey, setSpeakerKey] = useState('pl_male_marek');
  const [aiPrompt, setAiPrompt]     = useState('');
  const [isAiProcessing, setIsAiProcessing] = useState(false);
  const [aspectRatio, setAspectRatio] = useState('512x512');
  const [withAudio, setWithAudio]   = useState(true);
  const [duration, setDuration]     = useState(10);
  const [videoStyle, setVideoStyle] = useState('cinematic');
  const [aiError, setAiError]       = useState('');
  const [engine, setEngine]         = useState('animatediff');
  const [runwayKey, setRunwayKey]   = useState('');
  const [quality, setQuality]       = useState('standard');
  const [seed, setSeed]             = useState(-1);

  const selectedEngine = engines.find(e => e.value === engine);
  const noLocalInstalled = !engines.some(e => e.value !== 'runway' && e.available);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!prompt.trim()) return alert(t('vs_err_describe'));
    if (engine === 'runway' && !runwayKey.trim()) return alert(t('vs_err_runway_key'));
    onGenerate({
      prompt,
      dialogue,
      speaker_key: speakerKey,
      aspect_ratio: aspectRatio,
      with_audio: withAudio,
      duration,
      video_style: videoStyle,
      engine,
      runway_api_key: runwayKey || undefined,
      quality,
      seed: seed === -1 ? null : seed,
    });
  };

  const handleAiAssistant = async () => {
    if (!aiPrompt.trim()) { setAiError(t('vs_err_ai_describe')); return; }
    setIsAiProcessing(true);
    setAiError('');
    try {
      const res = await fetch('/api/video/generate-params', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: aiPrompt, ollama_host: ollamaHost, model: ollamaModel }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || t('aes_err_server'));
      if (data.visual_prompt) setPrompt(data.visual_prompt);
      if (data.dialogue) setDialogue(data.dialogue);
    } catch (err) {
      setAiError(t('vs_err_ai_prefix') + ': ' + err.message);
    } finally {
      setIsAiProcessing(false);
    }
  };

  return (
    <div className="card">
      <div className="card-header">
        <h3 className="card-title">🎬 {t('vs_title')}</h3>
        <p style={{ fontSize: 14, opacity: 0.7, margin: 0 }}>{t('vs_subtitle')}</p>
      </div>
      <div className="card-body space-y-4">

        {/* No local model banner */}
        {noLocalInstalled && (
          <div style={{
            padding: '10px 14px', borderRadius: 8, fontSize: 12,
            background: 'rgba(251,191,36,0.07)', border: '1px solid rgba(251,191,36,0.3)',
          }}>
            <span style={{ color: '#fde68a', fontWeight: 600 }}>⚠️ Brak zainstalowanych modeli wideo.</span>{' '}
            <span style={{ color: 'var(--text-muted)' }}>Użyj Runway (wymaga klucza API) lub zainstaluj model w </span>
            <span style={{ color: '#a5b4fc' }}>Ustawienia → Modele AI</span>.
          </div>
        )}

        {/* Engine selector */}
        <div className="form-group">
          <label className="form-label">🖥 {t('vs_engine_label')}</label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {engines.map(eng => (
              <button key={eng.value} onClick={() => setEngine(eng.value)} style={{
                padding: '10px 12px', borderRadius: 10, border: `1px solid ${engine === eng.value ? 'var(--accent)' : 'var(--border)'}`,
                background: engine === eng.value ? 'rgba(91,106,240,0.12)' : 'var(--bg-card)',
                color: engine === eng.value ? 'var(--accent-light)' : 'var(--text-muted)',
                cursor: 'pointer', textAlign: 'left', fontSize: 12, transition: 'all 0.15s',
              }}>
                <div style={{ fontWeight: 600, marginBottom: 2 }}>{eng.label}</div>
                {eng.vram && <div style={{ fontSize: 11, opacity: 0.7 }}>VRAM: {eng.vram}{!eng.available ? ` · ⚠️ ${t('vs_not_installed')}` : ''}</div>}
                {!eng.vram && <div style={{ fontSize: 11, opacity: 0.7 }}>{t('vs_requires_api_key')}</div>}
              </button>
            ))}
          </div>

          {selectedEngine && !selectedEngine.available && (
            <div style={{
              marginTop: 10, padding: '10px 14px', borderRadius: 8,
              background: 'rgba(251,191,36,0.07)', border: '1px solid rgba(251,191,36,0.3)', fontSize: 12,
            }}>
              <span style={{ color: '#fde68a', fontWeight: 600 }}>⚠️ {t('vs_engine_not_installed')}</span>{' '}
              <span style={{ color: 'var(--text-muted)' }}>{t('vs_run_on_server')}: </span>
              <code style={{ color: '#a5b4fc', background: 'rgba(0,0,0,0.2)', padding: '2px 6px', borderRadius: 4 }}>
                pip install {selectedEngine.pkg}
              </code>
            </div>
          )}

          {engine === 'runway' && (
            <input type="password" className="form-input" value={runwayKey} onChange={e => setRunwayKey(e.target.value)}
              placeholder="sk-runway-…" style={{ marginTop: 10 }} />
          )}
        </div>

        {/* AI Assistant */}
        <div className="form-group" style={{ background: 'rgba(255,255,255,0.02)', padding: 15, borderRadius: 12, border: '1px solid var(--border)' }}>
          <label className="form-label">✨ {t('vs_ai_director')}</label>
          <textarea className="form-textarea" rows={3} value={aiPrompt} onChange={e => setAiPrompt(e.target.value)}
            placeholder={t('vs_ai_placeholder')} />
          {aiError && <div className="alert alert-error" style={{ marginTop: 8, fontSize: '0.8rem' }}>⚠️ {aiError}</div>}
          <button className="btn btn-secondary btn-sm" style={{ marginTop: 10, width: '100%' }}
            onClick={handleAiAssistant} disabled={isAiProcessing}>
            {isAiProcessing ? `⏳ ${t('vs_ai_preparing')}` : `🪄 ${t('vs_ai_btn')}`}
          </button>
        </div>

        <div className="form-group">
          <label className="form-label">{t('vs_visual_desc')}</label>
          <textarea className="form-textarea" rows={2} value={prompt} onChange={e => setPrompt(e.target.value)} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div className="form-group">
            <label className="form-label">{t('vs_visual_style')}</label>
            <select className="form-select" value={videoStyle} onChange={e => setVideoStyle(e.target.value)}>
              {VIDEO_STYLES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">{t('vs_quality_label')}</label>
            <select className="form-select" value={quality} onChange={e => setQuality(e.target.value)}>
              {QUALITIES.map(q => <option key={q.value} value={q.value}>{q.label}</option>)}
            </select>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div className="form-group">
            <label className="form-label">{t('vs_duration_sec')}</label>
            <input type="number" className="form-input" min={2} max={60} step={2}
              value={duration} onChange={e => setDuration(parseInt(e.target.value))} />
          </div>
          <div className="form-group">
            <label className="form-label">{t('vs_seed_label')}</label>
            <input type="number" className="form-input" min={-1}
              value={seed} onChange={e => setSeed(parseInt(e.target.value))} />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div className="form-group">
            <label className="form-label">{t('vs_narrator_voice')}</label>
            <select className="form-select" value={speakerKey} onChange={e => setSpeakerKey(e.target.value)}>
              {Object.entries(voices).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">{t('vs_aspect_ratio')}</label>
            <select className="form-select" value={aspectRatio} onChange={e => setAspectRatio(e.target.value)}>
              <option value="512x512">{t('vs_aspect_square')}</option>
              <option value="384x512">{t('vs_aspect_portrait')}</option>
              <option value="512x384">{t('vs_aspect_landscape')}</option>
            </select>
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">{t('vs_dialogue_text')}</label>
          <textarea className="form-textarea" rows={2} value={dialogue} onChange={e => setDialogue(e.target.value)} />
        </div>

        <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: 13 }}>
          <input type="checkbox" checked={withAudio} onChange={e => setWithAudio(e.target.checked)}
            style={{ width: 16, height: 16, accentColor: 'var(--accent)' }} />
          <span style={{ color: 'var(--text-primary)' }}>{t('vs_include_audio')}</span>
        </label>

        <div className="alert alert-info" style={{ fontSize: '0.78rem', padding: '8px 12px', marginTop: 8 }}>
          ℹ️ <strong>GPU:</strong> {t('vs_gpu_hint')} <strong>{t('vs_no_gpu_label')}:</strong> {t('vs_no_gpu_hint')}
        </div>

        {error && <div className="alert alert-error" style={{ marginTop: 8, fontSize: '0.85rem' }}>⚠️ {error}</div>}

        <button className="btn btn-primary btn-lg" style={{ width: '100%', marginTop: 10 }}
          onClick={handleSubmit} disabled={isGenerating || (!selectedEngine?.available && engine !== 'runway')}>
          {isGenerating
            ? `⏳ ${t('vs_generating')}`
            : !selectedEngine?.available && engine !== 'runway'
              ? `⚠️ ${t('vs_engine_unavailable')} ${selectedEngine?.pkg}`
              : `🚀 ${t('vs_btn_generate')}`}
        </button>

      </div>
    </div>
  );
}
