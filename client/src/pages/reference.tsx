import { TopNavbar } from "@/components/top-navbar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useLocation } from "wouter";
import { ArrowLeft, Upload } from "lucide-react";

export default function ReferencePage() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen bg-background">
      <TopNavbar />
      
      <main className="container mx-auto max-w-4xl px-6 py-16">
        <Button
          variant="ghost"
          onClick={() => setLocation("/")}
          className="mb-6"
          data-testid="button-back"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          返回首页
        </Button>

        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-foreground mb-4">
            参考视频制作
          </h1>
          <p className="text-lg text-muted-foreground">
            此功能正在开发中，敬请期待
          </p>
        </div>

        <Card className="p-12 text-center border-2 border-dashed border-border">
          <Upload className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-xl font-semibold text-foreground mb-2">
            上传参考视频
          </h3>
          <p className="text-muted-foreground mb-6">
            AI将分析视频并提炼主线主题，同风格镜像主题的视频
          </p>
          <Button disabled>即将推出</Button>
        </Card>
      </main>
    </div>
  );
}
