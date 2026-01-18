import { useState, useEffect, useCallback } from "react";
import { Shield, Mic, CheckCircle2, Loader2, Volume2, AlertTriangle } from "lucide-react";
import { useEagleSpeaker } from "@/hooks/useEagleSpeaker";
import { useTextToSpeech } from "@/hooks/useTextToSpeech";
import { VoiceWave } from "./VoiceWave";
import { toast } from "sonner";
import { Progress } from "@/components/ui/progress";

interface VoiceEnrollmentProps {
  onComplete: () => void;
  onCancel: () => void;
  onFallbackToPin?: () => void;
}

export const VoiceEnrollment = ({ onComplete, onCancel, onFallbackToPin }: VoiceEnrollmentProps) => {
  const { 
    startEnrollment, 
    cancelEnrollment, 
    isEnrolling, 
    enrollmentProgress,
    error 
  } = useEagleSpeaker();
  const { speak, isSpeaking, stop: stopSpeaking } = useTextToSpeech();
  
  const [step, setStep] = useState<"intro" | "recording" | "success" | "error">("intro");

  // Initial greeting
  useEffect(() => {
    if (step === "intro") {
      const timer = setTimeout(() => {
        speak("आवाज़ पहचान सेट करने के लिए, कृपया कुछ सेकंड बोलें। यह आपकी सुरक्षा के लिए है।");
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [step, speak]);

  const handleStartEnrollment = useCallback(async () => {
    setStep("recording");
    stopSpeaking();
    
    const msg = "अभी बोलना शुरू करें। कुछ भी बोलें - जैसे आज का दिन कैसा है, या एक से दस तक गिनती।";
    speak(msg);

    try {
      await startEnrollment();
      setStep("success");
      speak("बधाई हो! आपकी आवाज़ सफलतापूर्वक रजिस्टर हो गई।");
      toast.success("Voice enrolled successfully!");
      setTimeout(onComplete, 2500);
    } catch (err) {
      console.error("Enrollment failed:", err);
      setStep("error");
      speak("माफ कीजिए, आवाज़ रजिस्टर नहीं हो सकी। कृपया दोबारा कोशिश करें।");
      toast.error("Voice enrollment failed");
    }
  }, [startEnrollment, speak, stopSpeaking, onComplete]);

  const handleCancel = useCallback(async () => {
    if (isEnrolling) {
      await cancelEnrollment();
    }
    stopSpeaking();
    onCancel();
  }, [isEnrolling, cancelEnrollment, stopSpeaking, onCancel]);

  const handleRetry = useCallback(() => {
    setStep("intro");
  }, []);

  return (
    <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-xl flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="glass-card rounded-3xl p-6 sm:p-8">
          {/* Header */}
          <div className="flex items-center justify-center mb-6">
            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${
              step === "error" ? "bg-destructive/10" : 
              step === "success" ? "bg-secondary/10" : "bg-primary/10"
            }`}>
              {step === "error" ? (
                <AlertTriangle className="w-8 h-8 text-destructive" />
              ) : step === "success" ? (
                <CheckCircle2 className="w-8 h-8 text-secondary" />
              ) : (
                <Volume2 className="w-8 h-8 text-primary" />
              )}
            </div>
          </div>

          <h2 className="text-xl sm:text-2xl font-bold text-center text-foreground mb-2">
            {step === "intro" && "Voice Recognition Setup"}
            {step === "recording" && "Recording Your Voice"}
            {step === "success" && "Voice Enrolled!"}
            {step === "error" && "Enrollment Failed"}
          </h2>
          
          <p className="text-sm text-muted-foreground text-center mb-6">
            {step === "intro" && "आवाज़ पहचान से सुरक्षित लेनदेन करें"}
            {step === "recording" && "बोलते रहें... आपकी आवाज़ रिकॉर्ड हो रही है"}
            {step === "success" && "आपकी आवाज़ सुरक्षित रूप से सेव हो गई!"}
            {step === "error" && "कृपया दोबारा कोशिश करें या PIN का उपयोग करें"}
          </p>

          {/* Recording Progress */}
          {step === "recording" && (
            <div className="mb-6 space-y-4">
              <VoiceWave isActive={true} className="h-12" />
              
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Progress</span>
                  <span className="text-primary font-medium">{Math.round(enrollmentProgress)}%</span>
                </div>
                <Progress value={enrollmentProgress} className="h-3" />
              </div>
              
              <p className="text-xs text-center text-muted-foreground">
                {enrollmentProgress < 30 && "शुरू कीजिए... कुछ भी बोलें"}
                {enrollmentProgress >= 30 && enrollmentProgress < 60 && "अच्छा! बोलते रहें..."}
                {enrollmentProgress >= 60 && enrollmentProgress < 90 && "लगभग हो गया..."}
                {enrollmentProgress >= 90 && "बस थोड़ा और..."}
              </p>
            </div>
          )}

          {/* Success Animation */}
          {step === "success" && (
            <div className="flex justify-center mb-6">
              <div className="w-20 h-20 rounded-full bg-secondary/20 flex items-center justify-center animate-pulse">
                <CheckCircle2 className="w-10 h-10 text-secondary" />
              </div>
            </div>
          )}

          {/* Error State */}
          {step === "error" && error && (
            <div className="bg-destructive/10 text-destructive rounded-xl px-4 py-3 mb-4 text-sm text-center">
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-col gap-3">
            {step === "intro" && (
              <>
                <button
                  onClick={handleStartEnrollment}
                  className="w-full py-3 px-4 rounded-xl bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
                >
                  <Mic className="w-4 h-4" />
                  Start Voice Enrollment
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
                  Skip for Now
                </button>
              </>
            )}
            
            {step === "recording" && (
              <button
                onClick={handleCancel}
                className="w-full py-3 px-4 rounded-xl border border-border text-foreground font-medium hover:bg-muted transition-colors"
              >
                Cancel
              </button>
            )}

            {step === "error" && (
              <>
                <button
                  onClick={handleRetry}
                  className="w-full py-3 px-4 rounded-xl bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors"
                >
                  Try Again
                </button>
                
                {onFallbackToPin && (
                  <button
                    onClick={onFallbackToPin}
                    className="w-full py-3 px-4 rounded-xl border border-border text-foreground font-medium hover:bg-muted transition-colors"
                  >
                    Use PIN Instead
                  </button>
                )}
              </>
            )}
          </div>

          {/* Device compatibility note */}
          {step === "intro" && (
            <p className="text-xs text-center text-muted-foreground mt-4">
              🔒 Works offline • Low-bandwidth friendly • Secure on-device processing
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
