import { useState } from "react";
import { useLocation } from "wouter";
import { TopNavbar } from "@/components/top-navbar";
import { StepProgress } from "@/components/step-progress";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, ArrowRight, Sparkles, Image as ImageIcon, Video, Loader2, ZoomIn, RefreshCw } from "lucide-react";
import { useProject } from "@/hooks/use-project";
import { useToast } from "@/hooks/use-toast";
import { Segment } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function MaterialsPage() {
  const [, setLocation] = useLocation();
  const { project, updateSegments } = useProject();
  const { toast } = useToast();
  const [optimizingDescriptions, setOptimizingDescriptions] = useState<Set<string>>(new Set());
  const [generatingImages, setGeneratingImages] = useState<Set<string>>(new Set());
  const [generatingVideos, setGeneratingVideos] = useState<Set<string>>(new Set());
  const [batchOptimizing, setBatchOptimizing] = useState(false);
  const [batchGeneratingImages, setBatchGeneratingImages] = useState(false);
  const [batchGeneratingVideos, setBatchGeneratingVideos] = useState(false);
  const [currentOptimizingId, setCurrentOptimizingId] = useState<string | null>(null);
  const [currentGeneratingImageId, setCurrentGeneratingImageId] = useState<string | null>(null);
  const [currentGeneratingVideoId, setCurrentGeneratingVideoId] = useState<string | null>(null);
  const [shouldStopOptimizing, setShouldStopOptimizing] = useState(false);
  const [shouldStopImages, setShouldStopImages] = useState(false);
  const [shouldStopVideos, setShouldStopVideos] = useState(false);
  const [previewImage, setPreviewImage] = useState<{ url: string; number: number } | null>(null);
  const [editingOptimizedId, setEditingOptimizedId] = useState<string | null>(null);
  const [editedOptimized, setEditedOptimized] = useState("");

  const segments = (project?.segments as Segment[]) || [];
  const generationMode = project?.generationMode || "text-to-image-to-video";
  const isTextToVideo = generationMode === "text-to-video";

  // 单个优化提示词
  const optimizeSingleDescription = async (segmentId: string) => {
    const segment = segments.find(s => s.id === segmentId);
    if (!segment?.sceneDescription) {
      toast({
        title: "提示",
        description: "请先生成场景描述",
        variant: "destructive",
      });
      return;
    }

    setOptimizingDescriptions(prev => new Set(prev).add(segmentId));

    try {
      const response = await apiRequest("POST", "/api/descriptions/optimize", {
        description: segment.sceneDescription,
        generationMode: project?.generationMode || "text-to-image-to-video",
        aspectRatio: project?.aspectRatio || "16:9",
      });
      const data = await response.json();
      
      const updatedSegments = segments.map(seg =>
        seg.id === segmentId ? { ...seg, optimizedDescription: data.optimizedDescription } : seg
      );
      updateSegments(updatedSegments);
      
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
        title: "优化成功",
        description: "提示词已优化",
      });
    } catch (error) {
      console.error("Failed to optimize description:", error);
      toast({
        title: "优化失败",
        description: "请稍后重试",
        variant: "destructive",
      });
    } finally {
      setOptimizingDescriptions(prev => {
        const next = new Set(prev);
        next.delete(segmentId);
        return next;
      });
    }
  };

  // 批量优化提示词
  const handleBatchOptimize = async () => {
    const segmentsToOptimize = segments.filter(s => s.sceneDescription && !s.optimizedDescription);
    
    if (segmentsToOptimize.length === 0) {
      toast({
        title: "提示",
        description: "所有描述词已优化",
      });
      return;
    }

    setBatchOptimizing(true);
    setShouldStopOptimizing(false);
    let currentSegments = [...segments];
    let optimizedCount = 0;

    for (const segment of segmentsToOptimize) {
      if (shouldStopOptimizing) {
        console.log("[Batch] Stopped optimization by user");
        break;
      }

      setCurrentOptimizingId(segment.id);
      try {
        // 调用专门的优化API
        const response = await apiRequest("POST", "/api/descriptions/optimize", {
          description: segment.sceneDescription,
          generationMode: project?.generationMode || "text-to-image-to-video",
          aspectRatio: project?.aspectRatio || "16:9",
        });
        const data = await response.json();
        
        currentSegments = currentSegments.map(seg =>
          seg.id === segment.id ? { ...seg, optimizedDescription: data.optimizedDescription } : seg
        );
        updateSegments(currentSegments);
        optimizedCount++;
      } catch (error) {
        console.error("Failed to optimize description:", error);
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

    setCurrentOptimizingId(null);
    setBatchOptimizing(false);
    setShouldStopOptimizing(false);
    
    const message = shouldStopOptimizing 
      ? `已停止，成功优化 ${optimizedCount} 个描述`
      : `成功优化 ${optimizedCount} 个描述`;
    
    toast({
      title: shouldStopOptimizing ? "已停止优化" : "批量优化完成",
      description: message,
    });
  };

  // 生成单个图片
  const generateSingleImage = async (segmentId: string, segs: Segment[] = segments): Promise<Segment[] | null> => {
    const segment = segs.find(s => s.id === segmentId);
    if (!segment?.sceneDescription) {
      toast({
        title: "提示",
        description: "请先生成场景描述",
        variant: "destructive",
      });
      return null;
    }

    setGeneratingImages(prev => new Set(prev).add(segmentId));

    try {
      // 使用优化后的描述词，如果没有则使用原始描述词
      const promptToUse = segment.optimizedDescription || segment.sceneDescription;
      
      const response = await apiRequest("POST", "/api/images/generate", {
        description: promptToUse,
        aspectRatio: project?.aspectRatio || "16:9",
      });
      const data = await response.json();
      
      const updatedSegments = segs.map(seg =>
        seg.id === segmentId ? { ...seg, imageUrl: data.imageUrl } : seg
      );
      updateSegments(updatedSegments);
      
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
      const errorMessage = error instanceof Error ? error.message : "请稍后重试";
      
      if (errorMessage.includes("content_filter")) {
        toast({
          title: "内容被过滤",
          description: "内容被过滤，请重新生成或编辑描述词",
          variant: "destructive",
        });
      } else {
        toast({
          title: "生成失败",
          description: errorMessage,
          variant: "destructive",
        });
      }
      return segs;
    } finally {
      setGeneratingImages(prev => {
        const next = new Set(prev);
        next.delete(segmentId);
        return next;
      });
    }
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
    setShouldStopImages(false);
    let currentSegments = [...segments];
    let generatedCount = 0;

    for (const segment of segmentsWithDescription) {
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
    
    if (isTextToVideo) {
      if (!segment?.sceneDescription) {
        toast({
          title: "提示",
          description: "请先生成场景描述",
          variant: "destructive",
        });
        return;
      }
    } else {
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
      const response = await apiRequest("POST", "/api/videos/generate", {
        description: segment.sceneDescription,
        imageUrl: segment.imageUrl,
        generationMode: generationMode,
      });
      const data = await response.json();
      
      const updatedSegments = segments.map(seg =>
        seg.id === segmentId ? { ...seg, videoUrl: data.videoUrl } : seg
      );
      updateSegments(updatedSegments);
      
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
    const segmentsToGenerate = isTextToVideo
      ? segments.filter(s => s.sceneDescription && !s.videoUrl)
      : segments.filter(s => s.imageUrl && !s.videoUrl);
    
    if (segmentsToGenerate.length === 0) {
      toast({
        title: "提示",
        description: "没有需要生成视频的镜头",
      });
      return;
    }

    setBatchGeneratingVideos(true);
    setShouldStopVideos(false);
    let generatedCount = 0;

    for (const segment of segmentsToGenerate) {
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

  const handleNext = () => {
    setLocation("/ai-original/result");
  };

  const currentStep = project?.currentStep || 6;
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
          onClick={() => setLocation("/ai-original/descriptions")}
          className="mb-6"
          data-testid="button-back"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          返回上一步
        </Button>

        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">生成素材</h1>
          <p className="text-muted-foreground">
            优化提示词并生成图片和视频素材
          </p>
        </div>

        {/* 素材生成表格 */}
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            {/* 表头 */}
            <div className={`grid ${isTextToVideo ? 'grid-cols-8' : 'grid-cols-9'} gap-0 bg-muted/30 border-b border-border`}>
              <div className="col-span-1 p-3 text-sm text-muted-foreground border-r border-border">编号</div>
              <div className="col-span-2 p-3 text-sm text-muted-foreground border-r border-border">描述词</div>
              <div className="col-span-2 p-3 border-r border-border">
                <Button
                  size="sm"
                  onClick={batchOptimizing ? () => setShouldStopOptimizing(true) : handleBatchOptimize}
                  disabled={!batchOptimizing && segments.every(s => !s.sceneDescription || s.optimizedDescription)}
                  className="w-full"
                  data-testid="button-batch-optimize"
                >
                  {batchOptimizing ? (
                    <>
                      <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                      优化中...（停止）
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-3 w-3 mr-1" />
                      提示词优化
                    </>
                  )}
                </Button>
              </div>
              {!isTextToVideo && (
                <div className="col-span-2 p-3 border-r border-border">
                  <Button
                    size="sm"
                    onClick={batchGeneratingImages ? () => setShouldStopImages(true) : handleBatchGenerateImages}
                    disabled={!batchGeneratingImages && segments.every(s => !s.sceneDescription || s.imageUrl)}
                    className="w-full"
                    data-testid="button-batch-generate-images"
                  >
                    {batchGeneratingImages ? (
                      <>
                        <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                        生成中...（停止）
                      </>
                    ) : (
                      <>
                        <ImageIcon className="h-3 w-3 mr-1" />
                        批量生成图片
                      </>
                    )}
                  </Button>
                </div>
              )}
              <div className="col-span-2 p-3">
                <Button
                  size="sm"
                  onClick={batchGeneratingVideos ? () => setShouldStopVideos(true) : handleBatchGenerateVideos}
                  disabled={!batchGeneratingVideos && segments.every(s => isTextToVideo ? !s.sceneDescription || s.videoUrl : !s.imageUrl || s.videoUrl)}
                  className="w-full"
                  data-testid="button-batch-generate-videos"
                >
                  {batchGeneratingVideos ? (
                    <>
                      <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                      生成中...（停止）
                    </>
                  ) : (
                    <>
                      <Video className="h-3 w-3 mr-1" />
                      批量生成视频
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* 片段列表 */}
            {segments.map((segment, index) => (
              <div key={segment.id} className={`grid ${isTextToVideo ? 'grid-cols-8' : 'grid-cols-9'} gap-0 ${index !== segments.length - 1 ? 'border-b border-border' : ''}`} data-testid={`row-segment-${segment.number}`}>
                {/* 编号 */}
                <div className="col-span-1 p-3 border-r border-border flex items-center">
                  <Badge variant="secondary" className="font-mono">
                    #{segment.number}
                  </Badge>
                </div>

                {/* 描述词 */}
                <div className="col-span-2 p-3 border-r border-border">
                  <div className="text-sm max-h-32 overflow-y-auto">
                    {segment.sceneDescription || (
                      <span className="text-muted-foreground italic">未生成</span>
                    )}
                  </div>
                </div>

                {/* 提示词优化 */}
                <div className="col-span-2 p-3 border-r border-border">
                  {segment.optimizedDescription ? (
                    <div className="space-y-2">
                      {editingOptimizedId === segment.id ? (
                        <div className="space-y-2">
                          <Textarea
                            value={editedOptimized}
                            onChange={(e) => setEditedOptimized(e.target.value)}
                            className="min-h-[80px] text-sm"
                            data-testid={`textarea-optimized-${segment.number}`}
                          />
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={() => {
                                const updated = segments.map(s =>
                                  s.id === segment.id ? { ...s, optimizedDescription: editedOptimized } : s
                                );
                                updateSegments(updated);
                                setEditingOptimizedId(null);
                              }}
                              data-testid={`button-save-optimized-${segment.number}`}
                            >
                              保存
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setEditingOptimizedId(null);
                                setEditedOptimized("");
                              }}
                            >
                              取消
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="group relative">
                          <div className="text-sm max-h-32 overflow-y-auto pr-8">
                            {segment.optimizedDescription}
                          </div>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="absolute top-0 right-0 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => {
                              setEditingOptimizedId(segment.id);
                              setEditedOptimized(segment.optimizedDescription || "");
                            }}
                            data-testid={`button-edit-optimized-${segment.number}`}
                          >
                            <Sparkles className="h-3 w-3" />
                          </Button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={!segment.sceneDescription || optimizingDescriptions.has(segment.id) || batchOptimizing}
                      onClick={() => optimizeSingleDescription(segment.id)}
                      className="w-full"
                      data-testid={`button-optimize-${segment.number}`}
                    >
                      {optimizingDescriptions.has(segment.id) ? (
                        <>
                          <Loader2 className="h-3 w-3 mr-1 animate-spin opacity-100" />
                          优化中
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-3 w-3 mr-1" />
                          优化
                        </>
                      )}
                    </Button>
                  )}
                </div>

                {/* 图片 */}
                {!isTextToVideo && (
                  <div className="col-span-2 p-3 border-r border-border">
                    {segment.imageUrl ? (
                      <div className="group relative aspect-video bg-muted rounded overflow-hidden">
                        <img 
                          src={segment.imageUrl} 
                          alt={`场景 ${segment.number}`}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            size="icon"
                            variant="secondary"
                            onClick={() => setPreviewImage({ url: segment.imageUrl!, number: segment.number })}
                            data-testid={`button-preview-image-${segment.number}`}
                          >
                            <ZoomIn className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={!segment.sceneDescription || generatingImages.has(segment.id) || batchGeneratingImages}
                        onClick={() => generateSingleImage(segment.id)}
                        className="w-full"
                        data-testid={`button-generate-image-${segment.number}`}
                      >
                        {currentGeneratingImageId === segment.id ? (
                          <>
                            <Loader2 className="h-3 w-3 mr-1 animate-spin opacity-100" />
                            生成中
                          </>
                        ) : generatingImages.has(segment.id) ? (
                          <>
                            <Loader2 className="h-3 w-3 mr-1 animate-spin opacity-50" />
                            等待生成
                          </>
                        ) : (
                          <>
                            <ImageIcon className="h-3 w-3 mr-1" />
                            生成图片
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                )}

                {/* 视频 */}
                <div className="col-span-2 p-3">
                  {segment.videoUrl ? (
                    <div className="aspect-video bg-muted rounded overflow-hidden">
                      <video 
                        src={segment.videoUrl} 
                        controls
                        className="w-full h-full"
                      />
                    </div>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={
                        isTextToVideo 
                          ? !segment.sceneDescription || generatingVideos.has(segment.id) || batchGeneratingVideos
                          : !segment.imageUrl || generatingVideos.has(segment.id) || batchGeneratingVideos
                      }
                      onClick={() => generateSingleVideo(segment.id)}
                      className="w-full"
                      data-testid={`button-generate-video-${segment.number}`}
                    >
                      {currentGeneratingVideoId === segment.id ? (
                        <>
                          <Loader2 className="h-3 w-3 mr-1 animate-spin opacity-100" />
                          生成中
                        </>
                      ) : generatingVideos.has(segment.id) ? (
                        <>
                          <Loader2 className="h-3 w-3 mr-1 animate-spin opacity-50" />
                          等待生成
                        </>
                      ) : (
                        <>
                          <Video className="h-3 w-3 mr-1" />
                          生成视频
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* 下一步按钮 */}
        <div className="mt-8 flex justify-end">
          <Button
            onClick={handleNext}
            size="lg"
            data-testid="button-next"
          >
            下一步：导出成片
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </main>

      {/* 图片预览对话框 */}
      <Dialog open={!!previewImage} onOpenChange={() => setPreviewImage(null)}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>场景 #{previewImage?.number} - 图片预览</DialogTitle>
          </DialogHeader>
          {previewImage && (
            <img 
              src={previewImage.url} 
              alt={`场景 ${previewImage.number}`}
              className="w-full h-auto rounded"
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
