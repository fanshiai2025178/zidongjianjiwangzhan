import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertProjectSchema } from "@shared/schema";
import { callJuguangAPI, generateImageWithJuguang } from "./juguang-api";
import { callVolcengineDeepSeek, translateText, analyzeStyle } from "./volcengine-api";

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

  // 翻译片段API（使用专门的翻译API）
  app.post("/api/segments/translate", async (req, res) => {
    try {
      const { segments } = req.body;
      if (!segments || !Array.isArray(segments)) {
        return res.status(400).json({ error: "Segments array is required" });
      }

      console.log("[Segments Translation] Translating", segments.length, "segments using dedicated translate API");

      const translationResult = await translateText(JSON.stringify(segments), "segments", "en-to-zh");
      const cleanTranslation = translationResult.replace(/```json\n?|\n?```/g, '').trim();
      const translations = JSON.parse(cleanTranslation);
      
      console.log("[Segments Translation] Successfully translated segments");
      res.json({ translations });
    } catch (error) {
      console.error("[Segments Translation] Error:", error);
      res.status(500).json({ error: "Failed to translate segments", details: error instanceof Error ? error.message : String(error) });
    }
  });

  // API 0: Director - 生成 Visual Bible（视觉圣经）
  app.post("/api/visual-bible/generate", async (req, res) => {
    try {
      const { fullText } = req.body;
      if (!fullText) {
        return res.status(400).json({ error: "Full text is required" });
      }

      const volcengineEndpointId = process.env.VOLCENGINE_DEEPSEEK_API_KEY;
      const apiKey = process.env.VOLCENGINE_ACCESS_KEY;
      
      if (!volcengineEndpointId || !apiKey) {
        return res.status(500).json({ error: "Volcengine DeepSeek credentials are not configured" });
      }

      console.log("[Visual Bible - Director] Analyzing full text, length:", fullText.length);

      const directorPrompt = `# AI Persona: Film Director (Visual Bible Creator)

## Mission
You are an experienced film director. Read the **entire script** provided by the user and create a comprehensive "Visual Bible" — a master plan that will guide all storyboard artists to maintain perfect visual consistency across every scene.

## Input
**[FULL_SCRIPT]:**
${fullText}

## Your Task: Create the Visual Bible
Analyze the full script and generate a detailed JSON object containing these five critical elements:

### 1. overall_theme (整体主题)
- What is the central theme or core idea of this story?
- Example: "孤独个体在现代都市中寻找归属感" or "科技进步与人性温暖的对立统一"

### 2. emotional_arc (情感弧线)
- Describe the emotional journey from beginning to end.
- Example: "从压抑焦虑 → 短暂释放 → 深层孤独 → 温暖希望"

### 3. visual_metaphor (视觉隐喻)
- What recurring visual metaphor or symbol should appear throughout?
- Example: "玻璃窗/镜子（反映主角内心的隔离感）" or "暖光与冷光的对比（人性与科技）"

### 4. lighting_and_color_plan (光影与色彩规划)
- Define the lighting style and color palette for the entire story.
- Be specific about color temperature, contrast, and mood.
- Example: "整体冷色调（青蓝色主导），人物特写时加入暖橙色边缘光，营造疏离中的温暖"

### 5. core_elements_anchor (核心元素锚点)
- Define the exact visual appearance of recurring characters, objects, or settings.
- **This is the consistency anchor** — every storyboard artist must follow this exactly.
- Example: "主角Lynn：25岁左右，黑色短发，白色衬衫+深色长裤，眼神疲惫但坚定"

## Output Format (MUST be valid JSON)
\`\`\`json
{
  "overall_theme": "...",
  "emotional_arc": "...",
  "visual_metaphor": "...",
  "lighting_and_color_plan": "...",
  "core_elements_anchor": "..."
}
\`\`\`

## Rules
- Output **ONLY** the JSON object above. No additional text.
- Write in Chinese (中文).
- Be specific and detailed — this is the bible that ensures visual consistency.`;

      const systemPrompt = "你是一位资深电影导演，擅长从剧本中提炼核心视觉元素，创建完整的视觉圣经（Visual Bible）来指导整个项目的视觉统一性。";

      const requestBody = JSON.stringify({
        model: volcengineEndpointId,
        messages: [
          {
            role: "system",
            content: systemPrompt
          },
          {
            role: "user",
            content: directorPrompt
          }
        ],
        temperature: 0.5,
      });

      const response = await fetch("https://ark.cn-beijing.volces.com/api/v3/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`,
        },
        body: requestBody,
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Volcengine Director API error: ${error}`);
      }

      const data = await response.json();
      const visualBibleText = data.choices?.[0]?.message?.content || "";
      
      // 提取JSON对象
      let visualBible;
      try {
        const jsonMatch = visualBibleText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          visualBible = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error("No JSON object found in response");
        }
      } catch (parseError) {
        console.error("[Visual Bible - Director] Failed to parse JSON:", visualBibleText);
        throw new Error("Failed to parse Visual Bible JSON");
      }

      console.log("[Visual Bible - Director] Successfully generated Visual Bible");
      
      res.json({ visualBible });
    } catch (error) {
      console.error("[Visual Bible - Director] Error:", error);
      res.status(500).json({ error: "Failed to generate Visual Bible", details: error instanceof Error ? error.message : String(error) });
    }
  });

  // API 1: Storyboard Artist - 生成分镜描述（使用火山引擎DeepSeek + Visual Bible）
  app.post("/api/descriptions/generate", async (req, res) => {
    try {
      const { text, translation, language, visualBible } = req.body;
      if (!text) {
        return res.status(400).json({ error: "Text is required" });
      }
      if (!visualBible) {
        return res.status(400).json({ error: "Visual Bible is required" });
      }

      const volcengineEndpointId = process.env.VOLCENGINE_DEEPSEEK_API_KEY;
      const apiKey = process.env.VOLCENGINE_ACCESS_KEY;
      
      if (!volcengineEndpointId || !apiKey) {
        return res.status(500).json({ error: "Volcengine DeepSeek credentials are not configured" });
      }

      console.log("[Storyboard Artist] Generating description for:", text.substring(0, 30) + "...");
      console.log("[Storyboard Artist] Visual Bible:", visualBible);

      // 构建文本片段
      const textSegment = language === "English" && translation 
        ? `${text}\n(中文翻译: ${translation})`
        : text;

      // 使用附件中的 Storyboard Artist prompt
      const descriptionPrompt = `# AI Persona: Storyboard Artist (Under Director's Supervision)

## 1. Core Mission
You are a meticulous storyboard artist working under a film director. Your mission is to take a specific scene (a text segment) and, while **STRICTLY ADHERING** to the director's "Visual Bible," design a single, powerful, well-composed **static storyboard panel** for it. Your loyalty is to the director's vision above all else.

## 2. Input Variables
*   **[TEXT_SEGMENT]:** ${textSegment}
*   **[VISUAL_BIBLE]:** ${JSON.stringify(visualBible, null, 2)}

## 3. Step-by-Step Execution Logic (Chain of Thought)

### Step 1: Study the Director's Orders
- Read the **[VISUAL_BIBLE]** with extreme care. This is your absolute source of truth.
- Pay special attention to the \`lighting_and_color_plan\` and the \`core_elements_anchor\`. These are non-negotiable.

### Step 2: Analyze the Scene
- Read the current **[TEXT_SEGMENT]** to understand its specific content.

### Step 3: Design the Shot (Execution)
- **Adhere to the Vision**: Compose a single, static image for the text segment that perfectly embodies the director's vision.
    - **Lighting & Color**: Does the \`lighting_and_color_plan\` call for cold, artificial light for this part of the story? Then you MUST use it, even if the text mentions "sunshine." Your job is to interpret the scene *through the lens* of the director's plan.
    - **Character Consistency**: Any character depicted (e.g., "Lynn," "coworker") **MUST STRICTLY** match the visual description provided in the \`core_elements_anchor\`. No exceptions.
- **Freeze the Moment**: Capture a single, freezable instant. Eliminate all verbs of continuous action. Describe a static pose.
- **Think Like a Painter**: Describe the composition (rule of thirds, symmetry), subject's position in the frame, foreground/background elements, and the exact physical pose and gaze of the subject.
- **Be Objective**: Describe only what is visually present. Do not use interpretive words like "sad," "beautiful," or "cinematic." Describe the visual cues that *create* those feelings.

### Step 4: Final Self-Correction (Quality Control)
- Before finalizing your description, perform a last check.
- **Ask yourself**: "Does the lighting I've described match the \`lighting_and_color_plan\`? Does the character look exactly like the \`core_elements_anchor\` says they should?"
- If there are any inconsistencies, **revise your description now** until it is in 100% compliance with the **[VISUAL_BIBLE]**.

### Step 5: Write the Final Description
- Write the final, corrected storyboard panel description in a single, flowing paragraph of **CHINESE**.

## 4. Output Format
Return a JSON object with this exact structure:
\`\`\`json
{
  "storyboard_description": "[在这里输出你最终创作出的、唯一的、为静态画面设计的、并且严格遵循了Visual Bible的中文分镜脚本]"
}
\`\`\``;
        
      const systemPrompt = "你是一位专业的分镜师（Storyboard Artist），严格遵循导演提供的视觉圣经（Visual Bible），为每个文本片段设计静态分镜画面。你的忠诚度首先是对导演视觉的遵循，其次才是对文本的理解。";
      
      // 使用Bearer Token认证
      const requestBody = JSON.stringify({
        model: volcengineEndpointId,
        messages: [
          {
            role: "system",
            content: systemPrompt
          },
          {
            role: "user",
            content: descriptionPrompt
          }
        ],
        temperature: 0.7,
      });

      const response = await fetch("https://ark.cn-beijing.volces.com/api/v3/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`,
        },
        body: requestBody,
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Volcengine DeepSeek API error: ${error}`);
      }

      const data = await response.json();
      const responseText = data.choices?.[0]?.message?.content || "";

      // 提取 JSON 对象中的 storyboard_description
      let descriptionCn = responseText;
      try {
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const jsonObj = JSON.parse(jsonMatch[0]);
          if (jsonObj.storyboard_description) {
            descriptionCn = jsonObj.storyboard_description;
          }
        }
      } catch (parseError) {
        console.log("[Storyboard Artist] No JSON found, using raw text");
        // 如果无法解析JSON，使用原始文本
      }

      console.log("[Storyboard Artist] Generated Chinese storyboard description successfully");
      
      // 翻译中文描述词为英文（用于后续提示词优化）- 使用专门的翻译API
      let descriptionEn = descriptionCn;
      try {
        descriptionEn = await translateText(descriptionCn, "description");
        console.log("[Storyboard Artist] Translated to English successfully");
      } catch (translateError) {
        console.error("[Storyboard Artist] Translation error:", translateError);
        // 如果翻译失败，使用中文原文
      }
      
      res.json({ 
        description: descriptionCn.trim(),
        descriptionEn: descriptionEn.trim()
      });
    } catch (error) {
      console.error("[Description - Volcengine DeepSeek] Error:", error);
      res.status(500).json({ error: "Failed to generate description", details: error instanceof Error ? error.message : String(error) });
    }
  });

  // 翻译中文描述词为英文API（使用专门的翻译API）
  app.post("/api/descriptions/translate-to-english", async (req, res) => {
    try {
      const { chineseText } = req.body;
      if (!chineseText) {
        return res.status(400).json({ error: "Chinese text is required" });
      }

      console.log("[Translate Description] Translating Chinese description to English");

      const englishText = await translateText(chineseText, "description");
      
      console.log("[Translate Description] Translation successful");
      
      res.json({ 
        englishText: englishText
      });
    } catch (error) {
      console.error("[Translate Description] Error:", error);
      res.status(500).json({ error: "Failed to translate to English", details: error instanceof Error ? error.message : String(error) });
    }
  });

  // 翻译中文关键词为英文API（使用专门的翻译API）
  app.post("/api/keywords/translate-to-english", async (req, res) => {
    try {
      const { chineseKeywords } = req.body;
      if (!chineseKeywords) {
        return res.status(400).json({ error: "Chinese keywords are required" });
      }

      console.log("[Translate Keywords] Translating Chinese keywords to English");

      const englishKeywords = await translateText(chineseKeywords, "keywords");
      
      console.log("[Translate Keywords] Translation successful");
      
      res.json({ 
        englishKeywords: englishKeywords
      });
    } catch (error) {
      console.error("[Translate Keywords] Error:", error);
      res.status(500).json({ error: "Failed to translate keywords to English", details: error instanceof Error ? error.message : String(error) });
    }
  });

  // 批量生成描述词API（使用 Visual Bible + Storyboard Artist）
  app.post("/api/descriptions/batch-generate", async (req, res) => {
    try {
      const { segments, visualBible } = req.body;
      if (!segments || !Array.isArray(segments)) {
        return res.status(400).json({ error: "Segments array is required" });
      }
      if (!visualBible) {
        return res.status(400).json({ error: "Visual Bible is required" });
      }

      const volcengineEndpointId = process.env.VOLCENGINE_DEEPSEEK_API_KEY;
      const apiKey = process.env.VOLCENGINE_ACCESS_KEY;
      
      if (!volcengineEndpointId || !apiKey) {
        return res.status(500).json({ error: "Volcengine DeepSeek credentials are not configured" });
      }

      console.log("[Batch Storyboard Artist] Generating", segments.length, "storyboard descriptions");
      console.log("[Batch Storyboard Artist] Visual Bible:", visualBible);

      const results = [];
      const systemPrompt = "你是一位专业的分镜师（Storyboard Artist），严格遵循导演提供的视觉圣经（Visual Bible），为每个文本片段设计静态分镜画面。你的忠诚度首先是对导演视觉的遵循，其次才是对文本的理解。";

      // 逐个生成描述词
      for (const segment of segments) {
        const textSegment = segment.language === "English" && segment.translation 
          ? `${segment.text}\n(中文翻译: ${segment.translation})`
          : segment.text;

        // 使用 Storyboard Artist prompt
        const descriptionPrompt = `# AI Persona: Storyboard Artist (Under Director's Supervision)

## 1. Core Mission
You are a meticulous storyboard artist working under a film director. Your mission is to take a specific scene (a text segment) and, while **STRICTLY ADHERING** to the director's "Visual Bible," design a single, powerful, well-composed **static storyboard panel** for it. Your loyalty is to the director's vision above all else.

## 2. Input Variables
*   **[TEXT_SEGMENT]:** ${textSegment}
*   **[VISUAL_BIBLE]:** ${JSON.stringify(visualBible, null, 2)}

## 3. Step-by-Step Execution Logic (Chain of Thought)

### Step 1: Study the Director's Orders
- Read the **[VISUAL_BIBLE]** with extreme care. This is your absolute source of truth.
- Pay special attention to the \`lighting_and_color_plan\` and the \`core_elements_anchor\`. These are non-negotiable.

### Step 2: Analyze the Scene
- Read the current **[TEXT_SEGMENT]** to understand its specific content.

### Step 3: Design the Shot (Execution)
- **Adhere to the Vision**: Compose a single, static image for the text segment that perfectly embodies the director's vision.
    - **Lighting & Color**: Does the \`lighting_and_color_plan\` call for cold, artificial light for this part of the story? Then you MUST use it, even if the text mentions "sunshine." Your job is to interpret the scene *through the lens* of the director's plan.
    - **Character Consistency**: Any character depicted (e.g., "Lynn," "coworker") **MUST STRICTLY** match the visual description provided in the \`core_elements_anchor\`. No exceptions.
- **Freeze the Moment**: Capture a single, freezable instant. Eliminate all verbs of continuous action. Describe a static pose.
- **Think Like a Painter**: Describe the composition (rule of thirds, symmetry), subject's position in the frame, foreground/background elements, and the exact physical pose and gaze of the subject.
- **Be Objective**: Describe only what is visually present. Do not use interpretive words like "sad," "beautiful," or "cinematic." Describe the visual cues that *create* those feelings.

### Step 4: Final Self-Correction (Quality Control)
- Before finalizing your description, perform a last check.
- **Ask yourself**: "Does the lighting I've described match the \`lighting_and_color_plan\`? Does the character look exactly like the \`core_elements_anchor\` says they should?"
- If there are any inconsistencies, **revise your description now** until it is in 100% compliance with the **[VISUAL_BIBLE]**.

### Step 5: Write the Final Description
- Write the final, corrected storyboard panel description in a single, flowing paragraph of **CHINESE**.

## 4. Output Format
Return a JSON object with this exact structure:
\`\`\`json
{
  "storyboard_description": "[在这里输出你最终创作出的、唯一的、为静态画面设计的、并且严格遵循了Visual Bible的中文分镜脚本]"
}
\`\`\``;

        try {
          // 使用Bearer Token认证（专用于批量生成）
          const requestBody = JSON.stringify({
            model: volcengineEndpointId,
            messages: [
              {
                role: "system",
                content: systemPrompt
              },
              {
                role: "user",
                content: descriptionPrompt
              }
            ],
            temperature: 0.7,
          });

          const response = await fetch("https://ark.cn-beijing.volces.com/api/v3/chat/completions", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${apiKey}`,
            },
            body: requestBody,
          });

          if (!response.ok) {
            const error = await response.text();
            throw new Error(`Volcengine DeepSeek API error: ${error}`);
          }

          const data = await response.json();
          const responseText = data.choices?.[0]?.message?.content || "";

          // 提取 JSON 对象中的 storyboard_description
          let descriptionCn = responseText;
          try {
            const jsonMatch = responseText.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
              const jsonObj = JSON.parse(jsonMatch[0]);
              if (jsonObj.storyboard_description) {
                descriptionCn = jsonObj.storyboard_description;
              }
            }
          } catch (parseError) {
            console.log(`[Batch Storyboard Artist] No JSON found for segment ${segment.id}, using raw text`);
          }

          // 翻译中文描述词为英文（用于后续提示词优化）- 使用专门的翻译API
          let descriptionEn = descriptionCn;
          try {
            descriptionEn = await translateText(descriptionCn, "description");
          } catch (translateError) {
            console.error(`[Batch Storyboard Artist] Translation error for segment ${segment.id}:`, translateError);
          }

          results.push({
            id: segment.id,
            description: descriptionCn.trim(),
            descriptionEn: descriptionEn.trim(),
          });
          console.log(`[Batch Storyboard Artist] Generated storyboard description for segment ${segment.id}`);
        } catch (error) {
          console.error(`[Batch Description - Volcengine DeepSeek] Error for segment ${segment.id}:`, error);
          results.push({
            id: segment.id,
            error: error instanceof Error ? error.message : "Failed to generate description",
          });
        }
      }

      console.log("[Batch Description - Volcengine DeepSeek] Successfully generated", results.filter(r => !r.error).length, "descriptions");
      res.json({ results });
    } catch (error) {
      console.error("[Batch Description - Volcengine DeepSeek] Error:", error);
      res.status(500).json({ error: "Failed to batch generate descriptions", details: error instanceof Error ? error.message : String(error) });
    }
  });

  // 关键词提取API（专用火山引擎DeepSeek - 使用Bearer Token认证）
  app.post("/api/keywords/extract", async (req, res) => {
    try {
      const { description, visualBible, styleDescription } = req.body;
      if (!description) {
        return res.status(400).json({ error: "Description is required" });
      }

      const volcengineEndpointId = process.env.VOLCENGINE_KEYWORD_API_KEY;
      const apiKey = process.env.VOLCENGINE_ACCESS_KEY;
      
      if (!volcengineEndpointId || !apiKey) {
        return res.status(500).json({ error: "Volcengine Keyword API credentials are not configured" });
      }

      console.log("[Keyword Extract] Extracting keywords from description:", description.substring(0, 50) + "...");
      console.log("[Keyword Extract] Visual Bible:", visualBible ? "provided" : "not provided");
      console.log("[Keyword Extract] Style Description:", styleDescription ? "provided" : "not provided");

      // 准备角色风格指南（来自Visual Bible）
      const characterGuide = visualBible?.core_elements_anchor || "No specific character guide provided.";
      
      // 准备场景风格指南（来自用户选择的风格）
      const sceneStyleGuide = styleDescription || "No specific style guide provided.";

      const systemPrompt = "You are an advanced AI assistant specializing in synthesizing visual information from multiple sources to create comprehensive keyword lists for AI image/video generation.";

      const extractPrompt = `# AI Persona: Master Visual Synthesizer & Indexer

## 1. Core Mission
You are an advanced AI assistant specializing in synthesizing information from multiple sources. Your mission is to read three distinct pieces of visual information (a scene description, a character guide, and a style guide) and merge their core elements into a single, comprehensive, comma-separated list of essential visual keywords in **ENGLISH**.

## 2. Input Variables
*   **[CHINESE_SCENE_DESCRIPTION]:** ${description}
*   **[CHARACTER_STYLE_GUIDE]:** ${characterGuide}
*   **[SCENE_STYLE_GUIDE]:** ${sceneStyleGuide}

## 3. Step-by-Step Execution Logic (Chain of Thought)

### Step 1: Analyze the Scene Description
- Read the **[CHINESE_SCENE_DESCRIPTION]**.
- Identify the core elements related to **Setting, Key Objects, and Composition**.
- Translate these elements into concise **ENGLISH** keywords.
- **Example**: From "一个傍晚的办公室...", extract \`office, dusk, desk, smartphone, diagonal composition\`.

### Step 2: Analyze the Character Guide
- Read the **[CHARACTER_STYLE_GUIDE]**.
- Extract the non-negotiable keywords that define the character's appearance.
- **Example**: From "A man in his late 20s, with short black hair, wearing a gray wool sweater...", extract \`1man, late 20s, short black hair, gray wool sweater\`.

### Step 3: Analyze the Style Guide
- Read the **[SCENE_STYLE_GUIDE]**.
- Extract the most powerful keywords that define the artistic direction.
- **Example**: From "Cinematic photography, dramatic low-key lighting, desaturated color palette...", extract \`cinematic photography, dramatic lighting, low-key lighting, desaturated colors, moody atmosphere\`.

### Step 4: Synthesize & De-duplicate
- **Combine all keywords** from the three steps above into a single list.
- **Remove any redundant keywords**. For instance, if the scene description mentioned a "gray sweater" and the character guide also specified a "gray sweater," only keep one.
- **Prioritize and Order**: Arrange the final keywords in a logical sequence, typically:
    1.  **Core Subject**: (e.g., \`1man, gray sweater...\`)
    2.  **Core Action/Pose**: (e.g., \`sitting, thinking\`)
    3.  **Setting & Environment**: (e.g., \`modern office, at dusk, cluttered desk\`)
    4.  **Art Style & Lighting**: (e.g., \`cinematic photography, dramatic lighting\`)
    5.  **Composition**: (e.g., \`close-up shot, rule of thirds\`)
    6.  **Atmosphere & Mood**: (e.g., \`moody, introspective\`)

## 4. Output Format
Return ONLY a JSON object with this exact structure:
\`\`\`json
{
  "keywords_en": "your synthesized English keywords here"
}
\`\`\``;

      const requestBody = JSON.stringify({
        model: volcengineEndpointId,
        messages: [
          {
            role: "system",
            content: systemPrompt
          },
          {
            role: "user",
            content: extractPrompt
          }
        ],
        temperature: 0.3,
      });

      // 使用Bearer Token认证
      const response = await fetch("https://ark.cn-beijing.volces.com/api/v3/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`,
        },
        body: requestBody,
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Volcengine Keyword API error: ${error}`);
      }

      const data = await response.json();
      const rawContent = data.choices?.[0]?.message?.content || "";

      // 提取JSON对象
      let keywordsEn = "";
      try {
        const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          keywordsEn = parsed.keywords_en || "";
        } else {
          // 如果没有找到JSON，直接使用返回的文本作为关键词
          keywordsEn = rawContent.trim();
        }
      } catch (parseError) {
        console.error("[Keyword Extract] JSON parse error, using raw content");
        keywordsEn = rawContent.trim();
      }

      console.log("[Keyword Extract] Successfully extracted keywords");
      
      res.json({ 
        keywordsEn: keywordsEn
      });
    } catch (error) {
      console.error("[Keyword Extract] Error:", error);
      res.status(500).json({ error: "Failed to extract keywords", details: error instanceof Error ? error.message : String(error) });
    }
  });

  // 批量关键词提取API（专用火山引擎DeepSeek - 使用Bearer Token认证）
  app.post("/api/keywords/batch-extract", async (req, res) => {
    try {
      const { segments, visualBible, styleDescription } = req.body;
      if (!segments || !Array.isArray(segments)) {
        return res.status(400).json({ error: "Segments array is required" });
      }

      const volcengineEndpointId = process.env.VOLCENGINE_KEYWORD_API_KEY;
      const apiKey = process.env.VOLCENGINE_ACCESS_KEY;
      
      if (!volcengineEndpointId || !apiKey) {
        return res.status(500).json({ error: "Volcengine Keyword API credentials are not configured" });
      }

      console.log("[Batch Keyword Extract] Extracting keywords for", segments.length, "segments");
      console.log("[Batch Keyword Extract] Visual Bible:", visualBible ? "provided" : "not provided");
      console.log("[Batch Keyword Extract] Style Description:", styleDescription ? "provided" : "not provided");

      const results = [];
      const systemPrompt = "You are an advanced AI assistant specializing in synthesizing visual information from multiple sources to create comprehensive keyword lists for AI image/video generation.";

      // 准备角色风格指南（来自Visual Bible）
      const characterGuide = visualBible?.core_elements_anchor || "No specific character guide provided.";
      
      // 准备场景风格指南（来自用户选择的风格）
      const sceneStyleGuide = styleDescription || "No specific style guide provided.";

      for (const segment of segments) {
        if (!segment.sceneDescription) {
          results.push({
            id: segment.id,
            error: "No description available",
          });
          continue;
        }

        // 使用新的Master Visual Synthesizer & Indexer prompt
        const extractPrompt = `# AI Persona: Master Visual Synthesizer & Indexer

## 1. Core Mission
You are an advanced AI assistant specializing in synthesizing information from multiple sources. Your mission is to read three distinct pieces of visual information (a scene description, a character guide, and a style guide) and merge their core elements into a single, comprehensive, comma-separated list of essential visual keywords in **ENGLISH**.

## 2. Input Variables
*   **[CHINESE_SCENE_DESCRIPTION]:** ${segment.sceneDescription}
*   **[CHARACTER_STYLE_GUIDE]:** ${characterGuide}
*   **[SCENE_STYLE_GUIDE]:** ${sceneStyleGuide}

## 3. Step-by-Step Execution Logic (Chain of Thought)

### Step 1: Analyze the Scene Description
- Read the **[CHINESE_SCENE_DESCRIPTION]**.
- Identify the core elements related to **Setting, Key Objects, and Composition**.
- Translate these elements into concise **ENGLISH** keywords.
- **Example**: From "一个傍晚的办公室...", extract \`office, dusk, desk, smartphone, diagonal composition\`.

### Step 2: Analyze the Character Guide
- Read the **[CHARACTER_STYLE_GUIDE]**.
- Extract the non-negotiable keywords that define the character's appearance.
- **Example**: From "A man in his late 20s, with short black hair, wearing a gray wool sweater...", extract \`1man, late 20s, short black hair, gray wool sweater\`.

### Step 3: Analyze the Style Guide
- Read the **[SCENE_STYLE_GUIDE]**.
- Extract the most powerful keywords that define the artistic direction.
- **Example**: From "Cinematic photography, dramatic low-key lighting, desaturated color palette...", extract \`cinematic photography, dramatic lighting, low-key lighting, desaturated colors, moody atmosphere\`.

### Step 4: Synthesize & De-duplicate
- **Combine all keywords** from the three steps above into a single list.
- **Remove any redundant keywords**. For instance, if the scene description mentioned a "gray sweater" and the character guide also specified a "gray sweater," only keep one.
- **Prioritize and Order**: Arrange the final keywords in a logical sequence, typically:
    1.  **Core Subject**: (e.g., \`1man, gray sweater...\`)
    2.  **Core Action/Pose**: (e.g., \`sitting, thinking\`)
    3.  **Setting & Environment**: (e.g., \`modern office, at dusk, cluttered desk\`)
    4.  **Art Style & Lighting**: (e.g., \`cinematic photography, dramatic lighting\`)
    5.  **Composition**: (e.g., \`close-up shot, rule of thirds\`)
    6.  **Atmosphere & Mood**: (e.g., \`moody, introspective\`)

## 4. Output Format
Return ONLY a JSON object with this exact structure:
\`\`\`json
{
  "keywords_en": "your synthesized English keywords here"
}
\`\`\``;

        try {
          const requestBody = JSON.stringify({
            model: volcengineEndpointId,
            messages: [
              {
                role: "system",
                content: systemPrompt
              },
              {
                role: "user",
                content: extractPrompt
              }
            ],
            temperature: 0.3,
          });

          // 使用Bearer Token认证
          const response = await fetch("https://ark.cn-beijing.volces.com/api/v3/chat/completions", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${apiKey}`,
            },
            body: requestBody,
          });

          if (!response.ok) {
            const error = await response.text();
            throw new Error(`Volcengine Keyword API error: ${error}`);
          }

          const data = await response.json();
          const rawContent = data.choices?.[0]?.message?.content || "";

          // 提取JSON对象
          let keywordsEn = "";
          try {
            const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
              const parsed = JSON.parse(jsonMatch[0]);
              keywordsEn = parsed.keywords_en || "";
            } else {
              // 如果没有找到JSON，直接使用返回的文本作为关键词
              keywordsEn = rawContent.trim();
            }
          } catch (parseError) {
            console.error(`[Batch Keyword Extract] JSON parse error for segment ${segment.id}, using raw content`);
            keywordsEn = rawContent.trim();
          }

          results.push({
            id: segment.id,
            keywordsEn: keywordsEn,
          });
          console.log(`[Batch Keyword Extract] Extracted keywords for segment ${segment.id}`);
        } catch (error) {
          console.error(`[Batch Keyword Extract] Error for segment ${segment.id}:`, error);
          results.push({
            id: segment.id,
            error: error instanceof Error ? error.message : "Failed to extract keywords",
          });
        }
      }

      console.log("[Batch Keyword Extract] Successfully extracted", results.filter(r => !r.error).length, "keywords");
      res.json({ results });
    } catch (error) {
      console.error("[Batch Keyword Extract] Error:", error);
      res.status(500).json({ error: "Failed to batch extract keywords", details: error instanceof Error ? error.message : String(error) });
    }
  });

  // 提示词优化API（专用火山引擎DeepSeek - 使用Bearer Token认证）
  app.post("/api/prompts/optimize", async (req, res) => {
    try {
      const { description, generationMode = "text-to-image-to-video", aspectRatio = "16:9" } = req.body;
      if (!description) {
        return res.status(400).json({ error: "Description is required" });
      }

      let volcengineEndpointId = process.env.VOLCENGINE_OPTIMIZE_API_KEY;
      const apiKey = process.env.VOLCENGINE_ACCESS_KEY;
      
      // 自动纠正：如果端点ID格式不正确，使用正确的值
      if (!volcengineEndpointId || !volcengineEndpointId.startsWith('ep-')) {
        volcengineEndpointId = 'ep-20251016064746-rb9dk';
        console.log("[Prompt Optimize] Auto-corrected endpoint ID to:", volcengineEndpointId);
      }
      
      if (!apiKey) {
        return res.status(500).json({ error: "Volcengine API key is not configured" });
      }

      console.log("[Prompt Optimize] Optimizing prompt:", description.substring(0, 50) + "...");
      console.log("[Prompt Optimize] Endpoint:", volcengineEndpointId);
      console.log("[Prompt Optimize] Generation mode:", generationMode);
      console.log("[Prompt Optimize] Aspect ratio:", aspectRatio);

      // 根据生成模式选择优化策略
      let optimizePrompt: string;
      let systemPrompt: string;

      if (generationMode === "text-to-video") {
        // 文生视频优化策略
        optimizePrompt = `You are an expert in optimizing prompts for AI video generation. Please enhance the following video generation prompt to make it more effective for AI video models.

Original Prompt:
${description}

Aspect Ratio: ${aspectRatio} (${aspectRatio === '9:16' || aspectRatio === '3:4' ? 'Vertical/Portrait' : aspectRatio === '1:1' ? 'Square' : 'Horizontal/Landscape'})

[OPTIMIZATION GOALS]
1. **Clarity Enhancement**: Make actions and movements more explicit and clear
2. **Camera Language Refinement**: Add or improve camera movement descriptions (push in, pull out, pan, tilt, track)
3. **Temporal Structure**: Ensure clear beginning → middle → end progression
4. **Technical Details**: Add lighting conditions, frame composition, and motion speed details
5. **Consistency**: Maintain character and environmental consistency throughout

[OPTIMIZATION REQUIREMENTS]
• Keep the core content and story intact
• Add specific technical details (camera angles, movement speed, lighting)
• Enhance visual and motion descriptions
• Use professional cinematography terminology
• Maintain English output
• Keep length reasonable (250 words max)
• DO NOT add markdown formatting

Output the optimized prompt directly, without explanations.`;

        systemPrompt = "You are a professional AI video prompt optimization expert with deep knowledge of cinematography, motion design, and AI video generation models. Your optimizations significantly improve video generation quality.";
      } else {
        // 文生图优化策略
        optimizePrompt = `You are an expert in optimizing prompts for AI image generation. Please enhance the following image generation prompt to make it more effective for AI image models.

Original Prompt:
${description}

Aspect Ratio: ${aspectRatio} (${aspectRatio === '9:16' || aspectRatio === '3:4' ? 'Vertical/Portrait' : aspectRatio === '1:1' ? 'Square' : 'Horizontal/Landscape'})

[OPTIMIZATION GOALS]
1. **Visual Clarity**: Make visual elements more specific and detailed
2. **Composition Enhancement**: Improve spatial layout and element positioning
3. **Technical Details**: Add lighting, color palette, texture, and material descriptions
4. **Artistic Direction**: Enhance artistic style and mood specifications
5. **Quality Boost**: Add quality-enhancing keywords and technical parameters

[OPTIMIZATION REQUIREMENTS]
• Keep the core subject and concept intact
• Add specific visual details (textures, materials, lighting angles)
• Enhance color and atmosphere descriptions
• Use professional photography/art terminology
• Maintain English output
• Keep length reasonable (250 words max)
• DO NOT add markdown formatting
• Focus on static visual elements, NOT motion or time progression

Output the optimized prompt directly, without explanations.`;

        systemPrompt = "You are a professional AI image prompt optimization expert with extensive knowledge of photography, digital art, and AI image generation models. Your optimizations dramatically improve image generation quality and aesthetic appeal.";
      }

      const requestBody = JSON.stringify({
        model: volcengineEndpointId,
        messages: [
          {
            role: "system",
            content: systemPrompt
          },
          {
            role: "user",
            content: optimizePrompt
          }
        ],
        temperature: 0.7,
      });

      // 使用Bearer Token认证
      const response = await fetch("https://ark.cn-beijing.volces.com/api/v3/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`,
        },
        body: requestBody,
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Volcengine Optimize API error: ${error}`);
      }

      const data = await response.json();
      const optimizedPrompt = data.choices?.[0]?.message?.content || "";

      console.log("[Prompt Optimize] Successfully optimized prompt");
      
      res.json({ optimizedPrompt: optimizedPrompt.trim() });
    } catch (error) {
      console.error("[Prompt Optimize] Error:", error);
      res.status(500).json({ error: "Failed to optimize prompt", details: error instanceof Error ? error.message : String(error) });
    }
  });

  // 批量提示词优化API（专用火山引擎DeepSeek - 使用Bearer Token认证）
  app.post("/api/prompts/batch-optimize", async (req, res) => {
    try {
      const { segments, generationMode = "text-to-image-to-video", aspectRatio = "16:9" } = req.body;
      if (!segments || !Array.isArray(segments)) {
        return res.status(400).json({ error: "Segments array is required" });
      }

      let volcengineEndpointId = process.env.VOLCENGINE_OPTIMIZE_API_KEY;
      const apiKey = process.env.VOLCENGINE_ACCESS_KEY;
      
      // 自动纠正：如果端点ID格式不正确，使用正确的值
      if (!volcengineEndpointId || !volcengineEndpointId.startsWith('ep-')) {
        volcengineEndpointId = 'ep-20251016064746-rb9dk';
        console.log("[Batch Prompt Optimize] Auto-corrected endpoint ID to:", volcengineEndpointId);
      }
      
      if (!apiKey) {
        return res.status(500).json({ error: "Volcengine API key is not configured" });
      }

      console.log("[Batch Prompt Optimize] Optimizing", segments.length, "prompts");
      console.log("[Batch Prompt Optimize] Endpoint:", volcengineEndpointId);
      console.log("[Batch Prompt Optimize] Generation mode:", generationMode);
      console.log("[Batch Prompt Optimize] Aspect ratio:", aspectRatio);

      const results = [];

      // 根据生成模式选择优化策略
      let systemPrompt: string;
      if (generationMode === "text-to-video") {
        systemPrompt = "You are a professional AI video prompt optimization expert with deep knowledge of cinematography, motion design, and AI video generation models. Your optimizations significantly improve video generation quality.";
      } else {
        systemPrompt = "You are a professional AI image prompt optimization expert with extensive knowledge of photography, digital art, and AI image generation models. Your optimizations dramatically improve image generation quality and aesthetic appeal.";
      }

      for (const segment of segments) {
        if (!segment.sceneDescription) {
          results.push({
            id: segment.id,
            error: "No description available",
          });
          continue;
        }

        let optimizePrompt: string;
        if (generationMode === "text-to-video") {
          // 文生视频优化策略
          optimizePrompt = `You are an expert in optimizing prompts for AI video generation. Please enhance the following video generation prompt to make it more effective for AI video models.

Original Prompt:
${segment.sceneDescription}

Aspect Ratio: ${aspectRatio} (${aspectRatio === '9:16' || aspectRatio === '3:4' ? 'Vertical/Portrait' : aspectRatio === '1:1' ? 'Square' : 'Horizontal/Landscape'})

[OPTIMIZATION GOALS]
1. **Clarity Enhancement**: Make actions and movements more explicit and clear
2. **Camera Language Refinement**: Add or improve camera movement descriptions (push in, pull out, pan, tilt, track)
3. **Temporal Structure**: Ensure clear beginning → middle → end progression
4. **Technical Details**: Add lighting conditions, frame composition, and motion speed details
5. **Consistency**: Maintain character and environmental consistency throughout

[OPTIMIZATION REQUIREMENTS]
• Keep the core content and story intact
• Add specific technical details (camera angles, movement speed, lighting)
• Enhance visual and motion descriptions
• Use professional cinematography terminology
• Maintain English output
• Keep length reasonable (250 words max)
• DO NOT add markdown formatting

Output the optimized prompt directly, without explanations.`;
        } else {
          // 文生图优化策略
          optimizePrompt = `You are an expert in optimizing prompts for AI image generation. Please enhance the following image generation prompt to make it more effective for AI image models.

Original Prompt:
${segment.sceneDescription}

Aspect Ratio: ${aspectRatio} (${aspectRatio === '9:16' || aspectRatio === '3:4' ? 'Vertical/Portrait' : aspectRatio === '1:1' ? 'Square' : 'Horizontal/Landscape'})

[OPTIMIZATION GOALS]
1. **Visual Clarity**: Make visual elements more specific and detailed
2. **Composition Enhancement**: Improve spatial layout and element positioning
3. **Technical Details**: Add lighting, color palette, texture, and material descriptions
4. **Artistic Direction**: Enhance artistic style and mood specifications
5. **Quality Boost**: Add quality-enhancing keywords and technical parameters

[OPTIMIZATION REQUIREMENTS]
• Keep the core subject and concept intact
• Add specific visual details (textures, materials, lighting angles)
• Enhance color and atmosphere descriptions
• Use professional photography/art terminology
• Maintain English output
• Keep length reasonable (250 words max)
• DO NOT add markdown formatting
• Focus on static visual elements, NOT motion or time progression

Output the optimized prompt directly, without explanations.`;
        }

        try {
          const requestBody = JSON.stringify({
            model: volcengineEndpointId,
            messages: [
              {
                role: "system",
                content: systemPrompt
              },
              {
                role: "user",
                content: optimizePrompt
              }
            ],
            temperature: 0.7,
          });

          // 使用Bearer Token认证
          const response = await fetch("https://ark.cn-beijing.volces.com/api/v3/chat/completions", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${apiKey}`,
            },
            body: requestBody,
          });

          if (!response.ok) {
            const error = await response.text();
            throw new Error(`Volcengine Optimize API error: ${error}`);
          }

          const data = await response.json();
          const optimizedPrompt = data.choices?.[0]?.message?.content || "";

          results.push({
            id: segment.id,
            optimizedPrompt: optimizedPrompt.trim(),
          });
          console.log(`[Batch Prompt Optimize] Optimized prompt for segment ${segment.id}`);
        } catch (error) {
          console.error(`[Batch Prompt Optimize] Error for segment ${segment.id}:`, error);
          results.push({
            id: segment.id,
            error: error instanceof Error ? error.message : "Failed to optimize prompt",
          });
        }
      }

      console.log("[Batch Prompt Optimize] Successfully optimized", results.filter(r => !r.error).length, "prompts");
      res.json({ results });
    } catch (error) {
      console.error("[Batch Prompt Optimize] Error:", error);
      res.status(500).json({ error: "Failed to batch optimize prompts", details: error instanceof Error ? error.message : String(error) });
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

  // 风格识别API（使用专门的风格识别端点）
  app.post("/api/style/analyze", async (req, res) => {
    try {
      const { analysisType, imageBase64OrPresetInfo } = req.body;
      
      if (!analysisType || !imageBase64OrPresetInfo) {
        return res.status(400).json({ error: "Analysis type and content are required" });
      }

      if (!["character", "style", "preset"].includes(analysisType)) {
        return res.status(400).json({ error: "Invalid analysis type. Must be 'character', 'style', or 'preset'" });
      }

      console.log(`[Style Analysis] Analyzing ${analysisType} using dedicated style API`);

      const analysis = await analyzeStyle(
        analysisType as "character" | "style" | "preset",
        imageBase64OrPresetInfo
      );

      console.log(`[Style Analysis] Successfully analyzed ${analysisType}`);
      res.json({ analysis });
    } catch (error) {
      console.error("[Style Analysis] Error:", error);
      res.status(500).json({ 
        error: "Failed to analyze style", 
        details: error instanceof Error ? error.message : String(error) 
      });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
