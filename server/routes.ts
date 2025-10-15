import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertProjectSchema } from "@shared/schema";

// DeepSeek API调用
async function callDeepSeekAPI(prompt: string, systemPrompt?: string): Promise<string> {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    throw new Error("DEEPSEEK_API_KEY is not configured");
  }

  const response = await fetch("https://api.deepseek.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "deepseek-chat",
      messages: [
        {
          role: "system",
          content: systemPrompt || "你是一个专业的AI助手。"
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`DeepSeek API error: ${error}`);
  }

  const data = await response.json();
  return data.choices[0]?.message?.content || "";
}

export async function registerRoutes(app: Express): Promise<Server> {
  // 获取所有项目
  app.get("/api/projects", async (req, res) => {
    try {
      const projects = await storage.getAllProjects();
      res.json(projects);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch projects" });
    }
  });

  // 获取单个项目
  app.get("/api/projects/:id", async (req, res) => {
    try {
      const project = await storage.getProject(req.params.id);
      if (!project) {
        return res.status(404).json({ error: "Project not found" });
      }
      res.json(project);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch project" });
    }
  });

  // 创建新项目
  app.post("/api/projects", async (req, res) => {
    try {
      const data = insertProjectSchema.parse(req.body);
      const project = await storage.createProject(data);
      res.status(201).json(project);
    } catch (error) {
      res.status(400).json({ error: "Invalid project data" });
    }
  });

  // 更新项目
  app.patch("/api/projects/:id", async (req, res) => {
    try {
      const project = await storage.updateProject(req.params.id, req.body);
      if (!project) {
        return res.status(404).json({ error: "Project not found" });
      }
      res.json(project);
    } catch (error) {
      res.status(500).json({ error: "Failed to update project" });
    }
  });

  // 删除项目
  app.delete("/api/projects/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteProject(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Project not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete project" });
    }
  });

  // 翻译片段API
  app.post("/api/segments/translate", async (req, res) => {
    try {
      const { segments } = req.body;
      if (!segments || !Array.isArray(segments)) {
        return res.status(400).json({ error: "Segments array is required" });
      }

      console.log("[Translation] Translating", segments.length, "segments");

      const translationPrompt = `请将以下英文文本片段翻译成中文，保持原意和专业性。直接返回JSON数组格式，每个元素包含id和translation字段：\n\n${JSON.stringify(segments)}`;
      
      const translationResult = await callDeepSeekAPI(translationPrompt, "你是一个专业的英中翻译助手。");
      const cleanTranslation = translationResult.replace(/```json\n?|\n?```/g, '').trim();
      const translations = JSON.parse(cleanTranslation);
      
      console.log("[Translation] Successfully translated segments");
      res.json({ translations });
    } catch (error) {
      console.error("[Translation] Error:", error);
      res.status(500).json({ error: "Failed to translate segments", details: error instanceof Error ? error.message : String(error) });
    }
  });

  // 生成分镜描述API
  app.post("/api/descriptions/generate", async (req, res) => {
    try {
      const { text, translation, language, generationMode = "text-to-image-to-video", aspectRatio = "16:9", styleSettings } = req.body;
      if (!text) {
        return res.status(400).json({ error: "Text is required" });
      }

      console.log("[Description] Generating description for:", text.substring(0, 30) + "...");
      console.log("[Description] Generation mode:", generationMode);
      console.log("[Description] Aspect ratio:", aspectRatio);
      console.log("[Description] Style settings:", styleSettings ? "Provided" : "None");

      // 构建提示词
      const contentToDescribe = language === "English" && translation 
        ? `${text}\n(中文翻译: ${translation})`
        : text;

      // 构建风格参考信息
      let styleContext = "";
      if (styleSettings) {
        if (styleSettings.useCharacterReference && styleSettings.characterImageUrl) {
          styleContext += "\n\n【角色参考】\n已提供角色参考图，请在描述中保持角色的基本特征和风格一致性。";
        }
        if (styleSettings.useStyleReference && styleSettings.styleImageUrl) {
          styleContext += "\n\n【风格参考】\n已提供风格参考图，请在描述中体现相似的视觉风格、色调和艺术表现手法。";
        }
        if (styleSettings.usePresetStyle && styleSettings.presetStyleId) {
          styleContext += `\n\n【预设风格】\n使用预设风格：${styleSettings.presetStyleId}，请在描述中体现该风格的特点。`;
        }
      }

      let descriptionPrompt: string;
      let systemPrompt: string;

      if (generationMode === "text-to-video") {
        // 文生视频：生成视频场景描述（强调动态、运动、镜头运动）
        descriptionPrompt = `请为以下文案生成一个专业的AI视频生成提示词。

文案内容：
${contentToDescribe}

画面比例：${aspectRatio}（${aspectRatio === '9:16' || aspectRatio === '3:4' ? '竖屏' : aspectRatio === '1:1' ? '方形' : '横屏'}）

请按照以下要求生成视频提示词：

【核心要求】
1. 使用中文撰写
2. 描述具体、生动、富有细节
3. 强调动态变化和镜头运动
4. 适配${aspectRatio}${aspectRatio === '9:16' || aspectRatio === '3:4' ? '竖屏' : aspectRatio === '1:1' ? '方形' : '横屏'}构图

【必须包含的元素】
• 主体描述：人物/物体的动作、表情、姿态变化
• 场景环境：具体的场所、氛围、光影效果
• 镜头语言：推拉摇移、特写、全景等镜头运动
• 视觉细节：色彩、质感、动态元素
• 节奏变化：画面转场、速度变化、情绪起伏

【注意事项】
- 避免抽象概念，使用具象化描述
- 避免重复描述，每个细节只说一次
- 限制在200字以内
- 不使用markdown格式${styleContext}

直接输出提示词，无需其他说明。`;
        
        systemPrompt = "你是专业的AI视频提示词撰写专家，深刻理解镜头语言和视觉叙事。你的提示词能够准确指导AI生成高质量的动态视频内容。";
      } else {
        // 文生图+图生视频：生成静态图片描述（强调画面、构图、色彩、氛围）
        descriptionPrompt = `请为以下文案生成一个专业的AI图片生成提示词（遵循Seedream 4.0规范）。

文案内容：
${contentToDescribe}

画面比例：${aspectRatio}（${aspectRatio === '9:16' || aspectRatio === '3:4' ? '竖屏' : aspectRatio === '1:1' ? '方形' : '横屏'}）

请按照以下要求生成图片提示词：

【核心要求】
1. 使用中文撰写，表述清晰准确
2. 描述具体、可视化、富有细节
3. 适配${aspectRatio}${aspectRatio === '9:16' || aspectRatio === '3:4' ? '竖屏' : aspectRatio === '1:1' ? '方形' : '横屏'}构图特点
4. 遵循"主体+环境+细节"结构

【必须包含的元素】
• 主体描述：人物/物体的姿态、表情、服饰、特征（具体化）
• 环境场景：具体场所、时间、天气、空间感
• 构图视角：${aspectRatio === '9:16' || aspectRatio === '3:4' ? '竖构图，适合人物特写或全身像' : aspectRatio === '1:1' ? '方形构图，居中对称或三分法' : '横构图，适合风景或场景叙事'}
• 光影效果：光源方向、明暗对比、氛围营造
• 色彩基调：主色调、色彩搭配、情绪表达
• 质感细节：材质、纹理、质感表现

【优化技巧】
- 主体放在前面：先描述最重要的元素
- 使用具象词汇：避免"美丽""震撼"等抽象词
- 画面层次感：前景、中景、后景的关系
- 情绪氛围：通过环境和光影传达情感

【注意事项】
- 避免重复描述，每个细节只说一次
- 限制在200字以内
- 不使用markdown格式
- 不包含版权内容（品牌、明星、艺术家名字）${styleContext}

直接输出提示词，无需其他说明。`;
        
        systemPrompt = "你是专业的AI图片提示词撰写专家，精通Seedream 4.0图片生成规范。你的提示词能够准确指导AI生成高质量、符合预期的图片内容，具有出色的视觉表现力和艺术性。";
      }
      
      const description = await callDeepSeekAPI(descriptionPrompt, systemPrompt);
      console.log("[Description] Generated description successfully");
      
      res.json({ description: description.trim() });
    } catch (error) {
      console.error("[Description] Error:", error);
      res.status(500).json({ error: "Failed to generate description", details: error instanceof Error ? error.message : String(error) });
    }
  });

  // 火山引擎图片生成API
  app.post("/api/images/generate", async (req, res) => {
    try {
      const { prompt, aspectRatio = "16:9" } = req.body;
      if (!prompt) {
        return res.status(400).json({ error: "Prompt is required" });
      }

      const apiKey = process.env.VOLCENGINE_ACCESS_KEY;
      const endpointId = process.env.VOLCENGINE_ENDPOINT_ID;
      
      if (!apiKey) {
        console.error("[Image] VOLCENGINE_ACCESS_KEY not configured");
        return res.status(500).json({ error: "火山引擎API密钥未配置，请设置VOLCENGINE_ACCESS_KEY环境变量" });
      }

      if (!endpointId) {
        console.error("[Image] VOLCENGINE_ENDPOINT_ID not configured");
        return res.status(500).json({ error: "火山引擎Endpoint ID未配置，请设置VOLCENGINE_ENDPOINT_ID环境变量" });
      }

      // 根据比例设置图片尺寸（火山引擎要求至少921600像素）
      const sizeMap: Record<string, string> = {
        "9:16": "720x1280",   // 921600 pixels
        "3:4": "864x1152",    // 995328 pixels
        "1:1": "1024x1024",   // 1048576 pixels
        "16:9": "1280x720",   // 921600 pixels
        "4:3": "1152x864",    // 995328 pixels
      };
      const size = sizeMap[aspectRatio] || "1024x1024";

      console.log("[Image] Generating image...");
      console.log("[Image] Endpoint ID:", endpointId);
      console.log("[Image] API Key (first 10 chars):", apiKey.substring(0, 10) + "...");
      console.log("[Image] Aspect Ratio:", aspectRatio);
      console.log("[Image] Size:", size);
      console.log("[Image] Prompt:", prompt.substring(0, 100) + "...");

      // 调用火山引擎图片生成API
      const requestBody = {
        model: endpointId,
        prompt: prompt,
        size: size,
        n: 1,
      };
      
      console.log("[Image] Request body:", JSON.stringify(requestBody));

      const response = await fetch("https://ark.cn-beijing.volces.com/api/v3/images/generations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`,
        },
        body: JSON.stringify(requestBody),
      });

      console.log("[Image] Response status:", response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error("[Image] API Error Response:", errorText);
        
        // 如果是认证错误，返回更友好的提示
        if (response.status === 401) {
          return res.status(401).json({ 
            error: "火山引擎API认证失败", 
            details: "请检查VOLCENGINE_ACCESS_KEY是否正确配置。API密钥应该从火山引擎控制台的API Key管理获取。",
            rawError: errorText
          });
        }
        
        throw new Error(`火山引擎API错误: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      console.log("[Image] API Response:", JSON.stringify(data).substring(0, 300));
      
      // 火山引擎API返回格式通常是 { data: [{ url: "..." }] }
      const imageUrl = data.data?.[0]?.url || data.url || null;
      
      if (!imageUrl) {
        console.error("[Image] No image URL in response:", JSON.stringify(data));
        throw new Error("API返回数据中没有找到图片URL");
      }

      console.log("[Image] Successfully generated image:", imageUrl);
      
      res.json({ 
        imageUrl: imageUrl,
      });
    } catch (error) {
      console.error("[Image] Error:", error);
      res.status(500).json({ 
        error: "图片生成失败", 
        details: error instanceof Error ? error.message : String(error) 
      });
    }
  });

  // 智能分段API
  app.post("/api/segments/generate", async (req, res) => {
    try {
      const { scriptContent } = req.body;
      if (!scriptContent) {
        return res.status(400).json({ error: "Script content is required" });
      }

      console.log("[Segments] Starting generation for script:", scriptContent.substring(0, 50) + "...");

      // 检测语言
      const isChinese = /[\u4e00-\u9fa5]/.test(scriptContent);
      const language = isChinese ? "Chinese" : "English";

      // 第一步：智能分段
      const segmentPrompt = language === "English" 
        ? `Please split the following English script into video shot segments. Each segment should be a complete semantic unit with moderate length (suggest 10-20 words). Keep the original English text. Return JSON array format directly, each element contains only a text field:\n\n${scriptContent}`
        : `请将以下文案分成适合视频拍摄的镜头片段。每个片段应该是一个完整的语义单元，长度适中（建议20-50字）。请直接返回JSON数组格式，每个元素只包含text字段：\n\n${scriptContent}`;
      
      const systemPrompt = language === "English" 
        ? "You are a professional video script segmentation assistant. Always keep the original English text."
        : "你是一个专业的视频脚本分段助手。";
      
      const result = await callDeepSeekAPI(segmentPrompt, systemPrompt);
      console.log("[Segments] DeepSeek API response:", result);
      
      // 尝试解析AI返回的JSON
      let segments;
      try {
        // 移除可能的markdown代码块标记
        const cleanResult = result.replace(/```json\n?|\n?```/g, '').trim();
        segments = JSON.parse(cleanResult);
        console.log("[Segments] Successfully parsed segments:", segments.length);
      } catch (parseError) {
        console.log("[Segments] JSON parse failed, using fallback segmentation");
        // 如果解析失败，使用简单的段落分割作为备选
        const splitPattern = isChinese ? /[。！？\n]+/ : /[.!?\n]+/;
        segments = scriptContent
          .split(splitPattern)
          .filter((text: string) => text.trim())
          .map((text: string) => ({ text: text.trim() }));
      }

      // 第二步：如果是英文，翻译每个片段
      if (language === "English") {
        console.log("[Segments] Translating English segments to Chinese...");
        const translationPrompt = `请将以下英文文本片段翻译成中文，保持原意和专业性。直接返回JSON数组格式，每个元素包含translation字段：\n\n${JSON.stringify(segments.map((s: any) => s.text || s))}`;
        
        try {
          const translationResult = await callDeepSeekAPI(translationPrompt, "你是一个专业的英中翻译助手。");
          const cleanTranslation = translationResult.replace(/```json\n?|\n?```/g, '').trim();
          const translations = JSON.parse(cleanTranslation);
          
          // 合并翻译
          segments = segments.map((seg: any, index: number) => ({
            text: seg.text || seg,
            translation: translations[index]?.translation || translations[index] || ""
          }));
        } catch (translationError) {
          console.log("[Segments] Translation failed, segments will have no translation");
        }
      }

      // 为每个片段添加ID和序号
      const formattedSegments = segments.map((seg: any, index: number) => ({
        id: `seg-${Date.now()}-${index}`,
        number: index + 1,
        language: language,
        text: seg.text || seg,
        translation: seg.translation || "",
        sceneDescription: "",
      }));

      console.log("[Segments] Returning", formattedSegments.length, "segments");
      res.json({ segments: formattedSegments });
    } catch (error) {
      console.error("[Segments] Error:", error);
      res.status(500).json({ error: "Failed to generate segments", details: error instanceof Error ? error.message : String(error) });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
