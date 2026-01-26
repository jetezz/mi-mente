import { useState, useEffect } from 'react';
import type { AppSetting } from '../types';

import { API_URL } from '../lib/config';


export default function SettingsEditor() {
  const [settings, setSettings] = useState<AppSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/settings`);
      const data = await res.json();
      if (data.success) {
        setSettings(data.settings);
      }
    } catch (e) {
      console.error('Error fetching settings', e);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (key: string, newValue: any) => {
    setSaving(key);
    try {
      const res = await fetch(`${API_URL}/settings/${key}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ value: newValue })
      });
      const data = await res.json();
      if (data.success) {
        setSettings((prev: AppSetting[]) => prev.map((s: AppSetting) => s.key === key ? { ...s, value: newValue } : s));
      }
    } catch (e) {
      console.error(`Error updating ${key}`, e);
    } finally {
      setSaving(null);
    }
  };

  const groupedSettings = settings.reduce((acc: Record<string, AppSetting[]>, output: AppSetting) => {
    const cat = output.category || 'general';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(output);
    return acc;
  }, {} as Record<string, AppSetting[]>);

  if (loading) return <div className="p-8 text-white">Cargando configuraciones...</div>;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-6">
      <div className="max-w-4xl mx-auto space-y-8">
        <h1 className="text-3xl font-bold text-white flex items-center gap-2">
          ⚙️ Configuraciones del Sistema
        </h1>

        {Object.entries(groupedSettings).map(([category, items]) => (
          <div key={category} className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700 p-6">
            <h2 className="text-xl font-semibold text-purple-400 mb-4 capitalize">{category}</h2>
            <div className="space-y-6">
              {(items as AppSetting[]).sort((a: AppSetting, b: AppSetting) => a.key.localeCompare(b.key)).map((setting: AppSetting) => (
                <SettingItem
                  key={setting.key}
                  setting={setting}
                  onSave={(val: any) => handleUpdate(setting.key, val)}
                  isSaving={saving === setting.key}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SettingItem({ setting, onSave, isSaving }: { setting: AppSetting; onSave: (val: any) => void; isSaving: boolean }) {
  const [localValue, setLocalValue] = useState(JSON.stringify(setting.value, null, 2));
  const [isDirty, setIsDirty] = useState(false);

  // Actualizar si cambia desde fuera
  useEffect(() => {
    setLocalValue(JSON.stringify(setting.value, null, 2));
    setIsDirty(false);
  }, [setting.value]);

  const handleSave = () => {
    try {
      const parsed = JSON.parse(localValue);
      onSave(parsed);
      setIsDirty(false);
    } catch (e) {
      alert("Formato JSON inválido. Asegúrate de usar comillas dobles para strings.");
    }
  };

  return (
    <div className="border-b border-gray-700 pb-4 last:border-0">
      <div className="flex justify-between items-start mb-2">
        <div>
          <div className="font-mono text-sm text-green-400">{setting.key}</div>
          <div className="text-xs text-gray-400 mt-1">{setting.description}</div>
        </div>
        {isSaving && <span className="text-yellow-400 text-xs animate-pulse">Guardando...</span>}
      </div>

      <div className="flex gap-2 flex-col sm:flex-row">
        <textarea
          className="w-full bg-gray-900 border border-gray-600 rounded p-2 text-sm font-mono text-gray-200 focus:border-purple-500 outline-none"
          value={localValue}
          onChange={e => { setLocalValue(e.target.value); setIsDirty(true); }}
          rows={Math.min(10, Math.max(1, localValue.split('\n').length))}
          spellCheck={false}
        />
        <button
          onClick={handleSave}
          disabled={!isDirty || isSaving}
          className={`px-4 py-2 rounded text-sm font-medium self-start whitespace-nowrap transition-colors ${isDirty
            ? 'bg-purple-600 text-white hover:bg-purple-500'
            : 'bg-gray-700 text-gray-500 cursor-not-allowed'
            }`}
        >
          Guardar
        </button>
      </div>
    </div>
  );
}
