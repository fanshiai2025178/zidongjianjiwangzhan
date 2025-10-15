import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { TopNavbar } from "@/components/top-navbar";
import { StepProgress } from "@/components/step-progress";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Card } from "@/components/ui/card";
import { Upload, ArrowLeft, X } from "lucide-react";
import { useProject } from "@/hooks/use-project";
import { useToast } from "@/hooks/use-toast";

const presetStyles = [
  {
    id: "cinema",
    name: "电影风格",
    description: "电影级的视觉氛围，真实电影质感的场景",
    imageUrl: "/api/placeholder/400/225",
  },
  {
    id: "anime",
    name: "动漫风格",
    description: "日系动漫画风，鲜艳色彩和夸张的动作表现",
    imageUrl: "/api/placeholder/400/225",
  },
  {
    id: "realistic",
    name: "写实风格",
    description: "真实世界的效果，自然场景和真实光影",
    imageUrl: "/api/placeholder/400/225",
  },
  {
    id: "fantasy",
    name: "奇幻风格",
    description: "魔法古堡神秘壮观，自然场景和高耸建筑交织",
    imageUrl: "/api/placeholder/400/225",
  },
  {
    id: "retro",
    name: "复古风格",
    description: "80-90年代复古氛围，胶片质感与怀旧色调",
    imageUrl: "/api/placeholder/400/225",
  },
  {
    id: "minimalist",
    name: "极简风格",
    description: "简洁干净的画面，注重留白和核心元素",
    imageUrl: "/api/placeholder/400/225",
  },
  {
    id: "noir",
    name: "黑色电影",
    description: "黑白或低饱和度色调，强烈的明暗对比",
    imageUrl: "/api/placeholder/400/225",
  },
  {
    id: "cyberpunk",
    name: "赛博朋克",
    description: "未来科技感，霓虹灯光和赛博空间氛围",
    imageUrl: "/api/placeholder/400/225",
  },
];

export default function StylePage() {
  const [, setLocation] = useLocation();
  const { project, updateStyleSettings, updateCurrentStep } = useProject();
  const { toast } = useToast();
  
  const [useCharacterRef, setUseCharacterRef] = useState(false);
  const [useStyleRef, setUseStyleRef] = useState(false);
  const [usePreset, setUsePreset] = useState(false);
  const [selectedStyle, setSelectedStyle] = useState("cinema");
  const [characterImage, setCharacterImage] = useState<string | null>(null);
  const [styleImage, setStyleImage] = useState<string | null>(null);
  
  const characterInputRef = useRef<HTMLInputElement>(null);
  const styleInputRef = useRef<HTMLInputElement>(null);

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
        setCharacterImage(event.target?.result as string);
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
        setStyleImage(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleContinue = () => {
    updateStyleSettings({
      useCharacterReference: useCharacterRef,
      characterImageUrl: characterImage || undefined,
      useStyleReference: useStyleRef,
      styleImageUrl: styleImage || undefined,
      usePresetStyle: usePreset,
      presetStyleId: selectedStyle,
    });
    updateCurrentStep(2);
    setLocation("/ai-original/script");
  };

  const currentStep = project?.currentStep || 1;
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
          onClick={() => setLocation("/")}
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
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {presetStyles.map((style) => (
                      <Card
                        key={style.id}
                        className={cn(
                          "cursor-pointer overflow-hidden transition-all hover-elevate",
                          selectedStyle === style.id
                            ? "ring-2 ring-primary"
                            : ""
                        )}
                        onClick={() => setSelectedStyle(style.id)}
                        data-testid={`card-style-${style.id}`}
                      >
                        <div className="aspect-video bg-muted"></div>
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
