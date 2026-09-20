"use client";

import React from "react";
import { Header } from "@/components/layout/header";
import { Sidebar } from "@/components/layout/sidebar";
import { AgentTerminal } from "@/components/chat/agent-terminal";
import { ArchitectureCanvas } from "@/components/architecture/architecture-canvas";
import { CDKInspector } from "@/components/architecture/cdk-inspector";
import { useSessionDetails } from "@/hooks/use-sessions";
import { useStudioStore } from "@/lib/store";

export default function StudioPage() {
  const activeSessionId = useStudioStore((state) => state.activeSessionId);
  const activeTab = useStudioStore((state) => state.activeTab);
  const setActiveTab = useStudioStore((state) => state.setActiveTab);
  const selectedArchVersionId = useStudioStore(
    (state) => state.selectedArchVersionId
  );

  const {
    messages,
    isLoadingMessages,
    archVersions,
    isLoadingArchVersions,
  } = useSessionDetails(activeSessionId);

  const currentVersion =
    archVersions.find((v) => v.id === selectedArchVersionId) ||
    archVersions[archVersions.length - 1];

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-void">
      {/* Top Application Bar */}
      <Header />

      {/* Main Workspace Body */}
      <div className="flex-1 flex min-h-0 overflow-hidden relative">
        {/* Navigation & Session Drawer */}
        <Sidebar />

        {/* Dual-Pane Studio Grid */}
        <main className="flex-1 flex flex-col md:flex-row min-w-0 h-full p-3 md:p-4 gap-3 md:gap-4 overflow-hidden bg-grid-pattern">
          {/* Left Column: Natural Language Agent Terminal */}
          <div className="flex-1 flex flex-col min-w-0 h-full min-h-[350px]">
            <AgentTerminal
              messages={messages}
              sessionId={activeSessionId}
              isLoading={isLoadingMessages}
            />
          </div>

          {/* Right Column: Live Architecture Canvas OR CDK Inspector */}
          <div className="flex-1 flex flex-col min-w-0 h-full min-h-[350px]">
            {/* Mobile Tab Switcher */}
            <div className="flex md:hidden items-center justify-center gap-2 mb-2">
              <button
                onClick={() => setActiveTab("canvas")}
                className={`px-3 py-1 rounded-full text-xs font-mono ${
                  activeTab === "canvas"
                    ? "bg-btc text-void font-bold"
                    : "bg-darkmatter text-stardust"
                }`}
              >
                Architecture Canvas
              </button>
              <button
                onClick={() => setActiveTab("cdk")}
                className={`px-3 py-1 rounded-full text-xs font-mono ${
                  activeTab === "cdk"
                    ? "bg-btc text-void font-bold"
                    : "bg-darkmatter text-stardust"
                }`}
              >
                CDK Inspector
              </button>
            </div>

            {activeTab === "canvas" ? (
              <ArchitectureCanvas
                archVersions={archVersions}
                isLoading={isLoadingArchVersions}
              />
            ) : (
              <CDKInspector currentArchVersion={currentVersion} />
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
