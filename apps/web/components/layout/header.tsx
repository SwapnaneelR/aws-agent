"use client";

import React, { useEffect, useState } from "react";
import {
  Activity,
  Layers,
  FileCode,
  Menu,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api-client";
import { useStudioStore } from "@/lib/store";

export function Header() {
  const [apiOnline, setApiOnline] = useState<boolean | null>(null);

  const activeTab = useStudioStore((state) => state.activeTab);
  const setActiveTab = useStudioStore((state) => state.setActiveTab);
  const isDemoMode = useStudioStore((state) => state.isDemoMode);
  const setIsDemoMode = useStudioStore((state) => state.setIsDemoMode);
  const toggleSidebar = useStudioStore((state) => state.toggleSidebar);

  // Periodic health check
  useEffect(() => {
    let isMounted = true;
    async function check() {
      try {
        await api.checkHealth();
        if (isMounted) setApiOnline(true);
      } catch {
        if (isMounted) setApiOnline(false);
      }
    }

    check();
    const interval = setInterval(check, 15000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  return (
    <header className="h-16 px-4 md:px-6 bg-darkmatter/90 border-b border-white/10 backdrop-blur-md flex items-center justify-between z-30 shrink-0">
      {/* Brand & Emblem with Spinning Orbital Rings */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={toggleSidebar}
          className="text-stardust hover:text-white"
        >
          <Menu className="size-4" />
        </Button>

        {/* 3D-Style Spinning Orbital Rings Emblem */}
        <div className="relative size-9 flex items-center justify-center">
          {/* Outer Ring */}
          <div className="absolute inset-0 rounded-full border border-btc/40 animate-[spin_10s_linear_infinite]" />
          {/* Inner Ring (Reverse Direction) */}
          <div className="absolute inset-1 rounded-full border border-gold/50 animate-[spin_15s_linear_infinite_reverse]" />
          {/* Glowing Core */}
          <div className="size-4 rounded-full bg-gradient-to-r from-burnt to-btc shadow-glow-orange flex items-center justify-center">
            <span className="text-[9px] font-mono font-bold text-void">FH</span>
          </div>
        </div>

        {/* Title */}
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-heading font-bold text-base tracking-wider text-purelight">
              FOUR HORSEMEN
            </h1>
            <span className="hidden sm:inline-block text-[10px] font-mono text-stardust/60 px-1.5 py-0.5 rounded border border-white/5 bg-void">
              v1.0
            </span>
          </div>
          <div className="text-[10px] font-mono tracking-widest text-btc-gradient uppercase font-semibold">
            AWS Architecture Agent
          </div>
        </div>
      </div>

      {/* Center Studio View Switcher */}
      <div className="hidden md:flex items-center bg-void/80 p-1 rounded-full border border-white/10 shadow-inner">
        <button
          onClick={() => setActiveTab("canvas")}
          className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-heading font-semibold uppercase tracking-wider transition-all duration-300 ${
            activeTab === "canvas"
              ? "bg-gradient-to-r from-burnt to-btc text-white shadow-glow-orange"
              : "text-stardust hover:text-white"
          }`}
        >
          <Layers className="size-3.5" />
          <span>Architecture Canvas</span>
        </button>
        <button
          onClick={() => setActiveTab("cdk")}
          className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-heading font-semibold uppercase tracking-wider transition-all duration-300 ${
            activeTab === "cdk"
              ? "bg-gradient-to-r from-burnt to-btc text-white shadow-glow-orange"
              : "text-stardust hover:text-white"
          }`}
        >
          <FileCode className="size-3.5" />
          <span>CDK Inspector</span>
        </button>
      </div>

      {/* Right Controls: Health & Demo Mode */}
      <div className="flex items-center gap-3">
        {/* Backend API status */}
        <div className="hidden sm:flex items-center gap-2 px-2.5 py-1 rounded-full bg-void border border-white/5 text-[11px] font-mono">
          <Activity className="size-3 text-stardust" />
          <span className="text-stardust">API :8000</span>
          {apiOnline ? (
            <span className="flex items-center gap-1 text-emerald-400">
              <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Live
            </span>
          ) : (
            <span className="flex items-center gap-1 text-stardust/60">
              <span className="size-1.5 rounded-full bg-amber-400" />
              Offline
            </span>
          )}
        </div>

        {/* Demo Mode Toggle */}
        <button
          onClick={() => setIsDemoMode(!isDemoMode)}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-mono transition-all border ${
            isDemoMode
              ? "bg-btc/10 border-btc/40 text-btc shadow-[0_0_12px_rgba(247,147,26,0.2)]"
              : "bg-void border-white/10 text-stardust hover:text-white"
          }`}
          title="Toggle between Live API and Interactive Demo Mode"
        >
          <Sparkles className="size-3 text-gold" />
          <span className="hidden sm:inline">
            {isDemoMode ? "Demo Mode: Active" : "Live API Mode"}
          </span>
          <span className="sm:hidden">{isDemoMode ? "Demo" : "Live"}</span>
        </button>
      </div>
    </header>
  );
}
