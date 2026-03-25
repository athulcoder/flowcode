// app/page.jsx
"use client";

import { useState, useRef, useEffect } from "react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";

export default function Home() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const chatEndRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const sendMessage = async () => {
    if (!input) return;

    const newMessages = [...messages, { role: "user", content: input }];
    setMessages(newMessages);
    setInput("");
    setLoading(true);

    const res = await fetch("/api/ai", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: input }),
    });

    const data = await res.json();

    setMessages([
      ...newMessages,
      { role: "assistant", content: data.response },
    ]);

    setLoading(false);
  };

  const formatResponse = (text) => {
    const parts = text.split(/```/);

    return parts.map((part, i) => {
      if (i % 2 === 1) {
        const [lang, ...codeArr] = part.split("\n");
        const code = codeArr.join("\n");

        return (
          <div key={i} className="relative my-4 group">
            <button
              onClick={() => navigator.clipboard.writeText(code)}
              className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition text-xs bg-green-500 px-2 py-1 rounded-md z-10"
            >
              Copy
            </button>

            <SyntaxHighlighter
              language={lang || "javascript"}
              style={oneDark}
              customStyle={{
                borderRadius: "12px",
                fontSize: "13px",
                padding: "16px",
                background: "#0d1117",
              }}
            >
              {code}
            </SyntaxHighlighter>
          </div>
        );
      }

      return (
        <div key={i} className="space-y-2">
          {part.split("\n").map((line, idx) => (
            <p key={idx} className="text-gray-300 text-sm leading-relaxed">
              {line}
            </p>
          ))}
        </div>
      );
    });
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-gray-900 text-white">
      {/* Sidebar */}
      <div className="w-64 bg-gray-950 border-r border-gray-800 p-4 hidden md:flex flex-col">
        <h1 className="text-2xl font-bold text-green-400 mb-6">FlowCode</h1>
        <button className="w-full bg-green-600 hover:bg-green-700 py-2 rounded-lg transition">
          + New Chat
        </button>
      </div>

      {/* Main */}
      <div className="flex flex-col flex-1 h-full">
        {/* Chat */}
        <div className="flex-1 overflow-y-auto px-4 md:px-10 py-6 space-y-6">
          {messages.map((msg, index) => (
            <div key={index} className="animate-fadeIn">
              <div className={`text-xs mb-1 ${msg.role === "user" ? "text-blue-400" : "text-green-400"}`}>
                {msg.role === "user" ? "You" : "FlowCode"}
              </div>

              <div className={`max-w-3xl ${msg.role === "user" ? "ml-auto" : "mr-auto"}`}>
                <div className="bg-gray-950 p-4 rounded-2xl border border-gray-800 shadow-md">
                  {msg.role === "assistant"
                    ? formatResponse(msg.content)
                    : <p className="text-sm">{msg.content}</p>}
                </div>
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex items-center gap-2 text-gray-400 animate-pulse">
              <div className="w-2 h-2 bg-green-400 rounded-full"></div>
              <div className="w-2 h-2 bg-green-400 rounded-full"></div>
              <div className="w-2 h-2 bg-green-400 rounded-full"></div>
              <span className="ml-2 text-sm">FlowCode is thinking...</span>
            </div>
          )}

          <div ref={chatEndRef} />
        </div>

        {/* Input */}
        <div className="p-4 border-t border-gray-800 bg-gray-950">
          <div className="flex gap-3 max-w-4xl mx-auto">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendMessage()}
              placeholder="Ask FlowCode to build something..."
              className="flex-1 p-3 rounded-xl bg-gray-900 border border-gray-700 focus:outline-none focus:ring-2 focus:ring-green-500"
            />
            <button
              onClick={sendMessage}
              className="bg-green-600 hover:bg-green-700 px-6 rounded-xl transition active:scale-95"
            >
              Send
            </button>
          </div>
        </div>
      </div>

      <style jsx>{`
        .animate-fadeIn {
          animation: fadeIn 0.4s ease-in-out;
        }

        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

// app/api/ai/route.js
export async function POST(req) {
  const { prompt } = await req.json();

  const res = await fetch("http://localhost:11434/api/generate", {
    method: "POST",
    body: JSON.stringify({
      model: "deepseek-coder",
      prompt: `You are FlowCode, an expert AI developer. Structure responses with clear headings, explanations, and clean code blocks.\n${prompt}`,
      stream: false,
    }),
  });

  const data = await res.json();

  return Response.json({ response: data.response });
}
