import { useState, useEffect } from "react";
import {
  supabase,
  getUserCategories,
  createCategory,
  deleteCategory,
  updateCategory,
  getCategoryTree,
} from "../lib/supabase";
import { CategoryTree } from "./CategoryTree";
import { Button } from "./ui/Button";
import { Spinner } from "./ui/Spinner";
import { EmptyState } from "./ui/EmptyState";
import type { User } from "@supabase/supabase-js";

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
  const [newCategoryName, setNewCategoryName] = useState("");
  const [selectedParent, setSelectedParent] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    checkAuthAndLoad();
  }, []);

  // Limpiar mensaje de éxito después de 3 segundos
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  const checkAuthAndLoad = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) {
      window.location.href = "/login";
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
      console.error("Error loading categories:", err);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;

    setCreating(true);
    setError(null);

    try {
      await createCategory(newCategoryName.trim(), selectedParent || undefined);
      setNewCategoryName("");
      setSelectedParent(null);
      setSuccessMessage("Categoría creada correctamente");
      await loadCategories();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al crear categoría");
    } finally {
      setCreating(false);
    }
  };

  const handleUpdateParent = async (categoryId: string, newParentId: string | null) => {
    setUpdating(true);
    setError(null);

    try {
      await updateCategory(categoryId, { parent_id: newParentId });

      // Encontrar el nombre de la categoría movida
      const movedCategory = categories.find(c => c.id === categoryId);
      const parentCategory = newParentId ? categories.find(c => c.id === newParentId) : null;

      if (newParentId && parentCategory) {
        setSuccessMessage(`"${movedCategory?.name}" ahora es hijo de "${parentCategory.name}"`);
      } else {
        setSuccessMessage(`"${movedCategory?.name}" ahora es categoría raíz`);
      }

      await loadCategories();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al mover categoría");
    } finally {
      setUpdating(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Estás seguro de eliminar esta categoría? Las subcategorías quedarán huérfanas.")) {
      return;
    }

    try {
      await deleteCategory(id);
      setSuccessMessage("Categoría eliminada correctamente");
      await loadCategories();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al eliminar categoría");
    }
  };

  const handleRename = async (id: string, newName: string) => {
    if (!newName.trim()) return;

    try {
      await updateCategory(id, { name: newName.trim() });
      setSuccessMessage("Categoría renombrada correctamente");
      await loadCategories();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al renombrar categoría");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!user) {
    return (
      <EmptyState
        icon="🔒"
        title="Inicia sesión para continuar"
        description="Debes iniciar sesión para ver tus categorías"
        action={{
          label: "Iniciar Sesión",
          onClick: () => (window.location.href = "/login"),
        }}
      />
    );
  }

  return (
    <div className="space-y-8">
      {/* Mensajes de feedback */}
      {error && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm flex items-center gap-2">
          <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          {error}
        </div>
      )}

      {successMessage && (
        <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/30 text-green-400 text-sm flex items-center gap-2 animate-pulse">
          <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          {successMessage}
        </div>
      )}

      {/* Crear nueva categoría */}
      <div className="card p-6">
        <h2 className="text-lg font-semibold text-dark-100 mb-4 flex items-center gap-2">
          <span>➕</span> Crear Nueva Categoría
        </h2>

        <form onSubmit={handleCreate} className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            value={newCategoryName}
            onChange={e => setNewCategoryName(e.target.value)}
            placeholder="Nombre de la categoría..."
            className="flex-1 px-4 py-2 rounded-xl bg-dark-700 border border-dark-600 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none text-dark-100 placeholder-dark-500 transition-colors"
            required
          />

          <select
            value={selectedParent || ""}
            onChange={e => setSelectedParent(e.target.value || null)}
            className="px-4 py-2 rounded-xl bg-dark-700 border border-dark-600 focus:border-primary-500 outline-none text-dark-100"
          >
            <option value="">Sin padre (raíz)</option>
            {categories.map(cat => (
              <option key={cat.id} value={cat.id}>
                📁 {cat.name}
              </option>
            ))}
          </select>

          <Button type="submit" disabled={creating || !newCategoryName.trim()}>
            {creating ? "Creando..." : "Crear"}
          </Button>
        </form>
      </div>

      {/* Lista de categorías con Drag and Drop */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-dark-100 flex items-center gap-2">
            <span>📂</span> Tus Categorías ({categories.length})
          </h2>
          {updating && (
            <div className="flex items-center gap-2 text-primary-400 text-sm">
              <Spinner size="sm" />
              Actualizando...
            </div>
          )}
        </div>

        {/* Instrucciones de drag and drop */}
        {categoryTree.length > 0 && (
          <div className="mb-4 p-3 rounded-lg bg-dark-800/50 border border-dark-700 text-dark-400 text-sm flex items-center gap-2">
            <svg
              className="w-5 h-5 text-primary-400 flex-shrink-0"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span>
              <strong className="text-dark-300">Arrastra</strong> una categoría sobre otra para convertirla en
              subcategoría, o <strong className="text-dark-300">suéltala en la zona superior</strong> para convertirla
              en categoría raíz.
            </span>
          </div>
        )}

        <CategoryTree
          categories={categoryTree}
          onUpdateParent={handleUpdateParent}
          onDelete={handleDelete}
          onRename={handleRename}
          loading={updating}
        />
      </div>

      {/* Info */}
      <div className="card p-6 bg-dark-800/30">
        <h3 className="text-sm font-medium text-dark-400 uppercase tracking-wider mb-3">
          💡 Cómo funcionan las categorías
        </h3>
        <ul className="space-y-2 text-sm text-dark-400">
          <li className="flex items-start gap-2">
            <span className="text-primary-400">•</span>
            <span>Las categorías te ayudan a organizar tus notas en Notion</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary-400">•</span>
            <span>Puedes crear jerarquías (ej: Tecnología → Programación → React)</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary-400">•</span>
            <span>
              <strong className="text-dark-300">Arrastra y suelta</strong> para reorganizar la jerarquía fácilmente
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary-400">•</span>
            <span>Al usar el Chat, puedes filtrar por categoría para respuestas más relevantes</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary-400">•</span>
            <span>Las subcategorías se incluyen automáticamente en las búsquedas</span>
          </li>
        </ul>
      </div>
    </div>
  );
}
