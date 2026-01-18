import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Eye, EyeOff, RefreshCw, Wallet, HelpCircle, Loader2 } from "lucide-react";
import { VoiceButton } from "@/components/VoiceButton";
import { VoiceWave } from "@/components/VoiceWave";
import { ConversationBubble } from "@/components/ConversationBubble";
import { useBanking } from "@/hooks/useBanking";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";

const CheckBalance = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { balance, accountNumber, isLoading } = useBanking();
  const queryClient = useQueryClient();
  const [isListening, setIsListening] = useState(false);
  const [showBalance, setShowBalance] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [conversation, setConversation] = useState([
    { message: "आपका खाता शेष देखने के लिए 'बैलेंस बताओ' बोलें।", isUser: false, timestamp: "अभी" }
  ]);

  // Format account number for display (show last 4 digits)
  const maskedAccountNo = accountNumber ? `XXXX${accountNumber.slice(-4)}` : "XXXX0000";
  const formattedBalance = balance.toLocaleString('en-IN');

  const handleVoiceToggle = () => {
    setIsListening(!isListening);
    if (!isListening) {
      setTimeout(() => {
        setConversation(prev => [
          ...prev,
          { message: "मेरा बैलेंस बताओ", isUser: true, timestamp: "अभी" }
        ]);
        setTimeout(() => {
          setConversation(prev => [
            ...prev,
            { message: `आपके खाते में ₹${formattedBalance} उपलब्ध हैं।`, isUser: false, timestamp: "अभी" }
          ]);
          setIsListening(false);
        }, 1500);
      }, 2000);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: ["account", user?.id] });
    setIsRefreshing(false);
    setConversation(prev => [
      ...prev,
      { message: "आपका बैलेंस अपडेट हो गया है।", isUser: false, timestamp: "अभी" }
    ]);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-background/95 backdrop-blur-xl border-b border-border">
        <div className="container mx-auto px-4 py-3 sm:py-4">
          <div className="flex items-center gap-3 sm:gap-4">
            <button
              onClick={() => navigate("/")}
              className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-muted flex items-center justify-center hover:bg-muted/80 active:bg-muted/70 transition-colors touch-manipulation shrink-0"
            >
              <ArrowLeft className="w-5 h-5 text-foreground" />
            </button>
            <div className="min-w-0">
              <h1 className="font-semibold text-base sm:text-lg text-foreground">Check Balance</h1>
              <p className="text-[11px] sm:text-xs text-muted-foreground">खाता शेष देखें</p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-4 sm:py-6 pb-52 sm:pb-56">
        {/* Balance Card */}
        <section className="space-y-3 sm:space-y-4 mb-6 sm:mb-8 animate-fade-in">
          <div className="glass-card rounded-2xl p-4 sm:p-6">
            <div className="flex items-center justify-between mb-3 sm:mb-4 gap-2">
              <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <Wallet className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm text-muted-foreground">Main Account</p>
                  <p className="text-[10px] sm:text-xs text-muted-foreground">{maskedAccountNo}</p>
                </div>
              </div>
              <div className="flex items-center gap-1 sm:gap-2 shrink-0">
                <button
                  onClick={() => setShowBalance(!showBalance)}
                  className="p-2.5 sm:p-2 rounded-lg hover:bg-muted active:bg-muted/80 transition-colors touch-manipulation"
                >
                  {showBalance ? <Eye className="w-5 h-5 text-muted-foreground" /> : <EyeOff className="w-5 h-5 text-muted-foreground" />}
                </button>
                <button
                  onClick={handleRefresh}
                  className="p-2.5 sm:p-2 rounded-lg hover:bg-muted active:bg-muted/80 transition-colors touch-manipulation"
                >
                  <RefreshCw className={`w-5 h-5 text-muted-foreground ${isRefreshing ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>
            <div className="text-2xl sm:text-display text-foreground font-bold">
              {showBalance ? `₹${formattedBalance}` : "₹ ••••••"}
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1.5 sm:mt-2">Available Balance</p>
          </div>
        </section>

        {/* Voice Commands */}
        <section className="mb-6 sm:mb-8 animate-fade-in" style={{ animationDelay: '0.1s' }}>
          <h2 className="text-lg sm:text-title text-foreground mb-3 sm:mb-4 font-semibold">Voice Commands</h2>
          <div className="glass-card rounded-2xl p-3 sm:p-4 space-y-2 sm:space-y-3">
            <div className="flex items-center gap-2 sm:gap-3 p-2.5 sm:p-3 bg-primary/5 rounded-xl">
              <span className="text-primary font-medium text-sm sm:text-base">"बैलेंस बताओ"</span>
              <span className="text-muted-foreground text-xs sm:text-sm">- Check all</span>
            </div>
            <div className="flex items-center gap-2 sm:gap-3 p-2.5 sm:p-3 bg-primary/5 rounded-xl">
              <span className="text-primary font-medium text-sm sm:text-base">"बचत खाता"</span>
              <span className="text-muted-foreground text-xs sm:text-sm">- Savings</span>
            </div>
            <div className="flex items-center gap-2 sm:gap-3 p-2.5 sm:p-3 bg-primary/5 rounded-xl">
              <span className="text-primary font-medium text-sm sm:text-base">"रिफ्रेश करो"</span>
              <span className="text-muted-foreground text-xs sm:text-sm">- Update</span>
            </div>
          </div>
        </section>

        {/* Conversation */}
        <section className="animate-fade-in" style={{ animationDelay: '0.2s' }}>
          <h2 className="text-lg sm:text-title text-foreground mb-3 sm:mb-4 font-semibold">Conversation</h2>
          <div className="glass-card rounded-2xl p-3 sm:p-4 space-y-3 sm:space-y-4 max-h-40 sm:max-h-48 overflow-y-auto">
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
      </main>

      {/* Voice Control */}
      <div className="fixed bottom-0 left-0 right-0 z-40 pb-safe-bottom">
        <div className="bg-background/95 backdrop-blur-xl border-t border-border shadow-lg">
          <div className="container mx-auto px-4 py-4 sm:py-6">
            <div className="flex flex-col items-center gap-3 sm:gap-4">
              <VoiceWave isActive={isListening} className="h-6 sm:h-8" />
              <p className="text-sm sm:text-base text-muted-foreground font-medium text-center">
                {isListening ? "सुन रहा हूं... बोलिए" : "बैलेंस जानने के लिए बोलें"}
              </p>
              <VoiceButton isListening={isListening} onClick={handleVoiceToggle} />
              <div className="flex items-center gap-2 text-[11px] sm:text-xs text-muted-foreground">
                <HelpCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span>Say "बैलेंस बताओ"</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CheckBalance;
