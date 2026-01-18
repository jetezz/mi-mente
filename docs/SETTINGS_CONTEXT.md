# ⚙️ Contexto de Refactorización: Sistema de Configuración

## 🎯 Objetivo
Implementar un sistema de configuración centralizado y persistente (Supabase) para reemplazar valores "hardcodeados" distribuidos por el código. Permitir la edición de estas configuraciones desde una nueva página de "Settings".

## 🔍 Valores Hardcodeados Detectados

### Frontend (Apps/Web)
| Archivo | Variable | Valor Actual | Propósito |
|---------|----------|--------------|-----------|
| `DebugDashboard.tsx` | `DEFAULT_USER_ID` | `b0808906...` | ID de usuario por defecto para pruebas |
| `DebugDashboard.tsx` | `DEFAULT_YOUTUBE_URL` | `https://www.youtube.com...` | URL de prueba por defecto |
| `useStreamingChat.ts` | `threshold` (default) | `0.5` | Umbral de similitud por defecto para búsqueda semántica |

### Backend (Apps/Api-Bun)
| Archivo | Variable | Valor Actual | Propósito |
|---------|----------|--------------|-----------|
| `semantic-search.ts` | `DEFAULT_THRESHOLD` | `0.5` | Umbral de similitud base |
| `semantic-search.ts` | `DEFAULT_MAX_CHUNKS` | `5` | Máximo de chunks a recuperar |
| `ask-brain.ts` | `DEFAULT_MAX_SOURCES` | `5` | Máximo de fuentes para contextos |
| `ai-client.ts` | System Prompt (streamSummarize) | (Texto largo) | Prompt para resumir contenido |
| `ai-client.ts` | System Prompt (extractKeyPoints) | (Texto largo) | Prompt para extraer puntos clave |
| `ai-client.ts` | System Prompt (generateTags) | (Texto largo) | Prompt para generar tags |
| `ai-client.ts` | System Prompt (analyzeSentiment) | (Texto largo) | Prompt análisis sentimiento |
| `index.ts` | System Prompt (Chat Semántico) | (Texto largo) | Prompt principal del asistente |

### Worker (Apps/Worker-Py)
| Archivo | Variable | Valor Actual | Propósito |
|---------|----------|--------------|-----------|
| `whisper_transcriber.py` | `DEFAULT_MODEL` | `small` | Modelo de Whisper por defecto |

## 🛠️ Plan de Implementación

### 1. Base de Datos (Supabase)
Crear tabla `app_settings` para almacenar configuraciones clave-valor.

```sql
CREATE TABLE app_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  description TEXT,
  category TEXT, -- 'ai', 'ui', 'system', 'search'
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insertar valores por defecto iniciales
```

### 2. Backend (API-Bun)
- Crear servicio `SettingsService` para leer/escribir configuraciones.
- Implementar cache simple (TTL) para no consultar DB en cada request si no es necesario (opcional, o lectura directa por ahora).
- Crear endpoints:
  - `GET /settings`: Obtener todas las configuraciones.
  - `PUT /settings/:key`: Actualizar una configuración.
- Refactorizar servicios (`AIClient`, `SemanticSearch`, etc.) para leer de `SettingsService`.

### 3. Frontend (Web)
- Crear página `/settings` en el Dashboard.
- Crear formulario dinámico para editar valores (Texto, JSON, Números).
- Actualizar `DebugDashboard` y hooks para consumir configuraciones desde la API (o Store) en lugar de constantes.

### 4. Tareas
- [ ] Modificar `supabase/schema.sql`.
- [ ] Crear endpoints en API.
- [ ] Refactorizar Backend para usar settings.
- [ ] Crear UI de Settings.
- [ ] Refactorizar Frontend para usar settings.
