import React, { useState, useEffect, useRef } from 'react';
import { VIDEO_STYLES } from '../constants.js';
import { useT } from '../i18n/index.jsx';

export default function MovieStudio({ onRender, isRendering, error, ollamaHost, ollamaModel, voices }) {
  const { t } = useT();
  const [actors, setActors] = useState([
    { id: 1, name: 'Aktor 1', image: null, voice_key: 'pl_male_marek' },
    { id: 2, name: 'Aktor 2', image: null, voice_key: 'pl_female_zofia' },
  ]);
  
  const [script, setScript] = useState([
    { actorId: 1, text: 'Witajcie w naszym nowym studiu filmowym AI!' },
    { actorId: 2, text: 'Cześć! To niesamowite, że możemy rozmawiać w ten sposób.' },
  ]);
  const [aiPrompt, setAiPrompt] = useState('');
  const [isAiProcessing, setIsAiProcessing] = useState(false);
  const [videoStyle, setVideoStyle] = useState('cinematic');
  const [duration, setDuration] = useState(15);
  const [submitError, setSubmitError] = useState('');

  const addActor = () => {
    const newId = actors.length > 0 ? Math.max(...actors.map(a => a.id)) + 1 : 1;
    setActors([...actors, { id: newId, name: `${t('ms2_actor')} ${newId}`, image: null, voice_key: 'pl_male_marek' }]);
  };

  const removeActor = (id) => {
    if (actors.length <= 1) return;
    setActors(actors.filter(a => a.id !== id));
    setScript(script.filter(line => line.actorId !== id));
  };

  const addLine = () => {
    if (actors.length === 0) return;
    setScript([...script, { actorId: actors[0].id, text: '' }]);
  };

  const updateLine = (index, field, value) => {
    const newScript = [...script];
    newScript[index][field] = value;
    setScript(newScript);
  };

  const actorObjectUrls = useRef({});

  const handleImageUpload = (id, file) => {
    if (actorObjectUrls.current[id]) {
      URL.revokeObjectURL(actorObjectUrls.current[id]);
    }
    if (file) {
      actorObjectUrls.current[id] = URL.createObjectURL(file);
    } else {
      delete actorObjectUrls.current[id];
    }
    const newActors = actors.map(a => a.id === id ? { ...a, image: file } : a);
    setActors(newActors);
  };

  useEffect(() => {
    return () => {
      Object.values(actorObjectUrls.current).forEach(url => URL.revokeObjectURL(url));
    };
  }, []);

  const handleSubmit = () => {
    setSubmitError('');
    const missingImages = actors.filter(a => !a.image).map(a => a.name);
    if (missingImages.length > 0) {
      setSubmitError(`${t('ms2_upload_photos_for')}: ${missingImages.join(', ')}`);
      return;
    }
    onRender({ actors, script, video_style: videoStyle, duration: duration });
  };

  const handleAiAssistant = async () => {
    if (!aiPrompt.trim()) {
      alert(t('ms2_err_describe'));
      return;
    }
    setIsAiProcessing(true);
    try {
      const res = await fetch('/api/movie/generate-script', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: aiPrompt, ollama_host: ollamaHost, model: ollamaModel })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || t('aes_err_server'));
      
      if (data.script) setScript(data.script);
      if (data.actors) {
        const newActors = [...actors];
        data.actors.forEach((name, i) => {
          if (newActors[i]) newActors[i].name = name;
          else newActors.push({ id: newActors.length + 1, name, image: null, voice_key: 'pl_male_marek' });
        });
        setActors(newActors);
      }
    } catch (err) {
      setSubmitError(t('vs_err_ai_prefix') + ": " + err.message);
    } finally {
      setIsAiProcessing(false);
    }
  };

  return (
    <div className="card">
      <div className="card-header">
        <h3 className="card-title">🎥 {t('ms2_title')}</h3>
        <p style={{fontSize:14, opacity:0.7, margin:0}}>{t('ms2_subtitle')}</p>
      </div>
      <div className="card-body space-y-6">

        {/* AI Assistant Section */}
        <div className="form-group" style={{background:'rgba(255,255,255,0.02)', padding:15, borderRadius:12, border:'1px solid var(--border)'}}>
          <label className="form-label">✨ {t('ms2_ai_writer')}</label>
          <textarea
            className="form-textarea"
            rows={3}
            value={aiPrompt}
            onChange={e => setAiPrompt(e.target.value)}
            placeholder={t('ms2_ai_placeholder')}
          />
          <button
            className="btn btn-secondary btn-sm"
            style={{marginTop:10, width:'100%'}}
            onClick={handleAiAssistant}
            disabled={isAiProcessing}
          >
            {isAiProcessing ? `⏳ ${t('ms2_ai_preparing')}` : `🪄 ${t('ms2_ai_btn')}`}
          </button>
        </div>

        {/* Global Film Settings */}
        <div className="grid grid-cols-2 gap-4">
          <div className="form-group">
            <label className="form-label">{t('ms2_visual_style')}</label>
            <select className="form-select" value={videoStyle} onChange={e => setVideoStyle(e.target.value)}>
              {VIDEO_STYLES.map(s => (
                <option key={s.key} value={s.key}>{s.label}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">{t('ms2_max_duration')}</label>
            <input 
              type="number" 
              className="form-input" 
              value={duration} 
              onChange={e => setDuration(parseInt(e.target.value))} 
            />
          </div>
        </div>

        {/* Actors Section */}
        <div className="actors-section">
          <div className="section-title" style={{fontSize:15, fontWeight:600, marginBottom:10}}>🎭 {t('ms2_cast_voices')}</div>
          <div className="grid grid-cols-2 gap-4">
            {actors.map(actor => (
              <div key={actor.id} className="actor-card" style={{padding:12, background:'rgba(255,255,255,0.03)', borderRadius:12, border:'1px solid var(--border)', position:'relative'}}>
                {actors.length > 1 && (
                  <button
                    onClick={() => removeActor(actor.id)}
                    title={t('ms2_remove_actor')}
                    style={{
                      position:'absolute', top:6, right:6,
                      background:'rgba(255,80,80,0.15)', border:'1px solid rgba(255,80,80,0.3)',
                      borderRadius:6, color:'#ff6666', cursor:'pointer',
                      fontSize:11, padding:'2px 6px', lineHeight:1.4, zIndex:10
                    }}
                  >✕</button>
                )}
                <div className="form-group" style={{marginBottom:8}}>
                   <input 
                    className="form-input" 
                    style={{fontSize:13, fontWeight:600}} 
                    value={actor.name} 
                    onChange={e => setActors(actors.map(a => a.id === actor.id ? { ...a, name: e.target.value } : a))}
                  />
                </div>
                <div className="form-group" style={{marginBottom:8}}>
                  <select 
                    className="form-select" 
                    style={{fontSize:11, height:30}}
                    value={actor.voice_key}
                    onChange={e => setActors(actors.map(a => a.id === actor.id ? { ...a, voice_key: e.target.value } : a))}
                  >
                    {Object.entries(voices).map(([k, v]) => (
                      <option key={k} value={k}>{v.label}</option>
                    ))}
                  </select>
                </div>
                <div style={{height:100, background:'rgba(0,0,0,0.2)', borderRadius:8, display:'flex', alignItems:'center', justifyContent:'center', position:'relative', overflow:'hidden'}}>
                  {actor.image ? (
                    <img src={actorObjectUrls.current[actor.id]} style={{width:'100%', height:'100%', objectFit:'cover'}} alt="actor" />
                  ) : (
                    <div style={{fontSize:12, opacity:0.5}}>{t('ms2_upload_photo')}</div>
                  )}
                  <input 
                    type="file" 
                    accept="image/*" 
                    onChange={e => handleImageUpload(actor.id, e.target.files[0])}
                    style={{position:'absolute', inset:0, opacity:0, cursor:'pointer'}}
                  />
                </div>
              </div>
            ))}
            <button className="btn btn-ghost" onClick={addActor} style={{height:175}}>+ {t('ms2_add_actor')}</button>
          </div>
        </div>

        {/* Script Editor */}
        <div className="script-section">
          <div className="section-title" style={{fontSize:15, fontWeight:600, marginBottom:10}}>📝 {t('ms2_script_dialogues')}</div>
          <div className="space-y-3">
            {script.map((line, index) => (
              <div key={index} className="script-line" style={{display:'flex', gap:10, alignItems:'start'}}>
                <select 
                  className="form-select" 
                  style={{width:120, fontSize:12}}
                  value={line.actorId}
                  onChange={e => updateLine(index, 'actorId', parseInt(e.target.value))}
                >
                  {actors.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
                <textarea 
                  className="form-textarea" 
                  rows={2} 
                  style={{flex:1, fontSize:13}}
                  value={line.text}
                  onChange={e => updateLine(index, 'text', e.target.value)}
                  placeholder={t('ms2_line_placeholder')}
                />
                <button className="btn btn-error btn-sm" onClick={() => setScript(script.filter((_, i) => i !== index))}>×</button>
              </div>
            ))}
            <button className="btn btn-secondary btn-sm" onClick={addLine} style={{width:'100%'}}>+ {t('ds_add_line')}</button>
          </div>
        </div>

        <div className="alert alert-info" style={{fontSize:'0.78rem', padding:'8px 12px'}}>
          ℹ️ <strong>GPU:</strong> {t('vs_gpu_hint')} <strong>{t('vs_no_gpu_label')}:</strong> {t('ms2_no_gpu_hint')}
        </div>

        {(submitError || error) && (
          <div className="alert alert-error" style={{marginBottom:10}}>
            ⚠️ {submitError || error}
          </div>
        )}

        <button
          className="btn btn-primary btn-lg"
          style={{width:'100%'}}
          onClick={handleSubmit}
          disabled={isRendering}
        >
          {isRendering ? `⏳ ${t('ms2_rendering')}` : `🚀 ${t('vs_btn_generate')}`}
        </button>

      </div>
    </div>
  );
}
