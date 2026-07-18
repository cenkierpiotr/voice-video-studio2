import React, { useState, useRef } from 'react';
import { useT } from '../i18n/index.jsx';

const SEP = () => (
  <div style={{ height: 1, background: 'var(--border)', margin: '4px 0', opacity: 0.5 }} />
);

function TimeInput({ value, onChange, placeholder }) {
  return (
    <input
      className="form-input"
      style={{ fontFamily: 'monospace', fontSize: 13 }}
      placeholder={placeholder || '0'}
      value={value}
      onChange={e => onChange(e.target.value)}
    />
  );
}

function parseSecs(val) {
  if (!val) return null;
  val = String(val).trim();
  if (/^\d+(\.\d+)?$/.test(val)) return parseFloat(val);
  const m = val.match(/^(\d+):(\d{1,2})(?:\.(\d+))?$/);
  if (m) return parseInt(m[1]) * 60 + parseInt(m[2]) + (m[3] ? parseFloat('0.' + m[3]) : 0);
  return null;
}

function fmtSecs(s) {
  if (s == null) return '';
  const m = Math.floor(s / 60);
  const sec = (s % 60).toFixed(1);
  return m > 0 ? `${m}:${String(Math.floor(s % 60)).padStart(2, '0')}` : `${sec}s`;
}

export default function VideoEditor({ voices = {} }) {
  const { t } = useT();
  const voicesList = Object.entries(voices).map(([key, v]) => ({ key, label: v.label || key }));
  const defaultVoice = voicesList[0]?.key || 'pl_male_marek';

  const [videoFile, setVideoFile] = useState(null);
  const [videoUrl, setVideoUrl] = useState(null);
  const [videoDuration, setVideoDuration] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [previewPlaying, setPreviewPlaying] = useState(false);
  const trimIntervalRef = useRef(null);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);

  // Trim
  const [trimStart, setTrimStart] = useState('');
  const [trimEnd, setTrimEnd] = useState('');

  // Crop / rotate / speed
  const [cropTop, setCropTop] = useState('');
  const [cropBottom, setCropBottom] = useState('');
  const [cropLeft, setCropLeft] = useState('');
  const [cropRight, setCropRight] = useState('');
  const [rotateDeg, setRotateDeg] = useState('0');
  const [speed, setSpeed] = useState('1');
  const [videoNatural, setVideoNatural] = useState(null); // {w, h}

  // Audio
  const [audioAction, setAudioAction] = useState('keep');
  const [ttsText, setTtsText] = useState('');
  const [ttsSpeaker, setTtsSpeaker] = useState(defaultVoice);
  const [audioFile, setAudioFile] = useState(null);
  const [audioFileName, setAudioFileName] = useState('');

  // Subtitles
  const [subtitles, setSubtitles] = useState([]);

  const videoInputRef = useRef();
  const audioInputRef = useRef();
  const videoEl = useRef();

  const handleVideoDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('video/')) loadVideo(file);
  };

  const loadVideo = (file) => {
    setVideoFile(file);
    setVideoUrl(URL.createObjectURL(file));
    setResult(null);
    setError('');
    setTrimStart('');
    setTrimEnd('');
  };

  const handleAudioFile = (e) => {
    const file = e.target.files[0];
    if (file) { setAudioFile(file); setAudioFileName(file.name); }
  };

  const addSubtitle = () => {
    const lastEnd = subtitles[subtitles.length - 1];
    const startSec = lastEnd ? (parseSecs(lastEnd.end) ?? 0) + 0.5 : 0;
    setSubtitles(s => [...s, {
      start: String(startSec.toFixed(1)),
      end: String((startSec + 3).toFixed(1)),
      text: '',
    }]);
  };

  const updateSubtitle = (i, patch) =>
    setSubtitles(s => s.map((sub, idx) => idx === i ? { ...sub, ...patch } : sub));

  const removeSubtitle = (i) => setSubtitles(s => s.filter((_, idx) => idx !== i));

  const setCurrentTime = (field) => {
    if (!videoEl.current) return;
    const t = videoEl.current.currentTime.toFixed(1);
    if (field === 'start') setTrimStart(t);
    else setTrimEnd(t);
  };

  const previewTrim = () => {
    if (!videoEl.current || !videoDuration) return;
    const start = parseSecs(trimStart) ?? 0;
    const end = parseSecs(trimEnd) ?? videoDuration;
    clearInterval(trimIntervalRef.current);
    videoEl.current.currentTime = start;
    videoEl.current.play();
    setPreviewPlaying(true);
    trimIntervalRef.current = setInterval(() => {
      if (!videoEl.current) return;
      if (videoEl.current.currentTime >= end) {
        videoEl.current.pause();
        clearInterval(trimIntervalRef.current);
        setPreviewPlaying(false);
      }
    }, 100);
  };

  const stopPreview = () => {
    clearInterval(trimIntervalRef.current);
    videoEl.current?.pause();
    setPreviewPlaying(false);
  };

  const hasCrop = cropTop || cropBottom || cropLeft || cropRight;

  const handleSubmit = async () => {
    if (!videoFile) return;
    const hasOp = trimStart || trimEnd || audioAction !== 'keep' || subtitles.some(s => s.text.trim())
      || hasCrop || rotateDeg !== '0' || (speed && parseFloat(speed) !== 1);
    if (!hasOp) { setError(t('ve_err_select_op')); return; }
    if (audioAction === 'replace_tts' && !ttsText.trim()) { setError(t('ve_err_tts_text')); return; }
    if (audioAction === 'replace_file' && !audioFile) { setError(t('ve_err_upload_audio')); return; }

    setIsProcessing(true); setError(''); setResult(null);
    try {
      const fd = new FormData();
      fd.append('video', videoFile);
      if (trimStart) fd.append('trim_start', String(parseSecs(trimStart) ?? trimStart));
      if (trimEnd) fd.append('trim_end', String(parseSecs(trimEnd) ?? trimEnd));
      if (cropTop) fd.append('crop_top', cropTop);
      if (cropBottom) fd.append('crop_bottom', cropBottom);
      if (cropLeft) fd.append('crop_left', cropLeft);
      if (cropRight) fd.append('crop_right', cropRight);
      if (rotateDeg !== '0') fd.append('rotate_deg', rotateDeg);
      if (speed && parseFloat(speed) !== 1) fd.append('speed', speed);
      fd.append('audio_action', audioAction);
      if (audioAction === 'replace_tts') {
        fd.append('tts_text', ttsText);
        fd.append('tts_speaker', ttsSpeaker || defaultVoice);
      }
      if (audioAction === 'replace_file' && audioFile) fd.append('audio_file', audioFile);
      const validSubs = subtitles.filter(s => s.text.trim() && s.start);
      if (validSubs.length) fd.append('subtitles', JSON.stringify(validSubs));

      const res = await fetch('/api/edit-video', { method: 'POST', body: fd });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.detail || `HTTP ${res.status}`);
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      setResult({ url, filename: `edited_${videoFile.name}` });
    } catch (e) {
      setError(e.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const opsCount = [
    trimStart || trimEnd,
    audioAction !== 'keep',
    subtitles.some(s => s.text.trim()),
    hasCrop,
    rotateDeg !== '0',
    speed && parseFloat(speed) !== 1,
  ].filter(Boolean).length;

  return (
    <div className="card">
      <div className="card-header">
        <h3 className="card-title">✂️ {t('ve_title')}</h3>
        <p style={{ fontSize: 13, opacity: 0.65, margin: 0 }}>
          {t('ve_subtitle')}
        </p>
      </div>
      <div className="card-body space-y-4">

        {/* Upload area */}
        <div className="form-group">
          <label className="form-label">{t('ve_video_file')}</label>
          <div
            onDrop={handleVideoDrop}
            onDragOver={e => e.preventDefault()}
            onClick={() => !videoFile && videoInputRef.current?.click()}
            style={{
              border: `2px dashed ${videoFile ? 'var(--accent)' : 'var(--border)'}`,
              borderRadius: 10, padding: videoFile ? 0 : 24, textAlign: 'center',
              cursor: videoFile ? 'default' : 'pointer', overflow: 'hidden',
              background: 'rgba(255,255,255,0.02)',
            }}
          >
            {videoFile ? (
              <div>
                <div style={{ position: 'relative' }}>
                  <video
                    ref={videoEl}
                    src={videoUrl}
                    controls
                    onLoadedMetadata={e => {
                      setVideoDuration(e.target.duration);
                      setVideoNatural({ w: e.target.videoWidth, h: e.target.videoHeight });
                    }}
                    style={{ width: '100%', maxHeight: 280, display: 'block', borderRadius: 8 }}
                  />
                  {hasCrop && videoNatural && (() => {
                    const top = (parseInt(cropTop) || 0) / videoNatural.h * 100;
                    const bottom = (parseInt(cropBottom) || 0) / videoNatural.h * 100;
                    const left = (parseInt(cropLeft) || 0) / videoNatural.w * 100;
                    const right = (parseInt(cropRight) || 0) / videoNatural.w * 100;
                    const box = (style) => (
                      <div style={{ position: 'absolute', background: 'rgba(0,0,0,0.65)', pointerEvents: 'none', ...style }} />
                    );
                    return (
                      <>
                        {top > 0 && box({ top: 0, left: 0, right: 0, height: `${top}%` })}
                        {bottom > 0 && box({ bottom: 0, left: 0, right: 0, height: `${bottom}%` })}
                        {left > 0 && box({ top: `${top}%`, bottom: `${bottom}%`, left: 0, width: `${left}%` })}
                        {right > 0 && box({ top: `${top}%`, bottom: `${bottom}%`, right: 0, width: `${right}%` })}
                      </>
                    );
                  })()}
                </div>
                <div style={{ padding: '8px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 12, opacity: 0.6 }}>
                    {videoFile.name}
                    {videoDuration != null && ` · ${fmtSecs(videoDuration)}`}
                  </span>
                  <button type="button"
                    onClick={() => { setVideoFile(null); setVideoUrl(null); setVideoDuration(null); setResult(null); }}
                    style={{ fontSize: 11, padding: '3px 8px', borderRadius: 6, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                    {t('ve_change')}
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div style={{ fontSize: 32 }}>🎬</div>
                <div style={{ fontSize: 13, opacity: 0.7, marginTop: 6 }}>{t('ve_drag_or_click')}</div>
                <div style={{ fontSize: 11, opacity: 0.4, marginTop: 2 }}>MP4, MKV, WebM, MOV, AVI</div>
              </>
            )}
          </div>
          <input ref={videoInputRef} type="file" accept="video/*" style={{ display: 'none' }}
            onChange={e => { if (e.target.files[0]) loadVideo(e.target.files[0]); }} />
        </div>

        {videoFile && (
          <>
            <SEP />

            {/* Trim */}
            <div className="form-group">
              <label className="form-label">✂️ {t('ve_trimming')}</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <div style={{ fontSize: 11, opacity: 0.6, marginBottom: 4 }}>{t('ve_from_sec')}</div>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <TimeInput value={trimStart} onChange={setTrimStart} placeholder="0" />
                    <button type="button" onClick={() => setCurrentTime('start')} title={t('ve_set_current_time')}
                      style={{ padding: '0 10px', borderRadius: 7, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 14, flexShrink: 0 }}>⏱</button>
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 11, opacity: 0.6, marginBottom: 4 }}>{t('ve_to_sec')}</div>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <TimeInput value={trimEnd} onChange={setTrimEnd} placeholder={videoDuration ? String(videoDuration.toFixed(1)) : t('ve_end')} />
                    <button type="button" onClick={() => setCurrentTime('end')} title={t('ve_set_current_time')}
                      style={{ padding: '0 10px', borderRadius: 7, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 14, flexShrink: 0 }}>⏱</button>
                  </div>
                </div>
              </div>
              {/* Trim timeline */}
              {videoDuration > 0 && (
                <div style={{ marginTop: 8 }}>
                  <div
                    style={{ position: 'relative', height: 18, background: 'rgba(255,255,255,0.08)', borderRadius: 6, cursor: 'pointer', overflow: 'hidden' }}
                    onClick={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      const t = ((e.clientX - rect.left) / rect.width) * videoDuration;
                      if (videoEl.current) videoEl.current.currentTime = t;
                    }}
                  >
                    {(trimStart || trimEnd) && (() => {
                      const s = (parseSecs(trimStart) ?? 0) / videoDuration * 100;
                      const e = (parseSecs(trimEnd) ?? videoDuration) / videoDuration * 100;
                      return (
                        <div style={{
                          position: 'absolute', top: 0, left: `${s}%`, width: `${e - s}%`,
                          height: '100%', background: 'rgba(139,92,246,0.55)', borderRadius: 4,
                        }} />
                      );
                    })()}
                    <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 6px', pointerEvents: 'none' }}>
                      <span style={{ fontSize: 9, opacity: 0.4 }}>0s</span>
                      <span style={{ fontSize: 9, opacity: 0.4 }}>{fmtSecs(videoDuration / 2)}</span>
                      <span style={{ fontSize: 9, opacity: 0.4 }}>{fmtSecs(videoDuration)}</span>
                    </div>
                  </div>
                  <div style={{ marginTop: 6, display: 'flex', gap: 6 }}>
                    <button type="button" onClick={previewPlaying ? stopPreview : previewTrim}
                      disabled={!trimStart && !trimEnd}
                      style={{ fontSize: 11, padding: '4px 10px', borderRadius: 7, border: '1px solid var(--border)', background: previewPlaying ? 'rgba(139,92,246,0.2)' : 'transparent', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                      {previewPlaying ? `⏹ ${t('ve_stop')}` : `▶ ${t('ve_preview_trim')}`}
                    </button>
                    <span style={{ fontSize: 10, opacity: 0.4, alignSelf: 'center' }}>
                      {trimStart || trimEnd
                        ? `${fmtSecs(parseSecs(trimStart) ?? 0)} → ${fmtSecs(parseSecs(trimEnd) ?? videoDuration)} (${fmtSecs((parseSecs(trimEnd) ?? videoDuration) - (parseSecs(trimStart) ?? 0))})`
                        : t('ve_whole_movie')}
                    </span>
                  </div>
                </div>
              )}
              <div style={{ fontSize: 11, opacity: 0.45, marginTop: 4 }}>
                {t('ve_trim_hint')}
              </div>
            </div>

            <SEP />

            {/* Crop */}
            <div className="form-group">
              <label className="form-label">⬛ {t('ve_crop')}</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 8 }}>
                <div>
                  <div style={{ fontSize: 11, opacity: 0.6, marginBottom: 4 }}>{t('ve_crop_top')}</div>
                  <input className="form-input" type="number" min="0" placeholder="0"
                    value={cropTop} onChange={e => setCropTop(e.target.value)} />
                </div>
                <div>
                  <div style={{ fontSize: 11, opacity: 0.6, marginBottom: 4 }}>{t('ve_crop_bottom')}</div>
                  <input className="form-input" type="number" min="0" placeholder="0"
                    value={cropBottom} onChange={e => setCropBottom(e.target.value)} />
                </div>
                <div>
                  <div style={{ fontSize: 11, opacity: 0.6, marginBottom: 4 }}>{t('ve_crop_left')}</div>
                  <input className="form-input" type="number" min="0" placeholder="0"
                    value={cropLeft} onChange={e => setCropLeft(e.target.value)} />
                </div>
                <div>
                  <div style={{ fontSize: 11, opacity: 0.6, marginBottom: 4 }}>{t('ve_crop_right')}</div>
                  <input className="form-input" type="number" min="0" placeholder="0"
                    value={cropRight} onChange={e => setCropRight(e.target.value)} />
                </div>
              </div>
              <div style={{ fontSize: 11, opacity: 0.45, marginTop: 6 }}>
                {t('ve_crop_hint')}{videoNatural ? ` (${videoNatural.w}×${videoNatural.h}px)` : ''}
              </div>
              {hasCrop && (
                <button type="button" onClick={() => { setCropTop(''); setCropBottom(''); setCropLeft(''); setCropRight(''); }}
                  style={{ marginTop: 6, fontSize: 11, padding: '4px 10px', borderRadius: 7, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                  ↺ {t('ve_crop_reset')}
                </button>
              )}
            </div>

            <SEP />

            {/* Rotate + Speed */}
            <div className="form-group">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div>
                  <label className="form-label">🔄 {t('ve_rotate')}</label>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {['0', '90', '180', '270'].map(deg => (
                      <button key={deg} type="button" onClick={() => setRotateDeg(deg)} style={{
                        flex: 1, padding: '6px 0', borderRadius: 8, fontSize: 12,
                        border: `1.5px solid ${rotateDeg === deg ? 'var(--accent)' : 'var(--border)'}`,
                        background: rotateDeg === deg ? 'rgba(139,92,246,0.15)' : 'rgba(255,255,255,0.03)',
                        color: 'var(--text)', cursor: 'pointer', fontWeight: rotateDeg === deg ? 600 : 400,
                      }}>{deg}°</button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="form-label">⏩ {t('ve_speed')}</label>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {['0.5', '0.75', '1', '1.5', '2'].map(sp => (
                      <button key={sp} type="button" onClick={() => setSpeed(sp)} style={{
                        flex: 1, padding: '6px 0', borderRadius: 8, fontSize: 12,
                        border: `1.5px solid ${speed === sp ? 'var(--accent)' : 'var(--border)'}`,
                        background: speed === sp ? 'rgba(139,92,246,0.15)' : 'rgba(255,255,255,0.03)',
                        color: 'var(--text)', cursor: 'pointer', fontWeight: speed === sp ? 600 : 400,
                      }}>{sp}×</button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <SEP />

            {/* Audio */}
            <div className="form-group">
              <label className="form-label">🔊 {t('ve_audio_track')}</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
                {[
                  { k: 'keep', l: '✅ ' + t('ve_audio_keep') },
                  { k: 'remove', l: '🔇 ' + t('ve_audio_remove') },
                  { k: 'replace_tts', l: '🎙️ ' + t('ve_audio_replace_tts') },
                  { k: 'replace_file', l: '📁 ' + t('ve_audio_replace_file') },
                ].map(opt => (
                  <button key={opt.k} type="button" onClick={() => setAudioAction(opt.k)} style={{
                    padding: '6px 12px', borderRadius: 8, fontSize: 12,
                    border: `1.5px solid ${audioAction === opt.k ? 'var(--accent)' : 'var(--border)'}`,
                    background: audioAction === opt.k ? 'rgba(139,92,246,0.15)' : 'rgba(255,255,255,0.03)',
                    color: 'var(--text)', cursor: 'pointer', fontWeight: audioAction === opt.k ? 600 : 400,
                  }}>{opt.l}</button>
                ))}
              </div>

              {audioAction === 'replace_tts' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <textarea className="form-textarea" rows={3}
                    placeholder={t('ve_tts_placeholder')}
                    value={ttsText} onChange={e => setTtsText(e.target.value)} />
                  <select className="form-select" value={ttsSpeaker} onChange={e => setTtsSpeaker(e.target.value)}>
                    {voicesList.map(v => <option key={v.key} value={v.key}>{v.label}</option>)}
                  </select>
                </div>
              )}

              {audioAction === 'replace_file' && (
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <button type="button" onClick={() => audioInputRef.current?.click()}
                    className="btn btn-secondary" style={{ fontSize: 12 }}>
                    📁 {t('ve_upload_audio')}
                  </button>
                  {audioFileName && <span style={{ fontSize: 12, opacity: 0.7 }}>{audioFileName}</span>}
                  <input ref={audioInputRef} type="file" accept="audio/*" style={{ display: 'none' }} onChange={handleAudioFile} />
                </div>
              )}
            </div>

            <SEP />

            {/* Subtitles */}
            <div className="form-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <label className="form-label" style={{ margin: 0 }}>💬 {t('ve_subtitles')}</label>
                <button type="button" onClick={addSubtitle}
                  style={{ fontSize: 12, padding: '4px 10px', borderRadius: 7, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                  + {t('ve_add_subtitle')}
                </button>
              </div>

              {subtitles.length === 0 && (
                <div style={{ fontSize: 12, opacity: 0.45, textAlign: 'center', padding: '8px 0' }}>
                  {t('ve_no_subtitles')}
                </div>
              )}

              {subtitles.map((sub, i) => (
                <div key={i} style={{ display: 'grid', gridTemplateColumns: '90px 90px 1fr auto', gap: 6, marginBottom: 6, alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: 10, opacity: 0.5, marginBottom: 2 }}>{t('ve_from_s')}</div>
                    <TimeInput value={sub.start} onChange={v => updateSubtitle(i, { start: v })} placeholder="0" />
                  </div>
                  <div>
                    <div style={{ fontSize: 10, opacity: 0.5, marginBottom: 2 }}>{t('ve_to_s')}</div>
                    <TimeInput value={sub.end} onChange={v => updateSubtitle(i, { end: v })} placeholder="3" />
                  </div>
                  <input className="form-input" style={{ fontSize: 12 }}
                    placeholder={t('ve_subtitle_text_placeholder')}
                    value={sub.text} onChange={e => updateSubtitle(i, { text: e.target.value })} />
                  <button type="button" onClick={() => removeSubtitle(i)}
                    style={{ padding: '6px 10px', borderRadius: 7, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer' }}>×</button>
                </div>
              ))}

              {subtitles.length > 0 && (
                <div style={{ fontSize: 11, opacity: 0.45, marginTop: 4 }}>
                  ℹ️ {t('ve_burnin_hint')}
                </div>
              )}
            </div>

            <SEP />

            {error && <div className="alert alert-error" style={{ fontSize: '0.85rem' }}>⚠️ {error}</div>}

            <button className="btn btn-primary btn-lg" style={{ width: '100%' }}
              onClick={handleSubmit} disabled={isProcessing || opsCount === 0}>
              {isProcessing
                ? `⏳ ${t('ve_processing')}`
                : `✂️ ${t('ve_btn_process')}${opsCount > 0 ? ` (${opsCount} ${opsCount === 1 ? t('ve_op_one') : t('ve_op_many')})` : ''}`}
            </button>

            {result && (
              <div className="alert" style={{ borderColor: 'rgba(74,222,128,0.4)', background: 'rgba(74,222,128,0.08)', display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ fontWeight: 600, fontSize: 13 }}>✅ {t('ve_video_ready')}</div>
                <video src={result.url} controls style={{ width: '100%', borderRadius: 8, maxHeight: 280 }} />
                <a href={result.url} download={result.filename} className="btn btn-primary" style={{ textAlign: 'center', textDecoration: 'none' }}>
                  ⬇️ {t('dash_download')} {result.filename}
                </a>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
