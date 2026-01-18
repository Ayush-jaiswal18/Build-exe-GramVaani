import { useState, useCallback, useRef } from "react";

// Extend Window interface for SpeechRecognition
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message: string;
}

interface SpeechRecognitionInstance {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onstart: (() => void) | null;
  onend: (() => void) | null;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
}

export const useSpeechToText = () => {
  const [isListening, setIsListening] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [transcript, setTranscript] = useState("");
  const [partialTranscript, setPartialTranscript] = useState("");
  const [isSupported, setIsSupported] = useState(true);
  
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const silenceTimeoutRef = useRef<number | null>(null);
  const mountedRef = useRef(true);
  const mediaStreamRef = useRef<MediaStream | null>(null);

  // Safe state setter that checks if mounted
  const safeSetState = useCallback(<T,>(setter: React.Dispatch<React.SetStateAction<T>>, value: T | ((prev: T) => T)) => {
    if (mountedRef.current) {
      setter(value as any);
    }
  }, []);

  const clearSilenceTimeout = useCallback(() => {
    if (silenceTimeoutRef.current !== null) {
      window.clearTimeout(silenceTimeoutRef.current);
      silenceTimeoutRef.current = null;
    }
  }, []);

  // Cleanup media stream
  const cleanupMediaStream = useCallback(() => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => {
        track.stop();
      });
      mediaStreamRef.current = null;
    }
  }, []);

  const stopListening = useCallback(() => {
    console.log("Stopping speech recognition...");
    clearSilenceTimeout();
    
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {
        // Ignore errors when stopping
      }
      recognitionRef.current = null;
    }
    
    cleanupMediaStream();
    safeSetState(setIsListening, false);
    safeSetState(setPartialTranscript, "");
  }, [clearSilenceTimeout, cleanupMediaStream, safeSetState]);

  const startListening = useCallback(async () => {
    // Reset state
    safeSetState(setIsConnecting, true);
    safeSetState(setError, null);
    safeSetState(setTranscript, "");
    safeSetState(setPartialTranscript, "");
    clearSilenceTimeout();

    try {
      // Check for HTTPS (required on mobile)
      if (window.location.protocol !== 'https:' && window.location.hostname !== 'localhost') {
        throw new Error("Microphone requires secure connection (HTTPS)");
      }

      // Get SpeechRecognition API - check multiple prefixes for mobile compatibility
      const SpeechRecognition = (window as any).SpeechRecognition || 
                                (window as any).webkitSpeechRecognition ||
                                (window as any).mozSpeechRecognition ||
                                (window as any).msSpeechRecognition;
      
      if (!SpeechRecognition) {
        safeSetState(setIsSupported, false);
        throw new Error("Voice recognition not supported. Please use Chrome, Edge, or Safari.");
      }

      // Request microphone permission explicitly first (important for mobile)
      console.log("Requesting microphone access...");
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        }
      });
      
      // Store stream reference for cleanup
      mediaStreamRef.current = stream;
      console.log("Microphone access granted");

      // Create new instance each time
      const recognition = new SpeechRecognition() as SpeechRecognitionInstance;
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = "hi-IN"; // Hindi - will also accept English

      recognition.onstart = () => {
        console.log("Speech recognition started");
        safeSetState(setIsListening, true);
        safeSetState(setIsConnecting, false);
      };

      recognition.onend = () => {
        console.log("Speech recognition ended");
        clearSilenceTimeout();
        cleanupMediaStream();
        safeSetState(setIsListening, false);
        safeSetState(setPartialTranscript, "");
      };

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        clearSilenceTimeout();
        
        let interimTranscript = "";
        let finalTranscript = "";

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          if (result.isFinal) {
            finalTranscript += result[0].transcript;
          } else {
            interimTranscript += result[0].transcript;
          }
        }

        if (finalTranscript) {
          console.log("Final transcript:", finalTranscript);
          safeSetState(setTranscript, finalTranscript);
          safeSetState(setPartialTranscript, "");
        } else if (interimTranscript) {
          console.log("Interim transcript:", interimTranscript);
          safeSetState(setPartialTranscript, interimTranscript);
          
          // Set silence timeout - stop after 2 seconds of no new speech
          silenceTimeoutRef.current = window.setTimeout(() => {
            console.log("Silence detected, stopping...");
            if (interimTranscript && mountedRef.current) {
              setTranscript(interimTranscript);
            }
            if (recognitionRef.current) {
              try {
                recognitionRef.current.stop();
              } catch (e) {
                // Ignore
              }
            }
          }, 2000);
        }
      };

      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        console.error("Speech recognition error:", event.error, event.message);
        
        // Map mobile-specific errors to user-friendly messages
        let errorMessage = event.error;
        switch (event.error) {
          case "not-allowed":
            errorMessage = "Microphone access denied. Please allow microphone in browser settings.";
            break;
          case "no-speech":
            // Not an error - just no speech detected
            safeSetState(setIsListening, false);
            safeSetState(setIsConnecting, false);
            cleanupMediaStream();
            return;
          case "aborted":
            safeSetState(setIsListening, false);
            safeSetState(setIsConnecting, false);
            cleanupMediaStream();
            return;
          case "network":
            errorMessage = "Network error. Please check your internet connection.";
            break;
          case "audio-capture":
            errorMessage = "No microphone found. Please connect a microphone.";
            break;
          case "service-not-allowed":
            errorMessage = "Voice service not available. Please try again.";
            break;
        }
        
        safeSetState(setError, errorMessage);
        safeSetState(setIsListening, false);
        safeSetState(setIsConnecting, false);
        cleanupMediaStream();
      };

      recognitionRef.current = recognition;
      recognition.start();
      
    } catch (err) {
      console.error("Failed to start speech-to-text:", err);
      let errorMessage = err instanceof Error ? err.message : "Failed to start listening";
      
      // Handle mobile-specific permission errors
      if (err instanceof Error) {
        if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
          errorMessage = "Microphone access denied. Please allow microphone in your browser settings.";
        } else if (err.name === "NotFoundError") {
          errorMessage = "No microphone found on this device.";
        } else if (err.name === "NotSupportedError" || err.name === "NotReadableError") {
          errorMessage = "Microphone not available. Please close other apps using the microphone.";
        }
      }
      
      safeSetState(setError, errorMessage);
      safeSetState(setIsConnecting, false);
      cleanupMediaStream();
    }
  }, [clearSilenceTimeout, cleanupMediaStream, safeSetState]);

  return {
    startListening,
    stopListening,
    isListening,
    isConnecting,
    transcript,
    partialTranscript,
    error,
    isSupported,
  };
};
