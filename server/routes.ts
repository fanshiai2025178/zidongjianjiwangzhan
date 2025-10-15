import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertProjectSchema } from "@shared/schema";
import { callJuguangAPI, generateImageWithJuguang } from "./juguang-api";

// DeepSeek API调用（已废弃，改用 Gemini）
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

      // 预设风格映射表（与前端保持一致）
      const presetStyleDescriptions: Record<string, string> = {
        "cinema": "电影级质感，使用电影镜头语言（景深、移动镜头、专业打光），画面层次丰富，色彩分级明确，氛围营造强烈",
        "anime": "日系动漫画风，线条清晰，色彩鲜艳饱和，人物表情夸张生动，背景简化处理，光影效果动漫化",
        "realistic": "照片级写实风格，真实自然的光影效果，细节丰富，材质质感真实，色彩自然准确，符合物理规律",
        "fantasy": "奇幻魔法氛围，神秘梦幻的色调（紫、蓝、金色为主），魔法光效，古堡建筑元素，超现实场景",
        "retro": "80-90年代复古风，胶片颗粒感，褪色效果，怀旧色调（暖黄、橙红、棕色），老式滤镜质感",
        "minimalist": "极简主义，大量留白，简洁构图，色彩克制（单色或双色为主），注重几何形状和线条",
        "noir": "黑色电影风格，黑白或低饱和度，强烈明暗对比，戏剧性光影，悬疑压抑氛围",
        "cyberpunk": "赛博朋克未来感，霓虹灯光效果（蓝、粉、紫色），科技元素，城市夜景，雨后反光质感"
      };

      // 构建风格参考信息
      let styleContext = "";
      if (styleSettings) {
        // 角色参考
        if (styleSettings.useCharacterReference && styleSettings.characterImageUrl) {
          styleContext += "\n\n【角色一致性要求 - 必须严格遵守】\n用户已上传角色参考图。在所有镜头描述中：\n• 主角必须保持相同的外貌特征（性别、年龄段、发型、体型、服装风格）\n• 描述具体特征：如\"年轻女性，齐肩黑发，白色衬衫\"而非\"主角\"或\"她\"\n• 确保整个故事中角色形象完全一致，不能出现不同的人物形象\n• 如无法确定具体特征，使用\"同一位角色\"并保持描述统一";
        }
        
        // 风格参考
        if (styleSettings.useStyleReference && styleSettings.styleImageUrl) {
          styleContext += "\n\n【视觉风格要求 - 必须严格遵守】\n用户已上传风格参考图。所有镜头必须保持：\n• 相同的色调和色彩方案\n• 一致的光影风格和氛围\n• 统一的艺术表现手法\n• 相似的视觉质感和细节处理";
        }
        
        // 预设风格
        if (styleSettings.usePresetStyle && styleSettings.presetStyleId) {
          const styleDesc = presetStyleDescriptions[styleSettings.presetStyleId];
          if (styleDesc) {
            styleContext += `\n\n【预设风格要求 - 必须严格遵守】\n风格：${styleSettings.presetStyleId}\n特征：${styleDesc}\n\n所有镜头描述必须体现以上风格特征，保持视觉风格的完全统一。`;
          }
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

【视频提示词核心要求】
1. **动态表现**：必须描述清晰的动作和运动（人物移动、物体变化、镜头运动等）
2. **镜头语言**：明确镜头运动方式（推进、拉远、平移、跟随、摇镜等）
3. **时间演进**：描述画面的时间流动和变化过程
4. **适配比例**：针对${aspectRatio}${aspectRatio === '9:16' || aspectRatio === '3:4' ? '竖屏' : aspectRatio === '1:1' ? '方形' : '横屏'}构图优化动态表现
5. **中文撰写**：使用中文，描述具体生动

【视频特有元素（区别于静态图片）】
• **动作描述**：人物/物体的具体动作和姿态变化（如"缓缓转身"、"抬手遮挡"）
• **镜头运动**：明确镜头移动方式（如"镜头从远处推进至特写"、"跟随人物平移"）
• **时间流程**：画面的起始→发展→结束（如"开始时...然后...最后..."）
• **动态元素**：环境中的运动元素（如"飘落的树叶"、"流动的人群"）
• **节奏控制**：动作的速度和节奏（如"缓慢"、"急促"、"停顿"）

【必须包含的元素】
• 主体动作：具体的动作描述，不能是静止状态
• 场景环境：具体场所、氛围、动态光影变化
• 镜头运动：推拉摇移等专业镜头术语
• 视觉细节：色彩、质感、运动轨迹
• 情绪演进：情绪的变化和起伏${styleContext}

【格式要求】
- 限制在200字以内
- 避免抽象概念，使用具象化动作描述
- 不使用markdown格式

直接输出提示词，无需其他说明。`;
        
        systemPrompt = "你是专业的AI视频提示词撰写专家，深刻理解镜头语言、运动美学和视觉叙事。你擅长将文字转化为动态画面描述，精确指导AI生成流畅自然的视频内容。";
      } else {
        // 文生图+图生视频：生成静态图片描述（强调画面、构图、色彩、氛围）
        const orientationDescription = aspectRatio === '9:16' || aspectRatio === '3:4' 
          ? '竖屏（纵向构图，高度大于宽度，适合人物特写、全身像）' 
          : aspectRatio === '1:1' 
          ? '方形（正方形构图，宽高相等，适合居中对称布局）' 
          : '横屏（横向构图，宽度大于高度，适合风景、场景叙事）';

        descriptionPrompt = `请为以下文案生成一个专业的AI图片生成提示词（遵循Seedream 4.0规范）。

文案内容：
${contentToDescribe}

画面比例：${aspectRatio} ${orientationDescription}

【图片提示词核心要求】
1. **静态定格**：描述一个静止的瞬间画面，不包含动作过程
2. **空间构图**：明确画面空间布局和元素位置关系
3. **视觉细节**：强调色彩、质感、光影等视觉元素
4. **适配比例**：针对${aspectRatio}${aspectRatio === '9:16' || aspectRatio === '3:4' ? '竖屏' : aspectRatio === '1:1' ? '方形' : '横屏'}优化构图
5. **中文撰写**：使用中文，遵循"主体+环境+细节"结构

【图片特有元素（区别于视频）】
• **静态姿态**：人物的固定姿态和表情（如"站立"、"侧身回眸"），不描述动作过程
• **瞬间定格**：捕捉一个决定性瞬间（如"泪水滑落脸颊的瞬间"）
• **空间布局**：前景、中景、后景的层次安排
• **细节刻画**：材质、纹理、光影细节的精确描述
• **氛围营造**：通过静态元素营造情绪（色调、光线、环境）

【必须包含的元素】
• 主体描述：人物/物体的静态姿态、表情、服饰特征（具体化）
• 环境场景：具体场所、时间、天气、空间层次
• 构图说明：**明确标注"采用${aspectRatio}${aspectRatio === '9:16' || aspectRatio === '3:4' ? '竖构图' : aspectRatio === '1:1' ? '方形构图' : '横构图'}"**
• 光影效果：光源位置、方向、明暗对比、氛围
• 色彩方案：主色调、配色、饱和度、色彩情绪
• 质感细节：材质、纹理、表面质感${styleContext}

【格式要求】
- 限制在200字以内
- 避免抽象词汇，使用具象化视觉描述
- 不使用markdown格式
- 不包含版权内容（品牌、明星、艺术家名字）

直接输出提示词，无需其他说明。`;
        
        systemPrompt = "你是专业的AI图片提示词撰写专家，精通Seedream 4.0图片生成规范和视觉艺术。你擅长将文字转化为静态画面描述，准确指导AI生成高质量、艺术性强的图片内容。";
      }
      
      const description = await callDeepSeekAPI(descriptionPrompt, systemPrompt);
      console.log("[Description] Generated description successfully");
      
      res.json({ description: description.trim() });
    } catch (error) {
      console.error("[Description] Error:", error);
      res.status(500).json({ error: "Failed to generate description", details: error instanceof Error ? error.message : String(error) });
    }
  });

  // Gemini 图片生成API
  app.post("/api/images/generate", async (req, res) => {
    try {
      const { prompt, aspectRatio = "16:9" } = req.body;
      if (!prompt) {
        return res.status(400).json({ error: "Prompt is required" });
      }

      console.log("[Gemini Image] Generating image...");
      console.log("[Gemini Image] Aspect Ratio:", aspectRatio);
      console.log("[Gemini Image] Prompt:", prompt.substring(0, 100) + "...");

      // 根据比例优化提示词
      const orientationHint = aspectRatio === '9:16' || aspectRatio === '3:4' 
        ? '竖屏构图（portrait orientation）' 
        : aspectRatio === '1:1' 
        ? '方形构图（square composition）' 
        : '横屏构图（landscape orientation）';
      
      const enhancedPrompt = `${prompt}，${orientationHint}，高质量，细节丰富`;

      // 调用聚光Chat图片生成
      const imageUrl = await generateImageWithJuguang(enhancedPrompt);

      console.log("[Gemini Image] Successfully generated image");
      
      res.json({ 
        imageUrl: imageUrl,
      });
    } catch (error) {
      console.error("[Gemini Image] Error:", error);
      
      // 检查是否是内容过滤错误
      const errorMessage = error instanceof Error ? error.message : String(error);
      const isContentFilter = errorMessage.includes("empty response") || 
                             errorMessage.includes("no meaningful content") ||
                             errorMessage.includes("channel:empty_response");
      
      res.status(500).json({ 
        error: isContentFilter ? "内容被过滤" : "图片生成失败",
        details: isContentFilter 
          ? "提示词包含敏感内容被API过滤，请尝试重新生成描述词或编辑描述词" 
          : errorMessage
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
