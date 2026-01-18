import { supabaseService } from '../infrastructure/supabase-client';

export interface AppSetting {
  key: string;
  value: any;
  description?: string;
  category?: string;
  updated_at?: string;
}

export class SettingsService {
  private cache: Map<string, any> = new Map();
  private lastFetch: number = 0;
  private readonly CACHE_TTL = 30000; // 30 segundos cache

  constructor() { }

  /**
   * Obtiene todas las configuraciones
   */
  async getAllSettings(forceRefresh = false): Promise<Record<string, any>> {
    if (!forceRefresh && Date.now() - this.lastFetch < this.CACHE_TTL && this.cache.size > 0) {
      return Object.fromEntries(this.cache);
    }

    const client = supabaseService.getClient();
    if (!client) {
      console.warn('⚠️ Supabase no configurado, usando cache o vacío');
      return Object.fromEntries(this.cache);
    }

    // Usar 'auth.role() = authenticated' policy, so we assume we are in a context where we can read.
    // However, backend usually runs as admin or needs to impersonate.
    // The table policy I created grants SELECT to 'authenticated'.
    // The api-bun might need to use adminClient if it's acting on behalf of system.
    // But settings are global "app settings".
    // I made the table policies for 'authenticated'.
    // Let's use getAdminClient() to be safe for backend operations, 
    // or getClient() depending on auth context.
    // For System settings, admin client is safer to bypass RLS if the bucket logic is complex,
    // but here I defined RLS for authenticated.
    // Since api-bun server doesn't always have a user context (unless passed), 
    // using adminClient is better for system-wide configs.

    const admin = supabaseService.getAdminClient();
    if (!admin) return Object.fromEntries(this.cache);

    const { data, error } = await admin
      .from('app_settings')
      .select('*');

    if (error) {
      console.error('❌ Error fetching settings:', error);
      return Object.fromEntries(this.cache);
    }

    this.cache.clear();
    const settingsObject: Record<string, any> = {};

    data.forEach((item: any) => {
      this.cache.set(item.key, item.value);
      settingsObject[item.key] = item.value;
    });

    this.lastFetch = Date.now();
    return settingsObject;
  }

  /**
   * Obtiene una configuración específica por clave.
   * Si no existe en DB, retorna el defaultValue.
   */
  async get<T>(key: string, defaultValue?: T): Promise<T> {
    // Asegurar cache
    if (this.cache.size === 0 || Date.now() - this.lastFetch > this.CACHE_TTL) {
      await this.getAllSettings();
    }

    if (this.cache.has(key)) {
      return this.cache.get(key) as T;
    }

    return defaultValue as T;
  }

  /**
   * Actualiza una configuración
   */
  async update(key: string, value: any): Promise<boolean> {
    const admin = supabaseService.getAdminClient();
    if (!admin) return false;

    const { error } = await admin
      .from('app_settings')
      .update({
        value,
        updated_at: new Date().toISOString()
      })
      .eq('key', key);

    if (error) {
      console.error(`❌ Error updating setting ${key}:`, error);
      return false;
    }

    // Actualizar cache
    this.cache.set(key, value);
    return true;
  }

  /**
   * Obtiene la estructura completa para el editor de settings
   */
  async getSettingsList(): Promise<AppSetting[]> {
    const admin = supabaseService.getAdminClient();
    if (!admin) return [];

    const { data, error } = await admin
      .from('app_settings')
      .select('*')
      .order('category', { ascending: true })
      .order('key', { ascending: true });

    if (error) return [];
    return data as AppSetting[];
  }
}

export const settingsService = new SettingsService();
