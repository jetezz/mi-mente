import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Badge } from "./ui/Badge";

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

  const selectedArray = Array.isArray(selected) ? selected : selected ? [selected] : [];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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
      const isSelected = selectedArray.some(s => s.id === category.id);
      if (isSelected) {
        onSelect(multiple ? [] : (null as any));
      } else {
        onSelect(multiple ? [category] : (category as any));
      }
      setIsOpen(false);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex items-center gap-2 px-4 py-2.5 rounded-xl w-full",
          "bg-dark-800/50 border border-dark-700",
          "hover:bg-dark-700/50 hover:border-dark-600",
          "transition-all duration-200",
          isOpen && "border-primary-500/50 ring-1 ring-primary-500/20",
        )}
      >
        <svg className="w-4 h-4 text-dark-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
          />
        </svg>

        {selectedArray.length > 0 ? (
          <div className="flex flex-wrap gap-1 flex-1">
            {selectedArray.map(s => (
              <Badge key={s.id} variant="secondary" size="sm">
                {s.name}
              </Badge>
            ))}
          </div>
        ) : (
          <span className="text-dark-400 flex-1 text-left">Categorías</span>
        )}

        <svg
          className={cn("w-4 h-4 text-dark-400 transition-transform duration-200", isOpen && "rotate-180")}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div
          className={cn(
            "absolute left-0 mt-2 w-full py-2 rounded-xl z-[100] max-h-80 overflow-y-auto",
            "bg-dark-800/95 backdrop-blur-xl border border-dark-700 shadow-2xl",
            "animate-fade-in",
          )}
        >
          <CategoryOption
            icon="🌐"
            label="Ninguna"
            isSelected={selectedArray.length === 0}
            onClick={() => {
              onSelect(multiple ? [] : (null as any));
              if (!multiple) setIsOpen(false);
            }}
          />

          <div className="border-t border-dark-700 my-2" />

          {rootCategories.length === 0 ? (
            <div className="px-4 py-3 text-dark-500 text-sm text-center">No hay categorías configuradas</div>
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

interface CategoryOptionProps {
  icon: string;
  label: string;
  isSelected: boolean;
  onClick: () => void;
  level?: number;
  childCount?: number;
}

function CategoryOption({ icon, label, isSelected, onClick, level = 0, childCount }: CategoryOptionProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full px-4 py-2 text-left transition-colors flex items-center gap-2",
        isSelected ? "bg-primary-500/15 text-primary-400" : "text-dark-200 hover:bg-dark-700/50",
      )}
      style={{ paddingLeft: `${16 + level * 16}px` }}
    >
      <span className="text-lg">{icon}</span>
      <span className="truncate flex-1">{label}</span>
      {isSelected && (
        <svg className="w-4 h-4 text-primary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      )}
      {childCount !== undefined && childCount > 0 && (
        <Badge variant="outline" size="sm" className="text-dark-500">
          +{childCount}
        </Badge>
      )}
    </button>
  );
}

interface CategorySelectorItemProps {
  category: Category;
  children: Category[];
  getChildren: (parentId: string) => Category[];
  selected: Category[];
  onSelect: (category: Category) => void;
  level: number;
}

function CategorySelectorItem({
  category,
  children,
  getChildren,
  selected,
  onSelect,
  level,
}: CategorySelectorItemProps) {
  const isSelected = selected.some(s => s.id === category.id);
  const hasChildren = children.length > 0;

  return (
    <div>
      <CategoryOption
        icon={hasChildren ? "📂" : "📄"}
        label={category.name}
        isSelected={isSelected}
        onClick={() => onSelect(category)}
        level={level}
        childCount={hasChildren ? children.length : undefined}
      />

      {hasChildren &&
        children.map(child => (
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
