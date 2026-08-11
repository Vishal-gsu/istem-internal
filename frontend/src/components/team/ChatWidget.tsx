"use client";

import { useState, useEffect, useRef } from "react";
import { Send, X, Loader2, MessageSquare } from "lucide-react";
import { useAuth } from "@/components/AuthProvider";

interface ChatMessage {
  sender: string;
  content: string;
  timestamp: string;
}

export function ChatWidget({ email, name, onClose }: { email: string, name: string, onClose: () => void }) {
  const { user: account } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const fetchMessages = async () => {
    try {
      const res = await fetch(`/api/chat/${email}`, { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setMessages(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMessages();
    const interval = setInterval(fetchMessages, 3000); // Poll every 3 seconds for MVP
    return () => clearInterval(interval);
  }, [email]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    
    setSending(true);
    const content = input;
    setInput("");
    
    // Optimistic update
    const myEmail = account?.username || "me";
    setMessages(prev => [...prev, { sender: myEmail, content, timestamp: new Date().toISOString() }]);

    try {
      await fetch(`/api/chat/${email}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
        credentials: "include"
      });
      // Will refresh on next poll
    } catch (e) {
      console.error("Failed to send message", e);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 w-96 max-w-[calc(100vw-3rem)] bg-background neu-raised rounded-3xl overflow-hidden z-50 flex flex-col shadow-2xl border border-slate-100 animate-in slide-in-from-bottom-10 duration-300 h-[500px] max-h-[80vh]">
      {/* Header */}
      <div className="p-4 bg-rust-50/50 border-b border-rust-100 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl neu-inset bg-white flex items-center justify-center text-rust-600 font-black">
            {name.charAt(0)}
          </div>
          <div>
            <h3 className="font-bold text-slate-800">{name}</h3>
            <span className="text-xs font-medium text-emerald-600 flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span> Teams Chat
            </span>
          </div>
        </div>
        <button onClick={onClose} className="h-8 w-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors">
          <X className="size-4" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/30">
        {loading ? (
          <div className="h-full flex items-center justify-center text-slate-400">
            <Loader2 className="size-6 animate-spin" />
          </div>
        ) : messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-2">
            <MessageSquare className="size-8 opacity-50" />
            <p className="text-sm font-medium">Start a conversation via Teams</p>
          </div>
        ) : (
          messages.map((msg, i) => {
            const isMe = msg.sender === account?.username;
            return (
              <div key={i} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${
                  isMe 
                    ? 'bg-rust-500 text-white rounded-br-sm shadow-md' 
                    : 'bg-white text-slate-700 border border-slate-100 rounded-bl-sm shadow-sm'
                }`}>
                  {msg.content}
                  <div className={`text-[10px] mt-1 text-right ${isMe ? 'text-rust-200' : 'text-slate-400'}`}>
                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 bg-white border-t border-slate-100">
        <form onSubmit={handleSend} className="relative flex items-center">
          <input 
            type="text" 
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Message via Teams..."
            className="w-full neu-inset rounded-full bg-slate-50 pl-4 pr-12 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-rust-500/20"
          />
          <button 
            type="submit" 
            disabled={!input.trim() || sending}
            className="absolute right-1.5 h-9 w-9 rounded-full bg-rust-500 text-white flex items-center justify-center disabled:opacity-50 hover:bg-rust-600 transition-colors"
          >
            {sending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4 -ml-0.5" />}
          </button>
        </form>
      </div>
    </div>
  );
}
