import React, { useState, useRef } from 'react';
import { useT } from '../i18n/index.jsx';

export default function AudiobookStudio({
  onGenerate, isGenerating, error, voices = {}, ollamaHost, ollamaModel, gpuAvailable,
  xttsSpeed, onXttsSpeedChange, XttsSpeedControl,
}) {
  const { t } = useT();
  const ROLES = [
    { key: 'narrator',  label: t('ab_role_narrator'),  icon: '📖', desc: t('ab_role_narrator_desc') },
    { key: 'internal',  label: t('ab_role_internal'),  icon: '💭', desc: t('ab_role_internal_desc') },
    { key: 'epigraph',  label: t('ab_role_epigraph'),  icon: '📜', desc: t('ab_role_epigraph_desc') },
  ];

  const ESTIMATE = {
    epub: { edge: '15–30 min', xtts: '2–4 h' },
    pdf:  { edge: '10–25 min', xtts: '1–3 h' },
    txt:  { edge: '10–25 min', xtts: '1–3 h' },
  };

  const [step, setStep]           = useState('upload');
  const [parsing, setParsing]     = useState(false);
  const [parseError, setParseError] = useState('');
  const [bookInfo, setBookInfo]   = useState(null);
  const [voiceMap, setVoiceMap]   = useState({
    narrator: 'pl_male_andrew_multi',
    internal: 'pl_female_zofia',
    epigraph: 'pl_female_seraphina_multi',
  });
  const [characters, setCharacters] = useState([]);
  const [newCharName, setNewCharName] = useState('');
  const [outputFormat, setOutputFormat] = useState('mp3');
  const [useGpuXtts, setUseGpuXtts]   = useState(true);
  const [useLlm, setUseLlm]           = useState(true);
  const [fileExt, setFileExt]         = useState('epub');
  const fileRef = useRef();

  const voicesList = Object.entries(voices).map(([key, v]) => ({ key, label: v.label || key }));
  const defaultVoice = voicesList[0]?.key || 'pl_male_marek';

  const parseFile = async (file) => {
    const ext = file.name.split('.').pop().toLowerCase();
    if (!['epub', 'pdf', 'txt'].includes(ext)) {
      setParseError(t('ab_err_format'));
      return;
    }
    setFileExt(ext);
    setParsing(true);
    setParseError('');
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('ollama_host', ollamaHost);
      fd.append('model', ollamaModel);
      const res = await fetch('/api/audiobook/parse', { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || t('ps_err_parse'));
      setBookInfo(data);
      const detected = (data.characters || []).map(name => ({ name, voice_key: defaultVoice }));
      setCharacters(detected);
      setStep('configure');
    } catch (e) {
      setParseError(e.message);
    } finally {
      setParsing(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (f) parseFile(f);
  };

  const addCharacter = () => {
    const name = newCharName.trim();
    if (!name || characters.find(c => c.name === name)) return;
    setCharacters(cs => [...cs, { name, voice_key: defaultVoice }]);
    setNewCharName('');
  };

  const removeCharacter = (name) => setCharacters(cs => cs.filter(c => c.name !== name));

  const updateCharVoice = (name, voice_key) =>
    setCharacters(cs => cs.map(c => c.name === name ? { ...c, voice_key } : c));

  const handleGenerate = async () => {
    if (!bookInfo) return;
    const finalVoiceMap = { ...voiceMap };
    characters.forEach(c => { finalVoiceMap[c.name] = c.voice_key; });
    await onGenerate({
      session_id: bookInfo.session_id,
      book_title: bookInfo.title,
      voice_map: finalVoiceMap,
      output_format: outputFormat,
      use_gpu_xtts: useGpuXtts && gpuAvailable,
      use_llm_analysis: useLlm,
      ollama_host: ollamaHost,
      model: ollamaModel,
    });
  };

  const VoiceSelect = ({ value, onChange }) => (
    <select
      className="form-select"
      style={{ fontSize: 12 }}
      value={value}
      onChange={e => onChange(e.target.value)}
    >
      {voicesList.map(v => <option key={v.key} value={v.key}>{v.label}</option>)}
    </select>
  );

  // ── Upload ───────────────────────────────────────────────────────────────────
  if (step === 'upload') {
    return (
      <div>
        <div style={{
          marginBottom: 20, padding: '14px 18px',
          background: 'rgba(139,92,246,0.08)', borderRadius: 12,
          border: '1px solid rgba(139,92,246,0.2)', fontSize: 13, lineHeight: 1.6,
        }}>
          <strong>Audiobook Studio</strong> — {t('ab_intro')}
          {gpuAvailable
            ? <span style={{ color: '#4ade80', marginLeft: 8 }}>✅ {t('ab_gpu_active')}</span>
            : <span style={{ opacity: 0.5, marginLeft: 8 }}>{t('ab_gpu_missing')}</span>}
        </div>

        <div
          onDrop={handleDrop}
          onDragOver={e => e.preventDefault()}
          onClick={() => fileRef.current?.click()}
          style={{
            border: '2px dashed var(--border)', borderRadius: 14,
            padding: '52px 24px', textAlign: 'center', cursor: 'pointer',
            transition: 'border-color 0.2s, background 0.2s',
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.background = 'rgba(139,92,246,0.04)'; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = ''; }}
        >
          <div style={{ fontSize: 52, marginBottom: 14 }}>📚</div>
          <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 6 }}>{t('ps_drop_or_click')}</div>
          <div style={{ fontSize: 13, opacity: 0.45, marginBottom: 10 }}>EPUB · PDF · TXT</div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 8, flexWrap: 'wrap' }}>
            {['EPUB', 'PDF', 'TXT'].map(f => (
              <span key={f} style={{
                fontSize: 11, padding: '3px 10px',
                background: 'var(--bg-input)', border: '1px solid var(--border)',
                borderRadius: 20, color: 'var(--text-secondary)',
              }}>{f}</span>
            ))}
          </div>
          <input
            ref={fileRef} type="file" accept=".epub,.pdf,.txt"
            style={{ display: 'none' }}
            onChange={e => { if (e.target.files[0]) parseFile(e.target.files[0]); }}
          />
        </div>

        {parsing && (
          <div className="alert alert-info" style={{ marginTop: 16, textAlign: 'center' }}>
            ⏳ {t('ab_parsing')}
          </div>
        )}
        {parseError && (
          <div className="alert" style={{ marginTop: 16, borderColor: 'var(--error)', color: 'var(--error)' }}>
            ❌ {parseError}
          </div>
        )}

        <div style={{ marginTop: 24, display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>
          {[
            { icon: '🎭', title: t('ab_card_multivoice_title'), desc: t('ab_card_multivoice_desc') },
            { icon: '🎨', title: t('ab_card_emotions_title'), desc: t('ab_card_emotions_desc') },
            { icon: '🏆', title: t('ab_card_m4b_title'), desc: t('ab_card_m4b_desc') },
          ].map(card => (
            <div key={card.title} style={{
              padding: '14px 12px', borderRadius: 10,
              border: '1px solid var(--border)', background: 'var(--bg-card)', textAlign: 'center',
            }}>
              <div style={{ fontSize: 24, marginBottom: 6 }}>{card.icon}</div>
              <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 4 }}>{card.title}</div>
              <div style={{ fontSize: 11, opacity: 0.5 }}>{card.desc}</div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ── Configure ────────────────────────────────────────────────────────────────
  if (step === 'configure') {
    const est = ESTIMATE[fileExt] || ESTIMATE.epub;
    return (
      <div>
        {/* Book info */}
        <div style={{
          marginBottom: 20, padding: '12px 16px',
          background: 'rgba(74,222,128,0.06)', borderRadius: 10,
          border: '1px solid rgba(74,222,128,0.18)',
          display: 'flex', alignItems: 'center', gap: 14,
        }}>
          <span style={{ fontSize: 32 }}>📚</span>
          <div>
            <div style={{ fontWeight: 600, fontSize: 15 }}>{bookInfo.title}</div>
            <div style={{ fontSize: 12, opacity: 0.55, marginTop: 2 }}>
              {bookInfo.total_chapters} {t('ab_chapters')}
              {bookInfo.characters?.length > 0 && ` · ${bookInfo.characters.length} ${t('ab_characters_detected')}`}
            </div>
          </div>
          <button
            className="btn btn-ghost btn-sm"
            style={{ marginLeft: 'auto', flexShrink: 0 }}
            onClick={() => setStep('upload')}
          >
            ← {t('ab_change_file')}
          </button>
        </div>

        {/* Preview */}
        {bookInfo.chapters_preview?.length > 0 && (
          <details style={{ marginBottom: 20 }}>
            <summary style={{ cursor: 'pointer', fontSize: 12, opacity: 0.6, marginBottom: 6 }}>
              {t('ab_chapters_preview')} ({bookInfo.chapters_preview.length} {t('common_of')} {bookInfo.total_chapters})
            </summary>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 }}>
              {bookInfo.chapters_preview.map(ch => (
                <div key={ch.index} style={{
                  padding: '8px 12px', borderRadius: 8,
                  background: 'var(--bg-input)', border: '1px solid var(--border)',
                }}>
                  <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 3 }}>{ch.title}</div>
                  <div style={{ fontSize: 11, opacity: 0.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {ch.preview}
                  </div>
                </div>
              ))}
            </div>
          </details>
        )}

        {/* Role voices */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', opacity: 0.5, marginBottom: 10 }}>
            {t('ab_narrative_roles')}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {ROLES.map(role => (
              <div key={role.key} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ width: 26, textAlign: 'center', fontSize: 16 }}>{role.icon}</span>
                <div style={{ minWidth: 170 }}>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>{role.label}</div>
                  <div style={{ fontSize: 10, opacity: 0.45 }}>{role.desc}</div>
                </div>
                <div style={{ flex: 1 }}>
                  <VoiceSelect
                    value={voiceMap[role.key] || defaultVoice}
                    onChange={v => setVoiceMap(m => ({ ...m, [role.key]: v }))}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Character voices */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', opacity: 0.5, marginBottom: 10 }}>
            {t('ab_character_voices')}
          </div>

          {characters.length === 0 && (
            <div style={{ fontSize: 12, opacity: 0.45, marginBottom: 10, fontStyle: 'italic' }}>
              {t('ab_no_characters')}
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 10 }}>
            {characters.map(c => (
              <div key={c.name} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ width: 26, textAlign: 'center' }}>👤</span>
                <div style={{ minWidth: 170, fontSize: 13, fontWeight: 500 }}>{c.name}</div>
                <div style={{ flex: 1 }}>
                  <VoiceSelect value={c.voice_key} onChange={v => updateCharVoice(c.name, v)} />
                </div>
                <button
                  className="btn btn-ghost btn-sm"
                  style={{ color: 'var(--error)', flexShrink: 0 }}
                  onClick={() => removeCharacter(c.name)}
                >✕</button>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <input
              className="form-input" style={{ flex: 1 }}
              placeholder={t('ab_add_character_placeholder')}
              value={newCharName}
              onChange={e => setNewCharName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addCharacter()}
            />
            <button className="btn btn-ghost btn-sm" onClick={addCharacter}>+ {t('ab_add')}</button>
          </div>
        </div>

        {/* Options */}
        <div style={{ marginBottom: 20, display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'flex-start' }}>
          <div className="form-group" style={{ minWidth: 180 }}>
            <label className="form-label">{t('ab_output_format')}</label>
            <select className="form-select" value={outputFormat} onChange={e => setOutputFormat(e.target.value)}>
              <option value="mp3">{t('ab_format_mp3')}</option>
              <option value="m4b">{t('ab_format_m4b')}</option>
            </select>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, paddingTop: 22 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13 }}>
              <input type="checkbox" checked={useLlm} onChange={e => setUseLlm(e.target.checked)} />
              {t('ab_ai_analysis')}
              <span style={{ fontSize: 11, opacity: 0.45 }}>— {t('ab_ai_analysis_hint')}</span>
            </label>
            {gpuAvailable && (
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13 }}>
                <input type="checkbox" checked={useGpuXtts} onChange={e => setUseGpuXtts(e.target.checked)} />
                {t('ab_xtts_gpu')}
                <span style={{ fontSize: 11, opacity: 0.45 }}>— {t('ab_xtts_gpu_hint')}</span>
              </label>
            )}
          </div>
        </div>

        {/* Time estimate */}
        <div className="alert alert-info" style={{ marginBottom: 16, fontSize: 12 }}>
          <strong>{t('ab_estimated_time')}</strong> {t('ab_for')} {bookInfo.total_chapters} {t('ab_chapters')}:{' '}
          <strong>{useGpuXtts && gpuAvailable ? est.xtts : est.edge}</strong>
          {useGpuXtts && gpuAvailable && ` (${t('ab_xtts_quality')})`}
          {(!useGpuXtts || !gpuAvailable) && ` (${t('ab_edge_fast')})`}
          <br />
          {t('ab_progress_hint')}
        </div>

        {error && (
          <div className="alert" style={{ marginBottom: 14, borderColor: 'var(--error)', color: 'var(--error)' }}>
            ❌ {error}
          </div>
        )}

        <button
          className="btn btn-primary"
          style={{ width: '100%', padding: '13px 0', fontSize: 15 }}
          onClick={handleGenerate}
          disabled={isGenerating}
        >
          {isGenerating ? `⏳ ${t('ab_generating')}` : `🎧 ${t('ab_btn_generate')}`}
        </button>
        {XttsSpeedControl && <div style={{marginTop:10}}><XttsSpeedControl value={xttsSpeed ?? 1.0} onChange={onXttsSpeedChange} /></div>}
      </div>
    );
  }

  return null;
}
