import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { TopNavbar } from "@/components/top-navbar";
import { StepProgress } from "@/components/step-progress";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Video, Image as ImageIcon, ArrowLeft } from "lucide-react";
import { useProject } from "@/hooks/use-project";

export default function GenerationModePage() {
  const [, setLocation] = useLocation();
  const { project, updateGenerationMode, updateCurrentStep } = useProject();
  const [selectedMode, setSelectedMode] = useState<string | null>(project?.generationMode || null);

  useEffect(() => {
    if (project?.generationMode) {
      setSelectedMode(project.generationMode);
    }
  }, [project]);

  const handleContinue = () => {
    if (selectedMode) {
      updateGenerationMode(selectedMode);
      updateCurrentStep(5);
      setLocation("/ai-original/descriptions");
    }
  };

  const modes = [
    {
      id: "text-to-video",
      title: "文生视频",
      description: "直接从文案提示词生成视频画面内容，快速高效，适合快捷产出。",
      flow: "文字 → 视频",
      icon: Video,
    },
    {
      id: "text-to-image-to-video",
      title: "文生图 + 图生视频",
      description: "先生成高质量图片，再基于图片生成视频，画面更精准可控。",
      flow: "文字 → 图片 → 视频",
      icon: ImageIcon,
    },
  ];

  const currentStep = project?.currentStep || 4;
  const steps = [
    { number: 1, label: "风格定制", isCompleted: currentStep > 1, isCurrent: currentStep === 1 },
    { number: 2, label: "输入文案", isCompleted: currentStep > 2, isCurrent: currentStep === 2 },
    { number: 3, label: "智能分段", isCompleted: currentStep > 3, isCurrent: currentStep === 3 },
    { number: 4, label: "选择流程", isCompleted: currentStep > 4, isCurrent: currentStep === 4 },
    { number: 5, label: "生成描述", isCompleted: currentStep > 5, isCurrent: currentStep === 5 },
    { number: 6, label: "导出成片", isCompleted: currentStep > 6, isCurrent: currentStep === 6 },
  ];

  return (
    <div className="min-h-screen bg-background">
      <TopNavbar />
      <StepProgress steps={steps} />
      
      <main className="container mx-auto max-w-5xl px-6 pb-16">
        <Button
          variant="ghost"
          onClick={() => setLocation("/ai-original/segments")}
          className="mb-6"
          data-testid="button-back"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          返回上一步
        </Button>

        <div className="text-center mb-12">
          <h1 className="text-3xl font-bold text-foreground mb-3">
            选择生成方式
          </h1>
          <p className="text-muted-foreground">
            请选择视频生成方式，两种方式互不影响
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {modes.map((mode) => (
            <Card
              key={mode.id}
              className={cn(
                "p-8 cursor-pointer transition-all hover-elevate",
                selectedMode === mode.id
                  ? "ring-2 ring-primary border-primary"
                  : "border-card-border"
              )}
              onClick={() => setSelectedMode(mode.id)}
              data-testid={`card-mode-${mode.id}`}
            >
              <div className="flex flex-col items-center text-center space-y-6">
                <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-primary/10">
                  <mode.icon className="h-8 w-8 text-primary" />
                </div>
                
                <div className="space-y-3">
                  <h3 className="text-xl font-semibold text-foreground">
                    {mode.title}
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {mode.description}
                  </p>
                  <p className="text-sm font-mono text-primary">
                    {mode.flow}
                  </p>
                </div>

                <Button
                  variant={selectedMode === mode.id ? "default" : "outline"}
                  className="w-full"
                  data-testid={`button-select-${mode.id}`}
                >
                  选择此方式
                </Button>
              </div>
            </Card>
          ))}
        </div>

        <p className="text-center text-sm text-muted-foreground mb-6">
          提示：选择后将无法修改或改，请根据需要选择连线
        </p>

        <Button
          onClick={() => handleContinue()}
          disabled={!selectedMode}
          className="w-full"
          size="lg"
          data-testid="button-continue-descriptions"
        >
          继续生成描述
        </Button>
      </main>
    </div>
  );
}

function cn(...classes: string[]) {
  return classes.filter(Boolean).join(" ");
}
