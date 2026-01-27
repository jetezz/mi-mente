import { useState, useEffect } from "react";
import type { AppSetting } from "../types";
import { API_URL } from "../lib/config";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/Card";
import { Button } from "./ui/Button";
import { Textarea } from "./ui/Textarea";
import { Badge } from "./ui/Badge";
import { Skeleton } from "./ui/Skeleton";
import { cn } from "@/lib/utils";

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
      console.error("Error fetching settings", e);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (key: string, newValue: any) => {
    setSaving(key);
    try {
      const res = await fetch(`${API_URL}/settings/${key}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ value: newValue }),
      });
      const data = await res.json();
      if (data.success) {
        setSettings((prev: AppSetting[]) =>
          prev.map((s: AppSetting) => (s.key === key ? { ...s, value: newValue } : s)),
        );
      }
    } catch (e) {
      console.error(`Error updating ${key}`, e);
    } finally {
      setSaving(null);
    }
  };

  const groupedSettings = settings.reduce(
    (acc: Record<string, AppSetting[]>, output: AppSetting) => {
      const cat = output.category || "general";
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(output);
      return acc;
    },
    {} as Record<string, AppSetting[]>,
  );

  if (loading) {
    return (
      <div className="space-y-8">
        <Skeleton className="h-10 w-64" />
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {Object.entries(groupedSettings).map(([category, items], index) => (
        <Card
          key={category}
          variant="default"
          className="animate-fade-in"
          style={{ animationDelay: `${index * 100}ms` }}
        >
          <CardHeader>
            <CardTitle className="flex items-center gap-2 capitalize">
              <CategoryIcon category={category} />
              {category}
              <Badge variant="secondary" size="sm">
                {items.length}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {(items as AppSetting[])
              .sort((a: AppSetting, b: AppSetting) => a.key.localeCompare(b.key))
              .map((setting: AppSetting) => (
                <SettingItem
                  key={setting.key}
                  setting={setting}
                  onSave={(val: any) => handleUpdate(setting.key, val)}
                  isSaving={saving === setting.key}
                />
              ))}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function CategoryIcon({ category }: { category: string }) {
  const icons: Record<string, string> = {
    general: "⚙️",
    search: "🔍",
    ai: "🤖",
    notion: "📝",
    indexing: "📊",
  };
  return <span className="text-xl">{icons[category] || "📋"}</span>;
}

function SettingItem({
  setting,
  onSave,
  isSaving,
}: {
  setting: AppSetting;
  onSave: (val: any) => void;
  isSaving: boolean;
}) {
  const [localValue, setLocalValue] = useState(JSON.stringify(setting.value, null, 2));
  const [isDirty, setIsDirty] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLocalValue(JSON.stringify(setting.value, null, 2));
    setIsDirty(false);
    setError(null);
  }, [setting.value]);

  const handleSave = () => {
    try {
      const parsed = JSON.parse(localValue);
      onSave(parsed);
      setIsDirty(false);
      setError(null);
    } catch (e) {
      setError("Formato JSON inválido");
    }
  };

  const handleChange = (value: string) => {
    setLocalValue(value);
    setIsDirty(true);
    setError(null);
  };

  return (
    <div className={cn("border-b border-dark-700/50 pb-4 last:border-0 last:pb-0", "transition-colors duration-200")}>
      <div className="flex justify-between items-start mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <code className="font-mono text-sm text-primary-400 bg-primary-500/10 px-2 py-0.5 rounded">
              {setting.key}
            </code>
            {isSaving && (
              <Badge variant="warning" size="sm" className="animate-pulse">
                Guardando...
              </Badge>
            )}
            {isDirty && !isSaving && (
              <Badge variant="secondary" size="sm">
                Sin guardar
              </Badge>
            )}
          </div>
          <p className="text-sm text-dark-400 mt-1">{setting.description}</p>
        </div>
      </div>

      <div className="flex gap-3 flex-col sm:flex-row">
        <Textarea
          className={cn("font-mono text-sm flex-1 min-h-[80px]", error && "border-red-500/50 focus:border-red-500")}
          value={localValue}
          onChange={e => handleChange(e.target.value)}
          rows={Math.min(8, Math.max(2, localValue.split("\n").length))}
          spellCheck={false}
        />
        <Button
          onClick={handleSave}
          disabled={!isDirty || isSaving}
          variant={isDirty ? "default" : "secondary"}
          className="self-start whitespace-nowrap"
        >
          {isSaving ? (
            <>
              <svg className="w-4 h-4 animate-spin mr-2" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Guardando
            </>
          ) : (
            "Guardar"
          )}
        </Button>
      </div>

      {error && (
        <p className="text-red-400 text-sm mt-2 flex items-center gap-1">
          <span>⚠️</span> {error}
        </p>
      )}
    </div>
  );
}
