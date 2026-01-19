-- Migración: Añadir campo draft_categories para guardar borradores
-- Fecha: 2026-01-19

-- Añadir columna para categorías de borrador
ALTER TABLE processing_jobs
ADD COLUMN IF NOT EXISTS draft_categories JSONB DEFAULT '[]';

-- Comentario descriptivo
COMMENT ON COLUMN processing_jobs.draft_categories IS 'Categorías seleccionadas en el borrador, antes de guardar en Notion';
