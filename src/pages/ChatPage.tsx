import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Send, RotateCcw, Sparkles, Bot, User } from 'lucide-react';
import { useApp, ChatMessage } from '../context/AppContext';
import {
  processUserQuery,
  ActiveStarState,
  cleanStarName,
} from '../utils/starConversationEngine';

export const ChatPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { chatMessages, setChatMessages, clearChatHistory } = useApp();

  const [inputQuery, setInputQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(() => {
    try {
      return sessionStorage.getItem('anwaa_dify_conversation_id') || null;
    } catch {
      return null;
    }
  });

  // Track active star in conversation state
  const [activeStar, setActiveStar] = useState<ActiveStarState | null>(() => {
    try {
      const saved = sessionStorage.getItem('anwaa_active_star');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const activeStarRef = useRef<ActiveStarState | null>(activeStar);
  activeStarRef.current = activeStar;

  // Track recent stars when multiple are mentioned (e.g. comparisons)
  const previousStarsRef = useRef<string[]>(
    (() => {
      try {
        const saved = sessionStorage.getItem('anwaa_previous_stars');
        return saved ? JSON.parse(saved) : [];
      } catch {
        return [];
      }
    })()
  );

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const handledRequestIds = useRef<Set<string>>(new Set());

  // Scroll to bottom when messages update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, loading]);

  // Send message helper for continuing current conversation with follow-up enrichment
  const sendMessage = useCallback(
    async (textToSend: string) => {
      const trimmed = textToSend.trim();
      if (!trimmed || loading) return;

      // 1. Process query locally with rule-based engine
      const procResult = processUserQuery(
        trimmed,
        activeStarRef.current,
        previousStarsRef.current
      );

      // 2. If question is ambiguous or speaks about multiple stars, ask for clarification directly
      if (procResult.requiresClarification) {
        const userMsg: ChatMessage = {
          id: 'user_' + Date.now(),
          sender: 'user',
          text: trimmed, // Always show original user text in the UI
        };
        const botClarifyMsg: ChatMessage = {
          id: 'bot_' + Date.now(),
          sender: 'bot',
          text: procResult.clarificationMessage || 'يرجى تحديد النجم المقصود لنتمكن من إفادتك بدقة.',
        };
        setChatMessages((prev) => [...prev, userMsg, botClarifyMsg]);
        setInputQuery('');
        return;
      }

      // 3. Update active star if explicitly mentioned or updated
      if (procResult.updatedActiveStar !== undefined) {
        setActiveStar(procResult.updatedActiveStar);
        activeStarRef.current = procResult.updatedActiveStar;
        try {
          if (procResult.updatedActiveStar) {
            sessionStorage.setItem('anwaa_active_star', JSON.stringify(procResult.updatedActiveStar));
          } else {
            sessionStorage.removeItem('anwaa_active_star');
          }
        } catch {
          // ignore
        }
      }

      // 4. Update multi-star memory for disambiguation
      if (procResult.multipleStarsDetected && procResult.multipleStarsDetected.length > 0) {
        previousStarsRef.current = procResult.multipleStarsDetected;
        try {
          sessionStorage.setItem('anwaa_previous_stars', JSON.stringify(procResult.multipleStarsDetected));
        } catch {
          // ignore
        }
      } else if (procResult.updatedActiveStar) {
        previousStarsRef.current = [procResult.updatedActiveStar.cleanName];
        try {
          sessionStorage.setItem('anwaa_previous_stars', JSON.stringify([procResult.updatedActiveStar.cleanName]));
        } catch {
          // ignore
        }
      }

      // 5. Display the user's original raw text in the chat bubble UI
      const userMsgId = 'user_' + Date.now();
      const userMsg: ChatMessage = {
        id: userMsgId,
        sender: 'user',
        text: procResult.displayUserMessage,
      };

      setChatMessages((prev) => [...prev, userMsg]);
      setInputQuery('');
      setLoading(true);

      // 6. Send the enriched query to Dify while preserving the ongoing conversation_id
      try {
        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            query: procResult.enrichedQuery, // Enriched with clear star name for Dify
            conversation_id: conversationId,
          }),
        });

        if (!res.ok) {
          throw new Error(`Server returned ${res.status}`);
        }

        const data = await res.json();
        const botReplyText = data.text || 'عذراً، لم أتمكن من الحصول على إجابة في الوقت الحالي.';

        if (data.conversation_id) {
          setConversationId(data.conversation_id);
          try {
            sessionStorage.setItem('anwaa_dify_conversation_id', data.conversation_id);
          } catch {
            // ignore
          }
        }

        const botMsg: ChatMessage = {
          id: 'bot_' + Date.now(),
          sender: 'bot',
          text: botReplyText,
        };
        setChatMessages((prev) => [...prev, botMsg]);
      } catch (err) {
        console.error('Chat error:', err);
        const errorMsg: ChatMessage = {
          id: 'err_' + Date.now(),
          sender: 'bot',
          text: 'تعذّر الاتصال بالمساعد الذكي، يرجى المحاولة مرة أخرى.',
          isError: true,
          failedQuery: trimmed,
        };
        setChatMessages((prev) => [...prev, errorMsg]);
      } finally {
        setLoading(false);
      }
    },
    [conversationId, loading, setChatMessages]
  );

  // Start fresh independent conversation specifically for star card clicks
  const startNewStarConversation = useCallback(
    async (questionText: string, starName?: string, starNumber?: number) => {
      const trimmed = questionText.trim();
      if (!trimmed) return;

      // 1. Reset conversation ID in state and sessionStorage so previous star context is completely discarded
      setConversationId(null);
      try {
        sessionStorage.removeItem('anwaa_dify_conversation_id');
      } catch {
        // ignore
      }

      // 2. Set active star state & clear previous multi-stars
      const initialStar: ActiveStarState | null = starName
        ? {
            name: starName,
            cleanName: cleanStarName(starName),
            number: starNumber,
          }
        : null;

      setActiveStar(initialStar);
      activeStarRef.current = initialStar;
      previousStarsRef.current = initialStar ? [initialStar.cleanName] : [];

      try {
        if (initialStar) {
          sessionStorage.setItem('anwaa_active_star', JSON.stringify(initialStar));
        } else {
          sessionStorage.removeItem('anwaa_active_star');
        }
        sessionStorage.removeItem('anwaa_previous_stars');
      } catch {
        // ignore
      }

      // 3. Clear previous conversation and start fresh with welcome + star question
      const welcomeMsg: ChatMessage = {
        id: 'welcome_' + Date.now(),
        sender: 'bot',
        text: 'أهلًا بك! اسأل أنواء عن النجوم وأسمائها العربية وقصصها في تراثنا.',
      };
      const userMsg: ChatMessage = {
        id: 'user_' + Date.now(),
        sender: 'user',
        text: trimmed,
      };

      setChatMessages([welcomeMsg, userMsg]);
      setInputQuery('');
      setLoading(true);

      try {
        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            query: trimmed,
            conversation_id: null, // Start fresh independent session in Dify
          }),
        });

        if (!res.ok) {
          throw new Error(`Server returned ${res.status}`);
        }

        const data = await res.json();
        const botReplyText = data.text || 'عذراً، لم أتمكن من الحصول على إجابة في الوقت الحالي.';

        if (data.conversation_id) {
          setConversationId(data.conversation_id);
          try {
            sessionStorage.setItem('anwaa_dify_conversation_id', data.conversation_id);
          } catch {
            // ignore
          }
        }

        const botMsg: ChatMessage = {
          id: 'bot_' + Date.now(),
          sender: 'bot',
          text: botReplyText,
        };
        setChatMessages((prev) => [...prev, botMsg]);
      } catch (err) {
        console.error('Chat error:', err);
        const errorMsg: ChatMessage = {
          id: 'err_' + Date.now(),
          sender: 'bot',
          text: 'تعذّر الاتصال بالمساعد الذكي، يرجى المحاولة مرة أخرى.',
          isError: true,
          failedQuery: trimmed,
        };
        setChatMessages((prev) => [...prev, errorMsg]);
      } finally {
        setLoading(false);
      }
    },
    [setChatMessages]
  );

  // Handle automatic question passed from star card click
  useEffect(() => {
    const state = location.state as
      | { autoQuestion?: string; starName?: string; starNumber?: number; requestId?: string }
      | undefined;

    if (state?.autoQuestion && state.requestId) {
      if (!handledRequestIds.current.has(state.requestId)) {
        handledRequestIds.current.add(state.requestId);
        const questionToAsk = state.autoQuestion;
        const starName = state.starName;
        const starNumber = state.starNumber;

        // Clean navigation state immediately via React Router so reloads/back never re-trigger
        navigate('/chat', { replace: true, state: {} });

        // Start a brand-new independent conversation for this star click
        startNewStarConversation(questionToAsk, starName, starNumber);
      }
    }
  }, [location.state, navigate, startNewStarConversation]);

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(inputQuery);
  };

  const handleNewConversation = () => {
    clearChatHistory();
    setConversationId(null);
    setActiveStar(null);
    activeStarRef.current = null;
    previousStarsRef.current = [];
    try {
      sessionStorage.removeItem('anwaa_dify_conversation_id');
      sessionStorage.removeItem('anwaa_active_star');
      sessionStorage.removeItem('anwaa_previous_stars');
    } catch {
      // ignore
    }
    inputRef.current?.focus();
  };

  const sampleSuggestions = [
    'ما هي أشهر منازل القمر عند العرب؟',
    'حدثني عن سهيل اليماني وطلوعه.',
    'ما سبب تسمية الثريا بهذا الاسم؟',
    'ما هو الفرق بين النوء والمنزلة؟',
  ];

  return (
    <div
      className="max-w-7xl mx-auto px-4 py-6 flex flex-col h-[calc(100vh-100px)] min-h-[640px]"
      dir="rtl"
      lang="ar"
    >
      {/* Top Header Card */}
      <div className="bg-[var(--panel)] border border-[var(--line)] rounded-[10px] p-4 mb-4 flex flex-wrap items-center justify-between gap-3 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-[8px] bg-[var(--panel2)] border border-[var(--line)] flex items-center justify-center text-[var(--gold)]">
            <Sparkles className="w-5 h-5 text-[var(--gold)]" />
          </div>
          <div>
            <h1
              className="text-2xl font-bold text-[var(--gold)]"
              style={{ fontFamily: "'Amiri', serif" }}
            >
              اسأل أنواء
            </h1>
          </div>
        </div>

        <div>
          <button
            type="button"
            onClick={handleNewConversation}
            className="px-3.5 py-2 rounded-[8px] bg-[var(--panel2)] border border-[var(--line)] text-[var(--muted)] hover:text-[var(--gold)] hover:border-[var(--gold)] text-xs sm:text-sm flex items-center gap-2 transition-colors cursor-pointer shadow-xs"
            title="بدء محادثة جديدة"
          >
            <RotateCcw className="w-4 h-4" />
            <span>محادثة جديدة</span>
          </button>
        </div>
      </div>

      {/* Interactive Chat Window */}
      <div className="flex-1 bg-[var(--panel)] border border-[var(--line)] rounded-[10px] flex flex-col overflow-hidden shadow-sm">
        {/* Scrollable Messages Stream */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {chatMessages.map((msg) => {
            const isUser = msg.sender === 'user';
            return (
              <div
                key={msg.id}
                className={`flex items-start gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
              >
                <div
                  className={`w-8 h-8 rounded-[8px] shrink-0 flex items-center justify-center border text-xs ${
                    isUser
                      ? 'bg-[var(--gold-fill)] text-[#1a1405] border-[var(--gold)]'
                      : 'bg-[var(--panel2)] text-[var(--gold)] border-[var(--line)]'
                  }`}
                >
                  {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                </div>

                <div
                  className={`max-w-[85%] sm:max-w-[75%] rounded-[10px] p-3.5 text-sm leading-relaxed border ${
                    isUser
                      ? 'bg-[var(--panel2)] border-[var(--gold)] text-[var(--ink)]'
                      : msg.isError
                      ? 'bg-[var(--panel2)] border-[var(--ember)] text-[var(--ember)]'
                      : 'bg-[var(--panel2)] border-[var(--line)] text-[var(--ink)]'
                  }`}
                >
                  <div className="whitespace-pre-line leading-relaxed font-sans">{msg.text}</div>

                  {msg.isError && msg.failedQuery && (
                    <button
                      type="button"
                      onClick={() => sendMessage(msg.failedQuery!)}
                      className="mt-2 text-xs text-[var(--gold)] underline cursor-pointer hover:opacity-80 block"
                    >
                      إعادة المحاولة
                    </button>
                  )}
                </div>
              </div>
            );
          })}

          {/* Loading Indicator */}
          {loading && (
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-[8px] shrink-0 flex items-center justify-center border border-[var(--line)] bg-[var(--panel2)] text-[var(--gold)]">
                <Bot className="w-4 h-4 animate-spin" />
              </div>
              <div className="bg-[var(--panel2)] border border-[var(--line)] rounded-[10px] p-3.5 text-sm text-[var(--muted)] flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[var(--gold)] animate-ping" />
                <span>المساعد الذكي يبحث في كتب التراث الفلكي...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Quick Suggestions when messages length <= 1 */}
        {chatMessages.length <= 1 && !loading && (
          <div className="px-4 pb-2 border-t border-[var(--line)]/50 pt-3">
            <div className="text-xs text-[var(--muted)] mb-2">أسئلة مقترحة:</div>
            <div className="flex flex-wrap gap-2">
              {sampleSuggestions.map((sug, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => sendMessage(sug)}
                  className="px-3 py-1.5 rounded-[8px] bg-[var(--panel2)] border border-[var(--line)] text-xs text-[var(--ink)] hover:border-[var(--gold)] hover:text-[var(--gold)] transition-colors cursor-pointer"
                >
                  {sug}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Chat Input Bar */}
        <div className="p-3 sm:p-4 border-t border-[var(--line)] bg-[var(--panel)]">
          <form onSubmit={handleFormSubmit} className="flex items-center gap-2">
            <input
              ref={inputRef}
              type="text"
              value={inputQuery}
              onChange={(e) => setInputQuery(e.target.value)}
              placeholder="اسأل المساعد الذكي عن أي نجم أو منزلة أو نوء..."
              disabled={loading}
              className="flex-1 bg-[var(--input-bg)] border border-[var(--line)] rounded-[8px] px-4 py-2.5 text-sm text-[var(--ink)] placeholder-[var(--muted)] focus:outline-none focus:border-[var(--gold)] disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={loading || !inputQuery.trim()}
              className="px-4 py-2.5 rounded-[8px] bg-[var(--gold-fill)] text-[#1a1405] font-semibold text-sm hover:opacity-90 disabled:opacity-40 transition-opacity cursor-pointer flex items-center gap-1.5 shrink-0"
            >
              <span>إرسال</span>
              <Send className="w-4 h-4 rotate-180" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ChatPage;
