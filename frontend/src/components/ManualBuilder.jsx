import { useT } from '../i18n/index.jsx';
import { RATE_OPTIONS, PITCH_OPTIONS, makeDefaultSegment } from '../constants.js';

function VoiceBadge({ gender }) {
  const { t } = useT();
  const cls = gender === 'male' ? 'badge-male' : gender === 'female' ? 'badge-female' : 'badge-child';
  const label = gender === 'male' ? t('mb_gender_male') : gender === 'female' ? t('mb_gender_female') : t('mb_gender_clone');
  return <span className={`voice-badge ${cls}`}>{label}</span>;
}

function SegmentCard({ seg, index, onChange, onRemove, canRemove, voices }) {
  const { t } = useT();
  const voice = voices[seg.speaker_key] || {};
  const update = (field, val) => onChange({ ...seg, [field]: val });

  return (
    <div className="segment-card">
      <div className="segment-header">
        <div className="segment-number">{index + 1}</div>
        <div className="segment-voice-label">
          {voice.label || t('mb_unknown_voice')}
        </div>
        <VoiceBadge gender={voice.gender} />
        {canRemove && (
          <button className="seg-remove-btn" onClick={onRemove} title={t('mb_remove_segment')}>✕</button>
        )}
      </div>

      <div className="segment-controls">
        <div className="form-group">
          <label className="form-label">{t('mb_voice')}</label>
          <select className="form-select" value={seg.speaker_key}
            onChange={e => update('speaker_key', e.target.value)}>
            {Object.entries(voices).map(([k, v]) => (
              <option key={k} value={k}>{v.label} ({v.lang})</option>
            ))}
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">{t('mb_rate')}</label>
          <select className="form-select" value={seg.rate}
            onChange={e => update('rate', e.target.value)}>
            {RATE_OPTIONS.map(o => <option key={o.val} value={o.val}>{o.label}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">{t('mb_pitch')}</label>
          <select className="form-select" value={seg.pitch}
            onChange={e => update('pitch', e.target.value)}>
            {PITCH_OPTIONS.map(o => <option key={o.val} value={o.val}>{o.label}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">{t('mb_volume')}</label>
          <select className="form-select" value={seg.volume}
            onChange={e => update('volume', e.target.value)}>
            {[
              {val:'-30%', key:'mb_vol_very_quiet'},
              {val:'-20%', key:'mb_vol_quiet'},
              {val:'-10%', key:'mb_vol_slightly_quiet'},
              {val:'+0%',  key:'mb_vol_normal'},
              {val:'+10%', key:'mb_vol_slightly_loud'},
              {val:'+20%', key:'mb_vol_loud'},
              {val:'+30%', key:'mb_vol_very_loud'},
            ].map(v => (
              <option key={v.val} value={v.val}>{t(v.key)}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="segment-text-row">
        <label className="form-label">{t('mb_text_label')}</label>
        <textarea className="form-textarea" rows={3}
          placeholder={t('mb_text_placeholder')}
          value={seg.text}
          onChange={e => update('text', e.target.value)}
        />
      </div>
    </div>
  );
}

export default function ManualBuilder({ segments, setSegments, voices }) {
  const { t } = useT();
  const addSegment = () => {
    const lastKey = segments[segments.length - 1]?.speaker_key || 'pl_male_marek';
    const keys = Object.keys(voices);
    const nextKey = keys[(keys.indexOf(lastKey) + 1) % keys.length] || keys[0];
    setSegments(prev => [...prev, makeDefaultSegment(nextKey)]);
  };

  const updateSeg = (id, updated) =>
    setSegments(prev => prev.map(s => s.id === id ? updated : s));

  const removeSeg = (id) =>
    setSegments(prev => prev.filter(s => s.id !== id));

  return (
    <div>
      <div className="segment-list">
        {segments.map((seg, i) => (
          <SegmentCard key={seg.id} seg={seg} index={i}
            onChange={u => updateSeg(seg.id, u)}
            onRemove={() => removeSeg(seg.id)}
            canRemove={segments.length > 1}
            voices={voices}
          />
        ))}
      </div>
      <div style={{display:'flex', gap:10, marginTop:14}}>
        <button className="btn btn-secondary btn-sm" onClick={addSegment}>
          {t('mb_add_segment')}
        </button>
        <button className="btn btn-error btn-sm"
          onClick={() => {
            if(window.confirm(t('mb_delete_all_confirm'))) {
              setSegments([makeDefaultSegment('pl_male_marek')]);
            }
          }}>
          {t('mb_delete_all')}
        </button>
      </div>
    </div>
  );
}
