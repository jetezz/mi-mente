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
   - Frontend en `http://localhost:4321`
   - API en `http://localhost:3000`
   - Worker (interno) en puerto 8000

### Integración con Coolify & Cloudflare Tunnel
Este proyecto está preparado para desplegarse tras un túnel de Cloudflare, ideal para VPS o servidores caseros sin IP pública fija.

**Si usas el servicio de túnel integrado:**
Asegúrate de tener tu token de túnel en el `.env`:
```env
TUNNEL_TOKEN=tu_token_largo_de_cloudflare
```
El servicio `tunnel` en `docker-compose.yml` se encargará de exponer tu aplicación en `https://mimente.online` (o tu dominio configurado).

## 📂 Estructura del Proyecto

Para más detalles sobre la arquitectura y decisiones de diseño, consulta la carpeta `docs/`.

- **`docs/PRD.md`**: Definición detallada del producto y requerimientos.
- **`apps/`**: Código fuente de los microservicios.
- **`AGENTS.md`**: Guía técnica para agentes de IA.
