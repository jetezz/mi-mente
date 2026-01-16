import { useState, useEffect } from 'react';
import { supabase, getUserCategories, createCategory, deleteCategory, getCategoryTree } from '../lib/supabase';
import type { User } from '@supabase/supabase-js';

interface Category {
  id: string;
  name: string;
  parent_id: string | null;
  children?: Category[];
}

export function CategoryManager() {
  const [user, setUser] = useState<User | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryTree, setCategoryTree] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [selectedParent, setSelectedParent] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    checkAuthAndLoad();
  }, []);

  const checkAuthAndLoad = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      window.location.href = '/login';
      return;
    }
    setUser(session.user);
    await loadCategories();
    setLoading(false);
  };

  const loadCategories = async () => {
    try {
      const cats = await getUserCategories();
      setCategories(cats);
      const tree = await getCategoryTree();
      setCategoryTree(tree);
    } catch (err) {
      console.error('Error loading categories:', err);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;

    setCreating(true);
    setError(null);

    try {
      await createCategory(newCategoryName.trim(), selectedParent || undefined);
      setNewCategoryName('');
      setSelectedParent(null);
      await loadCategories();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al crear categoría');
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar esta categoría? Las subcategorías quedarán huérfanas.')) {
      return;
    }

    try {
      await deleteCategory(id);
      await loadCategories();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al eliminar categoría');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="text-center py-12">
        <p className="text-dark-400">Debes iniciar sesión para ver tus categorías</p>
        <a href="/login" className="btn-primary mt-4 inline-block">
          Iniciar Sesión
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Crear nueva categoría */}
      <div className="card p-6">
        <h2 className="text-lg font-semibold text-dark-100 mb-4 flex items-center gap-2">
          <span>➕</span> Crear Nueva Categoría
        </h2>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleCreate} className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            value={newCategoryName}
            onChange={(e) => setNewCategoryName(e.target.value)}
            placeholder="Nombre de la categoría..."
            className="flex-1 px-4 py-2 rounded-xl bg-dark-700 border border-dark-600 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none text-dark-100 placeholder-dark-500 transition-colors"
            required
          />

          <select
            value={selectedParent || ''}
            onChange={(e) => setSelectedParent(e.target.value || null)}
            className="px-4 py-2 rounded-xl bg-dark-700 border border-dark-600 focus:border-primary-500 outline-none text-dark-100"
          >
            <option value="">Sin padre (raíz)</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                📁 {cat.name}
              </option>
            ))}
          </select>

          <button
            type="submit"
            disabled={creating || !newCategoryName.trim()}
            className="btn-primary px-6 disabled:opacity-50"
          >
            {creating ? 'Creando...' : 'Crear'}
          </button>
        </form>
      </div>

      {/* Lista de categorías */}
      <div className="card p-6">
        <h2 className="text-lg font-semibold text-dark-100 mb-4 flex items-center gap-2">
          <span>📂</span> Tus Categorías ({categories.length})
        </h2>

        {categoryTree.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-5xl mb-4">📭</div>
            <p className="text-dark-400">No tienes categorías aún</p>
            <p className="text-dark-500 text-sm mt-1">
              Crea tu primera categoría para organizar tu conocimiento
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {categoryTree.map((category) => (
              <CategoryItem
                key={category.id}
                category={category}
                onDelete={handleDelete}
                level={0}
              />
            ))}
          </div>
        )}
      </div>

      {/* Info */}
      <div className="card p-6 bg-dark-800/30">
        <h3 className="text-sm font-medium text-dark-400 uppercase tracking-wider mb-3">
          💡 Cómo funcionan las categorías
        </h3>
        <ul className="space-y-2 text-sm text-dark-400">
          <li>• Las categorías te ayudan a organizar tus notas en Notion</li>
          <li>• Puedes crear jerarquías (ej: Tecnología → Programación → React)</li>
          <li>• Al usar el Chat, puedes filtrar por categoría para respuestas más relevantes</li>
          <li>• Las subcategorías se incluyen automáticamente en las búsquedas</li>
        </ul>
      </div>
    </div>
  );
}

// Componente recursivo para mostrar el árbol
function CategoryItem({
  category,
  onDelete,
  level
}: {
  category: Category;
  onDelete: (id: string) => void;
  level: number;
}) {
  const hasChildren = category.children && category.children.length > 0;

  return (
    <div>
      <div
        className="flex items-center justify-between p-3 rounded-xl bg-dark-700/50 hover:bg-dark-700 transition-colors"
        style={{ marginLeft: `${level * 24}px` }}
      >
        <div className="flex items-center gap-3">
          <span className="text-lg">{hasChildren ? '📂' : '📄'}</span>
          <span className="text-dark-100 font-medium">{category.name}</span>
          {hasChildren && (
            <span className="text-xs text-dark-500 bg-dark-600 px-2 py-0.5 rounded-full">
              {category.children?.length} sub
            </span>
          )}
        </div>
        <button
          onClick={() => onDelete(category.id)}
          className="p-2 rounded-lg text-dark-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
          title="Eliminar categoría"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>

      {/* Hijos recursivos */}
      {hasChildren && category.children?.map((child) => (
        <CategoryItem
          key={child.id}
          category={child}
          onDelete={onDelete}
          level={level + 1}
        />
      ))}
    </div>
  );
}
