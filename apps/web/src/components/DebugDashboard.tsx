/**
 * 🔧 Debug Dashboard - Centro de Pruebas de Hybrid Brain
 * Página para testear todas las funcionalidades del proyecto organizadas por categorías
 */
import { useState, useEffect, useRef } from 'react';
import type { AppSetting } from '../types';

import { API_URL } from '../lib/config';

// Default placeholders that will be overwritten by settings
const PLACEHOLDER_USER_ID = 'b0808906-883f-40d5-a1e3-d510a1ae82b7';
const PLACEHOLDER_YOUTUBE_URL = 'https://www.youtube.com/watch?v=yGhu5p29r8U';

// Tipos de categorías disponibles
type DebugCategory =
  | 'health'
  | 'notion'
  | 'ia'
  | 'indexing'
  | 'search'
  | 'youtube'
  | 'categories'
  | 'tags';

interface CategoryInfo {
  id: DebugCategory;
  name: string;
  icon: string;
  description: string;
}

interface EndpointConfig {
  id: string;
  name: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  endpoint: string;
  description: string;
  params?: { name: string; type: 'text' | 'textarea' | 'number' | 'boolean'; required?: boolean; default?: string }[];
  isStreaming?: boolean;
}

interface TestResult {
  id: string;
  endpoint: string;
  method: string;
  status: 'success' | 'error' | 'loading';
  response?: any;
  error?: string;
  duration?: number;
  timestamp: Date;
}

// Configuración de todas las categorías
const CATEGORIES: CategoryInfo[] = [
  { id: 'health', name: 'Health & Status', icon: '🏥', description: 'Estado de los servicios' },
  { id: 'notion', name: 'Notion', icon: '📓', description: 'Gestión de notas' },
  { id: 'ia', name: 'IA', icon: '🤖', description: 'Inteligencia Artificial' },
  { id: 'indexing', name: 'Indexación', icon: '📊', description: 'Motor semántico' },
  { id: 'search', name: 'Búsqueda', icon: '🔍', description: 'Búsqueda vectorial' },
  { id: 'youtube', name: 'YouTube', icon: '📺', description: 'Procesamiento multimedia' },
  { id: 'categories', name: 'Categorías', icon: '🏷️', description: 'Organización' },
  { id: 'tags', name: 'Tags', icon: '🔖', description: 'Etiquetas' },
];

// Configuración de endpoints por categoría
const ENDPOINTS_BY_CATEGORY: Record<DebugCategory, EndpointConfig[]> = {
  health: [
    { id: 'health', name: 'Health Check', method: 'GET', endpoint: '/health', description: 'Estado completo de todos los servicios' },
    { id: 'check-notion', name: 'Check Notion', method: 'GET', endpoint: '/check-notion', description: 'Verificar conexión con Notion' },
    { id: 'embeddings-test', name: 'Test Embeddings', method: 'GET', endpoint: '/embeddings/test', description: 'Probar generación de embeddings', params: [{ name: 'text', type: 'text', default: 'Esto es una prueba de embeddings' }] },
  ],
  notion: [
    { id: 'notes', name: 'Listar Notas', method: 'GET', endpoint: '/notes', description: 'Listar notas desde Notion', params: [{ name: 'limit', type: 'number', default: '10' }] },
  ],
  ia: [
    {
      id: 'ai-test',
      name: 'Test IA Completo',
      method: 'POST',
      endpoint: '/ai/test',
      description: 'Probar resumen, puntos clave, tags, sentimiento',
      params: [{ name: 'text', type: 'textarea', required: true, default: 'La inteligencia artificial está transformando el mundo. Los modelos de lenguaje como GPT-4 pueden generar texto, código y ayudar en tareas creativas.' }]
    },
    {
      id: 'ask',
      name: 'Chat Directo',
      method: 'POST',
      endpoint: '/ask',
      description: 'Chat con RAG usando Notion directo',
      params: [
        { name: 'question', type: 'text', required: true, default: '¿Qué sabes sobre React?' },
        { name: 'categoryId', type: 'text' },
      ]
    },
    {
      id: 'ask-semantic-stream',
      name: 'Chat Semántico (Stream)',
      method: 'GET',
      endpoint: '/ask/semantic/stream',
      description: 'Búsqueda semántica con streaming',
      isStreaming: true,
      params: [
        { name: 'userId', type: 'text', required: true, default: PLACEHOLDER_USER_ID },
        { name: 'question', type: 'text', required: true, default: '¿Qué sabes sobre programación?' },
        { name: 'threshold', type: 'number', default: '0.5' },
      ]
    },
  ],
  indexing: [
    {
      id: 'index-trigger',
      name: 'Trigger Indexación',
      method: 'POST',
      endpoint: '/index/trigger',
      description: 'Indexar todo el contenido',
      params: [
        { name: 'userId', type: 'text', required: true, default: PLACEHOLDER_USER_ID },
        { name: 'mode', type: 'text', default: 'full' },
      ]
    },
    {
      id: 'index-status',
      name: 'Estado Indexación',
      method: 'GET',
      endpoint: '/index/status',
      description: 'Estadísticas y cambios pendientes',
      params: [{ name: 'userId', type: 'text', required: true, default: PLACEHOLDER_USER_ID }]
    },
    {
      id: 'index-pages',
      name: 'Páginas Indexadas',
      method: 'GET',
      endpoint: '/index/pages',
      description: 'Listar páginas en el índice',
      params: [{ name: 'userId', type: 'text', required: true, default: PLACEHOLDER_USER_ID }, { name: 'limit', type: 'number', default: '50' }]
    },
  ],
  search: [
    {
      id: 'search',
      name: 'Búsqueda Semántica',
      method: 'POST',
      endpoint: '/search',
      description: 'Búsqueda semántica en chunks',
      params: [
        { name: 'userId', type: 'text', required: true, default: PLACEHOLDER_USER_ID },
        { name: 'question', type: 'text', required: true, default: 'React hooks' },
        { name: 'maxChunks', type: 'number', default: '5' },
        { name: 'similarityThreshold', type: 'number', default: '0.5' },
      ]
    },
    {
      id: 'search-debug',
      name: 'Debug Búsqueda',
      method: 'GET',
      endpoint: '/search/debug',
      description: 'Solo chunks sin IA',
      params: [
        { name: 'userId', type: 'text', required: true, default: PLACEHOLDER_USER_ID },
        { name: 'q', type: 'text', required: true, default: 'inteligencia artificial' },
        { name: 'limit', type: 'number', default: '5' },
      ]
    },
  ],
  youtube: [
    {
      id: 'video-info',
      name: 'Info Video',
      method: 'POST',
      endpoint: '/video/info',
      description: 'Obtener metadata del video',
      params: [{ name: 'url', type: 'text', required: true, default: PLACEHOLDER_YOUTUBE_URL }]
    },
    {
      id: 'transcribe-native',
      name: '🎯 Transcripción Nativa',
      method: 'POST',
      endpoint: '/worker/transcribe',
      description: 'Obtener transcripción nativa de YouTube (subtítulos oficiales). Prioriza: API → yt-dlp → Whisper',
      params: [
        { name: 'url', type: 'text', required: true, default: PLACEHOLDER_YOUTUBE_URL },
        { name: 'language', type: 'text', default: '' },
      ]
    },
    {
      id: 'process',
      name: 'Procesar URL',
      method: 'POST',
      endpoint: '/process',
      description: 'Flujo completo: descargar → transcribir → resumir → guardar',
      params: [
        { name: 'url', type: 'text', required: true, default: PLACEHOLDER_YOUTUBE_URL },
        { name: 'saveToNotion', type: 'boolean', default: 'false' },
      ]
    },
    {
      id: 'stream-preview',
      name: 'Stream Preview',
      method: 'GET',
      endpoint: '/process/stream-preview',
      description: 'Procesamiento con streaming',
      isStreaming: true,
      params: [
        { name: 'url', type: 'text', required: true, default: PLACEHOLDER_YOUTUBE_URL },
        { name: 'customPrompt', type: 'textarea' },
      ]
    },
    {
      id: 'worker-health',
      name: 'Worker Health',
      method: 'GET',
      endpoint: '/worker/health',
      description: 'Estado del worker de Python (Whisper, cookies, etc.)'
    },
    {
      id: 'worker-preload',
      name: 'Preload Whisper',
      method: 'POST',
      endpoint: '/worker/preload',
      description: 'Pre-cargar modelo de whisper'
    },
  ],

  categories: [
    { id: 'categories-list', name: 'Listar Categorías', method: 'GET', endpoint: '/categories', description: 'Todas las categorías' },
    { id: 'categories-tree', name: 'Árbol Categorías', method: 'GET', endpoint: '/categories/tree', description: 'Categorías jerárquicas' },
    {
      id: 'categories-create',
      name: 'Crear Categoría',
      method: 'POST',
      endpoint: '/categories',
      description: 'Nueva categoría',
      params: [
        { name: 'name', type: 'text', required: true, default: 'Test Category' },
        { name: 'parentId', type: 'text' },
      ]
    },
  ],
  tags: [
    {
      id: 'tags-list',
      name: 'Listar Tags',
      method: 'GET',
      endpoint: '/tags',
      description: 'Obtener tags del usuario',
      params: [{ name: 'userId', type: 'text', required: true, default: PLACEHOLDER_USER_ID }]
    },
    {
      id: 'tags-create',
      name: 'Crear Tag',
      method: 'POST',
      endpoint: '/tags',
      description: 'Crear nuevo tag',
      params: [
        { name: 'userId', type: 'text', required: true, default: PLACEHOLDER_USER_ID },
        { name: 'name', type: 'text', required: true, default: 'test-tag' },
        { name: 'color', type: 'text', default: '#8B5CF6' },
      ]
    },
  ],
};

export default function DebugDashboard() {
  const [activeCategory, setActiveCategory] = useState<DebugCategory>('health');
  const [results, setResults] = useState<TestResult[]>([]);
  const [userId, setUserId] = useState<string>('');
  const [formValues, setFormValues] = useState<Record<string, Record<string, string>>>({});
  const [streamingContent, setStreamingContent] = useState<string>('');
  const abortControllerRef = useRef<AbortController | null>(null);

  // Obtener userId al cargar
  useEffect(() => {
    const stored = localStorage.getItem('supabase.auth.token');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setUserId(parsed?.currentSession?.user?.id || '');
      } catch { }
    }
  }, []);

  // Cargar configuraciones globales
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const res = await fetch(`${API_URL}/settings`);
        const data = await res.json();
        if (data.success) {
          const defaultUser = data.settings.find((s: AppSetting) => s.key === 'debug.default_user_id')?.value;
          const defaultYoutube = data.settings.find((s: AppSetting) => s.key === 'debug.default_youtube_url')?.value;

          if (defaultUser && !userId) setUserId(defaultUser);

          // Actualizar valores por defecto en el estado local si es necesario
          // Nota: Esto actualiza el estado `formValues` para que los inputs tomen estos valores
          // Pero los defaults en ENDPOINTS_BY_CATEGORY son estáticos. 
          // Una mejor aproximación es setear formValues iniciales.

          const newValues: Record<string, Record<string, string>> = {};
          CATEGORIES.forEach(cat => {
            ENDPOINTS_BY_CATEGORY[cat.id].forEach(ep => {
              if (ep.params) {
                ep.params.forEach(p => {
                  if (p.name === 'userId' && defaultUser) {
                    if (!newValues[ep.id]) newValues[ep.id] = {};
                    newValues[ep.id][p.name] = defaultUser;
                  }
                  if (p.name === 'url' && defaultYoutube) {
                    if (!newValues[ep.id]) newValues[ep.id] = {};
                    newValues[ep.id][p.name] = defaultYoutube;
                  }
                });
              }
            });
          });
          setFormValues(prev => ({ ...prev, ...newValues }));
        }
      } catch (e) {
        console.error("Error loading settings", e);
      }
    };
    loadSettings();
  }, [userId]);


  // Función para ejecutar un endpoint
  const executeEndpoint = async (endpoint: EndpointConfig) => {
    const startTime = Date.now();
    const resultId = `${endpoint.id}-${Date.now()}`;

    // Obtener valores del formulario incluyendo valores por defecto
    const params: Record<string, string> = {};
    if (endpoint.params) {
      for (const param of endpoint.params) {
        // Usar la misma lógica que getFormValue para obtener el valor correcto
        const stored = formValues[endpoint.id]?.[param.name];
        if (stored !== undefined) {
          params[param.name] = stored;
        } else if (param.name === 'userId' && userId) {
          params[param.name] = userId;
        } else if (param.default) {
          params[param.name] = param.default;
        }
      }
    }

    // Agregar resultado en estado loading
    setResults(prev => [{
      id: resultId,
      endpoint: endpoint.endpoint,
      method: endpoint.method,
      status: 'loading',
      timestamp: new Date(),
    }, ...prev]);

    try {
      let url = `${API_URL}${endpoint.endpoint}`;
      let response: Response;

      if (endpoint.isStreaming) {
        // Para streaming, usar SSE
        setStreamingContent('');

        const queryParams = new URLSearchParams();
        Object.entries(params).forEach(([key, value]) => {
          if (value) queryParams.append(key, value);
        });
        url = `${url}?${queryParams.toString()}`;

        abortControllerRef.current = new AbortController();

        const eventSource = await fetch(url, { signal: abortControllerRef.current.signal });
        const reader = eventSource.body?.getReader();
        const decoder = new TextDecoder();

        let fullContent = '';
        let allEvents: any[] = [];

        if (reader) {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const text = decoder.decode(value);
            const lines = text.split('\n');

            for (const line of lines) {
              if (line.startsWith('data: ')) {
                try {
                  const data = JSON.parse(line.slice(6));
                  allEvents.push(data);

                  if (data.type === 'token' && data.content) {
                    fullContent += data.content;
                    setStreamingContent(fullContent);
                  }
                } catch { }
              }
            }
          }
        }

        const duration = Date.now() - startTime;
        setResults(prev => prev.map(r =>
          r.id === resultId
            ? { ...r, status: 'success', response: { events: allEvents, streamedContent: fullContent }, duration }
            : r
        ));
        return;
      }

      if (endpoint.method === 'GET') {
        const queryParams = new URLSearchParams();
        Object.entries(params).forEach(([key, value]) => {
          if (value) queryParams.append(key, value);
        });
        url = `${url}?${queryParams.toString()}`;
        response = await fetch(url);
      } else {
        const body: Record<string, any> = {};
        Object.entries(params).forEach(([key, value]) => {
          if (value) {
            // Convertir tipos
            if (value === 'true') body[key] = true;
            else if (value === 'false') body[key] = false;
            else if (!isNaN(Number(value)) && value.trim() !== '') body[key] = Number(value);
            else body[key] = value;
          }
        });

        response = await fetch(url, {
          method: endpoint.method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
      }

      // Intentar parsear como JSON, si falla usar el texto como error
      const text = await response.text();
      let data: any;
      try {
        data = JSON.parse(text);
      } catch {
        // El servidor devolvió texto plano (error), convertir a objeto
        data = { error: text, rawResponse: true };
      }
      const duration = Date.now() - startTime;

      setResults((prev: TestResult[]) => prev.map((r: TestResult) =>
        r.id === resultId
          ? { ...r, status: response.ok && !data.error ? 'success' : 'error', response: data, duration }
          : r
      ));
    } catch (error) {
      const duration = Date.now() - startTime;
      setResults(prev => prev.map(r =>
        r.id === resultId
          ? { ...r, status: 'error', error: String(error), duration }
          : r
      ));
    }
  };

  // Actualizar valor de formulario
  const updateFormValue = (endpointId: string, paramName: string, value: string) => {
    setFormValues(prev => ({
      ...prev,
      [endpointId]: {
        ...(prev[endpointId] || {}),
        [paramName]: value,
      },
    }));
  };

  // Obtener valor de formulario con default
  const getFormValue = (endpointId: string, param: NonNullable<EndpointConfig['params']>[number]) => {
    const stored = formValues[endpointId]?.[param.name];
    if (stored !== undefined) return stored;

    // Auto-fill userId si el parámetro es userId
    if (param.name === 'userId' && userId) return userId;

    return param.default || '';
  };

  const activeEndpoints = ENDPOINTS_BY_CATEGORY[activeCategory];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      {/* Header */}
      <div className="bg-gray-800/50 backdrop-blur-sm border-b border-gray-700 p-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-3xl">🔧</span>
            <div>
              <h1 className="text-xl font-bold text-white">Debug Dashboard</h1>
              <p className="text-sm text-gray-400">Centro de pruebas de Hybrid Brain</p>
            </div>
          </div>
          {userId && (
            <div className="text-sm text-gray-400">
              <span className="text-gray-500">User ID:</span>{' '}
              <code className="text-purple-400">{userId.slice(0, 8)}...</code>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-4 grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar - Categorías */}
        <div className="lg:col-span-1">
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700 p-4 sticky top-4">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <span>📂</span> Categorías
            </h2>
            <nav className="space-y-1">
              {CATEGORIES.map(category => (
                <button
                  key={category.id}
                  onClick={() => setActiveCategory(category.id)}
                  className={`w-full text-left px-4 py-3 rounded-lg flex items-center gap-3 transition-all ${activeCategory === category.id
                    ? 'bg-purple-600/20 border border-purple-500/50 text-white'
                    : 'hover:bg-gray-700/50 text-gray-400 hover:text-white border border-transparent'
                    }`}
                >
                  <span className="text-xl">{category.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{category.name}</div>
                    <div className="text-xs text-gray-500 truncate">{category.description}</div>
                  </div>
                  <span className="text-xs bg-gray-700 px-2 py-0.5 rounded-full">
                    {ENDPOINTS_BY_CATEGORY[category.id].length}
                  </span>
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Main Content */}
        <div className="lg:col-span-3 space-y-6">
          {/* Category Header */}
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700 p-6">
            <div className="flex items-center gap-4">
              <span className="text-4xl">{CATEGORIES.find(c => c.id === activeCategory)?.icon}</span>
              <div>
                <h2 className="text-2xl font-bold text-white">
                  {CATEGORIES.find(c => c.id === activeCategory)?.name}
                </h2>
                <p className="text-gray-400">
                  {CATEGORIES.find(c => c.id === activeCategory)?.description}
                </p>
              </div>
            </div>
          </div>

          {/* Endpoints Grid */}
          <div className="grid grid-cols-1 gap-4">
            {activeEndpoints.map(endpoint => (
              <div
                key={endpoint.id}
                className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700 overflow-hidden"
              >
                {/* Endpoint Header */}
                <div className="p-4 border-b border-gray-700 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className={`px-2 py-1 text-xs font-mono rounded ${endpoint.method === 'GET' ? 'bg-green-500/20 text-green-400' :
                      endpoint.method === 'POST' ? 'bg-blue-500/20 text-blue-400' :
                        endpoint.method === 'PUT' ? 'bg-yellow-500/20 text-yellow-400' :
                          'bg-red-500/20 text-red-400'
                      }`}>
                      {endpoint.method}
                    </span>
                    <div>
                      <div className="font-medium text-white">{endpoint.name}</div>
                      <code className="text-xs text-gray-400">{endpoint.endpoint}</code>
                    </div>
                    {endpoint.isStreaming && (
                      <span className="text-xs bg-purple-500/20 text-purple-400 px-2 py-0.5 rounded">
                        SSE
                      </span>
                    )}
                  </div>
                </div>

                {/* Endpoint Body */}
                <div className="p-4">
                  <p className="text-sm text-gray-400 mb-4">{endpoint.description}</p>

                  {/* Parameters */}
                  {endpoint.params && endpoint.params.length > 0 && (
                    <div className="space-y-3 mb-4">
                      {endpoint.params.map(param => (
                        <div key={param.name}>
                          <label className="block text-sm text-gray-400 mb-1">
                            {param.name} {param.required && <span className="text-red-400">*</span>}
                          </label>
                          {param.type === 'textarea' ? (
                            <textarea
                              value={getFormValue(endpoint.id, param)}
                              onChange={(e) => updateFormValue(endpoint.id, param.name, e.target.value)}
                              className="w-full bg-gray-900/50 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500"
                              rows={3}
                            />
                          ) : (
                            <input
                              type={param.type === 'number' ? 'number' : 'text'}
                              value={getFormValue(endpoint.id, param)}
                              onChange={(e) => updateFormValue(endpoint.id, param.name, e.target.value)}
                              className="w-full bg-gray-900/50 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500"
                            />
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  <button
                    onClick={() => executeEndpoint(endpoint)}
                    className="w-full bg-purple-600 hover:bg-purple-700 text-white font-medium py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
                  >
                    <span>▶️</span> Ejecutar
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Results Section */}
          {results.length > 0 && (
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                  <span>📋</span> Resultados
                </h3>
                <button
                  onClick={() => setResults([])}
                  className="text-sm text-gray-400 hover:text-white"
                >
                  Limpiar todo
                </button>
              </div>

              <div className="space-y-4 max-h-[600px] overflow-y-auto">
                {results.map(result => (
                  <div
                    key={result.id}
                    className={`rounded-lg border p-4 ${result.status === 'loading' ? 'bg-gray-900/50 border-gray-600' :
                      result.status === 'success' ? 'bg-green-900/20 border-green-600/30' :
                        'bg-red-900/20 border-red-600/30'
                      }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 text-xs font-mono rounded ${result.method === 'GET' ? 'bg-green-500/20 text-green-400' :
                          'bg-blue-500/20 text-blue-400'
                          }`}>
                          {result.method}
                        </span>
                        <code className="text-sm text-gray-300">{result.endpoint}</code>
                        {result.status === 'loading' && (
                          <span className="animate-pulse">⏳</span>
                        )}
                      </div>
                      <div className="text-xs text-gray-500">
                        {result.duration !== undefined && `${result.duration}ms`}
                      </div>
                    </div>

                    {result.status !== 'loading' && (
                      <pre className="bg-gray-900/50 rounded-lg p-3 text-xs overflow-x-auto max-h-64 overflow-y-auto">
                        <code className={result.status === 'success' ? 'text-green-300' : 'text-red-300'}>
                          {result.response
                            ? JSON.stringify(result.response, null, 2)
                            : result.error}
                        </code>
                      </pre>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Streaming Content */}
          {streamingContent && (
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-purple-500/50 p-6">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <span className="animate-pulse">📡</span> Streaming Content
              </h3>
              <div className="bg-gray-900/50 rounded-lg p-4 prose prose-invert max-w-none">
                {streamingContent}
                <span className="inline-block w-2 h-5 bg-purple-500 animate-pulse ml-1"></span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
