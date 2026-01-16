import { useState, useEffect } from 'react';

interface ServiceStatus {
  name: string;
  status: 'online' | 'offline' | 'pending';
  details?: string;
}

export function StatusIndicator() {
  const [services, setServices] = useState<ServiceStatus[]>([
    { name: 'API', status: 'pending' },
    { name: 'Worker', status: 'pending' },
    { name: 'Notion', status: 'pending' },
  ]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkHealth();
    const interval = setInterval(checkHealth, 30000); // Check every 30s
    return () => clearInterval(interval);
  }, []);

  async function checkHealth() {
    try {
      const API_URL = import.meta.env.PUBLIC_API_URL || 'http://localhost:3000';
      const response = await fetch(`${API_URL}/health`);
      const data = await response.json();

      setServices([
        {
          name: 'API',
          status: data.status === 'ok' ? 'online' : 'offline',
          details: 'Orquestador'
        },
        {
          name: 'Worker',
          status: data.services?.worker?.status === 'ok' ? 'online' : 'offline',
          details: data.services?.worker?.whisper_model || 'Python'
        },
        {
          name: 'Notion',
          status: (data.services?.notion?.writer?.status === 'connected' &&
            data.services?.notion?.reader?.status === 'connected') ? 'online' : 'offline',
          details: data.services?.notion?.writer?.database || 'No conectado'
        },
        {
          name: 'Supabase',
          status: data.services?.supabase?.status === 'connected' ? 'online' : 'offline',
          details: 'DB & Auth'
        },
      ]);

    } catch (error) {
      setServices(prev => prev.map(s => ({ ...s, status: 'offline' as const })));
    } finally {
      setIsLoading(false);
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online': return 'status-online';
      case 'offline': return 'status-offline';
      default: return 'status-pending';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'online': return 'En línea';
      case 'offline': return 'Desconectado';
      default: return 'Verificando...';
    }
  };

  return (
    <div className="card p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-dark-400 uppercase tracking-wider">
          Estado del Sistema
        </h3>
        <button
          onClick={checkHealth}
          className="text-dark-500 hover:text-dark-300 transition-colors"
          title="Actualizar"
        >
          <svg className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
      </div>

      <div className="space-y-3">
        {services.map((service) => (
          <div key={service.name} className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={getStatusColor(service.status)} />
              <div>
                <span className="text-dark-200 font-medium">{service.name}</span>
                {service.details && (
                  <span className="text-dark-500 text-xs ml-2">({service.details})</span>
                )}
              </div>
            </div>
            <span className={`text-xs ${service.status === 'online' ? 'text-emerald-400' : 'text-dark-500'}`}>
              {getStatusText(service.status)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
