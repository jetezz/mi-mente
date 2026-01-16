-- ============================================================
-- SCRIPT DE LIMPIEZA TOTAL DE USUARIOS
-- ============================================================
-- ⚠️ ADVERTENCIA: Esto borrará TODOS los usuarios de autenticación
-- y, gracias al "ON DELETE CASCADE", también borrará automáticamente:
-- 1. Perfiles (profiles)
-- 2. Categorías (categories)
-- 3. Páginas de Notion (notion_pages)
-- 4. Chunks Vectoriales (notion_page_chunks)
-- 5. Etiquetas (tags)
-- ============================================================

-- Opción A: Usar TRUNCATE (Más rápido, reinicia contadores si los hubiera)
TRUNCATE TABLE auth.users CASCADE;

-- Opción B: Si TRUNCATE falla por permisos, usa DELETE
-- DELETE FROM auth.users;
