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

      // 预设风格映射表（英文描述）
      const presetStyleDescriptions: Record<string, string> = {
        "cinema": "Cinematic quality with film language (depth of field, camera movements, professional lighting), rich visual layers, clear color grading, strong atmospheric presence",
        "anime": "Japanese anime style with clean lines, vivid saturated colors, exaggerated character expressions, simplified backgrounds, anime-style lighting effects",
        "realistic": "Photorealistic style with natural lighting effects, rich details, authentic material textures, accurate natural colors, follows physical laws",
        "fantasy": "Fantasy magical atmosphere with mystical dreamy tones (purple, blue, gold dominant), magical light effects, castle architecture elements, surreal scenes",
        "retro": "80s-90s retro vibe with film grain, faded effects, nostalgic color palette (warm yellow, orange-red, brown), vintage filter textures",
        "minimalist": "Minimalist approach with ample negative space, clean composition, restrained colors (monochrome or dual-color), emphasis on geometric shapes and lines",
        "noir": "Film noir style with black-white or desaturated tones, strong contrast between light and shadow, dramatic lighting, suspenseful oppressive atmosphere",
        "cyberpunk": "Cyberpunk futuristic feel with neon lighting effects (blue, pink, purple), tech elements, urban nightscape, rain-soaked reflective textures"
      };

      // 构建风格参考信息（英文）
      let styleContext = "";
      if (styleSettings) {
        // 角色参考
        if (styleSettings.useCharacterReference && styleSettings.characterImageUrl) {
          styleContext += "\n\n[CHARACTER CONSISTENCY REQUIREMENTS - MUST STRICTLY FOLLOW]\nUser has uploaded a character reference image. In all shot descriptions:\n• Main character must maintain the same appearance features (gender, age, hairstyle, body type, clothing style)\n• Describe specific features: e.g., 'young woman with shoulder-length black hair in white shirt' rather than 'protagonist' or 'she'\n• Ensure character image is completely consistent throughout the story, no different character appearances\n• If specific features cannot be determined, use 'the same character' and keep descriptions uniform";
        }
        
        // 风格参考
        if (styleSettings.useStyleReference && styleSettings.styleImageUrl) {
          styleContext += "\n\n[VISUAL STYLE REQUIREMENTS - MUST STRICTLY FOLLOW]\nUser has uploaded a style reference image. All shots must maintain:\n• Same color tones and color schemes\n• Consistent lighting style and atmosphere\n• Unified artistic expression techniques\n• Similar visual textures and detail treatment";
        }
        
        // 预设风格
        if (styleSettings.usePresetStyle && styleSettings.presetStyleId) {
          const styleDesc = presetStyleDescriptions[styleSettings.presetStyleId];
          if (styleDesc) {
            styleContext += `\n\n[PRESET STYLE REQUIREMENTS - MUST STRICTLY FOLLOW]\nStyle: ${styleSettings.presetStyleId}\nCharacteristics: ${styleDesc}\n\nAll shot descriptions must reflect the above style characteristics and maintain complete visual style unity.`;
          }
        }
      }

      let descriptionPrompt: string;
      let systemPrompt: string;

      if (generationMode === "text-to-video") {
        // 文生视频：生成视频场景描述（强调动态、运动、镜头运动）
        descriptionPrompt = `Generate a professional AI video generation prompt for the following content.

Content:
${contentToDescribe}

Aspect Ratio: ${aspectRatio} (${aspectRatio === '9:16' || aspectRatio === '3:4' ? 'Vertical/Portrait' : aspectRatio === '1:1' ? 'Square' : 'Horizontal/Landscape'})

[VIDEO PROMPT CORE REQUIREMENTS]
1. **Dynamic Expression**: Must describe clear actions and movements (character movement, object changes, camera movements, etc.)
2. **Camera Language**: Specify camera movement methods (push in, pull out, pan, follow, tilt, etc.)
3. **Time Evolution**: Describe temporal flow and progression of the scene
4. **Ratio Adaptation**: Optimize dynamic performance for ${aspectRatio} ${aspectRatio === '9:16' || aspectRatio === '3:4' ? 'vertical' : aspectRatio === '1:1' ? 'square' : 'horizontal'} composition
5. **English Output**: Write in English with specific, vivid descriptions

[VIDEO-SPECIFIC ELEMENTS (Distinguished from Static Images)]
• **Action Description**: Specific actions and posture changes of characters/objects (e.g., "slowly turns around", "raises hand to shield")
• **Camera Movement**: Clear camera motion methods (e.g., "camera pushes from distance to close-up", "follows character panning")
• **Temporal Flow**: Scene progression from start → development → end (e.g., "begins with... then... finally...")
• **Dynamic Elements**: Moving elements in environment (e.g., "falling leaves", "flowing crowd")
• **Rhythm Control**: Speed and rhythm of actions (e.g., "slowly", "rapidly", "pause")

[REQUIRED ELEMENTS]
• Subject Action: Specific action descriptions, not static states
• Scene Environment: Specific location, atmosphere, dynamic lighting changes
• Camera Movement: Professional camera terms like push/pull/pan/tilt
• Visual Details: Colors, textures, motion trajectories
• Emotional Evolution: Changes and fluctuations in emotion${styleContext}

[FORMAT REQUIREMENTS]
- Limit to 200 words
- Avoid abstract concepts, use concrete action descriptions
- No markdown formatting
- Output in English

Output the prompt directly without additional explanation.`;
        
        systemPrompt = "You are a professional AI video prompt expert with deep understanding of cinematography, movement aesthetics, and visual storytelling. You excel at transforming text into dynamic scene descriptions that precisely guide AI to generate smooth, natural video content.";
      } else {
        // 文生图+图生视频：生成静态图片描述（强调画面、构图、色彩、氛围）
        const orientationDescription = aspectRatio === '9:16' || aspectRatio === '3:4' 
          ? 'Vertical/Portrait (height > width, suitable for character close-ups, full body shots)' 
          : aspectRatio === '1:1' 
          ? 'Square (equal width and height, suitable for centered symmetric layouts)' 
          : 'Horizontal/Landscape (width > height, suitable for scenery, scene narratives)';

        descriptionPrompt = `Generate a professional AI image generation prompt (following Seedream 4.0 specifications) for the following content.

Content:
${contentToDescribe}

Aspect Ratio: ${aspectRatio} ${orientationDescription}

[IMAGE PROMPT CORE REQUIREMENTS]
1. **Static Freeze Frame**: Describe a still moment, not an action process
2. **Spatial Composition**: Clearly define spatial layout and element positioning
3. **Visual Details**: Emphasize colors, textures, lighting, and other visual elements
4. **Ratio Adaptation**: Optimize composition for ${aspectRatio} ${aspectRatio === '9:16' || aspectRatio === '3:4' ? 'vertical' : aspectRatio === '1:1' ? 'square' : 'horizontal'} format
5. **English Output**: Write in English following "Subject + Environment + Details" structure

[IMAGE-SPECIFIC ELEMENTS (Distinguished from Video)]
• **Static Posture**: Fixed postures and expressions of characters (e.g., "standing", "side glance"), not action processes
• **Decisive Moment**: Capture a decisive instant (e.g., "the moment tear slides down cheek")
• **Spatial Layout**: Layering of foreground, midground, and background
• **Detail Rendering**: Precise description of materials, textures, and lighting details
• **Atmosphere Creation**: Convey emotions through static elements (tones, lighting, environment)

[REQUIRED ELEMENTS]
• Subject Description: Static posture, expression, and clothing features of characters/objects (specific)
• Environment Scene: Specific location, time, weather, spatial layers
• Composition Note: **Explicitly mark "using ${aspectRatio} ${aspectRatio === '9:16' || aspectRatio === '3:4' ? 'vertical composition' : aspectRatio === '1:1' ? 'square composition' : 'horizontal composition'}"**
• Lighting Effects: Light source position, direction, contrast, atmosphere
• Color Scheme: Main tone, color pairing, saturation, color emotion
• Texture Details: Materials, textures, surface qualities${styleContext}

[FORMAT REQUIREMENTS]
- Limit to 200 words
- Avoid abstract terms, use concrete visual descriptions
- No markdown formatting
- No copyrighted content (brands, celebrities, artist names)
- Output in English

Output the prompt directly without additional explanation.`;
        
        systemPrompt = "You are a professional AI image prompt expert, proficient in Seedream 4.0 image generation specifications and visual arts. You excel at transforming text into static scene descriptions, accurately guiding AI to generate high-quality, artistic image content.";
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
