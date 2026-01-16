/**
 * ContentEditor Component
 * Editor completo de contenido antes de guardar en Notion
 * Incluye: edición de título, resumen, puntos clave, tags y preview
 */

import { useState, useEffect } from 'react';
import { MarkdownPreview } from './MarkdownPreview';
import { TagSelector, type Tag } from './TagSelector';
import { Stepper } from './ui/Stepper';

export interface ProcessedContent {
  title: string;
  summary: string;
  keyPoints: string[];
  sentiment: 'positive' | 'negative' | 'neutral';
  originalUrl: string;
  transcription?: string;
}

interface ContentEditorProps {
  content: ProcessedContent;
  availableTags: Tag[];
  onSave: (editedContent: EditedContent) => Promise<void>;
  onCancel: () => void;
  onCreateTag: (name: string) => Promise<Tag>;
  isSaving?: boolean;
}

export interface EditedContent {
  title: string;
  summary: string;
  keyPoints: string[];
  tags: Tag[];
  originalUrl: string;
}

const STEPS = [
  { id: 'review', label: 'Revisar', icon: '📋' },
  { id: 'edit', label: 'Editar', icon: '✏️' },
  { id: 'tags', label: 'Etiquetas', icon: '🏷️' },
  { id: 'confirm', label: 'Confirmar', icon: '✅' },
];

export function ContentEditor({
  content,
  availableTags,
  onSave,
  onCancel,
  onCreateTag,
  isSaving = false,
}: ContentEditorProps) {
  const [currentStep, setCurrentStep] = useState('review');
  const [completedSteps, setCompletedSteps] = useState<string[]>([]);

  // Estado editado
  const [title, setTitle] = useState(content.title);
  const [summary, setSummary] = useState(content.summary);
  const [keyPoints, setKeyPoints] = useState<string[]>(content.keyPoints);
  const [selectedTags, setSelectedTags] = useState<Tag[]>([]);

  // Nuevo key point input
  const [newKeyPoint, setNewKeyPoint] = useState('');

  // Sincronizar estado cuando cambia el contenido
  useEffect(() => {
    setTitle(content.title);
    setSummary(content.summary);
    setKeyPoints(content.keyPoints);
  }, [content]);

  const handleStepChange = (stepId: string) => {
    // Marcar paso actual como completado antes de cambiar
    if (!completedSteps.includes(currentStep)) {
      setCompletedSteps(prev => [...prev, currentStep]);
    }
    setCurrentStep(stepId);
  };

  const goToNextStep = () => {
    const currentIndex = STEPS.findIndex(s => s.id === currentStep);
    if (currentIndex < STEPS.length - 1) {
      handleStepChange(STEPS[currentIndex + 1].id);
    }
  };

  const goToPrevStep = () => {
    const currentIndex = STEPS.findIndex(s => s.id === currentStep);
    if (currentIndex > 0) {
      setCurrentStep(STEPS[currentIndex - 1].id);
    }
  };

  const handleSave = async () => {
    await onSave({
      title,
      summary,
      keyPoints,
      tags: selectedTags,
      originalUrl: content.originalUrl,
    });
  };

  const addKeyPoint = () => {
    if (newKeyPoint.trim()) {
      setKeyPoints([...keyPoints, newKeyPoint.trim()]);
      setNewKeyPoint('');
    }
  };

  const removeKeyPoint = (index: number) => {
    setKeyPoints(keyPoints.filter((_, i) => i !== index));
  };

  // Generar markdown del contenido para preview
  const markdownContent = `# ${title}

${summary}

## Puntos Clave

${keyPoints.map((p, i) => `${i + 1}. ${p}`).join('\n')}

---

*Fuente: [${content.originalUrl}](${content.originalUrl})*
`;

  return (
    <div className="card overflow-hidden">
      {/* Header con stepper */}
      <div className="p-4 bg-gradient-to-r from-primary-600/20 to-accent-cyan/20 border-b border-dark-800/50">
        <Stepper
          steps={STEPS}
          currentStep={currentStep}
          completedSteps={completedSteps}
          onStepClick={handleStepChange}
        />
      </div>

      {/* Content area */}
      <div className="p-6">
        {/* Step 1: Review */}
        {currentStep === 'review' && (
          <div className="space-y-6">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-xl font-bold text-dark-100 mb-2">
                  Vista previa del contenido
                </h2>
                <p className="text-dark-400 text-sm">
                  Revisa el resumen generado por la IA antes de continuar
                </p>
              </div>
              <span className={`badge-${content.sentiment === 'positive' ? 'success' : content.sentiment === 'negative' ? 'danger' : 'primary'}`}>
                {content.sentiment === 'positive' ? '😊 Positivo' : content.sentiment === 'negative' ? '😟 Negativo' : '😐 Neutral'}
              </span>
            </div>

            <MarkdownPreview content={markdownContent} editable={false} />

            <div className="flex items-center justify-between pt-4 border-t border-dark-700">
              <button onClick={onCancel} className="text-dark-400 hover:text-dark-200">
                Cancelar
              </button>
              <button onClick={goToNextStep} className="btn-primary">
                Continuar a edición →
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Edit */}
        {currentStep === 'edit' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold text-dark-100 mb-2">
                Editar contenido
              </h2>
              <p className="text-dark-400 text-sm">
                Modifica el título, resumen y puntos clave según necesites
              </p>
            </div>

            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-dark-300 mb-2">
                Título
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="input"
              />
            </div>

            {/* Summary */}
            <div>
              <label className="block text-sm font-medium text-dark-300 mb-2">
                Resumen
              </label>
              <textarea
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                rows={6}
                className="input resize-y"
              />
            </div>

            {/* Key Points */}
            <div>
              <label className="block text-sm font-medium text-dark-300 mb-2">
                Puntos Clave
              </label>
              <div className="space-y-2">
                {keyPoints.map((point, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-primary-500/20 text-primary-400 flex items-center justify-center text-xs font-bold">
                      {index + 1}
                    </span>
                    <input
                      type="text"
                      value={point}
                      onChange={(e) => {
                        const newPoints = [...keyPoints];
                        newPoints[index] = e.target.value;
                        setKeyPoints(newPoints);
                      }}
                      className="input flex-1"
                    />
                    <button
                      onClick={() => removeKeyPoint(index)}
                      className="p-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg"
                    >
                      ×
                    </button>
                  </div>
                ))}

                {/* Add new key point */}
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-dark-700 text-dark-400 flex items-center justify-center text-xs">
                    +
                  </span>
                  <input
                    type="text"
                    value={newKeyPoint}
                    onChange={(e) => setNewKeyPoint(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && addKeyPoint()}
                    placeholder="Añadir punto clave..."
                    className="input flex-1"
                  />
                  <button
                    onClick={addKeyPoint}
                    disabled={!newKeyPoint.trim()}
                    className="btn-secondary text-sm"
                  >
                    Añadir
                  </button>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-dark-700">
              <button onClick={goToPrevStep} className="text-dark-400 hover:text-dark-200">
                ← Atrás
              </button>
              <button onClick={goToNextStep} className="btn-primary">
                Continuar a etiquetas →
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Tags */}
        {currentStep === 'tags' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold text-dark-100 mb-2">
                Etiquetas
              </h2>
              <p className="text-dark-400 text-sm">
                Selecciona o crea etiquetas para organizar este contenido
              </p>
            </div>

            <TagSelector
              availableTags={availableTags}
              selectedTags={selectedTags}
              onTagsChange={setSelectedTags}
              onCreateTag={onCreateTag}
              placeholder="Buscar o crear etiqueta..."
            />

            <div className="bg-dark-800/50 rounded-xl p-4">
              <p className="text-sm text-dark-400">
                💡 <strong>Tip:</strong> Las etiquetas te ayudan a encontrar contenido relacionado.
                Puedes crear nuevas etiquetas escribiendo el nombre y presionando Enter.
              </p>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-dark-700">
              <button onClick={goToPrevStep} className="text-dark-400 hover:text-dark-200">
                ← Atrás
              </button>
              <button onClick={goToNextStep} className="btn-primary">
                Revisar y guardar →
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Confirm */}
        {currentStep === 'confirm' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold text-dark-100 mb-2">
                Confirmar y guardar
              </h2>
              <p className="text-dark-400 text-sm">
                Revisa el contenido final antes de guardarlo en Notion
              </p>
            </div>

            {/* Summary card */}
            <div className="bg-dark-800/50 rounded-xl p-4 space-y-4">
              <div>
                <span className="text-sm text-dark-400">Título:</span>
                <p className="text-dark-100 font-medium">{title}</p>
              </div>

              <div>
                <span className="text-sm text-dark-400">Resumen:</span>
                <p className="text-dark-200 text-sm">{summary.slice(0, 200)}...</p>
              </div>

              <div>
                <span className="text-sm text-dark-400">Puntos clave:</span>
                <p className="text-dark-200">{keyPoints.length} puntos</p>
              </div>

              <div>
                <span className="text-sm text-dark-400">Etiquetas:</span>
                <div className="flex flex-wrap gap-2 mt-1">
                  {selectedTags.length > 0 ? (
                    selectedTags.map((tag) => (
                      <span
                        key={tag.id}
                        className="px-2 py-1 rounded-lg text-xs"
                        style={{
                          backgroundColor: `${tag.color}20`,
                          color: tag.color,
                        }}
                      >
                        {tag.name}
                      </span>
                    ))
                  ) : (
                    <span className="text-dark-500 text-sm">Sin etiquetas</span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-dark-700">
              <button onClick={goToPrevStep} className="text-dark-400 hover:text-dark-200">
                ← Atrás
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="btn-primary"
              >
                {isSaving ? (
                  <>
                    <span className="animate-spin">⏳</span>
                    Guardando...
                  </>
                ) : (
                  <>
                    💾 Guardar en Notion
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
