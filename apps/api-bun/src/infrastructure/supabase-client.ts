/**
 * Supabase Client Service
 * Maneja categorías jerárquicas para el sistema RAG
 */
import { createClient, SupabaseClient } from '@supabase/supabase-js';

export interface Category {
  id: string;
  name: string;
  parent_id: string | null;
  notion_sync_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface CategoryTree extends Category {
  children: CategoryTree[];
}

export class SupabaseService {
  private client: SupabaseClient | null = null;
  private adminClient: SupabaseClient | null = null; // Cliente con service_role para bypass RLS
  private isConfigured: boolean = false;

  constructor() {
    this.initialize();
  }

  private initialize() {
    const url = process.env.SUPABASE_URL;
    const anonKey = process.env.SUPABASE_ANON_KEY;
    const serviceKey = process.env.SUPABASE_SERVICE_KEY;

    if (url && anonKey) {
      this.client = createClient(url, anonKey);
      this.isConfigured = true;
      console.log('🗄️ Supabase Client inicializado (anon)');
    } else {
      console.warn('⚠️ Supabase no configurado. Añade SUPABASE_URL y SUPABASE_ANON_KEY al .env');
    }

    // Cliente admin para operaciones del backend (bypass RLS)
    if (url && serviceKey) {
      this.adminClient = createClient(url, serviceKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      });
      console.log('🔐 Supabase Admin Client inicializado (service_role)');
    } else {
      console.warn('⚠️ Supabase Admin no configurado. Añade SUPABASE_SERVICE_KEY para indexación.');
    }
  }

  /**
   * Verifica si Supabase está configurado
   */
  isReady(): boolean {
    return this.isConfigured && this.client !== null;
  }

  /**
   * Verifica si el cliente admin está configurado (para bypass RLS)
   */
  isAdminReady(): boolean {
    return this.adminClient !== null;
  }

  /**
   * Obtiene el cliente normal (con RLS)
   */
  getClient(): SupabaseClient | null {
    return this.client;
  }

  /**
   * Obtiene el cliente admin (bypass RLS) - usar para operaciones del backend
   */
  getAdminClient(): SupabaseClient | null {
    return this.adminClient;
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<{ status: string; error?: string }> {
    if (!this.client) {
      return { status: 'not_configured' };
    }

    try {
      const { error } = await this.client.from('categories').select('id').limit(1);
      if (error) throw error;
      return { status: 'connected' };
    } catch (error) {
      return { status: 'error', error: String(error) };
    }
  }

  // ================== CATEGORÍAS ==================

  /**
   * Obtiene todas las categorías
   */
  async getAllCategories(): Promise<Category[]> {
    if (!this.client) return [];

    const { data, error } = await this.client
      .from('categories')
      .select('*')
      .order('name');

    if (error) {
      console.error('Error obteniendo categorías:', error);
      return [];
    }

    return data || [];
  }

  /**
   * Obtiene una categoría por ID
   */
  async getCategoryById(id: string): Promise<Category | null> {
    if (!this.client) return null;

    const { data, error } = await this.client
      .from('categories')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error obteniendo categoría:', error);
      return null;
    }

    return data;
  }

  /**
   * Crea una nueva categoría
   */
  async createCategory(name: string, parentId?: string): Promise<Category | null> {
    if (!this.client) return null;

    const { data, error } = await this.client
      .from('categories')
      .insert({
        name,
        parent_id: parentId || null,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creando categoría:', error);
      return null;
    }

    return data;
  }

  /**
   * Actualiza una categoría
   */
  async updateCategory(id: string, updates: { name?: string; parent_id?: string | null }): Promise<Category | null> {
    if (!this.client) return null;

    const { data, error } = await this.client
      .from('categories')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error actualizando categoría:', error);
      return null;
    }

    return data;
  }

  /**
   * Elimina una categoría
   */
  async deleteCategory(id: string): Promise<boolean> {
    if (!this.client) return false;

    const { error } = await this.client
      .from('categories')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error eliminando categoría:', error);
      return false;
    }

    return true;
  }

  /**
   * Obtiene las categorías hijas de una categoría (recursivamente)
   * Esto es crucial para el RAG: al seleccionar "Programación", 
   * también incluimos "JavaScript", "Python", etc.
   */
  async getCategoryWithDescendants(categoryId: string): Promise<string[]> {
    if (!this.client) return [categoryId];

    const allCategories = await this.getAllCategories();
    const result: string[] = [categoryId];

    // Función recursiva para encontrar hijos
    const findChildren = (parentId: string) => {
      const children = allCategories.filter(c => c.parent_id === parentId);
      for (const child of children) {
        result.push(child.id);
        findChildren(child.id); // Recursión
      }
    };

    findChildren(categoryId);
    return result;
  }

  /**
   * Construye el árbol de categorías para visualización
   */
  async getCategoryTree(): Promise<CategoryTree[]> {
    const allCategories = await this.getAllCategories();

    // Crear mapa para acceso rápido
    const categoryMap = new Map<string, CategoryTree>();
    allCategories.forEach(cat => {
      categoryMap.set(cat.id, { ...cat, children: [] });
    });

    // Construir árbol
    const roots: CategoryTree[] = [];

    categoryMap.forEach(category => {
      if (category.parent_id && categoryMap.has(category.parent_id)) {
        categoryMap.get(category.parent_id)!.children.push(category);
      } else if (!category.parent_id) {
        roots.push(category);
      }
    });

    return roots;
  }

  /**
   * Obtiene las categorías raíz (sin padre)
   */
  async getRootCategories(): Promise<Category[]> {
    if (!this.client) return [];

    const { data, error } = await this.client
      .from('categories')
      .select('*')
      .is('parent_id', null)
      .order('name');

    if (error) {
      console.error('Error obteniendo categorías raíz:', error);
      return [];
    }

    return data || [];
  }

  /**
   * Vincula una categoría con un ID de Notion (para sync)
   */
  async linkCategoryToNotion(categoryId: string, notionSyncId: string): Promise<boolean> {
    if (!this.client) return false;

    const { error } = await this.client
      .from('categories')
      .update({
        notion_sync_id: notionSyncId,
        updated_at: new Date().toISOString()
      })
      .eq('id', categoryId);

    if (error) {
      console.error('Error vinculando categoría a Notion:', error);
      return false;
    }

    return true;
  }
}

// Singleton
export const supabaseService = new SupabaseService();
