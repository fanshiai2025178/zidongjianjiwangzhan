import { createContext, useContext } from "react";
import { type Project, type StyleSettings, type Segment } from "@shared/schema";

interface ProjectContextType {
  project: Project | null;
  setProject: (project: Project | null) => void;
  updateStyleSettings: (settings: StyleSettings) => void;
  updateScriptContent: (content: string) => void;
  updateSegments: (segments: Segment[]) => void;
  updateGenerationMode: (mode: string) => void;
  updateAspectRatio: (ratio: string) => void;
  updateCurrentStep: (step: number) => void;
  saveProject: () => Promise<void>;
}

export const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

export function useProject() {
  const context = useContext(ProjectContext);
  if (!context) {
    throw new Error("useProject must be used within ProjectProvider");
  }
  return context;
}
