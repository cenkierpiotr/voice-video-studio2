import React, { useState, useRef, useEffect } from 'react';
import { useT } from '../i18n/index.jsx';

export default function VoiceCloner({ onGenerate, isGenerating }) {
  const { t } = useT();
  const [text, setText] = useState('To jest test klonowania głosu. Powiedz coś więcej!');
  const [speakerName, setSpeakerName] = useState('');
  const [file, setFile] = useState(null);
  const [voiceLang, setVoiceLang] = useState('pl');
  const [savedVoices, setSavedVoices] = useState([]);
  const [selectedVoice, setSelectedVoice] = useState('');
  
  const [temperature, setTemperature] = useState(0.75);
  const [topP, setTopP] = useState(0.85);
  const [showAdvanced, setShowAdvanced] = useState(false);
  
  const [isRecording, setIsRecording] = useState(false);
  const [localError, setLocalError] = useState('');
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const audioPreviewUrlRef = useRef(null);

  useEffect(() => {
    return () => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
      if (mediaRecorderRef.current?.stream) {
        mediaRecorderRef.current.stream.getTracks().forEach(t => t.stop());
      }
      if (audioPreviewUrlRef.current) {
        URL.revokeObjectURL(audioPreviewUrlRef.current);
      }
    };
  }, []);

  useEffect(() => {
    fetchSavedVoices();
  }, []);

  const fetchSavedVoices = async () => {
    try {
      const res = await fetch('/api/cloned-voices');
      const data = await res.json();
      setSavedVoices(data.voices || []);
    } catch (err) {
      console.error("Błąd pobierania głosów:", err);
    }
  };

  const handleDelete = async () => {
    if (!selectedVoice) return;
    setLocalError('');
    try {
      const res = await fetch(`/api/cloned-voices/${selectedVoice}`, { method: 'DELETE' });
      if (res.ok) {
        setSelectedVoice('');
        fetchSavedVoices();
      } else {
        setLocalError(t('vc_err_delete'));
      }
    } catch (err) {
      setLocalError(t('vc_err_delete_net'));
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];
      mediaRecorderRef.current.ondataavailable = e => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };
      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        const newFile = new File([blob], `nagranie_${Date.now()}.wav`, { type: 'audio/wav' });
        if (audioPreviewUrlRef.current) URL.revokeObjectURL(audioPreviewUrlRef.current);
        audioPreviewUrlRef.current = URL.createObjectURL(newFile);
        setFile(newFile);
        setSelectedVoice('');
        audioChunksRef.current = [];
      };
      mediaRecorderRef.current.start();
      setIsRecording(true);
    } catch (err) {
      alert(t('vc_err_mic') + ' ' + err);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      const stream = mediaRecorderRef.current.stream;
      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        const newFile = new File([blob], `nagranie_${Date.now()}.wav`, { type: 'audio/wav' });
        if (audioPreviewUrlRef.current) URL.revokeObjectURL(audioPreviewUrlRef.current);
        audioPreviewUrlRef.current = URL.createObjectURL(newFile);
        setFile(newFile);
        setSelectedVoice('');
        audioChunksRef.current = [];
        stream.getTracks().forEach(track => track.stop());
      };
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setLocalError('');
    if (!selectedVoice && !file) { setLocalError(t('vc_err_no_voice')); return; }
    if (!text.trim()) { setLocalError(t('vc_err_no_text')); return; }
    const effectiveName = selectedVoice || speakerName.trim() || `spk_${Date.now()}`;
    onGenerate({ text, speakerName: effectiveName, file, temperature, top_p: topP, voiceLang });
  };

  return (
    <div className="card">
      <div className="card-header">
        <h3 className="card-title">{t('vc_title')}</h3>
        <p style={{fontSize:14, opacity:0.7, margin:0}}>{t('vc_subtitle')}</p>
      </div>
      <div className="card-body space-y-4">

        {localError && (
          <div className="alert alert-error" style={{marginBottom:8}}>
            ⚠️ {localError}
            <button onClick={() => setLocalError('')} style={{marginLeft:8, background:'none', border:'none', cursor:'pointer', color:'inherit', fontSize:'1rem'}}>✕</button>
          </div>
        )}

        {savedVoices.length > 0 && (
          <div className="form-group">
            <label className="form-label">{t('vc_select_saved')}</label>
            <div style={{display:'flex', gap:10}}>
              <select 
                className="form-select" 
                style={{flex:1}}
                value={selectedVoice} 
                onChange={e => {
                  setSelectedVoice(e.target.value);
                  if(e.target.value) setFile(null);
                }}
              >
                <option value="">{t('vc_new_voice_option')}</option>
                {savedVoices.map(v => (
                  <option key={v.filename} value={v.name}>
                    {v.name} [{(v.lang || 'pl').toUpperCase()}]
                  </option>
                ))}
              </select>
              {selectedVoice && (
                <button className="btn btn-error btn-sm" onClick={handleDelete} title={t('vc_delete_voice')}>
                  {t('vc_delete_voice')}
                </button>
              )}
            </div>
          </div>
        )}

        {!selectedVoice && (
          <>
            <div className="form-group">
              <label className="form-label">{t('vc_name_label')}</label>
              <input type="text" className="form-input" value={speakerName} onChange={e => setSpeakerName(e.target.value)} placeholder={t('vc_name_placeholder')} />
            </div>

            <div className="form-group">
              <label className="form-label">{t('vc_lang_label')}</label>
              <div style={{ display: 'flex', gap: 10 }}>
                {[['pl', t('vc_lang_pl')], ['en', t('vc_lang_en')]].map(([code, label]) => (
                  <button
                    key={code}
                    type="button"
                    onClick={() => setVoiceLang(code)}
                    style={{
                      flex: 1, padding: '8px 0', borderRadius: 8, cursor: 'pointer',
                      border: `2px solid ${voiceLang === code ? 'var(--primary)' : 'var(--border)'}`,
                      background: voiceLang === code ? 'rgba(139,92,246,0.15)' : 'transparent',
                      color: voiceLang === code ? 'var(--primary)' : 'var(--text-secondary)',
                      fontWeight: voiceLang === code ? 700 : 400, fontSize: 13,
                      transition: 'all 0.15s',
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">{t('vc_sample_label')}</label>
              <div style={{display:'flex', gap:10, alignItems:'center', marginBottom:10}}>
                <input type="file" accept="audio/*" className="form-input"
                  onChange={e => {
                    const f = e.target.files[0];
                    if (f) {
                      if (audioPreviewUrlRef.current) URL.revokeObjectURL(audioPreviewUrlRef.current);
                      audioPreviewUrlRef.current = URL.createObjectURL(f);
                    }
                    setFile(f || null);
                    setSelectedVoice('');
                  }}
                  style={{flex:1}}
                />
                <span style={{opacity:0.5}}>{t('vc_or')}</span>
                {isRecording ? (
                  <button className="btn btn-error btn-sm" onClick={stopRecording}>{t('vc_stop_recording')}</button>
                ) : (
                  <button className="btn btn-secondary btn-sm" onClick={startRecording}>{t('vc_start_recording')}</button>
                )}
              </div>
              {file && (
                <div style={{background:'rgba(255,255,255,0.05)', padding:10, borderRadius:8, fontSize:13}}>
                  {t('vc_sample_info')} <strong>{file.name}</strong>
                  <audio src={audioPreviewUrlRef.current} controls style={{height:30, width:'100%', marginTop:10}} />
                </div>
              )}
            </div>
          </>
        )}

        <div style={{marginTop:10}}>
          <button 
            className="btn btn-ghost btn-sm" 
            style={{padding:0, fontSize:12}}
            onClick={() => setShowAdvanced(!showAdvanced)}
          >
            {showAdvanced ? t('vc_advanced_hide') : t('vc_advanced_show')}
          </button>
          
          {showAdvanced && (
            <div className="alert alert-info" style={{marginTop:10, padding:12, background:'rgba(255,255,255,0.02)'}}>
              <div className="form-group">
                <label className="form-label" style={{display:'flex', justifyContent:'space-between'}}>
                  <span>{t('vc_temperature_label')} {temperature}</span>
                  <span style={{fontSize:10, opacity:0.6}}>{t('vc_temperature_hint')}</span>
                </label>
                <input type="range" className="form-range" min={0.1} max={1.0} step={0.05} value={temperature} onChange={e => setTemperature(parseFloat(e.target.value))} />
              </div>
              <div className="form-group">
                <label className="form-label" style={{display:'flex', justifyContent:'space-between'}}>
                  <span>{t('vc_top_p_label')} {topP}</span>
                  <span style={{fontSize:10, opacity:0.6}}>{t('vc_top_p_hint')}</span>
                </label>
                <input type="range" className="form-range" min={0.1} max={1.0} step={0.05} value={topP} onChange={e => setTopP(parseFloat(e.target.value))} />
              </div>
            </div>
          )}
        </div>

        <div className="form-group">
          <label className="form-label">{t('vc_text_label')}</label>
          <textarea className="form-textarea" rows={4} value={text} onChange={e => setText(e.target.value)} />
        </div>

        <button 
          className="btn btn-primary" 
          style={{width:'100%'}} 
          onClick={handleSubmit}
          disabled={isGenerating}
        >
          {isGenerating ? (
            <><span className="spinner" /> {t('vc_btn_generating')}</>
          ) : (
            t('vc_btn_generate')
          )}
        </button>

      </div>
    </div>
  );
}
