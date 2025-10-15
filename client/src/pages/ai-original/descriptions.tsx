import { useState } from "react";
import { useLocation } from "wouter";
import { TopNavbar } from "@/components/top-navbar";
import { StepProgress } from "@/components/step-progress";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Sparkles, Edit, Download, FileDown, ChevronDown } from "lucide-react";
import { useProject } from "@/hooks/use-project";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Segment } from "@shared/schema";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

export default function DescriptionsPage() {
  const [, setLocation] = useLocation();
  const { project, updateSegments } = useProject();
  const { toast } = useToast();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editedDescription, setEditedDescription] = useState("");

  const segments = (project?.segments as Segment[]) || [];
  const totalDuration = Math.ceil(segments.length * 5); // 假设每个片段5秒
  const minutes = Math.floor(totalDuration / 60);
  const seconds = totalDuration % 60;

  // 生成描述API调用
  const generateDescriptionMutation = useMutation({
    mutationFn: async (segmentId: string) => {
      const segment = segments.find(s => s.id === segmentId);
      if (!segment) throw new Error("Segment not found");

      const response = await apiRequest(
        "POST",
        "/api/descriptions/generate",
        {
          text: segment.text,
          translation: segment.translation,
          language: segment.language,
        }
      );
      const data = await response.json();
      return { segmentId, description: data.description };
    },
    onSuccess: ({ segmentId, description }) => {
      const updatedSegments = segments.map(seg =>
        seg.id === segmentId ? { ...seg, sceneDescription: description } : seg
      );
      updateSegments(updatedSegments);
      toast({
        title: "生成成功",
        description: "分镜描述已生成",
      });
    },
    onError: () => {
      toast({
        title: "生成失败",
        description: "请稍后重试",
        variant: "destructive",
      });
    },
  });

  const handleEdit = (segment: Segment) => {
    setEditingId(segment.id);
    setEditedDescription(segment.sceneDescription || "");
  };

  const handleSaveEdit = (segmentId: string) => {
    const updatedSegments = segments.map(seg =>
      seg.id === segmentId ? { ...seg, sceneDescription: editedDescription } : seg
    );
    updateSegments(updatedSegments);
    setEditingId(null);
    setEditedDescription("");
    toast({
      title: "保存成功",
      description: "描述已更新",
    });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditedDescription("");
  };

  const currentStep = project?.currentStep || 5;
  const steps = [
    { number: 1, label: "风格定制", isCompleted: currentStep > 1, isCurrent: currentStep === 1 },
    { number: 2, label: "输入文案", isCompleted: currentStep > 2, isCurrent: currentStep === 2 },
    { number: 3, label: "智能分段", isCompleted: currentStep > 3, isCurrent: currentStep === 3 },
    { number: 4, label: "生成模式", isCompleted: currentStep > 4, isCurrent: currentStep === 4 },
    { number: 5, label: "生成描述", isCompleted: currentStep > 5, isCurrent: currentStep === 5 },
    { number: 6, label: "生成图片", isCompleted: currentStep > 6, isCurrent: currentStep === 6 },
  ];

  return (
    <div className="min-h-screen bg-background">
      <TopNavbar />
      <StepProgress steps={steps} />
      
      <main className="container mx-auto max-w-7xl px-6 pb-16">
        <Button
          variant="ghost"
          onClick={() => setLocation("/ai-original/segments")}
          className="mb-6"
          data-testid="button-back"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          返回上一步
        </Button>

        <div className="flex gap-6">
          {/* 左侧主要内容 */}
          <div className="flex-1">
            <div className="mb-8">
              <h1 className="text-2xl font-bold text-foreground mb-2">
                生成图片
              </h1>
              <p className="text-sm text-muted-foreground">
                共 {segments.length} 个镜头
              </p>
            </div>

            {/* 标签栏 */}
            <div className="flex gap-4 mb-4 text-sm text-muted-foreground">
              <span className="w-16">编号</span>
              <span className="flex-1">文案</span>
              <span className="w-32">翻译</span>
              <span className="flex-1">分镜画面描述词</span>
            </div>

            {/* 片段卡片列表 */}
            <div className="space-y-4">
              {segments.map((segment, index) => (
                <Card key={segment.id} className="p-4" data-testid={`card-segment-${segment.number}`}>
                  <div className="flex gap-4">
                    {/* 编号 */}
                    <div className="w-16 flex-shrink-0">
                      <Badge variant="secondary" className="font-mono">
                        #{segment.number}
                      </Badge>
                    </div>

                    {/* 文案 */}
                    <div className="flex-1">
                      <div className="mb-2">
                        <p className="text-sm text-foreground mb-1">{segment.text}</p>
                        <Badge variant="outline" className="text-xs">
                          {segment.language}
                        </Badge>
                      </div>
                    </div>

                    {/* 翻译 */}
                    <div className="w-32 flex-shrink-0">
                      {segment.translation && (
                        <p className="text-sm text-muted-foreground">
                          {segment.translation}
                        </p>
                      )}
                    </div>

                    {/* 分镜描述 */}
                    <div className="flex-1">
                      {editingId === segment.id ? (
                        <div className="space-y-2">
                          <Textarea
                            value={editedDescription}
                            onChange={(e) => setEditedDescription(e.target.value)}
                            className="min-h-[100px] font-mono text-sm"
                            data-testid={`textarea-description-${segment.number}`}
                          />
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={() => handleSaveEdit(segment.id)}
                              data-testid={`button-save-${segment.number}`}
                            >
                              保存
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={handleCancelEdit}
                              data-testid={`button-cancel-${segment.number}`}
                            >
                              取消
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <>
                          {segment.sceneDescription ? (
                            <div className="bg-muted rounded-md p-3 font-mono text-xs text-foreground whitespace-pre-wrap">
                              {segment.sceneDescription}
                            </div>
                          ) : (
                            <div className="text-sm text-muted-foreground">
                              暂未生成描述
                            </div>
                          )}
                          <div className="flex gap-2 mt-2">
                            <Button
                              size="sm"
                              variant="default"
                              onClick={() => generateDescriptionMutation.mutate(segment.id)}
                              disabled={generateDescriptionMutation.isPending}
                              data-testid={`button-generate-${segment.number}`}
                            >
                              <Sparkles className="h-3 w-3 mr-1" />
                              {generateDescriptionMutation.isPending && generateDescriptionMutation.variables === segment.id
                                ? "生成中..."
                                : "生成"}
                            </Button>
                            {segment.sceneDescription && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleEdit(segment)}
                                data-testid={`button-edit-${segment.number}`}
                              >
                                <Edit className="h-3 w-3 mr-1" />
                                编辑
                              </Button>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>

          {/* 右侧导出面板 */}
          <div className="w-80 flex-shrink-0">
            <Card className="p-6 sticky top-24">
              <div className="flex items-center gap-2 mb-6">
                <Download className="h-5 w-5" />
                <h2 className="text-lg font-semibold">导出成片</h2>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">总分镜数</p>
                  <p className="text-2xl font-bold" data-testid="text-total-segments">
                    {segments.length}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">总时长</p>
                  <p className="text-2xl font-bold" data-testid="text-total-duration">
                    {minutes}:{seconds.toString().padStart(2, '0')}
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <Button
                  className="w-full"
                  variant="default"
                  data-testid="button-download-zip"
                >
                  <FileDown className="h-4 w-4 mr-2" />
                  下载所有镜头 (ZIP)
                </Button>
                <Button
                  className="w-full"
                  variant="outline"
                  data-testid="button-export-draft"
                >
                  <FileDown className="h-4 w-4 mr-2" />
                  导出剪映草稿
                </Button>
              </div>

              <Collapsible className="mt-4">
                <CollapsibleTrigger className="flex items-center justify-between w-full p-3 rounded-md hover-elevate">
                  <span className="text-sm text-foreground">如何导入剪映？</span>
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-2 p-3 bg-muted/50 rounded-md">
                  <ol className="text-sm text-muted-foreground space-y-2">
                    <li>1. 下载剪映草稿文件</li>
                    <li>2. 打开剪映专业版</li>
                    <li>3. 导入草稿文件</li>
                    <li>4. 开始编辑视频</li>
                  </ol>
                </CollapsibleContent>
              </Collapsible>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
