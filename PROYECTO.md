# 🧠 Hybrid Brain: Documento Maestro de Ingeniería

> **Visión:** Un "Segundo Cerebro" automatizado que ingiere contenido multimedia (YouTube/Instagram), lo procesa con IA local/híbrida y lo organiza estructuradamente en Notion para consultas futuras (RAG).

---

## 1. Arquitectura de Sistemas (Híbrida)

Utilizamos un patrón de **Microservicios Híbridos** para maximizar rendimiento y eficiencia, orquestados vía **Docker**.

| Servicio | Rol | Tecnología | Responsabilidad Principal |
| :--- | :--- | :--- | :--- |
| **Frontend** | Interfaz | **Astro 5 + React** | SSR para dashboard, Static para landing. UI rápida y SEO-friendly. |
| **Orquestador** | Cerebro | **Bun + ElysiaJS** | I/O intensivo, Lógica de Negocio, Gestión de IA (Groq/Cerebras), Conexión Notion. |
| **Worker** | Músculo | **Python + FastAPI** | Tareas CPU-bound: Descarga de video (`yt-dlp`), Audio (`ffmpeg`), Transcripción (`faster-whisper`). |
| **Base de Datos** | Memoria | **Supabase** | Auth, PostgreSQL (Usuarios, Categorías Jerárquicas). |

---

## 2. Estructura del Monorepo (SOLID & Clean Architecture)

El proyecto sigue una estructura **Clean Architecture** estricta para garantizar escalabilidad.

```text
/mi-cerebro
├── docker-compose.yml          # Orquestación de todos los servicios
├── .env                        # Variables de entorno globales
├── apps/
│   ├── web/                    # [Frontend: Astro]
│   │   ├── src/components/     # UI Components
│   │   ├── src/pages/          # Rutas dashboard/
│   │   └── Dockerfile
│   │
│   ├── api-bun/                # [Backend A: Orquestador]
│   │   ├── src/
│   │   │   ├── domain/         # Entidades del negocio (User, Note)
│   │   │   ├── application/    # Casos de uso (ProcessUrl, AskBrain)
│   │   │   └── infrastructure/ # Implementaciones (NotionApi, GroqClient)
│   │   └── Dockerfile
│   │
│   └── worker-py/              # [Backend B: Procesamiento]
│       ├── app/
│       │   ├── services/       # Lógica aislada (YoutubeDownloader, WhisperTranscriber)
│       │   └── api/            # Endpoints FastAPI
│       ├── requirements.txt
│       └── Dockerfile
└── README.md
```

---

## 3. Plan de Desarrollo e Implementación

### 🚩 Fase 1: Infraestructura y Docker (La Base)
*Objetivo: Tener los 3 servicios corriendo y "hablando" entre sí.*

**Archivos Clave de Configuración:**

#### A. `docker-compose.yml` (Orquestador)
Define la red interna y volúmenes persistentes.

```yaml
version: '3.8'
services:
  # 1. Worker (Python): Descargas e IA Local
  worker-py:
    build: ./apps/worker-py
    container_name: brain-worker
    restart: always
    volumes:
      - ./apps/worker-py/models:/root/.cache/huggingface # Persistir modelos Whisper
    networks:
      - brain-network

  # 2. API (Bun): Lógica y Conexión Externa
  api-bun:
    build: ./apps/api-bun
    container_name: brain-api
    restart: always
    ports:
      - "3000:3000"
    environment:
      - WORKER_URL=http://worker-py:8000 # DNS interno de Docker
    depends_on:
      - worker-py
    networks:
      - brain-network
    
  # 3. Frontend (Astro)
  web:
    build: ./apps/web
    container_name: brain-web
    ports:
      - "4321:4321"
    networks:
      - brain-network

networks:
  brain-network:
    driver: bridge
```

#### B. Dockerfiles Específicos

*   **Worker Python (`apps/worker-py/Dockerfile`):**
    *   **Base:** `python:3.10-slim`
    *   **Clave:** Instalar `ffmpeg` (esencial para `yt-dlp` y audio).
    *   **Comando:** `uvicorn main:app --host 0.0.0.0 --port 8000`

*   **API Bun (`apps/api-bun/Dockerfile`):**
    *   **Base:** `oven/bun:1`
    *   **Comando:** `bun src/index.ts`

---

### 🎧 Fase 2: El Worker de Python (Los Oídos)
*Objetivo: API que recibe URL y devuelve Texto Transcrito.*

**Tecnologías:** `FastAPI`, `faster-whisper`, `yt-dlp`, `instaloader`.

1.  **Endpoint**: `POST /transcribe`
2.  **Lógica YouTube**:
    *   Usar `yt-dlp` para extraer solo audio (formato liviano).
    *   Procesar con `faster-whisper` (modelo `small` o `medium` para balance calidad/velocidad).
3.  **Lógica Instagram (Reto Técnico)**:
    *   Instagram bloquea scrapers.
    *   **Solución Pro:** Exportar cookies de sesión del navegador (`instaloader --login user`) a un archivo y montarlo en el contenedor de Python para autenticar las peticiones.

---

### 🧠 Fase 3: El Orquestador Bun (El Cerebro)
*Objetivo: Lógica de IA económica y conexión a Notion.*

**Tecnologías:** `ElysiaJS`, `@notionhq/client`.

1.  **Estrategia "IA Round-Robin" (Midudev Style)**:
    *   No depender de un solo proveedor.
    *   Crear un servicio agnóstico que rote entre **Groq** (Llama 3 70B - Muy rápido) y **Cerebras**.
    *   Si uno falla o llega al rate-limit, cambiar al otro automáticamente.
2.  **Gestión de Notion**:
    *   **Input**: Recibir texto plano del Worker y `categoryId`.
    *   **Processing**: Usar la IA para generar: Resumen, Puntos Clave, Etiquetas y Sentimiento.
    *   **Output**: Crear página en base de datos Notion con formato rico (H1, Bullet points) y asignar la propiedad de Categoría seleccionada.
3.  **Gestión de Categorías**:
    *   CRUD de Categorías en Supabase con soporte de jerarquía (`parent_id`).
    *   Sincronización de nombres de categorías con Notion (opcional, si se usa Select).

---

### 🎨 Fase 4: Frontend Astro (La Interfaz)
*Objetivo: UX simple y directa.*

**Tecnologías:** `Astro`, `React`, `TailwindCSS`.

1.  **Dashboard**:
    *   Status de servicios (Health check a API y Worker).
    *   Selector de **Categoría** (cargado desde Supabase).
    *   Input "Pegar Link".
    *   Barra de progreso (Descargando -> Transcribiendo -> Resumiendo -> Guardado).
3.  **Admin de Categorías**:
    *   Interfaz para crear/editar categorías y definir dependencias (Padre -> Hijo).
2.  **Auth**: Middleware de Astro con Supabase Auth Helpers.

---

### � Fase 5: RAG (Chat con tu Segundo Cerebro)
*Objetivo: Preguntar "¿Qué vi sobre arquitectura?" y responder con datos frescos de Notion.*

1.  **Recuperación de Contexto (Live)**:
    *   **Input**: Pregunta + `categoryId`.
    *   **Retrieval**:
        1.  Obtener ID de categoría y sus hijas desde Supabase.
        2.  Consultar API de Notion: Buscar páginas filtradas por esas Categorías.
        3.  Descargar contenido (bloques de texto) de las páginas encontradas.
    *   **Generation**:
        *   Limpiar y concatenar texto.
        *   Enviar como "Contexto" al LLM (Groq/Cerebras) junto con la pregunta.
        *   *Nota: Se aprovecha la gran ventana de contexto de los modelos actuales (Llama 3, etc) para evitar bases de datos vectoriales complejas al inicio.*

---

## 4. Guía de Comandos Rápidos

**Setup Inicial:**
```bash
# Crear estructura
mkdir -p apps/web apps/api-bun apps/worker-py

# Python Worker Deps
# apps/worker-py/requirements.txt
fastapi
uvicorn
yt-dlp
faster-whisper
instaloader
torch

# Bun Deps
cd apps/api-bun
bun add elysia @notionhq/client @supabase/supabase-js

# Levantar Todo
docker-compose up --build
docker-compose down && docker-compose up --build
docker-compose restart

docker builder prune -f && \
docker-compose build --no-cache web && \
docker-compose up --build

docker-compose logs -f

# para resetear variables de entorno
docker-compose down && docker-compose up -d
```

**Referencias y Recursos:**
*   **Video Midudev:** Implementación de rotación de claves API para IA gratuita.
*   **Faster-Whisper:** [GitHub](https://github.com/SYSTRAN/faster-whisper)
*   **Astro + Supabase:** Guías oficiales de integración SSR.

---

## 🔮 Fase 6: Motor de Búsqueda Semántica (Vectores en Supabase)

> **Visión:** Notion NO debe ser tu motor de búsqueda. Supabase SÍ debe ser tu motor de recuperación semántica. La IA solo debe ver contexto ya filtrado.

**Flujo Principal:**
```
Notion → Indexación → Supabase Vectorial → Query → IA → (opcional) Notion
```

---

### 6.1 Estructura de Datos Vectorial en Supabase

**Extensión requerida:**
```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

#### A. Tabla `notion_pages` (Metadata)
Contiene metadata de la página, NO texto largo.

```sql
CREATE TABLE notion_pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  notion_page_id TEXT UNIQUE NOT NULL,
  title TEXT,
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  summary TEXT,
  last_edited_time TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);
```

**Responsabilidad:**
- Identificar la página original en Notion
- Clasificar por categoría
- Facilitar filtros previos al búsqueda vectorial

#### B. Tabla `notion_page_chunks` (Contenido Vectorizado)
Aquí vive el contenido fragmentado y sus embeddings.

```sql
CREATE TABLE notion_page_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id UUID REFERENCES notion_pages(id) ON DELETE CASCADE,
  chunk_index INT,
  content TEXT NOT NULL,
  embedding VECTOR(1536), -- OpenAI ada-002 o similar
  created_at TIMESTAMP DEFAULT NOW()
);
```

**Índice vectorial (CRÍTICO para performance):**
```sql
CREATE INDEX ON notion_page_chunks
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);
```

#### C. Por qué esta estructura
- **Separación documento/fragmentos:** Permite reindexar chunks sin tocar metadata
- **Filtros previos:** Puedes filtrar por `category_id` antes de buscar vectorialmente
- **Escalabilidad:** Compatible con miles de páginas
- **Agnóstico al modelo:** Funciona con cualquier proveedor de embeddings

---

### 6.2 Pipeline de Indexación (OFFLINE)

> ⚠️ Este proceso NO ocurre cuando el usuario pregunta. Es un job en background.

**Flujo:**
```
Notion API → Texto → Chunking → Embeddings → Supabase (pages + chunks)
```

#### Paso 1: Leer páginas desde Notion
```typescript
// Obtener página con ID, título y bloques
const page = await notion.pages.retrieve({ page_id });
const blocks = await notion.blocks.children.list({ block_id: page_id });
```

#### Paso 2: Normalizar contenido
- Convertir bloques Notion → texto plano estructurado
- Eliminar: Headers redundantes, elementos decorativos
- Mantener: Párrafos, listas, subtítulos

#### Paso 3: Chunking
Dividir el texto en fragmentos de:
- **300–800 tokens** por chunk
- Solape opcional: 50 tokens (para contexto)

```typescript
const chunks = splitIntoChunks(normalizedText, {
  maxTokens: 600,
  overlap: 50
});
```

#### Paso 4: Generar Embeddings
Para cada chunk:
```typescript
const embedding = await openai.embeddings.create({
  model: "text-embedding-ada-002",
  input: chunk.content
});
```

**Alternativas gratuitas:**
- Groq (si disponible)
- Sentence-Transformers local
- Cohere Embed

#### Paso 5: Persistir en Supabase
```typescript
// Upsert página
await supabase.from('notion_pages').upsert({
  notion_page_id: page.id,
  title: page.properties.Name,
  category_id,
  summary: generatedSummary
});

// Insertar chunks
await supabase.from('notion_page_chunks').insert(
  chunks.map((chunk, i) => ({
    page_id: notionPage.id,
    chunk_index: i,
    content: chunk.text,
    embedding: chunk.embedding
  }))
);
```

**Resultado:** Supabase queda como índice semántico persistente.

---

### 6.3 Pipeline de Recuperación (QUERY TIME)

> ✅ Este flujo SÍ ocurre cuando el usuario pregunta.

**Flujo:**
```
Pregunta usuario → Embedding → Búsqueda vectorial Supabase → Contexto relevante → IA
```

#### Paso 1: Embedding de la pregunta
```typescript
const questionEmbedding = await embed(userQuestion);
```

#### Paso 2: Búsqueda vectorial en Supabase
```sql
SELECT
  npc.content,
  np.title,
  np.notion_page_id,
  1 - (npc.embedding <=> :question_embedding) AS similarity
FROM notion_page_chunks npc
JOIN notion_pages np ON np.id = npc.page_id
WHERE np.category_id IN (:category_ids) -- Filtro opcional por categoría
ORDER BY npc.embedding <=> :question_embedding
LIMIT 5;
```

**Nota:** `<=>` es el operador de distancia coseno en pgvector.

#### Paso 3: Construcción del contexto
```typescript
const context = relevantChunks
  .map(chunk => `## ${chunk.title}\n${chunk.content}`)
  .join('\n\n---\n\n');
```

#### Paso 4: Llamada a la IA
```typescript
const response = await llm.chat({
  system: `Responde basándote ÚNICAMENTE en el siguiente contexto:\n\n${context}`,
  user: userQuestion
});
```

**La IA recibe:**
- ✅ Pregunta
- ✅ Contexto filtrado y relevante

**La IA NUNCA recibe:**
- ❌ Todas las páginas
- ❌ Notion completo

---

### 6.4 Comunicación con Notion (Cuándo y Por Qué)

#### ❌ Cuándo NO llamar a Notion
- Para responder preguntas
- Para buscar información
- Para ranking semántico

> Eso ya lo hace Supabase vectorial.

#### ✅ Cuándo SÍ llamar a Notion

**Caso 1: Mostrar página original**
Después de responder, ofrecer link a la fuente:
```typescript
const notionUrl = `https://notion.so/${notionPageId.replace(/-/g, '')}`;
```

**Caso 2: Actualización de contenido (Re-indexación)**
Disparadores:
- Webhook de Notion (cambio detectado)
- Cron job programado
- Botón manual en dashboard

```
Notion cambia → Reindexar página → Actualizar embeddings en Supabase
```

**Caso 3: Recuperación completa bajo demanda**
Si el usuario pide: "Muéstrame el documento completo"
- Sabemos qué página es (tenemos `notion_page_id`)
- La traemos de Notion directamente
- La mostramos (NO la pasamos a la IA)

---

### 6.5 Diagrama de Flujos

```
┌─────────────────────────────────────────────────────────┐
│                   INDEXACIÓN (Offline)                  │
├─────────────────────────────────────────────────────────┤
│  Notion API ──► Texto ──► Chunks ──► Embeddings         │
│                                         │               │
│                                         ▼               │
│                                    Supabase             │
│                              (pages + chunks)           │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│                  RECUPERACIÓN (Query)                   │
├─────────────────────────────────────────────────────────┤
│  Usuario ──► Embedding ──► Búsqueda Vectorial           │
│                                   │                     │
│                                   ▼                     │
│                          Top-K Chunks                   │
│                                   │                     │
│                                   ▼                     │
│                     Contexto ──► LLM ──► Respuesta      │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│              COMUNICACIÓN CON NOTION                    │
├─────────────────────────────────────────────────────────┤
│  Supabase identifica página                             │
│         │                                               │
│         ├──► Mostrar link original                      │
│         ├──► Re-indexar si hay cambios                  │
│         └──► Recuperar documento completo (bajo demanda)│
└─────────────────────────────────────────────────────────┘
```

---

### 6.6 Conclusión Técnica

| Componente | Rol |
|------------|-----|
| **Supabase** | Motor semántico (vectores) |
| **Notion** | Fuente de verdad (datos originales) |
| **IA** | Razonador, NO buscador |
| **Vectorización** | Proceso offline |
| **Query** | Ligero y rápido |

**Beneficios de esta arquitectura:**
- ✅ Escala a miles de documentos
- ✅ Reduce costos de API
- ✅ Mejora precisión de recuperación
- ✅ Evita dependencias innecesarias de Notion en tiempo real
