import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { MOCK_PROJECTS } from "@/lib/mock-data";
import { useStudioStore } from "@/lib/store";
import { Project, ProjectCreate } from "@/lib/types";

const DEFAULT_ORG_ID = "org_default_horsemen";

export function useProjects() {
  const queryClient = useQueryClient();
  const isDemoMode = useStudioStore((state) => state.isDemoMode);

  const projectsQuery = useQuery({
    queryKey: ["projects", DEFAULT_ORG_ID, isDemoMode],
    queryFn: async (): Promise<Project[]> => {
      if (isDemoMode) {
        return MOCK_PROJECTS;
      }
      try {
        return await api.listOrgProjects(DEFAULT_ORG_ID);
      } catch (err) {
        console.warn("Failed fetching live projects, falling back to mock data:", err);
        return MOCK_PROJECTS;
      }
    },
  });

  const createProjectMutation = useMutation({
    mutationFn: async (data: Omit<ProjectCreate, "org_id">) => {
      if (isDemoMode) {
        const newProj: Project = {
          id: `proj_${Date.now()}`,
          org_id: DEFAULT_ORG_ID,
          name: data.name,
          description: data.description,
          created_at: new Date().toISOString(),
        };
        MOCK_PROJECTS.unshift(newProj);
        return newProj;
      }
      return await api.createProject({ ...data, org_id: DEFAULT_ORG_ID });
    },
    onSuccess: (newProject) => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      useStudioStore.getState().setActiveProject(newProject.id);
    },
  });

  return {
    projects: projectsQuery.data ?? MOCK_PROJECTS,
    isLoading: projectsQuery.isLoading,
    isError: projectsQuery.isError,
    createProject: createProjectMutation.mutateAsync,
    isCreating: createProjectMutation.isPending,
  };
}

