"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  Send,
  Terminal,
  Cpu,
  Bot,
  User,
  Sparkles,
  Zap,
  Wrench,
  AlertCircle,
  StopCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAgentStream } from "@/hooks/use-agent-stream";
import { useStudioStore } from "@/lib/store";
import { Message } from "@/lib/types";

interface AgentTerminalProps {
  messages: Message[];
  sessionId: string | null;
  isLoading?: boolean;
}

const SUGGESTIONS = [
  "Add Redis ElastiCache cluster for sub-millisecond balance queries",
  "Attach an SQS FIFO dead-letter queue to buffer spikes",
  "Enable AWS WAF with rate limiting rules against DDoS attacks",
  "Add a CloudFront CDN distribution with SSL certificate",
];

export function AgentTerminal({
  messages,
  sessionId,
  isLoading = false,
}: AgentTerminalProps) {
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const useOpusModel = useStudioStore((state) => state.useOpusModel);
  const setUseOpusModel = useStudioStore((state) => state.setUseOpusModel);

  const {
    sendMessage,
    stopStream,
    isStreaming,
    streamingMessage,
    activeTools,
    streamError,
  } = useAgentStream(sessionId);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, streamingMessage, activeTools]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isStreaming) return;
    const text = input;
    setInput("");
    await sendMessage(text);
  };

  const handleSuggestionClick = (suggestion: string) => {
    if (isStreaming) return;
    sendMessage(suggestion);
  };

  return (
    <div className="flex flex-col h-full bg-darkmatter rounded-2xl border border-white/10 overflow-hidden shadow-card-glow relative">
      {/* Terminal Title Bar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-void/70">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-btc animate-pulse" />
            <span className="font-heading font-semibold text-sm text-white tracking-wide">
              Strands Agent Terminal
            </span>
          </div>
          <Badge
            variant={useOpusModel ? "gold" : "default"}
            pulse={isStreaming}
            className="text-[10px]"
          >
            {useOpusModel ? "Claude 3.8 Opus Escalation" : "Claude 3.5 Sonnet"}
          </Badge>
        </div>

        {/* Model Escalation Switch */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setUseOpusModel(!useOpusModel)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-mono transition-all border ${
              useOpusModel
                ? "bg-gold/10 text-gold border-gold/40 shadow-glow-gold"
                : "bg-void/60 text-stardust border-white/10 hover:text-white"
            }`}
            title="Toggle Opus model escalation for complex architectures"
          >
            <Zap className="size-3 text-gold" />
            <span>Opus Boost</span>
          </button>
        </div>
      </div>

      {/* Message Feed */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-48 space-y-2">
            <div className="w-6 h-6 border-2 border-btc border-t-transparent rounded-full animate-spin" />
            <span className="text-xs font-mono text-stardust">
              Syncing session logs...
            </span>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center p-6 border border-dashed border-white/10 rounded-xl">
            <div className="p-3 rounded-full bg-btc/10 border border-btc/30 mb-3 shadow-glow-orange">
              <Bot className="size-6 text-btc" />
            </div>
            <h4 className="font-heading font-semibold text-base text-white mb-1">
              Start Designing on AWS
            </h4>
            <p className="text-xs text-stardust font-mono max-w-xs mb-4">
              Describe your architecture requirements below. The agent will design the topology, produce CDK code, and deploy to your sandbox.
            </p>
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex flex-col ${
                msg.role === "user" ? "items-end" : "items-start"
              }`}
            >
              <div
                className={`max-w-[88%] rounded-2xl p-4 transition-all duration-300 relative ${
                  msg.role === "user"
                    ? "bg-btc/10 border border-btc/30 text-white rounded-br-none shadow-[0_0_20px_-5px_rgba(247,147,26,0.15)]"
                    : "bg-void/80 border border-white/10 text-stardust rounded-bl-none shadow-card-glow"
                }`}
              >
                {/* Header Tag */}
                <div className="flex items-center gap-2 mb-2 pb-1.5 border-b border-white/5 text-[10px] font-mono">
                  {msg.role === "user" ? (
                    <>
                      <User className="size-3 text-btc" />
                      <span className="text-btc font-semibold">ARCHITECT</span>
                    </>
                  ) : (
                    <>
                      <Bot className="size-3 text-gold" />
                      <span className="text-gold font-semibold">FOUR HORSEMEN</span>
                    </>
                  )}
                  <span className="text-stardust/40">
                    {new Date(msg.created_at).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>

                {/* Content */}
                <div className="text-xs font-mono leading-relaxed whitespace-pre-wrap text-purelight selection:bg-btc/30">
                  {msg.content}
                </div>

                {/* Tool Badges executed during this turn */}
                {msg.toolCalls && msg.toolCalls.length > 0 && (
                  <div className="mt-3 pt-2 border-t border-white/5 flex flex-wrap gap-1.5">
                    {msg.toolCalls.map((tool, idx) => (
                      <Badge
                        key={idx}
                        variant="secondary"
                        className="text-[10px] bg-white/5 border border-white/10 text-btc flex items-center gap-1"
                      >
                        <Wrench className="size-2.5" />
                        <span>{tool}</span>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))
        )}

        {/* Live Streaming Message Box */}
        {isStreaming && (
          <div className="flex flex-col items-start">
            <div className="max-w-[88%] rounded-2xl rounded-bl-none p-4 bg-void border border-btc/40 text-stardust shadow-glow-orange-lg animate-pulse-glow">
              <div className="flex items-center justify-between gap-2 mb-2 pb-1.5 border-b border-white/10 text-[10px] font-mono">
                <div className="flex items-center gap-2">
                  <Bot className="size-3 text-btc" />
                  <span className="text-btc font-semibold">AGENT SYNTHESIZING...</span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={stopStream}
                  className="h-5 px-1.5 text-[10px] text-red-400 hover:bg-red-500/10"
                >
                  <StopCircle className="size-3 mr-1" /> Stop
                </Button>
              </div>

              {/* Streaming Tools Fired */}
              {activeTools.length > 0 && (
                <div className="mb-3 flex flex-wrap gap-1.5">
                  {activeTools.map((tool, i) => (
                    <Badge
                      key={i}
                      variant="default"
                      className="text-[10px] bg-burnt/20 border-burnt text-amber-300 animate-pulse flex items-center gap-1"
                    >
                      <Cpu className="size-2.5" />
                      <span>{tool}</span>
                    </Badge>
                  ))}
                </div>
              )}

              {/* Streaming Text */}
              <div className="text-xs font-mono leading-relaxed whitespace-pre-wrap text-white">
                {streamingMessage || "Analyzing cloud constraints and synthesizing topologies..."}
                <span className="inline-block w-2 h-4 ml-1 bg-btc align-middle animate-pulse" />
              </div>
            </div>
          </div>
        )}

        {/* Stream Error Alert */}
        {streamError && (
          <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-xs font-mono flex items-center gap-2">
            <AlertCircle className="size-4 shrink-0" />
            <span>{streamError}</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Quick Prompts */}
      <div className="px-4 py-2 border-t border-white/5 bg-void/40 flex items-center gap-2 overflow-x-auto no-scrollbar">
        <Sparkles className="size-3 text-gold shrink-0" />
        {SUGGESTIONS.map((suggestion, i) => (
          <button
            key={i}
            type="button"
            onClick={() => handleSuggestionClick(suggestion)}
            disabled={isStreaming}
            className="text-[10px] font-mono text-stardust hover:text-white bg-white/5 hover:bg-btc/10 border border-white/5 hover:border-btc/30 px-2.5 py-1 rounded-full whitespace-nowrap transition-colors"
          >
            {suggestion}
          </button>
        ))}
      </div>

      {/* Input Dock */}
      <form
        onSubmit={handleSubmit}
        className="p-3 border-t border-white/10 bg-void/90 flex items-center gap-2"
      >
        <div className="relative flex-1">
          <Terminal className="size-4 text-stardust absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={isStreaming}
            placeholder={
              isStreaming
                ? "Agent is executing tools..."
                : "Describe infrastructure or iterate on design (e.g., 'Add multi-AZ Aurora')..."
            }
            className="w-full bg-black/50 border border-white/10 rounded-full pl-9 pr-4 py-2.5 text-xs font-mono text-white placeholder:text-stardust/40 focus:border-btc focus:shadow-input-glow outline-none transition-all"
          />
        </div>

        <Button
          type="submit"
          variant="primary"
          size="sm"
          disabled={!input.trim() || isStreaming}
          className="h-10 px-5 text-xs shrink-0"
        >
          <Send className="size-3.5 mr-1" />
          <span>Send</span>
        </Button>
      </form>
    </div>
  );
}
