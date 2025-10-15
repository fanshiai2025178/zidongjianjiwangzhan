import { useLocation } from "wouter";
import { TopNavbar } from "@/components/top-navbar";
import { StepProgress } from "@/components/step-progress";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Edit } from "lucide-react";
import { useProject } from "@/hooks/use-project";

export default function DescriptionsPage() {
  const [, setLocation] = useLocation();
  const { project, updateCurrentStep } = useProject();

  const segments = (project?.segments as any) || [
    {
      id: "1",
      number: 1,
      language: "English",
      text: project?.scriptContent || "123343543",
      translation: "-",
      description: "基于您提的诉愿输入，本视频是一个关于 Seedream 4.8 文生图，并编辑镜格与合作 Seedance 视频库等辑高清图...",
    },
  ];

  const handleContinue = () => {
    updateCurrentStep(6);
    setLocation("/ai-original/result");
  };

  const currentStep = project?.currentStep || 5;
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
      
      <main className="container mx-auto max-w-6xl px-6 pb-16">
        <Button
          variant="ghost"
          onClick={() => setLocation("/ai-original/generation-mode")}
          className="mb-6"
          data-testid="button-back"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          返回上一步
        </Button>

        <div className="text-center mb-12">
          <h1 className="text-3xl font-bold text-foreground mb-3">
            生成描述
          </h1>
          <p className="text-muted-foreground">
            查看 AI 为您生成的分镜画面描述，确认无误后开始生成
          </p>
        </div>

        <Card className="border border-card-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50 border-b border-border">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">编号</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">文案</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">翻译</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">分镜画面描述词</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">操作</th>
                </tr>
              </thead>
              <tbody>
                {segments.map((segment: any) => (
                  <tr
                    key={segment.id}
                    className="border-b border-border last:border-0"
                    data-testid={`row-segment-${segment.number}`}
                  >
                    <td className="px-4 py-4">
                      <span className="font-mono text-sm">#{segment.number}</span>
                    </td>
                    <td className="px-4 py-4">
                      <p className="text-sm text-foreground">{segment.text}</p>
                      <p className="text-xs text-muted-foreground mt-1">{segment.language}</p>
                    </td>
                    <td className="px-4 py-4 text-sm text-muted-foreground">{segment.translation}</td>
                    <td className="px-4 py-4">
                      <div className="max-w-md">
                        <p className="text-sm text-foreground line-clamp-3">{segment.description}</p>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <Button
                        variant="ghost"
                        size="sm"
                        data-testid={`button-edit-${segment.number}`}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <div className="mt-8 flex justify-center">
          <Button
            onClick={() => handleContinue()}
            size="lg"
            data-testid="button-start-generation"
          >
            开始生成图片
          </Button>
        </div>

        <Card className="mt-6 p-6 bg-muted/50 border border-muted-foreground/20">
          <h3 className="font-medium text-foreground mb-2">分段成功</h3>
          <p className="text-sm text-muted-foreground">
            已生成 1 个分段，您可以编辑描述后开始生成
          </p>
        </Card>
      </main>
    </div>
  );
}
