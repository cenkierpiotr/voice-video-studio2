import React, { useState, useRef, useEffect } from 'react';
import { useT } from '../i18n/index.jsx';

export default function PresentationBatchQueue({ voices = {}, xttsSpeed, onXttsSpeedChange, XttsSpeedControl, onAddJobs }) {
  const { t } = useT();
  const voicesList = Object.entries(voices).map(([key, v]) => ({ key, label: v.label || key }));
  const defaultVoice = voicesList[0]?.key || 'pl_male_marek';

  const [voiceKey, setVoiceKey] = useState(defaultVoice);
  const [files, setFiles] = useState([]); // [{file, name, sessionId, slides, status, error}]
  const [dragging, setDragging] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const fileRef = useRef();

  // Sync voiceKey if voices load later
  useEffect(() => {
    if (!voices[voiceKey] && voicesList.length) setVoiceKey(voicesList[0].key);
  }, [voices]); // eslint-disable-line

  const addFiles = async (newFiles) => {
    const accepted = Array.from(newFiles).filter(f => /\.(pptx|ppt|pdf)$/i.test(f.name));
    if (!accepted.length) return;

    const entries = accepted.map(f => ({ file: f, name: f.name, sessionId: null, slides: null, status: 'parsing', error: null }));
    setFiles(prev => [...prev, ...entries]);

    for (const entry of entries) {
      try {
        const fd = new FormData();
        fd.append('file', entry.file);
        const res = await fetch('/api/presentation/parse', { method: 'POST', body: fd });
        const ct = res.headers.get('content-type') || '';
        if (!ct.includes('application/json'))
          throw new Error(`${t('pbq_err_server')} (HTTP ${res.status}). ${t('pbq_err_check_logs')}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || t('ps_err_parse'));
        setFiles(prev => prev.map(f =>
          f.file === entry.file
            ? { ...f, sessionId: data.session_id, slides: data.slides, status: 'ready' }
            : f
        ));
      } catch (err) {
        setFiles(prev => prev.map(f =>
          f.file === entry.file ? { ...f, status: 'error', error: err.message } : f
        ));
      }
    }
  };

  const removeFile = (idx) => setFiles(prev => prev.filter((_, i) => i !== idx));

  const handleDrop = (e) => {
    e.preventDefault(); setDragging(false);
    addFiles(e.dataTransfer.files);
  };

  const readyCount = files.filter(f => f.status === 'ready').length;

  const handleSubmitAll = async () => {
    if (!readyCount) return;
    setSubmitting(true); setSubmitError('');
    const jobs = [];
    for (const entry of files.filter(f => f.status === 'ready')) {
      try {
        const fd = new FormData();
        fd.append('session_id', entry.sessionId);
        fd.append('slides', JSON.stringify(entry.slides.map(s => ({ index: s.index, notes: s.notes || s.text || '' }))));
        fd.append('voice_key', voiceKey);
        fd.append('xtts_speed', String(xttsSpeed ?? 1.0));
        const res = await fetch('/api/presentation/render', { method: 'POST', body: fd });
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || t('pbq_err_queueing'));
        jobs.push({ job_id: data.job_id, queue_position: data.queue_length || 1, status: 'queued', filename: entry.name });
        setFiles(prev => prev.map(f => f.file === entry.file ? { ...f, status: 'queued' } : f));
      } catch (err) {
        setFiles(prev => prev.map(f => f.file === entry.file ? { ...f, status: 'error', error: err.message } : f));
      }
    }
    if (jobs.length && onAddJobs) onAddJobs(jobs);
    setSubmitting(false);
  };

  const statusIcon = (s) => ({ parsing: '⏳', ready: '✅', error: '❌', queued: '📤' }[s] || '?');
  const statusLabel = (s, err) => ({
    parsing: t('pbq_status_parsing'),
    ready: t('pbq_status_ready'),
    error: `${t('pbq_status_error')}: ${err || t('pbq_status_unknown')}`,
    queued: t('pbq_status_queued'),
  }[s] || s);

  const inputStyle = {
    background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 8,
    color: 'var(--text-primary)', padding: '8px 12px', fontSize: 13, width: '100%',
  };

  return (
    <div style={{ padding: '0 0 20px' }}>
      <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 16 }}>
        📂 {t('pbq_title')}
      </div>

      {/* Drop zone */}
      <div
        onDragEnter={() => setDragging(true)}
        onDragLeave={() => setDragging(false)}
        onDragOver={e => e.preventDefault()}
        onDrop={handleDrop}
        onClick={() => fileRef.current?.click()}
        style={{
          border: `2px dashed ${dragging ? 'var(--accent)' : 'var(--border)'}`,
          borderRadius: 12, padding: '32px 20px', textAlign: 'center', cursor: 'pointer',
          background: dragging ? 'rgba(91,106,240,0.07)' : 'var(--bg-card)',
          transition: 'all 0.15s ease', marginBottom: 16,
        }}
      >
        <div style={{ fontSize: 32, marginBottom: 8 }}>📎</div>
        <div style={{ fontSize: 14, color: 'var(--text-secondary)' }}>
          {t('pbq_drop_hint')} <strong>{t('pbq_click_to_select')}</strong>
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
          {t('pbq_multi_hint')}
        </div>
        <input ref={fileRef} type="file" accept=".pptx,.ppt,.pdf" multiple style={{ display: 'none' }}
          onChange={e => addFiles(e.target.files)} />
      </div>

      {/* File list */}
      {files.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16 }}>
          {files.map((f, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 10,
              background: f.status === 'error' ? 'rgba(239,68,68,0.07)' : f.status === 'queued' ? 'rgba(74,222,128,0.07)' : 'var(--bg-card)',
              border: `1px solid ${f.status === 'error' ? 'rgba(239,68,68,0.3)' : f.status === 'queued' ? 'rgba(74,222,128,0.3)' : 'var(--border)'}`,
            }}>
              <span style={{ fontSize: 18 }}>{statusIcon(f.status)}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {f.name}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                  {statusLabel(f.status, f.error)}
                  {f.slides && f.status === 'ready' && ` — ${f.slides.length} ${t('ps_slides_count')}`}
                </div>
              </div>
              {f.status !== 'queued' && (
                <button onClick={() => removeFile(i)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 16, padding: '2px 6px' }}
                  title={t('pbq_remove')}>✕</button>
              )}
            </div>
          ))}
        </div>
      )}

      {files.length > 0 && (
        <>
          {/* Voice selector (shared for all files) */}
          <div style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 5 }}>
              🎙 {t('pbq_voice_for_all')}
            </label>
            <select style={inputStyle} value={voiceKey} onChange={e => setVoiceKey(e.target.value)}>
              {voicesList.map(v => <option key={v.key} value={v.key}>{v.label}</option>)}
            </select>
          </div>

          {/* Speed control */}
          {XttsSpeedControl && (
            <div style={{ marginBottom: 14 }}>
              <XttsSpeedControl value={xttsSpeed ?? 1.0} onChange={onXttsSpeedChange} />
            </div>
          )}

          {submitError && (
            <div className="alert alert-error" style={{ fontSize: 13, marginBottom: 10 }}>⚠️ {submitError}</div>
          )}

          <button className="btn btn-primary btn-lg" style={{ width: '100%' }}
            onClick={handleSubmitAll}
            disabled={submitting || readyCount === 0}>
            {submitting
              ? `⏳ ${t('pbq_queueing')}`
              : `🚀 ${t('pbq_add')} ${readyCount} ${readyCount === 1 ? t('pbq_presentation_one') : readyCount < 5 ? t('pbq_presentation_few') : t('pbq_presentation_many')} ${t('pbq_to_queue')}`}
          </button>

          <div style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'center', marginTop: 8 }}>
            {t('pbq_bg_hint')}
          </div>
        </>
      )}
    </div>
  );
}
