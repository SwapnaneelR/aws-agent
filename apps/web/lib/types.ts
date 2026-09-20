export interface Org {
  id: string;
  name: string;
  aws_account_id?: string | null;
  clerk_org_id?: string | null;
  created_at: string;
}

export interface Project {
  id: string;
  org_id: string;
  name: string;
  description?: string | null;
  created_at: string;
}

export interface ProjectCreate {
  name: string;
  description?: string;
  org_id: string;
}

export type SessionStatus = "idle" | "running" | "error" | "complete";

export interface Session {
  id: string;
  project_id: string;
  user_id?: string | null;
  status: SessionStatus;
  model_used?: string | null;
  created_at: string;
}

export interface SessionCreate {
  project_id: string;
  model_id?: string;
}

export type MessageRole = "user" | "assistant" | "tool";

export interface Message {
  id: string;
  session_id: string;
  role: MessageRole;
  content: string;
  created_at: string;
  // UI-specific properties for live streaming
  isStreaming?: boolean;
  toolCalls?: string[];
}

export interface ArchitectureService {
  name: string;
  type: string;
  description?: string;
  config?: Record<string, unknown>;
}

export interface ArchitectureConnection {
  from: string;
  to: string;
  type?: string;
  protocol?: string;
}

export interface ArchitectureSpec {
  description?: string;
  services?: ArchitectureService[];
  connections?: ArchitectureConnection[];
  mermaid_diagram?: string;
  cdk_code?: string;
  security_notes?: string[];
  estimated_cost_tier?: string;
}

export interface ArchVersion {
  id: string;
  session_id: string;
  version_num: number;
  mermaid_diagram?: string | null;
  arch_spec_json?: ArchitectureSpec | null;
  created_at: string;
}

export type DeploymentStatus = "pending" | "running" | "success" | "failed" | "destroyed";

export interface Deployment {
  id: string;
  arch_version_id: string;
  sandbox_account_id?: string | null;
  status: DeploymentStatus;
  cfn_stack_id?: string | null;
  created_at: string;
}

export interface AgentTaskResponse {
  task_id: string;
  session_id: string;
  status: string;
}

export type StreamEventType = "token" | "tool_use" | "done" | "error";

export interface StreamEvent {
  type: StreamEventType;
  task_id: string;
  data?: string;
  tool?: string;
  response?: string;
  message?: string;
}

