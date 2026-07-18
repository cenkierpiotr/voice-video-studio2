import React, { useState, useRef } from 'react';
import { useT } from '../i18n/index.jsx';

const DEFAULT_LINES = [
  { actor: 1, text: '' },
  { actor: 2, text: '' },
];

function ActorCard({ num, actor, onChange, voicesList }) {
  const { t } = useT();
  const fileRef = useRef();
  const color = num === 1 ? 'rgba(139,92,246,0.15)' : 'rgba(34,197,94,0.12)';
  const borderColor = num === 1 ? 'rgba(139,92,246,0.5)' : 'rgba(34,197,94,0.4)';

  const handlePhoto = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => onChange({ ...actor, photo: file, preview: ev.target.result });
    reader.readAsDataURL(file);
  };

  return (
    <div style={{ flex: 1, border: `2px solid ${borderColor}`, borderRadius: 12, padding: 14, background: color }}>
      <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 10 }}>
        {num === 1 ? t('ds_actor1') : t('ds_actor2')}
      </div>

      <div
        onClick={() => fileRef.current?.click()}
        style={{
          border: '2px dashed var(--border)', borderRadius: 8, padding: 12,
          textAlign: 'center', cursor: 'pointer', marginBottom: 10,
          background: 'rgba(255,255,255,0.02)',
        }}
      >
        {actor.preview ? (
          <img src={actor.preview} alt="aktor"
            style={{ maxHeight: 120, maxWidth: '100%', borderRadius: 6, objectFit: 'contain' }} />
        ) : (
          <div>
            <div style={{ fontSize: 28 }}>📷</div>
            <div style={{ fontSize: 11, opacity: 0.6 }}>{t('ds_photo_hint')}</div>
          </div>
        )}
      </div>
      <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp"
        style={{ display: 'none' }} onChange={handlePhoto} />

      <input
        className="form-input"
        style={{ marginBottom: 8, fontSize: 12 }}
        placeholder={t('ds_actor_name_placeholder')}
        value={actor.name}
        onChange={e => onChange({ ...actor, name: e.target.value })}
      />

      <select
        className="form-select"
        style={{ fontSize: 12 }}
        value={actor.voiceKey}
        onChange={e => onChange({ ...actor, voiceKey: e.target.value })}
      >
        {voicesList.map(v => <option key={v.key} value={v.key}>{v.label}</option>)}
      </select>
    </div>
  );
}

function ScriptEditor({ lines, setLines, actors }) {
  const { t } = useT();
  const addLine = (afterIdx) => {
    const next = [...lines];
    const actorForNew = next[afterIdx]?.actor === 1 ? 2 : 1;
    next.splice(afterIdx + 1, 0, { actor: actorForNew, text: '' });
    setLines(next);
  };

  const removeLine = (idx) => {
    if (lines.length <= 1) return;
    setLines(lines.filter((_, i) => i !== idx));
  };

  const updateLine = (idx, patch) => {
    const next = [...lines];
    next[idx] = { ...next[idx], ...patch };
    setLines(next);
  };

  const toggleActor = (idx) => updateLine(idx, { actor: lines[idx].actor === 1 ? 2 : 1 });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {lines.map((line, idx) => {
        const isA1 = line.actor === 1;
        const name = isA1 ? (actors[0].name || t('ds_actor1').replace('🧑 ','')) : (actors[1].name || t('ds_actor2').replace('👩 ',''));
        const color = isA1 ? 'rgba(139,92,246,0.12)' : 'rgba(34,197,94,0.10)';
        const border = isA1 ? 'rgba(139,92,246,0.4)' : 'rgba(34,197,94,0.35)';
        return (
          <div key={idx} style={{ display: 'flex', gap: 6, alignItems: 'flex-start' }}>
            <button
              type="button"
              onClick={() => toggleActor(idx)}
              title={t('ds_change_actor')}
              style={{
                minWidth: 72, padding: '6px 8px', borderRadius: 8, fontSize: 11, fontWeight: 600,
                border: `1.5px solid ${border}`, background: color, color: 'var(--text)',
                cursor: 'pointer', whiteSpace: 'nowrap', marginTop: 2,
              }}
            >
              {isA1 ? '🧑' : '👩'} {name}
            </button>
            <textarea
              className="form-textarea"
              rows={2}
              style={{ flex: 1, fontSize: 12, resize: 'vertical' }}
              value={line.text}
              onChange={e => updateLine(idx, { text: e.target.value })}
              placeholder={t('ds_line_placeholder')}
            />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 3, marginTop: 2 }}>
              <button type="button" onClick={() => addLine(idx)}
                style={{ padding: '3px 7px', borderRadius: 6, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text)', cursor: 'pointer', fontSize: 13 }}
                title={t('ds_add_line_below')}>+</button>
              <button type="button" onClick={() => removeLine(idx)}
                style={{ padding: '3px 7px', borderRadius: 6, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 13 }}
                title={t('ds_remove_line')}>×</button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function DialogueStudio({ onGenerate, isGenerating, error, ollamaHost, ollamaModel, voices = {} }) {
  const { t } = useT();
  const voicesList = Object.entries(voices).map(([key, v]) => ({ key, label: v.label || key }));
  const [actors, setActors] = useState([
    { name: '', photo: null, preview: null, voiceKey: 'pl_male_marek' },
    { name: '', photo: null, preview: null, voiceKey: 'pl_female_zofia' },
  ]);
  const [lines, setLines] = useState(DEFAULT_LINES);
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState('');

  const setActor = (idx, val) => {
    const next = [...actors];
    next[idx] = val;
    setActors(next);
  };

  const generateScript = async () => {
    if (!aiPrompt.trim()) return;
    setAiLoading(true);
    setAiError('');
    try {
      const res = await fetch('/api/dialogue/generate-script', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: aiPrompt,
          actor1_name: actors[0].name || 'Aktor 1',
          actor2_name: actors[1].name || 'Aktor 2',
          ollama_host: ollamaHost,
          model: ollamaModel,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Błąd generowania skryptu');
      if (data.lines?.length) {
        setLines(data.lines.map(l => ({ actor: l.actor, text: l.text })));
      }
    } catch (e) {
      setAiError(e.message);
    } finally {
      setAiLoading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!actors[0].photo) return alert(t('ds_err_actor1_photo'));
    if (!actors[1].photo) return alert(t('ds_err_actor2_photo'));
    const validLines = lines.filter(l => l.text.trim());
    if (!validLines.length) return alert(t('ds_err_no_lines'));

    onGenerate({
      actor1_photo: actors[0].photo,
      actor2_photo: actors[1].photo,
      actor1_name: actors[0].name || 'Aktor 1',
      actor2_name: actors[1].name || 'Aktor 2',
      voice_key_1: actors[0].voiceKey,
      voice_key_2: actors[1].voiceKey,
      lines: validLines,
    });
  };

  const totalLines = lines.filter(l => l.text.trim()).length;
  const estMin = totalLines * 3;

  return (
    <div className="card">
      <div className="card-header">
        <h3 className="card-title">{t('ds_title')}</h3>
        <p style={{ fontSize: 13, opacity: 0.65, margin: 0 }}>
          {t('ds_subtitle')}
        </p>
      </div>
      <div className="card-body space-y-4">

        <div className="form-group">
          <label className="form-label">{t('ds_actors_label')}</label>
          <div style={{ display: 'flex', gap: 12 }}>
            <ActorCard num={1} actor={actors[0]} onChange={v => setActor(0, v)} voicesList={voicesList} />
            <ActorCard num={2} actor={actors[1]} onChange={v => setActor(1, v)} voicesList={voicesList} />
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">{t('ds_ai_label')}</label>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              className="form-input"
              style={{ flex: 1 }}
              placeholder={t('ds_ai_placeholder')}
              value={aiPrompt}
              onChange={e => setAiPrompt(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && generateScript()}
            />
            <button
              type="button"
              className="btn btn-secondary"
              onClick={generateScript}
              disabled={aiLoading || !aiPrompt.trim()}
              style={{ whiteSpace: 'nowrap' }}
            >
              {aiLoading ? t('ds_ai_loading') : t('ds_ai_btn')}
            </button>
          </div>
          {aiError && <div style={{ fontSize: 11, color: 'var(--error)', marginTop: 4 }}>⚠️ {aiError}</div>}
        </div>

        <div className="form-group">
          <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>{t('ds_script_label')} ({totalLines} {t('ds_script_lines')})</span>
            <button type="button"
              onClick={() => setLines([{ actor: 1, text: '' }, { actor: 2, text: '' }])}
              style={{ fontSize: 11, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}>
              {t('ds_script_clear')}
            </button>
          </label>
          <ScriptEditor lines={lines} setLines={setLines} actors={actors} />
          <button type="button"
            onClick={() => setLines([...lines, { actor: lines[lines.length - 1]?.actor === 1 ? 2 : 1, text: '' }])}
            style={{ marginTop: 8, fontSize: 12, padding: '5px 12px', borderRadius: 8, border: '1px dashed var(--border)', background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer', width: '100%' }}>
            {t('ds_add_line')}
          </button>
        </div>

        <div className="alert alert-info" style={{ fontSize: '0.78rem', padding: '8px 12px' }}>
          ℹ️ {t('ds_est_time')} ~{estMin} min ({totalLines} {t('ds_per_clip')}). {t('ds_gpu_required')}
        </div>

        {error && <div className="alert alert-error" style={{ fontSize: '0.85rem' }}>⚠️ {error}</div>}

        <button
          className="btn btn-primary btn-lg"
          style={{ width: '100%' }}
          onClick={handleSubmit}
          disabled={isGenerating}
        >
          {isGenerating ? t('ds_btn_generating') : t('ds_btn_generate')}
        </button>
      </div>
    </div>
  );
}
