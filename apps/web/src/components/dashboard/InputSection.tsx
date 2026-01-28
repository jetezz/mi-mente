import { Card, CardContent } from "@/components/ui/Card";
import { UrlInput } from "../UrlInput";
import { FeatureCard } from "./FeatureCard";

interface InputSectionProps {
  onSubmit: (url: string) => void;
  isLoading: boolean;
}

const features = [
  {
    icon: "🎙️",
    title: "Transcripción IA",
    description: "Whisper de OpenAI",
    gradient: "primary" as const,
  },
  {
    icon: "🧠",
    title: "Resumen Inteligente",
    description: "Llama 3.3 70B",
    gradient: "cyan" as const,
  },
  {
    icon: "📝",
    title: "Guardado en Notion",
    description: "Formato rico automático",
    gradient: "pink" as const,
  },
];

export function InputSection({ onSubmit, isLoading }: InputSectionProps) {
  return (
    <Card variant="glow" padding="lg" className="animate-fade-in">
      <CardContent className="space-y-8">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-dark-100 mb-2">¿Qué quieres recordar hoy?</h2>
          <p className="text-dark-400">Pega un link de YouTube o Instagram y deja que la IA haga el resto.</p>
        </div>

        <UrlInput onSubmit={onSubmit} isLoading={isLoading} disabled={isLoading} />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 stagger-children">
          {features.map(feature => (
            <FeatureCard
              key={feature.title}
              icon={feature.icon}
              title={feature.title}
              description={feature.description}
              gradient={feature.gradient}
              className="animate-fade-in opacity-0 [animation-fill-mode:forwards]"
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
