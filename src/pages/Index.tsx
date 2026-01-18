import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Wallet, Send, Receipt, History, HelpCircle, LogOut, Loader2, Volume2 } from "lucide-react";
import { processVoiceCommand } from "@/services/voiceCommand";
import { VoiceButton } from "@/components/VoiceButton";
import { VoiceWave } from "@/components/VoiceWave";
import { BalanceCard } from "@/components/BalanceCard";
import { QuickAction } from "@/components/QuickAction";
import { TransactionItem } from "@/components/TransactionItem";
import { LanguageSelector } from "@/components/LanguageSelector";
import { StatusBar } from "@/components/StatusBar";
import { ConversationBubble } from "@/components/ConversationBubble";
import { VoicePinSetup } from "@/components/VoicePinSetup";
import { VoiceEnrollment } from "@/components/VoiceEnrollment";
import { useAuth } from "@/hooks/useAuth";
import { useTextToSpeech } from "@/hooks/useTextToSpeech";
import { useSpeechToText } from "@/hooks/useSpeechToText";
import { useBanking } from "@/hooks/useBanking";
import { useVoicePin } from "@/hooks/useVoicePin";
import { useEagleSpeaker } from "@/hooks/useEagleSpeaker";
import { formatDistanceToNow } from "date-fns";

const Index = () => {
  const navigate = useNavigate();
  const { user, loading, signOut } = useAuth();
  const { speak, isSpeaking, stop: stopSpeaking } = useTextToSpeech();
  const { 
    startListening, 
    stopListening, 
    isListening, 
    isConnecting, 
    transcript, 
    partialTranscript 
  } = useSpeechToText();
  const { balance, transactions, isLoading: bankingLoading } = useBanking();
  const { hasPinSet, checkPinStatus } = useVoicePin();
  const { hasVoiceProfile, checkVoiceProfile } = useEagleSpeaker();
  
  const [selectedLanguage, setSelectedLanguage] = useState("hi");
  const [isOnline] = useState(true);
  const [isVoiceVerified] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showPinSetup, setShowPinSetup] = useState(false);
  const [showVoiceEnrollment, setShowVoiceEnrollment] = useState(false);
  const [authMethod, setAuthMethod] = useState<"voice" | "pin" | null>(null);
  const lastProcessedTranscript = useRef<string>("");
  
  const [conversation, setConversation] = useState([
    { message: "नमस्ते! मैं आपका बैंकिंग सहायक हूं। आप क्या करना चाहेंगे?", isUser: false, timestamp: "अभी" }
  ]);

  // Redirect to auth if not logged in
  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  // Check auth status and prompt setup after login
  useEffect(() => {
    const checkAndPromptAuth = async () => {
      if (user && !loading && !bankingLoading) {
        // Check for voice profile first (Picovoice Eagle)
        const hasVoice = await checkVoiceProfile();
        if (hasVoice) {
          setAuthMethod("voice");
          return;
        }
        
        // Check for PIN as fallback
        const hasPin = await checkPinStatus();
        if (hasPin) {
          setAuthMethod("pin");
          return;
        }
        
        // Neither set - prompt for voice enrollment (preferred for rural/offline)
        setTimeout(() => {
          setShowVoiceEnrollment(true);
        }, 1000);
      }
    };
    checkAndPromptAuth();
  }, [user, loading, bankingLoading, checkPinStatus, checkVoiceProfile]);

  // Process the transcript when user stops speaking
  const processCommand = useCallback(async (userMessage: string) => {
    if (!userMessage.trim()) return;
    
    setIsProcessing(true);
    
    // Add user message to conversation
    setConversation(prev => [
      ...prev,
      { message: userMessage, isUser: true, timestamp: "अभी" }
    ]);

    try {
      // Use AI to process the command - pass actual balance
      const result = await processVoiceCommand(userMessage, selectedLanguage, balance);

      console.log("Voice command result:", result);

      // Add AI response to conversation
      setConversation(prev => [
        ...prev,
        { message: result.response, isUser: false, timestamp: "अभी" }
      ]);
      
      // Speak the AI response
      speak(result.response);

      // Handle navigation if needed
      if (result.action === "navigate" && result.route) {
        // Wait for speech to start, then navigate
        setTimeout(() => {
          navigate(result.route!);
        }, 1500);
      }
    } catch (error) {
      console.error("Error processing command:", error);
      const fallbackResponse = "माफ कीजिए, कुछ गड़बड़ हुई।";
      setConversation(prev => [
        ...prev,
        { message: fallbackResponse, isUser: false, timestamp: "अभी" }
      ]);
      speak(fallbackResponse);
    } finally {
      setIsProcessing(false);
    }
  }, [speak, selectedLanguage, navigate]);

  // Watch for committed transcript and process it
  useEffect(() => {
    // Only process if we have a new transcript that hasn't been processed yet
    if (transcript && 
        transcript !== lastProcessedTranscript.current && 
        !isListening && 
        !isProcessing) {
      lastProcessedTranscript.current = transcript;
      stopSpeaking();
      processCommand(transcript);
    }
  }, [transcript, isListening, isProcessing, stopSpeaking, processCommand]);

  const handleVoiceToggle = async () => {
    // If speaking, stop it first
    if (isSpeaking) {
      stopSpeaking();
      return;
    }

    // Toggle listening
    if (isListening) {
      stopListening();
    } else {
      // Stop any previous speech before starting to listen
      stopSpeaking();

      // Allow repeating the same command again (e.g. "मेरा बैलेंस बताओ")
      // by resetting the last processed transcript when a new listening session starts.
      lastProcessedTranscript.current = "";

      await startListening();
    }
  };

  const handleLogout = async () => {
    await signOut();
    navigate("/auth");
  };

  // Format transactions for display
  const recentTransactions = transactions.slice(0, 4).map(tx => ({
    type: tx.type,
    description: tx.description,
    amount: tx.amount,
    date: formatDistanceToNow(new Date(tx.created_at), { addSuffix: true })
  }));

  if (loading || bankingLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Voice Enrollment Modal - preferred for rural/offline */}
      {showVoiceEnrollment && (
        <VoiceEnrollment 
          onComplete={() => {
            setShowVoiceEnrollment(false);
            setAuthMethod("voice");
            speak("आपकी आवाज़ रजिस्टर हो गई! अब आप आवाज़ से लेनदेन कर सकते हैं।");
          }} 
          onCancel={() => setShowVoiceEnrollment(false)}
          onFallbackToPin={() => {
            setShowVoiceEnrollment(false);
            setShowPinSetup(true);
          }}
        />
      )}
      
      {/* Voice PIN Setup Modal - fallback option */}
      {showPinSetup && (
        <VoicePinSetup 
          onComplete={() => {
            setShowPinSetup(false);
            setAuthMethod("pin");
            speak("आपका सुरक्षा PIN सेट हो गया! अब आप सुरक्षित लेनदेन कर सकते हैं।");
          }} 
          onCancel={() => setShowPinSetup(false)} 
        />
      )}
      {/* Header */}
      <header className="sticky top-0 z-30 bg-background/95 backdrop-blur-xl border-b border-border safe-area-top">
        <div className="container mx-auto px-4 py-3 sm:py-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-primary flex items-center justify-center shrink-0">
                <Wallet className="w-5 h-5 sm:w-6 sm:h-6 text-primary-foreground" />
              </div>
              <div className="min-w-0">
                <h1 className="font-semibold text-base sm:text-lg text-foreground truncate">VoiceBank</h1>
                <p className="text-[11px] sm:text-xs text-muted-foreground truncate">Rural Banking Assistant</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
              <StatusBar isOnline={isOnline} isVoiceVerified={isVoiceVerified} />
              <LanguageSelector 
                selectedLanguage={selectedLanguage} 
                onLanguageChange={setSelectedLanguage} 
              />
              <button
                onClick={handleLogout}
                className="p-2.5 sm:p-2 rounded-lg hover:bg-muted active:bg-muted/80 transition-colors touch-manipulation"
                aria-label="Logout"
              >
                <LogOut className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-4 sm:py-6 pb-52 sm:pb-56">
        {/* Balance Card */}
        <section className="mb-6 sm:mb-8 animate-fade-in">
          <BalanceCard balance={balance} isVerified={isVoiceVerified} />
        </section>

        {/* Quick Actions */}
        <section className="mb-6 sm:mb-8 animate-fade-in" style={{ animationDelay: '0.1s' }}>
          <h2 className="text-lg sm:text-title text-foreground mb-2 sm:mb-3 font-semibold">Quick Actions</h2>
          <p className="text-sm text-muted-foreground mb-3 sm:mb-4">Tap or say the command</p>
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            <QuickAction
              icon={Wallet}
              label="Check Balance"
              voiceCommand="मेरा बैलेंस बताओ"
              onClick={() => navigate("/check-balance")}
              variant="primary"
            />
            <QuickAction
              icon={Send}
              label="Send Money"
              voiceCommand="पैसे भेजो"
              onClick={() => navigate("/send-money")}
              variant="secondary"
            />
            <QuickAction
              icon={Receipt}
              label="Pay Bills"
              voiceCommand="बिल भरो"
              onClick={() => navigate("/pay-bills")}
              variant="accent"
            />
            <QuickAction
              icon={History}
              label="History"
              voiceCommand="पिछले लेनदेन"
              onClick={() => navigate("/history")}
              variant="primary"
            />
          </div>
        </section>

        {/* Conversation History */}
        <section className="mb-6 sm:mb-8 animate-fade-in" style={{ animationDelay: '0.2s' }}>
          <h2 className="text-lg sm:text-title text-foreground mb-3 sm:mb-4 font-semibold">Conversation</h2>
          <div className="glass-card rounded-2xl p-3 sm:p-4 space-y-3 sm:space-y-4 max-h-48 sm:max-h-64 overflow-y-auto">
            {conversation.map((msg, idx) => (
              <ConversationBubble 
                key={idx} 
                message={msg.message} 
                isUser={msg.isUser}
                timestamp={msg.timestamp}
              />
            ))}
          </div>
        </section>

        {/* Recent Transactions */}
        <section className="animate-fade-in" style={{ animationDelay: '0.3s' }}>
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <h2 className="text-lg sm:text-title text-foreground font-semibold">Recent Transactions</h2>
            <button 
              onClick={() => navigate("/history")} 
              className="text-primary font-medium text-sm sm:text-base hover:underline active:opacity-70 transition-opacity px-2 py-1"
            >
              View All
            </button>
          </div>
          <div className="glass-card rounded-2xl divide-y divide-border overflow-hidden">
            {recentTransactions.length > 0 ? (
              recentTransactions.map((tx, idx) => (
                <TransactionItem key={idx} {...tx} />
              ))
            ) : (
              <div className="p-6 text-center text-muted-foreground">
                <p>No transactions yet</p>
                <p className="text-sm mt-1">Your transactions will appear here</p>
              </div>
            )}
          </div>
        </section>
      </main>

      {/* Voice Control - Fixed at bottom */}
      <div className="fixed bottom-0 left-0 right-0 z-40 pb-safe-bottom">
        <div className="flex justify-center px-4 py-3">
          <div className="bg-background/95 backdrop-blur-xl border border-border shadow-lg rounded-2xl px-6 py-3 max-w-xs w-full">
            <div className="flex flex-col items-center gap-2">
              {/* Voice Wave Visualization */}
              <VoiceWave isActive={isListening || isSpeaking} className="h-5" />
              
              {/* Live transcript display */}
              {(isListening || partialTranscript) && (
                <div className="bg-muted/50 rounded-lg px-3 py-1.5 max-w-full text-center">
                  <p className="text-xs text-foreground truncate">
                    {partialTranscript || "..."}
                  </p>
                </div>
              )}
              
              {/* Listening indicator */}
              <p className="text-xs text-muted-foreground font-medium text-center flex items-center gap-1.5">
                {isConnecting ? (
                  <>
                    <Loader2 className="w-3 h-3 animate-spin text-primary" />
                    कनेक्ट हो रहा है...
                  </>
                ) : isSpeaking ? (
                  <>
                    <Volume2 className="w-3 h-3 animate-pulse text-primary" />
                    बोल रहा हूं...
                  </>
                ) : isProcessing ? (
                  <>
                    <Loader2 className="w-3 h-3 animate-spin text-primary" />
                    समझ रहा हूं...
                  </>
                ) : isListening ? (
                  "सुन रहा हूं... बोलिए"
                ) : (
                  "बोलने के लिए माइक दबाएं"
                )}
              </p>

              {/* Main Voice Button */}
              <VoiceButton 
                isListening={isListening} 
                onClick={handleVoiceToggle}
                disabled={isConnecting || isProcessing}
              />

              {/* Help text */}
              <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                <HelpCircle className="w-3 h-3" />
                <span>Say "Help" for commands</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
