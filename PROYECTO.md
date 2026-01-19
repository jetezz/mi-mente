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
| **Base de Datos** | Memoria | **Supabase** | Auth, PostgreSQL (Usuarios, Categorías Jerárquicas, Vectores). |

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
    *   **Management**:
    *   **Categorías (Usuario)**: El usuario selecciona o crea la categoría (jerárquica) en el Dashboard antes de guardar. Esto organiza la página en Notion.
    *   **Tags (Sistema)**: La IA genera automáticamente etiquetas (Vectors/Supabase) invisibles para el usuario en el flujo de creación, pero útiles para búsqueda y filtrado posterior.
    *   **Output**: Crear página en Notion con propiedades `Category` (Select) y `Tags` (Multi-select).

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

### 💬 Fase 5: RAG (Chat con tu Segundo Cerebro)
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

#### D. Tabla `tags` (Diccionario de Etiquetas)
Tags únicos per-usuario, generados automáticamente por la IA.

```sql
CREATE TABLE tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, name) -- Un tag por nombre por usuario
);
```

#### E. Tabla `page_tags` (Relación N:M)
Conecta páginas con sus tags asociados.

```sql
CREATE TABLE page_tags (
  page_id UUID REFERENCES notion_pages(id) ON DELETE CASCADE,
  tag_id UUID REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (page_id, tag_id)
);
```

**Responsabilidad:**
- **`tags`**: Diccionario normalizado de etiquetas únicas
- **`page_tags`**: Relación muchos-a-muchos (una página puede tener múltiples tags, un tag puede estar en múltiples páginas)
- **Beneficio**: Evita duplicados y permite consultas eficientes por tag

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

#### Paso 6: Sincronizar Tags
Extraer tags de Notion y persistirlos normalizados.

```typescript
// Extraer tags de la página de Notion
const pageTags = extractTags(notionPage); // ['javascript', 'react', 'tutorial']

// Upsert cada tag en el diccionario
for (const tagName of pageTags) {
  // Crear o recuperar tag existente
  const { data: existingTag } = await supabase
    .from('tags')
    .select('id')
    .eq('user_id', userId)
    .eq('name', tagName)
    .single();

  const tagId = existingTag?.id || (await supabase
    .from('tags')
    .insert({ user_id: userId, name: tagName })
    .select('id')
    .single()).data.id;

  // Crear relación página-tag
  await supabase.from('page_tags').upsert({
    page_id: notionPage.id,
    tag_id: tagId
  });
}
```

**Resultado:** Supabase queda como índice semántico persistente con tags normalizados.

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

---

## 🚀 Fase 7: Streaming de Respuestas IA (Yield)

> **Objetivo:** Las respuestas de la IA se muestran de forma progresiva en tiempo real (como ChatGPT), mejorando la experiencia de usuario.

### 7.1 Arquitectura de Streaming

**Tecnología:** Server-Sent Events (SSE) para comunicación unidireccional servidor→cliente.

```
Usuario pregunta → API recibe → LLM genera (stream) → SSE → UI actualiza token-a-token
```

### 7.2 Cambios en el Backend (api-bun)

#### A. Cliente de IA con Streaming
```typescript
// Nuevo método en ai-client.ts
async *streamChat(systemPrompt: string, userMessage: string): AsyncGenerator<string> {
  const response = await groq.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userMessage }
    ],
    stream: true
  });

  for await (const chunk of response) {
    const content = chunk.choices[0]?.delta?.content;
    if (content) yield content;
  }
}
```

#### B. Endpoint SSE
```typescript
.get('/ask/stream', async function* ({ query }) {
  const { question, categoryId, userId } = query;
  
  // Headers para SSE
  yield { data: JSON.stringify({ type: 'start' }) };
  
  // Buscar contexto
  const chunks = await semanticSearch.search(userId, question);
  yield { data: JSON.stringify({ type: 'context', sources: chunks }) };
  
  // Stream de respuesta
  for await (const token of aiClient.streamChat(context, question)) {
    yield { data: JSON.stringify({ type: 'token', content: token }) };
  }
  
  yield { data: JSON.stringify({ type: 'end' }) };
})
```

### 7.3 Cambios en el Frontend

#### A. Hook de Streaming
```typescript
function useStreamingChat() {
  const [tokens, setTokens] = useState<string[]>([]);
  
  const askWithStream = async (question: string) => {
    const eventSource = new EventSource(`/ask/stream?question=${encodeURIComponent(question)}`);
    
    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'token') {
        setTokens(prev => [...prev, data.content]);
      }
    };
  };
  
  return { tokens: tokens.join(''), askWithStream };
}
```

### 7.4 Aplicación en Componentes

- **ChatInterface.tsx**: Mostrar respuesta progresiva con cursor parpadeante
- **Dashboard.tsx**: Mostrar resumen generándose en tiempo real durante el procesamiento

---

## 📝 Fase 8: Nuevo Flujo de Subida a Notion (Control de Usuario)

> **Objetivo:** El usuario tiene control total sobre el contenido antes de guardarlo en Notion, incluyendo edición, etiquetas manuales e indexación opcional.

### 8.1 Nuevo Flujo de Proceso

```
┌────────────────────────────────────────────────────────────────┐
│                    FLUJO DE SUBIDA MEJORADO                    │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  1. INPUT                                                      │
│     ├─► URL de YouTube/Instagram                               │
│     └─► Prompt personalizado para la IA (NUEVO, opcional)      │
│         "Céntrate en los puntos técnicos, ignora bromas..."    │
│                                                                │
│  2. PROCESAMIENTO (igual que antes)                            │
│     URL → Descarga → Transcripción → IA genera resumen         │
│     ⚠️ La IA genera TAGS automáticamente (invisible para usuar)│
│                                                                │
│  3. PREVIEW (NUEVO)                                            │
│     ├─► Mostrar resultado en Markdown renderizado              │
│     ├─► Editor de contenido WYSIWYG/Markdown                   │
│     └─► El usuario puede modificar todo                        │
│                                                                │
│  4. CATEGORIZACIÓN (Usuario)                                   │
│     ├─► Selector de CATEGORÍA (desde Supabase)                 │
│     ├─► Opción de crear nueva categoría                        │
│     └─► Las TAGS se manejan internamente por el sistema        │
│                                                                │
│  5. GUARDAR EN NOTION                                          │
│     └─► Contenido + Categoría (Usuario) + Tags (AI) → Notion   │
│                                                                │
│  6. MODAL POST-GUARDADO (NUEVO)                                │
│     ├─► "¿Quieres indexar este contenido para búsqueda?"       │
│     ├─► [Sí, indexar] → Llama a /index/page/:id                │
│     └─► [No, omitir] → Cierra modal                            │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

### 8.2 Componentes Nuevos Necesarios

#### A. `PromptInput.tsx`
Input de texto para instrucciones personalizadas a la IA.

```typescript
interface PromptInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}
```

#### B. `MarkdownPreview.tsx`
Visualizador de Markdown con soporte para edición.

```typescript
interface MarkdownPreviewProps {
  content: string;
  editable?: boolean;
  onChange?: (content: string) => void;
}
```

#### C. `CategorySelector.tsx`
Selector de categoría (existente) reutilizado para el flujo de guardado.

#### D. `IndexingModal.tsx`
Modal de confirmación post-guardado.

```typescript
interface IndexingModalProps {
  isOpen: boolean;
  notionPageId: string;
  onIndex: () => Promise<void>;
  onSkip: () => void;
}
```

### 8.3 Cambios en el Backend

### 8.3 Cambios en el Backend

#### A. Nuevo endpoint `/process/stream-preview` (Server-Sent Events)
Procesa URL, descarga, transcribe y genera resumen mediante streaming.

```typescript
// GET /process/stream-preview?url=...
// Returns SSE events:
// - type: 'status' (step updates)
// - type: 'token' (summary generation)
// - type: 'result' (final data for preview)
```

#### B. Nuevo endpoint `/process/preview` (Legacy/Optional)
Reemplazado por streaming para mejor experiencia, pero la lógica de negocio subyacente se mantiene.

#### C. Modificar `/process` para aceptar contenido editado
```typescript
.post('/process/save', async ({ body }) => {
  const { 
    url, 
    title, 
    markdown,     // Contenido Markdown completo del editor (BlockNote)
    tags,         // Tags seleccionados manualmente
    saveToNotion 
  } = body;
  
  // Guardar en Notion usando el Markdown proporcionado
  const notionPage = await notionClient.createPageFromMarkdown({
    title,
    markdown,
    tags,
    sourceUrl: url
  });
  
  return { success: true, notionPageId: notionPage.id };
})
```

#### B. Modificar `/process` para aceptar contenido editado
```typescript
.post('/process/save', async ({ body }) => {
  const { 
    url, 
    title, 
    content,      // Markdown editado por el usuario
    tags,         // Tags seleccionados manualmente
    saveToNotion 
  } = body;
  
  // Guardar en Notion con el contenido del usuario
  const notionPage = await notionClient.createPageFromMarkdown({
    title,
    content,
    tags,
    url
  });
  
  return { success: true, notionPageId: notionPage.id };
})
```


---

## 🎨 Fase 9: Unificación de Estilos y Componentes UI

> **Objetivo:** Crear un sistema de diseño consistente con componentes reutilizables para todas las páginas principales.

### 9.1 Análisis de Inconsistencias Actuales

| Página | max-width | Layout Grid | Sidebar |
|--------|-----------|-------------|---------|
| `/dashboard` | `max-w-4xl` | 3/1 | Status + Tips |
| `/chat` | `max-w-5xl` | 3/1 | Status + Cómo funciona |
| `/indexing` | `max-w-6xl` | 3/1 | Status + Arquitectura |

### 9.2 Nuevo Sistema de Componentes

#### A. `PageLayout.astro`
Layout reutilizable para todas las páginas de la app.

```astro
---
interface Props {
  title: string;
  subtitle?: string;
  badge?: string;
  maxWidth?: 'md' | 'lg' | 'xl' | '2xl';
}
---

<Layout title={title}>
  <Header />
  <main class="min-h-screen py-8 px-4 sm:px-6 lg:px-8">
    <div class={`mx-auto ${maxWidthClass}`}>
      <!-- Page Header -->
      <PageHeader title={title} subtitle={subtitle} badge={badge} />
      
      <!-- Content Grid -->
      <div class="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <slot name="main" /> <!-- 3 cols -->
        <slot name="sidebar" /> <!-- 1 col -->
      </div>
    </div>
  </main>
</Layout>
```

#### B. `SidebarCard.tsx`
Card reutilizable para sidebar.

```typescript
interface SidebarCardProps {
  icon: string;
  title: string;
  children: React.ReactNode;
}
```

#### C. `QuickActions.tsx`
Navegación rápida reutilizable.

```typescript
interface QuickAction {
  icon: string;
  label: string;
  href: string;
}
```

### 9.3 Estilos Unificados

- **max-width**: Todas las páginas usan `max-w-5xl`
- **Grid**: `lg:grid-cols-4` con main `lg:col-span-3`
- **Spacing**: `gap-8` consistente
- **Cards**: Usar clase `.card` de global.css

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

## 10. Fase 10: Ajustes de Búsqueda Semántica

> **Objetivo:** Permitir ajustar dinámicamente el threshold de similitud y mostrar porcentaje de coincidencia en las respuestas.

### 10.1 Visión General

La búsqueda semántica utiliza un **threshold de similitud** para determinar qué chunks son relevantes. Un threshold más bajo captura más resultados (pero menos precisos), mientras que uno más alto es más selectivo.

### 10.2 Cambios Implementados

#### A. Frontend (`ChatInterface.tsx`)
```typescript
// Estado para threshold dinámico
const [threshold, setThreshold] = useState(() => {
  const saved = localStorage.getItem('semanticThreshold');
  return saved ? parseFloat(saved) : 0.5;
});

// Slider de control
<input
  type="range"
  min="0.1"
  max="0.9"
  step="0.1"
  value={threshold}
  onChange={(e) => setThreshold(parseFloat(e.target.value))}
/>
```

#### B. Hook de Streaming (`useStreamingChat.ts`)
```typescript
// Añadir threshold a las opciones
interface UseStreamingChatOptions {
  threshold?: number;  // 0.1 - 0.9
}

// Pasar al endpoint
params.append('threshold', String(threshold));
```

#### C. Backend (`index.ts`)
```typescript
.get('/ask/semantic/stream', async function* ({ query }) {
  const threshold = parseFloat(query.threshold as string) || 0.5;
  
  const chunks = await semanticSearch.searchChunksOnly(userId, question, {
    similarityThreshold: threshold,
  });
})
```

### 10.3 Visualización de Similitud

Las fuentes muestran el porcentaje de coincidencia con colores indicativos:
- 🟢 **Verde (>70%):** Alta relevancia
- 🟡 **Amarillo (50-70%):** Relevancia moderada  
- 🔴 **Rojo (<50%):** Baja relevancia

```typescript
function getSimilarityColor(similarity: number): string {
  if (similarity >= 0.7) return 'text-green-400';
  if (similarity >= 0.5) return 'text-yellow-400';
  return 'text-red-400';
}
```

### 10.4 Persistencia

El valor del threshold se guarda en `localStorage` para mantener preferencias del usuario entre sesiones.

---

## 🔄 Fase 11: Sistema de Cola de Procesamiento en Segundo Plano

> **Objetivo:** Permitir procesar múltiples videos de YouTube sin esperar a que termine cada uno, separando el procesamiento de la edición y guardado en Notion.

### 11.1 Problema y Solución

**Problema Actual:**
El Dashboard actual procesa videos de forma síncrona: hay que esperar a que termine todo (descarga → transcripción → resumen → guardado) antes de poder procesar el siguiente.

**Solución:**
Implementar un sistema de cola que:
1. Encole videos para procesamiento en segundo plano
2. Permita agregar múltiples videos sin esperar
3. Muestre estado de todos los jobs en una nueva vista
4. Separe la edición/guardado del procesamiento

### 11.2 Nuevo Flujo de Usuario

```
┌─────────────────────────────────────────────────────────────────────────┐
│                     FLUJO CON COLA DE PROCESAMIENTO                      │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  1. INPUT (Dashboard)                                                    │
│     ├─► Usuario pega URL + prompt opcional                               │
│     └─► Click "Procesar" → Job encolado (inmediato)                     │
│                                                                          │
│  2. PROCESAMIENTO EN SEGUNDO PLANO                                       │
│     ├─► Job se ejecuta en background                                     │
│     ├─► Usuario puede agregar más videos                                 │
│     └─► Estado guardado en Supabase (processing_jobs)                   │
│                                                                          │
│  3. VISTA DE COLA (/jobs)                                               │
│     ├─► Lista de jobs con estados:                                       │
│     │   • ⏳ pending      • 🔄 processing                                │
│     │   • ✅ ready        • 💾 saved      • ❌ failed                    │
│     └─► Click en job "ready" → Abre editor                              │
│                                                                          │
│  4. EDITOR DE RESUMEN (/jobs/:id)                                       │
│     ├─► Ver/editar resumen generado                                      │
│     ├─► Seleccionar categoría                                            │
│     └─► Guardar → Sube a Notion + Modal de indexación                   │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### 11.3 Arquitectura Técnica

**Solución elegida:** Supabase + Background Worker + Polling

| Componente | Tecnología | Rol |
|------------|------------|-----|
| Cola | Tabla `processing_jobs` (Supabase) | Persistencia de jobs |
| API | Endpoints `/jobs/*` (Bun) | CRUD de jobs |
| Worker | Background process (Bun) | Procesa jobs pendientes |
| Frontend | Polling cada 5s | Actualiza estado en UI |

**¿Por qué no BullMQ/Inngest?**
- Requieren infraestructura adicional (Redis/cloud)
- Nuestra solución usa Supabase existente = zero overhead

### 11.4 Schema de Base de Datos

```sql
CREATE TABLE processing_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  
  -- Input
  url TEXT NOT NULL,
  custom_prompt TEXT,
  
  -- Status
  status VARCHAR(20) DEFAULT 'pending' CHECK (
    status IN ('pending', 'downloading', 'transcribing', 'summarizing', 'ready', 'saved', 'failed')
  ),
  progress INT DEFAULT 0,
  current_step TEXT,
  error_message TEXT,
  
  -- Output (cuando status = 'ready')
  video_title TEXT,
  video_thumbnail TEXT,
  video_duration INT,
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
  retry_count INT DEFAULT 0
);
```

### 11.5 Endpoints API

| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `/jobs` | POST | Crear nuevo job (encolar) |
| `/jobs` | GET | Listar jobs del usuario |
| `/jobs/:id` | GET | Detalle de job específico |
| `/jobs/:id/save` | POST | Guardar en Notion |
| `/jobs/:id` | DELETE | Eliminar job |
| `/jobs/:id/retry` | POST | Reintentar job fallido |

### 11.6 Servicio JobProcessor

```typescript
// apps/api-bun/src/application/job-processor.ts
class JobProcessor {
  private isRunning = false;
  private pollInterval = 5000; // 5 segundos
  
  async start() {
    this.isRunning = true;
    while (this.isRunning) {
      const job = await this.getNextPendingJob();
      if (job) {
        await this.processJob(job);
      }
      await Bun.sleep(this.pollInterval);
    }
  }
  
  async processJob(job: ProcessingJob) {
    // 1. Marcar como 'downloading'
    await this.updateStatus(job.id, 'downloading', 10);
    
    // 2. Descargar video (worker-py)
    const transcription = await workerClient.transcribe(job.url);
    await this.updateStatus(job.id, 'transcribing', 40);
    
    // 3. Generar resumen (IA)
    const summary = await aiClient.summarize(transcription);
    await this.updateStatus(job.id, 'summarizing', 70);
    
    // 4. Generar puntos clave y tags
    const keyPoints = await aiClient.extractKeyPoints(transcription);
    const tags = await aiClient.generateTags(transcription);
    
    // 5. Guardar resultado y marcar como 'ready'
    await this.saveResult(job.id, { summary, keyPoints, tags });
    await this.updateStatus(job.id, 'ready', 100);
  }
}
```

### 11.7 Componentes Frontend

#### A. Página `/jobs` (Vista de Cola)
```astro
---
import AppLayout from '../layouts/AppLayout.astro';
import JobsList from '../components/jobs/JobsList.tsx';
---
<AppLayout title="Cola de Procesamiento">
  <JobsList client:load />
</AppLayout>
```

#### B. Componente `JobCard.tsx`
```typescript
interface JobCardProps {
  job: ProcessingJob;
  onEdit: () => void;
  onDelete: () => void;
  onRetry: () => void;
}

// Muestra: thumbnail, título, estado, progreso, acciones
```

#### C. Hook `useJobs.ts`
```typescript
function useJobs() {
  const [jobs, setJobs] = useState<ProcessingJob[]>([]);
  
  // Polling solo si hay jobs activos
  useEffect(() => {
    const hasActiveJobs = jobs.some(j => 
      ['pending', 'downloading', 'transcribing', 'summarizing'].includes(j.status)
    );
    if (hasActiveJobs) {
      const interval = setInterval(fetchJobs, 5000);
      return () => clearInterval(interval);
    }
  }, [jobs]);
  
  return { jobs, createJob, deleteJob, retryJob };
}
```

### 11.8 Estados del Job

| Estado | Icono | Progress | Descripción |
|--------|-------|----------|-------------|
| `pending` | ⏳ | 0% | En cola, esperando |
| `downloading` | 📥 | 10-30% | Descargando audio |
| `transcribing` | 🎧 | 30-60% | Whisper procesando |
| `summarizing` | 🤖 | 60-90% | IA generando resumen |
| `ready` | ✅ | 100% | Listo para revisar |
| `saved` | 💾 | 100% | Guardado en Notion |
| `failed` | ❌ | Variable | Error (puede reintentar) |

### 11.9 Diagrama de Secuencia

```
Usuario          Frontend         API-Bun         Supabase        Worker-Py
   │                │                │                │                │
   │──POST /jobs───►│───────────────►│───INSERT──────►│                │
   │                │◄──{id,status}──│◄───────────────│                │
   │◄──"Encolado"───│                │                │                │
   │                │                │                │                │
   │  (puede seguir agregando videos)                 │                │
   │                │                │                │                │
   │                │      [Background Processor]     │                │
   │                │                │───SELECT───────►│                │
   │                │                │◄──job pending──│                │
   │                │                │────────────────────────GET ────►│
   │                │                │◄───────────────────transcription─│
   │                │                │───UPDATE───────►│                │
   │                │                │ (status=ready)  │                │
   │                │                │                │                │
   │──GET /jobs────►│───────────────►│───SELECT───────►│                │
   │◄──[jobs list]──│◄───────────────│◄───────────────│                │
```
