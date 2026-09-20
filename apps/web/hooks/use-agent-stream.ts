import { useState, useCallback, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { MOCK_ARCH_VERSIONS, MOCK_MESSAGES } from "@/lib/mock-data";
import { useStudioStore } from "@/lib/store";
import { ArchVersion, Message, StreamEvent } from "@/lib/types";

export function useAgentStream(sessionId: string | null) {
  const queryClient = useQueryClient();
  const isDemoMode = useStudioStore((state) => state.isDemoMode);
  const useOpusModel = useStudioStore((state) => state.useOpusModel);

  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingMessage, setStreamingMessage] = useState<string>("");
  const [activeTools, setActiveTools] = useState<string[]>([]);
  const [streamError, setStreamError] = useState<string | null>(null);

  const eventSourceRef = useRef<EventSource | null>(null);

  const stopStream = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    setIsStreaming(false);
  }, []);

  const sendMessage = useCallback(
    async (content: string) => {
      if (!sessionId || !content.trim()) return;

      setStreamError(null);
      setIsStreaming(true);
      setStreamingMessage("");
      setActiveTools([]);

      // 1. Optimistically append user message to local messages cache
      const userMsg: Message = {
        id: `user_${Date.now()}`,
        session_id: sessionId,
        role: "user",
        content,
        created_at: new Date().toISOString(),
      };

      queryClient.setQueryData<Message[]>(
        ["messages", sessionId, isDemoMode],
        (old) => [...(old || []), userMsg]
      );

      // 2. Demo Mode Simulation
      if (isDemoMode) {
        const simulatedTools = ["design_architecture", "generate_cdk_code", "run_security_scan"];
        const responseChunks = [
          "I have processed your architecture change request.\n\n",
          "### Updated Architectural Decisions\n",
          "- **Enhanced Ingress**: Configured AWS WAF v2 managed rules with rate limiting and AWS Shield Standard.\n",
          "- **Decoupled Messaging**: Added an Amazon SQS FIFO Dead-Letter Queue to buffer incoming settlements during traffic spikes.\n",
          "- **Cache Invalidation**: Integrated ElastiCache Redis cluster for microsecond balance lookups.\n\n",
          "Synthesizing CDK construct updates and checking security baseline with Checkov...",
        ];

        let toolIndex = 0;
        const toolInterval = setInterval(() => {
          if (toolIndex < simulatedTools.length) {
            setActiveTools((prev) => [...prev, simulatedTools[toolIndex]]);
            toolIndex++;
          }
        }, 1200);

        let chunkIndex = 0;
        let accumulatedText = "";
        const chunkInterval = setInterval(() => {
          if (chunkIndex < responseChunks.length) {
            accumulatedText += responseChunks[chunkIndex];
            setStreamingMessage(accumulatedText);
            chunkIndex++;
          } else {
            clearInterval(chunkInterval);
            clearInterval(toolInterval);
            setIsStreaming(false);

            const assistantMsg: Message = {
              id: `asst_${Date.now()}`,
              session_id: sessionId,
              role: "assistant",
              content: accumulatedText,
              created_at: new Date().toISOString(),
              toolCalls: simulatedTools,
            };

            // Update local messages
            queryClient.setQueryData<Message[]>(
              ["messages", sessionId, isDemoMode],
              (old) => [...(old || []), assistantMsg]
            );

            // Create a new architecture version iteration
            const currentVersions = MOCK_ARCH_VERSIONS[sessionId] || [];
            const nextVersionNum = currentVersions.length + 1;
            const newArchVersion: ArchVersion = {
              id: `arch_v${nextVersionNum}`,
              session_id: sessionId,
              version_num: nextVersionNum,
              mermaid_diagram: `graph TD
    Client["Client / Trader Apps\\nAPI & Webhook"]
    ALB["Application Load Balancer\\nPUBLIC SUBNETS (3 AZs)"]
    WAF["AWS WAF\\nRATE LIMIT & SHIELD"]
    ECS["ECS Fargate Settlement Service\\nPRIVATE SUBNETS"]
    Redis["Amazon ElastiCache Redis\\nSUB-MILLISECOND CACHE"]
    SQS["Amazon SQS FIFO\\nSETTLEMENT BUFFER"]
    Aurora["Aurora Serverless v2 PostgreSQL\\nISOLATED DB SUBNETS"]
    S3Audit["S3 Immutable Audit Bucket\\nKMS ENCRYPTED + OBJECT LOCK"]

    Client -->|HTTPS| WAF
    WAF --> ALB
    ALB --> ECS
    ECS --> SQS
    ECS --> Redis
    ECS --> Aurora
    ECS --> S3Audit`,
              arch_spec_json: {
                description: `Architecture v${nextVersionNum} with Redis caching layer and SQS FIFO queue`,
                services: [
                  { name: "alb-ingress", type: "elasticloadbalancing" },
                  { name: "fargate-engine", type: "ecs" },
                  { name: "elasticache-redis", type: "elasticache" },
                  { name: "sqs-buffer", type: "sqs" },
                  { name: "aurora-ledger", type: "rds" },
                  { name: "s3-audit-vault", type: "s3" },
                ],
                estimated_cost_tier: "$240 - $420 / month",
                cdk_code: `// Synthesized CDK construct for Four Horsemen v${nextVersionNum}
import * as cdk from 'aws-cdk-lib';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as elasticache from 'aws-cdk-lib/aws-elasticache';
// ... complete stack definitions`,
              },
              created_at: new Date().toISOString(),
            };

            MOCK_ARCH_VERSIONS[sessionId] = [...currentVersions, newArchVersion];
            queryClient.setQueryData<ArchVersion[]>(
              ["arch-versions", sessionId, isDemoMode],
              MOCK_ARCH_VERSIONS[sessionId]
            );
            useStudioStore.getState().setSelectedArchVersion(newArchVersion.id);
          }
        }, 800);

        return;
      }

      // 3. Live Mode Backend Integration
      try {
        await api.sendAgentMessage(sessionId, content, useOpusModel);

        const streamUrl = api.getStreamUrl(sessionId);
        const eventSource = new EventSource(streamUrl);
        eventSourceRef.current = eventSource;

        let accumulated = "";

        eventSource.onmessage = (event) => {
          try {
            const data: StreamEvent = JSON.parse(event.data);

            if (data.type === "token" && data.data) {
              accumulated += data.data;
              setStreamingMessage(accumulated);
            } else if (data.type === "tool_use" && data.tool) {
              setActiveTools((prev) => [...prev, data.tool!]);
            } else if (data.type === "done") {
              const finalText = data.response || accumulated;
              setIsStreaming(false);
              eventSource.close();
              eventSourceRef.current = null;

              // Append final assistant message
              const assistantMsg: Message = {
                id: `asst_${Date.now()}`,
                session_id: sessionId,
                role: "assistant",
                content: finalText,
                created_at: new Date().toISOString(),
                toolCalls: activeTools,
              };

              queryClient.setQueryData<Message[]>(
                ["messages", sessionId, isDemoMode],
                (old) => [...(old || []), assistantMsg]
              );

              // Invalidate architecture versions and messages
              queryClient.invalidateQueries({ queryKey: ["messages", sessionId] });
              queryClient.invalidateQueries({ queryKey: ["arch-versions", sessionId] });
            } else if (data.type === "error") {
              setStreamError(data.message || "An error occurred during agent processing");
              setIsStreaming(false);
              eventSource.close();
              eventSourceRef.current = null;
            }
          } catch (e) {
            console.error("Error parsing SSE stream message:", e);
          }
        };

        eventSource.onerror = (err) => {
          console.error("SSE stream error:", err);
          setStreamError("Lost connection to agent stream.");
          setIsStreaming(false);
          eventSource.close();
          eventSourceRef.current = null;
        };
      } catch (err: unknown) {
        setIsStreaming(false);
        const message = err instanceof Error ? err.message : "Failed to dispatch agent task";
        setStreamError(message);
      }
    },
    [sessionId, isDemoMode, useOpusModel, queryClient, activeTools]
  );

  return {
    sendMessage,
    stopStream,
    isStreaming,
    streamingMessage,
    activeTools,
    streamError,
  };
}

