import React, { useState, useRef, useEffect } from 'react';
import JobMonitor from './JobMonitor.jsx';
import ModelSelector from './ModelSelector.jsx';
import { useT } from '../i18n/index.jsx';

export default function AvatarStudio({ voices = {}, onComplete }) {
  const { t } = useT();
  const [photo, setPhoto] = useState(null);     // File
  const [preview, setPreview] = useState(null); // data URL
  const [text, setText] = useState('');
  const [voiceKey, setVoiceKey] = useState('');
  const [dragging, setDragging] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [jobId, setJobId] = useState(null);
  const [result, setResult] = useState(null);
  const fileRef = useRef();

  const voicesList = Object.entries(voices).map(([key, v]) => ({ key, label: v.label || key }));

  useEffect(() => {
    if (!voiceKey && voicesList.length) setVoiceKey(voicesList[0].key);
  }, [voices]); // eslint-disable-line

  const loadPhoto = (file) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) { setError(t('av_err_must_be_image')); return; }
    setPhoto(file);
    const reader = new FileReader();
    reader.onload = e => setPreview(e.target.result);
    reader.readAsDataURL(file);
    setError('');
  };

  const handleDrop = (e) => {
    e.preventDefault(); setDragging(false);
    loadPhoto(e.dataTransfer.files[0]);
  };

  const handleSubmit = async () => {
    if (!photo) { setError(t('av_err_upload_photo')); return; }
    if (!text.trim()) { setError(t('av_err_enter_text')); return; }
    if (!voiceKey) { setError(t('av_err_select_voice')); return; }
    setError(''); setSubmitting(true); setResult(null); setJobId(null);
    try {
      const fd = new FormData();
      fd.append('photo', photo);
      fd.append('text', text.trim());
      fd.append('voice_key', voiceKey);
      fd.append('avatar_model', avatarModel);
      const res = await fetch('/api/render-avatar', { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || t('aes_err_server'));
      setJobId(data.job_id);
    } catch (e) {
      setError(e.message);
      setSubmitting(false);
    }
  };

  const handleJobComplete = (data) => {
    setSubmitting(false);
    setJobId(null);
    setResult(data);
    if (onComplete) onComplete(data);
  };

  const handleJobFailed = (err) => {
    setSubmitting(false);
    setJobId(null);
    setError(err);
  };

  const inputStyle = {
    background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 8,
    color: 'var(--text-primary)', padding: '8px 12px', fontSize: 13, width: '100%',
  };

  const [avatarModel, setAvatarModel] = useState('echomimic');

  const isLpAvailable = true; // backend shows badge dynamically — not blocking UI

  return (
    <div style={{ maxWidth: 680 }}>
      <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>
        👤 {t('av_title')}
      </div>
      <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 12 }}>
        {t('av_subtitle')}
      </div>

      <ModelSelector
        category="avatar"
        label="Model"
        onChange={setAvatarModel}
      />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
        {/* Photo upload */}
        <div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>📷 {t('av_face_photo')}</div>
          <div
            onDragEnter={() => setDragging(true)}
            onDragLeave={() => setDragging(false)}
            onDragOver={e => e.preventDefault()}
            onDrop={handleDrop}
            onClick={() => fileRef.current?.click()}
            style={{
              border: `2px dashed ${dragging ? 'var(--accent)' : 'var(--border)'}`,
              borderRadius: 12, cursor: 'pointer', overflow: 'hidden',
              background: dragging ? 'rgba(91,106,240,0.07)' : 'var(--bg-card)',
              transition: 'all 0.15s', aspectRatio: '1/1',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            {preview ? (
              <img src={preview} alt="preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <div style={{ textAlign: 'center', padding: 20, pointerEvents: 'none' }}>
                <div style={{ fontSize: 36, marginBottom: 8 }}>🙂</div>
                <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{t('av_drag_or_click')}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>JPG · PNG · WEBP</div>
              </div>
            )}
            <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" style={{ display: 'none' }}
              onChange={e => loadPhoto(e.target.files[0])} />
          </div>
          {preview && (
            <button
              onClick={() => { setPhoto(null); setPreview(null); }}
              style={{ marginTop: 6, fontSize: 11, color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', width: '100%' }}
            >
              ✕ {t('av_remove_photo')}
            </button>
          )}
        </div>

        {/* Text + voice */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 5 }}>
              🎙 {t('av_narrator_voice')}
            </label>
            <select style={inputStyle} value={voiceKey} onChange={e => setVoiceKey(e.target.value)}>
              {voicesList.map(v => <option key={v.key} value={v.key}>{v.label}</option>)}
            </select>
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 5 }}>
              📝 {t('av_text_to_speak')}
            </label>
            <textarea
              value={text}
              onChange={e => setText(e.target.value)}
              placeholder={t('av_text_placeholder')}
              rows={7}
              style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.5 }}
            />
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4, textAlign: 'right' }}>
              {text.length} {t('av_characters')}
            </div>
          </div>
        </div>
      </div>

      {/* Tips */}
      <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 12, color: 'var(--text-muted)' }}>
        <strong style={{ color: 'var(--text-secondary)' }}>{t('av_tips_label')}:</strong> {t('av_tips_text')}
      </div>

      {/* Error */}
      {error && (
        <div className="alert alert-error" style={{ marginBottom: 12, fontSize: 13 }}>
          ⚠️ {error}
          <button onClick={() => setError('')} style={{ marginLeft: 8, background: 'none', border: 'none', cursor: 'pointer', color: 'inherit' }}>✕</button>
        </div>
      )}

      {/* Job monitor */}
      {jobId && (
        <div style={{ marginBottom: 16 }}>
          <JobMonitor jobId={jobId} onComplete={handleJobComplete} onFailed={handleJobFailed} />
        </div>
      )}

      {/* Result */}
      {result && (
        <div style={{ marginBottom: 16, background: 'var(--bg-card)', borderRadius: 12, overflow: 'hidden', border: '1px solid var(--border)' }}>
          <video src={result.url} controls style={{ width: '100%', display: 'block', background: '#000', maxHeight: 400 }} />
          <div style={{ display: 'flex', gap: 8, padding: 12 }}>
            <a href={result.url} download={result.filename} className="btn btn-primary btn-sm" style={{ textDecoration: 'none' }}>
              ⬇️ {t('av_download_mp4')}
            </a>
            <button className="btn btn-ghost btn-sm" onClick={() => { setResult(null); setPreview(null); setPhoto(null); setText(''); }}>
              ↺ {t('av_new_recording')}
            </button>
          </div>
        </div>
      )}

      {/* Submit */}
      {!jobId && !result && (
        <button
          className="btn btn-primary btn-lg"
          style={{ width: '100%' }}
          onClick={handleSubmit}
          disabled={submitting || !photo || !text.trim()}
        >
          {submitting ? <><span className="spinner" /> {t('av_generating')}</> : `🎬 ${t('av_btn_generate')}`}
        </button>
      )}
    </div>
  );
}
