import React, { useState, useRef, useEffect } from 'react';
import {
  MessageCircle,
  X,
  Send,
  Loader2,
  Sparkles,
  RotateCcw,
} from 'lucide-react';
import { useCurrency } from '../context/CurrencyContext';

interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
}

export const LumoraChatWidget: React.FC = () => {
  const { currency, formatPrice } = useCurrency();
  const [isOpen, setIsOpen] = useState(false);
  const [modelTier, setModelTier] = useState<'fast' | 'general'>('fast');
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome-msg',
      role: 'model',
      text: `Welcome to Lumora! I'm your Lighting Concierge. Ask me about sunset room moods, hardware specs, or our Combo Deals (1 Lamp is ${formatPrice(
        69.99
      )}). How can I help elevate your space?`,
    },
  ]);

  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Keep welcome message updated when currency changes if only 1 message is in thread
  useEffect(() => {
    setMessages((prev) => {
      if (prev.length === 1 && prev[0].id === 'welcome-msg') {
        return [
          {
            id: 'welcome-msg',
            role: 'model',
            text: `Welcome to Lumora! I'm your Lighting Concierge. Ask me about sunset room moods, hardware specs, or our Combo Deals (1 Lamp is ${formatPrice(
              69.99
            )}). How can I help elevate your space?`,
          },
        ];
      }
      return prev;
    });
  }, [currency, formatPrice]);

  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop =
        scrollContainerRef.current.scrollHeight;
    }
  }, [messages, isOpen, isSending]);

  const handleSendMessage = async (textToSend?: string) => {
    const cleanText = (textToSend ?? input).trim();
    if (!cleanText || isSending) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      text: cleanText,
    };

    const updatedHistory = [...messages, userMsg];
    setMessages(updatedHistory);
    if (!textToSend) setInput('');
    setIsSending(true);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: updatedHistory.map((m) => ({
            role: m.role,
            text: m.text,
          })),
          modelTier,
          activeCurrency: currency,
          formattedBasePrice: formatPrice(69.99),
        }),
      });

      const rawText = await res.text();
      let data: { reply?: string; error?: string } = {};
      try {
        data = rawText ? JSON.parse(rawText) : {};
      } catch {
        throw new Error(
          'Lumora Concierge is temporarily unavailable. Please use our Contact form below.'
        );
      }

      if (!res.ok) {
        throw new Error(data.error || 'Unable to get a response right now.');
      }

      setMessages((prev) => [
        ...prev,
        {
          id: `model-${Date.now()}`,
          role: 'model',
          text:
            data.reply ||
            'I can help you explore the Lumora Smart Sunset Lamp, our combo deals, or room lighting setups.',
        },
      ]);
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : 'Unable to send message.'
      );
    } finally {
      setIsSending(false);
    }
  };

  const handleResetChat = () => {
    setErrorMsg(null);
    setMessages([
      {
        id: 'welcome-msg',
        role: 'model',
        text: `Welcome to Lumora! I'm your Lighting Concierge. Ask me about sunset room moods, hardware specs, or our Combo Deals (1 Lamp is ${formatPrice(
          69.99
        )}). How can I help elevate your space?`,
      },
    ]);
  };

  return (
    <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-40">
      {isOpen ? (
        <div className="flex flex-col w-[calc(100vw-2rem)] sm:w-96 h-[480px] max-h-[80vh] rounded-2xl bg-white border border-slate-200 shadow-2xl overflow-hidden text-[#1A2A3A]">
          {/* Header */}
          <div className="flex items-center justify-between bg-[#1A2A3A] px-4 py-3.5 text-white border-b border-white/10">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#FFA500] text-[#1A2A3A]">
                <Sparkles className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-sm font-extrabold leading-tight">
                  Lumora Lighting Concierge
                </h3>
                <p className="text-[11px] text-slate-300">
                  Multi-Turn Advisor · {currency} Pricing
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handleResetChat}
                title="Reset conversation"
                aria-label="Reset conversation"
                className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-300 hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
              >
                <RotateCcw className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                aria-label="Close chat"
                className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-300 hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Model Speed Selector */}
          <div className="flex items-center justify-between bg-[#F8FAFC] px-4 py-2 border-b border-slate-200 text-xs">
            <span className="font-semibold text-slate-600">Response Mode:</span>
            <div className="inline-flex items-center gap-1 rounded-lg bg-slate-200/80 p-0.5">
              <button
                type="button"
                onClick={() => setModelTier('fast')}
                className={`rounded-md px-2.5 py-1 text-[11px] font-bold transition-colors cursor-pointer ${
                  modelTier === 'fast'
                    ? 'bg-white text-[#1A2A3A] shadow-2xs'
                    : 'text-slate-600 hover:text-[#1A2A3A]'
                }`}
              >
                Fast (Flash Lite)
              </button>
              <button
                type="button"
                onClick={() => setModelTier('general')}
                className={`rounded-md px-2.5 py-1 text-[11px] font-bold transition-colors cursor-pointer ${
                  modelTier === 'general'
                    ? 'bg-white text-[#1A2A3A] shadow-2xs'
                    : 'text-slate-600 hover:text-[#1A2A3A]'
                }`}
              >
                Detailed (Flash)
              </button>
            </div>
          </div>

          {/* Scrollable Message Thread */}
          <div
            ref={scrollContainerRef}
            className="flex-1 overflow-y-auto p-4 space-y-3 bg-white"
          >
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${
                  msg.role === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-[#1A2A3A] text-white rounded-br-xs'
                      : 'bg-[#F8FAFC] text-[#1A2A3A] border border-slate-200/80 rounded-bl-xs'
                  }`}
                >
                  {msg.text}
                </div>
              </div>
            ))}

            {isSending && (
              <div className="flex justify-start">
                <div className="inline-flex items-center gap-2 rounded-2xl bg-[#F8FAFC] border border-slate-200/80 px-3.5 py-2.5 text-xs text-slate-600">
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-[#FFA500]" />
                  <span>Thinking...</span>
                </div>
              </div>
            )}

            {errorMsg && (
              <div className="rounded-xl bg-red-50 border border-red-200 p-2.5 text-xs text-red-700">
                {errorMsg}
              </div>
            )}
          </div>

          {/* Quick Suggestion Chips */}
          {messages.length <= 2 && (
            <div className="flex items-center gap-1.5 overflow-x-auto px-4 py-2 bg-[#F8FAFC] border-t border-slate-100">
              {[
                'Explain the Combo Deals',
                'Does it need Wi-Fi?',
                'Best mood for a bedroom?',
              ].map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => handleSendMessage(prompt)}
                  className="shrink-0 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-[#1A2A3A] hover:border-[#FFA500] transition-colors cursor-pointer"
                >
                  {prompt}
                </button>
              ))}
            </div>
          )}

          {/* Input Bar */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex items-center gap-2 border-t border-slate-200 bg-white p-3"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about Lumora..."
              aria-label="Chat message"
              className="flex-1 min-h-[42px] rounded-xl border border-slate-300 px-3.5 py-2 text-base sm:text-sm text-[#1A2A3A] focus:border-[#FFA500] focus:outline-none"
            />
            <button
              type="submit"
              disabled={isSending || !input.trim()}
              aria-label="Send message"
              className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-xl bg-[#FFA500] text-[#1A2A3A] disabled:opacity-50 transition-transform hover:scale-105 cursor-pointer"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          aria-label="Open Lumora Lighting Concierge chat"
          className="inline-flex min-h-[50px] items-center gap-2.5 rounded-full bg-[#1A2A3A] px-4 sm:px-5 py-3 text-xs sm:text-sm font-extrabold text-white shadow-xl border border-[#FFA500]/50 hover:scale-105 transition-transform cursor-pointer"
        >
          <MessageCircle className="h-4 w-4 text-[#FFA500] shrink-0" />
          <span>Lighting Concierge</span>
        </button>
      )}
    </div>
  );
};
