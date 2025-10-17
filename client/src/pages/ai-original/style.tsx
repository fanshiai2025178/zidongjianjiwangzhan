import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { TopNavbar } from "@/components/top-navbar";
import { StepProgress } from "@/components/step-progress";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Upload, ArrowLeft, X, Sparkles, Edit2 } from "lucide-react";
import { useProject } from "@/hooks/use-project";
import { useToast } from "@/hooks/use-toast";
import { Segment } from "@shared/schema";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

// 导入预设风格图片
import cinemaImg from "@assets/stock_images/cinematic_movie_scen_d9e7f0e5.jpg";
import animeImg from "@assets/stock_images/anime_style_illustra_ac99acd1.jpg";
import realisticImg from "@assets/stock_images/realistic_photograph_60228ed1.jpg";
import fantasyImg from "@assets/stock_images/fantasy_castle,_magi_14c828af.jpg";
import retroImg from "@assets/stock_images/vintage_retro_1980s__5209ab00.jpg";
import minimalistImg from "@assets/stock_images/minimalist_design,_c_4a45cbe1.jpg";
import noirImg from "@assets/stock_images/film_noir_black_and__9a226515.jpg";
import cyberpunkImg from "@assets/stock_images/cyberpunk_neon_city,_a154216c.jpg";

const presetStyles = [
  {
    id: "cinema",
    name: "电影风格",
    description: "电影级的视觉氛围，真实电影质感的场景",
    imageUrl: cinemaImg,
  },
  {
    id: "anime",
    name: "动漫风格",
    description: "日系动漫画风，鲜艳色彩和夸张的动作表现",
    imageUrl: animeImg,
  },
  {
    id: "realistic",
    name: "写实风格",
    description: "真实世界的效果，自然场景和真实光影",
    imageUrl: realisticImg,
  },
  {
    id: "fantasy",
    name: "奇幻风格",
    description: "魔法古堡神秘壮观，自然场景和高耸建筑交织",
    imageUrl: fantasyImg,
  },
  {
    id: "retro",
    name: "复古风格",
    description: "80-90年代复古氛围，胶片质感与怀旧色调",
    imageUrl: retroImg,
  },
  {
    id: "minimalist",
    name: "极简风格",
    description: "简洁干净的画面，注重留白和核心元素",
    imageUrl: minimalistImg,
  },
  {
    id: "noir",
    name: "黑色电影",
    description: "黑白或低饱和度色调，强烈的明暗对比",
    imageUrl: noirImg,
  },
  {
    id: "cyberpunk",
    name: "赛博朋克",
    description: "未来科技感，霓虹灯光和赛博空间氛围",
    imageUrl: cyberpunkImg,
  },
];

export default function StylePage() {
  const [, setLocation] = useLocation();
  const { project, updateStyleSettings, updateCurrentStep } = useProject();
  const { toast } = useToast();
  
  const segments = (project?.segments as Segment[]) || [];
  
  const [useCharacterRef, setUseCharacterRef] = useState(false);
  const [useStyleRef, setUseStyleRef] = useState(false);
  const [usePreset, setUsePreset] = useState(false);
  const [selectedStyle, setSelectedStyle] = useState("cinema");
  const [characterImage, setCharacterImage] = useState<string | null>(null);
  const [styleImage, setStyleImage] = useState<string | null>(null);
  
  // AI识别结果状态
  const [characterAnalysis, setCharacterAnalysis] = useState("");
  const [styleAnalysis, setStyleAnalysis] = useState("");
  const [presetStyleAnalysis, setPresetStyleAnalysis] = useState("");
  
  // 编辑模式状态
  const [editingCharacter, setEditingCharacter] = useState(false);
  const [editingStyle, setEditingStyle] = useState(false);
  const [editingPreset, setEditingPreset] = useState(false);
  
  const characterInputRef = useRef<HTMLInputElement>(null);
  const styleInputRef = useRef<HTMLInputElement>(null);

  // AI识别风格的mutation
  const analyzeStyleMutation = useMutation({
    mutationFn: async ({ analysisType, content }: { analysisType: string; content: string }) => {
      const response = await apiRequest("POST", "/api/style/analyze", {
        analysisType,
        imageBase64OrPresetInfo: content,
      });
      return response.json();
    },
    onSuccess: (data, variables) => {
      if (variables.analysisType === "character") {
        setCharacterAnalysis(data.analysis);
      } else if (variables.analysisType === "style") {
        setStyleAnalysis(data.analysis);
      } else if (variables.analysisType === "preset") {
        setPresetStyleAnalysis(data.analysis);
      }
      toast({
        title: "识别完成",
        description: "AI已成功识别风格特征",
      });
    },
    onError: (error) => {
      toast({
        title: "识别失败",
        description: error instanceof Error ? error.message : "风格识别失败，请重试",
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    if (!project) {
      setLocation("/");
      return;
    }
    if (project?.styleSettings) {
      const settings = project.styleSettings as any;
      setUseCharacterRef(settings.useCharacterReference || false);
      setUseStyleRef(settings.useStyleReference || false);
      setUsePreset(settings.usePresetStyle || false);
      setSelectedStyle(settings.presetStyleId || "cinema");
      setCharacterImage(settings.characterImageUrl || null);
      setStyleImage(settings.styleImageUrl || null);
      setCharacterAnalysis(settings.characterAnalysis || "");
      setStyleAnalysis(settings.styleAnalysis || "");
      setPresetStyleAnalysis(settings.presetStyleAnalysis || "");
    }
  }, [project, setLocation]);

  // 处理风格参考勾选（与预设互斥）
  const handleStyleRefChange = (checked: boolean) => {
    setUseStyleRef(checked as boolean);
    if (checked) {
      setUsePreset(false); // 取消预设风格
    }
  };

  // 处理预设风格勾选（与风格参考互斥）
  const handlePresetChange = (checked: boolean) => {
    setUsePreset(checked as boolean);
    if (checked) {
      setUseStyleRef(false); // 取消风格参考
    }
  };

  const handleCharacterImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "文件过大",
          description: "图片大小不能超过5MB",
          variant: "destructive",
        });
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64 = event.target?.result as string;
        setCharacterImage(base64);
        // 自动触发AI识别
        analyzeStyleMutation.mutate({
          analysisType: "character",
          content: base64,
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleStyleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "文件过大",
          description: "图片大小不能超过5MB",
          variant: "destructive",
        });
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64 = event.target?.result as string;
        setStyleImage(base64);
        // 自动触发AI识别
        analyzeStyleMutation.mutate({
          analysisType: "style",
          content: base64,
        });
      };
      reader.readAsDataURL(file);
    }
  };

  // 处理预设风格选择（触发AI识别）
  const handlePresetStyleSelect = (styleId: string) => {
    setSelectedStyle(styleId);
    const style = presetStyles.find(s => s.id === styleId);
    if (style) {
      // 自动触发AI识别
      analyzeStyleMutation.mutate({
        analysisType: "preset",
        content: style.name,
      });
    }
  };

  const handleContinue = () => {
    updateStyleSettings({
      useCharacterReference: useCharacterRef,
      characterImageUrl: characterImage || undefined,
      characterAnalysis: characterAnalysis || undefined,
      useStyleReference: useStyleRef,
      styleImageUrl: styleImage || undefined,
      styleAnalysis: styleAnalysis || undefined,
      usePresetStyle: usePreset,
      presetStyleId: selectedStyle,
      presetStyleAnalysis: presetStyleAnalysis || undefined,
    });
    updateCurrentStep(6);
    setLocation("/ai-original/materials");
  };

  const currentStep = project?.currentStep || 5;
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
      
      <main className="container mx-auto max-w-6xl px-6 pb-16">
        <Button
          variant="ghost"
          onClick={() => setLocation("/ai-original/descriptions")}
          className="mb-6"
          data-testid="button-back"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          返回上一步
        </Button>

        <div className="text-center mb-12">
          <h1 className="text-3xl font-bold text-foreground mb-3">
            风格定制
          </h1>
          <p className="text-muted-foreground">
            首先选择视频风格，让AI更好地理解您的创作需求
          </p>
        </div>

        <div className="space-y-8">
          <Card className="p-8 border border-card-border">
            <h2 className="text-xl font-semibold text-foreground mb-4">
              风格定制
            </h2>
            <p className="text-sm text-muted-foreground mb-6">
              选择人物形象、风格参考或预设风格，让视频更符合您的创作需求（若都不选择，则按文案默认生成）
            </p>

            <div className="space-y-6">
              <div className="flex items-center space-x-3">
                <Checkbox
                  id="character-ref"
                  checked={useCharacterRef}
                  onCheckedChange={(checked) => setUseCharacterRef(checked as boolean)}
                  data-testid="checkbox-character-ref"
                />
                <label
                  htmlFor="character-ref"
                  className="text-sm font-medium text-foreground cursor-pointer"
                >
                  上传人物形象参考
                </label>
              </div>

              {useCharacterRef && (
                <div className="ml-7">
                  <p className="text-sm font-medium text-foreground mb-3">人物形象参考</p>
                  <input
                    ref={characterInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleCharacterImageUpload}
                    className="hidden"
                  />
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* 左侧：图片上传区域 */}
                    <div>
                      {characterImage ? (
                        <div 
                          className="border-2 border-dashed border-border rounded-xl p-8 text-center hover-elevate transition-all cursor-pointer"
                          onClick={() => characterInputRef.current?.click()}
                        >
                          <div className="bg-white rounded-lg p-4 mb-4 inline-block">
                            <img src={characterImage} alt="人物形象参考" className="max-w-[240px] max-h-[240px] object-contain" />
                          </div>
                          <p className="text-sm text-muted-foreground">
                            点击更换图片
                          </p>
                        </div>
                      ) : (
                        <div 
                          className="border-2 border-dashed border-border rounded-xl p-12 text-center hover-elevate transition-all cursor-pointer"
                          onClick={() => characterInputRef.current?.click()}
                        >
                          <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                          <p className="text-sm text-muted-foreground">
                            点击上传人物形象参考
                          </p>
                          <p className="text-xs text-muted-foreground mt-2">
                            支持 JPG, PNG 格式，最大 5MB
                          </p>
                        </div>
                      )}
                    </div>

                    {/* 右侧：AI识别结果展示和编辑 */}
                    <div>
                      {characterAnalysis ? (
                        <div className="p-4 bg-card border border-card-border rounded-lg h-full">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <Sparkles className="h-4 w-4 text-primary" />
                              <h4 className="text-sm font-medium text-foreground">AI识别结果</h4>
                            </div>
                            {!editingCharacter ? (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setEditingCharacter(true)}
                                data-testid="button-edit-character-analysis"
                              >
                                <Edit2 className="h-3 w-3 mr-1" />
                                编辑
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                onClick={() => setEditingCharacter(false)}
                                data-testid="button-save-character-analysis"
                              >
                                保存
                              </Button>
                            )}
                          </div>
                          {editingCharacter ? (
                            <Textarea
                              value={characterAnalysis}
                              onChange={(e) => setCharacterAnalysis(e.target.value)}
                              className="min-h-[200px] text-sm"
                              placeholder="编辑人物形象识别结果..."
                              data-testid="textarea-character-analysis"
                            />
                          ) : (
                            <p className="text-sm text-muted-foreground whitespace-pre-wrap" data-testid="text-character-analysis">
                              {characterAnalysis}
                            </p>
                          )}
                        </div>
                      ) : (
                        <div className="flex items-center justify-center h-full border-2 border-dashed border-border rounded-xl p-8">
                          {analyzeStyleMutation.isPending && analyzeStyleMutation.variables?.analysisType === "character" ? (
                            <div className="text-center">
                              <Sparkles className="h-8 w-8 mx-auto text-primary animate-pulse mb-2" />
                              <p className="text-sm text-muted-foreground">AI正在识别中...</p>
                            </div>
                          ) : (
                            <p className="text-sm text-muted-foreground text-center">上传图片后，AI将自动识别人物形象特征</p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              <div className="flex items-center space-x-3">
                <Checkbox
                  id="style-ref"
                  checked={useStyleRef}
                  onCheckedChange={handleStyleRefChange}
                  data-testid="checkbox-style-ref"
                />
                <label
                  htmlFor="style-ref"
                  className="text-sm font-medium text-foreground cursor-pointer"
                >
                  上传风格参考 <span className="text-muted-foreground">(与预设风格互斥)</span>
                </label>
              </div>

              {useStyleRef && (
                <div className="ml-7">
                  <p className="text-sm font-medium text-foreground mb-3">风格参考图片</p>
                  <input
                    ref={styleInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleStyleImageUpload}
                    className="hidden"
                  />
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* 左侧：图片上传区域 */}
                    <div>
                      {styleImage ? (
                        <div 
                          className="border-2 border-dashed border-border rounded-xl p-8 text-center hover-elevate transition-all cursor-pointer"
                          onClick={() => styleInputRef.current?.click()}
                        >
                          <div className="bg-white rounded-lg p-4 mb-4 inline-block">
                            <img src={styleImage} alt="风格参考" className="max-w-[240px] max-h-[240px] object-contain" />
                          </div>
                          <p className="text-sm text-muted-foreground">
                            点击更换图片
                          </p>
                        </div>
                      ) : (
                        <div 
                          className="border-2 border-dashed border-border rounded-xl p-12 text-center hover-elevate transition-all cursor-pointer"
                          onClick={() => styleInputRef.current?.click()}
                        >
                          <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                          <p className="text-sm text-muted-foreground">
                            点击上传风格参考图片
                          </p>
                          <p className="text-xs text-muted-foreground mt-2">
                            支持 JPG, PNG 格式，最大 5MB
                          </p>
                        </div>
                      )}
                    </div>

                    {/* 右侧：AI识别结果展示和编辑 */}
                    <div>
                      {styleAnalysis ? (
                        <div className="p-4 bg-card border border-card-border rounded-lg h-full">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <Sparkles className="h-4 w-4 text-primary" />
                              <h4 className="text-sm font-medium text-foreground">AI识别结果</h4>
                            </div>
                            {!editingStyle ? (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setEditingStyle(true)}
                                data-testid="button-edit-style-analysis"
                              >
                                <Edit2 className="h-3 w-3 mr-1" />
                                编辑
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                onClick={() => setEditingStyle(false)}
                                data-testid="button-save-style-analysis"
                              >
                                保存
                              </Button>
                            )}
                          </div>
                          {editingStyle ? (
                            <Textarea
                              value={styleAnalysis}
                              onChange={(e) => setStyleAnalysis(e.target.value)}
                              className="min-h-[200px] text-sm"
                              placeholder="编辑风格识别结果..."
                              data-testid="textarea-style-analysis"
                            />
                          ) : (
                            <p className="text-sm text-muted-foreground whitespace-pre-wrap" data-testid="text-style-analysis">
                              {styleAnalysis}
                            </p>
                          )}
                        </div>
                      ) : (
                        <div className="flex items-center justify-center h-full border-2 border-dashed border-border rounded-xl p-8">
                          {analyzeStyleMutation.isPending && analyzeStyleMutation.variables?.analysisType === "style" ? (
                            <div className="text-center">
                              <Sparkles className="h-8 w-8 mx-auto text-primary animate-pulse mb-2" />
                              <p className="text-sm text-muted-foreground">AI正在识别中...</p>
                            </div>
                          ) : (
                            <p className="text-sm text-muted-foreground text-center">上传图片后，AI将自动识别风格特征</p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              <div className="flex items-center space-x-3">
                <Checkbox
                  id="preset-style"
                  checked={usePreset}
                  onCheckedChange={handlePresetChange}
                  data-testid="checkbox-preset-style"
                />
                <label
                  htmlFor="preset-style"
                  className="text-sm font-medium text-foreground cursor-pointer"
                >
                  使用预设风格
                </label>
              </div>

              {usePreset && (
                <div className="ml-7">
                  <h3 className="text-sm font-medium text-foreground mb-4">
                    选择预设风格
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    {presetStyles.map((style) => (
                      <Card
                        key={style.id}
                        className={cn(
                          "cursor-pointer overflow-hidden transition-all hover-elevate",
                          selectedStyle === style.id
                            ? "ring-2 ring-primary"
                            : ""
                        )}
                        onClick={() => handlePresetStyleSelect(style.id)}
                        data-testid={`card-style-${style.id}`}
                      >
                        <div className="aspect-video bg-muted relative overflow-hidden">
                          <img 
                            src={style.imageUrl} 
                            alt={style.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="p-3">
                          <h4 className="font-medium text-foreground text-sm">
                            {style.name}
                          </h4>
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                            {style.description}
                          </p>
                        </div>
                      </Card>
                    ))}
                  </div>

                  {/* 当选中风格后，显示该风格的详细描述 */}
                  {selectedStyle && (
                    <div className="mt-6">
                      <div className="flex items-center gap-2 mb-4">
                        <h4 className="text-sm font-medium text-foreground">
                          当前选择：{presetStyles.find(s => s.id === selectedStyle)?.name}
                        </h4>
                      </div>
                      
                      {/* AI识别结果展示和编辑 */}
                      {presetStyleAnalysis ? (
                        <div className="p-4 bg-card border border-card-border rounded-lg">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <Sparkles className="h-4 w-4 text-primary" />
                              <h4 className="text-sm font-medium text-foreground">风格详细描述</h4>
                            </div>
                            {!editingPreset ? (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setEditingPreset(true)}
                                data-testid="button-edit-preset-analysis"
                              >
                                <Edit2 className="h-3 w-3 mr-1" />
                                编辑
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                onClick={() => setEditingPreset(false)}
                                data-testid="button-save-preset-analysis"
                              >
                                保存
                              </Button>
                            )}
                          </div>
                          {editingPreset ? (
                            <Textarea
                              value={presetStyleAnalysis}
                              onChange={(e) => setPresetStyleAnalysis(e.target.value)}
                              className="min-h-[120px] text-sm"
                              placeholder="编辑预设风格识别结果..."
                              data-testid="textarea-preset-analysis"
                            />
                          ) : (
                            <p className="text-sm text-muted-foreground whitespace-pre-wrap" data-testid="text-preset-analysis">
                              {presetStyleAnalysis}
                            </p>
                          )}
                        </div>
                      ) : analyzeStyleMutation.isPending && analyzeStyleMutation.variables?.analysisType === "preset" ? (
                        <div className="p-8 bg-card border border-card-border rounded-lg text-center">
                          <Sparkles className="h-8 w-8 mx-auto text-primary animate-pulse mb-2" />
                          <p className="text-sm text-muted-foreground">AI正在生成风格详细描述...</p>
                        </div>
                      ) : null}
                    </div>
                  )}
                </div>
              )}
            </div>
          </Card>

          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => handleContinue()}
              data-testid="button-skip"
            >
              跳过
            </Button>
            <Button
              onClick={() => handleContinue()}
              data-testid="button-confirm-style"
            >
              确认选择
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}

function cn(...classes: string[]) {
  return classes.filter(Boolean).join(" ");
}
