import { supabase } from "@/integrations/supabase/client";

export interface VoiceCommandResponse {
  intent: "check_balance" | "send_money" | "pay_bills" | "view_history" | "help" | "greeting" | "unknown" | "error";
  response: string;
  action: "navigate" | "speak" | null;
  route: string | null;
  entities: {
    amount?: number | null;
    recipient?: string | null;
    bill_type?: string | null;
  };
  error?: string;
}

export const processVoiceCommand = async (
  message: string,
  language: string = "hi",
  balance?: number
): Promise<VoiceCommandResponse> => {
  try {
    console.log("Sending voice command to AI:", message, "balance:", balance);

    const { data, error } = await supabase.functions.invoke("voice-command", {
      body: { message, language, balance },
    });

    if (error) {
      console.error("Voice command error:", error);
      throw new Error(error.message || "Failed to process command");
    }

    if (data?.error && data?.intent === "error") {
      console.error("AI processing error:", data.error);
    }

    return {
      intent: data.intent || "unknown",
      response: data.response || (language === "hi" ? "माफ कीजिए, कुछ गड़बड़ हुई।" : "Sorry, something went wrong."),
      action: data.action || "speak",
      route: data.route || null,
      entities: data.entities || {},
      error: data.error
    };
  } catch (err) {
    console.error("Error processing voice command:", err);
    
    return { 
      intent: "error",
      response: language === "hi" 
        ? "माफ कीजिए, कुछ गड़बड़ हुई। कृपया दोबारा कोशिश करें।"
        : "Sorry, something went wrong. Please try again.",
      action: "speak",
      route: null,
      entities: {},
      error: err instanceof Error ? err.message : "Unknown error"
    };
  }
};

fdbethgnn















































