import { useState, useEffect } from "react";
import { API_URL } from "../lib/config";
import { cn } from "@/lib/utils";
import { Card, CardHeader, CardTitle, CardContent } from "./ui/Card";
import { Button } from "./ui/Button";
import { Badge } from "./ui/Badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./ui/Tooltip";

interface ServiceStatus {
  name: string;
  status: "online" | "offline" | "pending";
  details?: string;
  icon?: string;
}

export function StatusIndicator() {
  const [services, setServices] = useState<ServiceStatus[]>([
    { name: "API", status: "pending", icon: "🔌" },
    { name: "Worker", status: "pending", icon: "⚙️" },
    { name: "Notion", status: "pending", icon: "📝" },
    { name: "Supabase", status: "pending", icon: "🗄️" },
  ]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastCheck, setLastCheck] = useState<Date | null>(null);

  useEffect(() => {
    checkHealth();
    const interval = setInterval(checkHealth, 30000);
    return () => clearInterval(interval);
  }, []);

  async function checkHealth() {
    setIsLoading(true);
    try {
      const response = await fetch(`${API_URL}/health`);
      const data = await response.json();

      setServices([
        {
          name: "API",
          status: data.status === "ok" ? "online" : "offline",
          details: "Orquestador",
          icon: "🔌",
        },
        {
          name: "Worker",
          status: data.services?.worker?.status === "ok" ? "online" : "offline",
          details: data.services?.worker?.whisper_model || "Python",
          icon: "⚙️",
        },
        {
          name: "Notion",
          status:
            data.services?.notion?.writer?.status === "connected" &&
            data.services?.notion?.reader?.status === "connected"
              ? "online"
              : "offline",
          details: data.services?.notion?.writer?.database || "No conectado",
          icon: "📝",
        },
        {
          name: "Supabase",
          status: data.services?.supabase?.status === "connected" ? "online" : "offline",
          details: "DB & Auth",
          icon: "🗄️",
        },
      ]);
      setLastCheck(new Date());
    } catch (error) {
      setServices(prev => prev.map(s => ({ ...s, status: "offline" as const })));
    } finally {
      setIsLoading(false);
    }
  }

  const onlineCount = services.filter(s => s.status === "online").length;
  const allOnline = onlineCount === services.length;

  return (
    <Card className="animate-fade-in">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-dark-400 uppercase tracking-wider">
            Estado del Sistema
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant={allOnline ? "success" : onlineCount > 0 ? "warning" : "destructive"} className="text-xs">
              {onlineCount}/{services.length}
            </Badge>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" onClick={checkHealth} disabled={isLoading} className="h-7 w-7">
                    <svg
                      className={cn("w-4 h-4", isLoading && "animate-spin")}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                      />
                    </svg>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Actualizar estado</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        <div className="space-y-3">
          {services.map((service, index) => (
            <div
              key={service.name}
              className={cn(
                "flex items-center justify-between p-2 rounded-lg transition-colors",
                "hover:bg-dark-800/50",
                "animate-fade-in",
              )}
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    "w-2 h-2 rounded-full transition-colors",
                    service.status === "online" && "bg-emerald-500 shadow-sm shadow-emerald-500/50",
                    service.status === "offline" && "bg-red-500 shadow-sm shadow-red-500/50",
                    service.status === "pending" && "bg-amber-500 animate-pulse",
                  )}
                />
                <div className="flex items-center gap-2">
                  <span className="text-sm">{service.icon}</span>
                  <span className="text-dark-200 font-medium text-sm">{service.name}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {service.details && (
                  <span className="text-dark-500 text-xs hidden sm:inline truncate max-w-24">{service.details}</span>
                )}
                <span
                  className={cn(
                    "text-xs font-medium",
                    service.status === "online" && "text-emerald-400",
                    service.status === "offline" && "text-red-400",
                    service.status === "pending" && "text-amber-400",
                  )}
                >
                  {service.status === "online" ? "✓" : service.status === "offline" ? "✕" : "..."}
                </span>
              </div>
            </div>
          ))}
        </div>

        {lastCheck && (
          <p className="text-xs text-dark-600 mt-4 text-center">
            Última comprobación: {lastCheck.toLocaleTimeString()}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
