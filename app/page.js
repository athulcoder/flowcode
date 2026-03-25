"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Bot, User, Copy, Check, Sparkles, MessageSquare, Plus, RefreshCw, StopCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";

export default function Home() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [abortController, setAbortController] = useState(null);
  const chatEndRef = useRef(null);
  const textareaRef = useRef(null);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [input]);

  // Scroll to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const stopGeneration = () => {
    if (abortController) {
      abortController.abort();
      setAbortController(null);
      setLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    const currentInput = input.trim();
    setInput("");
    
    // Reset textarea height immediately
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }

    const newMessages = [...messages, { role: "user", content: currentInput }];
    setMessages(newMessages);
    setLoading(true);

    const controller = new AbortController();
    setAbortController(controller);

    // Create a placeholder for the assistant's response
    setMessages([...newMessages, { role: "assistant", content: "", isThinking: true }]);

    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: currentInput }),
        signal: controller.signal,
      });

      if (!res.ok) throw new Error("Network response was not ok");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let done = false;
      let assistantContent = "";
      let buffer = "";

      while (!done) {
        const { value, done: doneReading } = await reader.read();
        done = doneReading;
        if (value) {
          buffer += decoder.decode(value, { stream: true });
          
          let boundary = buffer.indexOf('\n');
          while (boundary !== -1) {
            const line = buffer.substring(0, boundary).trim();
            buffer = buffer.substring(boundary + 1);
            
            if (line) {
              try {
                const parsed = JSON.parse(line);
                if (parsed.response) {
                  assistantContent += parsed.response;
                  setMessages((prev) => {
                    const updated = [...prev];
                    const lastMessage = updated[updated.length - 1];
                    if (lastMessage.role === "assistant") {
                      lastMessage.content = assistantContent;
                      lastMessage.isThinking = false;
                    }
                    return updated;
                  });
                }
              } catch (e) {
                console.error("Error parsing stream chunk", e, line);
              }
            }
            boundary = buffer.indexOf('\n');
          }
        }
      }
    } catch (error) {
      if (error.name === "AbortError") {
        console.log("Generation stopped");
      } else {
        console.error("Fetch error:", error);
        setMessages((prev) => [
          ...prev.slice(0, -1),
          { role: "assistant", content: "**Error:** Failed to connect to the AI service. Is Ollama running?", isError: true }
        ]);
      }
    } finally {
      setLoading(false);
      setAbortController(null);
      setMessages((prev) => {
        const updated = [...prev];
        const lastMessage = updated[updated.length - 1];
        if (lastMessage && lastMessage.role === "assistant") {
          lastMessage.isThinking = false;
        }
        return updated;
      });
    }
  };

  const clearChat = () => {
    setMessages([]);
    stopGeneration();
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="flex justify-center h-screen w-screen overflow-hidden bg-[#0A0A0A] text-gray-100 font-sans selection:bg-emerald-500/30">
      {/* Sidebar - Premium frosted glass look */}
      <div className="w-[280px] bg-[#111111]/80 backdrop-blur-xl border-r border-[#222] p-4 hidden md:flex flex-col z-10 shadow-2xl">
        <div className="flex items-center gap-3 mb-8 px-2 mt-2">
          <div className="bg-gradient-to-br from-green-400 to-emerald-600 p-2 rounded-xl shadow-lg shadow-green-500/20">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-green-300 to-emerald-500">
            FlowCode
          </h1>
        </div>

        <button 
          onClick={clearChat}
          className="flex items-center justify-center gap-2 w-full bg-[#1A1A1A] hover:bg-[#222] border border-[#333] hover:border-emerald-500/50 text-gray-200 py-3 px-4 rounded-xl transition-all duration-300 group shadow-sm"
        >
          <Plus className="w-5 h-5 text-emerald-500 group-hover:scale-110 transition-transform" />
          <span className="font-medium text-sm">New Chat</span>
        </button>

        <div className="mt-8 flex-1 overflow-y-auto w-full">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 px-2">Recent</p>
          <div className="space-y-1">
            <button className="flex items-center justify-start gap-3 w-full text-left px-3 py-2.5 rounded-lg text-gray-400 hover:text-gray-200 hover:bg-[#222] transition-colors group">
              <MessageSquare className="w-4 h-4 opacity-50 group-hover:opacity-100" />
              <span className="text-sm truncate">React Architecture Guide</span>
            </button>
            <button className="flex items-center justify-start gap-3 w-full text-left px-3 py-2.5 rounded-lg text-gray-400 hover:text-gray-200 hover:bg-[#222] transition-colors group">
              <MessageSquare className="w-4 h-4 opacity-50 group-hover:opacity-100" />
              <span className="text-sm truncate">Python Script Setup</span>
            </button>
          </div>
        </div>
        
        <div className="mt-auto pt-4 border-t border-[#222] px-2 flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gray-700 to-gray-600 flex items-center justify-center">
            <User className="w-4 h-4 text-gray-300" />
          </div>
          <span className="text-sm font-medium text-gray-300">Developer</span>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex flex-col flex-1 h-full relative max-w-full">
        {/* Mobile Header */}
        <div className="md:hidden flex items-center gap-3 p-4 border-b border-[#222] bg-[#111] absolute top-0 w-full z-20">
          <div className="bg-gradient-to-br from-green-400 to-emerald-600 p-1.5 rounded-lg shadow-md">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <h1 className="text-lg font-bold text-gray-100">FlowCode</h1>
        </div>

        {/* Chat Area */}
        <div className="flex-1 overflow-y-auto pt-20 md:pt-0 scroll-smooth pb-32">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center px-4 w-full">
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, ease: "easeOut" }}
                className="text-center w-full max-w-2xl mx-auto flex flex-col items-center justify-center p-6"
              >
                <div className="bg-gradient-to-br from-[#1A1A1A] to-[#222] p-6 rounded-3xl inline-block mb-6 shadow-2xl border border-[#333]">
                  <Sparkles className="w-12 h-12 text-emerald-500 mx-auto" strokeWidth={1.5} />
                </div>
                <h2 className="text-3xl md:text-4xl font-bold mb-3 text-transparent bg-clip-text bg-gradient-to-r from-gray-100 to-gray-400 text-center">
                  How can I help you code today?
                </h2>
                <p className="text-gray-500 text-lg max-w-md mx-auto text-center">
                  Ask me to build components, debug errors, or explain architecture.
                </p>
              </motion.div>
            </div>
          ) : (
            <div className="max-w-4xl mx-auto w-full px-4 md:px-8 py-8 space-y-8">
              <AnimatePresence>
                {messages.map((msg, index) => (
                  <motion.div 
                    key={index}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, ease: "easeOut" }}
                    className={`flex gap-4 md:gap-6 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}
                  >
                    {/* Avatar */}
                    <div className="flex-shrink-0 mt-1">
                      {msg.role === "user" ? (
                        <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-gradient-to-br from-gray-700 to-gray-600 flex items-center justify-center shadow-lg border border-gray-600">
                          <User className="w-5 h-5 text-gray-200" />
                        </div>
                      ) : (
                        <div className="w-8 h-8 md:w-10 md:h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-green-700 flex items-center justify-center shadow-lg shadow-emerald-500/20 border border-emerald-500/50">
                          <Bot className="w-5 h-5 text-white" />
                        </div>
                      )}
                    </div>

                    {/* Message Bubble (Added min-w-0 to prevent flex children from stretching the layout!) */}
                    <div className={`${msg.role === "user" ? "max-w-[85%] md:max-w-[75%] items-end" : "max-w-full w-full items-start"} flex flex-col min-w-0`}>
                      <span className="text-xs text-gray-500 mb-1.5 font-medium px-1">
                        {msg.role === "user" ? "You" : "FlowCode"}
                      </span>
                      
                      <div className={`relative px-5 py-4 rounded-2xl md:rounded-3xl shadow-sm overflow-hidden ${
                        msg.role === "user" 
                          ? "bg-[#252525] border border-[#333] text-gray-100 rounded-tr-sm" 
                          : "bg-transparent text-gray-200"
                      }`}>
                        {msg.isThinking ? (
                          <div className="flex items-center gap-3 text-emerald-500 py-2">
                            <RefreshCw className="w-5 h-5 animate-spin" />
                            <span className="font-medium text-sm animate-pulse">Thinking deeply...</span>
                          </div>
                        ) : msg.role === "assistant" ? (
                          <div className="w-full break-words min-w-0">
                            <ReactMarkdown
                              remarkPlugins={[remarkGfm]}
                              components={{
                                code({node, inline, className, children, ...props}) {
                                  const match = /language-(\w+)/.exec(className || '')
                                  // This inner component extracts copy logic cleanly
                                  const CodeBlock = () => {
                                    const [copied, setCopied] = useState(false);
                                    const codeContent = String(children).replace(/\n$/, '');
                                    const handleCopy = () => {
                                      navigator.clipboard.writeText(codeContent);
                                      setCopied(true);
                                      setTimeout(() => setCopied(false), 2000);
                                    };
                                    
                                    return (
                                      <div className="relative group rounded-xl overflow-hidden my-6 border border-[#333] bg-[#0d1117] shadow-lg">
                                        <div className="flex items-center justify-between px-4 py-2 bg-[#1A1A1A] border-b border-[#333]">
                                          <span className="text-xs font-mono text-gray-400 capitalize">{match[1]}</span>
                                          <button 
                                            onClick={handleCopy}
                                            className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-200 transition-colors bg-[#252525] hover:bg-[#333] px-2.5 py-1.5 rounded-lg"
                                          >
                                            {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                                            {copied ? "Copied" : "Copy"}
                                          </button>
                                        </div>
                                        <div className="p-4 text-[13px] md:text-[14px] overflow-x-auto custom-scrollbar w-full">
                                          <SyntaxHighlighter
                                            {...props}
                                            style={vscDarkPlus}
                                            language={match[1]}
                                            customStyle={{ margin: 0, padding: 0, background: 'transparent' }}
                                          >
                                            {codeContent}
                                          </SyntaxHighlighter>
                                        </div>
                                      </div>
                                    );
                                  };

                                  return !inline && match ? <CodeBlock /> : (
                                    <code {...props} className="bg-[#222] text-emerald-400 px-1.5 py-0.5 rounded-md font-mono text-[0.9em] border border-[#333]">
                                      {children}
                                    </code>
                                  )
                                },
                                p: ({node, ...props}) => <p className="mb-4 leading-relaxed text-[15px] opacity-90 last:mb-0 break-words w-full" {...props} />,
                                a: ({node, ...props}) => <a className="text-emerald-400 hover:text-emerald-300 underline underline-offset-4 decoration-emerald-500/30 transition-colors" {...props} />,
                                ul: ({node, ...props}) => <ul className="list-disc pl-6 mb-4 space-y-2 text-[15px] opacity-90 marker:text-emerald-500" {...props} />,
                                ol: ({node, ...props}) => <ol className="list-decimal pl-6 mb-4 space-y-2 text-[15px] opacity-90 marker:text-emerald-500" {...props} />,
                                li: ({node, ...props}) => <li className="pl-1" {...props} />,
                                h1: ({node, ...props}) => <h1 className="text-2xl font-bold mt-8 mb-4 text-gray-100" {...props} />,
                                h2: ({node, ...props}) => <h2 className="text-xl font-bold mt-6 mb-3 text-gray-100 flex items-center gap-2 before:content-[''] before:w-1.5 before:h-6 before:bg-emerald-500 before:rounded-full" {...props} />,
                                h3: ({node, ...props}) => <h3 className="text-lg font-bold mt-5 mb-2 text-gray-200" {...props} />,
                                blockquote: ({node, ...props}) => <blockquote className="border-l-4 border-emerald-500/50 pl-4 py-1 italic bg-[#1A1A1A] rounded-r-lg my-5" {...props} />,
                                table: ({node, ...props}) => <div className="overflow-x-auto mb-6 rounded-xl border border-[#333] shadow-md w-full"><table className="text-left text-sm whitespace-nowrap min-w-full" {...props} /></div>,
                                th: ({node, ...props}) => <th className="bg-[#1A1A1A] p-3 border-b border-[#333] font-semibold text-gray-300" {...props} />,
                                td: ({node, ...props}) => <td className="p-3 border-b border-[#222] text-gray-400 bg-[#111]" {...props} />,
                              }}
                            >
                              {msg.content}
                            </ReactMarkdown>
                          </div>
                        ) : (
                          <div className="text-[15px] leading-relaxed whitespace-pre-wrap break-words">
                            {msg.content}
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
              <div ref={chatEndRef} className="h-4" />
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="absolute bottom-0 w-full bg-gradient-to-t from-[#0A0A0A] via-[#0A0A0A] to-transparent pt-10 pb-6 px-4 md:px-8 z-20 pointer-events-none">
          <div className="max-w-4xl mx-auto relative group pointer-events-auto">
            <div className="absolute -inset-1 bg-gradient-to-r from-emerald-500/20 to-green-500/20 rounded-3xl blur-md group-focus-within:opacity-100 opacity-50 transition duration-500"></div>
            <div className="relative flex items-end gap-3 bg-[#1A1A1A] border border-[#333] focus-within:border-emerald-500/50 rounded-2xl md:rounded-3xl p-2 md:p-3 shadow-2xl transition-all duration-300 w-full mx-auto">
              
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask FlowCode anything..."
                className="flex-1 max-h-48 min-h-[44px] p-3 text-sm md:text-base bg-transparent border-none outline-none resize-none text-gray-100 placeholder-gray-500 custom-scrollbar leading-relaxed w-full"
                rows={1}
              />
              
              {loading ? (
                <button
                  onClick={stopGeneration}
                  className="flex-shrink-0 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white p-3 md:p-3.5 rounded-xl md:rounded-2xl transition-all duration-300 mb-0.5"
                  title="Stop generation"
                >
                  <StopCircle className="w-5 h-5 md:w-6 md:h-6" />
                </button>
              ) : (
                <button
                  onClick={sendMessage}
                  disabled={!input.trim()}
                  className="flex-shrink-0 bg-emerald-600 hover:bg-emerald-500 disabled:bg-[#333] disabled:text-gray-500 text-white p-3 md:p-3.5 rounded-xl md:rounded-2xl transition-all duration-300 disabled:opacity-50 mb-0.5 shadow-lg group-hover:shadow-emerald-500/25 flex items-center justify-center"
                >
                  <Send className={`w-5 h-5 md:w-6 md:h-6 ${input.trim() ? "translate-x-0.5 -translate-y-0.5" : ""} transition-transform`} />
                </button>
              )}
            </div>
            <div className="flex w-full items-center justify-center mt-3 text-xs text-gray-500 font-medium">
              FlowCode can make mistakes. Consider verifying important information.
            </div>
          </div>
        </div>
      </div>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
          height: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #333;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #555;
        }
        ::-webkit-scrollbar {
          width: 8px;
        }
        ::-webkit-scrollbar-track {
          background: #0A0A0A;
        }
        ::-webkit-scrollbar-thumb {
          background: #222;
          border-radius: 4px;
        }
        ::-webkit-scrollbar-thumb:hover {
          background: #333;
        }
        /* Prose overrides for better specific fit */
        .prose pre {
          background-color: transparent !important;
          margin: 0 !important;
          padding: 0 !important;
        }
      `}</style>
    </div>
  );
}
