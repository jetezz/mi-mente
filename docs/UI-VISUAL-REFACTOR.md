# UI Visual Refactoring Plan - Hybrid Brain

**Fecha de inicio:** 27 de Enero, 2026  
**Estado:** ✅ Completado  
**Versión:** 1.1

---

## 📌 Contexto del Desarrollo

Este documento define el plan de refactorización visual para **Hybrid Brain**, migrando el sistema de componentes actual a un stack moderno basado en:

- **Shadcn/ui** - Librería de componentes
- **Vercel AI Chatbot** - Componentes para IA
- **Tailwind CSS 4.1** - Sistema de estilos
- **Tailwind Animations (midudev)** - Animaciones
- **View Transitions API** - Transiciones entre páginas
- **Astro 5** - Framework con sistema de islas

---

## 🎯 Objetivos

1. Migrar a Tailwind CSS v4.1 con su nueva sintaxis CSS-first
2. Implementar Shadcn/ui como sistema de componentes base
3. Adoptar patrones de UI del Vercel AI Chatbot para el chat
4. Añadir animaciones fluidas con tailwind-animations
5. Implementar View Transitions para navegación suave
6. Mantener arquitectura de islas de Astro para rendimiento óptimo
7. Aplicar principios SOLID en la estructura de componentes

---

## 🛠️ Stack Tecnológico

### 1. Shadcn/ui

**Documentación oficial:** https://ui.shadcn.com/

Shadcn/ui es una colección de componentes reutilizables con código abierto. No es una librería tradicional - te da el código fuente de los componentes para personalizar.

#### Instalación para Astro

```bash
# 1. Crear proyecto (ya existente)
# 2. Configurar tsconfig.json con paths
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}

# 3. Inicializar shadcn
pnpm dlx shadcn@latest init

# 4. Añadir componentes
pnpm dlx shadcn@latest add button card dialog input ...
```

#### Componentes clave a implementar

- **UI Base:** Button, Card, Input, Select, Dialog, Dropdown, Tabs
- **Datos:** Table, Badge, Avatar, Tooltip
- **Feedback:** Toast, Alert, Progress, Skeleton
- **Formularios:** Form, Checkbox, Radio, Switch, Slider
- **Navegación:** Breadcrumb, NavigationMenu, Sidebar

---

### 2. Vercel AI Chatbot

**Documentación:** https://github.com/vercel/ai-chatbot  
**Demo:** https://chat.vercel.ai/

#### Características clave

- Hooks para chat streaming (`useChat`, `useStreamingChat`)
- Componentes de chat con markdown rendering
- Gestión de mensajes y estado
- Integración con AI SDK

#### Patrones a adoptar

```tsx
// Estructura de mensajes
interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sources?: Source[];
  metadata?: Metadata;
}

// Componentes inspirados
- ChatMessages (lista de mensajes)
- ChatInput (entrada con textarea autosize)
- MessageBubble (burbuja de mensaje)
- SourceCard (tarjeta de fuentes citadas)
- StreamingIndicator (indicador de escritura)
```

---

### 3. Tailwind CSS 4.1

**Documentación:** https://tailwindcss.com/docs/installation/using-vite

#### Cambios principales en v4

```css
/* Nueva sintaxis CSS-first */
@import "tailwindcss";

/* Ya no se necesita tailwind.config.js */
/* Se configura directamente en CSS */

/* Tema en CSS */
@theme {
  --color-primary: oklch(0.7 0.15 270);
  --color-dark-900: oklch(0.15 0.02 270);
}
```

#### Instalación

```bash
npm install tailwindcss @tailwindcss/vite

# En vite.config.ts
import tailwindcss from '@tailwindcss/vite'
export default defineConfig({
  plugins: [tailwindcss()]
})
```

#### Migración desde v3

- Remover `tailwind.config.mjs`
- Mover configuración a CSS con `@theme`
- Actualizar imports a `@import 'tailwindcss'`
- Revisar clases deprecated

---

### 4. Tailwind Animations (midudev)

**Documentación:** https://github.com/midudev/tailwind-animations  
**Demo:** https://tailwind-animations.com/

#### Instalación

```bash
npm install tailwind-animations
```

#### Uso con Tailwind v4

```css
/* globals.css */
@import "tailwindcss";
@import "tailwind-animations";
```

#### Animaciones disponibles

```html
<!-- Fade -->
<div class="animate-fade-in">Fade in</div>
<div class="animate-fade-out">Fade out</div>

<!-- Slide -->
<div class="animate-slide-in-bottom">Slide from bottom</div>
<div class="animate-slide-in-left">Slide from left</div>

<!-- Zoom -->
<div class="animate-zoom-in">Zoom in</div>

<!-- Con delays y duración -->
<div class="animate-fade-in animate-delay-300 animate-duration-slow">Slow fade with delay</div>

<!-- View Timeline (scroll animations) -->
<div class="view-animate-single animate-zoom-in animate-range-[entry_10%_contain_25%]">Animate on scroll</div>
```

---

### 5. View Transitions API

**Documentación MDN:** https://developer.mozilla.org/en-US/docs/Web/API/View_Transition_API  
**Documentación Astro:** https://docs.astro.build/en/guides/view-transitions/

#### Conceptos clave

- Transiciones suaves entre páginas/estados
- Compatible con SPA y MPA
- Pseudo-elementos CSS para personalizar

#### Implementación en Astro

```astro
---
import { ClientRouter } from 'astro:transitions';
---
<html>
  <head>
    <ClientRouter />
  </head>
  <body>
    <!-- Contenido con transiciones automáticas -->
  </body>
</html>
```

#### Directivas de transición

```astro
<!-- Nombrar elementos para transiciones -->
<header transition:name="header">

<!-- Mantener estado entre páginas -->
<Counter client:load transition:persist />

<!-- Animaciones built-in -->
<main transition:animate="slide">
<aside transition:animate="fade">
<div transition:animate="none">

<!-- Personalizar animaciones -->
---
import { fade } from 'astro:transitions';
---
<header transition:animate={fade({ duration: '0.4s' })}>
```

#### Eventos del ciclo de vida

```javascript
// Antes de cargar nueva página
document.addEventListener("astro:before-preparation", () => {});

// Después de preparar DOM
document.addEventListener("astro:after-preparation", () => {});

// Antes del swap
document.addEventListener("astro:before-swap", e => {
  e.newDocument.documentElement.dataset.theme = "dark";
});

// Después del swap
document.addEventListener("astro:after-swap", () => {});

// Página cargada completamente
document.addEventListener("astro:page-load", () => {
  setupEventListeners();
});
```

---

### 6. Astro 5 - Sistema de Islas

**Documentación:** https://docs.astro.build/en/concepts/islands/

#### Filosofía

- Renderizar HTML estático por defecto
- JavaScript solo donde se necesita interactividad
- Hidratación selectiva con `client:*`

#### Directivas de cliente

```astro
<!-- Hidrata inmediatamente -->
<Component client:load />

<!-- Hidrata cuando el navegador está idle -->
<Component client:idle />

<!-- Hidrata cuando es visible -->
<Component client:visible />

<!-- Hidrata solo en dispositivos con hover -->
<Component client:media="(min-width: 768px)" />

<!-- Nunca hidrata (solo SSR) -->
<Component />
```

#### Server Islands (Astro 5)

```astro
<!-- Renderizado diferido en servidor -->
<Avatar server:defer />
```

---

## 📊 Análisis de la Aplicación Actual

### Estructura de Componentes Existente

```
src/components/
├── ui/                      # Componentes base reutilizables
│   ├── Modal.tsx           # Modal con overlay y animaciones
│   ├── EmptyState.tsx      # Estado vacío
│   ├── PageHeader.tsx      # Cabecera de página
│   ├── SidebarCard.tsx     # Tarjeta de sidebar
│   ├── QuickActions.tsx    # Acciones rápidas
│   ├── Toast.tsx           # Notificaciones
│   ├── Stepper.tsx         # Stepper de progreso
│   └── index.ts            # Barrel export
│
├── jobs/                    # Componentes de Jobs
│   ├── JobCard.tsx
│   ├── JobEditor.tsx
│   └── JobsList.tsx
│
├── AuthContext.tsx          # Contexto de autenticación
├── AuthForm.tsx             # Formulario de auth
├── CategoryManager.tsx      # Gestión de categorías
├── CategorySelector.tsx     # Selector de categorías
├── CategoryTree.tsx         # Árbol de categorías
├── ChatInterface.tsx        # Interfaz de chat (466 líneas)
├── ContentEditor.tsx        # Editor de contenido
├── Dashboard.tsx            # Dashboard principal
├── DebugDashboard.tsx       # Panel de debug
├── EnhancedDashboard.tsx    # Dashboard mejorado
├── Header.astro             # Header (Astro)
├── IndexingDashboard.tsx    # Dashboard de indexación
├── IndexingModal.tsx        # Modal de indexación
├── MarkdownPreview.tsx      # Preview de markdown
├── ProcessingProgress.tsx   # Progreso de procesamiento
├── PromptInput.tsx          # Input de prompts
├── ResultCard.tsx           # Tarjeta de resultados
├── SettingsEditor.tsx       # Editor de ajustes
├── StatusIndicator.tsx      # Indicador de estado
├── TagSelector.tsx          # Selector de tags
├── UrlInput.tsx             # Input de URLs
└── UserMenu.tsx             # Menú de usuario
```

### Páginas Existentes

```
src/pages/
├── index.astro        # Landing
├── login.astro        # Login
├── register.astro     # Registro
├── dashboard.astro    # Dashboard principal
├── chat.astro         # Chat con IA
├── categories.astro   # Gestión de categorías
├── settings.astro     # Configuración
├── indexing.astro     # Indexación
├── debug.astro        # Debug
└── jobs/              # Páginas de jobs
```

### Estilos Actuales

**tailwind.config.mjs (v3):**

- Paleta de colores: primary (púrpura), dark (grises), accent (cyan, pink, amber, emerald)
- Fuentes: Inter, Outfit, JetBrains Mono
- Animaciones personalizadas: gradient, float, shimmer

**global.css:**

- Componentes CSS: `.btn`, `.btn-primary`, `.btn-secondary`, `.card`, `.card-hover`
- Scrollbar personalizado
- Efectos de gradiente

### Dependencias Actuales (package.json)

```json
{
  "dependencies": {
    "@astrojs/react": "latest",
    "@astrojs/tailwind": "latest",
    "@blocknote/react": "0.46.1", // Editor de bloques
    "@dnd-kit/core": "^6.3.1", // Drag and drop
    "@mantine/core": "^8.3.12", // UI (a migrar)
    "@supabase/supabase-js": "^2.39.0",
    "astro": "latest",
    "react": "latest",
    "tailwindcss": "^3.4.1" // A migrar a v4.1
  }
}
```

---

## 🏗️ Arquitectura SOLID de Componentes

### Principios a Aplicar

#### 1. Single Responsibility (SRP)

Cada componente debe tener una única responsabilidad.

```
components/
├── ui/                      # Componentes primitivos (átomos)
│   ├── Button/
│   │   ├── Button.tsx       # Componente
│   │   ├── button.styles.ts # Variantes
│   │   └── index.ts
│   ├── Input/
│   ├── Card/
│   └── ...
│
├── patterns/                # Patrones de UI (moléculas)
│   ├── FormField/           # Label + Input + Error
│   ├── SearchBox/           # Input + Button + Results
│   ├── MessageBubble/       # Avatar + Content + Actions
│   └── ...
│
├── features/                # Componentes de feature (organismos)
│   ├── chat/
│   │   ├── ChatMessages.tsx
│   │   ├── ChatInput.tsx
│   │   └── ChatSidebar.tsx
│   ├── processing/
│   ├── indexing/
│   └── ...
│
└── layouts/                 # Layouts Astro
    ├── BaseLayout.astro
    ├── AppLayout.astro
    └── AuthLayout.astro
```

#### 2. Open/Closed (OCP)

Componentes extensibles sin modificar el código fuente.

```tsx
// Usar variants con CVA (class-variance-authority)
import { cva, type VariantProps } from "class-variance-authority";

const buttonVariants = cva("inline-flex items-center justify-center rounded-xl font-medium transition-colors", {
  variants: {
    variant: {
      default: "bg-primary-600 text-white hover:bg-primary-500",
      outline: "border border-dark-700 bg-transparent hover:bg-dark-800",
      ghost: "hover:bg-dark-800/50",
      destructive: "bg-red-600 text-white hover:bg-red-500",
    },
    size: {
      sm: "h-8 px-3 text-sm",
      default: "h-10 px-4",
      lg: "h-12 px-6 text-lg",
    },
  },
  defaultVariants: {
    variant: "default",
    size: "default",
  },
});
```

#### 3. Liskov Substitution (LSP)

Componentes intercambiables a través de interfaces consistentes.

```tsx
// Interface común para todos los componentes de input
interface InputBaseProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  error?: string;
  placeholder?: string;
}

// Todos los inputs implementan la misma interface
<TextInput {...props} />
<TextArea {...props} />
<SearchInput {...props} />
```

#### 4. Interface Segregation (ISP)

Interfaces pequeñas y específicas.

```tsx
// ❌ Interface grande
interface MessageProps {
  message: Message;
  onEdit: () => void;
  onDelete: () => void;
  onCopy: () => void;
  onShare: () => void;
  onReact: () => void;
}

// ✅ Interfaces segregadas
interface MessageContentProps {
  content: string;
  role: "user" | "assistant";
}

interface MessageActionsProps {
  onCopy?: () => void;
  onShare?: () => void;
}

// Composición
<Message>
  <MessageContent content={msg.content} role={msg.role} />
  <MessageActions onCopy={handleCopy} />
</Message>;
```

#### 5. Dependency Inversion (DIP)

Depender de abstracciones, no implementaciones.

```tsx
// Contexto para servicios
const APIContext = createContext<APIService>(null);

// Hook genérico
function useAPI() {
  return useContext(APIContext);
}

// Componente depende de abstracción
function ChatInterface() {
  const api = useAPI();
  // api.sendMessage(), api.getHistory()...
}
```

---

## 📋 Fases de Implementación

### Fase 1: Preparación e Infraestructura ✅ COMPLETADA

- [x] Backup del proyecto actual
- [x] Actualizar dependencias base (package.json)
- [x] Migrar de Tailwind v3 a v4.1 (global.css con @theme)
- [x] Eliminar tailwind.config.mjs
- [x] Configurar CVA, clsx, tailwind-merge
- [x] Instalar Radix UI primitives
- [x] Instalar tailwind-animations
- [x] Configurar View Transitions en Layout.astro

### Fase 2: Sistema de Diseño Base ✅ COMPLETADA

- [x] Definir theme en CSS (@theme directive)
- [x] Crear src/lib/utils.ts con cn()
- [x] Crear componentes primitivos:
  - [x] Button.tsx (con CVA variants)
  - [x] Card.tsx (con subcomponentes)
  - [x] Input.tsx (con icons support)
  - [x] Textarea.tsx
  - [x] Badge.tsx (con dot indicator)
  - [x] Spinner.tsx
  - [x] Skeleton.tsx (con variantes)
  - [x] Separator.tsx (Radix)
  - [x] Avatar.tsx (Radix)
  - [x] Tooltip.tsx (Radix)
  - [x] Switch.tsx (Radix)
  - [x] Label.tsx (Radix)
  - [x] Select.tsx (Radix)
  - [x] Progress.tsx (Radix)
- [x] Actualizar barrel export (index.ts)

### Fase 3: Componentes de Layout ✅ COMPLETADA

- [x] Refactorizar Layout.astro con View Transitions
- [x] Refactorizar AppLayout.astro con transiciones
- [x] Crear AuthLayout.astro
- [x] Implementar Header con transiciones
- [x] Implementar Sidebar responsive

### Fase 4: Componentes de UI ✅ COMPLETADA

- [x] Modal → Dialog (Shadcn)
- [x] Toast → Sonner (Shadcn)
- [x] EmptyState con animaciones
- [x] PageHeader con breadcrumbs
- [x] StatusIndicator mejorado
- [x] Skeleton loaders (ya existía de Fase 2)

### Fase 5: Chat Interface (Vercel AI patterns) ✅ ACTUALIZADA (2026-01-27)

- [x] Rediseñar ChatInterface con patrones de AI Chatbot
- [x] Implementar ChatMessages con scroll, empty state animado y gradientes
- [x] Crear MessageBubble con Avatar rings, markdown mejorado y botón copiar
- [x] Implementar streaming UI con StreamingCursor y ThinkingIndicator mejorados
- [x] Añadir indicadores de "thinking" con LoadingDots y TypingIndicator
- [x] Mejorar SourceCard con iconos SVG, glow effects y tooltips enriquecidos
- [x] Crear ChatInput con glassmorphism, hints de teclado y disclaimer
- [x] Crear ChatHeader con logo gradient, slider de umbral personalizado
- [x] Añadir SuggestionChips con iconos y animaciones escalonadas
- [x] Implementar EmptyChat con Feature Pills y gradientes

**Componentes refactorizados:**
- `ChatMessages.tsx` - Estado vacío con gradientes, feature pills, layout centrado
- `MessageBubble.tsx` - Full-width para asistente, avatares con rings, copiar con tooltip
- `ChatInput.tsx` - Glassmorphism container, keyboard hints, disclaimer
- `ChatHeader.tsx` - Logo gradient, slider personalizado con colores dinámicos
- `SourceCard.tsx` - Iconos SVG, efectos glow por relevancia, tooltips mejorados
- `ThinkingIndicator.tsx` - Gradientes, nuevos componentes auxiliares
- `ChatInterface.tsx` - Container con backdrop-blur y bordes premium

### Fase 6: Dashboard & Processing ✅ COMPLETADA

- [x] Rediseñar Dashboard con Cards de Shadcn
- [x] Crear InputSection component modular
- [x] Crear FeatureCard component reutilizable
- [x] Mejorar ProcessingCard con step indicators y animations
- [x] Refactorizar ResultDisplay con Shadcn components
- [x] Implementar copy-to-clipboard con feedback
- [x] Crear dashboard components barrel export

### Fase 7: Formularios & Auth ✅ COMPLETADA

- [x] Migrar AuthForm con Shadcn Form components
- [x] Mejorar inputs con iconos y validación visual
- [x] Implementar CategorySelector mejorado con Badge
- [x] Refactorizar SettingsEditor con Card, Button, Textarea
- [x] Añadir estados de loading con Skeleton

### Fase 8: Jobs & Indexing ✅ COMPLETADA

- [x] Rediseñar JobsList con Card de Shadcn
- [x] Mejorar JobCard con animaciones y Badge, Progress, Tooltip
- [x] Refactorizar IndexingDashboard con Card, Button, Badge, Spinner
- [x] Mejorar IndexingModal con Button, Progress, Spinner

### Fase 9: Animaciones & Microinteracciones ✅ COMPLETADA

- [x] Aplicar tailwind-animations en toda la UI
- [x] Implementar hover states (hover-lift, hover-glow, hover-border-glow)
- [x] Añadir loading states (press-effect, stagger-children)
- [x] Scroll animations (scroll-fade-in, scroll-slide-up con animation-timeline)
- [x] Page transitions fluidas (view-transition-old/new con slide y scale)

### Fase 10: Testing & Polish ✅ COMPLETADA

- [x] Verificar responsive design (grid-cols responsive en todos los componentes)
- [x] Testing de accesibilidad (aria-label, role attributes añadidos)
- [x] Optimización de performance (reduced-motion media query)
- [x] Documentación de componentes (inline en código)
- [x] Cleanup de código legacy (migración btn-\* a Button en UserMenu, CategoryManager)

---

## 📦 Componentes Shadcn a Instalar

```bash
# Core UI
pnpm dlx shadcn@latest add button
pnpm dlx shadcn@latest add input
pnpm dlx shadcn@latest add textarea
pnpm dlx shadcn@latest add card
pnpm dlx shadcn@latest add badge
pnpm dlx shadcn@latest add avatar

# Feedback
pnpm dlx shadcn@latest add alert
pnpm dlx shadcn@latest add toast
pnpm dlx shadcn@latest add progress
pnpm dlx shadcn@latest add skeleton

# Overlays
pnpm dlx shadcn@latest add dialog
pnpm dlx shadcn@latest add dropdown-menu
pnpm dlx shadcn@latest add popover
pnpm dlx shadcn@latest add tooltip

# Data Display
pnpm dlx shadcn@latest add table
pnpm dlx shadcn@latest add tabs
pnpm dlx shadcn@latest add accordion

# Forms
pnpm dlx shadcn@latest add form
pnpm dlx shadcn@latest add select
pnpm dlx shadcn@latest add checkbox
pnpm dlx shadcn@latest add switch
pnpm dlx shadcn@latest add slider

# Navigation
pnpm dlx shadcn@latest add breadcrumb
pnpm dlx shadcn@latest add navigation-menu
pnpm dlx shadcn@latest add sidebar
```

---

## 🎨 Tokens de Diseño (Theme)

```css
/* src/styles/theme.css */
@import "tailwindcss";
@import "tailwind-animations";

@theme {
  /* Colors - Primary */
  --color-primary-50: oklch(0.97 0.02 285);
  --color-primary-100: oklch(0.94 0.04 285);
  --color-primary-500: oklch(0.65 0.18 285);
  --color-primary-600: oklch(0.55 0.22 285);
  --color-primary-900: oklch(0.3 0.15 285);

  /* Colors - Dark (backgrounds) */
  --color-dark-800: oklch(0.2 0.02 270);
  --color-dark-900: oklch(0.12 0.02 270);
  --color-dark-950: oklch(0.08 0.01 270);

  /* Colors - Accent */
  --color-accent-cyan: oklch(0.75 0.15 195);
  --color-accent-pink: oklch(0.7 0.2 350);
  --color-accent-emerald: oklch(0.7 0.17 160);

  /* Typography */
  --font-sans: "Inter", system-ui, sans-serif;
  --font-display: "Outfit", "Inter", sans-serif;
  --font-mono: "JetBrains Mono", monospace;

  /* Radius */
  --radius-sm: 0.375rem;
  --radius-md: 0.5rem;
  --radius-lg: 0.75rem;
  --radius-xl: 1rem;
  --radius-2xl: 1.5rem;

  /* Shadows */
  --shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05);
  --shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1);
  --shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1);
  --shadow-glow: 0 0 20px rgb(139 92 246 / 0.3);
}
```

---

## ⚠️ Consideraciones de Migración

### Componentes a Deprecar

- `@mantine/core` → Reemplazar con Shadcn/ui
- Clases CSS custom (`.btn-*`) → Usar Button de Shadcn
- `tailwind.config.mjs` → Migrar a CSS con `@theme`

### Breaking Changes de Tailwind v4

- `@tailwind base/components/utilities` → `@import 'tailwindcss'`
- Configuración JS → Configuración CSS
- Algunos valores por defecto cambiaron

### Compatibilidad Astro

- View Transitions requieren `<ClientRouter />`
- Islands mantienen estado con `transition:persist`
- Scripts pueden necesitar `data-astro-rerun`

---

## 🧹 Fase 12: Cleanup de Código Legacy

> **Estado:** ✅ Completado (Actualizado: 2026-01-27)

### 12.1 Clases CSS Legacy (Estado Final)

Las siguientes clases CSS se mantienen **solo para páginas Astro estáticas** (index.astro) para evitar JavaScript innecesario:

| Clase CSS | Se mantiene para | Estado |
|-----------|------------------|--------|
| `.btn-primary`, `.btn-secondary` | `index.astro` | ✅ Mínimo necesario |
| `.card`, `.card-hover` | `index.astro` | ✅ Mínimo necesario |
| `.badge-primary` | `index.astro` | ✅ Mínimo necesario |
| `.text-gradient` | `index.astro` | ✅ Mínimo necesario |
| `.divider` | `index.astro` | ✅ Mínimo necesario |

**Clases eliminadas:** `.btn`, `.btn-ghost`, `.btn-danger`, `.card-glow`, `.input`, `.input-lg`, `.label`, `.badge`, `.badge-success`, `.badge-warning`, `.badge-danger`, `.progress`, `.progress-bar`, `.status-*`, `.glass`, `.glass-dark`, `.text-gradient-pink`, `.skeleton`, `.tooltip`

### 12.2 Archivos Migrados/Eliminados

| Archivo | Cambio | Estado |
|---------|--------|--------|
| `components/jobs/JobEditor.tsx` | Migrar `btn-*` → `<Button>` | ✅ Completado |
| `components/ContentEditor.tsx` | Migrar `btn-*` → `<Button>`, `input` → `<Input>` | ✅ Completado |
| `components/IndexingModal.tsx` | Migrar `Modal` → `Dialog` | ✅ Completado |
| `components/ui/QuickActions.tsx` | Fix `asChild` con múltiples hijos | ✅ Completado |
| `components/EnhancedDashboard.tsx` | Fix `asChild` con múltiples hijos | ✅ Completado |
| `components/jobs/JobCard.tsx` | Fix `asChild` con múltiples hijos | ✅ Completado |
| `components/jobs/JobsList.tsx` | Fix `asChild` con múltiples hijos | ✅ Completado |
| `components/ui/Button.tsx` | Separar lógica `asChild` de `loading` | ✅ Completado |
| `components/ui/Modal.tsx` | **ELIMINADO** - Reemplazado por Dialog | 🗑️ Eliminado |
| `components/ui/Toast.tsx` | **ELIMINADO** - Reemplazado por Sonner | 🗑️ Eliminado |
| `styles/global.css` | Limpieza de clases CSS no utilizadas | ✅ Completado |

### 12.3 Componentes UI (Estado Final)

| Componente | Estado | Notas |
|------------|--------|-------|
| `Modal` + `ModalFooter` | 🗑️ **Eliminado** | Usar `Dialog` |
| `ToastProvider`, `useToast` | 🗑️ **Eliminado** | Usar `toast` de Sonner |
| `Stepper`, `VerticalStepper` | ✅ En uso | En `ContentEditor.tsx` |
| `SidebarCard`, `QuickActions` | ✅ En uso | En múltiples páginas |

### 12.4 Dependencias (Estado Final)

| Dependencia | Estado | Notas |
|-------------|--------|-------|
| `@mantine/core` | ✅ Mantener | Requerido por BlockNote |
| `@mantine/hooks` | ✅ Mantener | Requerido por BlockNote |
| `@blocknote/mantine` | ✅ En uso | Editor de texto rico |
| `@radix-ui/react-toast` | ⚠️ Revisar | Posible duplicado con Sonner |

### 12.5 Reglas de Migración

#### Uso correcto de `Button asChild`

Cuando usas `Button asChild` con un enlace `<a>`, el contenido debe ser **un único elemento React**:

```tsx
// ❌ Incorrecto - múltiples hijos causa error
<Button asChild>
  <a href="/page">🔄 Texto</a>  
</Button>

// ✅ Correcto - un único hijo
<Button asChild>
  <a href="/page"><span>🔄 Texto</span></a>
</Button>
```

#### Migración de clases CSS a componentes

```tsx
// ❌ Antes (clase CSS legacy)
<button className="btn-primary px-8 py-3">
  Guardar
</button>

// ✅ Después (componente React)
import { Button } from '@/components/ui';

<Button size="lg">
  Guardar
</Button>
```

---

## 📚 Referencias

- [Shadcn/ui Documentation](https://ui.shadcn.com/docs)
- [Shadcn/ui for Astro](https://ui.shadcn.com/docs/installation/astro)
- [Vercel AI Chatbot](https://github.com/vercel/ai-chatbot)
- [Tailwind CSS v4](https://tailwindcss.com/docs)
- [Tailwind Animations](https://github.com/midudev/tailwind-animations)
- [View Transitions API - MDN](https://developer.mozilla.org/en-US/docs/Web/API/View_Transition_API)
- [Astro View Transitions](https://docs.astro.build/en/guides/view-transitions/)
- [Astro Islands](https://docs.astro.build/en/concepts/islands/)

---

## ✅ Checklist de Validación

Antes de comenzar el desarrollo, validar:

- [ ] ¿Está de acuerdo con la estructura SOLID propuesta?
- [ ] ¿Hay componentes adicionales que deban priorizarse?
- [ ] ¿Hay páginas o features que no deban modificarse?
- [ ] ¿Hay preferencias específicas de animaciones?
- [ ] ¿Mantener la paleta de colores actual o modificarla?
- [ ] ¿Priorizar mobile-first o desktop-first?

---

**Próximo paso:** Una vez validado este plan, se procederá con la Fase 1: Preparación e Infraestructura.
