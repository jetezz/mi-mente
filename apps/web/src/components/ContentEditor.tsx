import { useState, useEffect } from 'react';
import { TagSelector, type Tag } from './TagSelector';
import { Stepper } from './ui/Stepper';
import { BlockNoteView } from "@blocknote/mantine";
import { useCreateBlockNote } from "@blocknote/react";
import "@blocknote/mantine/style.css";

export interface ProcessedContent {
  title: string;
  summary: string;
  keyPoints: string[];
  sentiment: 'positive' | 'negative' | 'neutral';
  originalUrl: string;
  transcription?: string;
}

export interface EditedContent {
  title: string;
  markdown: string; // Unified content
  tags: Tag[];
  originalUrl: string;
}

// Steps
const STEPS = [
  { id: 'edit', label: 'Editar Contenido', icon: '✏️' },
  { id: 'tags', label: 'Etiquetas y Guardar', icon: '🏷️' },
];

interface ContentEditorProps {
  content: ProcessedContent;
  availableTags: Tag[];
  onSave: (editedContent: EditedContent) => Promise<void>;
  onCancel: () => void;
  onCreateTag: (name: string) => Promise<Tag>;
  isSaving?: boolean;
  isStreaming?: boolean;
}

export function ContentEditor({
  content,
  availableTags,
  onSave,
  onCancel,
  onCreateTag,
  isSaving = false,
  isStreaming = false,
}: ContentEditorProps) {
  const [currentStep, setCurrentStep] = useState('edit');
  const [completedSteps, setCompletedSteps] = useState<string[]>([]);

  // State
  const [title, setTitle] = useState(content.title);
  const [selectedTags, setSelectedTags] = useState<Tag[]>([]);

  // BlockNote Editor
  const editor = useCreateBlockNote();
  const [initialLoaded, setInitialLoaded] = useState(false);

  // Initialize editor content
  useEffect(() => {
    async function loadContent() {
      if (initialLoaded || isStreaming) return;

      // Construct initial markdown from summary and keypoints
      const initialMarkdown = `
${content.summary}

## 💡 Puntos Clave

${content.keyPoints.map(kp => `- ${kp}`).join('\n')}
      `.trim();

      // Load into editor
      const blocks = await editor.tryParseMarkdownToBlocks(initialMarkdown);
      editor.replaceBlocks(editor.document, blocks);
      setInitialLoaded(true);
    }

    loadContent();
  }, [content, editor, initialLoaded, isStreaming]);

  // Update title if content updates (e.g. from streaming finalization)
  useEffect(() => {
    if (content.title && content.title !== 'Sin Título') {
      setTitle(content.title);
    }
  }, [content.title]);

  const handleStepChange = (stepId: string) => {
    if (isStreaming) return;
    if (!completedSteps.includes(currentStep)) {
      setCompletedSteps(prev => [...prev, currentStep]);
    }
    setCurrentStep(stepId);
  };

  const goToNextStep = () => {
    handleStepChange('tags');
  };

  const goToPrevStep = () => {
    handleStepChange('edit');
  };

  const handleSave = async () => {
    // Export content to markdown
    const markdown = await editor.blocksToMarkdownLossy(editor.document);

    await onSave({
      title,
      markdown,
      tags: selectedTags,
      originalUrl: content.originalUrl,
    });
  };

  const handleTagToggle = (tag: Tag) => {
    if (selectedTags.some(t => t.id === tag.id)) {
      setSelectedTags(selectedTags.filter(t => t.id !== tag.id));
    } else {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  return (
    <div className="card overflow-hidden flex flex-col min-h-[600px]">
      {/* Header */}
      <div className="p-4 bg-dark-800/50 border-b border-dark-700">
        <Stepper
          steps={STEPS}
          currentStep={currentStep}
          completedSteps={completedSteps}
          onStepClick={handleStepChange}
        />
      </div>

      {/* Body */}
      <div className="flex-1 p-6">
        {currentStep === 'edit' && (
          <div className="space-y-4 h-full flex flex-col">
            <div>
              <label className="block text-sm font-medium text-dark-300 mb-2">
                Título
              </label>
              <input
                type="text"
                value={title}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTitle(e.target.value)}
                disabled={isStreaming}
                className="input w-full font-bold text-lg disabled:opacity-50"
                placeholder="Título del documento..."
              />
            </div>

            <div className="flex-1 border border-dark-700 rounded-xl overflow-hidden bg-white/5 min-h-[400px]">
              {isStreaming ? (
                <div className="h-full p-12 overflow-y-auto font-sans text-dark-200 whitespace-pre-wrap">
                  {content.summary}
                  <span className="inline-block w-2 h-5 bg-primary-400 ml-1 animate-pulse align-middle" />
                </div>
              ) : (
                <BlockNoteView editor={editor} theme="dark" className="h-full py-4" />
              )}
            </div>

            <div className="flex justify-between pt-4">
              <button
                onClick={onCancel}
                className="btn-ghost text-sm"
              >
                Cancelar
              </button>
              <button
                onClick={goToNextStep}
                disabled={isStreaming}
                className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isStreaming ? 'Generando...' : 'Continuar →'}
              </button>
            </div>
          </div>
        )}

        {currentStep === 'tags' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium text-dark-100">Etiquetas</h3>
              <p className="text-sm text-dark-400">Organiza tu contenido antes de guardarlo.</p>
            </div>

            {/* Existing Tags */}
            <div className="space-y-3">
              <label className="text-sm font-medium text-dark-300">Etiquetas Disponibles</label>
              <div className="flex flex-wrap gap-2">
                {availableTags.map(tag => {
                  const isSelected = selectedTags.some((t: Tag) => t.id === tag.id);
                  return (
                    <button
                      key={tag.id}
                      onClick={() => handleTagToggle(tag)}
                      className={`px-3 py-1.5 rounded-full text-sm transition-all border ${isSelected
                        ? 'bg-primary-500/20 border-primary-500 text-primary-300'
                        : 'bg-dark-800 border-dark-600 text-dark-400 hover:border-dark-400'
                        }`}
                      style={isSelected ? { borderColor: tag.color, color: tag.color } : {}}
                    >
                      {tag.name} {isSelected && '✓'}
                    </button>
                  )
                })}
                {availableTags.length === 0 && <span className="text-dark-500 text-sm italic">No hay etiquetas creadas aún.</span>}
              </div>
            </div>

            {/* Tag Creator */}
            <div>
              <label className="text-sm font-medium text-dark-300 mb-2 block">Crear Nueva Etiqueta</label>
              <TagSelector
                availableTags={availableTags}
                selectedTags={selectedTags}
                onTagsChange={setSelectedTags}
                onCreateTag={onCreateTag}
              />
            </div>

            <div className="flex justify-between pt-8 border-t border-dark-700">
              <button onClick={goToPrevStep} className="btn-ghost">← Volver</button>
              <button onClick={handleSave} disabled={isSaving} className="btn-primary">
                {isSaving ? 'Guardando...' : '💾 Guardar en Notion'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
