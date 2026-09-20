"use client";

import React, { useState } from "react";
import { FolderPlus, X, Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useProjects } from "@/hooks/use-projects";

interface NewProjectDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function NewProjectDialog({ isOpen, onClose }: NewProjectDialogProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const { createProject, isCreating } = useProjects();

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      await createProject({ name, description });
      setName("");
      setDescription("");
      onClose();
    } catch (err) {
      console.error("Failed to create project:", err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-darkmatter border border-btc/40 rounded-2xl shadow-glow-orange-lg overflow-hidden corner-accents relative">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-white/10 bg-void/60">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-full bg-btc/10 border border-btc/30 text-btc">
              <FolderPlus className="size-5" />
            </div>
            <div>
              <h3 className="font-heading font-semibold text-base text-white">
                New Architecture Project
              </h3>
              <p className="text-xs font-mono text-stardust">
                Multi-tenant isolated AWS environment
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-stardust hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-mono uppercase tracking-wider text-stardust mb-1.5">
              Project Name *
            </label>
            <Input
              variant="box"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Decentralized Settlement Layer"
              required
              autoFocus
              className="text-xs"
            />
          </div>

          <div>
            <label className="block text-xs font-mono uppercase tracking-wider text-stardust mb-1.5">
              Description (Optional)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. High-throughput distributed settlement with Fargate and Aurora Serverless"
              rows={3}
              className="w-full bg-black/50 border border-white/10 rounded-lg p-3 text-xs font-mono text-white placeholder:text-white/30 focus:border-btc focus:shadow-input-glow outline-none transition-all resize-none"
            />
          </div>

          <div className="p-3 rounded-xl bg-void/70 border border-white/5 text-[11px] font-mono text-stardust flex items-start gap-2">
            <Sparkles className="size-4 text-gold shrink-0 mt-0.5" />
            <span>
              Each project provisions an isolated AWS Organizations sub-account and dedicated S3 artifact bucket.
            </span>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onClose}
              disabled={isCreating}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={!name.trim() || isCreating}
            >
              {isCreating ? (
                <>
                  <Loader2 className="size-3.5 mr-1.5 animate-spin" /> Provisioning...
                </>
              ) : (
                "Create Project"
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

