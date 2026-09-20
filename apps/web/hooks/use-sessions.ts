import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { MOCK_ARCH_VERSIONS, MOCK_MESSAGES, MOCK_SESSIONS } from "@/lib/mock-data";
import { useStudioStore } from "@/lib/store";
import { ArchVersion, Message, Session } from "@/lib/types";

export function useSessions(projectId: string | null) {
  const queryClient = useQueryClient();
  const isDemoMode = useStudioStore((state) => state.isDemoMode);

  // 1. Sessions list query
  const sessionsQuery = useQuery({
    queryKey: ["sessions", projectId, isDemoMode],
    queryFn: async (): Promise<Session[]> => {
      if (!projectId) return [];
      if (isDemoMode) {
        return MOCK_SESSIONS[projectId] || [];
      }
      try {
        return await api.listProjectSessions(projectId);
      } catch {
        return MOCK_SESSIONS[projectId] || [];
      }
    },
    enabled: !!projectId,
  });

  // 2. Create session mutation
  const createSessionMutation = useMutation({
    mutationFn: async (modelId?: string) => {
      if (!projectId) throw new Error("No active project");

      if (isDemoMode) {
        const newSession: Session = {
          id: `sess_${Date.now()}`,
          project_id: projectId,
          status: "idle",
          model_used: modelId || "us.anthropic.claude-sonnet-4-5-20251001-v2:0",
          created_at: new Date().toISOString(),
        };
        if (!MOCK_SESSIONS[projectId]) {
          MOCK_SESSIONS[projectId] = [];
        }
        MOCK_SESSIONS[projectId].unshift(newSession);
        MOCK_MESSAGES[newSession.id] = [];
        MOCK_ARCH_VERSIONS[newSession.id] = [];
        return newSession;
      }

      return await api.createSession({ project_id: projectId, model_id: modelId });
    },
    onSuccess: (newSession) => {
      queryClient.invalidateQueries({ queryKey: ["sessions", projectId] });
      useStudioStore.getState().setActiveSession(newSession.id);
    },
  });

  return {
    sessions: sessionsQuery.data || (projectId ? MOCK_SESSIONS[projectId] || [] : []),
    isLoading: sessionsQuery.isLoading,
    createSession: createSessionMutation.mutateAsync,
    isCreating: createSessionMutation.isPending,
  };
}

export function useSessionDetails(sessionId: string | null) {
  const isDemoMode = useStudioStore((state) => state.isDemoMode);

  // Messages query
  const messagesQuery = useQuery({
    queryKey: ["messages", sessionId, isDemoMode],
    queryFn: async (): Promise<Message[]> => {
      if (!sessionId) return [];
      if (isDemoMode) {
        return MOCK_MESSAGES[sessionId] || [];
      }
      try {
        return await api.listMessages(sessionId);
      } catch (err) {
        console.warn("Failed fetching live messages, falling back to mock:", err);
        return MOCK_MESSAGES[sessionId] || [];
      }
    },
    enabled: !!sessionId,
  });

  // Architecture versions query
  const archVersionsQuery = useQuery({
    queryKey: ["arch-versions", sessionId, isDemoMode],
    queryFn: async (): Promise<ArchVersion[]> => {
      if (!sessionId) return [];
      if (isDemoMode) {
        return MOCK_ARCH_VERSIONS[sessionId] || [];
      }
      try {
        return await api.listArchVersions(sessionId);
      } catch (err) {
        console.warn("Failed fetching live arch versions, falling back to mock:", err);
        return MOCK_ARCH_VERSIONS[sessionId] || [];
      }
    },
    enabled: !!sessionId,
  });

  return {
    messages: messagesQuery.data || (sessionId ? MOCK_MESSAGES[sessionId] || [] : []),
    isLoadingMessages: messagesQuery.isLoading,
    archVersions: archVersionsQuery.data || (sessionId ? MOCK_ARCH_VERSIONS[sessionId] || [] : []),
    isLoadingArchVersions: archVersionsQuery.isLoading,
  };
}

