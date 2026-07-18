import React, { useState, useEffect } from 'react';
import { useT } from '../i18n/index.jsx';

export default function QueueManager() {
  const { t } = useT();
  const [data, setData]       = useState(null);
  const [nightMode, setNightMode] = useState({ active_now: false, enabled: false });
  const [cancelling, setCancelling] = useState('');

  const fetchData = async () => {
    try {
      const [q, nm] = await Promise.all([
        fetch('/api/queue/status').then(r => r.ok ? r.json() : null),
        fetch('/api/settings/night-mode').then(r => r.ok ? r.json() : null),
      ]);
      if (q) setData(q);
      if (nm) setNightMode(nm);
    } catch {}
  };

  useEffect(() => {
    fetchData();
    const iv = setInterval(fetchData, 3000);
    return () => clearInterval(iv);
  }, []);

  const cancelJob = async (jobId) => {
    setCancelling(jobId);
    try {
      await fetch(`/api/queue/${jobId}`, { method: 'DELETE' });
      await fetchData();
    } catch {}
    setCancelling('');
  };

  if (!data) return (
    <div style={{ padding: 24, textAlign: 'center', opacity: 0.5 }}>
      {t('queue_loading')}
    </div>
  );

  const isEmpty = data.queue_length === 0 && !data.active_job;

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)' }}>
          {t('queue_title')}
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {nightMode.active_now && (
            <div style={{
              padding: '4px 12px', borderRadius: 20,
              background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.4)',
              fontSize: 12, color: '#a5b4fc',
            }}>
              {t('queue_night_mode_active')} {nightMode.end_hour}:00
            </div>
          )}
          <div style={{
            padding: '4px 12px', borderRadius: 20,
            background: data.running ? 'rgba(74,222,128,0.1)' : 'rgba(255,255,255,0.05)',
            border: `1px solid ${data.running ? 'rgba(74,222,128,0.3)' : 'var(--border)'}`,
            fontSize: 12, color: data.running ? 'var(--success)' : 'var(--text-muted)',
          }}>
            {data.running ? t('queue_processing') : t('queue_idle')} · {data.queue_length} {t('queue_in_queue')}
          </div>
        </div>
      </div>

      {data.active_job && data.active_job_info && (
        <div style={{
          background: 'rgba(91,106,240,0.08)', border: '1px solid rgba(91,106,240,0.3)',
          borderRadius: 12, padding: 16, marginBottom: 12,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span className="spinner" style={{ display: 'inline-block', width: 18, height: 18 }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
                {t('queue_active_label')} {data.active_job_info.filename || data.active_job}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                {data.active_job_info.message || data.active_job_info.status}
                {data.active_job_info.progress != null && typeof data.active_job_info.progress === 'number' && (
                  <span style={{ marginLeft: 8 }}>{data.active_job_info.progress}%</span>
                )}
              </div>
            </div>
            <div style={{ fontSize: 11, opacity: 0.5 }}>#{data.active_job}</div>
          </div>
          {typeof data.active_job_info.progress === 'number' && (
            <div style={{ height: 3, background: 'var(--border)', borderRadius: 2, marginTop: 10, overflow: 'hidden' }}>
              <div style={{
                height: '100%', width: `${data.active_job_info.progress}%`,
                background: 'var(--accent)', transition: 'width 0.5s ease',
              }} />
            </div>
          )}
        </div>
      )}

      {data.queued_jobs && data.queued_jobs.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>
            {t('queue_waiting_label')} ({data.queued_jobs.length}):
          </div>
          {data.queued_jobs.map((job) => (
            <div key={job.job_id} style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '10px 14px', background: 'var(--bg-card)',
              border: '1px solid var(--border)', borderRadius: 10, marginBottom: 6,
            }}>
              <div style={{
                width: 28, height: 28, borderRadius: '50%',
                background: 'rgba(99,102,241,0.2)', display: 'flex', alignItems: 'center',
                justifyContent: 'center', fontSize: 12, fontWeight: 700, color: '#a5b4fc',
                flexShrink: 0,
              }}>
                {job.position}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, color: 'var(--text-primary)' }}>{t('queue_job_prefix')}{job.job_id}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                  {t('queue_waiting_status')} · {job.created_ts ? new Date(job.created_ts).toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' }) : ''}
                </div>
              </div>
              <button
                className="btn btn-ghost btn-sm"
                style={{ color: 'var(--danger)', flexShrink: 0 }}
                disabled={cancelling === job.job_id}
                onClick={() => cancelJob(job.job_id)}
              >
                {cancelling === job.job_id ? '⏳' : t('queue_cancel')}
              </button>
            </div>
          ))}
        </div>
      )}

      {isEmpty && (
        <div className="empty-state">
          <div className="es-icon">✅</div>
          <div className="es-title">{t('queue_empty_title')}</div>
          <div className="es-sub">{t('queue_empty_sub')}</div>
        </div>
      )}

      <div style={{
        marginTop: 24, padding: 16, background: 'var(--bg-card)',
        border: '1px solid var(--border)', borderRadius: 12,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{t('queue_night_mode_title')}</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
              {t('queue_night_mode_hint')}
            </div>
          </div>
          <input type="checkbox" checked={nightMode.enabled}
            onChange={async (e) => {
              try {
                const r = await fetch('/api/settings/night-mode', {
                  method: 'POST', headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ ...nightMode, enabled: e.target.checked }),
                });
                if (r.ok) setNightMode(await r.json());
              } catch {}
            }}
            style={{ width: 18, height: 18, accentColor: 'var(--accent)', cursor: 'pointer' }}
          />
        </div>
        {nightMode.enabled && (
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{t('queue_night_from')}</span>
            <input type="number" min={0} max={23} value={nightMode.start_hour}
              onChange={async (e) => {
                const nm = { ...nightMode, start_hour: parseInt(e.target.value) };
                setNightMode(nm);
                await fetch('/api/settings/night-mode', {
                  method: 'POST', headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(nm),
                });
              }}
              style={{ width: 55, padding: '4px 8px', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text-primary)', textAlign: 'center' }}
            />
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{t('queue_night_to')}</span>
            <input type="number" min={0} max={23} value={nightMode.end_hour}
              onChange={async (e) => {
                const nm = { ...nightMode, end_hour: parseInt(e.target.value) };
                setNightMode(nm);
                await fetch('/api/settings/night-mode', {
                  method: 'POST', headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(nm),
                });
              }}
              style={{ width: 55, padding: '4px 8px', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text-primary)', textAlign: 'center' }}
            />
            <span style={{ fontSize: 12, color: nightMode.active_now ? '#a5b4fc' : 'var(--text-muted)' }}>
              {nightMode.active_now ? t('queue_night_active_now') : t('queue_night_inactive')}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
