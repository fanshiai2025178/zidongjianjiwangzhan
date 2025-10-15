import { useState } from "react";
import { Sparkles, Film, Video, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { TopNavbar } from "@/components/top-navbar";
import { useProject } from "@/hooks/use-project";
import { apiRequest } from "@/lib/queryClient";

export default function Home() {
  const [, setLocation] = useLocation();
  const { setProject } = useProject();
  const [loadingMode, setLoadingMode] = useState<string | null>(null);

  const handleStartMode = async (mode: string, route: string) => {
    // 立即显示加载状态
    setLoadingMode(mode);
    
    // 创建新项目并保存到后端
    try {
      const response = await apiRequest("POST", "/api/projects", {
        name: `视频项目 ${new Date().toLocaleDateString()}`,
        creationMode: mode,
        currentStep: 1,
      });
      const newProject = await response.json();
      setProject(newProject);
      localStorage.setItem("currentProjectId", newProject.id);
      setLocation(route);
    } catch (error) {
      console.error("Failed to create project:", error);
      setLoadingMode(null); // 出错时重置加载状态
    }
  };

  const modes = [
    {
      id: "ai-original",
      title: "AI原创视频制作",
      description: "从零开始，输入您的想法文案，AI帮您打磨成金牌讲解视频画面；打造独一无二的原创视频。",
      icon: Sparkles,
      route: "/ai-original/style",
      iconColor: "text-blue-500",
    },
    {
      id: "commentary",
      title: "各类解说制作",
      description: "上传一段多媒体素材，AI自动解说文案，自动完成混剪，配音，字幕对齐，画面优化与后期制作。",
      icon: Film,
      route: "/commentary",
      iconColor: "text-blue-500",
    },
    {
      id: "reference",
      title: "参考视频制作",
      description: "上传参考视频，AI分析视频并提炼主线主题，同风格镜像主题，同风格镜像主题的视频。",
      icon: Video,
      route: "/reference",
      iconColor: "text-blue-500",
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <TopNavbar />
      <main className="container mx-auto max-w-7xl px-6 py-16">
        <div className="text-center mb-16">
          <h1 className="text-4xl font-bold text-foreground mb-4">
            选择创作模式
          </h1>
          <p className="text-lg text-muted-foreground">
            选择适合您的视频创作方式，开始AI视频创作之旅
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {modes.map((mode) => (
            <Card
              key={mode.id}
              className="group relative overflow-hidden border border-card-border bg-card p-8 transition-all hover:shadow-lg hover-elevate"
              data-testid={`card-mode-${mode.id}`}
            >
              <div className="flex flex-col items-center text-center space-y-6">
                <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-primary/10">
                  <mode.icon className={cn("h-10 w-10", mode.iconColor)} />
                </div>
                
                <div className="space-y-3">
                  <h3 className="text-xl font-semibold text-foreground">
                    {mode.title}
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {mode.description}
                  </p>
                </div>

                <Button
                  onClick={() => handleStartMode(mode.id, mode.route)}
                  className="w-full"
                  disabled={loadingMode !== null}
                  data-testid={`button-start-${mode.id}`}
                >
                  {loadingMode === mode.id ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      创建中...
                    </>
                  ) : (
                    <>
                      开始制作
                      <svg
                        className="ml-2 h-4 w-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 5l7 7-7 7"
                        />
                      </svg>
                    </>
                  )}
                </Button>
              </div>
            </Card>
          ))}
        </div>
      </main>
    </div>
  );
}

function cn(...classes: string[]) {
  return classes.filter(Boolean).join(" ");
}
