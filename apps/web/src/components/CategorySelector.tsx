import { useState, useRef, useEffect } from 'react';

interface Category {
  id: string;
  name: string;
  parent_id: string | null;
}

interface CategorySelectorProps {
  categories: Category[];
  selected: Category[] | Category | null;
  onSelect: (categories: Category[]) => void;
  multiple?: boolean;
}

export function CategorySelector({ categories, selected, onSelect, multiple = false }: CategorySelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Normalizar selected a array siempre
  const selectedArray = Array.isArray(selected) ? selected : (selected ? [selected] : []);

  // Cerrar al hacer click fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Organizar categorías en árbol
  const rootCategories = categories.filter(c => !c.parent_id);
  const getChildren = (parentId: string) => categories.filter(c => c.parent_id === parentId);

  const toggleCategory = (category: Category) => {
    if (multiple) {
      const isSelected = selectedArray.some(s => s.id === category.id);
      if (isSelected) {
        onSelect(selectedArray.filter(s => s.id !== category.id));
      } else {
        onSelect([...selectedArray, category]);
      }
    } else {
      // Si no es múltiple, devolvemos solo el objeto o null (compatibilidad con callers antiguos)
      const isSelected = selectedArray.some(s => s.id === category.id);
      if (isSelected) {
        onSelect(multiple ? [] : null as any);
      } else {
        onSelect(multiple ? [category] : category as any);
      }
      setIsOpen(false);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-dark-700 border border-dark-600 hover:border-dark-500 transition-colors w-full"
      >
        <svg className="w-4 h-4 text-dark-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
        </svg>
        <span className={selectedArray.length > 0 ? 'text-dark-100' : 'text-dark-400'}>
          {selectedArray.length > 0
            ? selectedArray.map(s => s.name).join(', ')
            : 'Seleccionar categorías'}
        </span>
        <svg
          className={`w-4 h-4 text-dark-400 transition-transform ml-auto ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute left-0 mt-2 w-full py-2 rounded-xl bg-dark-700 border border-dark-600 shadow-xl z-50 max-h-80 overflow-y-auto">
          {/* Opción "Ninguna" */}
          <button
            onClick={() => {
              onSelect(multiple ? [] : null as any);
              if (!multiple) setIsOpen(false);
            }}
            className={`w-full px-4 py-2 text-left hover:bg-dark-600 transition-colors flex items-center gap-2 ${selectedArray.length === 0 ? 'bg-primary-500/20 text-primary-400' : 'text-dark-200'
              }`}
          >
            <span className="text-lg">🌐</span>
            Ninguna
          </button>

          <div className="border-t border-dark-600 my-2" />

          {/* Categorías organizadas */}
          {rootCategories.length === 0 ? (
            <div className="px-4 py-3 text-dark-500 text-sm text-center">
              No hay categorías configuradas
            </div>
          ) : (
            rootCategories.map(category => (
              <CategorySelectorItem
                key={category.id}
                category={category}
                children={getChildren(category.id)}
                getChildren={getChildren}
                selected={selectedArray}
                onSelect={toggleCategory}
                level={0}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}

// Item recursivo para mostrar jerarquía
interface CategorySelectorItemProps {
  category: Category;
  children: Category[];
  getChildren: (parentId: string) => Category[];
  selected: Category[];
  onSelect: (category: Category) => void;
  level: number;
}

function CategorySelectorItem({ category, children, getChildren, selected, onSelect, level }: CategorySelectorItemProps) {
  const isSelected = selected.some(s => s.id === category.id);
  const hasChildren = children.length > 0;

  return (
    <div>
      <button
        onClick={() => onSelect(category)}
        className={`w-full px-4 py-2 text-left hover:bg-dark-600 transition-colors flex items-center gap-2 ${isSelected ? 'bg-primary-500/20 text-primary-400' : 'text-dark-200'
          }`}
        style={{ paddingLeft: `${16 + level * 16}px` }}
      >
        <span className="text-lg">
          {hasChildren ? '📂' : '📄'}
        </span>
        <span className="truncate flex-1">{category.name}</span>
        {isSelected && <span className="text-primary-400">✓</span>}
        {hasChildren && (
          <span className="text-xs text-dark-500">
            +{children.length}
          </span>
        )}
      </button>

      {/* Hijos recursivos */}
      {hasChildren && children.map(child => (
        <CategorySelectorItem
          key={child.id}
          category={child}
          children={getChildren(child.id)}
          getChildren={getChildren}
          selected={selected}
          onSelect={onSelect}
          level={level + 1}
        />
      ))}
    </div>
  );
}
