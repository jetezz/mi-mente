# 🔄 Sistema de Cola de Procesamiento en Segundo Plano

> **Versión:** 1.0
> **Fecha:** 2026-01-19
> **Estado:** 🚧 En Desarrollo

---

## 📋 Resumen Ejecutivo

### Problema Actual
Actualmente, en el Dashboard se procesa un video de YouTube y hay que esperar a que termine todo el proceso (descarga → transcripción → resumen → guardado) antes de poder procesar el siguiente. Esto bloquea al usuario y no permite procesar múltiples videos en paralelo.

### Solución Propuesta
Separar el **procesamiento del video** de la **edición y subida a Notion**, permitiendo:
1. Encolar múltiples videos para procesamiento en segundo plano
2. Ver el estado de los resúmenes en proceso
3. Cuando un resumen está listo, editarlo y subirlo a Notion de forma independiente

---

## 🔀 Nuevo Flujo de Usuario

```
┌─────────────────────────────────────────────────────────────────────────┐
│                     NUEVO FLUJO CON COLA                                 │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  1. INPUT (Dashboard)                                                    │
│     ├─► Usuario pega URL + prompt opcional                               │
│     └─► Click "Procesar" → Job encolado                                  │
│                                                                          │
│  2. PROCESAMIENTO EN SEGUNDO PLANO                                       │
│     ├─► El job se ejecuta en background                                  │
│     ├─► Usuario puede agregar más videos inmediatamente                  │
│     └─► Estado guardado en Supabase (processing_jobs)                   │
│                                                                          │
│  3. VISTA DE COLA (/queue o /jobs)                                       │
│     ├─► Lista de todos los jobs con estados:                             │
│     │   • ⏳ pending: En espera                                          │
│     │   • 🔄 processing: Procesando (descarga/transcripción/resumen)     │
│     │   • ✅ ready: Listo para revisar                                   │
│     │   • 💾 saved: Guardado en Notion                                   │
│     │   • ❌ failed: Error                                               │
│     └─► Click en job "ready" → Abre editor                              │
│                                                                          │
│  4. EDITOR DE RESUMEN (/jobs/:id/edit)                                   │
│     ├─► Ver resumen generado                                             │
│     ├─► Editar contenido                                                 │
│     ├─► Seleccionar categoría                                            │
│     └─► Guardar → Sube a Notion                                         │
│                                                                          │
│  5. POST-GUARDADO                                                        │
│     ├─► Modal: "¿Quieres indexar este contenido?"                        │
│     └─► Job marcado como "saved"                                        │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 🏗️ Arquitectura Técnica

### Opción Elegida: **Supabase + Polling + Background Worker**

Después de evaluar las opciones disponibles (BullMQ, Inngest, pg_boss), elegimos una arquitectura simple basada en:

| Componente | Rol |
|------------|-----|
| **Supabase `processing_jobs`** | Cola persistente (tabla SQL) |
| **API Endpoint `/jobs/process`** | Encola nuevo job |
| **Background Worker (Bun)** | Procesa jobs pendientes |
| **Frontend Polling** | Actualiza estado cada 5s |

### ¿Por qué no Inngest/BullMQ?
- **Inngest**: Excelente pero requiere infraestructura adicional (cloud o self-hosted)
- **BullMQ**: Requiere Redis adicional
- **Nuestra solución**: Zero infraestructura adicional, usa Supabase que ya tenemos

### Diagrama de Componentes

```
┌─────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Frontend  │────►│   API (Bun)     │────►│  Supabase       │
│   (Astro)   │     │   /jobs/*       │     │  processing_jobs│
└─────────────┘     └────────┬────────┘     └────────┬────────┘
                             │                       │
                             │  Cron/Interval        │
                             ▼                       │
                    ┌─────────────────┐              │
                    │ Background      │◄─────────────┘
                    │ Job Processor   │
                    │ (Bun process)   │
                    └────────┬────────┘
                             │
                    ┌────────▼────────┐
                    │   Worker-py     │
                    │   (FastAPI)     │
                    └─────────────────┘
```

---

## 📊 Schema de Base de Datos

### Nueva Tabla: `processing_jobs`

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
  progress INT DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
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
  retry_count INT DEFAULT 0,
  worker_id TEXT
);

-- Índices
CREATE INDEX idx_jobs_user ON processing_jobs(user_id);
CREATE INDEX idx_jobs_status ON processing_jobs(status);
CREATE INDEX idx_jobs_created ON processing_jobs(created_at DESC);
```

---

## 📝 Lista de Tareas

### Fase 1: Base de Datos y Modelos
- [x] **1.1** Crear tabla `processing_jobs` en `supabase/schema.sql` ✅
- [x] **1.2** Añadir políticas RLS para `processing_jobs` ✅
- [x] **1.3** Crear función SQL para obtener siguiente job pendiente ✅
- [x] **1.4** Crear tipos TypeScript para `ProcessingJob` ✅

### Fase 2: Backend - Endpoints API
- [x] **2.1** Crear endpoint `POST /jobs` - Crear nuevo job ✅
- [x] **2.2** Crear endpoint `GET /jobs` - Listar jobs del usuario ✅
- [x] **2.3** Crear endpoint `GET /jobs/:id` - Detalle de job ✅
- [x] **2.4** Crear endpoint `POST /jobs/:id/save` - Guardar en Notion ✅
- [x] **2.5** Crear endpoint `DELETE /jobs/:id` - Eliminar job ✅
- [x] **2.6** Crear endpoint `POST /jobs/:id/retry` - Reintentar job fallido ✅

### Fase 3: Backend - Job Processor
- [x] **3.1** Crear servicio `JobProcessor` en `src/application/job-processor.ts` ✅
- [x] **3.2** Implementar lógica de polling para jobs pendientes ✅
- [x] **3.3** Implementar procesamiento: descarga → transcripción → resumen ✅
- [x] **3.4** Implementar actualización de estado en tiempo real ✅
- [x] **3.5** Implementar manejo de errores y reintentos ✅
- [x] **3.6** Integrar con worker-py existente ✅

### Fase 4: Frontend - Vista de Cola
- [x] **4.1** Crear página `/jobs` (astro) ✅
- [x] **4.2** Crear componente `JobsList.tsx` - Lista de jobs ✅
- [x] **4.3** Crear componente `JobCard.tsx` - Tarjeta de job ✅
- [x] **4.4** Crear hook `useJobs.ts` - Fetch y polling de jobs ✅
- [x] **4.5** Implementar filtros por estado ✅
- [x] **4.6** Añadir acciones: eliminar, reintentar ✅

### Fase 5: Frontend - Dashboard Actualizado
- [x] **5.1** Modificar `EnhancedDashboard.tsx` para encolar jobs ✅
- [x] **5.2** Mostrar contador de jobs en proceso ✅
- [x] **5.3** Añadir link a `/jobs` en navegación ✅
- [x] **5.4** Toast de confirmación "Video encolado" ✅

### Fase 6: Frontend - Editor de Resumen
- [x] **6.1** Crear página `/jobs/[id].astro` - Editor ✅
- [x] **6.2** Crear `JobEditor.tsx` componente completo ✅
- [x] **6.3** Integrar guardado en Notion desde esta vista ✅
- [x] **6.4** Mostrar modal de indexación post-guardado ✅

### Fase 7: Integración y Testing
- [ ] **7.1** Tests de integración para endpoints
- [ ] **7.2** Probar flujo completo end-to-end
- [ ] **7.3** Verificar manejo de errores
- [x] **7.4** Documentar en PROYECTO.md ✅

---

## 🔧 Detalles de Implementación

### 1. Servicio JobProcessor

```typescript
// apps/api-bun/src/application/job-processor.ts

interface JobProcessor {
  // Iniciar el procesador (se ejecuta en background)
  start(): void;
  
  // Detener el procesador
  stop(): void;
  
  // Procesar un job específico
  processJob(jobId: string): Promise<void>;
  
  // Obtener siguiente job pendiente
  getNextPendingJob(): Promise<ProcessingJob | null>;
}
```

### 2. Estados del Job

| Estado | Descripción | Progress |
|--------|-------------|----------|
| `pending` | En cola, esperando procesamiento | 0% |
| `downloading` | Descargando video/audio | 10-30% |
| `transcribing` | Transcribiendo con Whisper | 30-60% |
| `summarizing` | Generando resumen con IA | 60-90% |
| `ready` | Listo para revisar | 100% |
| `saved` | Guardado en Notion | 100% |
| `failed` | Error en procesamiento | Variable |

### 3. Polling Strategy

```typescript
// Frontend: useJobs.ts
const POLL_INTERVAL = 5000; // 5 segundos

const { data, refetch } = useQuery({
  queryKey: ['jobs'],
  queryFn: fetchJobs,
  refetchInterval: (data) => {
    // Solo hacer polling si hay jobs en proceso
    const hasActiveJobs = data?.some(job => 
      ['pending', 'downloading', 'transcribing', 'summarizing'].includes(job.status)
    );
    return hasActiveJobs ? POLL_INTERVAL : false;
  }
});
```

---

## 📈 Progreso de Implementación

| Fase | Tarea | Estado | Fecha |
|------|-------|--------|-------|
| 1 | Schema DB | ✅ Completado | 2026-01-19 |
| 2 | Endpoints API | ✅ Completado | 2026-01-19 |
| 3 | Job Processor | ✅ Completado | 2026-01-19 |
| 4 | Vista Cola | ✅ Completado | 2026-01-19 |
| 5 | Dashboard | ✅ Completado | 2026-01-19 |
| 6 | Editor | ✅ Completado | 2026-01-19 |
| 7 | Testing | ⬜ Pendiente | - |

---

## 🚀 Comandos de Desarrollo

```bash
# Ejecutar migraciones de Supabase
# (Copiar contenido de schema.sql al SQL Editor de Supabase)

# Levantar servicios
docker-compose up --build

# Ver logs del API
docker-compose logs -f api-bun

# Ver logs del Worker
docker-compose logs -f worker-py
```

---

## 📚 Referencias

- [Supabase Realtime](https://supabase.com/docs/guides/realtime)
- [Bun Background Tasks](https://bun.sh/docs/runtime/shell)
- [ElysiaJS Streaming](https://elysiajs.com/concept/life-cycle.html)
