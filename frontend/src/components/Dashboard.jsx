import React from 'react';
import { useT } from '../i18n/index.jsx';

function BarChart({ label, usedPct, leftText, color = 'green' }) {
  const c = color === 'green' ? '#22c55e' : color === 'yellow' ? '#f59e0b' : '#ef4444';
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-secondary)', marginBottom: 4 }}>
        <span>{label}</span>
        <span>{leftText}</span>
      </div>
      <div className="hw-bar-wrap">
        <div className={`hw-bar-fill ${color}`} style={{ width: `${usedPct}%`, background: c }} />
      </div>
    </div>
  );
}

export default function Dashboard({ history = [], voices = {}, hardwareInfo, gpuAvailable, ollamaOnline, onNavigate }) {
  const { t } = useT();

  const QUICK_CARDS = [
    { id: 'manual',        icon: '🗣',  title: t('qc_manual_title'),       desc: t('qc_manual_desc') },
    { id: 'cloner',        icon: '🧬',  title: t('qc_cloner_title'),       desc: t('qc_cloner_desc') },
    { id: 'audiobook',     icon: '📖',  title: t('qc_audiobook_title'),    desc: t('qc_audiobook_desc') },
    { id: 'presentation',  icon: '🖥',  title: t('qc_presentation_title'), desc: t('qc_presentation_desc') },
    { id: 'video',         icon: '🎬',  title: t('qc_video_title'),        desc: t('qc_video_desc') },
    { id: 'transcription', icon: '📝',  title: t('qc_transcription_title'),desc: t('qc_transcription_desc') },
  ];

  const voiceCount = Object.keys(voices).length;
  const gpu = hardwareInfo?.gpu;
  const ram = hardwareInfo?.ram;
  const cap = hardwareInfo?.capabilities || {};

  const gpuUsedPct = gpu && gpu.vram_total_gb > 0
    ? Math.round((1 - gpu.vram_free_gb / gpu.vram_total_gb) * 100)
    : 0;
  const ramUsedPct = ram && ram.total_gb > 0
    ? Math.round((1 - ram.free_gb / ram.total_gb) * 100)
    : 0;

  const capRows = [
    { label: '⚡ TTS szybki (edge-tts)',    ok: cap.tts_fast,           time: hardwareInfo?.estimated_times?.tts_30s },
    { label: '🧬 Klonowanie głosu (XTTS)',  ok: cap.tts_clone_xtts,     time: hardwareInfo?.estimated_times?.clone_30s },
    { label: '🎬 Generator wideo',          ok: cap.video_generation,   time: hardwareInfo?.estimated_times?.video_5s },
    { label: '📝 Transkrypcja (WhisperX)',  ok: cap.transcription,      time: hardwareInfo?.estimated_times?.transcription_1h },
    { label: '🎵 Muzyka AI (MusicGen)',     ok: cap.music_generation,   time: hardwareInfo?.estimated_times?.music_2min },
    { label: '👤 Avatar/Lip-sync',          ok: cap.avatar_lipsync,     time: hardwareInfo?.estimated_times?.avatar_30s },
  ];

  const recent = history.slice(0, 3);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
      {/* Quick start */}
      <section>
        <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 14 }}>
          {t('dash_what_today')}
        </div>
        <div className="dashboard-grid">
          {QUICK_CARDS.map(c => (
            <button key={c.id} className="quick-card" onClick={() => onNavigate(c.id)}>
              <div className="qc-icon">{c.icon}</div>
              <div className="qc-title">{c.title}</div>
              <div className="qc-desc">{c.desc}</div>
            </button>
          ))}
        </div>
      </section>

      {/* Status systemu */}
      <section>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          {t('dash_system_status')}
        </div>
        <div className="dash-status-grid">
          {/* GPU */}
          <div className="status-card">
            <div className="sc-label">GPU</div>
            <div className="sc-value">
              {gpu ? gpu.name : t('dash_no_gpu')}
            </div>
            {gpu && gpu.vram_total_gb > 0 && (
              <BarChart
                label={`${gpu.vram_free_gb.toFixed(1)} GB wolne`}
                usedPct={gpuUsedPct}
                leftText={`${gpu.vram_total_gb.toFixed(0)} GB total`}
                color={gpuUsedPct < 60 ? 'green' : gpuUsedPct < 85 ? 'yellow' : 'red'}
              />
            )}
            {!gpu && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>{t('dash_cpu_active')}</div>}
          </div>
          {/* RAM */}
          <div className="status-card">
            <div className="sc-label">{t('dash_ram')}</div>
            <div className="sc-value">{ram ? `${ram.free_gb.toFixed(1)} GB wolne` : '—'}</div>
            {ram && (
              <BarChart
                label={t('dash_ram_used')}
                usedPct={ramUsedPct}
                leftText={`${ram.total_gb.toFixed(0)} GB total`}
                color={ramUsedPct < 70 ? 'green' : ramUsedPct < 90 ? 'yellow' : 'red'}
              />
            )}
          </div>
          {/* Ollama */}
          <div className="status-card">
            <div className="sc-label">Ollama AI</div>
            <div className="sc-value" style={{ color: ollamaOnline ? 'var(--success)' : 'var(--danger)' }}>
              {ollamaOnline ? '● Online' : '● Offline'}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
              {t('dash_ollama_hint')}
            </div>
          </div>
          {/* Głosy */}
          <div className="status-card">
            <div className="sc-label">{t('dash_voices_available')}</div>
            <div className="sc-value">{voiceCount} {t('dash_voices_count')}</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
              {t('dash_voices_hint')}
            </div>
          </div>
        </div>
      </section>

      {/* Capability matrix */}
      {hardwareInfo && (
        <section>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            {t('dash_capabilities')}
          </div>
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
            <table className="cap-table">
              <thead>
                <tr>
                  <th>{t('dash_cap_feature')}</th>
                  <th>{t('dash_cap_status')}</th>
                  <th>{t('dash_cap_time')}</th>
                </tr>
              </thead>
              <tbody>
                {capRows.map(r => (
                  <tr key={r.label}>
                    <td style={{ color: 'var(--text-primary)' }}>{r.label}</td>
                    <td>
                      <span className={`cap-badge ${r.ok ? 'ok' : 'no'}`}>
                        {r.ok ? t('dash_cap_available') : t('dash_cap_unavailable')}
                      </span>
                    </td>
                    <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{r.time || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Ostatnie projekty */}
      {recent.length > 0 && (
        <section>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            {t('dash_recent')}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {recent.map((h, i) => {
              const isVideo = h.mediaType === 'video' || h.filename?.match(/\.(mp4|webm)$/i);
              return (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10 }}>
                  <span style={{ fontSize: 20 }}>{isVideo ? '🎬' : '🎵'}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{h.filename}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{h.ts}</div>
                  </div>
                  {h.url && (
                    <a href={h.url} download={h.filename} className="btn btn-ghost btn-sm" style={{ textDecoration: 'none', fontSize: 11 }}>{t('dash_download')}</a>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
