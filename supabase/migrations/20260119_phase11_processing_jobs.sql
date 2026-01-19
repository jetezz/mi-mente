-- ============================================================
-- FASE 11: MIGRATION - Sistema de Cola de Procesamiento
-- ============================================================
-- Ejecutar este script en Supabase SQL Editor

-- ============ TABLA PROCESSING_JOBS ============
CREATE TABLE IF NOT EXISTS processing_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  
  -- Input
  url TEXT NOT NULL,
  custom_prompt TEXT,
  
  -- Status
  status VARCHAR(20) DEFAULT 'pending' CHECK (
    status IN ('pending', 'downloading', 'transcribing', 'summarizing', 'ready', 'saved', 'failed')
  ),
  progress INT DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  current_step TEXT,
  error_message TEXT,
  
  -- Video metadata
  video_title TEXT,
  video_thumbnail TEXT,
  video_duration INT,
  
  -- Processing output
  transcription TEXT,
  summary_markdown TEXT,
  key_points JSONB,
  ai_tags JSONB,
  
  -- Notion (cuando status = 'saved')
  notion_page_id TEXT,
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  saved_at TIMESTAMP WITH TIME ZONE,
  
  -- Metadata
  retry_count INT DEFAULT 0,
  worker_id TEXT
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_jobs_user ON processing_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON processing_jobs(status);
CREATE INDEX IF NOT EXISTS idx_jobs_created ON processing_jobs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_jobs_user_status ON processing_jobs(user_id, status);

-- ============ FUNCIÓN PARA OBTENER SIGUIENTE JOB PENDIENTE ============
CREATE OR REPLACE FUNCTION get_next_pending_job(p_worker_id TEXT DEFAULT NULL)
RETURNS TABLE(
  id UUID,
  user_id UUID,
  url TEXT,
  custom_prompt TEXT
) AS $$
DECLARE
  job_row processing_jobs%ROWTYPE;
BEGIN
  SELECT * INTO job_row
  FROM processing_jobs pj
  WHERE pj.status = 'pending'
  ORDER BY pj.created_at ASC
  LIMIT 1
  FOR UPDATE SKIP LOCKED;
  
  IF job_row.id IS NOT NULL THEN
    UPDATE processing_jobs
    SET 
      status = 'downloading',
      started_at = NOW(),
      worker_id = p_worker_id,
      progress = 5,
      current_step = 'Iniciando descarga...'
    WHERE processing_jobs.id = job_row.id;
    
    RETURN QUERY SELECT job_row.id, job_row.user_id, job_row.url, job_row.custom_prompt;
  END IF;
  
  RETURN;
END;
$$ LANGUAGE plpgsql;

-- ============ FUNCIÓN PARA ESTADÍSTICAS ============
CREATE OR REPLACE FUNCTION get_job_stats(p_user_id UUID)
RETURNS TABLE(
  total_jobs BIGINT,
  pending_count BIGINT,
  processing_count BIGINT,
  ready_count BIGINT,
  saved_count BIGINT,
  failed_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*) AS total_jobs,
    COUNT(*) FILTER (WHERE status = 'pending') AS pending_count,
    COUNT(*) FILTER (WHERE status IN ('downloading', 'transcribing', 'summarizing')) AS processing_count,
    COUNT(*) FILTER (WHERE status = 'ready') AS ready_count,
    COUNT(*) FILTER (WHERE status = 'saved') AS saved_count,
    COUNT(*) FILTER (WHERE status = 'failed') AS failed_count
  FROM processing_jobs
  WHERE processing_jobs.user_id = p_user_id;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============ POLÍTICAS RLS ============
ALTER TABLE processing_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own jobs" ON processing_jobs
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own jobs" ON processing_jobs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own jobs" ON processing_jobs
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own jobs" ON processing_jobs
  FOR DELETE USING (auth.uid() = user_id);

-- ============ TRIGGER CLEANUP ============
CREATE OR REPLACE FUNCTION cleanup_old_jobs()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM processing_jobs
  WHERE status = 'saved' 
    AND saved_at < NOW() - INTERVAL '30 days';
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_cleanup_old_jobs ON processing_jobs;
CREATE TRIGGER trigger_cleanup_old_jobs
  AFTER INSERT ON processing_jobs
  FOR EACH STATEMENT
  EXECUTE FUNCTION cleanup_old_jobs();

-- ✅ Migración completada
SELECT 'Fase 11: processing_jobs table created successfully!' AS message;
