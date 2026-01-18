import { cn } from "@/lib/utils";

interface VoiceWaveProps {
  isActive: boolean;
  className?: string;
}

export const VoiceWave = ({ isActive, className }: VoiceWaveProps) => {
  return (
    <div className={cn("flex items-center justify-center gap-1.5", className)}>
      {Array.from({ length: 7 }).map((_, i) => (
        <div
          key={i}
          className={cn(
            "voice-wave-bar w-1.5 rounded-full transition-all duration-300",
            isActive ? "bg-primary" : "bg-muted-foreground/30"
          )}
          style={{
            height: isActive ? `${12 + (i % 3) * 10}px` : "8px",
            animationPlayState: isActive ? "running" : "paused",
          }}
        />
      ))}
    </div>
  );
};
