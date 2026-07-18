import React, { useState, useRef, useEffect } from 'react';
import { useT } from '../i18n/index.jsx';

export default function PresentationStudio({ onRender, isRendering, error, voices = {}, ollamaHost, ollamaModel, xttsSpeed, onXttsSpeedChange, XttsSpeedControl, presJobs = [], onPresJobDone, onPresJobFailed }) {
  const { t } = useT();
  const voicesList = Object.entries(voices).map(([key, v]) => ({ key, label: v.label || key }));
  const defaultVoice = voicesList[0]?.key || 'pl_male_marek';

  const [step, setStep] = useState('upload');
  const [parsing, setParsing] = useState(false);
  const [parseError, setParseError] = useState('');
  const [sessionId, setSessionId] = useState('');
  const [filename, setFilename] = useState('');
  const [slides, setSlides] = useState([]);
  const [voiceKey, setVoiceKey] = useState(defaultVoice);
  const [genLoading, setGenLoading] = useState({});
  const [genAllLoading, setGenAllLoading] = useState(false);
  const [jobStatuses, setJobStatuses] = useState({}); // job_id -> {status, progress, message, url}
  const fileRef = useRef();

  // Poll active presJobs
  useEffect(() => {
    const active = presJobs.filter(j => {
      const s = jobStatuses[j.job_id]?.status || j.status;
      return s === 'queued' || s === 'running' || !s;
    });
    if (!active.length) return;
    const iv = setInterval(async () => {
      for (const j of active) {
        try {
          const res = await fetch(`/api/jobs/${j.job_id}`);
          if (!res.ok) continue;
          const d = await res.json();
          setJobStatuses(prev => ({ ...prev, [j.job_id]: d }));
          if ((d.status === 'done' || d.status === 'completed') && onPresJobDone) {
            onPresJobDone(j.job_id, { url: d.url, filename: d.filename || `prezentacja-${j.job_id}.mp4` });
          }
          if (d.status === 'failed' && onPresJobFailed) {
            onPresJobFailed(j.job_id, d.error || 'Błąd renderowania');
          }
        } catch {}
      }
    }, 2500);
    return () => clearInterval(iv);
  }, [presJobs, onPresJobDone, onPresJobFailed]); // eslint-disable-line

  const handleFileDrop = (e) => {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (f) parseFile(f);
  };

  const parseFile = async (file) => {
    const ext = file.name.split('.').pop().toLowerCase();
    if (!['pptx', 'pdf', 'ppt'].includes(ext)) {
      setParseError(t('ps_err_format'));
      return;
    }
    setParsing(true);
    setParseError('');
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/presentation/parse', { method: 'POST', body: fd });
      const ct = res.headers.get('content-type') || '';
      if (!ct.includes('application/json')) {
        const body = await res.text().catch(() => t('common_no_content')); throw new Error(`HTTP ${res.status} [CT: ${ct}]: ${body.slice(0,300)}`);
      }
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || t('ps_err_parse'));
      setSessionId(data.session_id);
      setFilename(data.filename || file.name);
      setSlides(data.slides);
      setStep('review');
    } catch (e) {
      setParseError(e.message);
    } finally {
      setParsing(false);
    }
  };

  const updateNotes = (index, notes) =>
    setSlides(s => s.map(sl => sl.index === index ? { ...sl, notes } : sl));

  const generateNarration = async (slideIndex) => {
    const slide = slides.find(s => s.index === slideIndex);
    if (!slide?.slide_text?.trim()) return;
    setGenLoading(l => ({ ...l, [slideIndex]: true }));
    try {
      const res = await fetch('/api/presentation/generate-narration', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slide_text: slide.slide_text,
          slide_num: slideIndex + 1,
          total_slides: slides.length,
          ollama_host: ollamaHost,
          model: ollamaModel,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Błąd');
      if (data.narration) updateNotes(slideIndex, data.narration);
    } catch {}
    finally { setGenLoading(l => ({ ...l, [slideIndex]: false })); }
  };

  const generateAll = async () => {
    setGenAllLoading(true);
    const empty = slides.filter(s => !s.notes?.trim() && s.slide_text?.trim());
    for (const s of empty) await generateNarration(s.index);
    setGenAllLoading(false);
  };

  const handleSubmit = () => {
    if (!slides.some(s => s.notes?.trim())) {
      alert(t('ps_err_no_narration'));
      return;
    }
    onRender({
      session_id: sessionId,
      slides: slides.map(s => ({ index: s.index, notes: s.notes || '' })),
      voice_key: voiceKey,
    });
  };

  const filledCount = slides.filter(s => s.notes?.trim()).length;
  const emptyWithText = slides.filter(s => !s.notes?.trim() && s.slide_text?.trim()).length;
  const estMin = Math.ceil(filledCount * 0.5);

  if (step === 'upload') return (
    <div className="card">
      <div className="card-header">
        <h3 className="card-title">🖥️ {t('ps_title')}</h3>
        <p style={{ fontSize: 13, opacity: 0.65, margin: 0 }}>
          {t('ps_upload_hint')}
        </p>
      </div>
      <div className="card-body">
        <div
          onDrop={handleFileDrop}
          onDragOver={e => e.preventDefault()}
          onClick={() => fileRef.current?.click()}
          style={{
            border: '2px dashed var(--border)', borderRadius: 12, padding: 48,
            textAlign: 'center', cursor: 'pointer',
            background: 'rgba(139,92,246,0.04)', transition: 'border-color 0.15s',
          }}
        >
          {parsing ? (
            <div>
              <div style={{ fontSize: 36 }}>⏳</div>
              <div style={{ fontSize: 14, marginTop: 10, opacity: 0.7 }}>{t('ps_parsing')}</div>
              <div style={{ fontSize: 12, opacity: 0.45, marginTop: 4 }}>{t('ps_parsing_sub')}</div>
            </div>
          ) : (
            <>
              <div style={{ fontSize: 48 }}>🖥️</div>
              <div style={{ fontSize: 15, fontWeight: 600, marginTop: 12 }}>{t('ps_drop_or_click')}</div>
              <div style={{ fontSize: 12, opacity: 0.5, marginTop: 6 }}>{t('ps_formats')}</div>
              <div style={{ marginTop: 16, fontSize: 12, opacity: 0.4, lineHeight: 1.6 }}>
                {t('ps_powerpoint_hint1')}<br/>
                {t('ps_powerpoint_hint2')}
              </div>
            </>
          )}
        </div>
        <input ref={fileRef} type="file" accept=".pptx,.ppt,.pdf" style={{ display: 'none' }}
          onChange={e => { if (e.target.files[0]) parseFile(e.target.files[0]); }} />
        {parseError && (
          <div className="alert alert-error" style={{ marginTop: 12, fontSize: 13 }}>⚠️ {parseError}</div>
        )}
        <div className="alert alert-info" style={{ marginTop: 16, fontSize: '0.78rem', padding: '8px 12px' }}>
          ℹ️ {t('ps_requirements')}
        </div>
      </div>
    </div>
  );

  return (
    <div className="card">
      <div className="card-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h3 className="card-title">🖥️ {t('ps_title')}</h3>
            <p style={{ fontSize: 12, opacity: 0.6, margin: 0 }}>
              {filename} · {slides.length} {t('ps_slides_count')} · {filledCount} {t('ps_with_narration')}
            </p>
          </div>
          <button type="button" onClick={() => { setStep('upload'); setSlides([]); }}
            style={{ fontSize: 11, padding: '4px 10px', borderRadius: 7, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer' }}>
            ← {t('ps_upload_other')}
          </button>
        </div>
      </div>
      <div className="card-body space-y-4">

        {/* Voice selector */}
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end' }}>
          <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
            <label className="form-label">🎙️ {t('ps_voice_label')}</label>
            <select className="form-select" value={voiceKey} onChange={e => setVoiceKey(e.target.value)}>
              {voicesList.map(v => <option key={v.key} value={v.key}>{v.label}</option>)}
            </select>
          </div>
          {emptyWithText > 0 && (
            <button type="button" className="btn btn-secondary"
              onClick={generateAll} disabled={genAllLoading}
              style={{ whiteSpace: 'nowrap', flexShrink: 0 }}>
              {genAllLoading ? t('ps_generating') : `✨ ${t('ps_ollama_fill')} ${emptyWithText} ${t('ps_empty_ones')}`}
            </button>
          )}
        </div>

        {/* Slides */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {slides.map((slide, i) => (
            <div key={slide.index} style={{
              display: 'grid', gridTemplateColumns: '220px 1fr', gap: 12,
              border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden',
              background: slide.notes?.trim() ? 'rgba(74,222,128,0.04)' : 'rgba(255,255,255,0.02)',
            }}>
              {/* Thumbnail */}
              <div style={{ position: 'relative', background: '#111', minHeight: 124 }}>
                {slide.image ? (
                  <img src={slide.image} alt={`${t('ps_slide')} ${i + 1}`}
                    style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }} />
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', minHeight: 124, opacity: 0.4, fontSize: 24 }}>🖼️</div>
                )}
                <div style={{
                  position: 'absolute', top: 6, left: 6,
                  background: 'rgba(0,0,0,0.7)', color: '#fff',
                  fontSize: 11, fontWeight: 700, padding: '2px 7px', borderRadius: 5,
                }}>
                  {i + 1}
                </div>
              </div>

              {/* Notes editor */}
              <div style={{ padding: '10px 12px 10px 0', display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 11, opacity: 0.5 }}>{t('ps_narration_text')}</span>
                  {slide.slide_text?.trim() && (
                    <button type="button" onClick={() => generateNarration(slide.index)}
                      disabled={genLoading[slide.index]}
                      style={{ fontSize: 11, padding: '3px 8px', borderRadius: 6, border: '1px solid var(--border)', background: 'transparent', color: 'var(--accent)', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                      {genLoading[slide.index] ? '⏳' : '✨ Ollama'}
                    </button>
                  )}
                </div>
                <textarea
                  className="form-textarea"
                  rows={4}
                  style={{ fontSize: 12, resize: 'vertical', flex: 1 }}
                  placeholder={slide.slide_text
                    ? t('ps_placeholder_no_notes')
                    : t('ps_placeholder_no_text')}
                  value={slide.notes || ''}
                  onChange={e => updateNotes(slide.index, e.target.value)}
                />
                {slide.slide_text?.trim() && !slide.notes?.trim() && (
                  <div style={{ fontSize: 10, opacity: 0.4 }}>
                    {t('ps_slide_text_label')} {slide.slide_text.slice(0, 80)}{slide.slide_text.length > 80 ? '…' : ''}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="alert alert-info" style={{ fontSize: '0.78rem', padding: '8px 12px' }}>
          ℹ️ {filledCount}/{slides.length} {t('ps_with_narration')} · {t('ps_estimated_time')} ~{estMin} min
          {emptyWithText > 0 && ` · ${emptyWithText} ${t('ps_can_fill_ollama')}`}
        </div>

        {error && <div className="alert alert-error" style={{ fontSize: '0.85rem' }}>⚠️ {error}</div>}

        {XttsSpeedControl && <div style={{marginBottom:10}}><XttsSpeedControl value={xttsSpeed ?? 1.0} onChange={onXttsSpeedChange} /></div>}

        <button className="btn btn-primary btn-lg" style={{ width: '100%' }}
          onClick={handleSubmit} disabled={filledCount === 0}>
          🎬 {t('ps_btn_generate')} ({filledCount} {t('ps_slides_count')})
        </button>

        {/* ── Kolejka zadań prezentacji ── */}
        {presJobs.length > 0 && (
          <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {t('ps_queue_title')}
            </div>
            {presJobs.map((job, i) => {
              const st = jobStatuses[job.job_id] || { status: job.status || 'queued', progress: 0 };
              const isDone   = st.status === 'done' || st.status === 'completed';
              const isFailed = st.status === 'failed';
              const isRun    = st.status === 'running';
              const isQ      = !isDone && !isFailed && !isRun;
              return (
                <div key={job.job_id} style={{
                  padding: '12px 14px', borderRadius: 10,
                  background: isDone ? 'rgba(74,222,128,0.07)' : isFailed ? 'rgba(239,68,68,0.07)' : isRun ? 'rgba(91,106,240,0.1)' : 'var(--bg-card)',
                  border: `1px solid ${isDone ? 'rgba(74,222,128,0.3)' : isFailed ? 'rgba(239,68,68,0.3)' : isRun ? 'rgba(91,106,240,0.4)' : 'var(--border)'}`,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 18 }}>
                      {isDone ? '✅' : isFailed ? '❌' : isRun ? '⚡' : '⏳'}
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>
                        {isDone ? t('ps_job_done') : isFailed ? t('ps_job_failed') : isRun
                          ? `${t('ps_slide')} ${st.slides_done ?? 0}/${st.slides_total ?? '?'}`
                          : `${t('ps_job_waiting')} (#${i + 1})`}
                      </div>
                      {isRun && st.eta_secs > 0 && (
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                          {(() => {
                            const m = Math.floor(st.eta_secs / 60), s = st.eta_secs % 60;
                            return `ETA: ${m > 0 ? `${m}m ` : ''}${s}s`;
                          })()}
                        </div>
                      )}
                      {isFailed && st.error && <div style={{ fontSize: 11, color: '#fca5a5', marginTop: 2 }}>{st.error}</div>}
                    </div>
                    {isDone && st.url && (
                      <a href={st.url} download style={{ fontSize: 12, color: 'var(--accent-light)', textDecoration: 'none', flexShrink: 0 }}>
                        ⬇️ {t('dash_download')}
                      </a>
                    )}
                  </div>
                  {isRun && typeof st.progress === 'number' && (
                    <div style={{ height: 3, background: 'var(--border)', borderRadius: 2, marginTop: 10, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${st.progress}%`, background: 'var(--accent)', transition: 'width 0.5s ease' }} />
                    </div>
                  )}
                </div>
              );
            })}
            <div style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'center', marginTop: 4 }}>
              💡 {t('ps_queue_hint')}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
