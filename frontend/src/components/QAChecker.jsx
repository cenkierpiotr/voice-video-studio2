import React, { useState, useEffect } from 'react';
import { useT } from '../i18n/index.jsx';

function MetricRow({ label, value, warn }) {
  return (
    <tr>
      <td style={{ padding: '5px 10px 5px 0', fontSize: 12, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{label}</td>
      <td style={{ padding: '5px 0', fontSize: 12, color: warn ? 'var(--warning)' : 'var(--text-primary)', fontFamily: 'monospace' }}>
        {value == null ? '—' : String(value)}
      </td>
    </tr>
  );
}

export default function QAChecker({ fileUrl, filename, onClose, onFixed }) {
  const { t } = useT();
  const [result, setResult] = useState(null);
  const [fixing, setFixing] = useState(false);
  const [fixResult, setFixResult] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/qa/check', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: fileUrl }),
        });
        if (!cancelled) setResult(await res.json());
      } catch (e) {
        if (!cancelled) setError(e.message);
      }
    })();
    return () => { cancelled = true; };
  }, [fileUrl]);

  const handleFix = async () => {
    setFixing(true);
    try {
      const res = await fetch('/api/qa/fix', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: fileUrl }),
      });
      const data = await res.json();
      setFixResult(data);
      if (data.fixed && onFixed) onFixed(data);
    } catch (e) {
      setError(e.message);
    }
    setFixing(false);
  };

  const m = result?.metrics || {};
  const hasClipping = result?.warnings?.includes('clipping_risk');
  const hasSilence = result?.issues?.includes('silence_detected');
  const canFix = hasClipping && !hasSilence;

  return (
    <div style={{
      background: 'var(--bg-card)', border: '1px solid var(--border)',
      borderRadius: 14, padding: 20, maxWidth: 480,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div style={{ fontSize: 14, fontWeight: 700 }}>
          🔍 {t('qa_title')}
        </div>
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: 'var(--text-muted)', lineHeight: 1 }}>×</button>
      </div>

      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        📄 {filename || fileUrl}
      </div>

      {/* Loading */}
      {!result && !error && (
        <div style={{ textAlign: 'center', padding: 20 }}>
          <span className="spinner" />
          <div style={{ marginTop: 8, fontSize: 12, color: 'var(--text-muted)' }}>{t('qa_analyzing')}</div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="alert alert-error">⚠️ {error}</div>
      )}

      {/* Result */}
      {result && (
        <>
          {/* Status badge */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px',
            borderRadius: 10, marginBottom: 14,
            background: result.ok && !hasClipping
              ? 'rgba(74,222,128,0.08)'
              : result.issues?.length ? 'rgba(239,68,68,0.08)' : 'rgba(251,191,36,0.08)',
            border: `1px solid ${result.ok && !hasClipping
              ? 'rgba(74,222,128,0.3)'
              : result.issues?.length ? 'rgba(239,68,68,0.3)' : 'rgba(251,191,36,0.3)'}`,
          }}>
            <span style={{ fontSize: 20 }}>
              {result.ok && !hasClipping ? '✅' : result.issues?.length ? '❌' : '⚠️'}
            </span>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600 }}>
                {result.ok && !hasClipping
                  ? t('qa_quality_ok')
                  : result.issues?.length
                    ? `${t('qa_detected')} ${result.issues.length} ${result.issues.length === 1 ? t('qa_problem_one') : t('qa_problem_many')}`
                    : t('qa_warnings')}
              </div>
              {result.issues?.length > 0 && (
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                  {result.issues.join(', ')}
                </div>
              )}
            </div>
          </div>

          {/* Silence special case */}
          {hasSilence && (
            <div style={{ padding: '10px 14px', background: 'rgba(239,68,68,0.06)', borderRadius: 8, fontSize: 12, color: '#fca5a5', marginBottom: 12 }}>
              ❌ {t('qa_silence_only')}
            </div>
          )}

          {/* Metrics table */}
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <tbody>
                <MetricRow label={t('qa_duration')} value={m.duration != null ? `${m.duration.toFixed(2)} s` : null} />
                <MetricRow label={t('qa_size')} value={m.size_kb != null ? `${m.size_kb} KB` : null} />
                <MetricRow label={t('qa_mean_volume')} value={m.mean_volume_db != null ? `${m.mean_volume_db} dBFS` : null}
                  warn={m.mean_volume_db != null && m.mean_volume_db < -40} />
                <MetricRow label={t('qa_max_volume')} value={m.max_volume_db != null ? `${m.max_volume_db} dBFS` : null}
                  warn={hasClipping} />
                <MetricRow label={t('qa_sample_rate')} value={m.sample_rate ? `${m.sample_rate} Hz` : null} />
                <MetricRow label={t('qa_audio_track')} value={m.has_audio === true ? `✅ ${t('qa_yes')}` : m.has_audio === false ? `❌ ${t('qa_none')}` : null} />
                <MetricRow label={t('qa_video_track')} value={m.has_video === true ? `✅ ${t('qa_yes')}` : m.has_video === false ? `— ${t('qa_not_applicable')}` : null} />
              </tbody>
            </table>
          </div>

          {/* Warnings */}
          {result.warnings?.length > 0 && (
            <div style={{ marginTop: 12, padding: '8px 12px', background: 'rgba(251,191,36,0.06)', borderRadius: 8, fontSize: 12, color: '#fde68a' }}>
              ⚠️ {result.warnings.join(', ')}
            </div>
          )}

          {/* Fix result */}
          {fixResult && (
            <div className={`alert ${fixResult.fixed ? 'alert-success' : 'alert-error'}`} style={{ marginTop: 12 }}>
              {fixResult.fixed
                ? `✅ ${t('qa_fixed')} — ${fixResult.message}`
                : `❌ ${fixResult.message}`}
              {fixResult.fixed && fixResult.url && (
                <a href={fixResult.url} download={fixResult.filename}
                  style={{ marginLeft: 8, color: 'var(--accent-light)', textDecoration: 'none' }}>
                  ⬇️ {t('dash_download')}
                </a>
              )}
            </div>
          )}

          {/* Actions */}
          <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
            {canFix && !fixResult && (
              <button className="btn btn-primary" onClick={handleFix} disabled={fixing}>
                {fixing ? <><span className="spinner" /> {t('qa_fixing')}</> : `🔧 ${t('qa_btn_autofix')}`}
              </button>
            )}
            <button className="btn btn-ghost" onClick={onClose}>{t('qa_close')}</button>
          </div>
        </>
      )}
    </div>
  );
}
