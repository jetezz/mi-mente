/**
 * CategoryTree Component
 * Componente de árbol de categorías con drag and drop para reorganizar jerarquías
 * Utiliza @dnd-kit para una experiencia de arrastrar y soltar profesional
 */
import { useState, useMemo, useCallback } from 'react';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
  defaultDropAnimationSideEffects,
} from '@dnd-kit/core';
import type { DragStartEvent, DragEndEvent, DragOverEvent, DropAnimation } from '@dnd-kit/core';
import { snapCenterToCursor } from '@dnd-kit/modifiers';
import { createPortal } from 'react-dom';
import { useDraggable, useDroppable } from '@dnd-kit/core';

export interface Category {
  id: string;
  name: string;
  parent_id: string | null;
  children?: Category[];
}

interface CategoryTreeProps {
  categories: Category[];
  onUpdateParent: (categoryId: string, newParentId: string | null) => Promise<void>;
  onDelete: (id: string) => void;
  onRename: (id: string, newName: string) => Promise<void>;
  loading?: boolean;
}

interface FlatCategory extends Category {
  depth: number;
}

// Componente principal del árbol
export function CategoryTree({ categories, onUpdateParent, onDelete, onRename, loading }: CategoryTreeProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);

  // Sensor con activación inmediata
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 3,
      },
    })
  );

  // Aplanar el árbol para búsquedas
  const flatCategories = useMemo(() => {
    const result: FlatCategory[] = [];
    const flatten = (items: Category[], depth: number) => {
      items.forEach((item) => {
        result.push({ ...item, depth });
        if (item.children?.length) {
          flatten(item.children, depth + 1);
        }
      });
    };
    flatten(categories, 0);
    return result;
  }, [categories]);

  const activeCategory = activeId
    ? flatCategories.find((cat) => cat.id === activeId)
    : null;

  const overCategory = overId && overId !== 'root-zone'
    ? flatCategories.find((cat) => cat.id === overId)
    : null;

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const nextOverId = event.over?.id as string | null;
    // Lógica profesional: mantemos el último 'overId' válido para evitar parpadeos
    // cuando el puntero pasa por pequeñas zonas muertas o cuando el layout cambia.
    if (nextOverId) {
      setOverId(nextOverId);
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    setActiveId(null);
    setOverId(null);

    if (!over || active.id === over.id) return;

    const draggedId = active.id as string;
    const targetId = over.id as string;

    if (targetId === 'root-zone') {
      await onUpdateParent(draggedId, null);
      return;
    }

    // No permitir ciclos
    const isDescendant = (parentId: string, childId: string): boolean => {
      const findInChildren = (items: Category[]): boolean => {
        for (const item of items) {
          if (item.id === childId) return true;
          if (item.children?.length && findInChildren(item.children)) return true;
        }
        return false;
      };
      const parent = flatCategories.find(c => c.id === parentId);
      if (!parent?.children?.length) return false;
      return findInChildren(parent.children);
    };

    if (isDescendant(draggedId, targetId)) {
      return;
    }

    await onUpdateParent(draggedId, targetId);
  };

  const handleDragCancel = () => {
    setActiveId(null);
    setOverId(null);
  };

  if (categories.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-5xl mb-4">📭</div>
        <p className="text-dark-400">No tienes categorías aún</p>
        <p className="text-dark-500 text-sm mt-1">
          Crea tu primera categoría para organizar tu conocimiento
        </p>
      </div>
    );
  }

  const targetDepth = overId === 'root-zone'
    ? 0
    : overCategory
      ? overCategory.depth + 1
      : 0;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div className="flex flex-col">
        {/* Zona para soltar como raíz */}
        <RootDropZone
          isOver={overId === 'root-zone'}
          isDragging={!!activeId}
          activeCategoryName={activeCategory?.name}
        />

        {/* Árbol de categorías */}
        {categories.map((category) => (
          <DraggableCategoryItem
            key={category.id}
            category={category}
            onDelete={onDelete}
            onRename={onRename}
            depth={0}
            activeId={activeId}
            overId={overId}
            activeCategory={activeCategory || null}
          />
        ))}
      </div>

      {/* Ghost optimizado - Centrado bajo el ratón y fuera de los contenedores locales */}
      {typeof document !== 'undefined' && activeId && createPortal(
        <DragOverlay
          modifiers={[snapCenterToCursor]}
          dropAnimation={dropAnimationConfig}
          zIndex={1000}
        >
          {activeCategory ? (
            <div className="flex items-center gap-2 py-1.5 px-3 rounded-lg bg-dark-800/80 backdrop-blur-md border border-primary-500 shadow-xl shadow-primary-500/20 w-fit cursor-grabbing scale-90 pointer-events-none ring-1 ring-primary-500/20">
              <div className="p-1 bg-dark-700/50 rounded text-primary-400">
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M7 2a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 2zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 8zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 14zm6-8a2 2 0 1 0-.001-4.001A2 2 0 0 0 13 6zm0 2a2 2 0 1 0 .001 4.001A2 2 0 0 0 13 8zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 13 14z" />
                </svg>
              </div>
              <span className="text-base">{activeCategory.children?.length ? '📂' : '📄'}</span>
              <span className="text-dark-100 text-sm font-medium">{activeCategory.name}</span>

              {/* Badge de acción compacto */}
              {overId && (
                <div className={`ml-2 flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${overId === 'root-zone'
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : 'bg-primary-500/20 text-primary-400 border border-primary-500/30'
                  }`}>
                  {overId === 'root-zone' ? 'Raíz' : `Hijo`}
                </div>
              )}
            </div>
          ) : null}
        </DragOverlay>,
        document.body
      )}
    </DndContext>
  );
}

// Configuración de animación de soltado suave
const dropAnimationConfig: DropAnimation = {
  sideEffects: defaultDropAnimationSideEffects({
    styles: {
      active: {
        opacity: '0.4',
      },
    },
  }),
};

// Componente Ghost para indicar dónde caerá el elemento
function GhostCategoryItem({ name, depth }: { name: string; depth: number }) {
  return (
    <div
      className="flex items-center gap-2 py-2 pr-3 rounded-lg border-2 border-dashed border-primary-500/30 bg-primary-500/5 mt-1 mb-1 animate-pulse pointer-events-none"
      style={{ marginLeft: `${depth * 20 + 12}px` }}
    >
      <span className="opacity-50 text-base">📍</span>
      <span className="text-dark-400 font-medium">{name}</span>
      <span className="text-xs text-primary-400/70 ml-2 italic">(Soltar aquí)</span>
    </div>
  );
}

// Zona de drop para dejar como raíz
function RootDropZone({ isOver, isDragging, activeCategoryName }: { isOver: boolean; isDragging: boolean; activeCategoryName?: string }) {
  const { setNodeRef } = useDroppable({ id: 'root-zone' });

  return (
    <div ref={setNodeRef}>
      <div
        className={`
          p-3 rounded-lg border-2 border-dashed transition-all duration-150
          ${isDragging ? 'opacity-100' : 'opacity-0 h-0 p-0 overflow-hidden'}
          ${isOver
            ? 'border-green-500 bg-green-500/10'
            : 'border-dark-600 bg-dark-800/30'
          }
        `}
      >
        <div className={`flex items-center justify-center gap-2 text-sm ${isOver ? 'text-green-400' : 'text-dark-500'}`}>
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1M5 19h14a2 2 0 002-2v-5a2 2 0 00-2-2H9a2 2 0 00-2 2v5a2 2 0 01-2 2z" />
          </svg>
          <span>Soltar aquí → categoría raíz</span>
        </div>
      </div>
      {/* Ghost visual para root */}
      {isOver && activeCategoryName && (
        <GhostCategoryItem name={activeCategoryName} depth={0} />
      )}
    </div>
  );
}

// Item arrastrable
interface DraggableCategoryItemProps {
  category: Category;
  onDelete: (id: string) => void;
  onRename: (id: string, newName: string) => Promise<void>;
  depth: number;
  activeId: string | null;
  overId: string | null;
  activeCategory: FlatCategory | null;
}

function DraggableCategoryItem({
  category,
  onDelete,
  onRename,
  depth,
  activeId,
  overId,
  activeCategory,
}: DraggableCategoryItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef: setDragRef,
    transform,
  } = useDraggable({ id: category.id });

  const {
    setNodeRef: setDropRef,
  } = useDroppable({ id: category.id });

  const hasChildren = category.children && category.children.length > 0;
  const isBeingDragged = activeId === category.id;
  const isDropTarget = overId === category.id && !isBeingDragged;

  // No mostrar ghost si el padre es el mismo que el dragged (evitar redundancia visual si ya está ahí)
  // Pero aquí estamos moviendo, así que siempre mostramos ghost si es drop target
  const showGhost = isDropTarget && activeCategory && activeCategory.id !== category.id;

  // Combinar refs
  const setNodeRef = useCallback((node: HTMLElement | null) => {
    setDragRef(node);
    setDropRef(node);
  }, [setDragRef, setDropRef]);

  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(category.name);

  const startEditing = (e: React.MouseEvent) => {
    e.stopPropagation();
    // Don't edit if dragging
    if (isBeingDragged) return;
    setIsEditing(true);
    setEditName(category.name);
  };

  const cancelEditing = () => {
    setIsEditing(false);
    setEditName(category.name);
  };

  const submitEditing = async () => {
    if (editName.trim() !== category.name) {
      await onRename(category.id, editName);
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      submitEditing();
    } else if (e.key === 'Escape') {
      cancelEditing();
    }
  };

  return (
    <div>
      <div
        ref={setNodeRef}
        style={{
          paddingLeft: `${depth * 20 + 12}px`,
        }}
        className={`
          group flex items-center gap-2 py-2 pr-3 rounded-lg transition-all duration-100
          ${isBeingDragged ? 'opacity-30' : ''}
          ${isDropTarget
            ? 'bg-primary-500/20 ring-2 ring-primary-500 ring-inset'
            : 'hover:bg-dark-700/50'
          }
        `}
      >
        {/* Handle de arrastre */}
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing p-1.5 rounded text-dark-500 hover:text-dark-300 hover:bg-dark-600/50 transition-colors touch-none flex-shrink-0"
          title="Arrastra para mover"
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path d="M7 2a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 2zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 8zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 14zm6-8a2 2 0 1 0-.001-4.001A2 2 0 0 0 13 6zm0 2a2 2 0 1 0 .001 4.001A2 2 0 0 0 13 8zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 13 14z" />
          </svg>
        </button>

        {/* Icono */}
        <span className="text-base flex-shrink-0 select-none">
          {hasChildren ? '📂' : '📄'}
        </span>

        {/* Nombre / Input */}
        <div className="flex-1 min-w-0">
          {isEditing ? (
            <div className="flex items-center gap-1">
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                onKeyDown={handleKeyDown}
                onBlur={submitEditing}
                autoFocus
                onClick={(e) => e.stopPropagation()}
                className="w-full bg-dark-800 border-b border-primary-500 text-dark-100 px-1 py-0 outline-none"
              />
              <button
                onClick={(e) => { e.stopPropagation(); submitEditing(); }}
                className="text-green-400 hover:text-green-300 p-1"
                title="Guardar"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </button>
            </div>
          ) : (
            <span
              onClick={startEditing}
              className={`font-medium truncate block cursor-pointer hover:text-primary-400 transition-colors border border-transparent hover:border-dark-600/50 rounded px-1 -mx-1 ${isBeingDragged ? 'text-dark-500' : 'text-dark-100'}`}
              title="Click para editar nombre"
            >
              {category.name}
            </span>
          )}
        </div>

        {/* Badge de subcategorías */}
        {hasChildren && (
          <span className="text-xs text-dark-500 bg-dark-600/70 px-1.5 py-0.5 rounded">
            {category.children?.length}
          </span>
        )}

        {/* Indicador de drop */}
        {isDropTarget && (
          <span className="text-xs text-primary-400 font-medium">
            ← hijo
          </span>
        )}

        {/* Botón eliminar */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete(category.id);
          }}
          className="p-1 rounded text-dark-600 hover:text-red-400 hover:bg-red-500/10 transition-colors opacity-0 group-hover:opacity-100"
          title="Eliminar"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>

      {/* Hijos recursivos */}
      <div className="flex flex-col">
        {hasChildren && category.children?.map((child) => (
          <DraggableCategoryItem
            key={child.id}
            category={child}
            onDelete={onDelete}
            onRename={onRename}
            depth={depth + 1}
            activeId={activeId}
            overId={overId}
            activeCategory={activeCategory}
          />
        ))}

        {/* Ghost para hijos (cuando soltamos sobre esta categoría) */}
        {showGhost && activeCategory && (
          <GhostCategoryItem name={activeCategory.name} depth={depth + 1} />
        )}
      </div>
    </div>
  );
}
