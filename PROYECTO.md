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
```

**Referencias y Recursos:**
*   **Video Midudev:** Implementación de rotación de claves API para IA gratuita.
*   **Faster-Whisper:** [GitHub](https://github.com/SYSTRAN/faster-whisper)
*   **Astro + Supabase:** Guías oficiales de integración SSR.
