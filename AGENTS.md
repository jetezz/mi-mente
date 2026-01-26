# AGENTS.md

> **Guía maestra para Agentes de IA trabajando en Hybrid Brain**
> Este archivo define el contexto, convenciones y comandos operativos para que cualquier agente pueda contribuir eficazmente al proyecto.

## 📌 Contexto del Proyecto

**Hybrid Brain** es un monorepo diseñado para ingerir, procesar (IA) y organizar conocimiento personal multimedia.
Funciona con una arquitectura de microservicios:
- **Frontend**: Astro (UI/UX).
- **Backend A (Orquestador)**: Bun (Lógica de negocio rápida).
- **Backend B (Worker)**: Python (Procesamiento pesado de IA/Audio).

## 🛠️ Stack Tecnológico & Versiones

- **Runtime JS**: `Bun` (v1.x)
- **Lenguaje JS**: `TypeScript` (Strict mode)
- **Frontend**: `Astro` (v5), `React`, `TailwindCSS`
- **Backend API**: `ElysiaJS` (sobre Bun)
- **Backend Worker**: `Python 3.10`, `FastAPI`, `faster-whisper`, `yt-dlp`, `youtube-transcript-api`
- **Base de Datos**: `Supabase` (PostgreSQL + pgvector)
- **Infraestructura**: User `Docker Compose`, `Cloudflare Tunnel`

## 📂 Estructura del Monorepo

```text
/mi-cerebro
├── docker-compose.yml       # Orquestador maestro
├── .env                     # Configuración global (Secrets)
├── docs/                    # Documentación humana (PRD)
├── YOUTUBE_TRANSCRIPTS_PLAN.md  # Documentación del sistema de transcripciones
├── apps/
│   ├── web/                 # [Frontend] Astro
│   │   ├── src/pages/       # Rutas
│   │   ├── src/components/  # UI Reutilizable
│   │   └── src/pages/debug.astro  # Página de pruebas
│   │
│   ├── api-bun/             # [Backend] ElysiaJS
│   │   └── src/
│   │       ├── domain/      # Entidades y Tipos
│   │       ├── application/ # Casos de Uso
│   │       └── infrastructure/ # Implementaciones (Notion, Supabase, Worker)
│   │
│   └── worker-py/           # [Worker] Python
│       ├── app/
│       │   ├── main.py      # FastAPI endpoints
│       │   └── services/
│       │       ├── youtube_transcript_service.py  # ⭐ Transcripciones nativas
│       │       ├── youtube_downloader.py          # Descarga de audio
│       │       └── whisper_transcriber.py         # Transcripción con Whisper
│       ├── cookies/         # Cookies de YouTube para evitar bloqueos
│       └── requirements.txt
```

## 🎬 Sistema de Transcripciones de YouTube

El sistema usa una arquitectura de 3 capas para obtener transcripciones:

```
📥 URL → 🔍 youtube_transcript_api (API directa)
              ↓ (si falla)
         📥 yt-dlp subtitles (VTT sin video)
              ↓ (si falla)
         🎙️ Whisper (transcripción de audio)
```

### Archivos Clave
- `youtube_transcript_service.py`: Maneja la obtención de transcripciones nativas
- `youtube_downloader.py`: Descarga de audio cuando no hay subtítulos
- `YOUTUBE_TRANSCRIPTS_PLAN.md`: Documentación completa del sistema

### Errores Comunes
- **"Requested format is not available"**: Usar `ignore_no_formats_error: True` en yt-dlp
- **XML parsing error**: Fallback automático a yt-dlp
- **Bloqueo de YouTube**: Configurar cookies en `/app/cookies/cookies.txt`

## 📐 Convenciones de Código

### General
- **Idioma**: El código y los comentarios deben estar preferiblemente en **Inglés** (técnico), aunque la documentación de usuario final está en Español.
- **Paths**: Usa siempre rutas absolutas o alias definidos (`@/`) si aplica.

### Frontend (Astro/React)
- Usa componentes funcionales de React dentro de las "islas" de Astro cuando se requiera interactividad.
- Estilos: **TailwindCSS** es la norma. Evita CSS plano salvo necesidad crítica.
- Mantén la UI responsive (Mobile First).

### Backend (Bun/Elysia)
- **Clean Architecture**: Respeta la separación:
  - `domain`: Interfaces puras, sin deps externas.
  - `application`: Lógica de negocio.
  - `infrastructure`: Clientes de bases de datos y APIs externas.
- Manejo de errores: Usa patrones funcionales o try/catch controlados, devolviendo respuestas HTTP tipadas.

### Backend (Python)
- Tipado estático (Type hints) obligatorio.
- Usa `uvicorn` para servir la app.
- Los servicios en `services/` deben usar logging con emojis para facilitar debugging.

## 🚀 Comandos de Setup y Despliegue

**Docker (Entorno Principal)**
- Levantar todo: `docker-compose up -d --build`
- Ver logs: `docker-compose logs -f`
- Reiniciar servicio específico: `docker-compose restart api-bun`
- Rebuild worker: `docker-compose build worker-py && docker-compose up -d worker-py`

**Desarrollo Local (Sin Docker)**
- Instalar deps (Monorepo root): No hay `package.json` raíz, entrar a cada app.
- API: `cd apps/api-bun && bun install && bun run dev`
- Web: `cd apps/web && bun install && bun run dev`
- Worker: `cd apps/worker-py && pip install -r requirements.txt && uvicorn app.main:app --reload`

## 🔑 Variables de Entorno Críticas

El archivo `.env` es vital. Asegúrate de que las siguientes claves existan al configurar un nuevo entorno:
- `SUPABASE_URL`, `SUPABASE_KEY`
- `NOTION_KEY`, `NOTION_DATABASE_ID`
- `GROQ_API_KEY`
- `TUNNEL_TOKEN` (para despliegue)
- `WORKER_URL` (default: `http://worker-py:8000`)

## 🧪 Página de Debug

Accede a `/debug` para probar todas las funcionalidades. Categoría **YouTube** incluye:
- **Info Video**: Obtener metadatos sin descargar
- **Transcripción Nativa**: Probar el sistema de 3 capas de transcripciones
- **Worker Health**: Verificar estado del worker Python
- **Stream Preview**: Procesamiento completo con streaming

