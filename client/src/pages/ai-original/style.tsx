import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { TopNavbar } from "@/components/top-navbar";
import { StepProgress } from "@/components/step-progress";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Upload, ArrowLeft, X, Sparkles, Edit2, Loader2 } from "lucide-react";
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
    detailedDescription: `核心理念：模拟专业电影摄影机的镜头语言、光影布局和色彩分级，创造出具有叙事感、情感深度和视觉冲击力的单帧画面。

风格精髓：此风格旨在超越普通照片，赋予画面以故事性。它强调通过构图引导视线，利用光影塑造人物和氛围，并通过后期调色传达特定的情绪基调。最终成品应如同从一部制作精良的电影中截取的决定性瞬间。

核心技术指令：
• 构图与镜头：宽银幕高宽比 (16:9, 2.35:1), 电影镜头 (Anamorphic Lens), 浅景深 (Shallow Depth of Field), 背景散景 (Bokeh), 黄金分割, 引导线构图, 荷兰角 (Dutch Angle), 过肩镜头
• 光影与氛围：戏剧性布光 (Dramatic Lighting), 伦勃朗光 (Rembrandt Lighting), 边缘光 (Rim Light), 体积光 (Volumetric Light), 丁达尔效应 (God Rays), 高对比度, 镜头光晕 (Lens Flare), 电影氛围 (Cinematic Atmosphere)
• 色彩与调色：电影色彩分级 (Cinematic Color Grading), 橙青色调 (Teal and Orange), 低饱和度现实主义, 分离色调 (Split Toning), 模拟胶片 (Film Emulation, e.g., Kodak Portra 400)
• 画质与纹理：8K分辨率, 电影级画质, 胶片颗粒 (Film Grain), 精细细节, 锐利对焦`,
  },
  {
    id: "anime",
    name: "动漫风格",
    description: "日系动漫画风，鲜艳色彩和夸张的动作表现",
    imageUrl: animeImg,
    detailedDescription: `核心理念：运用标志性的日式动画美学，通过清晰的线条、鲜明的色彩和富有表现力的角色设计，构建一个充满活力的二次元视觉世界。

风格精髓：此风格的关键在于"风格化"而非"写实"。它简化现实世界的光影和细节，强调轮廓、色彩的情感表达和角色的魅力。无论是清新日常还是热血战斗，其核心都是通过独特的视觉符号体系唤起观众的共鸣。

核心技术指令：
• 构图与线条：赛璐璐风格 (Cel Shading), 清晰的轮廓线 (Clean Line Art), 动态构图, 速度线, 漫画分镜感
• 光影与氛围：平面阴影 (Flat Shadows), 简约光影, 高光点缀 (Specular Highlights), 魔法光效, 氛围特效粒子
• 色彩与调色：高饱和度色彩, 鲜艳明亮的调色板, 强烈的色彩对比, 渐变色天空, 特定动漫工作室风格 (e.g., Studio Ghibli, Kyoto Animation, Makoto Shinkai style)
• 角色与背景：标志性的大眼睛, 风格化发型, 动漫人物设计, 精细绘制的背景, 概念艺术背景`,
  },
  {
    id: "realistic",
    name: "写实风格",
    description: "真实世界的效果，自然场景和真实光影",
    imageUrl: realisticImg,
    detailedDescription: `核心理念：追求对现实世界的高度模拟，通过精确的光影计算、丰富的细节纹理和逼真的物理材质，生成与专业相机拍摄无异的图像。

风格精髓：此风格的目标是"欺骗眼睛"，让观者无法分辨图像是生成还是拍摄的。它强调物理正确性（PBR），从光线反射、折射到物体表面的微观纹理，都力求符合现实规律，核心是极致的细节和无懈可击的真实感。

核心技术指令：
• 构图与镜头：专业摄影构图, 单反相机拍摄 (DSLR Photography), 定焦镜头效果 (e.g., 50mm f/1.8), 照片级真实感, 微距摄影
• 光影与氛围：自然光 (Natural Lighting), 柔光箱布光 (Softbox Lighting), 全局光照 (Global Illumination), 精确的阴影投射, 物理准确的光线追踪
• 色彩与调色：真实的色彩还原, 高动态范围 (HDR), 无明显风格化调色, sRGB色彩空间, RAW照片质感
• 画质与纹理：超写实 (Hyperrealistic), 极致细节 (Insane Detail), 皮肤纹理 (Skin Pores), 材质细节 (Material Textures), 8K超高清分辨率`,
  },
  {
    id: "fantasy",
    name: "奇幻风格",
    description: "魔法古堡神秘壮观，自然场景和高耸建筑交织",
    imageUrl: fantasyImg,
    detailedDescription: `核心理念：融合魔法、神话与史诗元素，通过超凡的想象力和宏大的场景构建，创造一个充满敬畏感和神秘色彩的幻想世界。

风格精髓：此风格致力于将"不可能"变为"可信"。它将现实中不存在的元素（如魔法、巨龙）与符合物理和美学逻辑的场景相结合，通过宏伟的构图、梦幻的光效和充满想象力的设计，营造强烈的史诗感和沉浸感。

核心技术指令：
• 构图与场景：史诗级广角构图 (Epic Wide Shot), 概念艺术 (Concept Art), 宏伟的建筑, 漂浮的岛屿, 魔法森林, 数字绘画 (Digital Painting)
• 光影与氛围：魔法光辉 (Magical Glow), 神圣光芒 (Divine Light), 发光粒子, 体积雾 (Volumetric Fog), 梦幻氛围 (Dreamlike Atmosphere), 神秘主义
• 色彩与调色：丰富且富有想象力的调色板, 高对比度, 星云色彩, 发光元素的色彩运用
• 核心元素：魔法符文, 幻想生物 (龙, 精灵, 独角兽), 古代遗迹, 华丽的盔甲与武器, 神话主题`,
  },
  {
    id: "retro",
    name: "复古风格",
    description: "80-90年代复古氛围，胶片质感与怀旧色调",
    imageUrl: retroImg,
    detailedDescription: `核心理念：捕捉并再现特定历史时期（尤其是20世纪中后期）的视觉特征，通过模拟旧式摄影器材的质感和当时的流行色调，唤起怀旧情怀。

风格精髓：此风格的核心是"年代感"。它并非简单地将画面变旧，而是精确复刻特定时代的美学印记，如80年代的霓虹与合成器波、70年代的暖色调与迪斯科文化，或是老式胶片的独特化学反应，营造一种温暖、不完美但充满人情味的视觉体验。

核心技术指令：
• 构图与媒介：宝丽来相纸 (Polaroid), 柯达克罗姆胶片 (Kodachrome), VHS录像带画面, 20世纪80/90年代摄影风格
• 光影与氛围：柔和的自然光, 霓虹灯光, 漏光效果 (Light Leaks), 光晕 (Halation), 怀旧氛围 (Nostalgic Atmosphere)
• 色彩与调色：褪色的色彩, 温暖的黄色/棕色调, 低饱和度, 高色彩容差, 独特的胶片色偏
• 画质与纹理：胶片颗粒 (Film Grain), 轻微的噪点和划痕, 晕影 (Vignetting), 柔软的焦点`,
  },
  {
    id: "minimalist",
    name: "极简风格",
    description: "简洁干净的画面，注重留白和核心元素",
    imageUrl: minimalistImg,
    detailedDescription: `核心理念：遵循"少即是多"的原则，通过提炼核心元素、运用大面积负空间和限制性色彩，传达出宁静、秩序和高度的视觉纯粹性。

风格精髓：此风格是一种视觉上的"断舍离"。它主动剔除所有不必要的干扰元素，强迫观者将注意力集中在主体、形态、色彩和空间关系上。其美感来源于极致的简洁、和谐的比例和背后蕴含的冷静与专注。

核心技术指令：
• 构图与空间：极简主义 (Minimalism), 大量负空间 (Negative Space), 中心构图, 对称构图, 几何形状, 简洁线条
• 光影与氛围：简洁的布光, 柔和的阴影, 自然采光, 干净、宁静的氛围 (Clean, Serene Atmosphere), 禅意 (Zen)
• 色彩与调色：单色 (Monochromatic), 限制性调色板 (Limited Color Palette), 莫兰迪色系, 纯色背景, 黑白灰
• 主体与细节：单一主体, 抽象形态, 无多余装饰, 关注物体的轮廓和形式`,
  },
  {
    id: "noir",
    name: "黑色电影",
    description: "黑白或低饱和度色调，强烈的明暗对比",
    imageUrl: noirImg,
    detailedDescription: `核心理念：运用高反差的黑白光影和充满压抑感的构图，塑造一个道德模糊、充满宿命感和悬疑色彩的硬汉派侦探世界。

风格精髓：光影即是语言。此风格利用强烈的明暗对比（Chiaroscuro）来切割画面、隐藏信息、塑造人物内心。巨大的阴影不仅是视觉元素，更是悬疑、危险和角色内心黑暗面的外化，营造出一种独特的、充满表现主义色彩的悲观美学。

核心技术指令：
• 构图与角度：低角度拍摄, 荷兰角, 不平衡构图, 强调线条和阴影的几何感
• 光影与氛围：低调照明 (Low-Key Lighting), 硬光 (Hard Light), 强烈的光影对比 (Chiaroscuro), 巨大的投影, 百叶窗光影, 烟雾或雨夜氛围
• 色彩与调色：高对比度黑白摄影, 或带有极低饱和度的"彩色黑色电影"(Neo-Noir)
• 核心元素：侦探, 致命女人 (Femme Fatale), 雨中街道, 威尼斯百叶窗, 烟雾, 宿命感`,
  },
  {
    id: "cyberpunk",
    name: "赛博朋克",
    description: "未来科技感，霓虹灯光和赛博空间氛围",
    imageUrl: cyberpunkImg,
    detailedDescription: `核心理念：在一个"高科技，低生活"的反乌托邦未来中，通过炫目的霓虹光污染、压抑的城市景观和人机融合的元素，探索技术异化与社会阶级的主题。

风格精髓：视觉上的"混乱"与"秩序"并存。一方面是未来科技的炫目（霓虹灯、全息广告），另一方面是底层社会的拥挤、潮湿和衰败。这种强烈的视觉矛盾是赛博朋克美学的核心，营造出一种既迷人又令人不安的未来感。

核心技术指令：
• 构图与场景：垂直感强的摩天大楼, 拥挤的街道, 未来主义城市景观, 反乌托邦建筑, 数字朋克美学
• 光影与氛围：霓虹灯光污染 (Neon Light Pollution), 全息投影, 反射的潮湿地面, 压抑的、阴雨连绵的氛围, 科技感
• 色彩与调色：标志性的霓虹色调 (洋红, 青色, 紫色), 与黑暗背景形成强烈对比, 故障艺术 (Glitch Art) 色彩
• 核心元素：机械义体, 生物改造, 飞行汽车, 错综复杂的电缆, AI, 巨型企业标识`,
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

  // 处理预设风格选择（使用固定描述）
  const handlePresetStyleSelect = (styleId: string) => {
    setSelectedStyle(styleId);
    const style = presetStyles.find(s => s.id === styleId);
    if (style) {
      // 直接使用预设的详细描述
      setPresetStyleAnalysis(style.detailedDescription);
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
                  {selectedStyle && presetStyleAnalysis && (
                    <div className="mt-6">
                      <div className="flex items-center gap-2 mb-4">
                        <h4 className="text-sm font-medium text-foreground">
                          当前选择：{presetStyles.find(s => s.id === selectedStyle)?.name}
                        </h4>
                      </div>
                      
                      {/* 风格详细描述展示和编辑 */}
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
                            placeholder="编辑预设风格描述..."
                            data-testid="textarea-preset-analysis"
                          />
                        ) : (
                          <p className="text-sm text-muted-foreground whitespace-pre-wrap" data-testid="text-preset-analysis">
                            {presetStyleAnalysis}
                          </p>
                        )}
                      </div>
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
              disabled={analyzeStyleMutation.isPending}
              data-testid="button-skip"
            >
              跳过
            </Button>
            <Button
              onClick={() => handleContinue()}
              disabled={analyzeStyleMutation.isPending}
              data-testid="button-confirm-style"
            >
              {analyzeStyleMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  AI识别中...
                </>
              ) : (
                "确认选择"
              )}
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
