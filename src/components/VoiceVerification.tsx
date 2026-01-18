import { useState, useEffect, useCallback, useRef } from "react";
import { Shield, Volume2, CheckCircle2, AlertTriangle, Loader2 } from "lucide-react";
import { useEagleSpeaker } from "@/hooks/useEagleSpeaker";
import { useTextToSpeech } from "@/hooks/useTextToSpeech";
import { VoiceWave } from "./VoiceWave";
import { toast } from "sonner";

interface VoiceVerificationProps {
  onSuccess: () => void;
  onCancel: () => void;
  onFallbackToPin?: () => void;
  title?: string;
  description?: string;
}

export const VoiceVerification = ({ 
  onSuccess, 
  onCancel, 
  onFallbackToPin,
  title = "Voice Verification",
  description = "अपनी आवाज़ से पहचान करें"
}: VoiceVerificationProps) => {
  const { verifyVoice, isVerifying, error } = useEagleSpeaker();
  const { speak, isSpeaking, stop: stopSpeaking } = useTextToSpeech();
  
  const [step, setStep] = useState<"ready" | "listening" | "success" | "failed">("ready");
  const [attempts, setAttempts] = useState(0);
  const [confidence, setConfidence] = useState(0);
  const maxAttempts = 3;
  const hasStartedRef = useRef(false);

  // Initial prompt
  useEffect(() => {
    if (step === "ready" && !hasStartedRef.current) {
      hasStartedRef.current = true;
      const timer = setTimeout(() => {
        speak(description);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [step, speak, description]);

  const startVerification = useCallback(async () => {
    setStep("listening");
    stopSpeaking();
    
    speak("अभी बोलना शुरू करें। कुछ भी बोलें।");

    try {
      const result = await verifyVoice(3000); // 3 seconds of audio
      
      setConfidence(result.confidence * 100);

      if (result.verified) {
        setStep("success");
        speak("आवाज़ पहचान सफल!");
        toast.success("Voice verified!");
        setTimeout(onSuccess, 1500);
      } else {
        const newAttempts = attempts + 1;
        setAttempts(newAttempts);
        
        if (newAttempts >= maxAttempts) {
          setStep("failed");
          speak("बहुत सारे असफल प्रयास। कृपया PIN का उपयोग करें।");
          toast.error("Voice verification failed");
        } else {
          setStep("ready");
          speak("आवाज़ मेल नहीं खाई। कृपया दोबारा कोशिश करें।");
          toast.error("Voice not recognized. Try again.");
        }
      }
    } catch (err) {
      console.error("Verification error:", err);
      setStep("failed");
      speak("त्रुटि हुई। कृपया PIN का उपयोग करें।");
      toast.error("Verification error");
    }
  }, [verifyVoice, attempts, speak, stopSpeaking, onSuccess]);

  const handleCancel = useCallback(() => {
    stopSpeaking();
    onCancel();
  }, [stopSpeaking, onCancel]);

  return (
    <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-xl flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="glass-card rounded-3xl p-6 sm:p-8">
          {/* Header */}
          <div className="flex items-center justify-center mb-6">
            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${
              step === "failed" ? "bg-destructive/10" : 
              step === "success" ? "bg-secondary/10" : "bg-primary/10"
            }`}>
              {step === "failed" ? (
                <AlertTriangle className="w-8 h-8 text-destructive" />
              ) : step === "success" ? (
                <CheckCircle2 className="w-8 h-8 text-secondary" />
              ) : step === "listening" ? (
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
              ) : (
                <Volume2 className="w-8 h-8 text-primary" />
              )}
            </div>
          </div>

          <h2 className="text-xl sm:text-2xl font-bold text-center text-foreground mb-2">
            {title}
          </h2>
          
          <p className="text-sm text-muted-foreground text-center mb-2">
            {step === "ready" && description}
            {step === "listening" && "सुन रहा हूं... बोलते रहें"}
            {step === "success" && "आवाज़ पहचान सफल!"}
            {step === "failed" && "आवाज़ पहचान असफल"}
          </p>

          {/* Attempts counter */}
          {step !== "success" && (
            <p className="text-xs text-center text-muted-foreground mb-6">
              Attempts: {attempts}/{maxAttempts}
            </p>
          )}

          {/* Voice Wave Animation */}
          {step === "listening" && (
            <div className="mb-6">
              <VoiceWave isActive={true} className="h-12" />
              <p className="text-xs text-center text-muted-foreground mt-2">
                बोलिए... आवाज़ विश्लेषण हो रहा है
              </p>
            </div>
          )}

          {/* Success Animation */}
          {step === "success" && (
            <div className="flex flex-col items-center mb-6">
              <div className="w-20 h-20 rounded-full bg-secondary/20 flex items-center justify-center animate-pulse mb-2">
                <CheckCircle2 className="w-10 h-10 text-secondary" />
              </div>
              <p className="text-sm text-secondary font-medium">
                Confidence: {Math.round(confidence)}%
              </p>
            </div>
          )}

          {/* Error display */}
          {error && step === "failed" && (
            <div className="bg-destructive/10 text-destructive rounded-xl px-4 py-3 mb-4 text-sm text-center">
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-col gap-3">
            {step === "ready" && (
              <>
                <button
                  onClick={startVerification}
                  disabled={isVerifying}
                  className="w-full py-3 px-4 rounded-xl bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <Volume2 className="w-4 h-4" />
                  Start Speaking
                </button>
                
                {onFallbackToPin && (
                  <button
                    onClick={onFallbackToPin}
                    className="w-full py-3 px-4 rounded-xl border border-border text-foreground font-medium hover:bg-muted transition-colors"
                  >
                    Use PIN Instead
                  </button>
                )}
                
                <button
                  onClick={handleCancel}
                  className="w-full py-3 px-4 rounded-xl text-muted-foreground font-medium hover:text-foreground transition-colors"
                >
                  Cancel
                </button>
              </>
            )}

            {step === "listening" && (
              <button
                onClick={handleCancel}
                className="w-full py-3 px-4 rounded-xl border border-border text-foreground font-medium hover:bg-muted transition-colors"
              >
                Cancel
              </button>
            )}

            {step === "failed" && (
              <>
                {onFallbackToPin && (
                  <button
                    onClick={onFallbackToPin}
                    className="w-full py-3 px-4 rounded-xl bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors"
                  >
                    Use PIN Instead
                  </button>
                )}
                
                <button
                  onClick={handleCancel}
                  className="w-full py-3 px-4 rounded-xl border border-border text-foreground font-medium hover:bg-muted transition-colors"
                >
                  Cancel Transaction
                </button>
              </>
            )}
          </div>

          {/* Offline note */}
          {step === "ready" && (
            <p className="text-xs text-center text-muted-foreground mt-4">
              🔒 Secure on-device processing • Works offline
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
