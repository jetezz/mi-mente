interface NoteResult {
  id: string;
  title: string;
  summary: string;
  keyPoints: string[];
  tags: string[];
  sentiment: 'positive' | 'negative' | 'neutral';
  originalUrl: string;
  notionPageId?: string;
}

interface ResultCardProps {
  note: NoteResult;
  onReset: () => void;
}

export function ResultCard({ note, onReset }: ResultCardProps) {
  const getSentimentBadge = (sentiment: string) => {
    switch (sentiment) {
      case 'positive':
        return <span className="badge-success">😊 Positivo</span>;
      case 'negative':
        return <span className="badge-danger">😟 Negativo</span>;
      default:
        return <span className="badge-primary">😐 Neutral</span>;
    }
  };

  const copyToClipboard = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    // Could add a toast notification here
  };

  return (
    <div className="card overflow-hidden">
      {/* Header with gradient */}
      <div className="bg-gradient-to-r from-primary-600/20 to-accent-cyan/20 p-6 border-b border-dark-800/50">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-bold text-dark-100 truncate">{note.title}</h2>
            <a
              href={note.originalUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-dark-400 hover:text-primary-400 transition-colors flex items-center gap-1 mt-1"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
              Ver original
            </a>
          </div>
          {getSentimentBadge(note.sentiment)}
        </div>
      </div>

      {/* Content */}
      <div className="p-6 space-y-6">
        {/* Summary */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-dark-400 uppercase tracking-wider flex items-center gap-2">
              <span>📋</span> Resumen
            </h3>
            <button
              onClick={() => copyToClipboard(note.summary, 'resumen')}
              className="text-dark-500 hover:text-dark-300 transition-colors"
              title="Copiar resumen"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </button>
          </div>
          <p className="text-dark-200 leading-relaxed">{note.summary}</p>
        </div>

        <div className="divider" />

        {/* Key Points */}
        <div>
          <h3 className="text-sm font-medium text-dark-400 uppercase tracking-wider flex items-center gap-2 mb-3">
            <span>💡</span> Puntos Clave
          </h3>
          <ul className="space-y-2">
            {note.keyPoints.map((point, index) => (
              <li key={index} className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-primary-500/20 text-primary-400 flex items-center justify-center flex-shrink-0 text-xs font-bold">
                  {index + 1}
                </span>
                <span className="text-dark-200">{point}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="divider" />

        {/* Tags */}
        <div>
          <h3 className="text-sm font-medium text-dark-400 uppercase tracking-wider flex items-center gap-2 mb-3">
            <span>🏷️</span> Etiquetas
          </h3>
          <div className="flex flex-wrap gap-2">
            {note.tags.map((tag, index) => (
              <span key={index} className="badge-primary">
                #{tag}
              </span>
            ))}
          </div>
        </div>

        {/* Notion link */}
        {note.notionPageId && (
          <>
            <div className="divider" />
            <a
              href={`https://notion.so/${note.notionPageId.replace(/-/g, '')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full py-3 bg-dark-800/50 hover:bg-dark-700/50 border border-dark-700 rounded-xl text-dark-200 transition-all duration-300"
            >
              <svg className="w-5 h-5" viewBox="0 0 100 100" fill="currentColor">
                <path d="M6.017 4.313l55.333 -4.087c6.797 -0.583 8.543 -0.19 12.817 2.917l17.663 12.443c2.913 2.14 3.883 2.723 3.883 5.053v68.243c0 4.277 -1.553 6.807 -6.99 7.193L24.467 99.967c-4.08 0.193 -6.023 -0.39 -8.16 -3.113L3.3 79.94c-2.333 -3.113 -3.3 -5.443 -3.3 -8.167V11.113c0 -3.497 1.553 -6.413 6.017 -6.8z" />
              </svg>
              Ver en Notion
            </a>
          </>
        )}
      </div>

      {/* Footer */}
      <div className="p-6 bg-dark-900/50 border-t border-dark-800/50">
        <button
          onClick={onReset}
          className="btn-secondary w-full justify-center"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Procesar otro video
        </button>
      </div>
    </div>
  );
}
