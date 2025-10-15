import { useLocation } from "wouter";
import { TopNavbar } from "@/components/top-navbar";
import { StepProgress } from "@/components/step-progress";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Download, Camera, RefreshCw, ChevronDown } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useProject } from "@/hooks/use-project";

export default function ResultPage() {
  const [, setLocation] = useLocation();
  const { project, setProject } = useProject();

  const segments = (project?.segments as any) || [
    {
      id: "1",
      number: 1,
      language: "English",
      text: project?.scriptContent || "123343543",
      translation: "-",
      description: "基于您提的诉愿输入，本视频是一个关于 Seedream 4.8 文生图...",
    },
  ];

  const handleNewCreation = () => {
    setProject(null);
    localStorage.removeItem("currentProjectId");
    setLocation("/");
  };

  const currentStep = project?.currentStep || 7;
  const steps = [
    { number: 1, label: "风格定制", isCompleted: currentStep > 1, isCurrent: currentStep === 1 },
    { number: 2, label: "输入文案", isCompleted: currentStep > 2, isCurrent: currentStep === 2 },
    { number: 3, label: "智能分段", isCompleted: currentStep > 3, isCurrent: currentStep === 3 },
    { number: 4, label: "选择流程", isCompleted: currentStep > 4, isCurrent: currentStep === 4 },
    { number: 5, label: "生成描述", isCompleted: currentStep > 5, isCurrent: currentStep === 5 },
    { number: 6, label: "生成素材", isCompleted: currentStep > 6, isCurrent: currentStep === 6 },
    { number: 7, label: "导出成片", isCompleted: currentStep > 7, isCurrent: currentStep === 7 },
  ];

  return (
    <div className="min-h-screen bg-background">
      <TopNavbar />
      <StepProgress steps={steps} />
      
      <main className="container mx-auto max-w-7xl px-6 pb-16">
        <Button
          variant="ghost"
          onClick={() => setLocation("/ai-original/materials")}
          className="mb-6"
          data-testid="button-back"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          返回上一步
        </Button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-2">
                生成图片
              </h1>
              <p className="text-muted-foreground">
                共 1 个分镜
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
                        data-testid={`row-result-${segment.number}`}
                      >
                        <td className="px-4 py-4">
                          <Badge variant="secondary" className="font-mono">
                            #{segment.number}
                          </Badge>
                        </td>
                        <td className="px-4 py-4">
                          <p className="text-sm text-foreground">{segment.text}</p>
                          <p className="text-xs text-muted-foreground mt-1">{segment.language}</p>
                        </td>
                        <td className="px-4 py-4 text-sm text-muted-foreground">{segment.translation}</td>
                        <td className="px-4 py-4">
                          <div className="max-w-sm">
                            <p className="text-sm text-foreground line-clamp-2">{segment.description}</p>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex gap-2">
                            <Button variant="ghost" size="sm" data-testid={`button-generate-image-${segment.number}`}>
                              视频生成图片
                            </Button>
                            <Button variant="ghost" size="sm" data-testid={`button-generate-video-${segment.number}`}>
                              视频生成视频
                            </Button>
                            <Button variant="ghost" size="sm" data-testid={`button-video-${segment.number}`}>
                              生成
                            </Button>
                            <Button variant="ghost" size="sm" data-testid={`button-edit-desc-${segment.number}`}>
                              编辑
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>

          <div className="lg:col-span-1">
            <Card className="border border-card-border p-6 sticky top-24">
              <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center">
                <Download className="mr-2 h-5 w-5" />
                导出成片
              </h2>

              <div className="space-y-4">
                <div className="p-4 bg-muted/50 rounded-lg">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-muted-foreground">总分镜数</span>
                    <span className="text-2xl font-bold text-foreground" data-testid="text-total-segments">1</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">总时长</span>
                    <span className="text-2xl font-bold text-foreground" data-testid="text-duration">0:5</span>
                  </div>
                </div>

                <Button className="w-full" size="lg" data-testid="button-download-zip">
                  <Download className="mr-2 h-5 w-5" />
                  下载所有视频(ZIP)
                </Button>

                <Button variant="outline" className="w-full" data-testid="button-export-screenshots">
                  <Camera className="mr-2 h-5 w-5" />
                  导出镜头截图
                </Button>

                <Button variant="outline" className="w-full" onClick={() => handleNewCreation()} data-testid="button-new-creation">
                  <RefreshCw className="mr-2 h-5 w-5" />
                  开始新创作
                </Button>

                <Collapsible>
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" className="w-full justify-between" data-testid="button-faq">
                      <span>如何导入到剪辑?</span>
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="mt-2">
                    <Card className="p-4 bg-muted/30 border-muted-foreground/20">
                      <p className="text-sm text-muted-foreground">
                        下载ZIP文件后，解压到本地，然后在剪辑软件中导入视频片段即可。
                      </p>
                    </Card>
                  </CollapsibleContent>
                </Collapsible>
              </div>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
