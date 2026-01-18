import { useState, useCallback, useEffect, useRef } from "react";

export const useTextToSpeech = () => {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Load available voices
  useEffect(() => {
    const loadVoices = () => {
      const availableVoices = window.speechSynthesis?.getVoices() || [];
      setVoices(availableVoices);
      console.log("Available voices:", availableVoices.map(v => `${v.name} (${v.lang})`));
    };

    if ('speechSynthesis' in window) {
      loadVoices();
      // Voices may load asynchronously
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }

    return () => {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.onvoiceschanged = null;
      }
    };
  }, []);

  // Find the best voice for Hindi
  const getHindiVoice = useCallback(() => {
    // Priority: Hindi voices, then any Indian English voice
    const hindiVoice = voices.find(v => v.lang.startsWith('hi'));
    if (hindiVoice) {
      console.log("Using Hindi voice:", hindiVoice.name);
      return hindiVoice;
    }
    
    // Fallback to Indian English
    const indianEnglish = voices.find(v => v.lang === 'en-IN');
    if (indianEnglish) {
      console.log("Fallback to Indian English voice:", indianEnglish.name);
      return indianEnglish;
    }
    
    // Fallback to any English voice
    const englishVoice = voices.find(v => v.lang.startsWith('en'));
    if (englishVoice) {
      console.log("Fallback to English voice:", englishVoice.name);
      return englishVoice;
    }
    
    console.log("No preferred voice found, using default");
    return null;
  }, [voices]);

  const speak = useCallback((text: string) => {
    if (!text) return;

    if (!('speechSynthesis' in window)) {
      console.error("Web Speech API not supported");
      setError("Speech not supported in this browser");
      return;
    }

    // Cancel any ongoing speech
    window.speechSynthesis.cancel();
    setError(null);

    const utterance = new SpeechSynthesisUtterance(text);
    utteranceRef.current = utterance;
    
    // Set voice
    const selectedVoice = getHindiVoice();
    if (selectedVoice) {
      utterance.voice = selectedVoice;
    }
    
    utterance.lang = "hi-IN"; // Hindi
    utterance.rate = 0.9;
    utterance.pitch = 1;

    utterance.onstart = () => {
      console.log("Speech started:", text.substring(0, 50) + "...");
      setIsSpeaking(true);
    };
    
    utterance.onend = () => {
      console.log("Speech ended");
      setIsSpeaking(false);
    };
    
    utterance.onerror = (e) => {
      // Ignore 'interrupted' errors as they're expected when canceling
      if (e.error === 'interrupted' || e.error === 'canceled') {
        console.log("Speech interrupted/canceled");
        setIsSpeaking(false);
        return;
      }
      console.error("Web Speech error:", e.error);
      setError("Speech synthesis failed: " + e.error);
      setIsSpeaking(false);
    };

    // Small delay to ensure voices are loaded
    setTimeout(() => {
      window.speechSynthesis.speak(utterance);
    }, 100);
  }, [getHindiVoice]);

  const stop = useCallback(() => {
    window.speechSynthesis?.cancel();
    setIsSpeaking(false);
  }, []);

  return { speak, stop, isSpeaking, error, voices };
};
