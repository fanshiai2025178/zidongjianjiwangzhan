import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { TopNavbar } from "@/components/top-navbar";
import { StepProgress } from "@/components/step-progress";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import { useProject } from "@/hooks/use-project";

export default function ScriptPage() {
  const [, setLocation] = useLocation();
  const { project, updateScriptContent, updateCurrentStep } = useProject();
  const [script, setScript] = useState(project?.scriptContent || "");

  useEffect(() => {
    if (project?.scriptContent) {
      setScript(project.scriptContent);
    }
  }, [project]);

  const handleContinue = () => {
    updateScriptContent(script);
    updateCurrentStep(2);
    setLocation("/ai-original/segments");
  };

  const currentStep = project?.currentStep || 1;
  const steps = [
    { number: 1, label: "输入文案", isCompleted: currentStep > 1, isCurrent: currentStep === 1 },
    { number: 2, label: "智能分段", isCompleted: currentStep > 2, isCurrent: currentStep === 2 },
    { number: 3, label: "选择流程", isCompleted: currentStep > 3, isCurrent: currentStep === 3 },
    { number: 4, label: "生成描述", isCompleted: currentStep > 4, isCurrent: currentStep === 4 },
    { number: 5, label: "风格定制", isCompleted: currentStep > 5, isCurrent: currentStep === 5 },
    { number: 6, label: "生成素材", isCompleted: currentStep > 6, isCurrent: currentStep === 6 },
    { number: 7, label: "导出成片", isCompleted: currentStep > 7, isCurrent: currentStep === 7 },
  ];

  return (
    <div className="min-h-screen bg-background">
      <TopNavbar />
      <StepProgress steps={steps} />
      
      <main className="container mx-auto max-w-4xl px-6 pb-16">
        <Button
          variant="ghost"
          onClick={() => setLocation("/")}
          className="mb-6"
          data-testid="button-back"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          返回上一步
        </Button>

        <div className="text-center mb-12">
          <h1 className="text-3xl font-bold text-foreground mb-3">
            输入文案
          </h1>
          <p className="text-muted-foreground">
            输入您的文案，AI将智能分段并生成专业的视频镜镜
          </p>
        </div>

        <Card className="p-8 border border-card-border">
          <Textarea
            placeholder="粘贴您的文案，AI将自动分段并生成分镜..."
            value={script}
            onChange={(e) => setScript(e.target.value)}
            className="min-h-[400px] resize-none text-base"
            data-testid="textarea-script"
          />
          <div className="mt-4 flex items-center justify-between">
            <span className="text-sm text-muted-foreground" data-testid="text-char-count">
              {script.length} 字符
            </span>
            <Button
              onClick={() => handleContinue()}
              disabled={!script.trim()}
              data-testid="button-start-segmentation"
            >
              开始分镜
            </Button>
          </div>
        </Card>
      </main>
    </div>
  );
}
