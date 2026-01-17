import React, { useState, useEffect } from 'react';
import { CategorySelector } from './CategorySelector';
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

interface Category {
  id: string;
  name: string;
  parent_id: string | null;
}

export interface EditedContent {
  title: string;
  markdown: string;
  category?: Category;
  originalUrl: string;
}

// Steps
const STEPS = [
  { id: 'edit', label: 'Editar Contenido', icon: '✏️' },
  { id: 'category', label: 'Categoría y Guardar', icon: '📂' },
];

interface ContentEditorProps {
  content: ProcessedContent;
  availableCategories: Category[];
  onSave: (editedContent: EditedContent) => Promise<void>;
  onCancel: () => void;
  onCreateCategory: (name: string) => Promise<Category>;
  isSaving?: boolean;
  isStreaming?: boolean;
}

export function ContentEditor({
  content,
  availableCategories,
  onSave,
  onCancel,
  onCreateCategory,
  isSaving = false,
  isStreaming = false,
}: ContentEditorProps) {
  const [currentStep, setCurrentStep] = useState('edit');
  const [completedSteps, setCompletedSteps] = useState<string[]>([]);

  // State
  const [title, setTitle] = useState(content.title);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);

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
    handleStepChange('category');
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
      category: selectedCategory || undefined,
      originalUrl: content.originalUrl,
    });
  };

  const handleCreateNewCategory = async () => {
    if (!newCategoryName.trim()) return;
    setIsCreatingCategory(true);
    try {
      const newCat = await onCreateCategory(newCategoryName.trim());
      setSelectedCategory(newCat);
      setNewCategoryName('');
    } catch (e) {
      console.error(e);
    } finally {
      setIsCreatingCategory(false);
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

        {currentStep === 'category' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium text-dark-100">Categoría</h3>
              <p className="text-sm text-dark-400">Selecciona o crea una categoría para organizar tu contenido.</p>
            </div>

            {/* Category Selector */}
            <div className="space-y-3">
              <label className="text-sm font-medium text-dark-300">Categoría Seleccionada</label>
              <div className="max-h-[300px] overflow-y-auto border border-dark-700 rounded-xl p-4 bg-dark-800/50">
                <CategorySelector
                  categories={availableCategories}
                  selected={selectedCategory}
                  onSelect={setSelectedCategory}
                />
              </div>
            </div>

            {/* Create Category */}
            <div className="flex gap-2 items-end">
              <div className="flex-1">
                <label className="text-sm font-medium text-dark-300 mb-2 block">Nueva Categoría</label>
                <input
                  type="text"
                  value={newCategoryName}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewCategoryName(e.target.value)}
                  placeholder="Nombre..."
                  className="input w-full"
                />
              </div>
              <button
                onClick={handleCreateNewCategory}
                disabled={isCreatingCategory || !newCategoryName.trim()}
                className="btn-secondary mb-[2px]"
              >
                {isCreatingCategory ? 'Creando...' : '+ Crear'}
              </button>
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
