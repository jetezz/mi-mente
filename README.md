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
| **Fase 4** | Frontend Astro (La Cara) + Auth | 🟡 90% |
| **Fase 5** | Memoria RAG (La Memoria) | ✅ 100% |

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

### � Fase 3: Orquestador Bun - El Cerebro (Lógica de IA)
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

### � Fase 4: Frontend Astro - La Cara (Interfaz de Usuario)
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
