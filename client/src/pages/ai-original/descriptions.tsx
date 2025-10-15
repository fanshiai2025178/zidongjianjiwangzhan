import { useState } from "react";
import { useLocation } from "wouter";
import { TopNavbar } from "@/components/top-navbar";
import { StepProgress } from "@/components/step-progress";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Sparkles, Edit, Image as ImageIcon, Video, Loader2, Check, ChevronDown } from "lucide-react";
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
  const totalDuration = Math.ceil(segments.length * 5);
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

  // 生成图片API调用
  const generateImageMutation = useMutation({
    mutationFn: async (segmentId: string) => {
      const segment = segments.find(s => s.id === segmentId);
      if (!segment?.sceneDescription) {
        throw new Error("请先生成场景描述");
      }

      const response = await apiRequest(
        "POST",
        "/api/images/generate",
        {
          prompt: segment.sceneDescription,
        }
      );
      const data = await response.json();
      return { segmentId, imageUrl: data.imageUrl };
    },
    onSuccess: ({ segmentId, imageUrl }) => {
      const updatedSegments = segments.map(seg =>
        seg.id === segmentId ? { ...seg, imageUrl } : seg
      );
      updateSegments(updatedSegments);
      toast({
        title: "生成成功",
        description: "图片已生成",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "生成失败",
        description: error.message || "请稍后重试",
        variant: "destructive",
      });
    },
  });

  // 生成视频API调用（暂时使用占位符）
  const generateVideoMutation = useMutation({
    mutationFn: async (segmentId: string) => {
      const segment = segments.find(s => s.id === segmentId);
      if (!segment?.imageUrl) {
        throw new Error("请先生成图片");
      }

      // TODO: 实现真正的视频生成API
      await new Promise(resolve => setTimeout(resolve, 2000));
      return { segmentId, videoUrl: segment.imageUrl };
    },
    onSuccess: ({ segmentId, videoUrl }) => {
      const updatedSegments = segments.map(seg =>
        seg.id === segmentId ? { ...seg, videoUrl } : seg
      );
      updateSegments(updatedSegments);
      toast({
        title: "生成成功",
        description: "视频已生成",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "生成失败",
        description: error.message || "请稍后重试",
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

  const handleComplete = () => {
    toast({
      title: "创作完成",
      description: "所有镜头已生成完毕，您可以导出视频了",
    });
  };

  const allHaveDescriptions = segments.every(seg => seg.sceneDescription);
  const allHaveImages = segments.every(seg => seg.imageUrl);
  const allHaveVideos = segments.every(seg => seg.videoUrl);

  const currentStep = project?.currentStep || 5;
  const steps = [
    { number: 1, label: "风格定制", isCompleted: currentStep > 1, isCurrent: currentStep === 1 },
    { number: 2, label: "输入文案", isCompleted: currentStep > 2, isCurrent: currentStep === 2 },
    { number: 3, label: "智能分段", isCompleted: currentStep > 3, isCurrent: currentStep === 3 },
    { number: 4, label: "生成模式", isCompleted: currentStep > 4, isCurrent: currentStep === 4 },
    { number: 5, label: "生成描述", isCompleted: currentStep > 5, isCurrent: currentStep === 5 },
    { number: 6, label: "生成成片", isCompleted: currentStep > 6, isCurrent: currentStep === 6 },
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
                生成图片和视频
              </h1>
              <p className="text-sm text-muted-foreground">
                共 {segments.length} 个镜头 · 为每个镜头生成描述、图片和视频
              </p>
            </div>

            {/* 片段卡片列表 */}
            <div className="space-y-4">
              {segments.map((segment, index) => (
                <Card key={segment.id} className="p-6" data-testid={`card-segment-${segment.number}`}>
                  <div className="space-y-4">
                    {/* 头部：编号和文案 */}
                    <div className="flex items-start gap-4">
                      <Badge variant="secondary" className="font-mono">
                        #{segment.number}
                      </Badge>
                      <div className="flex-1">
                        <p className="text-sm text-foreground mb-1">{segment.text}</p>
                        {segment.translation && (
                          <p className="text-xs text-muted-foreground">{segment.translation}</p>
                        )}
                      </div>
                    </div>

                    {/* 分镜描述 */}
                    <div className="border-t pt-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-foreground">分镜画面描述</span>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="default"
                            onClick={() => generateDescriptionMutation.mutate(segment.id)}
                            disabled={generateDescriptionMutation.isPending}
                            data-testid={`button-generate-description-${segment.number}`}
                          >
                            {generateDescriptionMutation.isPending && generateDescriptionMutation.variables === segment.id ? (
                              <>
                                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                生成中...
                              </>
                            ) : (
                              <>
                                <Sparkles className="h-3 w-3 mr-1" />
                                生成描述
                              </>
                            )}
                          </Button>
                          {segment.sceneDescription && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleEdit(segment)}
                              data-testid={`button-edit-description-${segment.number}`}
                            >
                              <Edit className="h-3 w-3 mr-1" />
                              编辑
                            </Button>
                          )}
                        </div>
                      </div>
                      
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
                            <div className="text-sm text-muted-foreground bg-muted/50 rounded-md p-3">
                              点击"生成描述"按钮创建场景描述
                            </div>
                          )}
                        </>
                      )}
                    </div>

                    {/* 图片生成 */}
                    <div className="border-t pt-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-foreground">图片</span>
                        <Button
                          size="sm"
                          variant="default"
                          onClick={() => generateImageMutation.mutate(segment.id)}
                          disabled={!segment.sceneDescription || generateImageMutation.isPending}
                          data-testid={`button-generate-image-${segment.number}`}
                        >
                          {generateImageMutation.isPending && generateImageMutation.variables === segment.id ? (
                            <>
                              <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                              生成中...
                            </>
                          ) : (
                            <>
                              <ImageIcon className="h-3 w-3 mr-1" />
                              生成图片
                            </>
                          )}
                        </Button>
                      </div>
                      {segment.imageUrl ? (
                        <div className="relative rounded-md overflow-hidden bg-muted">
                          <img 
                            src={segment.imageUrl} 
                            alt={`镜头${segment.number}`}
                            className="w-full h-48 object-cover"
                            data-testid={`image-preview-${segment.number}`}
                          />
                          <div className="absolute top-2 right-2">
                            <Badge variant="secondary" className="bg-background/80">
                              <Check className="h-3 w-3 mr-1" />
                              已生成
                            </Badge>
                          </div>
                        </div>
                      ) : (
                        <div className="text-sm text-muted-foreground bg-muted/50 rounded-md p-3 h-48 flex items-center justify-center">
                          {segment.sceneDescription ? '点击"生成图片"按钮创建图片' : "请先生成场景描述"}
                        </div>
                      )}
                    </div>

                    {/* 视频生成 */}
                    <div className="border-t pt-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-foreground">视频</span>
                        <Button
                          size="sm"
                          variant="default"
                          onClick={() => generateVideoMutation.mutate(segment.id)}
                          disabled={!segment.imageUrl || generateVideoMutation.isPending}
                          data-testid={`button-generate-video-${segment.number}`}
                        >
                          {generateVideoMutation.isPending && generateVideoMutation.variables === segment.id ? (
                            <>
                              <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                              生成中...
                            </>
                          ) : (
                            <>
                              <Video className="h-3 w-3 mr-1" />
                              生成视频
                            </>
                          )}
                        </Button>
                      </div>
                      {segment.videoUrl ? (
                        <div className="relative rounded-md overflow-hidden bg-muted">
                          <video 
                            src={segment.videoUrl} 
                            controls
                            className="w-full h-48"
                            data-testid={`video-preview-${segment.number}`}
                          />
                          <div className="absolute top-2 right-2">
                            <Badge variant="secondary" className="bg-background/80">
                              <Check className="h-3 w-3 mr-1" />
                              已生成
                            </Badge>
                          </div>
                        </div>
                      ) : (
                        <div className="text-sm text-muted-foreground bg-muted/50 rounded-md p-3 h-48 flex items-center justify-center">
                          {segment.imageUrl ? '点击"生成视频"按钮创建视频' : "请先生成图片"}
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>

          {/* 右侧进度面板 */}
          <div className="w-80 flex-shrink-0">
            <Card className="p-6 sticky top-24">
              <h2 className="text-lg font-semibold mb-6">创作进度</h2>

              <div className="space-y-4 mb-6">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">场景描述</span>
                  <Badge variant={allHaveDescriptions ? "default" : "secondary"}>
                    {segments.filter(s => s.sceneDescription).length}/{segments.length}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">图片生成</span>
                  <Badge variant={allHaveImages ? "default" : "secondary"}>
                    {segments.filter(s => s.imageUrl).length}/{segments.length}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">视频生成</span>
                  <Badge variant={allHaveVideos ? "default" : "secondary"}>
                    {segments.filter(s => s.videoUrl).length}/{segments.length}
                  </Badge>
                </div>
              </div>

              <div className="border-t pt-4 mb-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">总镜头数</p>
                    <p className="text-2xl font-bold" data-testid="text-total-segments">
                      {segments.length}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">预计时长</p>
                    <p className="text-2xl font-bold" data-testid="text-total-duration">
                      {minutes}:{seconds.toString().padStart(2, '0')}
                    </p>
                  </div>
                </div>
              </div>

              <Button
                className="w-full"
                variant="default"
                disabled={!allHaveVideos}
                onClick={handleComplete}
                data-testid="button-complete"
              >
                {allHaveVideos ? (
                  <>
                    <Check className="h-4 w-4 mr-2" />
                    完成并导出
                  </>
                ) : (
                  "请完成所有镜头生成"
                )}
              </Button>

              {allHaveVideos && (
                <Collapsible className="mt-4">
                  <CollapsibleTrigger className="flex items-center justify-between w-full p-3 rounded-md hover-elevate">
                    <span className="text-sm text-foreground">下一步提示</span>
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  </CollapsibleTrigger>
                  <CollapsibleContent className="mt-2 p-3 bg-muted/50 rounded-md">
                    <p className="text-sm text-muted-foreground">
                      恭喜！所有镜头已生成完毕。您现在可以：
                    </p>
                    <ol className="text-sm text-muted-foreground space-y-2 mt-2">
                      <li>1. 导出为视频文件</li>
                      <li>2. 导出剪映草稿进行后期</li>
                      <li>3. 下载所有素材</li>
                    </ol>
                  </CollapsibleContent>
                </Collapsible>
              )}
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
