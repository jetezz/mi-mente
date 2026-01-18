# 🔧 Debug Page - Centro de Pruebas de Hybrid Brain

> **Objetivo:** Página de diagnóstico y testing para todas las funcionalidades del proyecto Hybrid Brain organizada por categorías.

---

## 📋 Resumen del Análisis

El proyecto **Hybrid Brain** tiene las siguientes funcionalidades principales organizadas por módulos:

---

## 🗂️ Categorías de Funcionalidades

### 1. 🏥 **Health & Status** - Estado de los Servicios
| Funcionalidad | Endpoint | Método | Descripción |
|---------------|----------|--------|-------------|
| Health Check | `/health` | GET | Estado completo de todos los servicios |
| Check Notion | `/check-notion` | GET | Verificar conexión con Notion |
| Test Embeddings | `/embeddings/test` | GET | Probar generación de embeddings |

---

### 2. 📓 **Notion** - Gestión de Notas
| Funcionalidad | Endpoint | Método | Descripción |
|---------------|----------|--------|-------------|
| Listar Notas | `/notes` | GET | Listar notas desde Notion |
| Poblar Notion | `/setup-notion` | POST | Crear contenido de ejemplo en Notion |
| Guardar Contenido | `/process/save` | POST | Guardar contenido en Notion |

---

### 3. 🤖 **IA** - Inteligencia Artificial
| Funcionalidad | Endpoint | Método | Descripción |
|---------------|----------|--------|-------------|
| Test IA Completo | `/ai/test` | POST | Probar resumen, puntos clave, tags, sentimiento |
| Chat Directo | `/ask` | POST | Chat con RAG usando Notion directo |
| Chat con Historial | `/ask/continue` | POST | Continuar conversación existente |
| Chat Streaming | `/ask/stream` | GET (SSE) | Respuesta token-a-token |
| Chat Semántico | `/ask/semantic` | POST | Chat usando búsqueda vectorial |
| Chat Semántico Stream | `/ask/semantic/stream` | GET (SSE) | Búsqueda semántica con streaming |

---

### 4. 📊 **Indexación** - Motor Semántico
| Funcionalidad | Endpoint | Método | Descripción |
|---------------|----------|--------|-------------|
| Trigger Indexación | `/index/trigger` | POST | Indexar todo el contenido (full/incremental) |
| Indexar Página | `/index/page/:id` | POST | Indexar una página específica |
| Estado Indexación | `/index/status` | GET | Estadísticas y cambios pendientes |
| Páginas Indexadas | `/index/pages` | GET | Listar páginas en el índice |
| Eliminar del Índice | `/index/page/:id` | DELETE | Eliminar página del índice |

---

### 5. 🔍 **Búsqueda Semántica** - Vectorial
| Funcionalidad | Endpoint | Método | Descripción |
|---------------|----------|--------|-------------|
| Búsqueda | `/search` | POST | Búsqueda semántica en chunks |
| Debug Búsqueda | `/search/debug` | GET | Solo chunks sin IA |

---

### 6. 📺 **YouTube** - Procesamiento Multimedia
| Funcionalidad | Endpoint | Método | Descripción |
|---------------|----------|--------|-------------|
| Info Video | `/video/info` | POST | Obtener metadata del video |
| Procesar URL | `/process` | POST | Flujo completo: descargar → transcribir → resumir → guardar |
| Stream Preview | `/process/stream-preview` | GET (SSE) | Procesamiento con streaming |
| Preload Whisper | `/worker/preload` | POST | Pre-cargar modelo de whisper |

---

### 7. 🏷️ **Categorías** - Organización
| Funcionalidad | Endpoint | Método | Descripción |
|---------------|----------|--------|-------------|
| Listar | `/categories` | GET | Todas las categorías |
| Árbol | `/categories/tree` | GET | Categorías jerárquicas |
| Crear | `/categories` | POST | Nueva categoría |
| Actualizar | `/categories/:id` | PUT | Modificar categoría |
| Eliminar | `/categories/:id` | DELETE | Eliminar categoría |

---

### 8. 🏷️ **Tags** - Etiquetas
| Funcionalidad | Endpoint | Método | Descripción |
|---------------|----------|--------|-------------|
| Listar Tags | `/tags` | GET | Obtener tags del usuario |
| Crear Tag | `/tags` | POST | Crear nuevo tag |
| Eliminar Tag | `/tags/:id` | DELETE | Eliminar tag |

---

### 9. 🐍 **Worker Python** - Procesamiento
| Funcionalidad | Endpoint (Worker) | Método | Descripción |
|---------------|-------------------|--------|-------------|
| Health | `worker:8000/health` | GET | Estado del worker |
| Transcribir | `worker:8000/transcribe` | POST | Transcribir multimedia |
| Transcribir YouTube | `worker:8000/transcribe/youtube` | POST | Solo YouTube |
| Info Video | `worker:8000/video/info` | POST | Metadata del video |
| Cargar Whisper | `worker:8000/model/load` | POST | Precargar modelo |
| Descargar Whisper | `worker:8000/model/unload` | POST | Liberar memoria |
| Limpiar Temp | `worker:8000/cleanup` | POST | Limpiar archivos temporales |

---

## 🎯 Implementación

La página de Debug se implementará en:
- **Ruta:** `/debug`
- **Componente:** `DebugDashboard.tsx`
- **Página Astro:** `debug.astro`

### Features:
1. ✅ Sidebar con selector de categoría
2. ✅ Panel principal con tests por categoría
3. ✅ Resultados en tiempo real (JSON pretty-printed)
4. ✅ Indicadores de estado (success/error)
5. ✅ Inputs dinámicos por endpoint
6. ✅ Soporte SSE para endpoints de streaming
7. ✅ Historial de requests

---

## 🛠️ Tareas de Implementación

- [x] Crear README de documentación
- [x] Crear página `debug.astro`
- [x] Crear componente `DebugDashboard.tsx`
- [x] Implementar selector de categorías
- [x] Crear componente EndpointTester (integrado en DebugDashboard)
- [x] Implementar tests de Health
- [x] Implementar tests de Notion
- [x] Implementar tests de IA
- [x] Implementar tests de Indexación
- [x] Implementar tests de Búsqueda
- [x] Implementar tests de YouTube
- [x] Implementar tests de Categorías
- [x] Implementar tests de Tags
- [x] Añadir soporte SSE para streaming
- [x] Añadir resultado JSON con syntax highlighting
- [x] Verificar en browser ✅ (17/01/2026)
- [x] Añadir enlace en Header de navegación

---

## 📚 Referencias

- Proyecto: `/mi_cerebro`
- API Backend: `apps/api-bun/src/index.ts`
- Worker Python: `apps/worker-py/app/main.py`
- Frontend: `apps/web/src/`
