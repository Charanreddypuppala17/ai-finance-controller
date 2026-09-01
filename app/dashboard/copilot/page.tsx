'use client';

import React, { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Bot, Send, User, Wrench, Copy, ThumbsUp, ThumbsDown } from 'lucide-react';

interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  toolExecutions?: any[];
  timestamp: string;
}

function CopilotChatContent() {
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get('q') || '';
  const initialSent = useRef(false);

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      sender: 'assistant',
      text: `Hello! I am your **AI Finance Copilot**. I use controlled backend database tools to analyze your multi-source reconciliation data without hallucinating.

Ask me questions such as:
- **"Why is transaction #17 mismatched?"**
- **"Show reconciliation summary"**
- **"List high priority fee mismatch exceptions"**`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);

  const [input, setInput] = useState(initialQuery);
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  useEffect(() => {
    if (initialQuery && !initialSent.current) {
      initialSent.current = true;
      handleSend(initialQuery);
    }
  }, [initialQuery]);

  const handleSend = async (textToSend?: string) => {
    const query = textToSend || input;
    if (!query.trim()) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      sender: 'user',
      text: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput(''); // Always clear the input box
    setLoading(true);

    try {
      const userId = typeof window !== 'undefined' ? localStorage.getItem('user_id') || 'demo-user-001' : 'demo-user-001';
      const activeRunId = typeof window !== 'undefined' ? localStorage.getItem('active_run_id') || '' : '';
      
      const res = await fetch('/api/copilot', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-user-id': userId
        },
        body: JSON.stringify({ prompt: query, runId: activeRunId }),
      });

      const data = await res.json();

      const assistantMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        sender: 'assistant',
        text: data.reply || 'Sorry, I could not process your query.',
        toolExecutions: data.toolExecutions || [],
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col glass-panel rounded-2xl border border-slate-800 overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-slate-800 bg-slate-950/80 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center shadow-md">
            <Bot className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <span>AI Finance Copilot</span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-semibold">
                Tool Calling Active
              </span>
            </h2>
            <p className="text-[11px] text-slate-400">Evidence-based query engine for active reconciliation data</p>
          </div>
        </div>
      </div>

      {/* Message History */}
      <div className="flex-1 p-6 overflow-y-auto space-y-6">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex gap-4 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {msg.sender === 'assistant' && (
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center flex-shrink-0 border border-indigo-400/30 shadow-md">
                <Bot className="w-5 h-5 text-white" />
              </div>
            )}

            <div className={`max-w-3xl space-y-1.5 flex-1 ${msg.sender === 'user' ? 'flex flex-col items-end' : ''}`}>
              {msg.sender === 'assistant' && msg.toolExecutions && msg.toolExecutions.length > 0 && (
                <div className="mb-2 space-y-1">
                  {msg.toolExecutions.map((t, idx) => (
                    <div
                      key={idx}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-950/60 border border-slate-900 text-[10px] text-slate-400 font-mono"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      <span>
                        Verified database context via <strong>{t.toolName}</strong>
                      </span>
                    </div>
                  ))}
                </div>
              )}

              <div
                className={`p-4 rounded-2xl text-xs leading-relaxed group transition-all duration-300 relative ${
                  msg.sender === 'user'
                    ? 'bg-indigo-600/10 border border-indigo-500/20 text-slate-100 rounded-tr-none max-w-xl'
                    : 'bg-slate-900/60 border border-slate-800/80 rounded-tl-none shadow-xl hover:border-slate-700/80 w-full'
                }`}
              >
                {msg.sender === 'user' ? (
                  msg.text
                ) : (
                  <>
                    <MarkdownMessage text={msg.text} />
                    
                    {/* Action Bar */}
                    <div className="flex items-center gap-3 mt-4 pt-3 border-t border-slate-800/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <button
                        onClick={() => handleCopy(msg.id, msg.text)}
                        className="px-2 py-1 rounded bg-slate-950/60 border border-slate-800/60 text-[10px] text-slate-400 hover:text-white hover:bg-slate-900 transition-all flex items-center gap-1"
                      >
                        {copiedId === msg.id ? (
                          <>
                            <span className="text-emerald-400 font-bold">✓</span>
                            <span className="text-emerald-400">Copied!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            <span>Copy response</span>
                          </>
                        )}
                      </button>
                      
                      <button className="p-1 rounded bg-slate-950/60 border border-slate-800/60 text-slate-400 hover:text-emerald-400 hover:bg-slate-900 transition-all">
                        <ThumbsUp className="w-3.5 h-3.5" />
                      </button>
                      <button className="p-1 rounded bg-slate-950/60 border border-slate-800/60 text-slate-400 hover:text-rose-400 hover:bg-slate-900 transition-all">
                        <ThumbsDown className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </>
                )}
              </div>

              <span className="text-[9px] text-slate-500 block px-1 mt-1">{msg.timestamp}</span>
            </div>

            {msg.sender === 'user' && (
              <div className="w-9 h-9 rounded-xl bg-slate-800/80 text-slate-350 flex items-center justify-center flex-shrink-0 border border-slate-700 font-bold text-xs shadow-sm">
                U
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div className="flex items-center gap-3 text-xs text-indigo-400 animate-pulse">
            <Wrench className="w-4 h-4 animate-spin" />
            <span>Querying financial database & verifying matching evidence...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Box */}
      <div className="p-4 border-t border-slate-800 bg-slate-950/80">
        {/* Suggestion Chips */}
        <div className="flex flex-wrap gap-2 mb-3">
          <button
            type="button"
            disabled={loading}
            onClick={() => handleSend("Investigate transaction TXN-150")}
            className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-850 border border-slate-800/80 hover:border-indigo-500/30 text-[10px] text-indigo-300 font-semibold transition-all shadow-sm"
          >
            🔍 Investigate TXN-150
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={() => handleSend("Show reconciliation summary")}
            className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-850 border border-slate-800/80 hover:border-indigo-500/30 text-[10px] text-indigo-300 font-semibold transition-all shadow-sm"
          >
            📊 Reconcile Summary
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={() => handleSend("List high priority exceptions")}
            className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-850 border border-slate-800/80 hover:border-indigo-500/30 text-[10px] text-indigo-300 font-semibold transition-all shadow-sm"
          >
            ⚠️ High Exceptions
          </button>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="flex items-center gap-3"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask AI Copilot about any transaction, fee mismatch, or reconciliation summary..."
            className="flex-1 px-4 py-3 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="px-5 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/20 disabled:opacity-50 flex items-center gap-2"
          >
            <span>Send Query</span>
            <Send className="w-3.5 h-3.5" />
          </button>
        </form>
      </div>
    </div>
  );
}

export default function CopilotPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs text-slate-400">Loading AI Finance Copilot...</div>}>
      <CopilotChatContent />
    </Suspense>
  );
}

// Custom Markdown message parser component matching ChatGPT design aesthetics
function MarkdownMessage({ text }: { text: string }) {
  const lines = text.split('\n');

  return (
    <div className="space-y-2 text-xs leading-relaxed text-slate-200">
      {lines.map((line, idx) => {
        const trimmed = line.trim();

        // 1. Headers (### or #### or standard bold titles)
        if (trimmed.startsWith('### ') || trimmed.startsWith('#### ')) {
          const title = trimmed.replace(/^#+\s+/, '');
          return (
            <h4 key={idx} className="text-xs font-bold text-white mt-4 mb-2 flex items-center gap-1.5 border-b border-slate-800/40 pb-1.5 uppercase tracking-wide">
              {parseBoldText(title)}
            </h4>
          );
        }

        // 2. Horizontal divider
        if (trimmed === '---') {
          return <hr key={idx} className="border-slate-800/60 my-4" />;
        }

        // 3. Bullets / List items
        if (trimmed.startsWith('* ') || trimmed.startsWith('- ')) {
          const content = trimmed.substring(2);
          return (
            <div key={idx} className="flex items-start gap-2.5 pl-2 my-1">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-1.5 flex-shrink-0" />
              <span className="text-slate-350">{parseBoldText(content)}</span>
            </div>
          );
        }

        // 4. Callouts/Blockquotes
        if (trimmed.startsWith('> ')) {
          const content = trimmed.substring(2);
          return (
            <blockquote key={idx} className="p-3 my-2.5 rounded-xl bg-indigo-950/20 border-l-4 border-indigo-500 text-[11px] text-indigo-200/90 leading-relaxed italic">
              {parseBoldText(content)}
            </blockquote>
          );
        }

        // 5. Empty lines
        if (trimmed === '') {
          return <div key={idx} className="h-2.5" />;
        }

        // 6. Normal paragraph text
        return (
          <p key={idx} className="text-slate-350 my-1">
            {parseBoldText(line)}
          </p>
        );
      })}
    </div>
  );
}

// Utility to match and replace bold formatting (**bold**) and inline code (`code`)
function parseBoldText(text: string) {
  // Split using capturing parentheses to keep matched parts
  const parts = text.split(/(\*\*.*?\*\*|`.*?`|\[✓\]|\[X\]|❌|✓|\\checkmark)/gi);

  return parts.map((part, idx) => {
    // Bold
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={idx} className="font-extrabold text-white">
          {part.slice(2, -2)}
        </strong>
      );
    }
    // Code blocks
    if (part.startsWith('`') && part.endsWith('`')) {
      return (
        <code key={idx} className="px-1.5 py-0.5 rounded bg-slate-950 border border-slate-800 text-[10px] font-mono text-indigo-300 mx-0.5">
          {part.slice(1, -1)}
        </code>
      );
    }
    // Glowing validation tags
    if (part === '[✓]' || part === '✓' || part === '\\checkmark') {
      return (
        <span key={idx} className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-emerald-500/20 text-emerald-400 text-[9px] font-bold border border-emerald-500/30 mr-1 shadow-[0_0_6px_rgba(16,185,129,0.2)]">
          ✓
        </span>
      );
    }
    if (part === '[X]' || part === '❌') {
      return (
        <span key={idx} className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-rose-500/20 text-rose-400 text-[9px] font-bold border border-rose-500/30 mr-1 shadow-[0_0_6px_rgba(244,63,94,0.2)]">
          ✗
        </span>
      );
    }

    return part;
  });
}
