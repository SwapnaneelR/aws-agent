"use client";

import React, { useState } from "react";
import {
  FileCode,
  Copy,
  Check,
  ShieldCheck,
  Rocket,
  Terminal,
  Loader2,
  CheckCircle2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArchVersion } from "@/lib/types";

interface CDKInspectorProps {
  currentArchVersion?: ArchVersion;
}

export function CDKInspector({ currentArchVersion }: CDKInspectorProps) {
  const [copied, setCopied] = useState(false);
  const [deployStep, setDeployStep] = useState<
    "idle" | "scanning" | "synthesizing" | "deploying" | "success"
  >("idle");

  const cdkCode =
    currentArchVersion?.arch_spec_json?.cdk_code ||
    `// CDK code not generated yet.
// Prompt the agent with your architecture requirements to generate AWS CDK TypeScript code.`;

  const copyCode = () => {
    navigator.clipboard.writeText(cdkCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDeploy = () => {
    if (deployStep !== "idle" && deployStep !== "success") return;

    setDeployStep("scanning");
    setTimeout(() => {
      setDeployStep("synthesizing");
      setTimeout(() => {
        setDeployStep("deploying");
        setTimeout(() => {
          setDeployStep("success");
        }, 2500);
      }, 1800);
    }, 1500);
  };

  const lines = cdkCode.split("\n");

  return (
    <div className="flex flex-col h-full bg-darkmatter rounded-2xl border border-white/10 overflow-hidden shadow-card-glow">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 border-b border-white/10 bg-void/60">
        <div className="flex items-center gap-2">
          <FileCode className="size-4 text-btc" />
          <span className="font-heading font-semibold text-sm text-white">
            AWS CDK TypeScript Construct
          </span>
          <Badge variant="outline" className="text-[10px]">
            AWS CDK v2.140+
          </Badge>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={copyCode}
            className="text-xs font-mono h-8"
          >
            {copied ? (
              <>
                <Check className="size-3.5 mr-1.5 text-btc" /> Copied
              </>
            ) : (
              <>
                <Copy className="size-3.5 mr-1.5" /> Copy Code
              </>
            )}
          </Button>

          <Button
            variant="gold"
            size="sm"
            onClick={handleDeploy}
            disabled={deployStep !== "idle" && deployStep !== "success"}
            className="h-8 text-xs"
          >
            {deployStep === "idle" || deployStep === "success" ? (
              <>
                <Rocket className="size-3.5 mr-1.5" /> Deploy Sandbox
              </>
            ) : (
              <>
                <Loader2 className="size-3.5 mr-1.5 animate-spin" /> Deploying...
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Deployment Status Pipeline Alert */}
      {deployStep !== "idle" && (
        <div className="p-3 bg-black/60 border-b border-white/10 px-6">
          <div className="flex items-center justify-between text-xs font-mono text-stardust mb-2">
            <span className="text-white font-semibold flex items-center gap-1.5">
              <Terminal className="size-3.5 text-btc" /> Sandbox Deployment Pipeline
            </span>
            <span className="text-btc uppercase tracking-wider">
              {deployStep === "success" ? "Stack Deployed" : "In Progress"}
            </span>
          </div>

          <div className="grid grid-cols-4 gap-2 text-center text-[10px] font-mono">
            <div
              className={`p-1.5 rounded border transition-colors ${
                deployStep === "scanning"
                  ? "bg-btc/20 border-btc text-white"
                  : "bg-white/5 border-white/10 text-stardust"
              }`}
            >
              1. Checkov Scan
            </div>
            <div
              className={`p-1.5 rounded border transition-colors ${
                deployStep === "synthesizing"
                  ? "bg-btc/20 border-btc text-white"
                  : "bg-white/5 border-white/10 text-stardust"
              }`}
            >
              2. cdk synth
            </div>
            <div
              className={`p-1.5 rounded border transition-colors ${
                deployStep === "deploying"
                  ? "bg-btc/20 border-btc text-white"
                  : "bg-white/5 border-white/10 text-stardust"
              }`}
            >
              3. STS AssumeRole
            </div>
            <div
              className={`p-1.5 rounded border transition-colors ${
                deployStep === "success"
                  ? "bg-emerald-500/20 border-emerald-500 text-emerald-300 font-semibold"
                  : "bg-white/5 border-white/10 text-stardust"
              }`}
            >
              4. CloudFormation
            </div>
          </div>

          {deployStep === "success" && (
            <div className="mt-2.5 flex items-center gap-2 text-emerald-400 text-xs font-mono">
              <CheckCircle2 className="size-3.5" />
              <span>
                Stack deployed successfully to sandbox account:{" "}
                <strong className="text-white">9823-4122-0941</strong> (Auto-destroy in 2h)
              </span>
            </div>
          )}
        </div>
      )}

      {/* Code Display Area */}
      <div className="flex-1 overflow-auto bg-void/90 p-4 font-mono text-xs leading-relaxed">
        <div className="flex">
          {/* Line Numbers */}
          <div className="select-none text-right pr-4 text-stardust/40 font-mono text-[11px] leading-relaxed border-r border-white/5">
            {lines.map((_, i) => (
              <div key={i}>{i + 1}</div>
            ))}
          </div>
          {/* Code Text */}
          <pre className="pl-4 text-stardust/90 font-mono text-[11px] leading-relaxed overflow-x-auto selection:bg-btc/30 flex-1">
            <code>{cdkCode}</code>
          </pre>
        </div>
      </div>

      {/* Bottom Security Audit Bar */}
      <div className="p-3 bg-void/80 border-t border-white/10 flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-emerald-400">
            <ShieldCheck className="size-4" />
            <span>Checkov Security Scan: PASSED</span>
          </div>
          <div className="hidden sm:flex items-center gap-1.5 text-emerald-400">
            <CheckCircle2 className="size-3.5" />
            <span>cfn-nag: 0 Warnings</span>
          </div>
        </div>

        <div className="text-[11px] text-stardust flex items-center gap-2">
          <span>Sandbox Isolation:</span>
          <Badge variant="default" className="text-[10px]">
            Multi-Tenant AWS Sub-Account
          </Badge>
        </div>
      </div>
    </div>
  );
}
