import { useState, useEffect } from 'react';

export default function ModelSelector({ category, label, onChange }) {
  const [models, setModels] = useState([]);
  const [activeId, setActiveId] = useState('');
  const [vramAvail, setVramAvail] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/models')
      .then(r => r.json())
      .then(data => {
        setVramAvail(data.vram_total_gb || 0);
        const list = (data.models || []).filter(m => m.category === category && m.installed);
        setModels(list);
        const active = list.find(m => m.active);
        if (active) {
          setActiveId(active.id);
          onChange?.(active.id);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [category]); // eslint-disable-line

  const handleChange = async (e) => {
    const val = e.target.value;
    setActiveId(val);
    try {
      await fetch('/api/models/active', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category, model_id: val }),
      });
    } catch {} // eslint-disable-line no-empty
    onChange?.(val);
  };

  if (loading || models.length === 0) return null;

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8,
      fontSize: 12, color: 'var(--text-secondary)',
    }}>
      {label && (
        <span style={{ color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{label}:</span>
      )}
      <select
        value={activeId}
        onChange={handleChange}
        style={{
          background: 'var(--bg-input)', border: '1px solid var(--border)',
          borderRadius: 6, color: 'var(--text-primary)', padding: '4px 8px',
          fontSize: 12, cursor: 'pointer', flex: 1, minWidth: 0,
        }}
      >
        {models.map(m => {
          const noVram = m.vram_gb > 0 && m.vram_gb > vramAvail;
          return (
            <option key={m.id} value={m.id}>
              {noVram ? '⚠ ' : ''}{m.name} {'★'.repeat(m.quality)} {m.active ? '· aktywny' : ''}
            </option>
          );
        })}
      </select>
      <span
        title="Ustawienia → Modele AI — tu możesz instalować i zmieniać modele"
        style={{ color: 'var(--text-muted)', fontSize: 13, flexShrink: 0, cursor: 'help' }}
      >
        ⚙
      </span>
    </div>
  );
}
