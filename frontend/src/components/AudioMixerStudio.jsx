import React, { useState, useRef, useCallback } from 'react';
import { useT } from '../i18n/index.jsx';

function TrackUpload({ icon, title, badge, required, file, onFile, volume, onVolume, preview, t }) {
  const ref = useRef();
  const handleDrop = useCallback((e) => {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (f) onFile(f);
  }, [onFile]);

  return (
    <div className="mixer-track">
      <div className="track-header">
        <span style={{ fontSize: 20 }}>{icon}</span>
        <span className="track-name">{title}</span>
        <span className={`track-badge ${required ? 'required' : 'optional'}`}>
          {required ? t('ams_required') : t('ams_optional')}
        </span>
        {file && <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--text-muted)' }}>{file.name}</span>}
      </div>
      {/* Drop zone */}
      <div
        onClick={() => ref.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
        style={{
          border: `2px dashed ${file ? 'var(--accent)' : 'var(--border)'}`,
          borderRadius: 8, padding: '14px 20px', textAlign: 'center',
          cursor: 'pointer', transition: 'all 0.2s',
          background: file ? 'rgba(91,106,240,0.05)' : 'transparent',
          fontSize: 13, color: 'var(--text-secondary)',
        }}
      >
        {file ? `✅ ${file.name}` : t('ams_drop_or_click')}
        <input ref={ref} type="file" accept="audio/*,video/*" style={{ display: 'none' }}
          onChange={e => e.target.files[0] && onFile(e.target.files[0])} />
      </div>
      {/* Preview audio */}
      {file && preview && (
        <audio controls src={URL.createObjectURL(file)} style={{ width: '100%', marginTop: 8, accentColor: 'var(--accent)' }} />
      )}
      {/* Volume slider */}
      {file && (
        <div style={{ marginTop: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-secondary)', marginBottom: 4 }}>
            <span>🔊 {t('mb_volume')}</span>
            <span style={{ fontFamily: 'monospace', color: 'var(--accent-light)' }}>{Math.round(volume * 100)}%</span>
          </div>
          <input type="range" className="form-range"
            min={0} max={2} step={0.05} value={volume}
            onChange={e => onVolume(parseFloat(e.target.value))} />
        </div>
      )}
    </div>
  );
}

export default function AudioMixerStudio({ onComplete }) {
  const { t } = useT();
  const [voiceFile, setVoiceFile]       = useState(null);
  const [musicFile, setMusicFile]       = useState(null);
  const [effectsFile, setEffectsFile]   = useState(null);
  const [voiceVol, setVoiceVol]         = useState(1.0);
  const [musicVol, setMusicVol]         = useState(0.3);
  const [effectsVol, setEffectsVol]     = useState(0.5);
  const [fadeIn, setFadeIn]             = useState(false);
  const [fadeOut, setFadeOut]           = useState(false);
  const [loading, setLoading]           = useState(false);
  const [error, setError]               = useState(null);
  const [result, setResult]             = useState(null);

  const handleMix = async () => {
    if (!voiceFile) { setError(t('ams_upload_voice')); return; }
    setError(null);
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append('voice', voiceFile);
      if (musicFile)   fd.append('music', musicFile);
      if (effectsFile) fd.append('effects', effectsFile);
      fd.append('voice_volume',   voiceVol.toString());
      fd.append('music_volume',   musicVol.toString());
      fd.append('effects_volume', effectsVol.toString());
      fd.append('fade_in',        fadeIn ? 'true' : 'false');
      fd.append('fade_out',       fadeOut ? 'true' : 'false');

      const res = await fetch('/api/audio/mix', { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || t('aes_err_server'));
      setResult(data);
      if (onComplete) onComplete(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6 }}>🎚 {t('ams_title')}</div>
        <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
          {t('ams_subtitle')}
        </div>
      </div>

      {/* Tracks */}
      <TrackUpload icon="🎙" title={t('ams_track_voice')} badge="required" required
        file={voiceFile} onFile={setVoiceFile}
        volume={voiceVol} onVolume={setVoiceVol} preview t={t} />

      <TrackUpload icon="🎵" title={t('ams_track_music')} badge="optional"
        file={musicFile} onFile={setMusicFile}
        volume={musicVol} onVolume={setMusicVol} preview t={t} />

      <TrackUpload icon="🔊" title={t('ams_track_effects')} badge="optional"
        file={effectsFile} onFile={setEffectsFile}
        volume={effectsVol} onVolume={setEffectsVol} preview={false} t={t} />

      {/* Options */}
      <div style={{ display: 'flex', gap: 20, marginTop: 4, marginBottom: 20 }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13 }}>
          <input type="checkbox" checked={fadeIn} onChange={e => setFadeIn(e.target.checked)}
            style={{ accentColor: 'var(--accent)', width: 15, height: 15 }} />
          🎵 {t('ams_fade_in')}
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13 }}>
          <input type="checkbox" checked={fadeOut} onChange={e => setFadeOut(e.target.checked)}
            style={{ accentColor: 'var(--accent)', width: 15, height: 15 }} />
          🔇 {t('ams_fade_out')}
        </label>
      </div>

      {error && <div className="alert alert-error" style={{ marginBottom: 16 }}>⚠️ {error}</div>}

      <button className="btn btn-primary btn-lg" onClick={handleMix} disabled={loading || !voiceFile}>
        {loading ? <><span className="spinner" /> {t('ams_mixing')}</> : `🎚 ${t('ams_btn_mix')}`}
      </button>

      {/* Result */}
      {result && (
        <div className="alert alert-success" style={{ marginTop: 20, display: 'flex', alignItems: 'center', gap: 16 }}>
          <span>✅ {t('ams_done')}</span>
          <a href={result.url} download={result.filename} className="btn btn-secondary btn-sm"
            style={{ textDecoration: 'none', marginLeft: 'auto' }}>
            ⬇️ {t('dash_download')} {result.filename}
          </a>
        </div>
      )}
    </div>
  );
}
