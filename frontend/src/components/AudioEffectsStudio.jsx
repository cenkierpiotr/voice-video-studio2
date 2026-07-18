import React, { useState } from 'react';
import { useT } from '../i18n/index.jsx';

const TAB = { rvc: 'RVC', demucs: 'Demucs' };

const inputStyle = {
  background: 'var(--bg-input)', border: '1px solid var(--border)',
  borderRadius: 8, color: 'var(--text-primary)', padding: '8px 12px',
  fontSize: 13, width: '100%', boxSizing: 'border-box',
};

const labelStyle = { fontSize: 12, color: 'var(--text-muted)', marginBottom: 6, display: 'block' };

function NotInstalled({ pkg, t }) {
  return (
    <div style={{
      padding: '14px 16px', borderRadius: 10, marginBottom: 16,
      background: 'rgba(251,191,36,0.07)', border: '1px solid rgba(251,191,36,0.3)',
      fontSize: 13,
    }}>
      <div style={{ fontWeight: 700, color: '#fde68a', marginBottom: 6 }}>
        ⚠️ {t('aes_not_installed')}
      </div>
      <div style={{ color: 'var(--text-muted)', marginBottom: 10 }}>
        {t('aes_install_hint')}
      </div>
      <code style={{
        background: 'rgba(0,0,0,0.3)', padding: '6px 10px', borderRadius: 6,
        fontSize: 12, color: '#a5b4fc', display: 'block',
      }}>
        pip install {pkg}
      </code>
    </div>
  );
}

export default function AudioEffectsStudio() {
  const { t } = useT();
  const DEMUCS_MODELS = [
    { value: 'htdemucs',    label: t('aes_demucs_default') },
    { value: 'htdemucs_ft', label: t('aes_demucs_ft') },
    { value: 'mdx_extra',   label: t('aes_demucs_extra') },
  ];
  const [tab, setTab] = useState('rvc');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [notInstalled, setNotInstalled] = useState(null);
  const [result, setResult] = useState(null);

  const [rvcFile, setRvcFile]     = useState(null);
  const [rvcModel, setRvcModel]   = useState('passthrough');
  const [pthFile, setPthFile]     = useState(null);
  const [semitones, setSemitones] = useState(0);

  const [demucsFile, setDemucsFile]   = useState(null);
  const [demucsModel, setDemucsModel] = useState('htdemucs');
  const [twoStem, setTwoStem]         = useState(false);

  const reset = () => { setError(null); setNotInstalled(null); setResult(null); };

  const uploadAndRun = async (endpoint, formData, pkg) => {
    setLoading(true);
    reset();
    try {
      const res = await fetch(endpoint, { method: 'POST', body: formData });
      if (res.status === 503) { setNotInstalled(pkg); return; }
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || t('aes_err_server'));

      // If backend queued a job, poll until done
      if (data.job_id) {
        const jobId = data.job_id;
        for (let i = 0; i < 120; i++) {
          await new Promise(r => setTimeout(r, 2500));
          const jr = await fetch(`/api/jobs/${jobId}`);
          const jd = await jr.json();
          if (jd.status === 'completed' || jd.status === 'done') { setResult(jd); return; }
          if (jd.status === 'failed') throw new Error(jd.error || t('aes_err_job_failed'));
        }
        throw new Error(t('aes_err_timeout'));
      }
      setResult(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRVC = () => {
    if (!rvcFile) return setError(t('aes_select_audio'));
    const fd = new FormData();
    fd.append('file', rvcFile);
    fd.append('model', rvcModel);
    fd.append('semitone_shift', semitones);
    if (rvcModel === 'custom' && pthFile) fd.append('pth_file', pthFile);
    uploadAndRun('/api/audio/rvc', fd, 'rvc-python');
  };

  const handleDemucs = () => {
    if (!demucsFile) return setError(t('aes_select_audio'));
    const fd = new FormData();
    fd.append('file', demucsFile);
    fd.append('stems', twoStem ? '2' : '4');
    uploadAndRun('/api/audio/demucs', fd, 'demucs');
  };

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>
          🎛 {t('aes_title')}
        </div>
        <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
          {t('aes_subtitle')}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 4, marginBottom: 20, background: 'var(--bg-card)', borderRadius: 10, padding: 4 }}>
        {Object.entries(TAB).map(([k, label]) => (
          <button key={k} onClick={() => { setTab(k); reset(); }} style={{
            flex: 1, padding: '8px 0', borderRadius: 8, border: 'none', cursor: 'pointer',
            fontSize: 13, fontWeight: 600, transition: 'all 0.15s',
            background: tab === k ? 'var(--accent)' : 'transparent',
            color: tab === k ? 'var(--text-inverse)' : 'var(--text-muted)',
          }}>
            {label === 'RVC' ? '🎤 ' : '🎚 '}{label}
          </button>
        ))}
      </div>

      {notInstalled && <NotInstalled pkg={notInstalled === 'rvc-python' ? 'rvc-python' : 'demucs'} t={t} />}

      {error && (
        <div style={{ padding: '10px 14px', borderRadius: 8, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)', color: '#fca5a5', fontSize: 13, marginBottom: 16 }}>
          ⚠️ {error}
        </div>
      )}

      {tab === 'rvc' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={labelStyle}>{t('aes_rvc_source_file')}</label>
            <input type="file" accept=".mp3,.wav,.ogg,.m4a" onChange={e => setRvcFile(e.target.files[0])} style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>{t('aes_rvc_voice_model')}</label>
            <select value={rvcModel} onChange={e => setRvcModel(e.target.value)} style={inputStyle}>
              <option value="passthrough">{t('aes_rvc_passthrough')}</option>
              <option value="custom">{t('aes_rvc_custom')}</option>
            </select>
          </div>
          {rvcModel === 'custom' && (
            <div>
              <label style={labelStyle}>{t('aes_rvc_model_file')}</label>
              <input type="file" accept=".pth" onChange={e => setPthFile(e.target.files[0])} style={inputStyle} />
            </div>
          )}
          <div>
            <label style={labelStyle}>{t('aes_rvc_transpose')}: {semitones > 0 ? '+' : ''}{semitones} {t('aes_rvc_semitones')}</label>
            <input type="range" min={-12} max={12} value={semitones}
              onChange={e => setSemitones(Number(e.target.value))}
              style={{ width: '100%', accentColor: 'var(--accent)' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
              <span>-12 ({t('aes_rvc_bass')})</span><span>0</span><span>+12 ({t('aes_rvc_soprano')})</span>
            </div>
          </div>
          <button className="btn btn-primary" onClick={handleRVC} disabled={loading} style={{ width: '100%' }}>
            {loading ? `⏳ ${t('aes_rvc_converting')}` : `🎤 ${t('aes_rvc_btn')}`}
          </button>
        </div>
      )}

      {tab === 'demucs' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={labelStyle}>{t('aes_demucs_file')}</label>
            <input type="file" accept=".mp3,.wav,.flac" onChange={e => setDemucsFile(e.target.files[0])} style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>{t('aes_demucs_model')}</label>
            <select value={demucsModel} onChange={e => setDemucsModel(e.target.value)} style={inputStyle}>
              {DEMUCS_MODELS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: 13 }}>
            <input type="checkbox" checked={twoStem} onChange={e => setTwoStem(e.target.checked)}
              style={{ width: 16, height: 16, accentColor: 'var(--accent)' }} />
            <span style={{ color: 'var(--text-primary)' }}>{t('aes_demucs_two_stem')}</span>
          </label>
          <div style={{ padding: '10px 14px', borderRadius: 8, background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)', fontSize: 12, color: 'var(--text-muted)' }}>
            ℹ️ {t('aes_demucs_full_sep_hint')}
          </div>
          <button className="btn btn-primary" onClick={handleDemucs} disabled={loading} style={{ width: '100%' }}>
            {loading ? `⏳ ${t('aes_demucs_separating')}` : `🎚 ${t('aes_demucs_btn')}`}
          </button>
        </div>
      )}

      {result && (
        <div style={{ marginTop: 24, padding: 16, background: 'rgba(74,222,128,0.06)', border: '1px solid rgba(74,222,128,0.25)', borderRadius: 12 }}>
          <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 12, color: 'var(--success)' }}>✅ {t('ps_job_done')}</div>
          {/* New format: stems array [{stem, url, filename}] */}
          {result.stems?.length > 0 ? (
            result.stems.map(({ stem, url }) => (
              <div key={stem} style={{ marginBottom: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: 13, fontWeight: 600 }}>
                    {{ vocals: `🎤 ${t('aes_stem_vocals')}`, drums: `🥁 ${t('aes_stem_drums')}`, bass: `🎸 ${t('aes_stem_bass')}`, other: `🎹 ${t('aes_stem_other')}`, accompaniment: `🎵 ${t('aes_stem_accompaniment')}` }[stem] || stem}
                  </span>
                  <a href={url} download style={{ fontSize: 12, color: 'var(--accent-light)', textDecoration: 'none' }}>⬇️ {t('dash_download')}</a>
                </div>
                <audio controls src={url} style={{ width: '100%', height: 32 }} />
              </div>
            ))
          ) : result.tracks ? (
            Object.entries(result.tracks).map(([name, url]) => (
              <div key={name} style={{ marginBottom: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: 13, fontWeight: 600 }}>{name}</span>
                  <a href={url} download style={{ fontSize: 12, color: 'var(--accent-light)', textDecoration: 'none' }}>⬇️ {t('dash_download')}</a>
                </div>
                <audio controls src={url} style={{ width: '100%', height: 32 }} />
              </div>
            ))
          ) : result.url ? (
            <div>
              <audio controls src={result.url} style={{ width: '100%' }} />
              <a href={result.url} download style={{ display: 'block', marginTop: 8, fontSize: 12, color: 'var(--accent-light)', textDecoration: 'none' }}>
                ⬇️ {t('aes_download_file')}
              </a>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
