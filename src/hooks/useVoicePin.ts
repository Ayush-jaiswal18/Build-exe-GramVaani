import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

// Simple hash function for PIN (in production, use bcrypt on server)
const hashPin = async (pin: string): Promise<string> => {
  const encoder = new TextEncoder();
  const data = encoder.encode(pin);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};

export const useVoicePin = () => {
  const { user } = useAuth();
  const [isVerifying, setIsVerifying] = useState(false);
  const [isSettingPin, setIsSettingPin] = useState(false);
  const [hasPinSet, setHasPinSet] = useState<boolean | null>(null);

  // Check if user has a PIN set
  const checkPinStatus = useCallback(async (): Promise<boolean> => {
    if (!user) return false;
    
    const { data, error } = await supabase
      .from("profiles")
      .select("voice_pin_hash")
      .eq("user_id", user.id)
      .maybeSingle();

    if (error) {
      console.error("Error checking PIN status:", error);
      return false;
    }

    const hasPin = !!(data as any)?.voice_pin_hash;
    setHasPinSet(hasPin);
    return hasPin;
  }, [user]);

  // Set a new voice PIN
  const setVoicePin = useCallback(async (pin: string): Promise<{ success: boolean; error?: string }> => {
    if (!user) {
      return { success: false, error: "User not authenticated" };
    }

    // Validate PIN format (4-6 digits)
    const cleanPin = pin.replace(/\D/g, '');
    if (cleanPin.length < 4 || cleanPin.length > 6) {
      return { success: false, error: "PIN must be 4-6 digits" };
    }

    setIsSettingPin(true);
    try {
      const pinHash = await hashPin(cleanPin);
      
      const { error } = await supabase
        .from("profiles")
        .update({ 
          voice_pin_hash: pinHash,
          voice_pin_set_at: new Date().toISOString()
        } as any)
        .eq("user_id", user.id);

      if (error) {
        console.error("Error setting PIN:", error);
        return { success: false, error: "Failed to set PIN" };
      }

      setHasPinSet(true);
      return { success: true };
    } finally {
      setIsSettingPin(false);
    }
  }, [user]);

  // Verify voice PIN
  const verifyVoicePin = useCallback(async (spokenPin: string): Promise<{ success: boolean; error?: string }> => {
    if (!user) {
      return { success: false, error: "User not authenticated" };
    }

    setIsVerifying(true);
    try {
      // Extract digits from spoken input
      const digitWords: Record<string, string> = {
        'zero': '0', 'one': '1', 'two': '2', 'three': '3', 'four': '4',
        'five': '5', 'six': '6', 'seven': '7', 'eight': '8', 'nine': '9',
        'शून्य': '0', 'एक': '1', 'दो': '2', 'तीन': '3', 'चार': '4',
        'पांच': '5', 'छह': '6', 'सात': '7', 'आठ': '8', 'नौ': '9',
        '०': '0', '१': '1', '२': '2', '३': '3', '४': '4',
        '५': '5', '६': '6', '७': '7', '८': '8', '९': '9'
      };

      let extractedPin = '';
      
      // First try to extract pure digits
      const digitMatches = spokenPin.match(/\d/g);
      if (digitMatches && digitMatches.length >= 4) {
        extractedPin = digitMatches.join('');
      } else {
        // Try to convert spoken words to digits
        const words = spokenPin.toLowerCase().split(/\s+/);
        for (const word of words) {
          if (digitWords[word]) {
            extractedPin += digitWords[word];
          } else if (/^\d$/.test(word)) {
            extractedPin += word;
          }
        }
      }

      if (extractedPin.length < 4) {
        return { success: false, error: "Could not understand PIN. Please speak clearly." };
      }

      // Get stored hash
      const { data, error } = await supabase
        .from("profiles")
        .select("voice_pin_hash")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error || !(data as any)?.voice_pin_hash) {
        return { success: false, error: "No PIN set. Please set up your security PIN first." };
      }

      // Compare hashes
      const inputHash = await hashPin(extractedPin);
      if (inputHash === (data as any).voice_pin_hash) {
        return { success: true };
      } else {
        return { success: false, error: "Incorrect PIN. Please try again." };
      }
    } finally {
      setIsVerifying(false);
    }
  }, [user]);

  return {
    hasPinSet,
    isVerifying,
    isSettingPin,
    checkPinStatus,
    setVoicePin,
    verifyVoicePin,
  };
};
