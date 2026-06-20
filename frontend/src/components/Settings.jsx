import React, { useState, useEffect } from 'react';
import HardwarePanel from './HardwarePanel.jsx';
import ModelsTab from './ModelsTab.jsx';
import { useT } from '../i18n/index.jsx';

function Field({ label, hint, children }) {
  return (
    <div className="settings-field">
      <label>{label}</label>
      {hint && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>{hint}</div>}
      {children}
    </div>
  );
}

function Toggle({ label, hint, checked, onChange }) {
  return (
    <div className="settings-toggle">
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, color: 'var(--text-primary)' }}>{label}</div>
        {hint && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{hint}</div>}
      </div>
      <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)}
        style={{ width: 18, height: 18, accentColor: 'var(--accent)', cursor: 'pointer' }} />
    </div>
  );
}

function SectionTitle({ children }) {
  return <div className="settings-section-title">{children}</div>;
}

export default function Settings({ hardwareInfo, onHardwareRefresh }) {
  const { t } = useT();

  const TABS = [
    { id: 'integrations', label: t('settings_tab_integrations') },
    { id: 'tts',          label: t('settings_tab_tts') },
    { id: 'models',       label: 'Modele AI' },
    { id: 'hardware',     label: t('settings_tab_hardware') },
    { id: 'security',     label: t('settings_tab_security') },
    { id: 'files',        label: t('settings_tab_files') },
  ];

  const [activeTab, setActiveTab] = useState('integrations');

  const [intg, setIntg] = useState(() => {
    try { return JSON.parse(localStorage.getItem('vs_settings_integrations')) || {}; } catch { return {}; }
  });
  const [tts, setTts] = useState(() => {
    try { return JSON.parse(localStorage.getItem('vs_settings_tts')) || { engine: 'edge-tts', lang: 'pl', speed: 1.0, useGpu: true, autoTranscribe: false }; } catch { return { engine: 'edge-tts', lang: 'pl', speed: 1.0, useGpu: true, autoTranscribe: false }; }
  });
  const [sec, setSec] = useState(() => {
    try { return JSON.parse(localStorage.getItem('vs_settings_sec')) || { passwordEnabled: false, cors: 'http://localhost:47822' }; } catch { return { passwordEnabled: false, cors: 'http://localhost:47822' }; }
  });
  const [files, setFiles] = useState(() => {
    try { return JSON.parse(localStorage.getItem('vs_settings_files')) || { autoclean: 'never', autoSave: false }; } catch { return { autoclean: 'never', autoSave: false }; }
  });

  const [showKeys, setShowKeys] = useState({});
  const [ollamaStatus, setOllamaStatus] = useState(null);
  const [testingOllama, setTestingOllama] = useState(false);
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [pwdMsg, setPwdMsg] = useState('');

  useEffect(() => { localStorage.setItem('vs_settings_integrations', JSON.stringify(intg)); }, [intg]);
  useEffect(() => { localStorage.setItem('vs_settings_tts', JSON.stringify(tts)); }, [tts]);
  useEffect(() => { localStorage.setItem('vs_settings_sec', JSON.stringify(sec)); }, [sec]);
  useEffect(() => { localStorage.setItem('vs_settings_files', JSON.stringify(files)); }, [files]);

  const toggleKey = (key) => setShowKeys(k => ({ ...k, [key]: !k[key] }));

  const testOllama = async () => {
    setTestingOllama(true);
    setOllamaStatus(null);
    try {
      const host = intg.ollamaHost || 'http://localhost:11434';
      const res = await fetch(`/api/ollama/status?host=${encodeURIComponent(host)}`);
      const data = await res.json();
      setOllamaStatus(data.online ? { ok: true, models: data.models } : { ok: false });
    } catch { setOllamaStatus({ ok: false }); }
    setTestingOllama(false);
  };

  const changePassword = async () => {
    if (!newPwd) { setPwdMsg(t('settings_pwd_empty')); return; }
    if (newPwd !== confirmPwd) { setPwdMsg(t('settings_pwd_mismatch')); return; }
    try {
      const res = await fetch('/api/auth/set-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: newPwd }),
      });
      setPwdMsg(res.ok ? t('settings_pwd_changed') : t('settings_pwd_error'));
    } catch { setPwdMsg('❌ Błąd połączenia'); }
    setNewPwd(''); setConfirmPwd('');
  };

  const exportSettings = () => {
    const all = { integrations: intg, tts, security: sec, files };
    const blob = new Blob([JSON.stringify(all, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'studio-ai-settings.json'; a.click();
    URL.revokeObjectURL(url);
  };

  const importSettings = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target.result);
        if (data.integrations) setIntg(data.integrations);
        if (data.tts) setTts(data.tts);
        if (data.security) setSec(data.security);
        if (data.files) setFiles(data.files);
        alert(t('settings_files_import_ok'));
      } catch { alert(t('settings_files_import_err')); }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const clearCache = async () => {
    if (!confirm(t('settings_files_clear_confirm'))) return;
    try {
      await fetch('/api/cache/clear', { method: 'POST' });
      alert(t('settings_files_cache_ok'));
    } catch { alert(t('settings_files_cache_err')); }
  };

  const inputStyle = { background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text-primary)', padding: '8px 10px', fontSize: 13, width: '100%', fontFamily: 'inherit' };

  return (
    <div>
      <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 20 }}>{t('settings_title')}</div>

      <div className="settings-tabs">
        {TABS.map(tab => (
          <button key={tab.id} className={`settings-tab ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}>
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'integrations' && (
        <div>
          <SectionTitle>{t('settings_api_keys_title')}</SectionTitle>

          {[
            { key: 'gemini', label: 'Gemini API Key', placeholder: 'AIza…' },
            { key: 'openai', label: 'OpenAI API Key', placeholder: 'sk-…' },
            { key: 'eleven', label: 'ElevenLabs API Key', placeholder: 'xxxxxxxx…' },
          ].map(({ key, label, placeholder }) => (
            <Field key={key} label={label}>
              <div className="field-row">
                <input
                  type={showKeys[key] ? 'text' : 'password'}
                  style={inputStyle}
                  value={intg[key] || ''}
                  onChange={e => setIntg(p => ({ ...p, [key]: e.target.value }))}
                  placeholder={placeholder}
                />
                <button className="btn btn-ghost btn-sm" onClick={() => toggleKey(key)} title={t('settings_show_hide_key')}>
                  {showKeys[key] ? '🙈' : '👁'}
                </button>
              </div>
            </Field>
          ))}

          <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '20px 0' }} />
          <SectionTitle>{t('settings_ollama_title')}</SectionTitle>

          <Field label={t('settings_ollama_host_label')} hint={t('settings_ollama_host_hint')}>
            <input style={inputStyle} value={intg.ollamaHost || 'http://localhost:11434'}
              onChange={e => setIntg(p => ({ ...p, ollamaHost: e.target.value }))}
              placeholder="http://localhost:11434" />
          </Field>

          <Field label={t('settings_ollama_model_label')}>
            <input style={inputStyle} value={intg.ollamaModel || ''}
              onChange={e => setIntg(p => ({ ...p, ollamaModel: e.target.value }))}
              placeholder="qwen3:4b" />
          </Field>

          <button className="btn btn-secondary" onClick={testOllama} disabled={testingOllama}>
            {testingOllama ? t('settings_ollama_testing') : t('settings_ollama_test_btn')}
          </button>

          {ollamaStatus && (
            <div className={`alert ${ollamaStatus.ok ? 'alert-success' : 'alert-error'}`} style={{ marginTop: 12 }}>
              {ollamaStatus.ok
                ? `✅ ${t('settings_ollama_ok')} — ${ollamaStatus.models?.length || 0} modeli: ${(ollamaStatus.models || []).slice(0, 5).join(', ')}`
                : t('settings_ollama_err')}
            </div>
          )}
        </div>
      )}

      {activeTab === 'tts' && (
        <div>
          <Field label={t('settings_tts_engine_label')}>
            <select style={inputStyle} value={tts.engine} onChange={e => setTts(p => ({ ...p, engine: e.target.value }))}>
              <option value="edge-tts">⚡ edge-tts — natychmiastowy (Microsoft Neural TTS)</option>
              <option value="xtts">🌟 XTTS v2 — klonowanie głosu (Coqui, lokalne)</option>
              <option value="melotts">🎭 MeloTTS — wielojęzyczny (lokalny)</option>
            </select>
          </Field>

          <Field label={t('settings_tts_lang_label')}>
            <select style={inputStyle} value={tts.lang} onChange={e => setTts(p => ({ ...p, lang: e.target.value }))}>
              <option value="pl">🇵🇱 Polski</option>
              <option value="en">🇬🇧 Angielski</option>
              <option value="de">🇩🇪 Deutsch</option>
              <option value="fr">🇫🇷 Français</option>
              <option value="es">🇪🇸 Español</option>
            </select>
          </Field>

          <Field label={`${t('settings_tts_speed_label')}: ${parseFloat(tts.speed || 1).toFixed(2)}×`}>
            <input type="range" className="form-range"
              min={0.5} max={2.0} step={0.05}
              value={tts.speed || 1.0}
              onChange={e => setTts(p => ({ ...p, speed: parseFloat(e.target.value) }))} />
          </Field>

          <SectionTitle>{t('settings_tts_advanced')}</SectionTitle>
          <Toggle label={t('settings_tts_gpu')}
            hint={t('settings_tts_gpu_hint')}
            checked={!!tts.useGpu}
            onChange={v => setTts(p => ({ ...p, useGpu: v }))} />

          <Toggle label={t('settings_tts_auto_transcribe')}
            hint={t('settings_tts_auto_transcribe_hint')}
            checked={!!tts.autoTranscribe}
            onChange={v => setTts(p => ({ ...p, autoTranscribe: v }))} />
        </div>
      )}

      {activeTab === 'hardware' && (
        <HardwarePanel info={hardwareInfo} onRefresh={onHardwareRefresh} />
      )}

      {activeTab === 'security' && (
        <div>
          <Toggle label={t('settings_sec_password')}
            hint={t('settings_sec_password_hint')}
            checked={!!sec.passwordEnabled}
            onChange={v => setSec(p => ({ ...p, passwordEnabled: v }))} />

          {sec.passwordEnabled && (
            <div style={{ marginTop: 16, padding: 16, background: 'var(--bg-surface)', borderRadius: 10, border: '1px solid var(--border)' }}>
              <Field label={t('settings_sec_new_pwd')}>
                <input type="password" style={inputStyle} value={newPwd} onChange={e => setNewPwd(e.target.value)} placeholder={t('settings_sec_new_pwd_placeholder')} />
              </Field>
              <Field label={t('settings_sec_confirm_pwd')}>
                <input type="password" style={inputStyle} value={confirmPwd} onChange={e => setConfirmPwd(e.target.value)} placeholder={t('settings_sec_confirm_pwd_placeholder')} />
              </Field>
              <button className="btn btn-primary" onClick={changePassword}>{t('settings_sec_change_pwd_btn')}</button>
              {pwdMsg && <div style={{ marginTop: 10, fontSize: 13, color: pwdMsg.startsWith('✅') ? 'var(--success)' : 'var(--danger)' }}>{pwdMsg}</div>}
              <div style={{ marginTop: 12, fontSize: 11, color: 'var(--text-muted)' }}>
                {t('settings_sec_bcrypt_hint')}
              </div>
            </div>
          )}

          <SectionTitle>{t('settings_sec_rate_limit_title')}</SectionTitle>
          <div style={{ background: 'var(--bg-input)', borderRadius: 8, padding: 12, fontSize: 13, color: 'var(--text-secondary)' }}>
            🛡 Limit: <strong>100 zapytań/minutę</strong> per IP — domyślnie włączone.
            Chroni przed atakami DoS.
          </div>

          <SectionTitle>{t('settings_sec_cors_title')}</SectionTitle>
          <Field label={t('settings_sec_cors_label')} hint={t('settings_sec_cors_hint')}>
            <textarea style={{ ...inputStyle, minHeight: 80, resize: 'vertical' }}
              value={sec.cors || ''}
              onChange={e => setSec(p => ({ ...p, cors: e.target.value }))}
              placeholder="http://localhost:47822&#10;http://192.168.1.100:47822" />
          </Field>
        </div>
      )}

      {activeTab === 'models' && (
        <ModelsTab hardwareInfo={hardwareInfo} />
      )}

      {activeTab === 'files' && (
        <div>
          <Field label={t('settings_files_autoclean')}>
            <select style={inputStyle} value={files.autoclean}
              onChange={e => setFiles(p => ({ ...p, autoclean: e.target.value }))}>
              <option value="never">{t('settings_files_never')}</option>
              <option value="7">{t('settings_files_7')}</option>
              <option value="14">{t('settings_files_14')}</option>
              <option value="30">{t('settings_files_30')}</option>
            </select>
          </Field>

          <Toggle label={t('settings_files_autosave')}
            hint={t('settings_files_autosave_hint')}
            checked={!!files.autoSave}
            onChange={v => setFiles(p => ({ ...p, autoSave: v }))} />

          <SectionTitle>{t('settings_files_data_mgmt')}</SectionTitle>

          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <button className="btn btn-secondary" onClick={clearCache}>{t('settings_files_clear_cache')}</button>
            <button className="btn btn-secondary" onClick={exportSettings}>{t('settings_files_export')}</button>
            <label className="btn btn-secondary" style={{ cursor: 'pointer' }}>
              {t('settings_files_import')}
              <input type="file" accept=".json" style={{ display: 'none' }} onChange={importSettings} />
            </label>
          </div>

          <div style={{ marginTop: 16, fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.6 }}>
            <strong>Uwaga:</strong> {t('settings_files_cache_note')}
          </div>
        </div>
      )}
    </div>
  );
}
