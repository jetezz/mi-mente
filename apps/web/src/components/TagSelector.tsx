/**
 * TagSelector Component
 * Selector de etiquetas con autocompletado y creación inline
 */

import { useState, useRef, useEffect } from 'react';

export interface Tag {
  id: string;
  name: string;
  color: string;
}

interface TagSelectorProps {
  availableTags: Tag[];
  selectedTags: Tag[];
  onTagsChange: (tags: Tag[]) => void;
  onCreateTag: (name: string) => Promise<Tag>;
  placeholder?: string;
  disabled?: boolean;
}

const DEFAULT_COLORS = [
  '#8B5CF6', // Purple
  '#06B6D4', // Cyan
  '#10B981', // Emerald
  '#F59E0B', // Amber
  '#EF4444', // Red
  '#EC4899', // Pink
  '#3B82F6', // Blue
  '#6366F1', // Indigo
];

export function TagSelector({
  availableTags,
  selectedTags,
  onTagsChange,
  onCreateTag,
  placeholder = 'Añadir etiqueta...',
  disabled = false,
}: TagSelectorProps) {
  const [inputValue, setInputValue] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Filtrar tags disponibles que no están seleccionados
  const filteredTags = availableTags.filter(
    (tag) =>
      !selectedTags.some((st) => st.id === tag.id) &&
      tag.name.toLowerCase().includes(inputValue.toLowerCase())
  );

  // Ver si existe una coincidencia exacta
  const exactMatch = availableTags.find(
    (tag) => tag.name.toLowerCase() === inputValue.toLowerCase()
  );

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectTag = (tag: Tag) => {
    onTagsChange([...selectedTags, tag]);
    setInputValue('');
    setIsOpen(false);
  };

  const handleRemoveTag = (tagId: string) => {
    onTagsChange(selectedTags.filter((t) => t.id !== tagId));
  };

  const handleCreateTag = async () => {
    if (!inputValue.trim() || exactMatch) return;

    setIsCreating(true);
    try {
      const newTag = await onCreateTag(inputValue.trim());
      onTagsChange([...selectedTags, newTag]);
      setInputValue('');
      setIsOpen(false);
    } catch (error) {
      console.error('Error creating tag:', error);
    } finally {
      setIsCreating(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && inputValue.trim()) {
      e.preventDefault();
      if (exactMatch && !selectedTags.some((t) => t.id === exactMatch.id)) {
        handleSelectTag(exactMatch);
      } else if (!exactMatch) {
        handleCreateTag();
      }
    } else if (e.key === 'Backspace' && !inputValue && selectedTags.length > 0) {
      // Eliminar último tag con backspace
      handleRemoveTag(selectedTags[selectedTags.length - 1].id);
    } else if (e.key === 'Escape') {
      setIsOpen(false);
      inputRef.current?.blur();
    }
  };

  return (
    <div className="relative">
      {/* Container de tags seleccionados + input */}
      <div
        className={`
          flex flex-wrap gap-2 p-2 min-h-[42px] rounded-xl
          bg-dark-800/50 border border-dark-700
          focus-within:ring-2 focus-within:ring-primary-500/50 focus-within:border-primary-500
          transition-all
          ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
        `}
        onClick={() => inputRef.current?.focus()}
      >
        {/* Tags seleccionados */}
        {selectedTags.map((tag) => (
          <div
            key={tag.id}
            className="flex items-center gap-1 px-2 py-1 rounded-lg text-sm"
            style={{
              backgroundColor: `${tag.color}20`,
              borderColor: `${tag.color}50`,
              borderWidth: '1px',
              color: tag.color,
            }}
          >
            <span>{tag.name}</span>
            {!disabled && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleRemoveTag(tag.id);
                }}
                className="ml-1 hover:opacity-70"
              >
                ×
              </button>
            )}
          </div>
        ))}

        {/* Input */}
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={(e) => {
            setInputValue(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={selectedTags.length === 0 ? placeholder : ''}
          disabled={disabled}
          className="flex-1 min-w-[100px] bg-transparent border-none outline-none text-dark-100 placeholder-dark-500 text-sm"
        />
      </div>

      {/* Dropdown */}
      {isOpen && (filteredTags.length > 0 || (inputValue.trim() && !exactMatch)) && (
        <div
          ref={dropdownRef}
          className="absolute top-full left-0 right-0 mt-1 py-1 bg-dark-800 border border-dark-700 rounded-xl shadow-xl z-10 max-h-48 overflow-y-auto"
        >
          {/* Tags existentes */}
          {filteredTags.map((tag) => (
            <button
              key={tag.id}
              onClick={() => handleSelectTag(tag)}
              className="w-full flex items-center gap-2 px-3 py-2 hover:bg-dark-700 text-left text-sm text-dark-200"
            >
              <span
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: tag.color }}
              />
              {tag.name}
            </button>
          ))}

          {/* Crear nueva */}
          {inputValue.trim() && !exactMatch && (
            <button
              onClick={handleCreateTag}
              disabled={isCreating}
              className="w-full flex items-center gap-2 px-3 py-2 hover:bg-dark-700 text-left text-sm text-primary-400"
            >
              {isCreating ? (
                <>
                  <span className="animate-spin">⏳</span>
                  Creando...
                </>
              ) : (
                <>
                  <span>+</span>
                  Crear "{inputValue.trim()}"
                </>
              )}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
