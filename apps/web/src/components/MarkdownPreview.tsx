/**
 * MarkdownPreview Component
 * Visualizador y editor de Markdown
 */

import { useState, useMemo } from 'react';

interface MarkdownPreviewProps {
  content: string;
  editable?: boolean;
  onChange?: (content: string) => void;
  className?: string;
}

export function MarkdownPreview({
  content,
  editable = false,
  onChange,
  className = '',
}: MarkdownPreviewProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState(content);

  // Sincronizar cuando cambia el contenido externo
  useMemo(() => {
    if (!isEditing) {
      setEditedContent(content);
    }
  }, [content, isEditing]);

  // Renderizado simple de Markdown a HTML
  const renderedHtml = useMemo(() => {
    let html = editedContent
      // Headers
      .replace(/^### (.*$)/gim, '<h3 class="text-lg font-semibold text-dark-100 mt-4 mb-2">$1</h3>')
      .replace(/^## (.*$)/gim, '<h2 class="text-xl font-bold text-dark-100 mt-6 mb-3">$1</h2>')
      .replace(/^# (.*$)/gim, '<h1 class="text-2xl font-bold text-dark-50 mt-6 mb-4">$1</h1>')
      // Bold & Italic
      .replace(/\*\*\*(.*?)\*\*\*/g, '<strong class="font-bold italic">$1</strong>')
      .replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-dark-100">$1</strong>')
      .replace(/\*(.*?)\*/g, '<em class="italic">$1</em>')
      // Code inline
      .replace(/`([^`]+)`/g, '<code class="px-1.5 py-0.5 bg-dark-700 rounded text-primary-400 font-mono text-sm">$1</code>')
      // Links
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" class="text-primary-400 hover:text-primary-300 underline">$1</a>')
      // Unordered lists
      .replace(/^[\*\-] (.*)$/gim, '<li class="ml-4 text-dark-200">• $1</li>')
      // Ordered lists
      .replace(/^\d+\. (.*)$/gim, '<li class="ml-4 text-dark-200">$1</li>')
      // Blockquotes
      .replace(/^> (.*)$/gim, '<blockquote class="border-l-4 border-primary-500 pl-4 py-1 my-2 text-dark-300 italic">$1</blockquote>')
      // Horizontal rule
      .replace(/^---$/gim, '<hr class="border-dark-700 my-4" />')
      // Line breaks
      .replace(/\n\n/g, '</p><p class="text-dark-200 mb-3">')
      .replace(/\n/g, '<br/>');

    return `<p class="text-dark-200 mb-3">${html}</p>`;
  }, [editedContent]);

  const handleSave = () => {
    onChange?.(editedContent);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditedContent(content);
    setIsEditing(false);
  };

  return (
    <div className={`rounded-xl ${className}`}>
      {/* Toolbar */}
      {editable && (
        <div className="flex items-center justify-between px-4 py-2 bg-dark-800/50 border-b border-dark-700 rounded-t-xl">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsEditing(false)}
              className={`px-3 py-1 rounded-lg text-sm transition-colors
                ${!isEditing ? 'bg-primary-500/20 text-primary-400' : 'text-dark-400 hover:text-dark-200'}`}
            >
              👁️ Vista previa
            </button>
            <button
              onClick={() => setIsEditing(true)}
              className={`px-3 py-1 rounded-lg text-sm transition-colors
                ${isEditing ? 'bg-primary-500/20 text-primary-400' : 'text-dark-400 hover:text-dark-200'}`}
            >
              ✏️ Editar
            </button>
          </div>

          {isEditing && (
            <div className="flex items-center gap-2">
              <button
                onClick={handleCancel}
                className="px-3 py-1 text-sm text-dark-400 hover:text-dark-200"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                className="px-3 py-1 bg-primary-500 hover:bg-primary-400 text-white rounded-lg text-sm transition-colors"
              >
                Guardar
              </button>
            </div>
          )}
        </div>
      )}

      {/* Content area */}
      <div className={`p-4 ${editable ? '' : 'rounded-xl'} bg-dark-900/50`}>
        {isEditing ? (
          <textarea
            value={editedContent}
            onChange={(e) => setEditedContent(e.target.value)}
            className="w-full min-h-[300px] bg-dark-800/50 border border-dark-700 rounded-xl p-4 text-dark-100 font-mono text-sm resize-y focus:outline-none focus:ring-2 focus:ring-primary-500/50"
            placeholder="Escribe en Markdown..."
          />
        ) : (
          <div
            className="prose prose-invert max-w-none"
            dangerouslySetInnerHTML={{ __html: renderedHtml }}
          />
        )}
      </div>
    </div>
  );
}

// Versión simplificada solo para preview (no editable)
export function MarkdownText({ content }: { content: string }) {
  return <MarkdownPreview content={content} editable={false} />;
}
