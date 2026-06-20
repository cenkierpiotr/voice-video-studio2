import { useState, useEffect, useCallback } from 'react';

const CATEGORY_LABELS = {
  all:           'Wszystkie',
  tts:           'TTS / Mowa',
  avatar:        'Avatar',
  video:         'Wideo',
  transcription: 'Transkrypcja',
  music:         'Muzyka',
};

function Stars({ count, max = 5, char = '★', emptyChar = '☆' }) {
  return (
    <span style={{ color: 'var(--accent)', letterSpacing: 1 }}>
      {char.repeat(count)}{emptyChar.repeat(max - count)}
    </span>
  );
}

function VramBar({ vram, hwVram }) {
  const pct = hwVram > 0 ? Math.min(100, (vram / hwVram) * 100) : 0;
  const fits = vram <= hwVram || vram === 0;
  return (
    <div style={{ marginTop: 6 }}>
      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 3 }}>
        VRAM: {vram === 0 ? 'brak (CPU)' : `${vram} GB`}
        {!fits && <span style={{ color: '#f59e0b', marginLeft: 6 }}>⚠ przekracza {hwVram} GB</span>}
      </div>
      {vram > 0 && (
        <div style={{ height: 4, background: 'var(--border)', borderRadius: 2, overflow: 'hidden' }}>
          <div style={{
            width: `${pct}%`, height: '100%', borderRadius: 2,
            background: fits ? 'var(--accent)' : '#f59e0b',
          }} />
        </div>
      )}
    </div>
  );
}

function InstallModal({ model, onClose }) {
  if (!model) return null;
  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: 'var(--bg-card)', border: '1px solid var(--border)',
          borderRadius: 12, padding: 28, maxWidth: 520, width: '90%',
        }}
      >
        <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 8, color: 'var(--text-primary)' }}>
          Instalacja: {model.name}
        </div>
        <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>
          Wymagane miejsce na dysku: {model.disk_gb} GB • VRAM: {model.vram_gb} GB
        </div>

        {model.install_script && (
          <>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>Skrypt instalacyjny:</div>
            <pre style={{
              background: 'var(--bg-input)', border: '1px solid var(--border)',
              borderRadius: 6, padding: '10px 14px', fontSize: 12,
              color: 'var(--text-primary)', overflowX: 'auto', marginBottom: 12,
            }}>
              {`bash ${model.install_script}`}
            </pre>
          </>
        )}

        {model.install_cmd && (
          <>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>Komenda pip:</div>
            <pre style={{
              background: 'var(--bg-input)', border: '1px solid var(--border)',
              borderRadius: 6, padding: '10px 14px', fontSize: 12,
              color: 'var(--text-primary)', overflowX: 'auto', marginBottom: 12,
            }}>
              {model.install_cmd}
            </pre>
          </>
        )}

        {!model.install_script && !model.install_cmd && (
          <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>
            Ten model nie ma automatycznej instalacji. Sprawdź dokumentację projektu.
          </div>
        )}

        <button
          className="btn btn-primary"
          onClick={onClose}
          style={{ marginTop: 8 }}
        >
          Zamknij
        </button>
      </div>
    </div>
  );
}

function ModelCard({ model, hwVram, onActivate, onInstall }) {
  const isActive = model.active;
  const fits = model.fits_hardware;
  const activeNotInstalled = isActive && !model.installed;

  const borderColor = activeNotInstalled
    ? '#b45309'
    : isActive
      ? 'var(--accent)'
      : 'var(--border)';

  return (
    <div style={{
      background: 'var(--bg-card)',
      border: `1px solid ${borderColor}`,
      borderRadius: 10, padding: 16,
      opacity: fits ? 1 : 0.65,
      display: 'flex', flexDirection: 'column', gap: 6,
      transition: 'border-color 0.2s',
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
        <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-primary)', lineHeight: 1.3 }}>
          {model.name}
        </div>
        <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
          {isActive && model.installed && (
            <span style={{
              background: '#166534', color: '#bbf7d0', fontSize: 10,
              padding: '2px 7px', borderRadius: 4, fontWeight: 600,
            }}>AKTYWNY</span>
          )}
          {activeNotInstalled && (
            <span style={{
              background: '#78350f', color: '#fde68a', fontSize: 10,
              padding: '2px 7px', borderRadius: 4, fontWeight: 600,
            }}>AKTYWNY · BRAK WAG</span>
          )}
          {model.recommended && !isActive && (
            <span style={{
              background: 'var(--accent)', color: '#fff', fontSize: 10,
              padding: '2px 7px', borderRadius: 4, fontWeight: 600, opacity: 0.85,
            }}>Polecany</span>
          )}
          {!fits && (
            <span style={{
              background: '#78350f', color: '#fde68a', fontSize: 10,
              padding: '2px 7px', borderRadius: 4, fontWeight: 600,
            }}>Za mało VRAM</span>
          )}
        </div>
      </div>

      <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.4 }}>{model.description}</div>

      {activeNotInstalled && (
        <div style={{
          fontSize: 11, color: '#fde68a', background: 'rgba(120,53,15,0.25)',
          border: '1px solid rgba(180,83,9,0.4)', borderRadius: 6, padding: '5px 8px',
        }}>
          Ten model jest ustawiony jako aktywny, ale wagi nie są pobrane. Zainstaluj go lub wybierz inny aktywny model.
        </div>
      )}

      <VramBar vram={model.vram_gb} hwVram={hwVram} />

      <div style={{ display: 'flex', gap: 16, fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
        <span>Jakość: <Stars count={model.quality} /></span>
        <span>Szybkość: <Stars count={model.speed} char="⚡" emptyChar="·" /></span>
      </div>

      <div style={{ marginTop: 6, display: 'flex', gap: 8 }}>
        {model.installed ? (
          <button
            className="btn btn-sm btn-primary"
            disabled={isActive || !fits}
            onClick={() => onActivate(model.category, model.id)}
            title={!fits ? 'Niewystarczające VRAM' : isActive ? 'Już aktywny' : 'Ustaw jako aktywny'}
          >
            {isActive ? '✓ Aktywny' : 'Ustaw aktywny'}
          </button>
        ) : (
          <button
            className="btn btn-sm btn-secondary"
            onClick={() => onInstall(model)}
          >
            + Zainstaluj
          </button>
        )}
      </div>
    </div>
  );
}

export default function ModelsTab({ hardwareInfo }) {
  const [models, setModels] = useState([]);
  const [hwProfile, setHwProfile] = useState('');
  const [vramTotal, setVramTotal] = useState(0);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [installModal, setInstallModal] = useState(null);
  const [configuring, setConfiguring] = useState(false);

  const fetchModels = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/models');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setModels(data.models || []);
      setHwProfile(data.hardware_profile || '');
      setVramTotal(data.vram_total_gb || 0);
    } catch (err) {
      setError('Błąd ładowania modeli: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchModels(); }, [fetchModels]); // eslint-disable-line react-hooks/set-state-in-effect

  const handleActivate = async (category, modelId) => {
    await fetch('/api/models/active', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ category, model_id: modelId }),
    });
    fetchModels();
  };

  const handleAutoConfigure = async () => {
    setConfiguring(true);
    await fetch('/api/models/auto-configure', { method: 'POST' });
    await fetchModels();
    setConfiguring(false);
  };

  const gpuName = hardwareInfo?.gpu?.name || 'Nieznane GPU';
  const filtered = filter === 'all' ? models : models.filter(m => m.category === filter);

  return (
    <div>
      <div style={{
        background: 'var(--bg-input)', border: '1px solid var(--border)',
        borderRadius: 8, padding: '10px 14px', marginBottom: 20,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        fontSize: 13, color: 'var(--text-secondary)',
      }}>
        <span>
          GPU: <strong style={{ color: 'var(--text-primary)' }}>{gpuName}</strong>
          {' · '}VRAM: <strong style={{ color: 'var(--text-primary)' }}>{vramTotal} GB</strong>
          {' · '}Profil: <strong style={{ color: 'var(--accent)' }}>{hwProfile || '—'}</strong>
        </span>
        <button
          className="btn btn-sm btn-secondary"
          onClick={handleAutoConfigure}
          disabled={configuring}
        >
          {configuring ? 'Konfiguruję…' : '⚡ Auto-konfiguracja'}
        </button>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        {Object.entries(CATEGORY_LABELS).map(([cat, label]) => (
          <button
            key={cat}
            className={`btn btn-sm ${filter === cat ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setFilter(cat)}
          >
            {label}
          </button>
        ))}
      </div>

      {loading && (
        <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
          Ładowanie modeli…
        </div>
      )}
      {error && (
        <div style={{ color: '#f87171', padding: 16, background: 'var(--bg-input)', borderRadius: 8 }}>
          {error}
        </div>
      )}

      {!loading && !error && (
        <>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12 }}>
            {filtered.filter(m => m.installed).length} zainstalowanych · {filtered.filter(m => m.active).length} aktywnych · {filtered.length} łącznie
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
            {filtered.map(model => (
              <ModelCard
                key={model.id}
                model={model}
                hwVram={vramTotal}
                onActivate={handleActivate}
                onInstall={setInstallModal}
              />
            ))}
          </div>
        </>
      )}

      <InstallModal model={installModal} onClose={() => setInstallModal(null)} />
    </div>
  );
}
