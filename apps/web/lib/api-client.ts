import {
  AgentTaskResponse,
  ArchVersion,
  Message,
  Project,
  ProjectCreate,
  Session,
  SessionCreate,
} from "./types";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = "ApiError";
  }
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  const headers = {
    "Content-Type": "application/json",
    ...options.headers,
  };

  try {
    const res = await fetch(url, { ...options, headers });
    if (!res.ok) {
      let errorDetail = res.statusText;
      try {
        const body = await res.json();
        errorDetail = body.detail || body.message || JSON.stringify(body);
      } catch {
        // use status text
      }
      throw new ApiError(res.status, errorDetail);
    }
    return (await res.json()) as T;
  } catch (err) {
    if (err instanceof ApiError) throw err;
    throw new Error(err instanceof Error ? err.message : "Network error contacting Four Horsemen API");
  }
}

export const api = {
  // Health
  checkHealth: () => request<{ status: string }>("/health"),

  // Projects
  listOrgProjects: (orgId: string) => request<Project[]>(`/api/projects/org/${orgId}`),
  getProject: (projectId: string) => request<Project>(`/api/projects/${projectId}`),
  createProject: (data: ProjectCreate) =>
    request<Project>("/api/projects/", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  // Sessions
  createSession: (data: SessionCreate) =>
    request<Session>("/api/sessions/", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  getSession: (sessionId: string) => request<Session>(`/api/sessions/${sessionId}`),
  listProjectSessions: (projectId: string) =>
    request<Session[]>(`/api/sessions/project/${projectId}`),
  listMessages: (sessionId: string) => request<Message[]>(`/api/sessions/${sessionId}/messages`),
  listArchVersions: (sessionId: string) =>
    request<ArchVersion[]>(`/api/sessions/${sessionId}/arch-versions`),

  // Agent
  sendAgentMessage: (sessionId: string, content: string, useComplexModel = false) =>
    request<AgentTaskResponse>(`/api/agent/sessions/${sessionId}/message`, {
      method: "POST",
      body: JSON.stringify({ content, use_complex_model: useComplexModel }),
    }),

  // Stream URL generator
  getStreamUrl: (sessionId: string) => `${API_BASE_URL}/api/agent/stream/${sessionId}`,
};

