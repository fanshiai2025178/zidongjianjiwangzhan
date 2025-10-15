import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { TopNavbar } from "@/components/top-navbar";
import { StepProgress } from "@/components/step-progress";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Scissors } from "lucide-react";
import { useProject } from "@/hooks/use-project";

export default function SegmentsPage() {
  const [, setLocation] = useLocation();
  const { project, updateSegments, updateCurrentStep } = useProject();
  
  // 模拟分段 - 实际应该由AI生成
  const [segments, setSegments] = useState((project?.segments as any) || [
    {
      id: "1",
      number: 1,
      language: "English",
      text: project?.scriptContent || "123343543",
    },
  ]);

  const handleContinue = () => {
    updateSegments(segments);
    updateCurrentStep(4);
    setLocation("/ai-original/generation-mode");
  };

  const currentStep = project?.currentStep || 3;
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
      
      <main className="container mx-auto max-w-4xl px-6 pb-16">
        <Button
          variant="ghost"
          onClick={() => setLocation("/ai-original/script")}
          className="mb-6"
          data-testid="button-back"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          返回上一步
        </Button>

        <div className="text-center mb-12">
          <h1 className="text-3xl font-bold text-foreground mb-3">
            智能分段
          </h1>
          <p className="text-muted-foreground">
            AI已为您将文案智能分为 1 个分镜片段，您可以编辑或继续合并段
          </p>
        </div>

        <div className="space-y-6">
          {segments.map((segment: any) => (
            <Card
              key={segment.id}
              className="p-6 border border-card-border"
              data-testid={`card-segment-${segment.number}`}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <Badge variant="secondary" className="text-base font-mono">
                    #{segment.number}
                  </Badge>
                  <Badge variant="outline">{segment.language}</Badge>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  data-testid={`button-cut-${segment.number}`}
                >
                  <Scissors className="h-4 w-4" />
                </Button>
              </div>
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">文案片段</p>
                <p className="text-base text-foreground">{segment.text}</p>
              </div>
            </Card>
          ))}

          <Button
            onClick={() => handleContinue()}
            className="w-full"
            size="lg"
            data-testid="button-continue-generation"
          >
            继续选择生成方式
          </Button>
        </div>

        <Card className="mt-6 p-6 bg-muted/50 border border-muted-foreground/20">
          <h3 className="font-medium text-foreground mb-2">分段成功</h3>
          <p className="text-sm text-muted-foreground">
            已生成 1 个分段，您可以继续编辑或继续模板
          </p>
        </Card>
      </main>
    </div>
  );
}
