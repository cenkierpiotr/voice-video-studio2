import React, { useState } from 'react';
import { useT } from '../i18n/index.jsx';

const ANIM_MODELS = [
  { key: 'toonyou',     label: '🎭 Cartoon (ToonYou)',            model: 'stablediffusionapi/toonyou' },
  { key: 'dreamshaper', label: '🌟 Fantasy/Comic (DreamShaper)',  model: 'Lykon/dreamshaper-8' },
  { key: 'anime',       label: '🌸 Anime (Anything V5)',          model: 'stablediffusionapi/anything-v5' },
  { key: 'counterfeit', label: '✨ Anime Premium (Counterfeit)',  model: 'digiplay/Counterfeit-V3.0_fp16' },
  { key: 'pastel',      label: '🎨 Pastel Anime (AbyssOrangeMix)', model: 'WarriorMama777/OrangeMixs' },
];

const ANIM_PROMPTS = {
  toonyou:     'cartoon characters in a colorful forest, vibrant colors, toon style',
  dreamshaper: 'fantasy landscape with glowing magic, dramatic lighting, painterly',
  anime:       'anime characters in a futuristic city, cherry blossoms, detailed',
  counterfeit: 'beautiful anime scene, soft lighting, cinematic composition',
  pastel:      'pastel anime artwork, soft colors, dreamy atmosphere',
};

export default function AnimationStudio({ onGenerate, isGenerating, error, voices = {}, ollamaHost, ollamaModel }) {
  const { t } = useT();
  const MOTION_LORAS = [
    { key: '',                   label: '🎲 ' + t('as_motion_random') },
    { key: 'zoom-in',            label: '🔍 Zoom In' },
    { key: 'zoom-out',           label: '🔎 Zoom Out' },
    { key: 'pan-left',           label: '⬅️ Pan Left' },
    { key: 'pan-right',          label: '➡️ Pan Right' },
    { key: 'tilt-up',            label: '⬆️ Tilt Up' },
    { key: 'tilt-down',          label: '⬇️ Tilt Down' },
    { key: 'rolling-clockwise',  label: '🔄 ' + t('as_motion_rotate_cw') },
    { key: 'rolling-anticlockwise', label: '🔃 ' + t('as_motion_rotate_ccw') },
  ];

  const QUALITY_PRESETS = [
    { key: 'fast',   label: '⚡ ' + t('as_quality_fast'),   steps: 15, guidance: 7.0 },
    { key: 'medium', label: '⚖️ ' + t('as_quality_medium'),   steps: 25, guidance: 7.5 },
    { key: 'high',   label: '🎯 ' + t('as_quality_high'),   steps: 35, guidance: 8.0 },
  ];
  const [modelKey, setModelKey] = useState('toonyou');
  const [prompt, setPrompt] = useState(ANIM_PROMPTS['toonyou']);
  const [negativePrompt, setNegativePrompt] = useState('realistic, photo, 3d render, blurry, ugly, deformed');
  const [duration, setDuration] = useState(4);
  const [motionLora, setMotionLora] = useState('');
  const [quality, setQuality] = useState('medium');

  // Ollama prompt generation
  const [aiDesc, setAiDesc] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState('');

  // Voice segments
  const [voiceSegments, setVoiceSegments] = useState([]);
  const [showVoices, setShowVoices] = useState(false);

  const voicesList = Object.entries(voices).map(([key, v]) => ({ key, label: v.label || key }));
  const defaultVoiceKey = voicesList[0]?.key || 'pl_male_marek';

  const handleModelChange = (key) => {
    setModelKey(key);
    if (!prompt || prompt === ANIM_PROMPTS[modelKey]) setPrompt(ANIM_PROMPTS[key]);
  };

  const generatePrompt = async () => {
    if (!aiDesc.trim()) return;
    setAiLoading(true); setAiError('');
    try {
      const res = await fetch('/api/animation/generate-prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: aiDesc,
          style: ANIM_MODELS.find(m => m.key === modelKey)?.label || modelKey,
          ollama_host: ollamaHost,
          model: ollamaModel,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || t('ms_err_generation'));
      if (data.prompt) setPrompt(data.prompt);
      if (data.negative_prompt) setNegativePrompt(data.negative_prompt);
    } catch (e) {
      setAiError(e.message);
    } finally {
      setAiLoading(false);
    }
  };

  const addSegment = () => setVoiceSegments(s => [...s, { voiceKey: defaultVoiceKey, text: '' }]);
  const removeSegment = (i) => setVoiceSegments(s => s.filter((_, idx) => idx !== i));
  const updateSegment = (i, patch) => setVoiceSegments(s => s.map((seg, idx) => idx === i ? { ...seg, ...patch } : seg));

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!prompt.trim()) return alert(t('as_err_describe'));
    const selected = ANIM_MODELS.find(m => m.key === modelKey);
    const preset = QUALITY_PRESETS.find(p => p.key === quality);
    onGenerate({
      prompt: prompt.trim(),
      negative_prompt: negativePrompt,
      base_model: selected.model,
      duration,
      aspect_ratio: '256x256',
      with_audio: voiceSegments.some(s => s.text.trim()),
      video_style: modelKey,
      motion_lora: motionLora,
      num_inference_steps: preset.steps,
      guidance_scale: preset.guidance,
      voice_segments: voiceSegments.filter(s => s.text.trim()),
      ollama_host: ollamaHost,
      model: ollamaModel,
    });
  };

  const selected = ANIM_MODELS.find(m => m.key === modelKey);
  const preset = QUALITY_PRESETS.find(p => p.key === quality);
  const estMin = Math.ceil((duration / 2) * (preset.steps / 25) * 3);

  return (
    <div className="card">
      <div className="card-header">
        <h3 className="card-title">🎨 {t('as_title')}</h3>
        <p style={{ fontSize: 13, opacity: 0.65, margin: 0 }}>
          {t('as_subtitle')}
        </p>
      </div>
      <div className="card-body space-y-4">

        {/* Styl animacji */}
        <div className="form-group">
          <label className="form-label">{t('as_animation_style')}</label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 8 }}>
            {ANIM_MODELS.map(m => (
              <button key={m.key} type="button" onClick={() => handleModelChange(m.key)} style={{
                padding: '10px 14px', borderRadius: 10,
                border: `2px solid ${modelKey === m.key ? 'var(--accent)' : 'var(--border)'}`,
                background: modelKey === m.key ? 'rgba(139,92,246,0.15)' : 'rgba(255,255,255,0.03)',
                color: 'var(--text)', cursor: 'pointer', textAlign: 'left',
                fontSize: 13, fontWeight: modelKey === m.key ? 600 : 400, transition: 'all 0.15s',
              }}>{m.label}</button>
            ))}
          </div>
        </div>

        {/* Ruch kamery */}
        <div className="form-group">
          <label className="form-label">🎥 {t('as_camera_motion')}</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {MOTION_LORAS.map(ml => (
              <button key={ml.key} type="button" onClick={() => setMotionLora(ml.key)} style={{
                padding: '6px 12px', borderRadius: 8, fontSize: 12,
                border: `1.5px solid ${motionLora === ml.key ? 'var(--accent)' : 'var(--border)'}`,
                background: motionLora === ml.key ? 'rgba(139,92,246,0.15)' : 'rgba(255,255,255,0.03)',
                color: 'var(--text)', cursor: 'pointer',
                fontWeight: motionLora === ml.key ? 600 : 400,
              }}>{ml.label}</button>
            ))}
          </div>
        </div>

        {/* Ollama prompt generator */}
        <div className="form-group">
          <label className="form-label">🤖 {t('as_generate_via_ollama')}</label>
          <div style={{ display: 'flex', gap: 8 }}>
            <input className="form-input" style={{ flex: 1 }}
              placeholder={t('as_describe_scene_placeholder')}
              value={aiDesc}
              onChange={e => setAiDesc(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && generatePrompt()}
            />
            <button type="button" className="btn btn-secondary"
              onClick={generatePrompt} disabled={aiLoading || !aiDesc.trim()}
              style={{ whiteSpace: 'nowrap' }}>
              {aiLoading ? '⏳...' : `✨ ${t('ds_ai_btn')}`}
            </button>
          </div>
          {aiError && <div style={{ fontSize: 11, color: 'var(--error)', marginTop: 4 }}>⚠️ {aiError}</div>}
        </div>

        {/* Prompt */}
        <div className="form-group">
          <label className="form-label">{t('as_scene_desc')}</label>
          <textarea className="form-textarea" rows={3} value={prompt}
            onChange={e => setPrompt(e.target.value)}
            placeholder={t('as_scene_desc_placeholder')} />
          <div style={{ fontSize: 11, opacity: 0.5, marginTop: 4 }}>
            Model: <code>{selected?.model}</code>
          </div>
        </div>

        {/* Negative prompt */}
        <div className="form-group">
          <label className="form-label">{t('as_negative_prompt')}</label>
          <input className="form-input" value={negativePrompt}
            onChange={e => setNegativePrompt(e.target.value)} />
        </div>

        {/* Jakość + czas */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div className="form-group">
            <label className="form-label">{t('as_render_quality')}</label>
            <div style={{ display: 'flex', gap: 6 }}>
              {QUALITY_PRESETS.map(p => (
                <button key={p.key} type="button" onClick={() => setQuality(p.key)} style={{
                  flex: 1, padding: '7px 4px', borderRadius: 8, fontSize: 12,
                  border: `1.5px solid ${quality === p.key ? 'var(--accent)' : 'var(--border)'}`,
                  background: quality === p.key ? 'rgba(139,92,246,0.15)' : 'rgba(255,255,255,0.03)',
                  color: 'var(--text)', cursor: 'pointer', fontWeight: quality === p.key ? 600 : 400,
                }}>{p.label}</button>
              ))}
            </div>
            <div style={{ fontSize: 11, opacity: 0.5, marginTop: 4 }}>
              {preset.steps} {t('as_steps')}, guidance {preset.guidance}
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">{t('vs_duration_sec')}</label>
            <input type="number" className="form-input" min={2} step={1} value={duration}
              onChange={e => setDuration(Math.max(2, Number(e.target.value)))}
              style={{ marginTop: 4 }} />
            <div style={{ fontSize: 11, opacity: 0.5, marginTop: 4 }}>
              {duration >= 60 ? `~${Math.floor(duration/60)}m ${duration%60}s` : `${duration}s`}
              {duration >= 120 && ` · ${t('as_long_render_hint')}`}
            </div>
          </div>
        </div>

        {/* Głosy */}
        <div className="form-group">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <label className="form-label" style={{ margin: 0 }}>🎙️ {t('as_audio_track')}</label>
            <button type="button" onClick={() => { setShowVoices(v => !v); if (!showVoices && voiceSegments.length === 0) addSegment(); }}
              style={{ fontSize: 12, padding: '4px 10px', borderRadius: 7, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer' }}>
              {showVoices ? `▲ ${t('as_hide')}` : `▼ ${t('as_add_voices')}`}
            </button>
          </div>
          {showVoices && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {voiceSegments.map((seg, i) => (
                <div key={i} style={{ display: 'flex', gap: 6, alignItems: 'flex-start' }}>
                  <select className="form-select" style={{ width: 160, fontSize: 12, flexShrink: 0 }}
                    value={seg.voiceKey} onChange={e => updateSegment(i, { voiceKey: e.target.value })}>
                    {voicesList.map(v => <option key={v.key} value={v.key}>{v.label}</option>)}
                  </select>
                  <input className="form-input" style={{ flex: 1, fontSize: 12 }}
                    placeholder={t('as_text_to_speak')}
                    value={seg.text} onChange={e => updateSegment(i, { text: e.target.value })} />
                  <button type="button" onClick={() => removeSegment(i)}
                    style={{ padding: '6px 10px', borderRadius: 7, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 13 }}>×</button>
                </div>
              ))}
              <button type="button" onClick={addSegment}
                style={{ fontSize: 12, padding: '5px', borderRadius: 7, border: '1px dashed var(--border)', background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                + {t('as_add_line')}
              </button>
            </div>
          )}
        </div>

        <div className="alert alert-info" style={{ fontSize: '0.78rem', padding: '8px 12px' }}>
          ℹ️ {t('as_gen_time')}: ~{estMin} min · 256×256 px · {preset.steps} {t('as_steps')}
          {motionLora && ` · ${t('as_motion')}: ${MOTION_LORAS.find(m => m.key === motionLora)?.label}`}
        </div>

        {error && <div className="alert alert-error" style={{ fontSize: '0.85rem' }}>⚠️ {error}</div>}

        <button className="btn btn-primary btn-lg" style={{ width: '100%' }}
          onClick={handleSubmit} disabled={isGenerating}>
          {isGenerating ? `⏳ ${t('as_generating')}` : `🎬 ${t('as_btn_generate')}`}
        </button>
      </div>
    </div>
  );
}
