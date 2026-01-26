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
  const [mode, setMode] = useState<'json' | 'text'>(typeof setting.value === 'string' ? 'text' : 'json');
  const [localValue, setLocalValue] = useState('');
  const [isDirty, setIsDirty] = useState(false);

  // Initialize from prop
  useEffect(() => {
    const initialMode = typeof setting.value === 'string' ? 'text' : 'json';
    setMode(initialMode);
    setLocalValue(initialMode === 'json' ? JSON.stringify(setting.value, null, 2) : String(setting.value ?? ''));
    setIsDirty(false);
  }, [setting.value]);

  const handleSave = () => {
    if (mode === 'text') {
      onSave(localValue);
      setIsDirty(false);
    } else {
      try {
        const parsed = JSON.parse(localValue);
        onSave(parsed);
        setIsDirty(false);
      } catch (e) {
        alert("Formato JSON inválido. Asegúrate de usar comillas dobles para strings y sintaxis correcta.");
      }
    }
  };

  return (
    <div className="border-b border-gray-700 pb-6 last:border-0 last:pb-0">
      <div className="flex justify-between items-start mb-3">
        <div>
          <div className="font-mono text-base font-medium text-green-400 flex items-center gap-2">
            {setting.key}
            <span className={`text-[10px] uppercase px-1.5 py-0.5 rounded border ${mode === 'text'
              ? 'border-blue-500/50 text-blue-400 bg-blue-500/10'
              : 'border-amber-500/50 text-amber-400 bg-amber-500/10'
              }`}>
              {mode === 'text' ? 'Texto' : 'JSON'}
            </span>
          </div>
          <div className="text-sm text-gray-400 mt-1">{setting.description}</div>
        </div>

        <div className="flex items-center gap-4">
          {isSaving && <span className="text-yellow-400 text-xs animate-pulse">Guardando...</span>}
          <div className="flex bg-gray-900 rounded-lg p-1 border border-gray-700">
            <button
              onClick={() => setMode('text')}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${mode === 'text' ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-sm' : 'text-gray-400 hover:text-gray-200'
                }`}
            >
              Texto
            </button>
            <button
              onClick={() => setMode('json')}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${mode === 'json' ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-sm' : 'text-gray-400 hover:text-gray-200'
                }`}
            >
              JSON
            </button>
          </div>
        </div>
      </div>

      <div className="gap-2 flex flex-col">
        <div className="relative group">
          <textarea
            className={`w-full bg-gray-900/50 border rounded-lg p-4 text-sm font-mono text-gray-200 outline-none transition-all duration-200 ${mode === 'json' ? 'border-amber-500/20 focus:border-amber-500/50' : 'border-blue-500/20 focus:border-blue-500/50'
              }`}
            value={localValue}
            onChange={e => { setLocalValue(e.target.value); setIsDirty(true); }}
            rows={Math.min(20, Math.max(3, localValue.split('\n').length))}
            spellCheck={false}
            placeholder={mode === 'json' ? '{\n  "key": "value"\n}' : 'Escribe tu texto aquí...'}
          />
          <div className="absolute right-2 bottom-2 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
            <span className="text-[10px] text-gray-500 bg-gray-900 px-2 py-1 rounded border border-gray-800">
              {localValue.length} caracteres
            </span>
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button
            onClick={handleSave}
            disabled={!isDirty || isSaving}
            className={`px-6 py-2 rounded-lg text-sm font-semibold shadow-lg transition-all transform active:scale-95 ${isDirty
              ? 'bg-purple-600 text-white hover:bg-purple-500 hover:shadow-purple-500/25'
              : 'bg-gray-800 text-gray-500 cursor-not-allowed border border-gray-700'
              }`}
          >
            {isDirty ? 'Guardar Cambios' : 'Sin cambios'}
          </button>
        </div>
      </div>
    </div>
  );
}
