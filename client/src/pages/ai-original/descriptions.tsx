import { useState } from "react";
import { useLocation } from "wouter";
import { TopNavbar } from "@/components/top-navbar";
import { StepProgress } from "@/components/step-progress";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, ArrowRight, Sparkles, Edit, Image as ImageIcon, Video, Loader2, Download, FileDown, ChevronDown, RefreshCw, ZoomIn } from "lucide-react";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function DescriptionsPage() {
  const [, setLocation] = useLocation();
  const { project, updateSegments, updateAspectRatio } = useProject();
  const { toast } = useToast();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editedDescription, setEditedDescription] = useState("");
  const [generatingImages, setGeneratingImages] = useState<Set<string>>(new Set());
  const [generatingVideos, setGeneratingVideos] = useState<Set<string>>(new Set());
  const [batchGeneratingDescriptions, setBatchGeneratingDescriptions] = useState(false);
  const [batchGeneratingImages, setBatchGeneratingImages] = useState(false);
  const [batchGeneratingVideos, setBatchGeneratingVideos] = useState(false);
  const [currentGeneratingDescId, setCurrentGeneratingDescId] = useState<string | null>(null);
  const [currentGeneratingImageId, setCurrentGeneratingImageId] = useState<string | null>(null);
  const [currentGeneratingVideoId, setCurrentGeneratingVideoId] = useState<string | null>(null);
  const [previewImage, setPreviewImage] = useState<{ url: string; number: number } | null>(null);
  const [shouldStopDescriptions, setShouldStopDescriptions] = useState(false);
  const [shouldStopImages, setShouldStopImages] = useState(false);
  const [shouldStopVideos, setShouldStopVideos] = useState(false);

  const segments = (project?.segments as Segment[]) || [];
  const generationMode = project?.generationMode || "text-to-image-to-video";
  const isTextToVideo = generationMode === "text-to-video";
  const aspectRatio = project?.aspectRatio || "16:9";
  const totalDuration = Math.ceil(segments.length * 5);
  const minutes = Math.floor(totalDuration / 60);
  const seconds = totalDuration % 60;

  // 获取比例的方向描述
  const getOrientationText = (ratio: string) => {
    if (ratio === '9:16' || ratio === '3:4') return '竖屏';
    if (ratio === '1:1') return '方形';
    return '横屏';
  };

  // 更新画面比例
  const handleAspectRatioChange = async (newRatio: string) => {
    console.log("[AspectRatio Change] From:", aspectRatio, "To:", newRatio);
    
    // 立即更新比例状态
    updateAspectRatio(newRatio);
    
    // 立即保存到后端，确保project对象同步
    if (project?.id) {
      try {
        await apiRequest("PATCH", `/api/projects/${project.id}`, {
          ...project,
          aspectRatio: newRatio,
        });
        console.log("[AspectRatio Saved] Project updated with:", newRatio);
        
        // 检查是否有已生成的描述词
        const hasDescriptions = segments.some(s => s.sceneDescription);
        if (hasDescriptions) {
          toast({
            title: "比例已更新",
            description: "已有描述词将显示警告标识，建议重新生成",
            variant: "default",
          });
        }
      } catch (error) {
        console.error("Failed to save aspect ratio immediately:", error);
      }
    }
  };

  // 生成描述API调用
  const generateDescriptionMutation = useMutation({
    mutationFn: async (segmentId: string) => {
      const segment = segments.find(s => s.id === segmentId);
      if (!segment) throw new Error("Segment not found");

      // 确保使用最新的aspectRatio
      const currentAspectRatio = project?.aspectRatio || "16:9";
      console.log("[Frontend] Generating description with aspectRatio:", currentAspectRatio);

      const response = await apiRequest(
        "POST",
        "/api/descriptions/generate",
        {
          text: segment.text,
          translation: segment.translation,
          language: segment.language,
          generationMode: generationMode,
          aspectRatio: currentAspectRatio,
          styleSettings: project?.styleSettings,
        }
      );
      const data = await response.json();
      return { segmentId, description: data.description };
    },
    onSuccess: async ({ segmentId, description }) => {
      const currentAspectRatio = project?.aspectRatio || "16:9";
      const updatedSegments = segments.map(seg =>
        seg.id === segmentId ? { 
          ...seg, 
          sceneDescription: description,
          descriptionAspectRatio: currentAspectRatio // 记录生成时的比例
        } : seg
      );
      updateSegments(updatedSegments);
      
      // 自动保存项目
      if (project?.id) {
        try {
          await apiRequest("PATCH", `/api/projects/${project.id}`, {
            ...project,
            segments: updatedSegments,
          });
        } catch (error) {
          console.error("Failed to save project:", error);
        }
      }
      
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

  // 生成单个图片
  const generateSingleImage = async (segmentId: string, currentSegments?: Segment[]) => {
    const segs = currentSegments || segments;
    const segment = segs.find(s => s.id === segmentId);
    if (!segment?.sceneDescription) {
      toast({
        title: "提示",
        description: "请先生成场景描述",
        variant: "destructive",
      });
      return segs;
    }

    setGeneratingImages(prev => new Set(prev).add(segmentId));

    try {
      const response = await apiRequest(
        "POST",
        "/api/images/generate",
        {
          prompt: segment.sceneDescription,
          aspectRatio: aspectRatio,
        }
      );
      const data = await response.json();
      
      const updatedSegments = segs.map(seg =>
        seg.id === segmentId ? { ...seg, imageUrl: data.imageUrl } : seg
      );
      updateSegments(updatedSegments);
      
      // 自动保存项目
      if (project?.id) {
        try {
          await apiRequest("PATCH", `/api/projects/${project.id}`, {
            ...project,
            segments: updatedSegments,
          });
        } catch (error) {
          console.error("Failed to save project:", error);
        }
      }
      
      toast({
        title: "生成成功",
        description: "图片已生成",
      });
      
      return updatedSegments;
    } catch (error) {
      toast({
        title: "生成失败",
        description: error instanceof Error ? error.message : "请稍后重试",
        variant: "destructive",
      });
      return segs;
    } finally {
      setGeneratingImages(prev => {
        const next = new Set(prev);
        next.delete(segmentId);
        return next;
      });
    }
  };

  // 批量生成描述词
  const handleBatchGenerateDescriptions = async () => {
    // 过滤出：没有描述词 OR 比例不匹配的片段
    const segmentsToGenerate = segments.filter(s => 
      !s.sceneDescription || // 没有描述词
      (s.descriptionAspectRatio && s.descriptionAspectRatio !== aspectRatio) // 比例不匹配
    );
    
    if (segmentsToGenerate.length === 0) {
      toast({
        title: "提示",
        description: "所有镜头已有匹配的描述",
      });
      return;
    }

    setBatchGeneratingDescriptions(true);
    setShouldStopDescriptions(false); // 重置停止标志
    let currentSegments = [...segments];
    let generatedCount = 0;

    for (const segment of segmentsToGenerate) {
      // 检查是否需要停止
      if (shouldStopDescriptions) {
        console.log("[Batch] Stopped descriptions generation by user");
        break;
      }

      setCurrentGeneratingDescId(segment.id);
      try {
        // 确保使用最新的aspectRatio
        const currentAspectRatio = project?.aspectRatio || "16:9";
        console.log("[Frontend Batch] Generating description with aspectRatio:", currentAspectRatio);
        
        const response = await apiRequest(
          "POST",
          "/api/descriptions/generate",
          {
            text: segment.text,
            translation: segment.translation,
            language: segment.language,
            generationMode: generationMode,
            aspectRatio: currentAspectRatio,
            styleSettings: project?.styleSettings,
          }
        );
        const data = await response.json();
        
        currentSegments = currentSegments.map(seg =>
          seg.id === segment.id ? { 
            ...seg, 
            sceneDescription: data.description,
            descriptionAspectRatio: currentAspectRatio // 记录生成时的比例
          } : seg
        );
        updateSegments(currentSegments);
        generatedCount++;
      } catch (error) {
        console.error("Failed to generate description:", error);
      }
    }

    // 保存项目
    if (project?.id) {
      try {
        await apiRequest("PATCH", `/api/projects/${project.id}`, {
          ...project,
          segments: currentSegments,
        });
      } catch (error) {
        console.error("Failed to save project:", error);
      }
    }

    setCurrentGeneratingDescId(null);
    setBatchGeneratingDescriptions(false);
    setShouldStopDescriptions(false);
    
    const message = shouldStopDescriptions 
      ? `已停止，成功生成 ${generatedCount} 个描述`
      : `成功生成 ${generatedCount} 个描述`;
    
    toast({
      title: shouldStopDescriptions ? "已停止生成" : "批量生成完成",
      description: message,
    });
  };

  // 批量生成图片
  const handleBatchGenerateImages = async () => {
    const segmentsWithDescription = segments.filter(s => s.sceneDescription && !s.imageUrl);
    
    if (segmentsWithDescription.length === 0) {
      toast({
        title: "提示",
        description: "没有需要生成图片的镜头",
      });
      return;
    }

    setBatchGeneratingImages(true);
    setShouldStopImages(false); // 重置停止标志
    let currentSegments = [...segments];
    let generatedCount = 0;

    for (const segment of segmentsWithDescription) {
      // 检查是否需要停止
      if (shouldStopImages) {
        console.log("[Batch] Stopped images generation by user");
        break;
      }

      setCurrentGeneratingImageId(segment.id);
      const updated = await generateSingleImage(segment.id, currentSegments);
      if (updated) {
        currentSegments = updated;
        generatedCount++;
      }
    }

    setCurrentGeneratingImageId(null);
    setBatchGeneratingImages(false);
    setShouldStopImages(false);
    
    const message = shouldStopImages 
      ? `已停止，成功生成 ${generatedCount} 张图片`
      : `成功生成 ${generatedCount} 张图片`;
    
    toast({
      title: shouldStopImages ? "已停止生成" : "批量生成完成",
      description: message,
    });
  };

  // 生成单个视频
  const generateSingleVideo = async (segmentId: string) => {
    const segment = segments.find(s => s.id === segmentId);
    
    // 根据生成模式检查前置条件
    if (isTextToVideo) {
      // 文生视频：需要场景描述
      if (!segment?.sceneDescription) {
        toast({
          title: "提示",
          description: "请先生成场景描述",
          variant: "destructive",
        });
        return;
      }
    } else {
      // 文生图+图生视频：需要图片
      if (!segment?.imageUrl) {
        toast({
          title: "提示",
          description: "请先生成图片",
          variant: "destructive",
        });
        return;
      }
    }

    setGeneratingVideos(prev => new Set(prev).add(segmentId));

    try {
      // TODO: 实现真正的视频生成API
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const videoUrl = isTextToVideo ? segment.sceneDescription : segment.imageUrl;
      const updatedSegments = segments.map(seg =>
        seg.id === segmentId ? { ...seg, videoUrl } : seg
      );
      updateSegments(updatedSegments);
      
      // 自动保存项目
      if (project?.id) {
        try {
          await apiRequest("PATCH", `/api/projects/${project.id}`, {
            ...project,
            segments: updatedSegments,
          });
        } catch (error) {
          console.error("Failed to save project:", error);
        }
      }
      
      toast({
        title: "生成成功",
        description: "视频已生成",
      });
    } catch (error) {
      toast({
        title: "生成失败",
        description: error instanceof Error ? error.message : "请稍后重试",
        variant: "destructive",
      });
    } finally {
      setGeneratingVideos(prev => {
        const next = new Set(prev);
        next.delete(segmentId);
        return next;
      });
    }
  };

  // 批量生成视频
  const handleBatchGenerateVideos = async () => {
    // 根据生成模式筛选可生成视频的片段
    const segmentsToGenerate = isTextToVideo
      ? segments.filter(s => s.sceneDescription && !s.videoUrl)  // 文生视频：需要描述
      : segments.filter(s => s.imageUrl && !s.videoUrl);  // 文生图+图生视频：需要图片
    
    if (segmentsToGenerate.length === 0) {
      toast({
        title: "提示",
        description: "没有需要生成视频的镜头",
      });
      return;
    }

    setBatchGeneratingVideos(true);
    setShouldStopVideos(false); // 重置停止标志
    let generatedCount = 0;

    for (const segment of segmentsToGenerate) {
      // 检查是否需要停止
      if (shouldStopVideos) {
        console.log("[Batch] Stopped videos generation by user");
        break;
      }

      setCurrentGeneratingVideoId(segment.id);
      await generateSingleVideo(segment.id);
      generatedCount++;
    }

    setCurrentGeneratingVideoId(null);
    setBatchGeneratingVideos(false);
    setShouldStopVideos(false);
    
    const message = shouldStopVideos 
      ? `已停止，成功生成 ${generatedCount} 个视频`
      : `成功生成 ${generatedCount} 个视频`;
    
    toast({
      title: shouldStopVideos ? "已停止生成" : "批量生成完成",
      description: message,
    });
  };

  const handleEdit = (segment: Segment) => {
    setEditingId(segment.id);
    setEditedDescription(segment.sceneDescription || "");
  };

  const handleSaveEdit = async (segmentId: string) => {
    const updatedSegments = segments.map(seg =>
      seg.id === segmentId ? { ...seg, sceneDescription: editedDescription } : seg
    );
    updateSegments(updatedSegments);
    
    // 自动保存项目
    if (project?.id) {
      try {
        await apiRequest("PATCH", `/api/projects/${project.id}`, {
          ...project,
          segments: updatedSegments,
        });
      } catch (error) {
        console.error("Failed to save project:", error);
      }
    }
    
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
          onClick={() => setLocation("/ai-original/generation-mode")}
          className="mb-6"
          data-testid="button-back"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          返回上一步
        </Button>

        <div className="flex gap-6">
          {/* 左侧主要内容 */}
          <div className="flex-1">
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-foreground mb-1">
                生成素材
              </h1>
              <p className="text-sm text-muted-foreground">
                共 {segments.length} 个镜头
              </p>
            </div>

            {/* 比例选择器 */}
            <div className="mb-4 flex items-center gap-3">
              <span className="text-sm text-muted-foreground">画面比例：</span>
              <Select value={aspectRatio} onValueChange={handleAspectRatioChange}>
                <SelectTrigger className="w-32" data-testid="select-aspect-ratio">
                  <SelectValue placeholder="选择比例" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="9:16">9:16 竖屏</SelectItem>
                  <SelectItem value="3:4">3:4 竖屏</SelectItem>
                  <SelectItem value="1:1">1:1 方形</SelectItem>
                  <SelectItem value="16:9">16:9 横屏</SelectItem>
                  <SelectItem value="4:3">4:3 横屏</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* 表格容器 */}
            <div className="border border-border rounded-lg overflow-hidden">
              {/* 表头 */}
              <div className="grid grid-cols-8 gap-0 bg-muted/30 border-b border-border">
                <div className="col-span-1 p-3 text-sm text-muted-foreground border-r border-border">编号</div>
                <div className="col-span-2 p-3 text-sm text-muted-foreground border-r border-border">文案</div>
                <div className="col-span-2 p-3 text-sm text-muted-foreground border-r border-border">翻译</div>
                <div className="col-span-3 p-3">
                  <Button
                    size="sm"
                    onClick={batchGeneratingDescriptions ? () => setShouldStopDescriptions(true) : handleBatchGenerateDescriptions}
                    disabled={!batchGeneratingDescriptions && segments.every(s => 
                      s.sceneDescription && (!s.descriptionAspectRatio || s.descriptionAspectRatio === aspectRatio)
                    )}
                    className="w-full"
                    data-testid="button-batch-generate-descriptions"
                  >
                    {batchGeneratingDescriptions ? (
                      <>
                        <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                        生成中...（停止）
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-3 w-3 mr-1" />
                        批量生成描述词
                      </>
                    )}
                  </Button>
                </div>
              </div>

              {/* 片段列表 */}
              {segments.map((segment, index) => (
                <div key={segment.id} className={`grid grid-cols-8 gap-0 ${index !== segments.length - 1 ? 'border-b border-border' : ''}`} data-testid={`row-segment-${segment.number}`}>
                  {/* 编号 */}
                  <div className="col-span-1 p-3 border-r border-border flex items-center">
                    <Badge variant="secondary" className="font-mono">
                      #{segment.number}
                    </Badge>
                  </div>

                  {/* 文案 */}
                  <div className="col-span-2 p-3 border-r border-border">
                    <p className="text-sm text-foreground">{segment.text}</p>
                    <Badge variant="outline" className="text-xs mt-1">
                      {segment.language}
                    </Badge>
                  </div>

                  {/* 翻译 */}
                  <div className="col-span-2 p-3 border-r border-border">
                    {segment.translation && (
                      <p className="text-sm text-muted-foreground">
                        {segment.translation}
                      </p>
                    )}
                  </div>

                  {/* 分镜描述 */}
                  <div className="col-span-3 p-3">
                    {editingId === segment.id ? (
                      <div className="space-y-2">
                        <Textarea
                          value={editedDescription}
                          onChange={(e) => setEditedDescription(e.target.value)}
                          className="min-h-[100px] font-mono text-xs"
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
                      <div className="relative group">
                        {segment.sceneDescription ? (
                          <>
                            {/* 比例不匹配警告 */}
                            {segment.descriptionAspectRatio && segment.descriptionAspectRatio !== aspectRatio && (
                              <div className="flex items-center gap-1 text-amber-500 text-xs mb-2 font-medium">
                                <span>⚠️ 比例已变更（{segment.descriptionAspectRatio} → {aspectRatio}），建议重新生成</span>
                              </div>
                            )}
                            <div className="bg-muted rounded-md p-3 font-mono text-xs text-foreground leading-relaxed max-h-32 overflow-y-auto">
                              {segment.sceneDescription}
                            </div>
                            <div className="flex gap-1 mt-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleEdit(segment)}
                                className="flex-1"
                                data-testid={`button-edit-${segment.number}`}
                              >
                                <Edit className="h-3 w-3 mr-1" />
                                编辑
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => generateDescriptionMutation.mutate(segment.id)}
                                disabled={generateDescriptionMutation.isPending || batchGeneratingDescriptions}
                                className="flex-1"
                                data-testid={`button-regenerate-description-${segment.number}`}
                              >
                                <RefreshCw className="h-3 w-3 mr-1" />
                                重新生成
                              </Button>
                            </div>
                          </>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => generateDescriptionMutation.mutate(segment.id)}
                            disabled={generateDescriptionMutation.isPending || batchGeneratingDescriptions}
                            className="w-full"
                            data-testid={`button-generate-description-${segment.number}`}
                          >
                            {(generateDescriptionMutation.isPending && generateDescriptionMutation.variables === segment.id) || currentGeneratingDescId === segment.id ? (
                              <>
                                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                生成中
                              </>
                            ) : batchGeneratingDescriptions && !segment.sceneDescription ? (
                              <>
                                <Loader2 className="h-3 w-3 mr-1 animate-spin opacity-50" />
                                等待生成
                              </>
                            ) : (
                              <>
                                <Sparkles className="h-3 w-3 mr-1" />
                                生成描述
                              </>
                            )}
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 右侧下一步面板 */}
          <div className="w-80 flex-shrink-0">
            <Card className="p-6 sticky top-24">
              <h2 className="text-lg font-semibold mb-4">下一步</h2>
              
              <p className="text-sm text-muted-foreground mb-6">
                描述词生成完成后，继续生成图片和视频素材
              </p>

              <Button
                className="w-full"
                size="lg"
                onClick={() => setLocation("/ai-original/materials")}
                data-testid="button-next-materials"
              >
                <ArrowRight className="h-4 w-4 mr-2" />
                进入素材生成
              </Button>
            </Card>
          </div>
        </div>
      </main>

      {/* 图片预览Dialog */}
      <Dialog open={!!previewImage} onOpenChange={() => setPreviewImage(null)}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>分镜 #{previewImage?.number} - 图片预览</DialogTitle>
          </DialogHeader>
          {previewImage && (
            <div className="relative w-full">
              <img 
                src={previewImage.url} 
                alt={`Scene ${previewImage.number}`}
                className="w-full h-auto rounded-md"
                data-testid="dialog-preview-image"
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
