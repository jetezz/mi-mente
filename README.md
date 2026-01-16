# 🧠 Hybrid Brain

> Tu sistema de "Segundo Cerebro" automatizado y potenciado por IA.

Este proyecto integra **Astro (Frontend)**, **Bun (Orquestador)** y **Python (Procesamiento IA)** para ingerir contenido multimedia, transcribirlo, resumirlo y organizarlo en **Notion**, permitiendo consultas futuras mediante **RAG**.

---

## 🚦 Resumen de Progreso

| Fase | Descripción | Progreso |
| :--- | :--- | :---: |
| **Fase 1** | Infraestructura & Docker | ✅ 100% |
| **Fase 2** | Worker Python (Los Oídos) | 🟡 60% |
| **Fase 3** | Orquestador Bun (El Cerebro) | 🟡 80% |
| **Fase 4** | Frontend Astro (La Cara) + Auth | 🟡 85% |
| **Fase 5** | Chat con Notion (La Memoria) | ✅ 100% |
| **Fase 6** | Motor Semántico Vectorial (El Cerebro 2.0) | 🟢 90% |
| **Fase 7** | Streaming de Respuestas IA (Yield) | ✅ 100% |
| **Fase 8** | Nuevo Flujo de Subida a Notion | ✅ 100% |
| **Fase 9** | Unificación de Estilos UI | ✅ 100% |

---

## 📋 Fases y Tareas Detalladas

### ✅ Fase 1: Infraestructura & Docker (La Base)
> **Objetivo:** Tener los 3 servicios corriendo y comunicándose entre sí.

- [x] **1.1 Estructura del Monorepo**
  - [x] 1.1.1 Crear carpeta `/apps/web` para Frontend
  - [x] 1.1.2 Crear carpeta `/apps/api-bun` para Orquestador
  - [x] 1.1.3 Crear carpeta `/apps/worker-py` para Worker Python

- [x] **1.2 Docker Compose**
  - [x] 1.2.1 Crear `docker-compose.yml` con red `brain-network`
  - [x] 1.2.2 Configurar servicio `worker-py` (puerto 8000 interno)
  - [x] 1.2.3 Configurar servicio `api-bun` (puerto 3000)
  - [x] 1.2.4 Configurar servicio `web` (puerto 4321)
  - [x] 1.2.5 Configurar volúmenes persistentes para modelos HuggingFace

- [x] **1.3 Dockerfiles**
  - [x] 1.3.1 Crear `Dockerfile` para Worker Python (`python:3.10-slim` + ffmpeg)
  - [x] 1.3.2 Crear `Dockerfile` para API Bun (`oven/bun:1`)
  - [x] 1.3.3 Crear `Dockerfile` para Frontend Astro

- [x] **1.4 Endpoints Base**
  - [x] 1.4.1 Crear endpoint `/health` en Worker Python
  - [x] 1.4.2 Crear endpoint `/health` en API Bun (con verificación de Worker)
  - [x] 1.4.3 Verificar comunicación entre servicios

- [x] **1.5 Variables de Entorno**
  - [x] 1.5.1 Crear archivo `.env` base
  - [x] 1.5.2 Configurar `WORKER_URL` para comunicación interna

---

### 🚧 Fase 2: Worker Python - Los Oídos (Procesamiento Multimedia)
> **Objetivo:** API que recibe URL y devuelve texto transcrito.

- [x] **2.1 Servicio de Descarga YouTube**
  - [x] 2.1.1 Instalar y configurar `yt-dlp` en el contenedor
  - [x] 2.1.2 Crear servicio `YoutubeDownloader` en `/app/services/`
  - [x] 2.1.3 Implementar extracción de audio (formato ligero: m4a/opus)
  - [x] 2.1.4 Configurar directorio temporal para descargas
  - [x] 2.1.5 Implementar limpieza automática de archivos temporales

- [x] **2.2 Servicio de Transcripción Whisper**
  - [x] 2.2.1 Instalar `faster-whisper` y dependencias CUDA (opcional)
  - [x] 2.2.2 Crear servicio `WhisperTranscriber` en `/app/services/`
  - [x] 2.2.3 Configurar modelo `small` como default (balance velocidad/calidad)
  - [x] 2.2.4 Implementar transcripción con timestamps
  - [x] 2.2.5 Añadir soporte para múltiples idiomas (auto-detect)

- [ ] **2.3 Servicio de Descarga Instagram**
  - [ ] 2.3.1 Instalar y configurar `instaloader`
  - [ ] 2.3.2 Crear sistema de gestión de cookies de sesión
  - [ ] 2.3.3 Implementar descarga de Reels
  - [ ] 2.3.4 Implementar descarga de Stories (si aplica)
  - [ ] 2.3.5 Manejar errores de autenticación/bloqueo

- [x] **2.4 API Endpoints**
  - [x] 2.4.1 Refactorizar `POST /transcribe` con lógica real
  - [x] 2.4.2 Crear `POST /transcribe/youtube` (endpoint específico)
  - [ ] 2.4.3 Crear `POST /transcribe/instagram` (endpoint específico)
  - [ ] 2.4.4 Implementar respuesta con progreso (streaming/SSE)
  - [x] 2.4.5 Añadir validación de URLs

- [x] **2.5 Manejo de Errores y Logging**
  - [x] 2.5.1 Implementar logging estructurado
  - [ ] 2.5.2 Crear sistema de reintentos para descargas fallidas
  - [x] 2.5.3 Añadir métricas de procesamiento (tiempo, tamaño)

---

### 🧠 Fase 3: Orquestador Bun - El Cerebro (Lógica de IA)
> **Objetivo:** Lógica de IA económica y conexión a Notion.

- [x] **3.1 Estructura Clean Architecture**
  - [x] 3.1.1 Crear carpeta `src/domain/` con entidades (User, Note, Transcript)
  - [x] 3.1.2 Crear carpeta `src/application/` con casos de uso
  - [x] 3.1.3 Crear carpeta `src/infrastructure/` con implementaciones

- [x] **3.2 Servicio de IA Round-Robin**
  - [x] 3.2.1 Crear cliente para **Groq API** (Llama 3 70B)
  - [x] 3.2.2 Crear cliente para **Cerebras API**
  - [x] 3.2.3 Implementar rotación automática entre proveedores
  - [x] 3.2.4 Añadir manejo de rate-limits y fallback
  - [x] 3.2.5 Configurar claves API desde `.env`

- [x] **3.3 Procesamiento de Texto con IA**
  - [x] 3.3.1 Implementar generación de **Resumen**
  - [x] 3.3.2 Implementar extracción de **Puntos Clave**
  - [x] 3.3.3 Implementar generación de **Etiquetas/Tags**
  - [x] 3.3.4 Implementar análisis de **Sentimiento**
  - [x] 3.3.5 Crear prompts optimizados para cada tarea

- [x] **3.4 Integración con Notion**
  - [x] 3.4.1 Instalar `@notionhq/client`
  - [x] 3.4.2 Crear servicio `NotionClient` en infrastructure
  - [x] 3.4.3 Configurar conexión con token de integración
  - [ ] 3.4.4 Crear base de datos en Notion con schema definido
  - [x] 3.4.5 Implementar creación de páginas con formato rico (H1, bullets)
  - [ ] 3.4.6 Implementar actualización de páginas existentes

- [x] **3.5 API Endpoints Orquestador**
  - [x] 3.5.1 Crear `POST /process` (flujo completo: descargar → transcribir → resumir → guardar)
  - [x] 3.5.2 Crear `GET /notes` (listar notas procesadas)
  - [ ] 3.5.3 Crear `GET /notes/:id` (detalle de nota)
  - [ ] 3.5.4 Implementar WebSocket/SSE para progreso en tiempo real
  - [ ] 3.5.5 Endpoints de Categorías (`GET`, `POST`) con manejo de jerarquía

- [ ] **3.6 Base de Datos (Supabase)**
  - [ ] 3.6.1 Crear tabla `categories` (id, name, parent_id, notion_id)
  - [ ] 3.6.2 Relacionar `notes` con `categories`

---

### 🎨 Fase 4: Frontend Astro - La Cara (Interfaz de Usuario)
> **Objetivo:** UX simple, directa y atractiva.

- [x] **4.1 Configuración Base**
  - [x] 4.1.1 Configurar Astro con integración React
  - [x] 4.1.2 Configurar TailwindCSS con tema personalizado
  - [x] 4.1.3 Crear layout principal con navegación
  - [x] 4.1.4 Implementar modo oscuro/claro

- [x] **4.2 Página de Landing**
  - [x] 4.2.1 Diseñar hero section con propuesta de valor
  - [x] 4.2.2 Añadir sección de características
  - [x] 4.2.3 Añadir call-to-action para registro
  - [x] 4.2.4 Optimizar SEO (meta tags, Open Graph)

- [x] **4.3 Dashboard Principal**
  - [x] 4.3.1 Crear componente de **Status de Servicios** (health checks)
  - [x] 4.3.2 Crear componente **Input de URL** (YouTube/Instagram)
  - [x] 4.3.3 Crear **Barra de Progreso** con estados (Descargando → Transcribiendo → Resumiendo → Guardado)
  - [x] 4.3.4 Mostrar preview de resultado antes de guardar
  - [ ] 4.3.5 Dropdown selector de Categorías en el formulario de Input
  - [ ] 4.3.6 Implementar historial de procesamiento reciente

- [x] **4.4 Gestión de Categorías**
  - [x] 4.4.1 Crear página de administración de categorías ✅ `/categories`
  - [x] 4.4.2 UI para crear categorías y asignar padre ✅ `CategoryManager.tsx`
  - [x] 4.4.3 Visualización de la jerarquía de categorías ✅ árbol recursivo

- [x] **4.5 Autenticación con Supabase**
  - [x] 4.5.1 Configurar Supabase Auth en Astro ✅ `lib/supabase.ts`
  - [x] 4.5.2 Crear página de Login/Register ✅ `/login`, `/register`
  - [x] 4.5.3 Componente UserMenu con estado de sesión ✅ `UserMenu.tsx`
  - [ ] 4.5.4 Añadir OAuth (Google, GitHub)
  - [ ] 4.5.5 Crear página de perfil de usuario

- [x] **4.6 Componentes UI**
  - [x] 4.6.1 Crear componente `Card` reutilizable
  - [x] 4.6.2 Crear componente `Button` con variantes
  - [x] 4.6.3 Crear componente `Input` con validación
  - [x] 4.6.4 Crear componente `AuthForm` ✅ login/registro
  - [ ] 4.6.5 Crear componente `Modal` 
  - [ ] 4.6.6 Crear componente `Toast` para notificaciones

- [ ] **4.7 Navegación Mejorada** ⬅️ NUEVO
  - [ ] 4.7.1 Añadir enlace a `/indexing` en el Header
  - [ ] 4.7.2 Menú móvil con todas las opciones
  - [ ] 4.7.3 Breadcrumbs en páginas internas

---

### 🟢 Fase 5: Chat con tu Cerebro (Integración Directa Notion)
> **Objetivo:** Responder preguntas leyendo directamente tus notas de Notion.

- [x] **5.1 Servicio de Lectura de Notion**
  - [x] 5.1.1 Implementar función para listar páginas por `Category` (y subcategorías) ✅ `notion-reader.ts`
  - [x] 5.1.2 Implementar función para leer contenido (bloques) de una página ✅ `getPageContent()`
  - [x] 5.1.3 Sanitizar y formatear contenido (Markdown plano) para el LLM ✅ `blocksToMarkdown()`

- [x] **5.2 Endpoint de Chat Inteligente `/ask`**
  - [x] 5.2.1 Recibir pregunta + `categoryId` ✅ `POST /ask`
  - [x] 5.2.2 Resolver todas las categorías hijas usando Supabase ✅ `getCategoryWithDescendants()`
  - [x] 5.2.3 **Retrieval**: Hacer fetch de las páginas de Notion correspondientes ✅ `getPagesByCategories()`
  - [x] 5.2.4 **Context Window**: Concatenar el contenido (truncar si excede límite de tokens del LLM) ✅ `buildContext()`
  - [x] 5.2.5 Ejecutar Prompt: "Responde basado SOLO en el siguiente contexto..." ✅ `buildSystemPrompt()`

- [x] **5.3 Interfaz de Chat**
  - [x] 5.3.1 Página `/chat` con selector de categoría ✅ `chat.astro`
  - [x] 5.3.2 Componente de mensajes (Usuario vs IA) ✅ `ChatInterface.tsx`
  - [x] 5.3.3 Mostrar enlaces a las páginas de Notion usadas como fuentes ✅ `ChatMessage` component

- [x] **5.4 Gestión de Categorías**
  - [x] 5.4.1 Cliente Supabase con CRUD de categorías ✅ `supabase-client.ts`
  - [x] 5.4.2 Endpoints REST: `GET/POST/PUT/DELETE /categories` ✅ `index.ts`
  - [x] 5.4.3 Árbol jerárquico de categorías ✅ `GET /categories/tree`
  - [x] 5.4.4 Componente selector de categoría ✅ `CategorySelector.tsx`
  - [x] 5.4.5 Script SQL para crear tabla en Supabase ✅ `supabase/schema.sql`

---

### 🔮 Fase 6: Motor de Búsqueda Semántica Vectorial (El Cerebro 2.0)
> **Objetivo:** Reemplazar las consultas directas a Notion por búsqueda semántica con embeddings vectoriales en Supabase.

> **Visión:** `Notion = Fuente de verdad` → `Supabase = Motor de búsqueda` → `IA = Razonador`

- [x] **6.1 Estructura de Datos Vectorial (Supabase)** ✅ `supabase/schema.sql`
  - [x] 6.1.1 Habilitar extensión `pgvector` en Supabase
  - [x] 6.1.2 Crear tabla `notion_pages` (metadata)
  - [x] 6.1.3 Crear tabla `notion_page_chunks` (fragmentos vectorizados)
  - [x] 6.1.4 Crear índice IVFFlat para búsqueda vectorial eficiente
  - [x] 6.1.5 Añadir RLS policies para ambas tablas
  - [x] 6.1.6 Crear función SQL `match_chunks()` para búsqueda semántica

- [x] **6.2 Servicio de Embeddings (api-bun)** ✅ `embedding-client.ts`
  - [x] 6.2.1 Crear cliente de embeddings en `src/infrastructure/embedding-client.ts`
  - [x] 6.2.2 Implementar proveedor Cohere (embed-multilingual-v3.0) - GRATUITO
  - [x] 6.2.3 Implementar proveedor alternativo OpenAI (fallback)
  - [x] 6.2.4 Configurar rotación automática entre proveedores (round-robin)
  - [x] 6.2.5 Añadir rate limiting y manejo de errores

- [x] **6.3 Pipeline de Indexación Offline** ✅ `notion-indexer.ts`
  - [x] 6.3.1 Crear servicio `NotionIndexer` en `src/application/notion-indexer.ts`
  - [x] 6.3.2 Implementar función `fetchNotionPages()`
  - [x] 6.3.3 Implementar función `normalizeContent()`
  - [x] 6.3.4 Implementar función `splitIntoChunks()` (300-800 tokens, overlap 50)
  - [x] 6.3.5 Implementar función `generateEmbeddings()`
  - [x] 6.3.6 Implementar función `persistToSupabase()`
  - [x] 6.3.7 Crear lógica de detección de cambios (`detectChanges()`)
  - [x] 6.3.8 Implementar re-indexación incremental (`indexIncremental()`)

- [x] **6.4 Pipeline de Recuperación (Query Time)** ✅ `semantic-search.ts`
  - [x] 6.4.1 Crear servicio `SemanticSearch` en `src/application/semantic-search.ts`
  - [x] 6.4.2 Implementar `embedQuestion()` para vectorizar pregunta
  - [x] 6.4.3 Implementar `searchSimilarChunks()` con búsqueda vectorial
  - [x] 6.4.4 Añadir filtro opcional por `category_id` (y descendientes)
  - [x] 6.4.5 Implementar `buildContext()` para concatenar chunks relevantes
  - [x] 6.4.6 Limitar contexto por tokens máximos del LLM

- [x] **6.5 Endpoints API (api-bun)** ✅ `index.ts`
  - [x] 6.5.1 Crear `POST /index/trigger` — Disparar indexación manual
  - [x] 6.5.2 Crear `POST /index/page/:notionPageId` — Indexar página específica
  - [x] 6.5.3 Crear `GET /index/status` — Estado de la última indexación
  - [x] 6.5.4 Crear `GET /index/pages` — Listar páginas indexadas
  - [x] 6.5.5 Crear `DELETE /index/page/:id` — Eliminar página del índice
  - [x] 6.5.6 Crear `POST /search` — Búsqueda semántica
  - [x] 6.5.7 Crear `POST /ask/semantic` — Chat con búsqueda semántica
  - [x] 6.5.8 Crear `GET /embeddings/test` — Test de embeddings

- [x] **6.6 Interfaz de Indexación (Frontend)** ✅ `/indexing`
  - [x] 6.6.1 Crear página `/indexing` para gestión de contenido vectorizado
  - [x] 6.6.2 Componente `IndexingDashboard.tsx` con estadísticas
  - [x] 6.6.3 Botón "Sincronizar Ahora" para trigger manual
  - [x] 6.6.4 Lista de páginas indexadas con opción de eliminar
  - [x] 6.6.5 Indicador de progreso durante indexación
  - [x] 6.6.6 Detección de cambios pendientes

- [x] **6.7 Actualización del Chat Existente** ✅ `ChatInterface.tsx`
  - [x] 6.7.1 Modificar `/chat` para usar nuevo endpoint semántico
  - [x] 6.7.2 Mostrar puntuación de similitud junto a fuentes
  - [x] 6.7.3 Añadir indicador de método usado (semántico vs directo)
  - [x] 6.7.4 Link a página original de Notion desde cada fuente
  - [x] 6.7.5 Toggle para alternar entre búsqueda semántica y directa

- [ ] **6.8 Jobs Automáticos**
  - [ ] 6.8.1 Implementar cron job para re-indexación periódica (cada 6h)
  - [ ] 6.8.2 (Opcional) Configurar webhook de Notion para indexación en tiempo real
  - [ ] 6.8.3 Sistema de notificaciones cuando hay errores de indexación

---

### ⚡ Fase 7: Streaming de Respuestas IA (Yield) ⬅️ EN PROGRESO
> **Objetivo:** Mostrar respuestas de IA de forma progresiva (token a token) para mejor UX.

- [x] **7.1 Backend - Cliente IA con Streaming**
  - [x] 7.1.1 Crear método `streamChat()` en `ai-client.ts` usando `AsyncGenerator`
  - [x] 7.1.2 Implementar soporte streaming para Groq API
  - [x] 7.1.3 Implementar soporte streaming para Cerebras API
  - [x] 7.1.4 Crear método `streamSummarize()` para resúmenes progresivos

- [x] **7.2 Backend - Endpoints SSE**
  - [x] 7.2.1 Crear `GET /ask/stream` — Chat con streaming SSE
  - [x] 7.2.2 Crear `GET /ask/semantic/stream` — Chat semántico con streaming SSE
  - [x] 7.2.3 Configurar headers SSE correctos (`text/event-stream`)
  - [x] 7.2.4 Implementar eventos: `start`, `token`, `sources`, `done`, `error`

- [x] **7.3 Frontend - Hook de Streaming**
  - [x] 7.3.1 Crear hook `useStreamingChat()` con fetch + ReadableStream
  - [ ] 7.3.2 Implementar reconexión automática en caso de error
  - [x] 7.3.3 Crear hook `useStreamingProcess()` para Dashboard (Integrado en EnhancedDashboard)

- [x] **7.4 Frontend - UI de Streaming**
  - [x] 7.4.1 Modificar `ChatInterface.tsx` para mostrar tokens progresivos
  - [x] 7.4.2 Añadir cursor parpadeante durante generación
  - [x] 7.4.3 Modificar `Dashboard.tsx` para mostrar resumen generándose
  - [x] 7.4.4 Indicador visual de "IA escribiendo..."

---

### 📝 Fase 8: Nuevo Flujo de Subida a Notion ⬅️ EN PROGRESO
> **Objetivo:** Control total del usuario sobre el contenido antes de guardar, con edición, etiquetas manuales e indexación opcional.

- [x] **8.1 Input con Prompt Personalizado**
  - [x] 8.1.1 Crear componente `PromptInput.tsx` para instrucciones a la IA
  - [x] 8.1.2 Añadir textarea debajo del input de URL en Dashboard
  - [x] 8.1.3 Placeholder con ejemplos: "Céntrate en...", "Ignora...", "Resalta..."
  - [x] 8.1.4 Guardar prompt en state del componente

- [x] **8.2 Modificar Backend para Prompt Personalizado**
  - [x] 8.2.1 Actualizar `POST /process/preview` para aceptar `customPrompt`
  - [x] 8.2.2 Modificar `ai-client.ts` → `streamSummarize()` para incluir prompt extra
  - [x] 8.2.3 Crear `POST /process/preview` — Procesar sin guardar en Notion
  - [x] 8.2.4 Devolver resultado en formato editable

- [x] **8.3 Preview y Editor de Contenido**
  - [x] 8.3.1 Crear componente `MarkdownPreview.tsx` con renderizado
  - [x] 8.3.2 Implementar modo edición con textarea
  - [x] 8.3.3 Toggle entre vista preview y vista edición
  - [ ] 8.3.4 Botón "Restaurar original" para deshacer cambios

- [x] **8.4 Sistema de Etiquetas Manual**
  - [x] 8.4.1 Crear tabla `tags` en Supabase (id, user_id, name, color)
  - [x] 8.4.2 Crear tabla `page_tags` para relación N:N
  - [x] 8.4.3 Endpoints CRUD: `GET/POST/DELETE /tags`
  - [x] 8.4.4 Crear componente `TagSelector.tsx` con autocompletado
  - [x] 8.4.5 Opción de crear etiqueta nueva inline
  - [x] 8.4.6 Eliminar generación automática de tags por IA

- [x] **8.5 Guardar con Contenido Editado**
  - [x] 8.5.1 Crear endpoint `POST /process/save` — Guardar con ediciones
  - [x] 8.5.2 Aceptar: `{ url, title, content, tags }` del usuario
  - [x] 8.5.3 Crear método `createPageFromMarkdown()` en `notion-client.ts`
  - [x] 8.5.4 Convertir Markdown del usuario a bloques de Notion
  - [x] 8.5.5 Asignar tags como multi-select en Notion

- [x] **8.6 Modal de Indexación Post-Guardado**
  - [x] 8.6.1 Crear componente `IndexingModal.tsx`
  - [x] 8.6.2 Mostrar modal después de guardar en Notion exitosamente
  - [x] 8.6.3 Texto: "¿Quieres añadir esto a tu búsqueda semántica?"
  - [x] 8.6.4 Botón "Sí, indexar" → llama `POST /index/page/:id`
  - [x] 8.6.5 Botón "No, omitir" → cierra modal
  - [x] 8.6.6 Mostrar progreso de indexación en el modal

- [x] **8.7 Refactorizar Dashboard.tsx**
  - [x] 8.7.1 Separar en pasos: Input → Processing → Preview → Save (EnhancedDashboard.tsx)
  - [x] 8.7.2 Nuevo estado: `'idle' | 'processing' | 'preview' | 'saving' | 'indexing' | 'done'`
  - [x] 8.7.3 Añadir navegación entre pasos (Stepper)
  - [x] 8.7.4 Crear ContentEditor.tsx para flujo multi-paso

---

### 🎨 Fase 9: Unificación de Estilos y Componentes UI ⬅️ EN PROGRESO
> **Objetivo:** Sistema de diseño consistente con componentes reutilizables.

- [ ] **9.1 Análisis y Documentación**
  - [ ] 9.1.1 Documentar inconsistencias actuales entre páginas
  - [ ] 9.1.2 Definir estándares: max-width, spacing, grid layout
  - [ ] 9.1.3 Crear guía de estilos en `/docs/styles.md`

- [x] **9.2 Componente PageLayout Reutilizable**
  - [x] 9.2.1 Crear `AppLayout.astro` con slots (main, sidebar)
  - [x] 9.2.2 Props: `title`, `maxWidth`, incluye Header
  - [x] 9.2.3 StatusIndicator automático en sidebar
  - [x] 9.2.4 Grid responsive: 1 col mobile, 4 cols desktop (3+1)

- [x] **9.3 Componentes de Sidebar Reutilizables**
  - [x] 9.3.1 Crear `SidebarCard.tsx` — Card genérica de sidebar
  - [x] 9.3.2 Crear `QuickActions.tsx` — Navegación rápida
  - [x] 9.3.3 Crear `HowItWorksCard.tsx` — Pasos numerados
  - [x] 9.3.4 Crear `TipsCard.tsx` — Lista de tips con bullets

- [x] **9.4 Migrar Páginas al Nuevo Layout**
  - [x] 9.4.1 Migrar `/dashboard` a `AppLayout`
  - [x] 9.4.2 Migrar `/chat` a `AppLayout`
  - [x] 9.4.3 Migrar `/indexing` a `AppLayout`
  - [x] 9.4.4 Migrar `/categories` a `AppLayout`

- [x] **9.5 Navegación Header Mejorada**
  - [x] 9.5.1 Añadir enlace a `/indexing` en Header.astro
  - [x] 9.5.2 Crear menú hamburguesa para móvil
  - [x] 9.5.3 Destacar página activa en navegación
  - [x] 9.5.4 Añadir iconos consistentes a todos los enlaces

- [x] **9.6 Componentes UI Faltantes**
  - [x] 9.6.1 Crear componente `Modal.tsx` reutilizable
  - [x] 9.6.2 Crear componente `Toast.tsx` para notificaciones
  - [x] 9.6.3 Crear componente `Stepper.tsx` para flujos multi-paso
  - [x] 9.6.4 Crear componente `EmptyState.tsx` para listas vacías
  - [x] 9.6.5 Crear componente `PageHeader.tsx` para títulos de página
  - [x] 9.6.6 Crear barrel export `ui/index.ts` para componentes

---

## 🛠️ Cómo Iniciar

El proyecto utiliza **Docker Compose** para levantar todo el entorno con un solo comando.

### Requisitos
*   Docker y Docker Compose instalados.
*   Archivo `.env` configurado (ver `.env.example`).

### Ejecución
```bash
# Levantar todos los servicios
docker-compose up --build

# Solo development (con hot-reload)
docker-compose up
```

### Servicios Disponibles
| Servicio | URL | Descripción |
| :--- | :--- | :--- |
| **Frontend** | [http://localhost:4321](http://localhost:4321) | Interfaz de usuario (Astro) |
| **API** | [http://localhost:3000](http://localhost:3000) | Orquestador (Bun + Elysia) |
| **Worker** | `http://worker-py:8000` | Procesamiento (interno) |

### Health Checks
```bash
# Verificar API + Worker
curl http://localhost:3000/health

# Verificar Worker directamente (desde dentro de Docker)
curl http://localhost:8000/health
```

---

## 🧩 Estructura del Monorepo

```text
/mi-cerebro
├── docker-compose.yml          # Orquestación de servicios
├── .env                        # Variables de entorno
├── README.md                   # Este archivo
├── PROYECTO.md                 # Documento maestro de ingeniería
│
└── apps/
    ├── web/                    # Frontend (Astro 5 + React)
    │   ├── src/
    │   │   ├── components/     # Componentes UI
    │   │   └── pages/          # Rutas de la app
    │   └── Dockerfile
    │
    ├── api-bun/                # Orquestador (Bun + ElysiaJS)
    │   ├── src/
    │   │   ├── domain/         # Entidades del negocio
    │   │   ├── application/    # Casos de uso
    │   │   └── infrastructure/ # Implementaciones externas
    │   └── Dockerfile
    │
    └── worker-py/              # Worker (Python + FastAPI)
        ├── app/
        │   ├── services/       # YoutubeDownloader, WhisperTranscriber
        │   └── api/            # Endpoints FastAPI
        ├── models/             # Modelos Whisper (persistentes)
        └── Dockerfile
```

---

## 📚 Referencias

*   **Faster-Whisper:** [GitHub](https://github.com/SYSTRAN/faster-whisper)
*   **ElysiaJS:** [Documentación](https://elysiajs.com/)
*   **Astro + Supabase:** [Guía Oficial](https://docs.astro.build/en/guides/backend/supabase/)
*   **Notion API:** [Documentación](https://developers.notion.com/)
