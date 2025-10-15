import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { ProjectProvider } from "@/components/project-provider";
import NotFound from "@/pages/not-found";

// Pages
import Home from "@/pages/home";
import StylePage from "@/pages/ai-original/style";
import ScriptPage from "@/pages/ai-original/script";
import SegmentsPage from "@/pages/ai-original/segments";
import GenerationModePage from "@/pages/ai-original/generation-mode";
import DescriptionsPage from "@/pages/ai-original/descriptions";
import ResultPage from "@/pages/ai-original/result";
import CommentaryPage from "@/pages/commentary";
import ReferencePage from "@/pages/reference";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      
      {/* AI Original Video Creation Flow */}
      <Route path="/ai-original/style" component={StylePage} />
      <Route path="/ai-original/script" component={ScriptPage} />
      <Route path="/ai-original/segments" component={SegmentsPage} />
      <Route path="/ai-original/generation-mode" component={GenerationModePage} />
      <Route path="/ai-original/descriptions" component={DescriptionsPage} />
      <Route path="/ai-original/result" component={ResultPage} />
      
      {/* Other Creation Modes */}
      <Route path="/commentary" component={CommentaryPage} />
      <Route path="/reference" component={ReferencePage} />
      
      {/* Fallback to 404 */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="dark">
        <ProjectProvider>
          <TooltipProvider>
            <Toaster />
            <Router />
          </TooltipProvider>
        </ProjectProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
