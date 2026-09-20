"use client";

import React, { useEffect, useRef, useState } from "react";
import mermaid from "mermaid";
import { Copy, Check, ZoomIn, ZoomOut, RotateCcw, Code2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface MermaidViewerProps {
  chart: string;
}

export function MermaidViewer({ chart }: MermaidViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [svgContent, setSvgContent] = useState<string>("");
  const [renderError, setRenderError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [showCode, setShowCode] = useState(false);
  const [zoom, setZoom] = useState(1);

  useEffect(() => {
    mermaid.initialize({
      startOnLoad: false,
      theme: "dark",
      securityLevel: "loose",
      fontFamily: "var(--font-jetbrains-mono), monospace",
      themeVariables: {
        darkMode: true,
        background: "#030304",
        primaryColor: "#0F1115",
        primaryBorderColor: "#F7931A",
        primaryTextColor: "#FFFFFF",
        secondaryColor: "#1E293B",
        secondaryBorderColor: "#EA580C",
        secondaryTextColor: "#94A3B8",
        tertiaryColor: "#0F1115",
        tertiaryBorderColor: "#FFD600",
        tertiaryTextColor: "#FFFFFF",
        lineColor: "#F7931A",
        textColor: "#FFFFFF",
        mainBkg: "#0F1115",
        nodeBorder: "#F7931A",
        clusterBkg: "#08090C",
        clusterBorder: "rgba(255, 255, 255, 0.15)",
        edgeLabelBackground: "#030304",
      },
    });
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function renderChart() {
      if (!chart.trim()) return;

      try {
        setRenderError(null);
        const uniqueId = `mermaid-${Math.random().toString(36).substring(2, 9)}`;
        const { svg } = await mermaid.render(uniqueId, chart);
        if (isMounted) {
          setSvgContent(svg);
        }
      } catch (err: unknown) {
        if (isMounted) {
          console.error("Mermaid render error:", err);
          setRenderError(
            err instanceof Error ? err.message : "Failed to parse diagram syntax"
          );
        }
      }
    }

    renderChart();

    return () => {
      isMounted = false;
    };
  }, [chart]);

  const copySource = () => {
    navigator.clipboard.writeText(chart);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative w-full h-full flex flex-col bg-void/60 rounded-xl overflow-hidden border border-white/10">
      {/* Top Controls Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 bg-darkmatter/80 border-b border-white/10 z-10">
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-stardust uppercase tracking-wider">
            AWS Topology Diagram
          </span>
          <span className="w-1.5 h-1.5 rounded-full bg-btc animate-pulse" />
        </div>

        <div className="flex items-center gap-1.5">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => setZoom((prev) => Math.min(prev + 0.15, 2.5))}
            title="Zoom In"
          >
            <ZoomIn className="size-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => setZoom((prev) => Math.max(prev - 0.15, 0.5))}
            title="Zoom Out"
          >
            <ZoomOut className="size-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => setZoom(1)}
            title="Reset Zoom"
          >
            <RotateCcw className="size-3.5" />
          </Button>
          <div className="w-[1px] h-4 bg-white/10 mx-1" />
          <Button
            variant={showCode ? "outline" : "ghost"}
            size="icon-sm"
            onClick={() => setShowCode(!showCode)}
            title="Toggle Mermaid Source"
          >
            <Code2 className="size-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={copySource}
            title="Copy Diagram Source"
          >
            {copied ? <Check className="size-3.5 text-btc" /> : <Copy className="size-3.5" />}
          </Button>
        </div>
      </div>

      {/* Main View Area */}
      <div className="relative flex-1 w-full h-full min-h-[420px] overflow-auto flex items-center justify-center p-6 bg-grid-masked">
        {showCode ? (
          <pre className="w-full h-full p-4 font-mono text-xs text-stardust bg-void/90 rounded-lg overflow-auto border border-white/10 selection:bg-btc/30">
            {chart}
          </pre>
        ) : renderError ? (
          <div className="flex flex-col items-center justify-center p-6 text-center max-w-md">
            <div className="text-red-400 font-heading font-semibold text-sm mb-2">
              Diagram Syntax Warning
            </div>
            <p className="text-xs text-stardust font-mono mb-4">{renderError}</p>
            <pre className="text-[11px] font-mono p-3 bg-black/60 rounded border border-white/10 text-left w-full overflow-x-auto text-amber-300/80">
              {chart}
            </pre>
          </div>
        ) : (
          <div
            ref={containerRef}
            className="transition-transform duration-200 ease-out flex items-center justify-center [&_svg]:max-w-none [&_svg]:drop-shadow-[0_0_15px_rgba(247,147,26,0.15)]"
            style={{ transform: `scale(${zoom})` }}
            dangerouslySetInnerHTML={{ __html: svgContent }}
          />
        )}
      </div>

      {/* Footer Info */}
      <div className="flex items-center justify-between px-4 py-1.5 bg-black/40 border-t border-white/5 text-[10px] font-mono text-stardust">
        <span>Zoom: {Math.round(zoom * 100)}%</span>
        <span>Auto-synced from Strands Agent</span>
      </div>
    </div>
  );
}

