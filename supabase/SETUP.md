# 🗄️ Configuración de Supabase para Hybrid Brain

Esta guía te ayudará a configurar correctamente Supabase para el proyecto Hybrid Brain, incluyendo el motor de búsqueda semántica vectorial (Fase 6).

---

## 📋 Requisitos Previos

1. Una cuenta en [Supabase](https://supabase.com)
2. Un proyecto creado en Supabase
3. Acceso al SQL Editor del proyecto

---

## 🚀 Configuración Paso a Paso

### Paso 1: Obtener Credenciales

1. Ve a tu proyecto en [Supabase Dashboard](https://app.supabase.com)
2. Navega a **Settings → API**
3. Copia los siguientes valores a tu archivo `.env`:

```env
# URL del proyecto (Project URL)
SUPABASE_URL=https://tu-proyecto.supabase.co

# Clave anónima pública (anon/public key)
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Clave de servicio (service_role key) - ¡MANTENER SECRETA!
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

> ⚠️ **IMPORTANTE**: La `service_role key` tiene acceso total a tu base de datos. Nunca la expongas en el frontend.

---

### Paso 2: Ejecutar el Schema SQL

1. Ve a **SQL Editor** en el panel de Supabase
2. Crea una nueva query
3. Copia y pega el contenido completo de `supabase/schema.sql`
4. Ejecuta la query (botón "Run")

---

### Paso 3: Verificar la Instalación

Ejecuta estas consultas para verificar que todo está correctamente configurado:

#### 3.1 Verificar extensión pgvector
```sql
SELECT * FROM pg_extension WHERE extname = 'vector';
```
✅ Debe devolver una fila con `extname = 'vector'`

#### 3.2 Verificar tablas base
```sql
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('profiles', 'categories');
```
✅ Debe devolver: `profiles`, `categories`

#### 3.3 Verificar tablas vectoriales (Fase 6)
```sql
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('notion_pages', 'notion_page_chunks');
```
✅ Debe devolver: `notion_pages`, `notion_page_chunks`

#### 3.4 Verificar función de búsqueda semántica
```sql
SELECT routine_name FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name = 'match_chunks';
```
✅ Debe devolver: `match_chunks`

#### 3.5 Verificar función de estadísticas
```sql
SELECT routine_name FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name = 'get_indexing_stats';
```
✅ Debe devolver: `get_indexing_stats`

#### 3.6 Verificar índice vectorial
```sql
SELECT indexname FROM pg_indexes 
WHERE tablename = 'notion_page_chunks' 
AND indexname LIKE '%embedding%';
```
✅ Debe devolver un índice con nombre que contenga "embedding"

#### 3.7 Verificar políticas RLS
```sql
SELECT tablename, policyname FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename IN ('notion_pages', 'notion_page_chunks');
```
✅ Debe devolver 8 políticas (4 por tabla: select, insert, update, delete)

---

### Paso 4: Crear Usuario de Prueba (Opcional)

Si no tienes usuarios aún, puedes:

1. Ir a **Authentication → Users**
2. Click en "Add user"
3. Usar email/password o configurar OAuth

O ejecutar desde la aplicación (página `/register`).

---

## 🔧 Solución de Problemas

### Error: "extension vector does not exist"

Si pgvector no está disponible, necesitas habilitarlo:

1. Ve a **Database → Extensions**
2. Busca "vector"
3. Activa la extensión

O ejecuta:
```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

### Error: "function match_chunks does not exist"

Vuelve a ejecutar la sección de funciones del `schema.sql`, específicamente:

```sql
-- Busca esta sección en schema.sql
CREATE OR REPLACE FUNCTION match_chunks(...)
```

### Error: "permission denied for table notion_pages"

Las políticas RLS no están correctamente configuradas. Ejecuta:

```sql
-- Habilitar RLS
ALTER TABLE notion_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE notion_page_chunks ENABLE ROW LEVEL SECURITY;

-- Luego ejecuta las políticas del schema.sql
```

### Error: "column embedding does not exist"

La tabla no tiene la columna vectorial. Verifica con:
```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'notion_page_chunks';
```

Si falta la columna `embedding`, recrear la tabla o añadirla:
```sql
ALTER TABLE notion_page_chunks 
ADD COLUMN IF NOT EXISTS embedding vector(1536);
```

---

## 📊 Estructura de Datos

### Tabla: notion_pages
Almacena metadata de las páginas de Notion indexadas.

| Columna | Tipo | Descripción |
|---------|------|-------------|
| id | UUID | ID único (PK) |
| user_id | UUID | Usuario propietario (FK → auth.users) |
| notion_page_id | TEXT | ID original de Notion |
| title | TEXT | Título de la página |
| category_id | UUID | Categoría asociada (FK → categories) |
| summary | TEXT | Resumen del contenido |
| last_edited_time | TIMESTAMP | Última edición en Notion |
| indexed_at | TIMESTAMP | Cuándo se indexó |

### Tabla: notion_page_chunks
Almacena los fragmentos de texto con sus embeddings vectoriales.

| Columna | Tipo | Descripción |
|---------|------|-------------|
| id | UUID | ID único (PK) |
| page_id | UUID | Página padre (FK → notion_pages) |
| chunk_index | INT | Índice del fragmento |
| content | TEXT | Texto del fragmento |
| embedding | VECTOR(1536) | Embedding vectorial |
| token_count | INT | Número de tokens aprox. |

---

## 🔐 Seguridad (RLS)

Todas las tablas tienen **Row Level Security** habilitado:

- Los usuarios solo pueden ver/modificar **sus propios datos**
- El filtro es por `user_id = auth.uid()`
- Las operaciones CRUD están protegidas

---

## 🎯 Próximos Pasos

Una vez verificado todo:

1. **Añadir COHERE_API_KEY** a tu `.env` (obtener en https://dashboard.cohere.ai)
2. **Reiniciar Docker**: `docker-compose restart api-bun`
3. **Ir a `/indexing`** en el frontend
4. **Click en "Re-indexar Todo"** para indexar tu contenido de Notion
5. **Probar en `/chat`** con el modo semántico (🔮) activo

---

## 📝 Notas Importantes

### Sobre Storage → Vectors (NO lo usamos)

El panel de Supabase muestra una sección "Vectors" bajo Storage. **Esto NO es lo que usamos**. Esa es una característica diferente llamada "Supabase Vecs" para almacenar vectores en buckets de archivos.

Nuestra implementación usa **pgvector**, que almacena los vectores directamente en tablas de PostgreSQL. No necesitas crear ningún bucket.

### Límites de pgvector

- Dimensión máxima recomendada: 2000
- Nuestra implementación usa 1536 (compatible con OpenAI/Cohere)
- El índice IVFFlat requiere al menos 100 filas para ser efectivo

### Costos

- pgvector está incluido en todos los planes de Supabase (incluyendo gratuito)
- El uso de la extensión no tiene costo adicional
- El almacenamiento de vectores cuenta como almacenamiento normal de PostgreSQL

---

## 🆘 Soporte

Si encuentras problemas:

1. Revisa los logs de Docker: `docker-compose logs api-bun`
2. Verifica las credenciales en `.env`
3. Asegúrate de que el schema está completamente ejecutado
4. Consulta la [documentación de pgvector](https://github.com/pgvector/pgvector)
