import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useT } from '../i18n/index.jsx';

const API = '/api/video-ai';

const STYLES = [
  { id: 'cinematic',   icon: '🎬', labelKey: 'vai_style_cinematic' },
  { id: 'animated',    icon: '✨', labelKey: 'vai_style_animated' },
  { id: 'documentary', icon: '📽', labelKey: 'vai_style_documentary' },
  { id: 'commercial',  icon: '📢', labelKey: 'vai_style_commercial' },
];

const ASPECTS = [
  { id: '16:9', label: '16:9 Landscape', icon: '🖥' },
  { id: '9:16', label: '9:16 Portrait',  icon: '📱' },
  { id: '1:1',  label: '1:1 Square',     icon: '⬜' },
];

const SERVICES = [
  { id: 'pixverse',     label: 'Pixverse AI',      note: 'Google SSO · 8s/seg · darmowy' },
  { id: 'hailuo',       label: 'Hailuo AI',         note: 'MiniMax · 6s/seg · top quality' },
  { id: 'gemini',       label: 'Gemini (Google)',   note: 'Veo 3 · 8s/seg · konto Google' },
  { id: 'kling',        label: 'Kling AI',           note: 'Kuaishou · 10s/seg · 66kr/dzień' },
  { id: 'runway',       label: 'Runway ML',         note: 'Gen-3 · 10s/seg · 125kr starter' },
  { id: 'local_ffmpeg', label: 'Local (FFmpeg)',     note: 'Placeholder · zawsze dostępny' },
];

const STATUS_COLOR = {
  queued:      '#888',
  submitting:  '#f5a623',
  generating:  '#4fc3f7',
  downloading: '#81c784',
  done:        '#66bb6a',
  failed:      '#ef5350',
  cancelled:   '#bdbdbd',
};

const STATUS_ICON = {
  queued:      '⏳',
  submitting:  '📤',
  generating:  '⚙️',
  downloading: '⬇️',
  done:        '✅',
  failed:      '❌',
  cancelled:   '🚫',
};

const PROMPTS = [
  'Krótki film reklamowy o aplikacji SaaS, profesjonalny styl, niebieskie kolory marki',
  '2-minutowy film o korzyściach z medytacji, spokojny, ciepłe złote kolory',
  'Animowany film dla dzieci o przyjaźni, kolorowy i wesoły, styl Pixar',
  'Film dokumentalny o ulicach nocnego miasta, neon, deszcz, noir',
];

export default function VideoAiStudio() {
  const t = useT();
  const [step, setStep] = useState(1); // 1=input 2=config 3=plan 4=generate

  // Step 1 — prompt
  const [prompt, setPrompt] = useState('');

  // Step 2 — config
  const [targetSec, setTargetSec]     = useState(60);
  const [style, setStyle]             = useState('cinematic');
  const [aspect, setAspect]           = useState('16:9');
  const [servicePref, setServicePref] = useState('pixverse');
  const [addNarration, setAddNarration] = useState(false);
  const [addMusic, setAddMusic]         = useState(false);

  // Step 3 — plan
  const [plan, setPlan]               = useState(null);
  const [planLoading, setPlanLoading] = useState(false);
  const [planError, setPlanError]     = useState('');
  const [editingSegIdx, setEditingSegIdx] = useState(null);
  const [editPrompt, setEditPrompt]   = useState('');

  // Step 4 — job
  const [jobId, setJobId]             = useState('');
  const [jobStatus, setJobStatus]     = useState(null);
  const [jobLoading, setJobLoading]   = useState(false);
  const [jobError, setJobError]       = useState('');
  const pollRef = useRef(null);

  const segCount = plan
    ? plan.segments.length
    : Math.max(1, Math.ceil(targetSec / ({ pixverse: 8, hailuo: 6, kling: 10 }[servicePref] || 8)));
  const estMinutes = Math.ceil(segCount * 3 / 60);

  // ── Step 2: generate plan ──────────────────────────────────────────────────
  const handleGeneratePlan = async () => {
    setPlanLoading(true);
    setPlanError('');
    try {
      const res = await fetch(`${API}/plan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          target_seconds: targetSec,
          style,
          aspect_ratio: aspect,
          service_pref: servicePref,
          add_narration: addNarration,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.plan) throw new Error(data.detail || 'Plan generation failed');
      setPlan(data.plan);
      setStep(3);
    } catch (e) {
      setPlanError(e.message);
    } finally {
      setPlanLoading(false);
    }
  };

  // ── Step 3: edit segment ───────────────────────────────────────────────────
  const handleSegEdit = (idx) => {
    setEditingSegIdx(idx);
    setEditPrompt(plan.segments[idx].visual_prompt_en);
  };

  const handleSegSave = () => {
    if (editingSegIdx === null) return;
    const segs = [...plan.segments];
    segs[editingSegIdx] = { ...segs[editingSegIdx], visual_prompt_en: editPrompt };
    setPlan({ ...plan, segments: segs });
    setEditingSegIdx(null);
    setEditPrompt('');
  };

  // ── Step 4: start job ──────────────────────────────────────────────────────
  const handleStartJob = async () => {
    setJobLoading(true);
    setJobError('');
    try {
      const res = await fetch(`${API}/jobs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plan,
          service_pref: servicePref,
          add_narration: addNarration,
          add_music: addMusic,
          aspect_ratio: aspect,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.job_id) throw new Error(data.detail || 'Job creation failed');
      setJobId(data.job_id);
      setStep(4);
    } catch (e) {
      setJobError(e.message);
    } finally {
      setJobLoading(false);
    }
  };

  // ── Polling ────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!jobId || step !== 4) return;
    const poll = async () => {
      try {
        const res = await fetch(`${API}/jobs/${jobId}/status`);
        const data = await res.json();
        setJobStatus(data);
        if (data.status === 'completed' || data.status === 'failed' || data.status === 'cancelled') {
          clearInterval(pollRef.current);
        }
      } catch (e) {
        console.error('Poll error', e);
      }
    };
    poll();
    pollRef.current = setInterval(poll, 2500);
    return () => clearInterval(pollRef.current);
  }, [jobId, step]);

  const handleRetrySegment = async (idx) => {
    await fetch(`${API}/jobs/${jobId}/segment/${idx}/retry`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
  };

  const handleCancel = async () => {
    await fetch(`${API}/jobs/${jobId}/cancel`, { method: 'POST' });
    clearInterval(pollRef.current);
  };

  const handleReset = () => {
    clearInterval(pollRef.current);
    setStep(1); setPrompt(''); setPlan(null); setJobId(''); setJobStatus(null);
    setPlanError(''); setJobError('');
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="video-ai-studio">
      {/* Stepper */}
      <div className="vai-stepper">
        {[1, 2, 3, 4].map(n => (
          <div
            key={n}
            className={`vai-step${step === n ? ' active' : step > n ? ' done' : ''}`}
            onClick={() => step > n && setStep(n)}
            title={step > n ? t('vai_step_click_back') : ''}
          >
            <div className="vai-step-dot">{step > n ? '✓' : n}</div>
            <div className="vai-step-label">{t(`vai_step_${n}`)}</div>
          </div>
        ))}
      </div>

      {/* ── Step 1: Input ─────────────────────────────────────────────────── */}
      {step === 1 && (
        <div className="vai-card">
          <h2>{t('vai_step1_title')}</h2>
          <p className="vai-desc">{t('vai_step1_desc')}</p>
          <textarea
            className="vai-textarea"
            rows={4}
            placeholder={t('vai_prompt_placeholder')}
            value={prompt}
            onChange={e => setPrompt(e.target.value)}
          />
          <div className="vai-chip-row">
            {PROMPTS.map((p, i) => (
              <button key={i} className="chip" onClick={() => setPrompt(p)}>{p.slice(0, 45)}…</button>
            ))}
          </div>
          <button
            className="btn-primary"
            disabled={prompt.trim().length < 10}
            onClick={() => setStep(2)}
          >
            {t('vai_next')} →
          </button>
        </div>
      )}

      {/* ── Step 2: Config ────────────────────────────────────────────────── */}
      {step === 2 && (
        <div className="vai-card">
          <h2>{t('vai_step2_title')}</h2>

          {/* Duration slider */}
          <label className="vai-label">{t('vai_duration')}: <strong>{targetSec}s</strong></label>
          <div className="vai-slider-row">
            <span>15s</span>
            <input
              type="range" min={15} max={180} step={5}
              value={targetSec} onChange={e => setTargetSec(+e.target.value)}
              className="vai-slider"
            />
            <span>3min</span>
          </div>
          <div className="vai-hint">≈ {segCount} {t('vai_segments')} × {targetSec / segCount | 0}s · {t('vai_est_time')} ~{estMinutes} {t('vai_minutes')}</div>

          {/* Style */}
          <label className="vai-label">{t('vai_style')}</label>
          <div className="vai-tile-row">
            {STYLES.map(s => (
              <button
                key={s.id}
                className={`vai-tile${style === s.id ? ' selected' : ''}`}
                onClick={() => setStyle(s.id)}
              >
                <span className="vai-tile-icon">{s.icon}</span>
                <span>{t(s.labelKey)}</span>
              </button>
            ))}
          </div>

          {/* Aspect */}
          <label className="vai-label">{t('vai_aspect')}</label>
          <div className="vai-tile-row">
            {ASPECTS.map(a => (
              <button
                key={a.id}
                className={`vai-tile vai-tile-sm${aspect === a.id ? ' selected' : ''}`}
                onClick={() => setAspect(a.id)}
              >
                <span>{a.icon}</span>
                <span>{a.label}</span>
              </button>
            ))}
          </div>

          {/* Service */}
          <label className="vai-label">{t('vai_service')}</label>
          <div className="vai-tile-row">
            {SERVICES.map(s => (
              <button
                key={s.id}
                className={`vai-tile${servicePref === s.id ? ' selected' : ''}`}
                onClick={() => setServicePref(s.id)}
              >
                <strong>{s.label}</strong>
                <span className="vai-note">{s.note}</span>
              </button>
            ))}
          </div>

          {/* Toggles */}
          <div className="vai-toggle-row">
            <label className="vai-toggle">
              <input type="checkbox" checked={addNarration} onChange={e => setAddNarration(e.target.checked)} />
              {t('vai_narration')}
            </label>
            <label className="vai-toggle">
              <input type="checkbox" checked={addMusic} onChange={e => setAddMusic(e.target.checked)} />
              {t('vai_music')}
            </label>
          </div>

          {planError && <div className="vai-error">{planError}</div>}

          <div className="vai-btn-row">
            <button className="btn-secondary" onClick={() => setStep(1)}>← {t('vai_back')}</button>
            <button className="btn-primary" disabled={planLoading} onClick={handleGeneratePlan}>
              {planLoading ? <><span className="spin">⚙</span> {t('vai_generating_plan')}…</> : t('vai_generate_plan')}
            </button>
          </div>
        </div>
      )}

      {/* ── Step 3: Plan preview ──────────────────────────────────────────── */}
      {step === 3 && plan && (
        <div className="vai-card">
          <h2>{t('vai_step3_title')}</h2>

          {/* Anchor card */}
          <div className="vai-anchor-card">
            <h3>🎨 {t('vai_anchor')}</h3>
            <div className="vai-anchor-grid">
              <div><strong>{t('vai_anchor_style')}:</strong> {plan.anchor.style}</div>
              <div><strong>{t('vai_anchor_mood')}:</strong> {plan.anchor.mood}</div>
              <div><strong>{t('vai_anchor_camera')}:</strong> {plan.anchor.camera}</div>
              <div><strong>{t('vai_anchor_lighting')}:</strong> {plan.anchor.lighting}</div>
            </div>
            {plan.anchor.color_palette?.length > 0 && (
              <div className="vai-palette-row">
                {plan.anchor.color_palette.map((c, i) => (
                  <span key={i} className="vai-palette-chip">{c}</span>
                ))}
              </div>
            )}
          </div>

          {/* Segments list */}
          <div className="vai-seg-list">
            {plan.segments.map((seg, i) => (
              <div key={i} className="vai-seg-card">
                <div className="vai-seg-header">
                  <span className="vai-seg-num">#{i + 1}</span>
                  <span className="vai-seg-dur">{seg.duration_s}s</span>
                  <button className="btn-icon" onClick={() => handleSegEdit(i)}>✏️</button>
                </div>
                {editingSegIdx === i ? (
                  <div className="vai-seg-edit">
                    <textarea
                      rows={3}
                      value={editPrompt}
                      onChange={e => setEditPrompt(e.target.value)}
                      className="vai-textarea vai-textarea-sm"
                    />
                    <div className="vai-btn-row">
                      <button className="btn-secondary btn-xs" onClick={() => setEditingSegIdx(null)}>{t('vai_cancel')}</button>
                      <button className="btn-primary btn-xs" onClick={handleSegSave}>{t('vai_save')}</button>
                    </div>
                  </div>
                ) : (
                  <p className="vai-seg-prompt">{seg.visual_prompt_en}</p>
                )}
                {seg.start_frame_desc && (
                  <div className="vai-seg-frames">
                    <span>▶ {seg.start_frame_desc}</span>
                    {seg.end_frame_desc && <span> → {seg.end_frame_desc}</span>}
                  </div>
                )}
              </div>
            ))}
          </div>

          {jobError && <div className="vai-error">{jobError}</div>}

          <div className="vai-btn-row">
            <button className="btn-secondary" onClick={() => setStep(2)}>← {t('vai_back')}</button>
            <button className="btn-primary" disabled={jobLoading} onClick={handleStartJob}>
              {jobLoading
                ? <><span className="spin">⚙</span> {t('vai_starting')}…</>
                : <>{t('vai_start_generation')} ({plan.segments.length} seg)</>}
            </button>
          </div>
        </div>
      )}

      {/* ── Step 4: Generation progress ───────────────────────────────────── */}
      {step === 4 && (
        <div className="vai-card">
          <div className="vai-progress-header">
            <h2>{t('vai_step4_title')}</h2>
            {jobStatus && (
              <span className={`vai-job-badge vai-status-${jobStatus.status}`}>
                {jobStatus.status}
              </span>
            )}
          </div>

          {/* Overall progress bar */}
          {jobStatus && (
            <div className="vai-progress-bar-wrap">
              <div className="vai-progress-bar" style={{ width: `${jobStatus.progress || 0}%` }} />
              <span className="vai-progress-label">
                {jobStatus.done_segments}/{jobStatus.total_segments} {t('vai_segments')} · {jobStatus.progress || 0}%
              </span>
            </div>
          )}

          {/* Segment grid */}
          {jobStatus?.segments && (
            <div className="vai-seg-grid">
              {jobStatus.segments.map(seg => (
                <div
                  key={seg.idx}
                  className={`vai-seg-tile vai-tile-${seg.status}`}
                  title={seg.error || seg.service_used || ''}
                >
                  <div className="vai-tile-num">#{seg.idx + 1}</div>
                  <div className="vai-tile-icon-big">{STATUS_ICON[seg.status] || '⏳'}</div>
                  <div className="vai-tile-svc">{seg.service_used || '—'}</div>
                  {seg.status === 'failed' && (
                    <button className="btn-retry" onClick={() => handleRetrySegment(seg.idx)}>
                      🔄 {t('vai_retry')}
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Assembly status */}
          {jobStatus?.status === 'assembling' && (
            <div className="vai-assembling">
              <span className="spin">⚙</span> {t('vai_assembling')}…
            </div>
          )}

          {/* Result */}
          {jobStatus?.status === 'completed' && jobStatus.output_url && (
            <div className="vai-result">
              <h3>✅ {t('vai_ready')}</h3>
              <video
                src={jobStatus.output_url}
                controls
                className="vai-video-player"
                preload="metadata"
              />
              <div className="vai-btn-row">
                <a
                  href={jobStatus.output_url}
                  download={`video_ai_${jobId.slice(0, 8)}.mp4`}
                  className="btn-primary"
                >
                  ⬇ {t('vai_download')}
                </a>
                <button className="btn-secondary" onClick={handleReset}>
                  + {t('vai_new_video')}
                </button>
              </div>
            </div>
          )}

          {/* Error */}
          {jobStatus?.status === 'failed' && (
            <div className="vai-error">
              {t('vai_job_failed')}: {jobStatus.error}
            </div>
          )}

          {/* Action buttons */}
          <div className="vai-btn-row vai-btn-row-top">
            {jobStatus?.status === 'generating' && (
              <button className="btn-danger-sm" onClick={handleCancel}>
                ⛔ {t('vai_cancel')}
              </button>
            )}
            {(jobStatus?.status === 'failed' || jobStatus?.status === 'cancelled') && (
              <button className="btn-secondary" onClick={handleReset}>
                ← {t('vai_back')}
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── Service login helper ───────────────────────────────────────────── */}
      <ServiceLoginPanel />
    </div>
  );
}

function ServiceLoginPanel() {
  const t = useT();
  const [services, setServices] = useState([]);
  const [open, setOpen] = useState(false);
  const [bootstrapping, setBootstrapping] = useState(null); // {name, vncUrl}
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  const loadServices = () =>
    fetch(`${API}/services`)
      .then(r => r.json())
      .then(d => setServices(d.services || []))
      .catch(() => {});

  useEffect(() => { if (open) loadServices(); }, [open]);

  const handleBootstrap = async (name) => {
    setMsg('Uruchamiam środowisko VNC…');
    try {
      const r = await fetch(`${API}/services/${name}/bootstrap/start`, { method: 'POST' });
      const d = await r.json();
      if (!d.success) throw new Error(d.detail || 'Błąd');
      setBootstrapping({ name, vncUrl: d.vnc_url });
      setMsg('Przeglądarka gotowa — zaloguj się poniżej.');
    } catch (e) {
      setMsg(`Błąd: ${e.message}`);
    }
  };

  const handleSave = async () => {
    if (!bootstrapping) return;
    setSaving(true);
    setMsg('Zapisuję sesję…');
    try {
      const r = await fetch(`${API}/services/${bootstrapping.name}/bootstrap/finish`, { method: 'POST' });
      const d = await r.json();
      setMsg(d.message || 'Sesja zapisana!');
      setBootstrapping(null);
      await loadServices();
    } catch (e) {
      setMsg(`Błąd: ${e.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = async () => {
    if (bootstrapping) {
      await fetch(`${API}/services/${bootstrapping.name}/bootstrap`, { method: 'DELETE' }).catch(() => {});
    }
    setBootstrapping(null);
    setMsg('');
  };

  if (!open) {
    const notLogged = services.filter(s => !s.logged_in && s.name !== 'local_ffmpeg').length;
    return (
      <button className="vai-services-toggle" onClick={() => setOpen(true)}>
        🔑 {t('vai_service_sessions')}
        {notLogged > 0 && <span className="vai-badge">{notLogged}</span>}
      </button>
    );
  }

  return (
    <div className="vai-services-panel">
      <div className="vai-services-header">
        <h3>🔑 {t('vai_service_sessions')}</h3>
        <button className="btn-icon" onClick={() => { handleCancel(); setOpen(false); }}>✕</button>
      </div>

      {/* VNC iframe */}
      {bootstrapping && (
        <div className="vai-vnc-wrap">
          <div className="vai-vnc-bar">
            <span>Przeglądarka: <strong>{bootstrapping.name}</strong> — zaloguj się</span>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                className="btn-primary"
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? '…' : '✔ Zapisz sesję'}
              </button>
              <button className="btn-secondary" onClick={handleCancel}>Anuluj</button>
            </div>
          </div>
          <iframe
            src={bootstrapping.vncUrl}
            className="vai-vnc-frame"
            title={`VNC bootstrap ${bootstrapping.name}`}
            allow="clipboard-read; clipboard-write"
          />
        </div>
      )}

      {msg && <div className="vai-msg">{msg}</div>}

      {/* Services list */}
      {!bootstrapping && (
        <>
          <p className="vai-desc">{t('vai_sessions_desc')}</p>
          <div className="vai-services-list">
            {services.map(svc => (
              <div key={svc.name} className="vai-svc-row">
                <span className={`dot ${svc.logged_in || svc.name === 'local_ffmpeg' ? 'green' : 'red'}`} />
                <span className="vai-svc-name">{svc.name}</span>
                <span className="vai-svc-note vai-svc-max">{svc.max_segment_s}s/seg</span>
                <span className="vai-svc-spacer" />
                {svc.name === 'local_ffmpeg' ? (
                  <span className="vai-svc-note" style={{ color: '#81c784' }}>zawsze dostępny</span>
                ) : svc.logged_in ? (
                  <span className="vai-svc-note" style={{ color: '#66bb6a' }}>✓ zalogowany</span>
                ) : (
                  <button
                    className="btn-sm btn-primary"
                    onClick={() => handleBootstrap(svc.name)}
                  >
                    Zaloguj
                  </button>
                )}
              </div>
            ))}
          </div>
          <div className="vai-hint">
            Kliknij "Zaloguj" obok serwisu → otworzy się przeglądarka → zaloguj się → kliknij "Zapisz sesję".
          </div>
        </>
      )}
    </div>
  );
}
