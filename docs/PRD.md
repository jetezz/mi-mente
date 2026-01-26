# Product Requirements Document (PRD) - Hybrid Brain

## 1. Visión del Producto
**Hybrid Brain** es un "Segundo Cerebro" automatizado que ingiere contenido multimedia (YouTube, Instagram), lo procesa utilizando Inteligencia Artificial local e híbrida, y lo organiza estructuradamente en Notion para consultas futuras y recuperación de información (RAG).

El objetivo es liberar al usuario de la carga de tomar notas manuales de contenidos audiovisuales, permitiéndole interactuar con su base de conocimiento a través de un chat inteligente.

---

## 2. Arquitectura del Sistema
El sistema utiliza una arquitectura de microservicios híbridos orquestados mediante Docker, optimizando el rendimiento y los costes.

### Componentes Principales

| Servicio | Tecnología | Responsabilidad |
| :--- | :--- | :--- |
| **Frontend** | Astro 5 + React | Interfaz de usuario rápida, dashboard y gestión de contenidos. |
| **Orquestador (API)** | Bun + ElysiaJS | Lógica de negocio, gestión de IA (Round-Robin Groq/Cerebras), conexión con Notion y Supabase. |
| **Worker** | Python + FastAPI | Tareas pesadas (CPU-bound): Descarga de medios (`yt-dlp`), Transcripción (`faster-whisper`), Procesamiento de audio (`ffmpeg`). |
| **Base de Datos** | Supabase | Autenticación, gestión de categorías, almacenamiento vectorial (pgvector) y metadatos. |
| **Almacenamiento** | Notion | Fuente de verdad y visualización de documentos para el usuario final. |
| **Infraestructura** | Docker + Coolify | Orquestación de contenedores y despliegue en servidor propio o VPS. |
| **Acceso Remoto** | Cloudflare Tunnel | Exposición segura de servicios locales a internet (dominio `mimente.online`). |

---

## 3. Topología de Red y Túneles
El sistema es accesible desde el exterior mediante **Cloudflare Tunnel**, evitando abrir puertos en el router y gestionando certificados SSL automáticamente.

**Configuración del Ingress:**
- **Dominio Principal**: `mimente.online` -> Apunta al servicio Frontend (`http://web:4321`) (o `localhost:4321` en contexto del túnel local).
- **Servicios Internos**: La API y el Worker están protegidos y se comunican a través de la red interna de Docker (`brain-network`).

---

## 4. Estructura del Proyecto (Monorepo)
El código sigue `Clean Architecture` y está organizado en un monorepo:

```text
/mi-cerebro
├── docker-compose.yml          # Orquestación de servicios
├── docs/                       # Documentación (PRD, guías)
├── apps/
│   ├── web/                    # Frontend (Astro)
│   ├── api-bun/                # Backend A (Orquestador)
│   └── worker-py/              # Backend B (Procesamiento IA)
├── tunnel/                     # Configuración de Cloudflare
└── AGENTS.md                   # Guía para Agentes IA
```

---

## 5. Funcionalidades Clave

### 5.1 Ingesta y Procesamiento
- **Input**: URLs de YouTube o Instagram (Reels).
- **Descarga**: Extracción de audio optimizada usando `yt-dlp` y gestión de cookies para Instagram.
- **Transcripción**: Uso de `faster-whisper` (modelo `small`/`medium`) para convertir audio a texto con timestamps.
- **Generación de Contenido**: La IA genera resúmenes, puntos clave, etiquetas y análisis de sentimiento.

### 5.2 Integración con Notion
- Crear páginas en bases de datos de Notion con formato rico.
- Asignación de categorías jerárquicas seleccionadas por el usuario.
- Inserción de etiquetas generadas automáticamente por el sistema.

### 5.3 Búsqueda Semántica y RAG
- **Indexación**: Vectorización de contenidos (chunks) y almacenamiento en Supabase (`pgvector`).
- **Recuperación**: Búsqueda por similitud semántica ante preguntas del usuario.
- **Chat**: Interfaz de chat que responde preguntas basándose **únicamente** en el contexto recuperado de las notas.

### 5.4 Streaming y UX
- Respuestas de IA generadas token a token (Server-Sent Events) para reducir la latencia percibida.
- Barras de progreso en tiempo real para las tareas de larga duración (descarga -> transcripción -> resumen).

---

## 6. Flujos de Usuario

### 6.1 Flujo de "Nuevo Recuerdo"
1. Usuario pega URL en Dashboard.
2. (Opcional) Usuario añade prompt personalizado ("Céntrate en consejos de inversión").
3. Sistema procesa el video y muestra una **Vista Previa** editable.
4. Usuario revisa, edita si es necesario, y selecciona una **Categoría**.
5. Usuario confirma "Guardar". Sistema sube a Notion.
6. Sistema sugiere "Indexar ahora" para búsqueda futura.

### 6.2 Flujo de "Consulta"
1. Usuario abre Chat.
2. Usuario escribe pregunta ("¿Qué decían los videos sobre arquitectura modular?").
3. Sistema busca chunks relevantes en Supabase.
4. Sistema envía contexto + pregunta al LLM.
5. Usuario recibe respuesta con citas a las fuentes originales.

---

## 7. Requisitos de Seguridad
- Autenticación robusta vía Supabase Auth.
- Tokens de servicios externos (Notion, Groq, Cloudflare) gestionados estrictamente vía variables de entorno (`.env`).
- Aislamiento de red: Los servicios de backend no deben exponer puertos a la internet pública directamente, solo a través del API Gateway o Túnel controlado.
