# 🧠 Hybrid Brain

> **Tu "Segundo Cerebro" automatizado.**
> Ingesta contenido multimedia, procésalo con IA local, y consúltalo inteligentemente.

Hybrid Brain es un sistema integral que transforma videos de YouTube e Instagram en notas estructuradas en **Notion**, permitiéndote "chatear" con tu base de conocimiento mediante búsqueda semántica (RAG).

## ✨ Características Principales

- **📥 Ingesta Universal**: Descarga y procesa automáticamente videos de YouTube y Reels de Instagram.
- **🗣️ Transcripción Local**: Utiliza `faster-whisper` en un contenedor Docker para transcripciones rápidas y gratuitas, sin depender de APIs de terceros para el audio.
- **🤖 Inteligencia Híbrida**: Orquestación inteligente entre modelos (Llama 3 en Groq/Cerebras) para resumir y extraer puntos clave.
- **🧠 Búsqueda Semántica**: Indexación vectorial en Supabase para permitirte preguntar cosas como *"¿Qué vi la semana pasada sobre Rust?"* y obtener respuestas precisas.
- **⚡ Streaming UX**: Interfaces reactivas con respuestas en tiempo real y feedback de progreso detallado.

## 🛠️ Stack Tecnológico

El proyecto está diseñado como un sistema distribuido de alto rendimiento:

- **Frontend**: [Astro 5](https://astro.build) + React + TailwindCSS.
- **API Orchestrator**: [Bun](https://bun.sh) + ElysiaJS.
- **AI Worker**: Python 3.10 + FastAPI + [Faster-Whisper](https://github.com/SYSTRAN/faster-whisper).
- **Base de Datos**: Supabase (PostgreSQL + pgvector).
- **Memoria**: Notion API.
- **Infraestructura**: Docker Compose + Cloudflare Tunnel.

## 🚀 Despliegue y Ejecución

### Prerrequisitos
- Docker & Docker Compose instalados.
- Cuenta de Supabase y Notion.
- Claves API para Groq/Cerebras.

### Instalación Rápida

1. **Clonar el repositorio**:
   ```bash
   git clone <repo-url>
   cd mi-cerebro
   ```

2. **Configurar entorno**:
   Copia el archivo de ejemplo y rellena tus credenciales.
   ```bash
   cp .env.example .env
   ```

3. **Iniciar servicios**:
   ```bash
   docker-compose up -d --build
   ```
   Esto levantará:
   - Frontend en `http://localhost:4321` (API interna disponible en `/api`)

   **Restart services**:
   ```bash
   docker-compose restart
   ```

   **Stop services**:
   ```bash
   docker-compose down
   ```

   **Ver logs**:
   ```bash
   docker-compose logs -f
   ```

### Integración con Coolify & Cloudflare Tunnel

Este proyecto soporta dos modos de ejecución:

1. **Modo Local (Desarrollo)**:
   Simplemente ejecuta:
   ```bash
   docker-compose up -d --build
   ```
   Asegúrate de que en tu `.env` tienes:
   ```env
   PUBLIC_API_URL=http://localhost:4321/api
   ```

2. **Modo Servidor/Producción (Con Túnel SSL)**:
   Si quieres exponer tu servidor a internet con un dominio seguro (ej: `https://mimente.online`) usando Cloudflare Tunnel:
   
   1. Configura tu `TUNNEL_TOKEN` en el `.env`.
   2. Descomenta/Configura la URL pública en `.env`:
      ```env
      PUBLIC_API_URL=/api
      ```
   3. Lanza los servicios **incluyendo el perfil del túnel**:
      ```bash
      docker-compose --profile tunnel up -d --build
      ```

## 📂 Estructura del Proyecto

Para más detalles sobre la arquitectura y decisiones de diseño, consulta la carpeta `docs/`.

- **`docs/PRD.md`**: Definición detallada del producto y requerimientos.
- **`apps/`**: Código fuente de los microservicios.
- **`AGENTS.md`**: Guía técnica para agentes de IA.

## 🔧 Troubleshooting

### Error: "Requested format is not available"

Este error ocurre cuando `yt-dlp` intenta procesar formatos de video que no están disponibles. 

**Causa**: Se da cuando `skip_download: True` se usa pero no se añaden las opciones para ignorar errores de formato.

**Solución**: 
- Actualizar a la última versión de yt-dlp (`pip install -U yt-dlp`)
- El código ya incluye las opciones necesarias: `ignore_no_formats_error: True` y `format: None`

### Error: "no element found: line 1, column 0" en youtube_transcript_api

**Causa**: YouTube devuelve respuestas vacías o bloqueadas.

**Solución**:
- El sistema usa `yt-dlp` como fallback automático
- Considera usar cookies de una sesión de YouTube autenticada (ver configuración de cookies abajo)

### Configuración de Cookies de YouTube

Para evitar bloqueos de YouTube, puedes exportar tus cookies de navegador:

1. Instala una extensión de exportación de cookies (ej: "Get cookies.txt" para Chrome)
2. Navega a YouTube y exporta las cookies en formato Netscape
3. Guarda el archivo en `apps/worker-py/cookies/cookies.txt`
4. El sistema las detectará automáticamente

### Transcripciones Nativas de YouTube

El sistema prioriza las transcripciones nativas de YouTube (subtítulos) sobre Whisper:

1. **Método 1**: `youtube_transcript_api` - Rápido y limpio
2. **Método 2**: `yt-dlp` - Fallback robusto que descarga subtítulos VTT
3. **Método 3**: Whisper - Solo si no hay transcripción nativa disponible

Para más detalles, consulta `YOUTUBE_TRANSCRIPTS_PLAN.md`.

## 📝 Changelog

### 2026-01-26: Refactorización de Transcripciones YouTube

- **Fix**: Solucionado error "Requested format is not available" en yt-dlp
- **Fix**: Corregido manejo de excepciones de `youtube_transcript_api`
- **Feature**: Nuevo método `get_video_info_safe()` que no falla si no puede obtener metadatos
- **Feature**: Mejor logging con emojis para debugging
- **Docs**: Documentación completa en `YOUTUBE_TRANSCRIPTS_PLAN.md`

