"use client";

import React, { useState } from "react";
import {
  Layers,
  Server,
  Database,
  Shield,
  Cloud,
  HardDrive,
  Cpu,
  Radio,
  DollarSign,
  Clock,
  Sparkles,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { useStudioStore } from "@/lib/store";
import { ArchVersion, ArchitectureService } from "@/lib/types";
import { MermaidViewer } from "./mermaid-viewer";

interface ArchitectureCanvasProps {
  archVersions: ArchVersion[];
  isLoading?: boolean;
}

export function ArchitectureCanvas({
  archVersions,
  isLoading = false,
}: ArchitectureCanvasProps) {
  const selectedArchVersionId = useStudioStore(
    (state) => state.selectedArchVersionId
  );
  const setSelectedArchVersion = useStudioStore(
    (state) => state.setSelectedArchVersion
  );

  const [activeTab, setActiveTab] = useState<"diagram" | "inventory" | "spec">(
    "diagram"
  );

  // Active architecture version (or the latest one)
  const currentVersion =
    archVersions.find((v) => v.id === selectedArchVersionId) ||
    archVersions[archVersions.length - 1];

  const spec = currentVersion?.arch_spec_json;
  const services: ArchitectureService[] = spec?.services || [];

  const getServiceIcon = (type: string) => {
    const t = type.toLowerCase();
    if (t.includes("ecs") || t.includes("lambda") || t.includes("compute"))
      return <Cpu className="size-4 text-btc" />;
    if (t.includes("rds") || t.includes("aurora") || t.includes("dynamo"))
      return <Database className="size-4 text-gold" />;
    if (t.includes("s3") || t.includes("storage"))
      return <HardDrive className="size-4 text-amber-400" />;
    if (t.includes("alb") || t.includes("loadbalancing") || t.includes("route53"))
      return <Radio className="size-4 text-orange-400" />;
    if (t.includes("waf") || t.includes("kms") || t.includes("security"))
      return <Shield className="size-4 text-emerald-400" />;
    return <Server className="size-4 text-stardust" />;
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-void/50 border border-white/10 rounded-2xl animate-pulse">
        <Layers className="size-10 text-btc/50 mb-3 animate-spin-slow" />
        <span className="text-xs font-mono text-stardust tracking-wider">
          Retrieving Architecture Specification...
        </span>
      </div>
    );
  }

  if (!currentVersion) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-12 bg-darkmatter/40 border border-white/10 rounded-2xl text-center">
        <div className="size-16 rounded-full bg-btc/10 border border-btc/30 flex items-center justify-center mb-4 shadow-glow-orange">
          <Cloud className="size-8 text-btc" />
        </div>
        <h3 className="font-heading font-semibold text-lg text-white mb-2">
          No Architecture Synthesized Yet
        </h3>
        <p className="text-xs text-stardust font-mono max-w-sm">
          Prompt the Strands agent in the terminal to formulate your AWS infrastructure design and generate topology.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-darkmatter rounded-2xl border border-white/10 overflow-hidden shadow-card-glow relative">
      {/* Top Header: Versions & Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 border-b border-white/10 bg-void/60">
        {/* Version Selector Tabs */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 mr-2">
            <Layers className="size-4 text-btc" />
            <span className="font-heading font-semibold text-sm text-white tracking-wide">
              Topology
            </span>
          </div>

          <div className="flex items-center bg-black/50 p-1 rounded-full border border-white/10">
            {archVersions.map((v) => {
              const isActive = v.id === currentVersion.id;
              return (
                <button
                  key={v.id}
                  onClick={() => setSelectedArchVersion(v.id)}
                  className={`px-3 py-1 rounded-full text-xs font-mono font-medium transition-all ${
                    isActive
                      ? "bg-gradient-to-r from-burnt to-btc text-white shadow-glow-orange"
                      : "text-stardust hover:text-white"
                  }`}
                >
                  v{v.version_num}
                </button>
              );
            })}
          </div>
        </div>

        {/* View Mode Switcher */}
        <div className="flex items-center gap-3">
          {spec?.estimated_cost_tier && (
            <Badge variant="gold" className="hidden sm:inline-flex">
              <DollarSign className="size-3 mr-0.5" />
              {spec.estimated_cost_tier}
            </Badge>
          )}

          <div className="flex items-center bg-black/60 p-0.5 rounded-lg border border-white/10">
            <button
              onClick={() => setActiveTab("diagram")}
              className={`px-3 py-1 rounded-md text-xs font-mono transition-colors ${
                activeTab === "diagram"
                  ? "bg-white/10 text-white font-medium"
                  : "text-stardust hover:text-white"
              }`}
            >
              Diagram
            </button>
            <button
              onClick={() => setActiveTab("inventory")}
              className={`px-3 py-1 rounded-md text-xs font-mono transition-colors ${
                activeTab === "inventory"
                  ? "bg-white/10 text-white font-medium"
                  : "text-stardust hover:text-white"
              }`}
            >
              Services ({services.length})
            </button>
            <button
              onClick={() => setActiveTab("spec")}
              className={`px-3 py-1 rounded-md text-xs font-mono transition-colors ${
                activeTab === "spec"
                  ? "bg-white/10 text-white font-medium"
                  : "text-stardust hover:text-white"
              }`}
            >
              JSON
            </button>
          </div>
        </div>
      </div>

      {/* Main Tab Content */}
      <div className="flex-1 p-4 overflow-hidden flex flex-col min-h-0">
        {activeTab === "diagram" && (
          <MermaidViewer
            chart={currentVersion.mermaid_diagram || "graph TD\nEmpty[No diagram defined]"}
          />
        )}

        {activeTab === "inventory" && (
          <div className="flex-1 overflow-y-auto pr-1 space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {services.map((svc, i) => (
                <Card
                  key={svc.name || i}
                  cornerAccents
                  className="p-4 bg-void/70 hover:border-btc/50 hover:shadow-card-hover transition-all"
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 rounded-lg bg-white/5 border border-white/10">
                        {getServiceIcon(svc.type)}
                      </div>
                      <div>
                        <h4 className="font-heading font-semibold text-sm text-white">
                          {svc.name}
                        </h4>
                        <span className="font-mono text-[10px] text-btc uppercase tracking-wider">
                          AWS {svc.type}
                        </span>
                      </div>
                    </div>
                    <Badge variant="outline" className="text-[10px]">
                      Construct
                    </Badge>
                  </div>
                  {svc.description && (
                    <p className="text-xs text-stardust font-mono leading-relaxed mt-1">
                      {svc.description}
                    </p>
                  )}
                </Card>
              ))}
            </div>
          </div>
        )}

        {activeTab === "spec" && (
          <div className="flex-1 overflow-auto rounded-xl bg-void/80 p-4 border border-white/10">
            <pre className="font-mono text-xs text-stardust leading-relaxed selection:bg-btc/30">
              {JSON.stringify(spec || {}, null, 2)}
            </pre>
          </div>
        )}
      </div>

      {/* Canvas Status Bar */}
      <div className="px-4 py-2 bg-void/90 border-t border-white/10 flex items-center justify-between text-xs font-mono text-stardust">
        <div className="flex items-center gap-2">
          <Clock className="size-3 text-btc" />
          <span>
            Version {currentVersion.version_num} generated on{" "}
            {new Date(currentVersion.created_at).toLocaleTimeString()}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Sparkles className="size-3 text-gold" />
          <span>Validated for Bedrock & CDK v2</span>
        </div>
      </div>
    </div>
  );
}
