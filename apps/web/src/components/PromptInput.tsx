/**
 * PromptInput Component
 * Input para instrucciones personalizadas a la IA
 */

import { useState } from 'react';

interface PromptInputProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

const PROMPT_SUGGESTIONS = [
  'Céntrate en los puntos técnicos y omite las bromas',
  'Resume en formato bullet points',
  'Extrae las lecciones principales para aplicar',
  'Incluye ejemplos de código si los hay',
  'Hazlo simple, para alguien que empieza',
];

export function PromptInput({ value, onChange, disabled = false }: PromptInputProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  const handleSuggestionClick = (suggestion: string) => {
    onChange(suggestion);
  };

  return (
    <div className="space-y-2">
      {/* Header collapsible */}
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-2 text-sm text-dark-400 hover:text-dark-200 transition-colors"
        disabled={disabled}
      >
        <svg
          className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
        <span className="font-medium">✨ Instrucciones para la IA (opcional)</span>
      </button>

      {/* Content */}
      {isExpanded && (
        <div className="space-y-3 pl-6">
          {/* Textarea */}
          <textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Ej: Céntrate en los aspectos prácticos, incluye ejemplos..."
            disabled={disabled}
            rows={3}
            className={`
              w-full px-4 py-3 bg-dark-800/50 border border-dark-700 rounded-xl
              text-dark-100 placeholder-dark-500 text-sm
              resize-y min-h-[80px]
              focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500
              transition-all
              ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
            `}
          />

          {/* Suggestions */}
          <div>
            <p className="text-xs text-dark-500 mb-2">Sugerencias rápidas:</p>
            <div className="flex flex-wrap gap-2">
              {PROMPT_SUGGESTIONS.map((suggestion, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => handleSuggestionClick(suggestion)}
                  disabled={disabled}
                  className="px-3 py-1 text-xs bg-dark-700/50 hover:bg-dark-700 
                           border border-dark-600 rounded-lg text-dark-300
                           transition-colors disabled:opacity-50"
                >
                  {suggestion.length > 40 ? suggestion.slice(0, 40) + '...' : suggestion}
                </button>
              ))}
            </div>
          </div>

          {/* Help text */}
          <p className="text-xs text-dark-500">
            💡 Estas instrucciones se añadirán al prompt del sistema cuando la IA genere el resumen.
          </p>
        </div>
      )}
    </div>
  );
}
