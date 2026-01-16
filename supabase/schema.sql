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
--
-- ============================================================
