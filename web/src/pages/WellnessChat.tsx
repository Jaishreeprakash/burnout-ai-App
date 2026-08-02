import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Brain, RefreshCw, Sparkles } from 'lucide-react';
import { Card } from '../components/UI/Card';
import apiClient from '../services/api';
import { useAuth } from '../context/AuthContext';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

const STARTER_PROMPTS = [
  "I'm feeling very stressed lately. What should I do?",
  "How can I improve my sleep quality?",
  "I've been working 12 hours a day. Is that too much?",
  "What's a quick breathing exercise for anxiety?",
  "How do I know if I'm truly burned out?",
];

export const WellnessChat: React.FC = () => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: `Hi ${user?.full_name?.split(' ')[0] || 'there'}! 👋 I'm your BurnoutAI wellness coach. I can see your burnout data and I'm here to help you feel better. What's on your mind today?`,
      timestamp: new Date().toISOString(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [aiSource, setAiSource] = useState<'gpt' | 'smart-engine' | 'offline'>('smart-engine');
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || isLoading) return;

    const userMsg: Message = { role: 'user', content: text.trim(), timestamp: new Date().toISOString() };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    // Build history for GPT context (last 8 messages excluding system)
    const history = messages.slice(-8).map((m) => ({
      role: m.role,
      content: m.content,
    }));

    try {
      const resp = await apiClient.post('/chat', {
        message: text.trim(),
        history,
      });
      const aiMsg: Message = {
        role: 'assistant',
        content: resp.data.reply,
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, aiMsg]);
      setAiSource(resp.data.ai_source === 'gpt' ? 'gpt' : 'smart-engine');
    } catch {
      const fallback: Message = {
        role: 'assistant',
        content: "I can't reach the backend right now. Please make sure the backend is running: `cd backend && python -m uvicorn main:app --port 8001 --reload`",
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, fallback]);
      setAiSource('offline');
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const clearChat = () => {
    setMessages([{
      role: 'assistant',
      content: `Fresh start! I'm here to help. What would you like to talk about, ${user?.full_name?.split(' ')[0] || 'friend'}?`,
      timestamp: new Date().toISOString(),
    }]);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-9rem)] animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center">
            <Brain size={20} className="text-indigo-400" />
          </div>
          <div>
            <h3 className="text-white font-semibold text-sm">BurnoutAI Wellness Coach</h3>
            <div className="flex items-center gap-1.5">
              <div className={`w-2 h-2 rounded-full ${
                aiSource === 'gpt' ? 'bg-green-400' :
                aiSource === 'smart-engine' ? 'bg-indigo-400' : 'bg-amber-400'
              } animate-pulse`} />
              <span className="text-xs text-slate-400">
                {aiSource === 'gpt' ? 'GPT-4o-mini · Live AI' :
                 aiSource === 'smart-engine' ? 'Smart Wellness Engine · Personalised to your data' :
                 'Offline — start the backend'}
              </span>
            </div>
          </div>
        </div>
        <button onClick={clearChat} className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5">
          <RefreshCw size={12} />
          New Chat
        </button>
      </div>

      {/* Messages */}
      <Card className="flex-1 overflow-y-auto p-4 space-y-4 mb-4">
        {messages.map((msg, i) => (
          <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
            {/* Avatar */}
            <div className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold ${
              msg.role === 'assistant'
                ? 'bg-indigo-600/20 border border-indigo-500/40'
                : 'bg-slate-700 border border-slate-600'
            }`}>
              {msg.role === 'assistant'
                ? <Bot size={16} className="text-indigo-400" />
                : <User size={16} className="text-slate-300" />
              }
            </div>

            {/* Bubble */}
            <div className={`max-w-[75%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
              msg.role === 'assistant'
                ? 'bg-slate-800 border border-slate-700 text-slate-200 rounded-tl-sm'
                : 'bg-indigo-600 text-white rounded-tr-sm'
            }`}>
              {msg.content}
              <p className={`text-xs mt-1.5 ${msg.role === 'assistant' ? 'text-slate-400' : 'text-indigo-300'}`}>
                {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </div>
        ))}

        {/* Typing indicator */}
        {isLoading && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center flex-shrink-0">
              <Bot size={16} className="text-indigo-400" />
            </div>
            <div className="bg-slate-800 border border-slate-700 rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-1.5">
              {[0, 150, 300].map((delay) => (
                <div key={delay} className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce"
                  style={{ animationDelay: `${delay}ms` }} />
              ))}
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </Card>

      {/* Starter prompts (shown only at start) */}
      {messages.length <= 1 && (
        <div className="flex flex-wrap gap-2 mb-3">
          {STARTER_PROMPTS.map((p) => (
            <button key={p} onClick={() => sendMessage(p)}
              className="flex items-center gap-1.5 text-xs text-slate-300 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-full px-3 py-1.5 transition-colors">
              <Sparkles size={11} className="text-indigo-400" />
              {p}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="flex items-center gap-3 bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 focus-within:border-indigo-500 transition-colors">
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask your wellness coach anything..."
          aria-label="Message"
          className="flex-1 bg-transparent text-slate-100 placeholder-slate-500 text-sm focus:outline-none"
          disabled={isLoading}
        />
        <button
          onClick={() => sendMessage(input)}
          disabled={isLoading || !input.trim()}
          aria-label="Send message"
          className="w-9 h-9 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center transition-all flex-shrink-0"
        >
          <Send size={16} className="text-white" />
        </button>
      </div>
      <p className="text-xs text-slate-400 text-center mt-2">
        Powered by GPT-4o-mini · Aware of your burnout score and wellness data
      </p>
    </div>
  );
};
