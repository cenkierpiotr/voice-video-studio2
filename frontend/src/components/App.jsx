import React, { useState, useEffect, useCallback } from 'react';
import { STYLES, makeDefaultSegment } from './constants.js';
import ManualBuilder from './components/ManualBuilder.jsx';
import PromptBuilder from './components/PromptBuilder.jsx';
import AudioPlayer from './components/AudioPlayer.jsx';
import VoiceCloner from './components/VoiceCloner.jsx';
import VideoStudio from './components/VideoStudio.jsx';
import MovieStudio from './components/MovieStudio.jsx';
import AnimationStudio from './components/AnimationStudio.jsx';
import DialogueStudio from './components/DialogueStudio.jsx';
import VideoEditor from './components/VideoEditor.jsx';
import PresentationStudio from './components/PresentationStudio.jsx';
import AudiobookStudio from './components/AudiobookStudio.jsx';
import JobMonitor from './components/JobMonitor.jsx';
import Dashboard from './components/Dashboard.jsx';
import Settings from './components/Settings.jsx';
import TranscriptionStudio from './components/TranscriptionStudio.jsx';
import AudioMixerStudio from './components/AudioMixerStudio.jsx';
import MusicStudio from './components/MusicStudio.jsx';
import QueueManager from './components/QueueManager.jsx';
import QAChecker from './components/QAChecker.jsx';
import AudioEffectsStudio from './components/AudioEffectsStudio.jsx';
import PresentationBatchQueue from './components/PresentationBatchQueue.jsx';

// ── Inline reusable components ────────────────────────────────────────────────

function XttsSpeedControl({ value, onChange }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:8, padding:'4px 10px', background:'rgba(255,255,255,0.04)', borderRadius:8, border:'1px solid rgba(255,255,255,0.08)' }}>
      <span style={{ fontSize:12, opacity:0.6, whiteSpace:'nowrap' }}>🎚 Tempo</span>
      <input type="range" min={0.5} max={2.0} step={0.05} value={value}
        onChange={e => onChange(parseFloat(e.target.value))}
        style={{ width:90, accentColor:'var(--accent)' }} />
      <span style={{ fontSize:12, fontWeight:700, minWidth:32, textAlign:'right', color:'var(--accent-light)' }}>
        {value === 1.0 ? '1×' : `${value.toFixed(2)}×`}
      </span>
      {value !== 1.0 && (
        <button onClick={() => onChange(1.0)}
          style={{ fontSize:10, padding:'1px 5px', borderRadius:4, background:'rgba(255,255,255,0.08)', border:'none', cursor:'pointer', color:'inherit', opacity:0.6 }}>
          ↺
        </button>
      )}
    </div>
  );
}

function ComingSoon({ title, description, icon, requirement }) {
  return (
    <div className="coming-soon">
      <div className="cs-icon">{icon}</div>
      <div className="cs-title">{title}</div>
      <p className="cs-desc">{description}</p>
      {requirement && <div className="cs-req">{requirement}</div>}
      <div className="cs-badge">🚧 Wkrótce dostępne</div>
    </div>
  );
}

function fmtSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024*1024) return `${(bytes/1024).toFixed(0)} KB`;
  return `${(bytes/1024/1024).toFixed(1)} MB`;
}

function HistoryTab({ history, onLoadAudio }) {
  const [serverFiles, setServerFiles] = React.useState(null);
  const [loadingFiles, setLoadingFiles] = React.useState(false);
  const [deletingFile, setDeletingFile] = React.useState('');
  const [expandedVideo, setExpandedVideo] = React.useState('');
  const [expandedFolder, setExpandedFolder] = React.useState('');
  const [activeSection, setActiveSection] = React.useState('session');

  const fetchFiles = async () => {
    setLoadingFiles(true);
    try {
      const res = await fetch('/api/files');
      const data = await res.json();
      setServerFiles({ files: data.files || [], folders: data.folders || [] });
    } catch {}
    setLoadingFiles(false);
  };

  React.useEffect(() => {
    if (activeSection === 'files' && serverFiles === null) fetchFiles();
  }, [activeSection]); // eslint-disable-line

  const deleteFile = async (name) => {
    if (!confirm(`Usunąć "${name}"?`)) return;
    setDeletingFile(name);
    try {
      await fetch(`/api/files/${encodeURIComponent(name)}`, { method: 'DELETE' });
      fetchFiles();
    } catch {}
    setDeletingFile('');
  };

  const tabStyle = (k) => ({
    padding:'6px 14px', borderRadius:8, fontSize:12, cursor:'pointer', border:'none',
    background: activeSection===k ? 'var(--accent)' : 'rgba(255,255,255,0.05)',
    color: activeSection===k ? '#fff' : 'var(--text-secondary)', fontWeight: activeSection===k ? 600 : 400,
  });

  return (
    <div>
      <div style={{ fontSize:20, fontWeight:700, color:'var(--text-primary)', marginBottom:16 }}>📂 Moje projekty</div>
      <div style={{ display:'flex', gap:6, marginBottom:16 }}>
        <button style={tabStyle('session')} onClick={() => setActiveSection('session')}>📋 Ta sesja ({history.length})</button>
        <button style={tabStyle('files')} onClick={() => setActiveSection('files')}>🗂️ Wszystkie pliki</button>
      </div>

      {activeSection === 'session' && (
        <div className="history-list">
          {history.length === 0 ? (
            <div className="empty-state">
              <div className="es-icon">📂</div>
              <div className="es-title">Brak nagrań w tej sesji</div>
              <div className="es-sub">Wygeneruj nagranie lub film aby zobaczyć tutaj</div>
            </div>
          ) : history.map((h, i) => {
            const isVideo = h.mediaType === 'video' || h.filename?.match(/\.(mp4|webm)$/i);
            const isExpanded = expandedVideo === h.url;
            return (
              <div key={i} style={{ border:'1px solid var(--border)', borderRadius:10, marginBottom:8, overflow:'hidden' }}>
                <div className="history-item" style={{ margin:0, border:'none', borderRadius:0 }}
                  onClick={() => isVideo ? setExpandedVideo(isExpanded?'':h.url) : onLoadAudio(h)}>
                  <span className="hi-icon">{isVideo ? '🎬' : '🎵'}</span>
                  <div className="hi-info">
                    <div className="hi-name">{h.filename}</div>
                    <div className="hi-meta">{isVideo ? 'Wideo' : 'Audio'} · {h.ts}</div>
                  </div>
                  <div style={{ display:'flex', gap:6 }}>
                    {isVideo ? (
                      <>
                        <button className="btn btn-ghost btn-sm" onClick={e=>{e.stopPropagation();setExpandedVideo(isExpanded?'':h.url);}}>
                          {isExpanded ? '▲ Zwiń' : '▶ Podgląd'}
                        </button>
                        <a href={h.url} download={h.filename} className="btn btn-ghost btn-sm"
                          onClick={e=>e.stopPropagation()} style={{ textDecoration:'none' }}>⬇️</a>
                      </>
                    ) : (
                      <button className="btn btn-ghost btn-sm">▶ Załaduj</button>
                    )}
                  </div>
                </div>
                {isVideo && isExpanded && (
                  <video src={h.url} controls style={{ width:'100%', maxHeight:300, display:'block', background:'#000' }} />
                )}
              </div>
            );
          })}
        </div>
      )}

      {activeSection === 'files' && (
        <div>
          <div style={{ display:'flex', justifyContent:'flex-end', marginBottom:10 }}>
            <button className="btn btn-ghost btn-sm" onClick={fetchFiles} disabled={loadingFiles}>
              {loadingFiles ? '⏳' : '🔄 Odśwież'}
            </button>
          </div>
          {serverFiles === null || loadingFiles ? (
            <div style={{ textAlign:'center', padding:24, opacity:0.5 }}>Ładowanie…</div>
          ) : (serverFiles.files.length === 0 && serverFiles.folders.length === 0) ? (
            <div className="empty-state">
              <div className="es-icon">📂</div>
              <div className="es-title">Brak plików</div>
            </div>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {serverFiles.folders.map(folder => {
                const isOpen = expandedFolder === folder.name;
                const totalSize = folder.files.reduce((s,f)=>s+f.size,0);
                const date = new Date(folder.mtime*1000).toLocaleString('pl-PL',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'});
                return (
                  <div key={folder.name} style={{ border:'1px solid rgba(139,92,246,0.35)', borderRadius:12, overflow:'hidden' }}>
                    <div style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 14px', cursor:'pointer', background:'rgba(139,92,246,0.07)' }}
                      onClick={() => setExpandedFolder(isOpen?'':folder.name)}>
                      <span style={{ fontSize:20 }}>📚</span>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontSize:13, fontWeight:600, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{folder.name}</div>
                        <div style={{ fontSize:11, opacity:0.5 }}>{folder.files.length} plików · {fmtSize(totalSize)} · {date}</div>
                      </div>
                      <div style={{ display:'flex', gap:6, flexShrink:0 }}>
                        <button className="btn btn-ghost btn-sm" style={{ color:'var(--danger)' }}
                          disabled={deletingFile===folder.name}
                          onClick={e=>{e.stopPropagation();deleteFile(folder.name);}}>
                          {deletingFile===folder.name?'⏳':'🗑️'}
                        </button>
                        <span style={{ fontSize:12, opacity:0.5 }}>{isOpen?'▲':'▼'}</span>
                      </div>
                    </div>
                    {isOpen && (
                      <div style={{ display:'flex', flexDirection:'column', gap:1, borderTop:'1px solid rgba(139,92,246,0.2)' }}>
                        {folder.files.map(f => {
                          const isVideo = f.type==='video';
                          const isFull = !f.name.match(/^\d{2} - /);
                          return (
                            <div key={f.path} style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 14px 8px 20px', background:isFull?'rgba(74,222,128,0.04)':'transparent', borderBottom:'1px solid rgba(255,255,255,0.04)' }}>
                              <span style={{ fontSize:14, opacity:0.7 }}>{isVideo?'🎬':(isFull?'🎧':'🎵')}</span>
                              <div style={{ flex:1, minWidth:0 }}>
                                <div style={{ fontSize:12, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', fontWeight:isFull?600:400 }}>{f.name}</div>
                                <div style={{ fontSize:10, opacity:0.4 }}>{fmtSize(f.size)}</div>
                              </div>
                              <a href={f.url} download={f.name} className="btn btn-ghost btn-sm" style={{ textDecoration:'none', fontSize:11 }}>⬇️</a>
                              <button className="btn btn-ghost btn-sm" style={{ color:'var(--danger)', fontSize:11 }}
                                disabled={deletingFile===f.path} onClick={()=>deleteFile(f.path)}>
                                {deletingFile===f.path?'⏳':'🗑️'}
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
              {serverFiles.files.map(f => {
                const isVideo = f.type==='video';
                const isExpanded = expandedVideo===f.url;
                const date = new Date(f.mtime*1000).toLocaleString('pl-PL',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'});
                return (
                  <div key={f.name} style={{ border:'1px solid var(--border)', borderRadius:10, overflow:'hidden' }}>
                    <div style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 12px' }}>
                      <span style={{ fontSize:18 }}>{isVideo?'🎬':'🎵'}</span>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontSize:13, fontWeight:500, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{f.name}</div>
                        <div style={{ fontSize:11, opacity:0.5 }}>{fmtSize(f.size)} · {date}</div>
                      </div>
                      <div style={{ display:'flex', gap:6, flexShrink:0 }}>
                        {isVideo && (
                          <button className="btn btn-ghost btn-sm" onClick={()=>setExpandedVideo(isExpanded?'':f.url)}>
                            {isExpanded?'▲':'▶'}
                          </button>
                        )}
                        <a href={f.url} download={f.name} className="btn btn-ghost btn-sm" style={{ textDecoration:'none' }}>⬇️</a>
                        <button className="btn btn-ghost btn-sm" style={{ color:'var(--danger)' }}
                          disabled={deletingFile===f.name} onClick={()=>deleteFile(f.name)}>
                          {deletingFile===f.name?'⏳':'🗑️'}
                        </button>
                      </div>
                    </div>
                    {isVideo && isExpanded && (
                      <video src={f.url} controls style={{ width:'100%', maxHeight:300, display:'block', background:'#000' }} />
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Nav item ──────────────────────────────────────────────────────────────────
function NavItem({ id, icon, label, active, onClick, badge }) {
  return (
    <button className={`nav-item ${active===id?'active':''}`} onClick={() => onClick(id)}>
      <span className="nav-icon">{icon}</span>
      <span>{label}</span>
      {badge && <span className="nav-badge">{badge}</span>}
    </button>
  );
}

// ── Main App ──────────────────────────────────────────────────────────────────
export default function App() {
  const [activeTab, setActiveTab]       = useState('dashboard');
  const [segments, setSegments]         = useState([makeDefaultSegment('pl_male_marek'), makeDefaultSegment('pl_female_zofia')]);
  const [style, setStyle]               = useState('normal');
  const [silenceMs, setSilenceMs]       = useState(500);
  const [generating, setGenerating]     = useState(false);
  const [error, setError]               = useState('');
  const [currentAudio, setCurrentAudio] = useState(null);
  const [history, setHistory]           = useState([]);
  const [voices, setVoices]             = useState({});
  const [activeJob, setActiveJob]       = useState(null);
  const [cloneSuccess, setCloneSuccess] = useState('');
  const [xttsSpeed, setXttsSpeed]       = useState(1.0);

  const [ollamaHost, setOllamaHost]     = useState('http://localhost:11434');
  const [ollamaModel, setOllamaModel]   = useState('llama3.1:8b');
  const [ollamaOnline, setOllamaOnline] = useState(false);
  const [ollamaModels, setOllamaModels] = useState([]);
  const [gpuAvailable, setGpuAvailable] = useState(false);

  const [hardwareInfo, setHardwareInfo]             = useState(null);
  const [sidebarOpen, setSidebarOpen]               = useState(true);
  const [transcriptionResult, setTranscriptionResult] = useState(null);
  const [qaTarget, setQaTarget]                     = useState(null); // {url, filename}
  const [queueCount, setQueueCount]                 = useState(0);
  const [presJobs, setPresJobs]                     = useState([]); // [{job_id, queue_position, status}]

  // ── Data fetching ──────────────────────────────────────────────────────────
  const fetchVoices = async () => {
    try {
      const res = await fetch('/api/voices');
      const data = await res.json();
      setVoices(data.voices || {});
    } catch {}
  };

  const fetchHardwareInfo = async () => {
    try {
      const r = await fetch('/api/hardware');
      if (r.ok) setHardwareInfo(await r.json());
    } catch {}
  };

  const checkOllama = async () => {
    try {
      const r = await fetch(`/api/ollama/status?host=${encodeURIComponent(ollamaHost)}`);
      const d = await r.json();
      setOllamaOnline(d.online);
      setOllamaModels(d.models || []);
      if (d.models?.length && !d.models.includes(ollamaModel)) setOllamaModel(d.models[0]);
    } catch { setOllamaOnline(false); }
  };

  const fetchAiStatus = async () => {
    try {
      const r = await fetch('/api/ai/status');
      const d = await r.json();
      setGpuAvailable(d.gpu_available || false);
    } catch {}
  };

  useEffect(() => {
    fetchVoices();
    fetchHardwareInfo();
    fetchAiStatus();
    checkOllama();
    try {
      const saved = localStorage.getItem('vs_history');
      if (saved) setHistory(JSON.parse(saved));
    } catch {}
    // Poll queue length for badge
    const queuePoll = setInterval(async () => {
      try {
        const r = await fetch('/api/queue/status');
        if (r.ok) {
          const d = await r.json();
          setQueueCount((d.queue_length || 0) + (d.active_job ? 1 : 0));
        }
      } catch {}
    }, 5000);
    return () => clearInterval(queuePoll);
  }, []); // eslint-disable-line

  const addToHistory = (entry) => {
    setHistory(h => {
      const next = [entry, ...h.slice(0, 19)];
      try { localStorage.setItem('vs_history', JSON.stringify(next)); } catch {}
      return next;
    });
  };

  // ── Job callbacks ──────────────────────────────────────────────────────────
  const onJobComplete = useCallback((data) => {
    const isVideo = data.filename?.match(/\.(mp4|webm)$/i);
    const entry = { ...data, ts: new Date().toLocaleTimeString(), style: 'render', mediaType: isVideo ? 'video' : 'audio' };
    addToHistory(entry);
    if (!isVideo) setCurrentAudio(entry);
    // Handle transcription result
    if (data.mode === 'transcription') {
      setTranscriptionResult(data);
    }
    setActiveJob(null);
    setGenerating(false);
    if (isVideo) setActiveTab('history');
  }, []); // eslint-disable-line

  const onJobFailed = useCallback((err) => {
    setError(err);
    setActiveJob(null);
    setGenerating(false);
  }, []);

  const startJob = (jobId) => {
    setActiveJob(jobId);
    setGenerating(true);
  };

  // ── Handler: manual generate ───────────────────────────────────────────────
  const generate = async () => {
    const validSegs = segments.filter(s => s.text.trim());
    if (!validSegs.length) { setError('Dodaj tekst do co najmniej jednego segmentu'); return; }
    setError(''); setGenerating(true); setCurrentAudio(null);
    let asyncJob = false;
    try {
      const res = await fetch('/api/generate', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({
          segments: validSegs.map(({id, ...s}) => ({...s, xtts_speed: xttsSpeed})),
          silence_between_ms: silenceMs, style,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Błąd generowania');
      if (data.job_id && !data.url) {
        asyncJob = true;
        setActiveJob(data.job_id);
        return;
      }
      const entry = { ...data, style, speakers: validSegs.length, ts: new Date().toLocaleTimeString() };
      setCurrentAudio(entry);
      addToHistory(entry);
    } catch (e) {
      setError(e.message);
    } finally {
      if (!asyncJob) setGenerating(false);
    }
  };

  // ── Handler: voice clone ───────────────────────────────────────────────────
  const handleCloneGenerate = async (params) => {
    const { text, speakerName, file, voiceLang } = params;
    setGenerating(true); setError('');
    try {
      const formData = new FormData();
      formData.append('text', text);
      formData.append('speaker_name', speakerName);
      formData.append('voice_lang', voiceLang || 'pl');
      if (file) formData.append('file', file);
      const res = await fetch('/api/clone-voice', { method:'POST', body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Błąd podczas zapisywania głosu.');
      await fetchVoices();
      if (data.preview_url) {
        const entry = { url:data.preview_url, filename:`${data.voice_name}-preview.mp3`, ts:new Date().toLocaleTimeString(), style:'clone' };
        addToHistory(entry);
        setCurrentAudio(entry);
      }
      setCloneSuccess(`Głos "${data.voice_name}" zapisany!${data.xtts_available?' Podgląd XTTS gotowy.':' (XTTS offline — używa edge-tts jako fallback)'}`);
      setActiveTab('manual');
    } catch (err) { setError(err.message); }
    finally { setGenerating(false); }
  };

  // ── Handler: video ─────────────────────────────────────────────────────────
  const handleVideoGenerate = async (params) => {
    setGenerating(true); setError('');
    try {
      const res = await fetch('/api/generate-video', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ ...params, ollama_host: ollamaHost, model: ollamaModel }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Błąd podczas generowania wideo.');
      if (data.job_id) startJob(data.job_id);
    } catch (err) { setError(err.message); setGenerating(false); }
  };

  // ── Handler: movie ─────────────────────────────────────────────────────────
  const handleMovieRender = async (params) => {
    setGenerating(true); setError('');
    try {
      const formData = new FormData();
      formData.append('script', JSON.stringify(params.script));
      formData.append('actors_meta', JSON.stringify(params.actors.map(a=>({id:a.id,name:a.name,voice_key:a.voice_key}))));
      formData.append('video_style', params.video_style);
      if (params.duration) formData.append('duration', String(params.duration));
      params.actors.forEach(a => { if (a.image) formData.append(`actor_image_${a.id}`, a.image); });
      const res = await fetch('/api/render-movie', { method:'POST', body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Błąd podczas renderowania filmu.');
      if (data.job_id) startJob(data.job_id);
    } catch (err) { setError(err.message); setGenerating(false); }
  };

  // ── Handler: animation ─────────────────────────────────────────────────────
  const handleAnimationGenerate = async (params) => {
    setGenerating(true); setError('');
    try {
      const res = await fetch('/api/generate-video', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ ...params, ollama_host: ollamaHost, model: ollamaModel }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Błąd podczas generowania animacji.');
      if (data.job_id) startJob(data.job_id);
    } catch (err) { setError(err.message); setGenerating(false); }
  };

  // ── Handler: presentation ──────────────────────────────────────────────────
  const handlePresentationRender = async (params) => {
    setError('');
    try {
      const fd = new FormData();
      fd.append('session_id', params.session_id);
      fd.append('slides', JSON.stringify(params.slides));
      fd.append('voice_key', params.voice_key);
      fd.append('xtts_speed', String(xttsSpeed));
      const res = await fetch('/api/presentation/render', { method:'POST', body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Błąd renderowania prezentacji.');
      if (data.job_id) {
        // Add to local presJobs list — don't block global generating flag
        setPresJobs(prev => [...prev, { job_id: data.job_id, queue_position: data.queue_length || 1, status: 'queued' }]);
      }
    } catch (err) { setError(err.message); }
  };

  // ── Handler: audiobook ─────────────────────────────────────────────────────
  const handleAudiobookGenerate = async (params) => {
    setGenerating(true); setError('');
    try {
      const res = await fetch('/api/audiobook/generate', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ ...params, xtts_speed: xttsSpeed }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Błąd podczas generowania audiobooka.');
      if (data.job_id) startJob(data.job_id);
    } catch (err) { setError(err.message); setGenerating(false); }
  };

  // ── Handler: dialogue ──────────────────────────────────────────────────────
  const handleDialogueGenerate = async (params) => {
    setGenerating(true); setError('');
    try {
      const formData = new FormData();
      formData.append('actor1_photo', params.actor1_photo);
      formData.append('actor2_photo', params.actor2_photo);
      formData.append('actor1_name', params.actor1_name);
      formData.append('actor2_name', params.actor2_name);
      formData.append('voice_key_1', params.voice_key_1);
      formData.append('voice_key_2', params.voice_key_2);
      formData.append('lines', JSON.stringify(params.lines));
      const res = await fetch('/api/render-dialogue', { method:'POST', body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Błąd podczas generowania rozmowy.');
      if (data.job_id) startJob(data.job_id);
    } catch (err) { setError(err.message); setGenerating(false); }
  };

  // ── Handler: prompt builder result ────────────────────────────────────────
  const handlePromptResult = (command) => {
    if (command?.segments) {
      const mapped = command.segments.map(s => ({
        ...makeDefaultSegment(s.speaker_key || 'pl_male_marek'),
        speaker_key: s.speaker_key || 'pl_male_marek',
        text: s.text || '',
        rate: s.rate || '+0%',
        pitch: s.pitch || '+0Hz',
        volume: s.volume || '+0%',
      }));
      setSegments(mapped);
      if (command.style) setStyle(command.style);
      if (command.silence_between_ms !== undefined) setSilenceMs(command.silence_between_ms);
      setActiveTab('manual');
    }
  };

  const validCount = segments.filter(s => s.text.trim()).length;

  // ── Render content by tab ──────────────────────────────────────────────────
  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <Dashboard
            history={history} voices={voices} hardwareInfo={hardwareInfo}
            gpuAvailable={gpuAvailable} ollamaOnline={ollamaOnline}
            onNavigate={setActiveTab}
          />
        );

      case 'manual':
        return (
          <>
            {activeJob && (
              <div style={{ marginBottom:16 }}>
                <JobMonitor jobId={activeJob} onComplete={onJobComplete} onFailed={onJobFailed} />
              </div>
            )}
            <ManualBuilder segments={segments} setSegments={setSegments} voices={voices} />
            {error && (
              <div className="alert alert-error" style={{ marginTop:12 }}>
                ⚠️ {error}
                <button onClick={() => setError('')} style={{ marginLeft:8, background:'none', border:'none', cursor:'pointer', color:'inherit' }}>✕</button>
              </div>
            )}
            {cloneSuccess && (
              <div className="alert alert-info" style={{ marginTop:8 }}>
                ✅ {cloneSuccess}
                <button onClick={() => setCloneSuccess('')} style={{ marginLeft:8, background:'none', border:'none', cursor:'pointer', color:'inherit' }}>✕</button>
              </div>
            )}
            <div className="generate-bar" style={{ marginTop:16 }}>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:'0.82rem', color:'var(--text-secondary)', marginBottom:4 }}>
                  📋 {segments.length} segm. · ✅ {validCount} z tekstem · 🎭 {STYLES.find(s=>s.key===style)?.label || style}
                </div>
                {generating && <div className="progress-wrap"><div className="progress-bar" /></div>}
              </div>
              <XttsSpeedControl value={xttsSpeed} onChange={setXttsSpeed} />
              <button className="btn btn-primary btn-lg" onClick={generate}
                disabled={generating || validCount === 0}>
                {generating ? <><span className="spinner" />Generuję…</> : '🎙️ Generuj nagranie'}
              </button>
            </div>
          </>
        );

      case 'prompt':
        return (
          <PromptBuilder onResult={handlePromptResult} ollamaHost={ollamaHost} ollamaModel={ollamaModel} />
        );

      case 'cloner':
        return (
          <>
            <VoiceCloner onGenerate={handleCloneGenerate} isGenerating={generating} />
            <div style={{ marginTop:12 }}>
              <XttsSpeedControl value={xttsSpeed} onChange={setXttsSpeed} />
            </div>
            {error && <div className="alert alert-error" style={{ marginTop:12 }}>⚠️ {error}</div>}
          </>
        );

      case 'mixer':
        return <AudioMixerStudio onComplete={(data) => { addToHistory({...data, ts:new Date().toLocaleTimeString(), mediaType:'audio'}); }} />;

      case 'transcription':
        return (
          <TranscriptionStudio
            isGenerating={generating}
            onJobStart={(jid) => { startJob(jid); }}
            lastResult={transcriptionResult}
          />
        );

      case 'music':
        return (
          <MusicStudio onComplete={(data) => {
            addToHistory({...data, ts:new Date().toLocaleTimeString(), mediaType:'audio'});
            setCurrentAudio(data);
          }} />
        );

      case 'audiobook':
        return (
          <AudiobookStudio
            onGenerate={handleAudiobookGenerate}
            isGenerating={generating} error={error}
            voices={voices} ollamaHost={ollamaHost} ollamaModel={ollamaModel}
            gpuAvailable={gpuAvailable} xttsSpeed={xttsSpeed}
            onXttsSpeedChange={setXttsSpeed} XttsSpeedControl={XttsSpeedControl}
          />
        );

      case 'presentation':
        return (
          <PresentationStudio
            onRender={handlePresentationRender}
            isRendering={false} error={error}
            voices={voices} ollamaHost={ollamaHost} ollamaModel={ollamaModel}
            xttsSpeed={xttsSpeed} onXttsSpeedChange={setXttsSpeed}
            XttsSpeedControl={XttsSpeedControl}
            presJobs={presJobs}
            onPresJobDone={(job_id, entry) => {
              setPresJobs(prev => prev.map(j => j.job_id === job_id ? { ...j, status: 'done', url: entry.url } : j));
              addToHistory(entry);
            }}
            onPresJobFailed={(job_id, err) => {
              setPresJobs(prev => prev.map(j => j.job_id === job_id ? { ...j, status: 'failed', error: err } : j));
            }}
          />
        );

      case 'pres-batch':
        return (
          <PresentationBatchQueue
            voices={voices}
            xttsSpeed={xttsSpeed} onXttsSpeedChange={setXttsSpeed}
            XttsSpeedControl={XttsSpeedControl}
            onAddJobs={(jobs) => setPresJobs(prev => [...prev, ...jobs])}
          />
        );

      case 'avatar':
        return (
          <ComingSoon
            title="Avatar — Mówiąca postać"
            description="Wgraj zdjęcie twarzy i tekst — AI wygeneruje film z synchronizacją ust. Używa Hallo lub LivePortrait."
            icon="👤"
            requirement="Wymaga: pip install hallo   |   GPU: min. 8 GB VRAM"
          />
        );

      case 'video':
        return (
          <VideoStudio
            onGenerate={handleVideoGenerate}
            isGenerating={generating} error={error}
            ollamaHost={ollamaHost} ollamaModel={ollamaModel} voices={voices}
          />
        );

      case 'animation':
        return (
          <AnimationStudio
            onGenerate={handleAnimationGenerate}
            isGenerating={generating} error={error}
            voices={voices} ollamaHost={ollamaHost} ollamaModel={ollamaModel}
          />
        );

      case 'movie':
        return (
          <MovieStudio
            onRender={handleMovieRender}
            isRendering={generating} error={error}
            ollamaHost={ollamaHost} ollamaModel={ollamaModel} voices={voices}
          />
        );

      case 'dialogue':
        return (
          <DialogueStudio
            onGenerate={handleDialogueGenerate}
            isGenerating={generating} error={error}
            ollamaHost={ollamaHost} ollamaModel={ollamaModel} voices={voices}
          />
        );

      case 'effects':
        return <AudioEffectsStudio />;

      case 'editor':
        return <VideoEditor voices={voices} />;

      case 'history':
        return (
          <HistoryTab
            history={history}
            onLoadAudio={(h) => { setCurrentAudio(h); setActiveTab('manual'); }}
            onQACheck={(h) => setQaTarget(h)}
          />
        );

      case 'queue':
        return <QueueManager />;

      case 'settings':
        return <Settings hardwareInfo={hardwareInfo} onHardwareRefresh={fetchHardwareInfo} />;

      default:
        return null;
    }
  };

  // ── Sidebar nav groups ─────────────────────────────────────────────────────
  const navGroups = [
    {
      items: [
        { id:'dashboard', icon:'🏠', label:'Dashboard' },
      ],
    },
    {
      label: 'Dźwięk',
      items: [
        { id:'manual',        icon:'🗣',  label:'Lektor' },
        { id:'prompt',        icon:'🤖',  label:'Prompt AI' },
        { id:'cloner',        icon:'🧬',  label:'Mój Głos' },
        { id:'mixer',         icon:'🎚',  label:'Mikser' },
        { id:'transcription', icon:'📝',  label:'Transkrypcja' },
        { id:'music',         icon:'🎵',  label:'Muzyka AI' },
        { id:'effects',       icon:'🎛',  label:'Efekty audio' },
      ],
    },
    {
      label: 'Wideo',
      items: [
        { id:'audiobook',    icon:'📖',  label:'Audiobook' },
        { id:'presentation', icon:'🖥',  label:'Prezentacja' },
        { id:'pres-batch',   icon:'📂',  label:'Wsadowe' },
        { id:'avatar',       icon:'👤',  label:'Avatar', badge:'Wkrótce' },
        { id:'video',        icon:'🎬',  label:'Generator' },
        { id:'animation',    icon:'✨',  label:'Animacja' },
      ],
    },
    {
      label: 'Scenariusze',
      items: [
        { id:'movie',    icon:'🎥', label:'Film' },
        { id:'dialogue', icon:'💬', label:'Dialog' },
        { id:'editor',   icon:'✂️', label:'Edycja' },
      ],
    },
    {
      divider: true,
      items: [
        { id:'history',  icon:'📂', label:'Projekty' },
        { id:'queue',    icon:'📋', label:'Kolejka', badge: queueCount > 0 ? String(queueCount) : null },
        { id:'settings', icon:'⚙️', label:'Ustawienia' },
      ],
    },
  ];

  return (
    <div className="app-shell-v2">
      {/* Header */}
      <header className="app-header-v2">
        <div className="header-logo">
          <div className="logo-icon">🎙</div>
          <span>Voice & Video <strong>Studio</strong> AI</span>
        </div>
        <div className="header-badges">
          <div className="h-badge">
            <div className={`dot ${gpuAvailable ? 'green' : 'yellow'}`} />
            {gpuAvailable ? 'GPU aktywne' : 'Tryb CPU'}
          </div>
          <div className="h-badge">
            <div className={`dot ${ollamaOnline ? 'green' : 'red'}`} />
            Ollama {ollamaOnline ? 'online' : 'offline'}
          </div>
          {activeJob && (
            <div className="h-badge">
              <div className="dot pulse" />
              Trwa zadanie…
            </div>
          )}
        </div>
        <button className="hamburger" onClick={() => setSidebarOpen(o => !o)}>☰</button>
      </header>

      {/* Body */}
      <div className="app-body">
        {/* Sidebar */}
        {sidebarOpen && (
          <aside className="app-nav">
            <div className="nav-brand">
              <div className="brand-name">🎙 Studio AI</div>
              <div className="brand-ver">v2.0 — Multi-engine AI</div>
            </div>
            {navGroups.map((group, gi) => (
              <React.Fragment key={gi}>
                {group.divider && <div className="nav-divider" />}
                {group.label && <div className="nav-group-label">{group.label}</div>}
                {group.items.map(item => (
                  <NavItem key={item.id} id={item.id} icon={item.icon} label={item.label}
                    active={activeTab} onClick={setActiveTab} badge={item.badge} />
                ))}
              </React.Fragment>
            ))}
          </aside>
        )}

        {/* Main content */}
        <main className="app-content">
          {/* Job monitor (global) */}
          {activeJob && activeTab !== 'manual' && (
            <div style={{ marginBottom:16 }}>
              <JobMonitor jobId={activeJob} onComplete={onJobComplete} onFailed={onJobFailed} />
            </div>
          )}

          {/* Page content */}
          {renderContent()}

          {/* Audio player */}
          {currentAudio && (
            <AudioPlayer
              url={currentAudio.url}
              filename={currentAudio.filename}
              onDelete={() => setCurrentAudio(null)}
            />
          )}
        </main>
      </div>

      {/* QA Checker modal */}
      {qaTarget && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 1000,
          background: 'rgba(0,0,0,0.6)', display: 'flex',
          alignItems: 'center', justifyContent: 'center', padding: 24,
        }} onClick={() => setQaTarget(null)}>
          <div onClick={e => e.stopPropagation()}>
            <QAChecker
              fileUrl={qaTarget.url}
              filename={qaTarget.filename}
              onClose={() => setQaTarget(null)}
              onFixed={(data) => {
                addToHistory({ url: data.url, filename: data.filename, ts: new Date().toLocaleTimeString(), mediaType: 'audio' });
                setQaTarget(null);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
