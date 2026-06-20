import React, { useState, useEffect } from 'react';
import { useT } from '../i18n/index.jsx';

function requestNotificationPermission() {
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission();
  }
}

export default function JobMonitor({ jobId, onComplete, onFailed }) {
  const { t } = useT();
  const [status, setStatus] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => { requestNotificationPermission(); }, []);

  useEffect(() => {
    if (!jobId) return;

    let isMounted = true;
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/jobs/${jobId}`);
        const contentType = res.headers.get("content-type");
        
        if (!contentType || !contentType.includes("application/json")) {
           const text = await res.text();
           console.error("Non-JSON response:", text);
           throw new Error("Serwer zwrócił błąd (HTML). Prawdopodobnie przeciążenie.");
        }

        const data = await res.json();
        if (!isMounted) return;

        if (!res.ok) throw new Error(data.detail || 'Błąd pollingu');

        setStatus(data);

        if (data.status === 'completed') {
          clearInterval(interval);
          if ('Notification' in window && Notification.permission === 'granted') {
            new Notification(t('jm_notification_ready'), { body: `"${data.filename || 'wynik'}" ${t('jm_notification_file')}`, icon: '/favicon.ico' });
          }
          onComplete(data);
        } else if (data.status === 'failed') {
          clearInterval(interval);
          if ('Notification' in window && Notification.permission === 'granted') {
            new Notification(t('jm_notification_error'), { body: data.error || 'Job zakończył się błędem.', icon: '/favicon.ico' });
          }
          onFailed(data.error);
        }
      } catch (err) {
        if (isMounted) {
          console.error('Job polling error:', err);
          setError(err.message);
        }
      }
    }, 3000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [jobId, onComplete, onFailed]);

  if (!jobId) return null;

  return (
    <div className="card" style={{border:'1px solid var(--primary)', background:'rgba(0,180,255,0.05)'}}>
      <div className="card-body">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-bold uppercase tracking-wider text-primary">{t('jm_process_status')} {jobId}</span>
          <span className="text-xs opacity-60">{status?.status === 'processing' ? t('jm_in_progress') : status?.status}</span>
        </div>
        
        <div style={{height:8, background:'rgba(255,255,255,0.1)', borderRadius:4, overflow:'hidden', marginBottom:10}}>
          <div style={{
            height:'100%', 
            width:`${status?.progress || 0}%`, 
            background:'var(--primary)', 
            transition:'width 0.5s ease-out',
            boxShadow:'0 0 10px var(--primary)'
          }} />
        </div>

        <div className="text-sm italic opacity-80">
          {status?.message || t('jm_init')}
        </div>

        {status?.mode === 'audio_drama' && (
          <div className="alert alert-info" style={{marginTop:10, fontSize:12}}>
            {t('jm_audio_drama')}
          </div>
        )}

        {status?.warning && (
          <div className="alert alert-info" style={{marginTop:8, fontSize:12}}>
            ⚠️ {status.warning}
          </div>
        )}

        {status?.mode === 'audiobook' && status?.chapter_urls?.length > 0 && (
          <div style={{marginTop:14}}>
            <div style={{
              fontSize:11, fontWeight:700, letterSpacing:'0.07em',
              textTransform:'uppercase', opacity:0.5, marginBottom:8,
            }}>
              {t('jm_chapters_ready')} ({status.chapter_urls.length}
              {status.chapters_total ? ` ${t('jm_chapters_of')} ${status.chapters_total}` : ''})
            </div>
            <div style={{display:'flex', flexDirection:'column', gap:5, maxHeight:260, overflowY:'auto'}}>
              {status.chapter_urls.map((ch, i) => (
                <div key={i} style={{
                  display:'flex', alignItems:'center', gap:10,
                  padding:'7px 10px', borderRadius:8,
                  background:'rgba(74,222,128,0.07)',
                  border:'1px solid rgba(74,222,128,0.18)',
                }}>
                  <span style={{fontSize:14}}>✅</span>
                  <span style={{flex:1, fontSize:12, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>
                    {ch.title}
                  </span>
                  <a
                    href={ch.url}
                    download
                    style={{
                      fontSize:11, padding:'3px 10px', borderRadius:6,
                      background:'rgba(74,222,128,0.15)',
                      border:'1px solid rgba(74,222,128,0.3)',
                      color:'#4ade80', textDecoration:'none', flexShrink:0,
                      cursor:'pointer',
                    }}
                  >
                    {t('jm_download_chapter')}
                  </a>
                </div>
              ))}
            </div>
            {status.status === 'processing' && (
              <div style={{fontSize:11, opacity:0.4, marginTop:6, fontStyle:'italic'}}>
                {t('jm_chapters_appearing')}
              </div>
            )}
          </div>
        )}

        {status?.mode === 'audiobook' && status?.status === 'completed' && (
          <div style={{marginTop:12, display:'flex', gap:8, flexWrap:'wrap'}}>
            {status.url && (
              <a href={status.url} download style={{
                display:'inline-flex', alignItems:'center', gap:6,
                padding:'8px 16px', borderRadius:8, textDecoration:'none',
                background:'var(--accent)', color:'#fff', fontSize:13, fontWeight:600,
              }}>
                {t('jm_download_audiobook')}
              </a>
            )}
            {status.m4b_url && (
              <a href={status.m4b_url} download style={{
                display:'inline-flex', alignItems:'center', gap:6,
                padding:'8px 16px', borderRadius:8, textDecoration:'none',
                background:'rgba(139,92,246,0.8)', color:'#fff', fontSize:13, fontWeight:600,
              }}>
                {t('jm_download_m4b')}
              </a>
            )}
          </div>
        )}

        {error && (
          <div className="alert alert-error mt-3" style={{fontSize:12}}>
            {t('jm_monitor_error')} {error}
          </div>
        )}
      </div>
    </div>
  );
}
