-- ============================================================
-- Hybrid Brain - Schema de Base de Datos (Supabase)
-- Fase 5: Sistema de Categorías Jerárquicas para RAG + Auth
-- ============================================================

-- ============ TABLA DE PERFILES DE USUARIO ============
-- Extiende la tabla auth.users de Supabase con datos adicionales

CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Trigger para crear perfil automáticamente al registrarse
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Conectar el trigger con auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============ TABLA DE CATEGORÍAS ============
-- Soporta jerarquía mediante parent_id (auto-referencial)
-- Vinculada a usuarios mediante user_id

DROP TABLE IF EXISTS categories CASCADE;

CREATE TABLE categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name VARCHAR(100) NOT NULL,
  parent_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  notion_sync_id VARCHAR(50),  -- ID del Select en Notion para sincronizar
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para optimización
CREATE INDEX IF NOT EXISTS idx_categories_user ON categories(user_id);
CREATE INDEX IF NOT EXISTS idx_categories_parent ON categories(parent_id);
CREATE INDEX IF NOT EXISTS idx_categories_name ON categories(name);

-- ============ FUNCIÓN RECURSIVA PARA OBTENER DESCENDIENTES ============

CREATE OR REPLACE FUNCTION get_category_descendants(category_id UUID)
RETURNS TABLE(id UUID, name VARCHAR, level INT) AS $$
WITH RECURSIVE descendants AS (
  -- Caso base: la categoría raíz
  SELECT c.id, c.name, 0 as level
  FROM categories c
  WHERE c.id = category_id
  
  UNION ALL
  
  -- Caso recursivo: hijos de las categorías encontradas
  SELECT c.id, c.name, d.level + 1
  FROM categories c
  INNER JOIN descendants d ON c.parent_id = d.id
)
SELECT * FROM descendants;
$$ LANGUAGE SQL STABLE;

-- ============ TRIGGER PARA ACTUALIZAR updated_at ============

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS categories_updated_at ON categories;
CREATE TRIGGER categories_updated_at
  BEFORE UPDATE ON categories
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS profiles_updated_at ON profiles;
CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- ============ POLÍTICAS RLS (Row Level Security) ============

-- Habilitar RLS en todas las tablas
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

-- ============ POLÍTICAS PARA PROFILES ============

-- Los usuarios solo pueden ver su propio perfil
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

-- Los usuarios solo pueden actualizar su propio perfil
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- ============ POLÍTICAS PARA CATEGORIES ============

-- Los usuarios solo pueden ver sus propias categorías
CREATE POLICY "Users can view own categories" ON categories
  FOR SELECT USING (auth.uid() = user_id);

-- Los usuarios solo pueden insertar categorías propias
CREATE POLICY "Users can insert own categories" ON categories
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Los usuarios solo pueden actualizar sus propias categorías
CREATE POLICY "Users can update own categories" ON categories
  FOR UPDATE USING (auth.uid() = user_id);

-- Los usuarios solo pueden eliminar sus propias categorías
CREATE POLICY "Users can delete own categories" ON categories
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================================
-- FASE 6: MOTOR DE BÚSQUEDA SEMÁNTICA VECTORIAL
-- ============================================================

-- Extensión para vectores (CRÍTICO - ejecutar primero)
CREATE EXTENSION IF NOT EXISTS vector;

-- ============ TABLA NOTION_PAGES (Metadata) ============
-- Almacena información de páginas de Notion sincronizadas

DROP TABLE IF EXISTS notion_page_chunks CASCADE;
DROP TABLE IF EXISTS notion_pages CASCADE;

CREATE TABLE notion_pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  notion_page_id TEXT NOT NULL,
  title TEXT,
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  summary TEXT,
  last_edited_time TIMESTAMP WITH TIME ZONE,
  indexed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Evitar duplicados por usuario+página
  UNIQUE(user_id, notion_page_id)
);

-- Índices para optimización
CREATE INDEX IF NOT EXISTS idx_notion_pages_user ON notion_pages(user_id);
CREATE INDEX IF NOT EXISTS idx_notion_pages_category ON notion_pages(category_id);
CREATE INDEX IF NOT EXISTS idx_notion_pages_notion_id ON notion_pages(notion_page_id);
CREATE INDEX IF NOT EXISTS idx_notion_pages_last_edited ON notion_pages(last_edited_time);

-- ============ TABLA NOTION_PAGE_CHUNKS (Contenido Vectorizado) ============
-- Almacena fragmentos de texto con sus embeddings para búsqueda semántica

CREATE TABLE notion_page_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id UUID REFERENCES notion_pages(id) ON DELETE CASCADE NOT NULL,
  chunk_index INT NOT NULL,
  content TEXT NOT NULL,
  embedding VECTOR(1536), -- Dimensión para OpenAI ada-002 / similar
  token_count INT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Índice único por página + índice de chunk
  UNIQUE(page_id, chunk_index)
);

-- ============ ÍNDICE VECTORIAL (CRÍTICO PARA PERFORMANCE) ============
-- IVFFlat es más rápido para datasets medianos-grandes

CREATE INDEX IF NOT EXISTS idx_notion_chunks_embedding 
ON notion_page_chunks 
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- Índice adicional para queries por página
CREATE INDEX IF NOT EXISTS idx_notion_chunks_page ON notion_page_chunks(page_id);

-- ============ FUNCIÓN DE BÚSQUEDA SEMÁNTICA ============
-- Busca chunks similares ordenados por similitud coseno

CREATE OR REPLACE FUNCTION match_chunks(
  query_embedding VECTOR(1536),
  match_threshold FLOAT DEFAULT 0.7,
  match_count INT DEFAULT 5,
  filter_user_id UUID DEFAULT NULL,
  filter_category_ids UUID[] DEFAULT NULL
)
RETURNS TABLE(
  id UUID,
  page_id UUID,
  notion_page_id TEXT,
  page_title TEXT,
  chunk_index INT,
  content TEXT,
  similarity FLOAT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    npc.id,
    npc.page_id,
    np.notion_page_id,
    np.title AS page_title,
    npc.chunk_index,
    npc.content,
    1 - (npc.embedding <=> query_embedding) AS similarity
  FROM notion_page_chunks npc
  JOIN notion_pages np ON np.id = npc.page_id
  WHERE 
    -- Filtro por usuario (obligatorio si se especifica)
    (filter_user_id IS NULL OR np.user_id = filter_user_id)
    -- Filtro por categorías (opcional)
    AND (filter_category_ids IS NULL OR np.category_id = ANY(filter_category_ids))
    -- Filtro por umbral de similitud
    AND (1 - (npc.embedding <=> query_embedding)) > match_threshold
  ORDER BY npc.embedding <=> query_embedding
  LIMIT match_count;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============ FUNCIÓN PARA OBTENER ESTADÍSTICAS DE INDEXACIÓN ============

CREATE OR REPLACE FUNCTION get_indexing_stats(p_user_id UUID)
RETURNS TABLE(
  total_pages BIGINT,
  total_chunks BIGINT,
  last_indexed_at TIMESTAMP WITH TIME ZONE,
  categories_indexed BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(DISTINCT np.id) AS total_pages,
    COUNT(npc.id) AS total_chunks,
    MAX(np.indexed_at) AS last_indexed_at,
    COUNT(DISTINCT np.category_id) AS categories_indexed
  FROM notion_pages np
  LEFT JOIN notion_page_chunks npc ON np.id = npc.page_id
  WHERE np.user_id = p_user_id;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============ TRIGGERS ============

-- Actualizar indexed_at cuando se modifiquen los chunks
CREATE OR REPLACE FUNCTION update_page_indexed_at()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE notion_pages 
  SET indexed_at = NOW() 
  WHERE id = NEW.page_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS chunks_update_indexed_at ON notion_page_chunks;
CREATE TRIGGER chunks_update_indexed_at
  AFTER INSERT OR UPDATE ON notion_page_chunks
  FOR EACH ROW
  EXECUTE FUNCTION update_page_indexed_at();

-- ============ POLÍTICAS RLS ============

ALTER TABLE notion_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE notion_page_chunks ENABLE ROW LEVEL SECURITY;

-- Políticas para notion_pages
CREATE POLICY "Users can view own pages" ON notion_pages
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own pages" ON notion_pages
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own pages" ON notion_pages
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own pages" ON notion_pages
  FOR DELETE USING (auth.uid() = user_id);

-- Políticas para notion_page_chunks (heredan seguridad de notion_pages)
CREATE POLICY "Users can view own chunks" ON notion_page_chunks
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM notion_pages 
      WHERE notion_pages.id = notion_page_chunks.page_id 
      AND notion_pages.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own chunks" ON notion_page_chunks
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM notion_pages 
      WHERE notion_pages.id = notion_page_chunks.page_id 
      AND notion_pages.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own chunks" ON notion_page_chunks
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM notion_pages 
      WHERE notion_pages.id = notion_page_chunks.page_id 
      AND notion_pages.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own chunks" ON notion_page_chunks
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM notion_pages 
      WHERE notion_pages.id = notion_page_chunks.page_id 
      AND notion_pages.user_id = auth.uid()
    )
  );

-- ============================================================
-- INSTRUCCIONES POST-INSTALACIÓN
-- ============================================================
-- 
-- 1. Ejecuta este script en Supabase SQL Editor
-- 
-- 2. Configura Email Auth en Supabase Dashboard:
--    Authentication > Providers > Email (habilitar)
--    
-- 3. (Opcional) Configura OAuth Providers:
--    Authentication > Providers > Google/GitHub (configurar)
--
-- 4. Verifica que RLS esté habilitado:
--    Table Editor > categories > RLS Enabled ✓
--    Table Editor > notion_pages > RLS Enabled ✓
--    Table Editor > notion_page_chunks > RLS Enabled ✓
--
-- 5. Para la Fase 6 (Vectores):
--    - Verifica que la extensión vector esté habilitada
--    - Confirma que las tablas notion_pages y notion_page_chunks existen
--    - Prueba la función match_chunks() con un embedding de prueba
--
-- ============================================================
