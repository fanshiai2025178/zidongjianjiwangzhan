import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { TopNavbar } from "@/components/top-navbar";
import { StepProgress } from "@/components/step-progress";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Scissors, ArrowUpCircle, ArrowDownCircle } from "lucide-react";
import { useProject } from "@/hooks/use-project";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Slider } from "@/components/ui/slider";

interface Segment {
  id: string;
  number: number;
  language: string;
  text: string;
  translation?: string;
  sceneDescription?: string;
}

export default function SegmentsPage() {
  const [, setLocation] = useLocation();
  const { project, updateSegments, updateCurrentStep } = useProject();
  const { toast } = useToast();
  
  const [segments, setSegments] = useState<Segment[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [cutDialogOpen, setCutDialogOpen] = useState(false);
  const [selectedSegment, setSelectedSegment] = useState<Segment | null>(null);
  const [cutPosition, setCutPosition] = useState(50);

  // 加载或生成分段
  useEffect(() => {
    if (project?.segments && Array.isArray(project.segments) && (project.segments as any).length > 0) {
      setSegments(project.segments as Segment[]);
    } else if (project?.scriptContent) {
      generateSegments();
    }
  }, [project]);

  const generateSegments = async () => {
    if (!project?.scriptContent) return;
    
    setIsLoading(true);
    try {
      const response = await apiRequest("POST", "/api/segments/generate", {
        scriptContent: project.scriptContent,
      });
      const data = await response.json();
      setSegments(data.segments);
      toast({
        title: "分段成功",
        description: `AI已将文案分成 ${data.segments.length} 个片段`,
      });
    } catch (error) {
      toast({
        title: "分段失败",
        description: "无法生成智能分段，请重试",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleContinue = () => {
    updateSegments(segments);
    updateCurrentStep(5);
    setLocation("/ai-original/descriptions");
  };

  const openCutDialog = (segment: Segment) => {
    setSelectedSegment(segment);
    setCutPosition(Math.floor(segment.text.length / 2));
    setCutDialogOpen(true);
  };

  const handleCut = async () => {
    if (!selectedSegment) return;

    const text = selectedSegment.text;
    const part1Text = text.slice(0, cutPosition).trim();
    const part2Text = text.slice(cutPosition).trim();

    if (!part1Text || !part2Text) {
      toast({
        title: "切割失败",
        description: "切割位置不合适，请调整位置",
        variant: "destructive",
      });
      return;
    }

    const segmentIndex = segments.findIndex(s => s.id === selectedSegment.id);
    const newSegments = [...segments];
    
    // 创建两个新片段（先不包含翻译）
    const part1: Segment = {
      ...selectedSegment,
      id: `seg-${Date.now()}-1`,
      text: part1Text,
      translation: undefined,
    };
    
    const part2: Segment = {
      ...selectedSegment,
      id: `seg-${Date.now()}-2`,
      text: part2Text,
      translation: undefined,
    };

    // 替换原片段
    newSegments.splice(segmentIndex, 1, part1, part2);
    
    // 重新编号
    newSegments.forEach((seg, index) => {
      seg.number = index + 1;
    });

    setSegments(newSegments);
    setCutDialogOpen(false);
    
    toast({
      title: "切割成功",
      description: "正在翻译新片段...",
    });

    // 如果是英文，异步翻译新片段
    if (selectedSegment.language === 'English') {
      try {
        const response = await apiRequest("POST", "/api/segments/translate", {
          segments: [
            { id: part1.id, text: part1Text },
            { id: part2.id, text: part2Text }
          ]
        });
        const data = await response.json();
        
        // 更新翻译
        setSegments(prevSegments => 
          prevSegments.map(seg => {
            const translated = data.translations.find((t: any) => t.id === seg.id);
            return translated ? { ...seg, translation: translated.translation } : seg;
          })
        );
        
        toast({
          title: "翻译完成",
          description: "新片段已完成翻译",
        });
      } catch (error) {
        console.error("Translation failed:", error);
      }
    }
  };

  const handleMergeDown = async (index: number) => {
    if (index >= segments.length - 1) return;

    const newSegments = [...segments];
    const current = newSegments[index];
    const next = newSegments[index + 1];
    
    // 合并文本
    const mergedText = current.text + " " + next.text;
    current.text = mergedText;
    current.translation = undefined; // 清除旧翻译
    
    // 删除下一个片段
    newSegments.splice(index + 1, 1);
    
    // 重新编号
    newSegments.forEach((seg, idx) => {
      seg.number = idx + 1;
    });

    setSegments(newSegments);
    toast({
      title: "合并成功",
      description: current.language === 'English' ? "正在翻译合并后的片段..." : "片段已成功合并",
    });

    // 如果是英文，翻译合并后的片段
    if (current.language === 'English') {
      try {
        const response = await apiRequest("POST", "/api/segments/translate", {
          segments: [{ id: current.id, text: mergedText }]
        });
        const data = await response.json();
        
        setSegments(prevSegments => 
          prevSegments.map(seg => 
            seg.id === current.id 
              ? { ...seg, translation: data.translations[0].translation }
              : seg
          )
        );
        
        toast({
          title: "翻译完成",
          description: "合并后的片段已完成翻译",
        });
      } catch (error) {
        console.error("Translation failed:", error);
      }
    }
  };

  const handleMergeUp = async (index: number) => {
    if (index <= 0) return;

    const newSegments = [...segments];
    const current = newSegments[index];
    const previous = newSegments[index - 1];
    
    // 向上合并：合并到前一个片段
    const mergedText = previous.text + " " + current.text;
    previous.text = mergedText;
    previous.translation = undefined; // 清除旧翻译
    
    // 删除当前片段
    newSegments.splice(index, 1);
    
    // 重新编号
    newSegments.forEach((seg, idx) => {
      seg.number = idx + 1;
    });

    setSegments(newSegments);
    toast({
      title: "合并成功",
      description: previous.language === 'English' ? "正在翻译合并后的片段..." : "片段已成功合并",
    });

    // 如果是英文，翻译合并后的片段
    if (previous.language === 'English') {
      try {
        const response = await apiRequest("POST", "/api/segments/translate", {
          segments: [{ id: previous.id, text: mergedText }]
        });
        const data = await response.json();
        
        setSegments(prevSegments => 
          prevSegments.map(seg => 
            seg.id === previous.id 
              ? { ...seg, translation: data.translations[0].translation }
              : seg
          )
        );
        
        toast({
          title: "翻译完成",
          description: "合并后的片段已完成翻译",
        });
      } catch (error) {
        console.error("Translation failed:", error);
      }
    }
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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <TopNavbar />
        <StepProgress steps={steps} />
        <main className="container mx-auto max-w-4xl px-6 pb-16">
          <div className="text-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">AI正在智能分段中...</p>
          </div>
        </main>
      </div>
    );
  }

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
            AI已为您将文案智能分为 {segments.length} 个分镜片段，您可以切割或合并片段
          </p>
        </div>

        <div className="space-y-6">
          {segments.map((segment, index) => (
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
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => openCutDialog(segment)}
                    data-testid={`button-cut-${segment.number}`}
                  >
                    <Scissors className="h-4 w-4 mr-1" />
                    切割
                  </Button>
                  {index > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleMergeUp(index)}
                      data-testid={`button-merge-up-${segment.number}`}
                    >
                      <ArrowUpCircle className="h-4 w-4 mr-1" />
                      向上合并
                    </Button>
                  )}
                  {index < segments.length - 1 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleMergeDown(index)}
                      data-testid={`button-merge-down-${segment.number}`}
                    >
                      <ArrowDownCircle className="h-4 w-4 mr-1" />
                      向下合并
                    </Button>
                  )}
                </div>
              </div>
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-muted-foreground mb-2">文案片段</p>
                  <p className="text-base text-foreground mb-2">{segment.text}</p>
                  {segment.language === 'English' && segment.translation && (
                    <p className="text-base text-muted-foreground">{segment.translation}</p>
                  )}
                </div>
              </div>
            </Card>
          ))}

          <Button
            onClick={() => handleContinue()}
            className="w-full"
            size="lg"
            data-testid="button-continue-generation"
          >
            下一步：生成描述
          </Button>
        </div>

        <Card className="mt-6 p-6 bg-muted/50 border border-muted-foreground/20">
          <h3 className="font-medium text-foreground mb-2">分段成功</h3>
          <p className="text-sm text-muted-foreground">
            已生成 {segments.length} 个分段，您可以继续编辑或进入下一步
          </p>
        </Card>
      </main>

      {/* 切割对话框 */}
      <Dialog open={cutDialogOpen} onOpenChange={setCutDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Scissors className="h-5 w-5" />
              切割分段
            </DialogTitle>
            <DialogDescription>
              拖动滑块选择切割点，将文案分成两个独立的分段
            </DialogDescription>
          </DialogHeader>
          
          {selectedSegment && (
            <div className="space-y-6 py-4">
              <div>
                <p className="text-sm text-muted-foreground mb-3">
                  切割位置：第 {cutPosition} 个字符
                </p>
                <Slider
                  value={[cutPosition]}
                  onValueChange={(value) => setCutPosition(value[0])}
                  min={1}
                  max={selectedSegment.text.length - 1}
                  step={1}
                  className="w-full"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Card className="p-4 bg-muted">
                  <p className="text-sm text-muted-foreground mb-2">
                    第一部分 ({cutPosition} 字符)
                  </p>
                  <p className="text-sm text-foreground">
                    {selectedSegment.text.slice(0, cutPosition).trim()}
                  </p>
                </Card>
                
                <Card className="p-4 bg-muted">
                  <p className="text-sm text-muted-foreground mb-2">
                    第二部分 ({selectedSegment.text.length - cutPosition} 字符)
                  </p>
                  <p className="text-sm text-foreground">
                    {selectedSegment.text.slice(cutPosition).trim()}
                  </p>
                </Card>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setCutDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={handleCut} data-testid="button-confirm-cut">
              确认切割
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
