import { useState, useEffect, useCallback } from "react";
import { ProjectContext } from "@/hooks/use-project";
import { type Project, type StyleSettings, type Segment } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export function ProjectProvider({ children }: { children: React.ReactNode }) {
  const [project, setProject] = useState<Project | null>(null);
  const { toast } = useToast();

  // 从localStorage加载项目
  useEffect(() => {
    const savedProjectId = localStorage.getItem("currentProjectId");
    if (savedProjectId) {
      apiRequest("GET", `/api/projects/${savedProjectId}`)
        .then((res) => res.json())
        .then((data) => setProject(data as Project))
        .catch(() => {
          localStorage.removeItem("currentProjectId");
        });
    }
  }, []);

  const updateStyleSettings = useCallback((settings: StyleSettings) => {
    setProject((prev) => prev ? { ...prev, styleSettings: settings as any } : null);
  }, []);

  const updateScriptContent = useCallback((content: string) => {
    setProject((prev) => prev ? { ...prev, scriptContent: content } : null);
  }, []);

  const updateSegments = useCallback((segments: Segment[]) => {
    setProject((prev) => prev ? { ...prev, segments: segments as any } : null);
  }, []);

  const updateGenerationMode = useCallback((mode: string) => {
    setProject((prev) => prev ? { ...prev, generationMode: mode } : null);
  }, []);

  const updateCurrentStep = useCallback((step: number) => {
    setProject((prev) => prev ? { ...prev, currentStep: step } : null);
  }, []);

  const saveProject = useCallback(async () => {
    if (!project) return;

    try {
      if (project.id && project.id !== "temp") {
        // 更新现有项目
        const response = await apiRequest("PATCH", `/api/projects/${project.id}`, project);
        const updated = await response.json();
        setProject(updated as Project);
        toast({
          title: "保存成功",
          description: "项目已保存",
        });
      } else {
        // 创建新项目
        const response = await apiRequest("POST", "/api/projects", {
          name: `视频项目 ${new Date().toLocaleDateString()}`,
          creationMode: project.creationMode,
          currentStep: project.currentStep,
          styleSettings: project.styleSettings,
          scriptContent: project.scriptContent,
          segments: project.segments,
          generationMode: project.generationMode,
        });
        const newProject = await response.json();
        setProject(newProject as Project);
        localStorage.setItem("currentProjectId", newProject.id);
        toast({
          title: "保存成功",
          description: "新项目已创建",
        });
      }
    } catch (error) {
      toast({
        title: "保存失败",
        description: "无法保存项目",
        variant: "destructive",
      });
    }
  }, [project, toast]);

  return (
    <ProjectContext.Provider
      value={{
        project,
        setProject,
        updateStyleSettings,
        updateScriptContent,
        updateSegments,
        updateGenerationMode,
        updateCurrentStep,
        saveProject,
      }}
    >
      {children}
    </ProjectContext.Provider>
  );
}
