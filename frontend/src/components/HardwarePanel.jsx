import React, { useState } from 'react';

const CAP_LABELS = {
  tts_fast:          '⚡ TTS szybki (edge-tts)',
  tts_clone_xtts:    '🧬 Klonowanie głosu XTTS',
  video_generation:  '🎬 Generator wideo',
  video_generation_hd: '🎬 Generator wideo HD (1080p)',
  transcription:     '📝 Transkrypcja (WhisperX)',
  music_generation:  '🎵 Muzyka AI (MusicGen)',
  avatar_lipsync:    '👤 Avatar/Lip-sync',
};

function UsageBar({ label, usedPct, detail }) {
  const color = usedPct < 60 ? '#22c55e' : usedPct < 85 ? '#f59e0b' : '#ef4444';
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-secondary)', marginBottom: 5 }}>
        <span style={{ fontWeight: 500 }}>{label}</span>
        <span style={{ fontFamily: 'monospace' }}>{detail}</span>
      </div>
      <div style={{ background: 'var(--bg-input)', borderRadius: 4, height: 8, overflow: 'hidden' }}>
        <div style={{ width: `${usedPct}%`, height: '100%', background: color, borderRadius: 4, transition: 'width 0.5s ease' }} />
      </div>
    </div>
  );
}

export default function HardwarePanel({ info, onRefresh }) {
  const [refreshing, setRefreshing] = useState(false);

  if (!info) {
    return (
      <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)' }}>
        <div style={{ fontSize: 32, marginBottom: 10 }}>⏳</div>
        <div>Ładowanie danych sprzętu…</div>
      </div>
    );
  }

  const { gpu, ram, cpu, disk, capabilities, estimated_times, installed_models } = info;

  const gpuUsedPct = gpu?.vram_total_gb > 0
    ? Math.round((1 - gpu.vram_free_gb / gpu.vram_total_gb) * 100)
    : 0;
  const ramUsedPct = ram?.total_gb > 0
    ? Math.round((1 - ram.free_gb / ram.total_gb) * 100)
    : 0;
  const cpuPct = Math.round(cpu?.usage_percent || 0);

  const handleRefresh = async () => {
    if (!onRefresh) return;
    setRefreshing(true);
    await onRefresh();
    setRefreshing(false);
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>🖥 Twój komputer</h3>
        {onRefresh && (
          <button className="btn btn-ghost btn-sm" onClick={handleRefresh} disabled={refreshing}>
            {refreshing ? '⏳' : '🔄 Odśwież'}
          </button>
        )}
      </div>

      {/* Usage bars */}
      <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 16, marginBottom: 16 }}>
        {gpu && (
          <UsageBar
            label={`GPU — ${gpu.name}`}
            usedPct={gpuUsedPct}
            detail={`${gpu.vram_free_gb.toFixed(1)} / ${gpu.vram_total_gb.toFixed(1)} GB wolne`}
          />
        )}
        {ram && (
          <UsageBar
            label="RAM"
            usedPct={ramUsedPct}
            detail={`${ram.free_gb.toFixed(1)} / ${ram.total_gb.toFixed(1)} GB wolne`}
          />
        )}
        {cpu && (
          <UsageBar
            label={`CPU — ${cpu.cores} rdzeni`}
            usedPct={cpuPct}
            detail={`${cpuPct}% użycia`}
          />
        )}
        {disk && (
          <div style={{ fontSize: 12, color: 'var(--text-secondary)', borderTop: '1px solid var(--border)', paddingTop: 10, marginTop: 4 }}>
            💾 Dysk: <strong>{disk.free_gb.toFixed(0)} GB wolne</strong>
          </div>
        )}
      </div>

      {/* Capability matrix */}
      {capabilities && (
        <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden', marginBottom: 16 }}>
          <div style={{ padding: '10px 16px', background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid var(--border)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)' }}>
            Dostępność funkcji
          </div>
          <table className="cap-table">
            <thead>
              <tr>
                <th>Funkcja</th>
                <th>Status</th>
                <th>Czas</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(CAP_LABELS).map(([key, label]) => {
                const ok = capabilities[key];
                const time = estimated_times?.[{
                  tts_fast: 'tts_30s',
                  tts_clone_xtts: 'clone_30s',
                  video_generation: 'video_5s',
                  transcription: 'transcription_1h',
                  music_generation: 'music_2min',
                  avatar_lipsync: 'avatar_30s',
                }[key]];
                return (
                  <tr key={key}>
                    <td style={{ color: 'var(--text-primary)', fontSize: 13 }}>{label}</td>
                    <td>
                      <span className={`cap-badge ${ok ? 'ok' : 'no'}`}>
                        {ok ? '✅ Dostępne' : '❌ Niedostępne'}
                      </span>
                    </td>
                    <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{time || '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Installed models */}
      {installed_models && (
        <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: 12 }}>
            Zainstalowane modele AI
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {Object.entries(installed_models).map(([model, installed]) => (
              <span key={model} style={{
                fontSize: 11, padding: '3px 10px', borderRadius: 12,
                background: installed ? 'rgba(34,197,94,0.1)' : 'rgba(255,255,255,0.04)',
                border: `1px solid ${installed ? 'rgba(34,197,94,0.3)' : 'var(--border)'}`,
                color: installed ? '#4ade80' : 'var(--text-muted)',
                fontFamily: 'monospace',
              }}>
                {installed ? '✓' : '○'} {model}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
