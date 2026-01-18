import { Mic, MicOff } from "lucide-react";
import { cn } from "@/lib/utils";

interface VoiceButtonProps {
  isListening: boolean;
  onClick: () => void;
  disabled?: boolean;
}

export const VoiceButton = ({ isListening, onClick, disabled }: VoiceButtonProps) => {
  // Handle both click and touch events for mobile compatibility
  const handleInteraction = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) {
      onClick();
    }
  };

  return (
    <button
      onClick={handleInteraction}
      onTouchEnd={handleInteraction}
      disabled={disabled}
      className={cn(
        "relative w-20 h-20 sm:w-24 sm:h-24 rounded-full flex items-center justify-center",
        "transition-all duration-300 transform active:scale-[0.92]",
        "focus:outline-none focus-visible:ring-4 focus-visible:ring-primary/30",
        "touch-manipulation select-none",
        "-webkit-tap-highlight-color-transparent",
        isListening
          ? "bg-primary text-primary-foreground shadow-glow"
          : "bg-card text-primary border-2 border-primary/20 hover:border-primary/40 shadow-medium",
        disabled && "opacity-50 cursor-not-allowed"
      )}
      aria-label={isListening ? "Stop listening" : "Start voice command"}
      style={{ WebkitTapHighlightColor: 'transparent' }}
    >
      {/* Pulse rings when listening */}
      {isListening && (
        <>
          <span className="pulse-ring bg-primary/20" />
          <span className="pulse-ring bg-primary/10" style={{ animationDelay: '0.5s' }} />
        </>
      )}
      
      {/* Mic icon */}
      <span className="relative z-10 pointer-events-none">
        {isListening ? (
          <Mic className="w-8 h-8 sm:w-10 sm:h-10 animate-pulse" />
        ) : (
          <MicOff className="w-8 h-8 sm:w-10 sm:h-10" />
        )}
      </span>
    </button>
  );
};
