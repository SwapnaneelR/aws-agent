"use client";

import React, { useState } from "react";
import {
  FolderKanban,
  Plus,
  MessageSquare,
  Shield,
  ChevronRight,
  Clock,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useProjects } from "@/hooks/use-projects";
import { useSessions } from "@/hooks/use-sessions";
import { useStudioStore } from "@/lib/store";
import { NewProjectDialog } from "@/components/projects/new-project-dialog";

export function Sidebar() {
  const [isNewProjectOpen, setIsNewProjectOpen] = useState(false);

  const activeProjectId = useStudioStore((state) => state.activeProjectId);
  const setActiveProject = useStudioStore((state) => state.setActiveProject);
  const activeSessionId = useStudioStore((state) => state.activeSessionId);
  const setActiveSession = useStudioStore((state) => state.setActiveSession);
  const isSidebarOpen = useStudioStore((state) => state.isSidebarOpen);

  const { projects, isLoading: isLoadingProjects } = useProjects();
  const { sessions, createSession, isCreating: isCreatingSession } =
    useSessions(activeProjectId);

  const activeProject = projects.find((p) => p.id === activeProjectId);

  const handleCreateSession = async () => {
    try {
      await createSession();
    } catch (err) {
      console.error("Failed creating session:", err);
    }
  };

  if (!isSidebarOpen) return null;

  return (
    <>
      <aside className="w-80 h-full flex flex-col bg-darkmatter border-r border-white/10 shrink-0 select-none">
        {/* Project Selector Header */}
        <div className="p-4 border-b border-white/10 bg-void/60">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-mono uppercase tracking-wider text-stardust flex items-center gap-1.5">
              <FolderKanban className="size-3.5 text-btc" /> Projects
            </span>
            <Button
              variant="outline"
              size="icon-sm"
              onClick={() => setIsNewProjectOpen(true)}
              title="Create New Project"
              className="size-7"
            >
              <Plus className="size-3.5" />
            </Button>
          </div>

          {/* Projects Select list */}
          <div className="space-y-1.5">
            {isLoadingProjects ? (
              <div className="p-2 text-xs font-mono text-stardust animate-pulse">
                Loading projects...
              </div>
            ) : (
              projects.map((proj) => {
                const isActive = proj.id === activeProjectId;
                return (
                  <button
                    key={proj.id}
                    onClick={() => setActiveProject(proj.id)}
                    className={`w-full text-left p-2.5 rounded-xl border transition-all text-xs font-mono flex items-center justify-between ${
                      isActive
                        ? "bg-btc/10 border-btc/40 text-white shadow-[0_0_15px_-5px_rgba(247,147,26,0.3)]"
                        : "bg-void/40 border-white/5 text-stardust hover:text-white hover:border-white/20"
                    }`}
                  >
                    <div className="truncate pr-2">
                      <div className="font-heading font-medium truncate text-xs text-purelight">
                        {proj.name}
                      </div>
                      <div className="text-[10px] text-stardust/60 truncate mt-0.5">
                        {proj.description || "AWS Sub-Account Sandbox"}
                      </div>
                    </div>
                    {isActive && <ChevronRight className="size-3.5 text-btc shrink-0" />}
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Sessions Section */}
        <div className="flex-1 overflow-y-auto p-4 flex flex-col min-h-0">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-mono uppercase tracking-wider text-stardust flex items-center gap-1.5">
              <MessageSquare className="size-3.5 text-gold" /> Architecture Sessions
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCreateSession}
              disabled={isCreatingSession || !activeProjectId}
              className="h-6 px-2 text-[10px] text-btc hover:text-white"
            >
              <Plus className="size-3 mr-1" /> New Turn
            </Button>
          </div>

          <div className="space-y-2 flex-1 overflow-y-auto pr-1">
            {sessions.length === 0 ? (
              <div className="text-center py-8 text-xs font-mono text-stardust/60 border border-dashed border-white/5 rounded-xl p-4">
                No active sessions for this project.
              </div>
            ) : (
              sessions.map((sess) => {
                const isActive = sess.id === activeSessionId;
                return (
                  <button
                    key={sess.id}
                    onClick={() => setActiveSession(sess.id)}
                    className={`w-full text-left p-3 rounded-xl border transition-all relative ${
                      isActive
                        ? "bg-void border-btc/40 text-white shadow-card-glow"
                        : "bg-void/40 border-white/5 text-stardust hover:text-white hover:border-white/10"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-mono text-xs font-semibold text-purelight truncate">
                        {sess.id.replace("sess_", "Session #")}
                      </span>
                      <Badge
                        variant={sess.status === "running" ? "default" : "outline"}
                        pulse={sess.status === "running"}
                        className="text-[9px] px-1.5 py-0"
                      >
                        {sess.status}
                      </Badge>
                    </div>

                    <div className="flex items-center justify-between text-[10px] font-mono text-stardust/60 mt-1">
                      <span className="truncate max-w-[130px]">
                        {sess.model_used?.includes("opus") ? "Opus 4.8" : "Sonnet 3.5"}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="size-2.5" />
                        {new Date(sess.created_at).toLocaleDateString([], {
                          month: "short",
                          day: "numeric",
                        })}
                      </span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* AWS Tenant Context Footer */}
        <div className="p-4 border-t border-white/10 bg-void/80 text-[11px] font-mono">
          <div className="flex items-center gap-2 mb-1.5 text-stardust">
            <Shield className="size-3.5 text-btc" />
            <span className="text-white font-medium">AWS Sandbox Isolation</span>
          </div>
          <p className="text-[10px] text-stardust/70 leading-relaxed mb-2">
            Each architecture stack is provisioned in a clean, quarantined AWS sub-account with a $50 budget limit.
          </p>
          <div className="flex items-center justify-between text-[10px] text-stardust/50">
            <span>Org: {activeProject?.org_id || "Default"}</span>
            <span className="text-emerald-400">STS Bound</span>
          </div>
        </div>
      </aside>

      <NewProjectDialog
        isOpen={isNewProjectOpen}
        onClose={() => setIsNewProjectOpen(false)}
      />
    </>
  );
}
