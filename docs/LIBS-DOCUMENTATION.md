# Libraries Documentation Summary

Este documento contiene la documentación resumida de las librerías utilizadas en la refactorización visual de Hybrid Brain.

---

## 1. Shadcn/ui

### Overview
Shadcn/ui es un sistema de componentes de código abierto. No es una librería tradicional que se instala desde npm - en su lugar, te proporciona el código fuente de los componentes para que puedas personalizarlos.

### Principios
- **Open Code**: Tienes acceso completo al código fuente
- **Composition**: Todos los componentes usan una interfaz común y componible
- **Distribution**: Schema de archivos planos y CLI para distribuir componentes
- **Beautiful Defaults**: Estilos por defecto cuidadosamente elegidos
- **AI-Ready**: Código abierto para que LLMs lean, entiendan y mejoren

### Instalación en Astro

```bash
# 1. Configurar tsconfig.json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}

# 2. Inicializar shadcn
pnpm dlx shadcn@latest init

# 3. Añadir componentes
pnpm dlx shadcn@latest add button
```

### Uso básico

```astro
---
import { Button } from "@/components/ui/button"
---

<html lang="en">
  <body>
    <Button>Click me</Button>
    <Button variant="outline">Outline</Button>
    <Button variant="ghost">Ghost</Button>
  </body>
</html>
```

### Componentes disponibles
- **Layout**: Accordion, Aspect Ratio, Card, Carousel, Collapsible
- **Inputs**: Button, Checkbox, Input, Radio, Select, Slider, Switch, Textarea
- **Data Display**: Avatar, Badge, Calendar, Table, Tooltip
- **Feedback**: Alert, Dialog, Progress, Skeleton, Toast
- **Navigation**: Breadcrumb, Command, Context Menu, Dropdown, Menubar, Navigation Menu, Tabs

### API Button Example

```tsx
import { Button } from "@/components/ui/button"

// Variants
<Button variant="default">Default</Button>
<Button variant="outline">Outline</Button>
<Button variant="ghost">Ghost</Button>
<Button variant="destructive">Destructive</Button>
<Button variant="secondary">Secondary</Button>
<Button variant="link">Link</Button>

// Sizes
<Button size="default">Default</Button>
<Button size="sm">Small</Button>
<Button size="lg">Large</Button>
<Button size="icon"><Icon /></Button>

// With asChild for polymorphism
<Button asChild>
  <a href="/login">Login</a>
</Button>
```

### API Card Example

```tsx
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

<Card>
  <CardHeader>
    <CardTitle>Card Title</CardTitle>
    <CardDescription>Card Description</CardDescription>
    <CardAction>Card Action</CardAction>
  </CardHeader>
  <CardContent>
    <p>Card Content</p>
  </CardContent>
  <CardFooter>
    <p>Card Footer</p>
  </CardFooter>
</Card>

// Size variant
<Card size="sm">Small card</Card>
```

---

## 2. Vercel AI Chatbot (Chat SDK)

### Overview
Template open-source construido con Next.js y AI SDK para crear aplicaciones de chatbot. En Hybrid Brain hemos adoptado los patrones visuales y de UX de este template para crear una experiencia de chat profesional.

### Features
- Next.js App Router con RSC y Server Actions
- AI SDK: API unificada para generar texto, objetos estructurados y tool calls
- Shadcn/ui con Tailwind CSS
- Radix UI para accesibilidad
- Data persistence con Postgres
- Auth con Auth.js

### Model Providers
Usa Vercel AI Gateway para acceder a múltiples modelos:
- xAI (default): grok-2-vision-1212, grok-3-mini
- OpenAI, Anthropic, Cohere, y más

### Estructura del proyecto

```
vercel/ai-chatbot/
├── app/                    # Next.js App Router
├── components/             # React components
├── hooks/                  # Custom hooks (useChat, etc.)
├── lib/                    # Utilities
├── artifacts/              # AI artifacts
└── tests/                  # E2E tests
```

### Componentes UI Implementados en Hybrid Brain

Basándonos en los patrones del Vercel AI Chatbot, hemos creado los siguientes componentes:

#### ChatMessages
Lista de mensajes con auto-scroll, estado vacío animado y soporte para streaming.

```tsx
import { ChatMessages } from "@/components/chat";

<ChatMessages
  messages={messages}
  isStreaming={isStreaming}
  streamingContent={streamedContent}
  streamingSources={sources}
  onSuggestionSelect={handleSubmit}
/>
```

#### MessageBubble
Burbuja de mensaje con soporte para markdown, avatares, botón de copiar y metadatos.

```tsx
import { MessageBubble } from "@/components/chat";

<MessageBubble
  message={{
    id: "1",
    role: "assistant",
    content: "Respuesta en **markdown**",
    sources: [...],
    metadata: { tokensUsed: 150, method: "semantic" }
  }}
  isStreaming={false}
/>
```

#### ChatInput
Input con auto-resize, indicador de teclado y botón de envío con animaciones.

```tsx
import { ChatInput, SuggestionChips } from "@/components/chat";

<ChatInput
  onSubmit={handleSubmit}
  isLoading={isStreaming}
  placeholder="Pregunta sobre tus notas..."
/>

<SuggestionChips
  suggestions={["¿Qué aprendí sobre React?", "Resume las notas de IA"]}
  onSelect={handleSubmit}
/>
```

#### ChatHeader
Cabecera con controles de búsqueda, umbral de similitud y selector de categorías.

```tsx
import { ChatHeader } from "@/components/chat";

<ChatHeader
  useSemanticSearch={true}
  onToggleSemantic={toggle}
  threshold={0.5}
  onThresholdChange={setThreshold}
  showThresholdSlider={true}
  onToggleThresholdSlider={toggle}
  onClearChat={clearChat}
  hasMessages={messages.length > 0}
/>
```

#### SourceCard / SourceList
Tarjetas de fuentes citadas con indicadores de relevancia por colores.

```tsx
import { SourceList } from "@/components/chat";

<SourceList
  sources={[
    { id: "1", title: "Mi nota", similarity: 0.85, category: "React" }
  ]}
  compact={true}
/>
```

#### ThinkingIndicator / StreamingCursor
Indicadores visuales para estados de carga y streaming.

```tsx
import { ThinkingIndicator, StreamingCursor, TypingIndicator } from "@/components/chat";

// Tres puntos animados
<ThinkingIndicator text="Buscando en tu cerebro..." />

// Cursor parpadeante al final del texto en streaming
<StreamingCursor />

// Indicador tipo "está escribiendo"
<TypingIndicator name="Hybrid Brain" />
```

### Patrones de Diseño Profesional

#### Full-width Assistant Messages
Los mensajes del asistente ocupan todo el ancho con fondo sutil:
```tsx
<div className={cn(
  "py-6",
  isUser ? "bg-transparent" : "bg-dark-900/30 hover:bg-dark-900/40"
)}>
```

#### Avatares con Ring Effect
```tsx
<Avatar className={cn(
  "ring-2 ring-offset-2 ring-offset-dark-950",
  isUser ? "ring-dark-600" : "ring-primary-500/50 shadow-lg shadow-primary-500/20"
)}>
```

#### Similarity Color Coding
```tsx
function getSimilarityConfig(similarity: number) {
  if (similarity >= 0.7) return { color: "text-emerald-400", label: "Alta" };
  if (similarity >= 0.5) return { color: "text-amber-400", label: "Media" };
  return { color: "text-red-400", label: "Baja" };
}
```

#### Glassmorphism Containers
```tsx
<div className="bg-dark-950/80 backdrop-blur-xl border border-dark-800/50">
```

### Hook de Chat Personalizado

```tsx
// Hook personalizado para streaming
import { useStreamingChat } from "@/hooks/useStreamingChat";

const {
  startStream,
  isStreaming,
  streamedContent,
  sources,
  metadata,
  error,
  reset,
} = useStreamingChat({
  userId,
  useSemantic: true,
  threshold: 0.5,
});

// Iniciar streaming
startStream(input, categoryId, threshold);
```

---

## 3. Tailwind CSS v4.1

### Overview
Tailwind CSS escanea archivos HTML, JavaScript y templates para class names, genera los estilos correspondientes y los escribe a un archivo CSS estático. Zero-runtime.

### Instalación con Vite

```bash
npm install tailwindcss @tailwindcss/vite
```

```ts
// vite.config.ts
import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [tailwindcss()]
})
```

### Cambio de sintaxis (v3 → v4)

```css
/* v3 - tailwind.config.js + CSS */
@tailwind base;
@tailwind components;
@tailwind utilities;

/* v4 - Solo CSS */
@import 'tailwindcss';
```

### Configuración en CSS

```css
@import 'tailwindcss';

@theme {
  /* Custom colors using oklch */
  --color-primary: oklch(0.7 0.15 270);
  --color-secondary: oklch(0.8 0.1 200);
  
  /* Custom fonts */
  --font-sans: 'Inter', sans-serif;
  
  /* Custom spacing */
  --spacing-18: 4.5rem;
  
  /* Custom border radius */
  --radius-xl: 1.5rem;
}
```

### Uso básico

```html
<h1 class="text-3xl font-bold underline">
  Hello world!
</h1>

<button class="bg-primary-600 hover:bg-primary-500 text-white px-4 py-2 rounded-xl">
  Click me
</button>
```

### Cursor en buttons (v4 cambio)
Tailwind v4 usa `cursor: default` en buttons. Para mantener `cursor: pointer`:

```css
@layer base {
  button:not(:disabled),
  [role="button"]:not(:disabled) {
    cursor: pointer;
  }
}
```

---

## 4. Tailwind Animations (midudev)

### Overview
Animaciones fáciles para Tailwind CSS con solo clases.

### Instalación

```bash
npm install tailwind-animations
```

### Uso con Tailwind CSS v4

```css
/* globals.css */
@import 'tailwindcss';
@import 'tailwind-animations';
```

### Animaciones disponibles

#### Fade
```html
<div class="animate-fade-in">Fade in</div>
<div class="animate-fade-out">Fade out</div>
```

#### Slide
```html
<div class="animate-slide-in-bottom">From bottom</div>
<div class="animate-slide-in-top">From top</div>
<div class="animate-slide-in-left">From left</div>
<div class="animate-slide-in-right">From right</div>

<div class="animate-slide-out-bottom">To bottom</div>
<div class="animate-slide-out-top">To top</div>
```

#### Zoom
```html
<div class="animate-zoom-in">Zoom in</div>
<div class="animate-zoom-out">Zoom out</div>
```

#### Modificadores
```html
<!-- Delay -->
<div class="animate-fade-in animate-delay-100">100ms delay</div>
<div class="animate-fade-in animate-delay-300">300ms delay</div>
<div class="animate-fade-in animate-delay-500">500ms delay</div>

<!-- Duration -->
<div class="animate-fade-in animate-duration-fast">Fast</div>
<div class="animate-fade-in animate-duration-slow">Slow</div>
```

#### View Timeline (Scroll Animations)
```html
<div class="view-animate-single animate-zoom-in animate-range-[entry_10%_contain_25%]">
  Animates on scroll
</div>

<div class="view-animate-[--myTimeline] animate-fade-in">
  Custom timeline name
</div>
```

---

## 5. View Transitions API

### Overview
API para crear transiciones animadas entre diferentes vistas de un sitio web. Funciona para SPA y MPA.

### Conceptos clave
- Transiciones suaves sin escribir JavaScript complejo
- Captura "snapshots" del DOM antes/después
- Pseudo-elementos CSS para personalizar animaciones

### Interfaces principales

```typescript
// Iniciar transición
document.startViewTransition(() => {
  // Actualizar DOM aquí
  updateDOM();
});

// Con opciones
document.startViewTransition({
  update: () => updateDOM(),
  types: ['slide-in']
});
```

### CSS Pseudo-elementos

```css
/* Root de transiciones */
::view-transition {
  /* Overlay sobre todo el contenido */
}

/* Grupo de una transición */
::view-transition-group(root) {
  animation-duration: 0.4s;
}

/* Par de imágenes (old y new) */
::view-transition-image-pair(header) {
  /* Contenedor */
}

/* Snapshot antiguo */
::view-transition-old(header) {
  animation: fade-out 0.3s ease-out;
}

/* Vista nueva */
::view-transition-new(header) {
  animation: fade-in 0.3s ease-in;
}
```

### CSS Properties

```css
.element {
  /* Nombre para identificar en transiciones */
  view-transition-name: hero-image;
  
  /* Clase para agrupar estilos */
  view-transition-class: card;
}
```

### Eventos

```javascript
// pageswap - antes de navegar fuera
window.addEventListener('pageswap', (e) => {
  console.log('Leaving page');
});

// pagereveal - al llegar a nueva página
window.addEventListener('pagereveal', (e) => {
  console.log('New page revealed');
});
```

### Browser Support
- Chrome 111+
- Edge 111+
- Safari 18+
- Firefox 144+

---

## 6. Astro View Transitions

### Overview
Astro proporciona `<ClientRouter />` para view transitions con client-side routing.

### Habilitación

```astro
---
import { ClientRouter } from 'astro:transitions';
---
<html>
  <head>
    <ClientRouter />
  </head>
  <body>
    <slot />
  </body>
</html>
```

### Directivas de transición

#### transition:name
Nombrar elementos para emparejar entre páginas:
```astro
<!-- old-page.astro -->
<aside transition:name="hero">

<!-- new-page.astro -->
<aside transition:name="hero">
```

#### transition:animate
Animaciones built-in:
```astro
<main transition:animate="slide">
<aside transition:animate="fade">
<div transition:animate="none">
<div transition:animate="initial">
```

Personalizar:
```astro
---
import { fade } from 'astro:transitions';
---
<header transition:animate={fade({ duration: '0.4s' })}>
```

#### transition:persist
Mantener estado entre páginas:
```astro
<video controls muted autoplay transition:persist>
  <source src="video.mp4" type="video/mp4" />
</video>

<Counter client:load transition:persist />
```

### Lifecycle Events

```javascript
// Antes de preparar
document.addEventListener('astro:before-preparation', (e) => {
  // Mostrar spinner
});

// Después de preparar
document.addEventListener('astro:after-preparation', () => {
  // Ocultar spinner
});

// Antes del swap
document.addEventListener('astro:before-swap', (e) => {
  // Modificar newDocument
  e.newDocument.documentElement.dataset.theme = 'dark';
});

// Después del swap
document.addEventListener('astro:after-swap', () => {
  // Restaurar estado
});

// Página cargada
document.addEventListener('astro:page-load', () => {
  // Re-inicializar scripts
  setupEventListeners();
});
```

### Navegación programática

```javascript
import { navigate } from 'astro:transitions/client';

// En script
document.querySelector('select').onchange = (e) => {
  navigate(e.target.value);
};

// En React component
function Form() {
  return (
    <select onChange={(e) => navigate(e.target.value)}>
      <option value="/play">Play</option>
      <option value="/blog">Blog</option>
    </select>
  );
}
```

### Re-ejecutar scripts

```html
<!-- Script que se re-ejecuta en cada navegación -->
<script is:inline data-astro-rerun>
  console.log('Runs on every page');
</script>
```

### Fallback control

```astro
<!-- Para navegadores sin soporte -->
<ClientRouter fallback="animate" /> <!-- default -->
<ClientRouter fallback="swap" />    <!-- sin animación -->
<ClientRouter fallback="none" />    <!-- navegación normal -->
```

---

## 7. Astro Islands Architecture

### Overview
Astro renderiza la mayoría de la página como HTML estático, con "islas" de JavaScript donde se necesita interactividad.

### Client Directives

```astro
<!-- Hidrata inmediatamente -->
<Counter client:load />

<!-- Hidrata cuando el navegador está idle -->
<HeavyComponent client:idle />

<!-- Hidrata cuando es visible en viewport -->
<LazyComponent client:visible />

<!-- Hidrata en media query específica -->
<MobileMenu client:media="(max-width: 768px)" />

<!-- Solo server-side, sin JavaScript -->
<StaticComponent />
```

### Server Islands (Astro 5)

```astro
---
import Avatar from '../components/Avatar.astro';
---

<!-- Renderizado diferido en servidor -->
<Avatar server:defer />
```

### Múltiples frameworks
Astro soporta React, Vue, Svelte, Solid, etc. en el mismo proyecto:

```astro
---
import ReactComponent from './ReactComponent';
import VueComponent from './VueComponent.vue';
import SvelteComponent from './SvelteComponent.svelte';
---

<ReactComponent client:load />
<VueComponent client:idle />
<SvelteComponent client:visible />
```

### Beneficios
1. **Performance**: JavaScript solo donde se necesita
2. **Parallel loading**: Islas cargan independientemente
3. **Progressive enhancement**: Funciona sin JS
4. **SEO**: HTML completo para crawlers

---

## Referencias Oficiales

- [Shadcn/ui](https://ui.shadcn.com/docs)
- [Vercel AI Chatbot](https://github.com/vercel/ai-chatbot)
- [Tailwind CSS v4](https://tailwindcss.com/docs)
- [Tailwind Animations](https://github.com/midudev/tailwind-animations)
- [View Transitions API (MDN)](https://developer.mozilla.org/en-US/docs/Web/API/View_Transition_API)
- [Astro View Transitions](https://docs.astro.build/en/guides/view-transitions/)
- [Astro Islands](https://docs.astro.build/en/concepts/islands/)
