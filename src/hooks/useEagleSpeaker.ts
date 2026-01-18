import { useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

// Types for Eagle SDK (loaded dynamically)
interface EagleProfilerWorkerType {
  create: (accessKey: string, model: { publicPath: string }) => Promise<EagleProfilerInstance>;
}

interface EagleWorkerType {
  create: (accessKey: string, model: { publicPath: string }, profiles: string[]) => Promise<EagleInstance>;
}

interface EagleProfilerInstance {
  minEnrollSamples: number;
  enroll: (audioData: Int16Array) => Promise<{ percentage: number; feedback: string }>;
  export: () => Promise<string>;
  release: () => void;
}

interface EagleInstance {
  process: (audioData: Int16Array) => Promise<number[]>;
  release: () => void;
}

interface WebVoiceProcessorType {
  subscribe: (engine: AudioProcessingEngine) => Promise<void>;
  unsubscribe: (engine: AudioProcessingEngine) => Promise<void>;
}

interface AudioProcessingEngine {
  onmessage: (event: MessageEvent) => void;
}

export interface EnrollmentProgress {
  percentage: number;
  feedback: string;
}

export interface VerificationResult {
  verified: boolean;
  confidence: number;
  error?: string;
}

const VERIFICATION_THRESHOLD = 0.7; // 70% confidence threshold

export const useEagleSpeaker = () => {
  const { user } = useAuth();
  const [isEnrolling, setIsEnrolling] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [enrollmentProgress, setEnrollmentProgress] = useState(0);
  const [hasVoiceProfile, setHasVoiceProfile] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);

  const eagleProfilerRef = useRef<EagleProfilerInstance | null>(null);
  const eagleRef = useRef<EagleInstance | null>(null);
  const audioDataRef = useRef<Int16Array[]>([]);
  const webVoiceProcessorRef = useRef<WebVoiceProcessorType | null>(null);
  const resolveEnrollmentRef = useRef<((profile: string) => void) | null>(null);
  const rejectEnrollmentRef = useRef<((error: Error) => void) | null>(null);
  const resolveVerificationRef = useRef<((result: VerificationResult) => void) | null>(null);
  const verificationScoresRef = useRef<number[]>([]);

  // Get Picovoice access key from edge function
  const getAccessKey = useCallback(async (): Promise<string> => {
    const { data, error } = await supabase.functions.invoke("picovoice-config");
    if (error || !data?.accessKey) {
      throw new Error("Failed to get Picovoice access key");
    }
    return data.accessKey;
  }, []);

  // Check if user has a voice profile enrolled
  const checkVoiceProfile = useCallback(async (): Promise<boolean> => {
    if (!user) return false;

    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("voice_profile_data")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) {
        console.error("Error checking voice profile:", error);
        return false;
      }

      const hasProfile = !!(data as any)?.voice_profile_data;
      setHasVoiceProfile(hasProfile);
      return hasProfile;
    } catch (err) {
      console.error("Error checking voice profile:", err);
      return false;
    }
  }, [user]);

  // Load Eagle SDK dynamically
  const loadEagleSDK = useCallback(async () => {
    try {
      const [eagleModule, webVoiceModule] = await Promise.all([
        import("@picovoice/eagle-web"),
        import("@picovoice/web-voice-processor")
      ]);
      
      return {
        EagleProfilerWorker: eagleModule.EagleProfilerWorker as unknown as EagleProfilerWorkerType,
        EagleWorker: eagleModule.EagleWorker as unknown as EagleWorkerType,
        WebVoiceProcessor: webVoiceModule.WebVoiceProcessor as unknown as WebVoiceProcessorType
      };
    } catch (err) {
      console.error("Failed to load Eagle SDK:", err);
      throw new Error("Failed to load voice recognition SDK");
    }
  }, []);

  // Start voice enrollment
  const startEnrollment = useCallback(async (): Promise<string> => {
    if (!user) throw new Error("User not authenticated");
    
    setIsEnrolling(true);
    setEnrollmentProgress(0);
    setError(null);
    audioDataRef.current = [];

    return new Promise(async (resolve, reject) => {
      resolveEnrollmentRef.current = resolve;
      rejectEnrollmentRef.current = reject;

      try {
        // Request microphone permission
        await navigator.mediaDevices.getUserMedia({ audio: true });

        const accessKey = await getAccessKey();
        const { EagleProfilerWorker, WebVoiceProcessor } = await loadEagleSDK();
        
        webVoiceProcessorRef.current = WebVoiceProcessor;

        // Create Eagle profiler
        eagleProfilerRef.current = await EagleProfilerWorker.create(accessKey, {
          publicPath: "/eagle_params.pv"
        });

        // Audio processing engine for enrollment
        const enrollEngine: AudioProcessingEngine = {
          onmessage: async (event: MessageEvent) => {
            if (event.data.command === "process" && eagleProfilerRef.current) {
              const audioFrame = event.data.inputFrame as Int16Array;
              audioDataRef.current.push(audioFrame);

              // Check if we have enough samples
              const totalSamples = audioDataRef.current.reduce((acc, arr) => acc + arr.length, 0);
              
              if (totalSamples >= eagleProfilerRef.current.minEnrollSamples) {
                try {
                  // Combine all audio data
                  const combinedAudio = new Int16Array(totalSamples);
                  let offset = 0;
                  for (const arr of audioDataRef.current) {
                    combinedAudio.set(arr, offset);
                    offset += arr.length;
                  }

                  const result = await eagleProfilerRef.current.enroll(combinedAudio);
                  setEnrollmentProgress(result.percentage);

                  if (result.percentage >= 100) {
                    // Export profile
                    const profile = await eagleProfilerRef.current.export();
                    
                    // Stop recording
                    await WebVoiceProcessor.unsubscribe(enrollEngine);
                    eagleProfilerRef.current.release();
                    eagleProfilerRef.current = null;

                    // Save profile to database
                    const { error: saveError } = await supabase
                      .from("profiles")
                      .update({
                        voice_profile_data: profile,
                        voice_profile_enrolled_at: new Date().toISOString()
                      } as any)
                      .eq("user_id", user.id);

                    if (saveError) {
                      reject(new Error("Failed to save voice profile"));
                      return;
                    }

                    setHasVoiceProfile(true);
                    setIsEnrolling(false);
                    resolve(profile);
                  }

                  // Clear processed audio
                  audioDataRef.current = [];
                } catch (err) {
                  console.error("Enrollment error:", err);
                }
              }
            }
          }
        };

        // Start recording
        await WebVoiceProcessor.subscribe(enrollEngine);

      } catch (err) {
        setIsEnrolling(false);
        const errorMsg = err instanceof Error ? err.message : "Enrollment failed";
        setError(errorMsg);
        reject(new Error(errorMsg));
      }
    });
  }, [user, getAccessKey, loadEagleSDK]);

  // Cancel enrollment
  const cancelEnrollment = useCallback(async () => {
    if (eagleProfilerRef.current) {
      eagleProfilerRef.current.release();
      eagleProfilerRef.current = null;
    }
    if (webVoiceProcessorRef.current && audioDataRef.current.length > 0) {
      // Unsubscribe handled internally
    }
    setIsEnrolling(false);
    setEnrollmentProgress(0);
    if (rejectEnrollmentRef.current) {
      rejectEnrollmentRef.current(new Error("Enrollment cancelled"));
    }
  }, []);

  // Verify voice against enrolled profile
  const verifyVoice = useCallback(async (durationMs: number = 3000): Promise<VerificationResult> => {
    if (!user) {
      return { verified: false, confidence: 0, error: "User not authenticated" };
    }

    setIsVerifying(true);
    setError(null);
    verificationScoresRef.current = [];

    return new Promise(async (resolve) => {
      resolveVerificationRef.current = resolve;

      try {
        // Get stored profile
        const { data, error: fetchError } = await supabase
          .from("profiles")
          .select("voice_profile_data")
          .eq("user_id", user.id)
          .maybeSingle();

        if (fetchError || !(data as any)?.voice_profile_data) {
          setIsVerifying(false);
          resolve({ verified: false, confidence: 0, error: "No voice profile found" });
          return;
        }

        const storedProfile = (data as any).voice_profile_data;

        // Request microphone permission
        await navigator.mediaDevices.getUserMedia({ audio: true });

        const accessKey = await getAccessKey();
        const { EagleWorker, WebVoiceProcessor } = await loadEagleSDK();
        
        webVoiceProcessorRef.current = WebVoiceProcessor;

        // Create Eagle instance with stored profile
        eagleRef.current = await EagleWorker.create(accessKey, {
          publicPath: "/eagle_params.pv"
        }, [storedProfile]);

        // Audio processing engine for verification
        const verifyEngine: AudioProcessingEngine = {
          onmessage: async (event: MessageEvent) => {
            if (event.data.command === "process" && eagleRef.current) {
              const audioFrame = event.data.inputFrame as Int16Array;
              
              try {
                const scores = await eagleRef.current.process(audioFrame);
                if (scores && scores.length > 0) {
                  verificationScoresRef.current.push(scores[0]);
                }
              } catch (err) {
                console.error("Verification processing error:", err);
              }
            }
          }
        };

        // Start recording
        await WebVoiceProcessor.subscribe(verifyEngine);

        // Stop after duration
        setTimeout(async () => {
          await WebVoiceProcessor.unsubscribe(verifyEngine);
          
          if (eagleRef.current) {
            eagleRef.current.release();
            eagleRef.current = null;
          }

          // Calculate average confidence
          const scores = verificationScoresRef.current;
          const avgConfidence = scores.length > 0 
            ? scores.reduce((a, b) => a + b, 0) / scores.length 
            : 0;

          const verified = avgConfidence >= VERIFICATION_THRESHOLD;

          setIsVerifying(false);
          resolve({
            verified,
            confidence: avgConfidence,
            error: verified ? undefined : "Voice not recognized"
          });
        }, durationMs);

      } catch (err) {
        setIsVerifying(false);
        const errorMsg = err instanceof Error ? err.message : "Verification failed";
        setError(errorMsg);
        resolve({ verified: false, confidence: 0, error: errorMsg });
      }
    });
  }, [user, getAccessKey, loadEagleSDK]);

  // Delete voice profile
  const deleteVoiceProfile = useCallback(async (): Promise<boolean> => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          voice_profile_data: null,
          voice_profile_enrolled_at: null
        } as any)
        .eq("user_id", user.id);

      if (error) {
        console.error("Error deleting voice profile:", error);
        return false;
      }

      setHasVoiceProfile(false);
      return true;
    } catch (err) {
      console.error("Error deleting voice profile:", err);
      return false;
    }
  }, [user]);

  return {
    // State
    isEnrolling,
    isVerifying,
    enrollmentProgress,
    hasVoiceProfile,
    error,
    
    // Actions
    checkVoiceProfile,
    startEnrollment,
    cancelEnrollment,
    verifyVoice,
    deleteVoiceProfile,
  };
};
